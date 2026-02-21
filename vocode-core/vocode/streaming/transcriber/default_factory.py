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
            # Hard fallback: use Deepgram STT when Sarvam STT is unstable.
            logger.warning("Sarvam transcriber requested; forcing Deepgram fallback transcriber")
            deepgram_config = DeepgramTranscriberConfig(
                sampling_rate=transcriber_config.sampling_rate,
                audio_encoding=transcriber_config.audio_encoding,
                chunk_size=transcriber_config.chunk_size,
                endpointing_config=transcriber_config.endpointing_config,
                downsampling=transcriber_config.downsampling,
                min_interrupt_confidence=transcriber_config.min_interrupt_confidence,
                mute_during_speech=transcriber_config.mute_during_speech,
                language="hi",
                model="nova-2",
            )
            return DeepgramTranscriber(deepgram_config)
        else:
            raise Exception("Invalid transcriber config")

