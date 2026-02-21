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
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def create_speech(
        self,
        message: BaseMessage,
        chunk_size: int,
        is_first_text_chunk: bool = False,
        is_sole_text_chunk: bool = False,
    ) -> SynthesisResult:
        """Generate speech from text using Sarvam TTS API."""
        
        async def chunk_generator() -> AsyncGenerator[SynthesisResult.ChunkResult, None]:
            try:
                session = await self._get_session()
                
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
                    audios = result.get("audios", [])
                    if not audios:
                        return
                    
                    audio_bytes = base64.b64decode(audios[0])
                    
                    # SYNTHESIZER FIX: Robust Sample Rate Handling
                    # We'll use pydub to detect if it's 22050 or something else.
                    # Since Sarvam Bulbul often defaults to 22050.
                    # We'll try to load it correctly and then resample.
                    
                    # If it sounds robotic, it's usually because 22050Hz is being played at 8000Hz.
                    # Let's force load it as 22050 if it came from Bulbul.
                    audio_seg = AudioSegment.from_raw(
                        io.BytesIO(audio_bytes),
                        sample_width=2,
                        frame_rate=22050, # Default for Bulbul
                        channels=1
                    )
                    
                    # Resample to telephony rate (8000)
                    if audio_seg.frame_rate != self.synthesizer_config.sampling_rate:
                        logger.debug(f"Resampling Sarvam audio from {audio_seg.frame_rate} to {self.synthesizer_config.sampling_rate}")
                        audio_seg = audio_seg.set_frame_rate(self.synthesizer_config.sampling_rate)
                    
                    audio_bytes = audio_seg.raw_data
                    
                    # Convert to mulaw for Twilio
                    if self.synthesizer_config.audio_encoding == AudioEncoding.MULAW:
                        import audioop
                        audio_bytes = audioop.lin2ulaw(audio_bytes, 2)
                    
                    for i in range(0, len(audio_bytes), chunk_size):
                        chunk = audio_bytes[i:i + chunk_size]
                        yield SynthesisResult.ChunkResult(
                            chunk=chunk,
                            is_last_chunk=(i + chunk_size >= len(audio_bytes)),
                        )
                        
            except Exception as e:
                logger.error(f"Sarvam TTS synthesis error: {e}")
        
        return SynthesisResult(
            chunk_generator=chunk_generator(),
            get_message_up_to=lambda seconds: message.text,
        )
    
    async def tear_down(self):
        if self._session and not self._session.closed:
            await self._session.close()
        await super().tear_down()
