"""
Sarvam AI TTS synthesizer with HTTP streaming for low-latency audio.
Uses POST to /text-to-speech/stream with chunked response.
"""

import asyncio
import base64
import io
import time as _time
from typing import AsyncGenerator, Optional

import aiohttp
from loguru import logger

from vocode import getenv
from vocode.streaming.models.audio import AudioEncoding
from vocode.streaming.models.message import BaseMessage
from vocode.streaming.models.synthesizer import (
    SarvamSynthesizerConfig,
)
from vocode.streaming.synthesizer.base_synthesizer import (
    BaseSynthesizer,
    SynthesisResult,
)

SARVAM_STREAM_URL = "https://api.sarvam.ai/text-to-speech/stream"


class SarvamSynthesizer(BaseSynthesizer[SarvamSynthesizerConfig]):
    
    def __init__(self, synthesizer_config: SarvamSynthesizerConfig):
        super().__init__(synthesizer_config)
        self.api_key = synthesizer_config.api_key or getenv("SARVAM_API_KEY")
        if not self.api_key:
            raise ValueError("Please set SARVAM_API_KEY environment variable")

    async def create_speech(
        self,
        message: BaseMessage,
        chunk_size: int,
        is_first_text_chunk: bool = False,
        is_sole_text_chunk: bool = False,
    ) -> SynthesisResult:

        async def chunk_generator() -> AsyncGenerator[SynthesisResult.ChunkResult, None]:
            import audioop

            clean_text = message.text.strip()
            if not clean_text or clean_text.lower() in ["<silence>", "[silence]"]:
                return

            tts_start = _time.monotonic()
            print(f"[TIMING] TTS synthesize: '{clean_text}' at t={tts_start:.3f}")

            headers = {
                "api-subscription-key": self.api_key,
                "Content-Type": "application/json",
            }

            # Request 8kHz mulaw directly — exactly what Twilio needs!
            payload = {
                "text": clean_text,
                "target_language_code": self.synthesizer_config.target_language_code,
                "model": "bulbul:v3",
                "speech_sample_rate": 8000,
                "output_audio_codec": "mulaw",
                "enable_preprocessing": True,
            }
            if self.synthesizer_config.speed != 1.0:
                payload["pace"] = self.synthesizer_config.speed

            first_byte_logged = False
            total_bytes = 0
            buffer = bytearray()

            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        SARVAM_STREAM_URL,
                        json=payload,
                        headers=headers,
                    ) as response:
                        if not response.ok:
                            error_text = await response.text()
                            print(f"[Sarvam TTS] ERROR {response.status}: {error_text[:300]}")
                            return

                        # Stream chunks as they arrive — already mulaw, send to Twilio directly
                        async for audio_chunk in response.content.iter_any():
                            if not audio_chunk:
                                continue

                            if not first_byte_logged:
                                first_byte_logged = True
                                elapsed = (_time.monotonic() - tts_start) * 1000
                                print(f"[TIMING] TTS first byte: {elapsed:.0f}ms")

                            total_bytes += len(audio_chunk)
                            buffer.extend(audio_chunk)

                            # Yield chunks to Twilio as they fill up
                            while len(buffer) >= chunk_size:
                                yield SynthesisResult.ChunkResult(
                                    chunk=bytes(buffer[:chunk_size]),
                                    is_last_chunk=False,
                                )
                                buffer = buffer[chunk_size:]

                elapsed = (_time.monotonic() - tts_start) * 1000
                print(f"[TIMING] TTS done: {total_bytes}B in {elapsed:.0f}ms")

                # Flush remaining buffer
                if buffer:
                    yield SynthesisResult.ChunkResult(
                        chunk=bytes(buffer), is_last_chunk=True
                    )

            except Exception as e:
                import traceback
                print(f"[Sarvam TTS] CRITICAL: {e}")
                traceback.print_exc()

        return SynthesisResult(
            chunk_generator=chunk_generator(),
            get_message_up_to=lambda seconds: message.text,
        )
