import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

# Auto-load .env from telephony_app (same API keys)
_env_path = Path(__file__).resolve().parent.parent / "telephony_app" / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path)
# Also try project-root .env
_root_env = Path(__file__).resolve().parent.parent.parent.parent / ".env"
if _root_env.exists():
    load_dotenv(dotenv_path=_root_env, override=False)

from fastapi import Body, Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger
from pydantic import BaseModel, Field

from vocode.streaming.models.agent import (
    AnthropicAgentConfig,
    ChatGPTAgentConfig,
    FillerAudioConfig,
    GroqAgentConfig,
)
from vocode.streaming.models.message import BaseMessage
from vocode.streaming.models.synthesizer import (
    AZURE_SYNTHESIZER_DEFAULT_VOICE_NAME,
    AzureSynthesizerConfig,
    CartesiaSynthesizerConfig,
    ElevenLabsSynthesizerConfig,
    GoogleSynthesizerConfig,
    PlayHtSynthesizerConfig,
    SarvamSynthesizerConfig,
)
from vocode.streaming.models.telephony import TwilioCallConfig
from vocode.streaming.models.transcriber import (
    AssemblyAITranscriberConfig,
    AzureTranscriberConfig,
    DeepgramTranscriberConfig,
    GoogleTranscriberConfig,
    PunctuationEndpointingConfig,
    SarvamTranscriberConfig,
    TimeEndpointingConfig,
)
from vocode.streaming.telephony.config_manager.in_memory_config_manager import (
    InMemoryConfigManager,
)
from vocode.streaming.telephony.config_manager.redis_config_manager import RedisConfigManager
from vocode.streaming.telephony.server.router.calls import CallsRouter
from vocode.streaming.utils import create_conversation_id


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_indic_language(language: Optional[str], default: str = "hi-IN") -> str:
    if not language:
        return default
    value = language.strip()
    if not value:
        return default
    normalized = value.replace("_", "-")
    if "-" in normalized:
        return normalized
    return f"{normalized.lower()}-IN"


def _normalize_base_url(value: Optional[str]) -> str:
    if not value:
        value = os.environ.get("RENDER_EXTERNAL_HOSTNAME") or os.environ.get(
            "RENDER_INTERNAL_HOSTNAME"
        )
    if not value:
        raise ValueError("BASE_URL (host only) is required (or set RENDER_EXTERNAL_HOSTNAME).")
    value = value.strip()
    value = value.removeprefix("https://").removeprefix("http://")
    return value.rstrip("/")


def _auth(x_api_key: Optional[str] = Header(default=None, alias="X-API-Key")) -> None:
    expected = os.environ.get("VOCODE_API_KEY")
    if not expected:
        return
    if not x_api_key or x_api_key != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _get_config_manager():
    if os.environ.get("USE_IN_MEMORY_CONFIG_MANAGER", "").lower() in ("1", "true", "yes"):
        logger.warning("Using InMemoryConfigManager — NOT suitable for multi-worker production!")
        return InMemoryConfigManager()
    return RedisConfigManager()


# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------

class CreateConversationRequest(BaseModel):
    call_id: str
    tenant_id: str
    system_prompt: str
    language: str = "en"
    voice_id: Optional[str] = None

    # Provider selection (super admin controlled)
    stt_provider: str = "deepgram"
    tts_provider: str = "azure"
    llm_provider: str = "openai"

    # Per-tenant API keys (optional, falls back to env vars)
    stt_api_key: Optional[str] = None
    tts_api_key: Optional[str] = None
    llm_api_key: Optional[str] = None

    # ── LLM parameters ──
    llm_model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None

    # ── STT parameters ──
    stt_model: Optional[str] = None
    stt_language: Optional[str] = None
    endpointing_type: Optional[str] = "time"          # "time" | "punctuation"
    endpointing_time_cutoff: Optional[float] = 0.22   # seconds

    # ── TTS parameters ──
    tts_model: Optional[str] = None
    tts_voice_id: Optional[str] = None                 # provider-specific voice
    tts_rate: Optional[int] = None                     # Azure speech rate (0-100)
    tts_pitch: Optional[float] = None                  # Sarvam pitch (-0.75 to 0.75)
    tts_speed: Optional[float] = None                  # Sarvam pace / PlayHT speed
    tts_stability: Optional[float] = None              # ElevenLabs stability
    tts_similarity_boost: Optional[float] = None       # ElevenLabs similarity
    tts_optimize_latency: Optional[int] = 4            # ElevenLabs streaming (0-4)
    tts_language_code: Optional[str] = None            # Azure/Google language code

    # ── Agent behavior ──
    use_backchannels: Optional[bool] = False
    backchannel_probability: Optional[float] = 0.7
    first_response_filler_message: Optional[str] = None
    send_filler_audio: Optional[bool] = False
    interrupt_sensitivity: Optional[str] = "low"       # "low" | "high"
    initial_message_delay: Optional[float] = 0.0

    # Telephony metadata
    provider: str = "twilio"
    from_phone: Optional[str] = None
    to_phone: Optional[str] = None
    provider_call_id: Optional[str] = None

    context: Optional[Dict[str, Any]] = Field(default=None)


