import asyncio
from os import getenv

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


def _sarvam_to_deepgram_fallback(transcriber_config: SarvamTranscriberConfig):
    """
    Build a Deepgram config that mirrors the Sarvam config for Hindi/Indic STT.
    Deepgram nova-2 supports Hindi (lang='hi') at 0.78-0.99 confidence.
    """
    lang = getattr(transcriber_config, "language", None) or "hi"
    # Strip region code for Deepgram (e.g. "hi-IN" -> "hi")
    if lang and "-" in lang:
        lang = lang.split("-")[0]

    deepgram_config = DeepgramTranscriberConfig(
        sampling_rate=transcriber_config.sampling_rate,
        audio_encoding=transcriber_config.audio_encoding,
        chunk_size=transcriber_config.chunk_size,
        endpointing_config=transcriber_config.endpointing_config,
        downsampling=transcriber_config.downsampling,
        min_interrupt_confidence=transcriber_config.min_interrupt_confidence,
        mute_during_speech=transcriber_config.mute_during_speech,
        language=lang,
        model="nova-2",
    )
    return deepgram_config


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
        Try to create a Sarvam transcriber. If Sarvam STT API is unhealthy
        (returning pipeline errors or connection failures), automatically
        fall back to Deepgram nova-2 with Hindi language support.

        This ensures callers never experience dead silence due to a
        provider outage while still using Sarvam when it's available.
        """
        # Quick health check
        try:
            healthy = asyncio.get_event_loop().run_until_complete(
                self._check_sarvam_health(transcriber_config)
            )
        except RuntimeError:
            try:
                healthy = asyncio.run(self._check_sarvam_health(transcriber_config))
            except Exception as e:
                logger.warning(f"Sarvam health check failed ({e}); using Deepgram fallback")
                healthy = False

        if healthy:
            from vocode.streaming.transcriber.sarvam_transcriber import SarvamTranscriber
            logger.info("Sarvam STT health check passed - using SarvamTranscriber")
            print("[STT] Using: Sarvam STT (healthy)")
            return SarvamTranscriber(transcriber_config)
        else:
            logger.warning(
                "Sarvam STT is currently unavailable - using Deepgram nova-2 "
                "with Hindi support as fallback. Sarvam will be used automatically "
                "once their API recovers."
            )
            print("[STT] Using: Deepgram nova-2 (Sarvam unavailable)")
            fallback_config = _sarvam_to_deepgram_fallback(transcriber_config)
            return DeepgramTranscriber(fallback_config)

    async def _check_sarvam_health(self, config: SarvamTranscriberConfig) -> bool:
        """
        Quick connectivity + pipeline check against Sarvam STT.
        Returns True if Sarvam is healthy, False otherwise.
        """
        try:
            import json
            import websockets
            from vocode.streaming.transcriber.sarvam_transcriber import SarvamTranscriber

            url = (
                f"{SarvamTranscriber.SARVAM_WS_URL}"
                f"?sample_rate=16000&mode={SarvamTranscriber.SARVAM_MODE}"
                f"&input_audio_codec=pcm_s16le"
                f"&language-code={config.language or 'hi-IN'}"
                f"&model={SarvamTranscriber.SARVAM_MODEL}"
            )
            api_key = config.api_key or getenv("SARVAM_API_KEY", "")
            headers = {"api-subscription-key": api_key}

            async with websockets.connect(url, additional_headers=headers) as ws:
                # Send a small burst of silence
                silence = b"\x00" * 3200  # 100ms
                for _ in range(5):
                    await ws.send(silence)

                # Wait for a response
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
                    data = json.loads(msg)
                    if data.get("type") == "error":
                        err = data.get("data", {}).get("message", "")
                        logger.warning(f"Sarvam health check got error: {err}")
                        return False
                    return True
                except asyncio.TimeoutError:
                    # No error = silence was accepted = healthy
                    return True
        except Exception as e:
            logger.warning(f"Sarvam health check exception: {type(e).__name__}: {e}")
            return False
