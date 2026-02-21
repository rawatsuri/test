import asyncio
import time
from os import getenv
from typing import Optional

from loguru import logger

from vocode.streaming.models.transcriber import (
    AssemblyAITranscriberConfig,
    AzureTranscriberConfig,
    DeepgramTranscriberConfig,
    GladiaTranscriberConfig,
    GoogleTranscriberConfig,
    RevAITranscriberConfig,
    SarvamTranscriberConfig,
    TranscriberConfig,
)
from vocode.streaming.transcriber.abstract_factory import AbstractTranscriberFactory
from vocode.streaming.transcriber.assembly_ai_transcriber import AssemblyAITranscriber
from vocode.streaming.transcriber.azure_transcriber import AzureTranscriber
from vocode.streaming.transcriber.deepgram_transcriber import DeepgramTranscriber
from vocode.streaming.transcriber.gladia_transcriber import GladiaTranscriber
from vocode.streaming.transcriber.google_transcriber import GoogleTranscriber
from vocode.streaming.transcriber.rev_ai_transcriber import RevAITranscriber


# ── Sarvam health cache ─────────────────────────────────────────
# Checked once on first call, then re-checked every 5 minutes.
_sarvam_health: Optional[bool] = None
_sarvam_health_ts: float = 0.0
_HEALTH_TTL_SECONDS = 300  # Re-check every 5 minutes


def _sarvam_to_deepgram_fallback(transcriber_config: SarvamTranscriberConfig):
    """
    Build a Deepgram config optimized for Hinglish (Hindi-English code-mixing).
    Uses nova-2 model with 'hi' language — Deepgram's nova-2 handles
    Hinglish code-switching natively and avoids 'multi' model hallucinations.
    """
    deepgram_config = DeepgramTranscriberConfig(
        sampling_rate=transcriber_config.sampling_rate,
        audio_encoding=transcriber_config.audio_encoding,
        chunk_size=transcriber_config.chunk_size,
        endpointing_config=transcriber_config.endpointing_config,
        downsampling=transcriber_config.downsampling,
        min_interrupt_confidence=transcriber_config.min_interrupt_confidence or 0.3,
        mute_during_speech=False, # CRITICAL: explicitly ensure microphone isn't muted while AI talks
        language="hi",
        model="nova-2",
    )
    return deepgram_config


def _check_sarvam_sync(config: SarvamTranscriberConfig) -> bool:
    """
    Synchronous Sarvam health check. Runs in a background thread
    to avoid async event loop conflicts. Returns True if healthy.
    """
    import json
    import threading

    result = {"healthy": False}

    def _check():
        import asyncio as _asyncio

        async def _do_check():
            try:
                import websockets
                from vocode.streaming.transcriber.sarvam_transcriber import (
                    SarvamTranscriber,
                )

                url = (
                    f"{SarvamTranscriber.SARVAM_WS_URL}"
                    f"?sample_rate=16000&mode={SarvamTranscriber.SARVAM_MODE}"
                    f"&input_audio_codec=pcm_s16le"
                    f"&language-code={config.language or 'hi-IN'}"
                    f"&model={SarvamTranscriber.SARVAM_MODEL}"
                )
                api_key = config.api_key or getenv("SARVAM_API_KEY", "")
                headers = {"api-subscription-key": api_key}

                async with websockets.connect(
                    url, additional_headers=headers, open_timeout=3
                ) as ws:
                    silence = b"\x00" * 3200
                    for _ in range(3):
                        await ws.send(silence)
                    try:
                        msg = await _asyncio.wait_for(ws.recv(), timeout=2.0)
                        data = json.loads(msg)
                        if data.get("type") == "error":
                            return False
                        return True
                    except _asyncio.TimeoutError:
                        return True  # No error = healthy
            except Exception:
                return False

        result["healthy"] = _asyncio.run(_do_check())

    t = threading.Thread(target=_check, daemon=True)
    t.start()
    t.join(timeout=5)  # Max 5s total
    return result["healthy"]


class DefaultTranscriberFactory(AbstractTranscriberFactory):
    def create_transcriber(
        self,
        transcriber_config: TranscriberConfig,
    ):
        if isinstance(transcriber_config, DeepgramTranscriberConfig):
            return DeepgramTranscriber(transcriber_config)
        elif isinstance(transcriber_config, GoogleTranscriberConfig):
            return GoogleTranscriber(transcriber_config)
        elif isinstance(transcriber_config, AssemblyAITranscriberConfig):
            return AssemblyAITranscriber(transcriber_config)
        elif isinstance(transcriber_config, RevAITranscriberConfig):
            return RevAITranscriber(transcriber_config)
        elif isinstance(transcriber_config, AzureTranscriberConfig):
            return AzureTranscriber(transcriber_config)
        elif isinstance(transcriber_config, GladiaTranscriberConfig):
            return GladiaTranscriber(transcriber_config)
        elif isinstance(transcriber_config, SarvamTranscriberConfig):
            return self._create_sarvam_or_fallback(transcriber_config)
        else:
            raise Exception("Invalid transcriber config")

    def _create_sarvam_or_fallback(self, transcriber_config: SarvamTranscriberConfig):
        """
        Production-ready Sarvam STT with automatic Deepgram fallback.

        - Health-checks Sarvam once, caches result for 5 minutes
        - If Sarvam is healthy -> SarvamTranscriber
        - If Sarvam is down -> Deepgram nova-2 Hindi (handles Hinglish)
        - Auto-recovers when Sarvam comes back online
        """
        global _sarvam_health, _sarvam_health_ts

        now = time.time()
        if _sarvam_health is None or (now - _sarvam_health_ts) > _HEALTH_TTL_SECONDS:
            logger.info("Running Sarvam STT health check...")
            _sarvam_health = _check_sarvam_sync(transcriber_config)
            _sarvam_health_ts = now
            logger.info(f"Sarvam STT health: {'HEALTHY' if _sarvam_health else 'UNAVAILABLE'}")

        if _sarvam_health:
            from vocode.streaming.transcriber.sarvam_transcriber import SarvamTranscriber
            print("[STT] Provider: Sarvam STT (healthy)")
            return SarvamTranscriber(transcriber_config)
        else:
            print("[STT] Provider: Deepgram nova-2 Hindi (Sarvam unavailable)")
            fallback_config = _sarvam_to_deepgram_fallback(transcriber_config)
            return DeepgramTranscriber(fallback_config)