class CreateConversationResponse(BaseModel):
    conversation_id: str


# ---------------------------------------------------------------------------
# Provider Config Factory Functions
# ---------------------------------------------------------------------------

def _build_endpointing_config(req: CreateConversationRequest):
    """Build endpointing config — time-based by default for lowest latency."""
    ep_type = (req.endpointing_type or "time").lower()
    if ep_type == "punctuation":
        return PunctuationEndpointingConfig(
            time_cutoff_seconds=req.endpointing_time_cutoff or 0.4,
        )
    # Default: time-based with 220ms cutoff for snappy responses
    return TimeEndpointingConfig(
        time_cutoff_seconds=req.endpointing_time_cutoff or 0.22,
    )


def _build_transcriber_config(req: CreateConversationRequest):
    """Build STT transcriber config based on provider selection."""
    stt = req.stt_provider.lower()
    endpointing = _build_endpointing_config(req)

    if stt == "sarvam":
        sarvam_lang = _normalize_indic_language(
            req.stt_language or req.language, default="hi-IN"
        )
        return SarvamTranscriberConfig.from_telephone_input_device(
            endpointing_config=endpointing,
            language=sarvam_lang,
            api_key=req.stt_api_key,
            model=req.stt_model or "saaras:v3",
            mode=getattr(req, 'stt_mode', None) or "transcribe",
        )

    if stt == "assembly_ai":
        return AssemblyAITranscriberConfig.from_telephone_input_device(
            endpointing_config=endpointing,
            end_utterance_silence_threshold_milliseconds=int(
                (req.endpointing_time_cutoff or 0.22) * 1000
            ),
        )

    if stt == "google":
        return GoogleTranscriberConfig.from_telephone_input_device(
            endpointing_config=endpointing,
            language_code=req.stt_language or req.language or "en-US",
            model=req.stt_model or None,
        )

    if stt == "azure":
        return AzureTranscriberConfig.from_telephone_input_device(
            endpointing_config=endpointing,
            language=req.stt_language or req.language or "en-US",
        )

    # Default: Deepgram — best latency + accuracy for telephony
    return DeepgramTranscriberConfig.from_telephone_input_device(
        endpointing_config=endpointing,
        model=req.stt_model or "nova-2",
        tier=None,  # nova-2 doesn't use tier
        language=req.stt_language or req.language or None,
        api_key=req.stt_api_key,
    )


