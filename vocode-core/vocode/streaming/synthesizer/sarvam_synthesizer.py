"""
Sarvam AI synthesizer for Indian language text-to-speech.

Sarvam AI offers TTS via REST API optimized for Indian languages.
"""

import asyncio
import base64
import io
from typing import AsyncGenerator, Callable, Optional

import aiohttp
from loguru import logger
from pydub import AudioSegment

from vocode import getenv
from vocode.streaming.models.audio import AudioEncoding
from vocode.streaming.models.message import BaseMessage
from vocode.streaming.models.synthesizer import (
    SARVAM_TTS_API_URL,
    SarvamSynthesizerConfig,
)
from vocode.streaming.synthesizer.base_synthesizer import (
    BaseSynthesizer,
    SynthesisResult,
    FillerAudio,
)


class SarvamSynthesizer(BaseSynthesizer[SarvamSynthesizerConfig]):
    """
    Sarvam AI text-to-speech synthesizer for Indian languages.
    """
    
    def __init__(
        self,
        synthesizer_config: SarvamSynthesizerConfig,
    ):
        super().__init__(synthesizer_config)
        self.api_key = synthesizer_config.api_key or getenv("SARVAM_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Please set SARVAM_API_KEY environment variable or pass it as a parameter"
            )

    async def get_phrase_filler_audios(self) -> list[FillerAudio]:
        filler_phrases = [
            BaseMessage(text="Hmm..."),
        ]
        
        filler_audios = []
        for phrase in filler_phrases:
            logger.debug(f"Pre-generating Sarvam TTS filler audio for: {phrase.text}")
            try:
                result = await self.create_speech(phrase, chunk_size=4096)
                chunks = []
                async for chunk_result in result.chunk_generator:
                    chunks.append(chunk_result.chunk)
                
                audio_data = b"".join(chunks)
                if audio_data:
                    filler_audios.append(
                        FillerAudio(
                            message=phrase,
                            audio_data=audio_data,
                            synthesizer_config=self.synthesizer_config,
                            is_interruptible=True,
                            seconds_per_chunk=1,
                        )
                    )
            except Exception as e:
                logger.error(f"Failed to generate filler audio for {phrase.text}: {e}")
                
        return filler_audios

    async def create_speech(
        self,
        message: BaseMessage,
        chunk_size: int,
        is_first_text_chunk: bool = False,
        is_sole_text_chunk: bool = False,
    ) -> SynthesisResult:
        """Generate speech from text using Sarvam TTS API."""
        
        async def chunk_generator() -> AsyncGenerator[SynthesisResult.ChunkResult, None]:
            # FAST PATH: Ignore silence tokens sent by the LLM
            clean_text = message.text.strip().lower()
            if not clean_text or clean_text in ["<silence>", "[silence]"]:
                print(f"[Sarvam TTS] Skipping synthesis for silence token: '{message.text}'")
                return

            try:
                session = self.async_requestor.get_session()
                
                # Build request payload
                payload = {
                    "text": message.text,
                    "target_language_code": self.synthesizer_config.target_language_code,
                    "model": self.synthesizer_config.model,
                    "sample_rate": self.synthesizer_config.sampling_rate,
                }
                
                # Voice control
                if "v2" in self.synthesizer_config.model or "v3" in self.synthesizer_config.model:
                    if self.synthesizer_config.pitch != 0.0:
                        payload["pitch"] = self.synthesizer_config.pitch
                    if self.synthesizer_config.speed != 1.0:
                        payload["pace"] = self.synthesizer_config.speed
                    if self.synthesizer_config.loudness != 1.0:
                        payload["loudness"] = self.synthesizer_config.loudness
                
                headers = {
                    "api-subscription-key": self.api_key,
                    "Content-Type": "application/json",
                }
                
                import time
                
                print(f"[Sarvam TTS] Sending request for text: '{message.text}'")
                start_req = time.time()
                
                async with session.post(
                    SARVAM_TTS_API_URL,
                    json=payload,
                    headers=headers,
                ) as response:
                    if not response.ok:
                        error_text = await response.text()
                        logger.error(f"Sarvam TTS error: {response.status} - {error_text}")
                        return
                    
                    result = await response.json()
                    req_time = time.time() - start_req
                    print(f"[Sarvam TTS] Response received in {req_time:.2f}s")
                    
                    audios = result.get("audios", [])
                    if not audios:
                        return
                    
                    audio_bytes = base64.b64decode(audios[0])
                    
                    # SYNTHESIZER FIX: Fast Native Resampling
                    # Avoid pydub which blocks the async event loop and causes massive lag spikes.
                    # Sarvam returns a base64 encoded WAV file. We use native wave to parse.
                    import wave
                    import audioop

                    try:
                        with wave.open(io.BytesIO(audio_bytes), 'rb') as wf:
                            raw_data = wf.readframes(wf.getnframes())
                            frame_rate = wf.getframerate()
                            sample_width = wf.getsampwidth()
                            channels = wf.getnchannels()

                        if channels != 1:
                            raw_data = audioop.tomono(raw_data, sample_width, 1, 1)

                        if frame_rate != self.synthesizer_config.sampling_rate:
                            raw_data, _ = audioop.ratecv(
                                raw_data, sample_width, 1, frame_rate, self.synthesizer_config.sampling_rate, None
                            )

                        audio_bytes = raw_data
                    except wave.Error:
                        # Fallback if it's not a valid WAV (e.g. raw PCM)
                        logger.warning("Sarvam TTS did not return valid WAV, falling back to raw PCM assumption (22050Hz)")
                        raw_data = audio_bytes
                        raw_data, _ = audioop.ratecv(
                            raw_data, 2, 1, 22050, self.synthesizer_config.sampling_rate, None
                        )
                        audio_bytes = raw_data
                    
                    # Convert to mulaw for Twilio
                    if self.synthesizer_config.audio_encoding == AudioEncoding.MULAW:
                        audio_bytes = audioop.lin2ulaw(audio_bytes, 2)
                    
                    # Stream smaller chunks to get audio flowing to Twilio faster
                    # IMPORTANT: We MUST pace the generator so the event loop can process Twilio clear signals for barge-in
                    stream_chunk_size = min(chunk_size, 4096)
                    for i in range(0, len(audio_bytes), stream_chunk_size):
                        await asyncio.sleep(0.001)  # Yield to event loop to allow interrupts
                        chunk = audio_bytes[i:i + stream_chunk_size]
                        yield SynthesisResult.ChunkResult(
                            chunk=chunk,
                            is_last_chunk=(i + stream_chunk_size >= len(audio_bytes)),
                        )
                        
            except Exception as e:
                logger.error(f"Sarvam TTS synthesis error: {e}")
        
        return SynthesisResult(
            chunk_generator=chunk_generator(),
            get_message_up_to=lambda seconds: message.text,
        )
    