def _build_agent_config(req: CreateConversationRequest):
    """Build LLM agent config based on provider selection."""
    # Resolve greeting and memory from context
    greeting = None
    memory_prompt = None
    if req.context:
        greeting = req.context.get("greeting")
        memory_prompt = req.context.get("memoryPrompt")

    prompt_preamble = req.system_prompt.strip()
    if memory_prompt:
        prompt_preamble = f"{prompt_preamble}\n\nMEMORY CONTEXT:\n{memory_prompt}"

    initial_message = BaseMessage(text=greeting or "Hello!")

    # Common agent behavior params
    use_backchannels = req.use_backchannels or False
    backchannel_probability = req.backchannel_probability or 0.7
    first_response_filler = req.first_response_filler_message
    interrupt_sensitivity = req.interrupt_sensitivity or "low"
    send_filler_audio = req.send_filler_audio or False
    initial_message_delay = req.initial_message_delay or 0.0

    filler_audio_config = FillerAudioConfig() if send_filler_audio else False

    llm = req.llm_provider.lower()

    if llm == "groq":
        return GroqAgentConfig(
            prompt_preamble=prompt_preamble,
            groq_api_key=req.llm_api_key,
            initial_message=initial_message,
            model_name=req.llm_model or "llama3-70b-8192",
            temperature=req.temperature if req.temperature is not None else 0.1,
            max_tokens=req.max_tokens or 64,
            use_backchannels=use_backchannels,
            backchannel_probability=backchannel_probability,
            first_response_filler_message=first_response_filler,
            interrupt_sensitivity=interrupt_sensitivity,
            send_filler_audio=filler_audio_config,
            initial_message_delay=initial_message_delay,
        )

    if llm == "anthropic":
        return AnthropicAgentConfig(
            prompt_preamble=prompt_preamble,
            anthropic_api_key=req.llm_api_key,
            initial_message=initial_message,
            model_name=req.llm_model or "claude-3-haiku-20240307",
            temperature=req.temperature if req.temperature is not None else 0.1,
            max_tokens=req.max_tokens or 64,
            interrupt_sensitivity=interrupt_sensitivity,
            send_filler_audio=filler_audio_config,
            initial_message_delay=initial_message_delay,
        )

    # Default: OpenAI ChatGPT
    return ChatGPTAgentConfig(
        prompt_preamble=prompt_preamble,
        openai_api_key=req.llm_api_key,
        initial_message=initial_message,
        model_name=req.llm_model or "gpt-4o-mini",
        temperature=req.temperature if req.temperature is not None else 0.1,
        max_tokens=req.max_tokens or 64,
        use_backchannels=use_backchannels,
        backchannel_probability=backchannel_probability,
        first_response_filler_message=first_response_filler,
        interrupt_sensitivity=interrupt_sensitivity,
        send_filler_audio=filler_audio_config,
        initial_message_delay=initial_message_delay,
    )


def _build_synthesizer_config(req: CreateConversationRequest):
    """Build TTS synthesizer config based on provider selection."""
    # Common telephony audio settings from TwilioCallConfig defaults
    default_synth = TwilioCallConfig.default_synthesizer_config()
    sampling_rate = default_synth.sampling_rate
    audio_encoding = default_synth.audio_encoding

    tts = req.tts_provider.lower()
    voice_id = req.tts_voice_id or req.voice_id

    if tts in ("11labs", "elevenlabs", "eleven_labs"):
        return ElevenLabsSynthesizerConfig(
            sampling_rate=sampling_rate,
            audio_encoding=audio_encoding,
            api_key=req.tts_api_key,
            voice_id=voice_id or "pNInz6obpgDQGcFmaJgB",  # Adam voice
            optimize_streaming_latency=req.tts_optimize_latency if req.tts_optimize_latency is not None else 4,
            stability=req.tts_stability,
            similarity_boost=req.tts_similarity_boost,
            model_id=req.tts_model or "eleven_turbo_v2_5",
        )

    if tts == "sarvam":
        sarvam_lang = _normalize_indic_language(
            req.tts_language_code or req.language, default="hi-IN"
        )
        return SarvamSynthesizerConfig(
            sampling_rate=sampling_rate,
            audio_encoding=audio_encoding,
            api_key=req.tts_api_key,
            model=req.tts_model or "bulbul:v2",
            target_language_code=sarvam_lang,
            pitch=req.tts_pitch if req.tts_pitch is not None else 0.0,
            speed=req.tts_speed if req.tts_speed is not None else 1.15,
            loudness=1.0,
        )

    if tts == "cartesia":
        return CartesiaSynthesizerConfig(
            sampling_rate=sampling_rate,
            audio_encoding=audio_encoding,
            api_key=req.tts_api_key,
            model_id=req.tts_model or "sonic-english",
            voice_id=voice_id or "f9836c6e-a0bd-460e-9d3c-f7299fa60f94",
        )

    if tts == "google":
        return GoogleSynthesizerConfig(
            sampling_rate=sampling_rate,
            audio_encoding=audio_encoding,
            language_code=req.tts_language_code or req.language or "en-US",
            voice_name=voice_id or "en-US-Neural2-I",
            speaking_rate=req.tts_speed if req.tts_speed is not None else 1.2,
            pitch=req.tts_pitch if req.tts_pitch is not None else 0,
        )

    if tts in ("play_ht", "playht"):
        return PlayHtSynthesizerConfig(
            sampling_rate=sampling_rate,
            audio_encoding=audio_encoding,
            api_key=req.tts_api_key,
            voice_id=voice_id or "larry",
            speed=req.tts_speed,
            version="2",
        )

    # Default: Azure — fast, reliable, good for Indian English
    return AzureSynthesizerConfig(
        sampling_rate=sampling_rate,
        audio_encoding=audio_encoding,
        voice_name=voice_id or AZURE_SYNTHESIZER_DEFAULT_VOICE_NAME,
        rate=req.tts_rate if req.tts_rate is not None else 28,
        pitch=int(req.tts_pitch) if req.tts_pitch is not None else 0,
        language_code=req.tts_language_code or req.language or "en-US",
    )


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------

app = FastAPI(docs_url=None)

BASE_URL = _normalize_base_url(os.environ.get("BASE_URL"))
config_manager = _get_config_manager()

# Log request validation failures (422) for easier debugging.
@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    try:
        logger.error(
            "Request validation error on {} {}: {} | body={}",
            request.method,
            request.url.path,
            exc.errors(),
            getattr(exc, "body", None),
        )
    except Exception:
        pass
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


# WebSocket endpoint used by Twilio <Connect><Stream url="wss://.../connect_call/{conversationId}">
app.include_router(CallsRouter(base_url=BASE_URL, config_manager=config_manager).get_router())


@app.get("/health")
def health() -> Dict[str, str]:
    return {"message": "ok"}


@app.post("/conversations", response_model=CreateConversationResponse, dependencies=[Depends(_auth)])
async def create_conversation(
    payload: CreateConversationRequest = Body(...)
) -> CreateConversationResponse:
    if payload.provider.lower() != "twilio":
        raise HTTPException(
            status_code=400,
            detail="Only provider=twilio is supported by node_bridge right now.",
        )

    logger.info(
        "Creating conversation: stt={} tts={} llm={} model={} lang={}",
        payload.stt_provider,
        payload.tts_provider,
        payload.llm_provider,
        payload.llm_model,
        payload.language,
    )

    # Build configs using factory functions
    transcriber_config = _build_transcriber_config(payload)
    agent_config = _build_agent_config(payload)
    synthesizer_config = _build_synthesizer_config(payload)

    conversation_id = create_conversation_id()

    from_phone = payload.from_phone or "unknown"
    to_phone = payload.to_phone or "unknown"
    twilio_sid = payload.provider_call_id or payload.call_id or conversation_id

    call_config = TwilioCallConfig(
        transcriber_config=transcriber_config,
        agent_config=agent_config,
        synthesizer_config=synthesizer_config,
        from_phone=from_phone,
        to_phone=to_phone,
        twilio_sid=twilio_sid,
        twilio_config=None,
        direction="inbound",
    )

    await config_manager.save_config(conversation_id, call_config)

    logger.info(
        "Conversation {} created successfully (stt={}, tts={}, llm={})",
        conversation_id,
        payload.stt_provider,
        payload.tts_provider,
        payload.llm_provider,
    )

    return CreateConversationResponse(conversation_id=conversation_id)


@app.post("/conversations/{conversation_id}/end", dependencies=[Depends(_auth)])
async def end_conversation(conversation_id: str) -> Dict[str, str]:
    await config_manager.delete_config(conversation_id)
    return {"status": "ended"}


@app.post("/conversations/{conversation_id}/transfer", dependencies=[Depends(_auth)])
async def transfer_conversation(conversation_id: str) -> Dict[str, str]:
    raise HTTPException(status_code=501, detail="Transfer not implemented in node_bridge.")
