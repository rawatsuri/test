from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import asyncio
import os
import uvicorn
import json
from dotenv import load_dotenv

from vocode.streaming.models.agent import ChatGPTAgentConfig
from vocode.streaming.models.message import BaseMessage
from vocode.streaming.models.synthesizer import SarvamSynthesizerConfig, CartesiaSynthesizerConfig
from vocode.streaming.models.telephony import TwilioConfig
from vocode.streaming.models.transcriber import DeepgramTranscriberConfig
from vocode.streaming.transcriber.deepgram_transcriber import DeepgramEndpointingConfig
from vocode.streaming.telephony.server.base import TelephonyServer, TwilioInboundCallConfig
from vocode.streaming.telephony.config_manager.redis_config_manager import RedisConfigManager
from vocode.streaming.telephony.conversation.outbound_call import OutboundCall
from vocode.streaming.action.execute_external_action import ExecuteExternalActionVocodeActionConfig
from pyngrok import ngrok
from loguru import logger
from urllib.parse import urlparse
import sys
from pathlib import Path

# Try to load the main backend env
env_path = Path(__file__).resolve().parent.parent.parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

# Then explicitly load the telephony_app env which contains the specific Voice AI keys 
telephony_env_path = Path(__file__).resolve().parent.parent / 'telephony_app' / '.env'
if telephony_env_path.exists():
    load_dotenv(dotenv_path=telephony_env_path)

app = FastAPI()

BOOK_APPOINTMENT_INPUT_SCHEMA = json.dumps(
    {
        "type": "object",
        "properties": {
            "patient_name": {"type": "string", "description": "Full name of the patient"},
            "phone_number": {"type": "string", "description": "Patient contact number"},
            "appointment_date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
            "appointment_time": {
                "type": "string",
                "description": "Time in HH:MM format (24-hour)",
            },
            "reason_for_visit": {
                "type": "string",
                "description": "Chief complaint or reason for appointment",
            },
            "is_new_patient": {"type": "boolean", "description": "Whether this is a new patient"},
            "urgency": {
                "type": "string",
                "enum": ["routine", "urgent", "emergency"],
                "description": "Urgency level",
            },
            "call_id": {"type": "string", "description": "Optional internal call id"},
        },
        "required": [
            "patient_name",
            "phone_number",
            "appointment_date",
            "appointment_time",
            "reason_for_visit",
        ],
    }
)

BOOK_APPOINTMENT_TOOL_PROMPT = """
Tool usage policy:
- If the caller asks to book/schedule an appointment and required details are available,
  call book_appointment.
- Required details: patient_name, phone_number, appointment_date, appointment_time, reason_for_visit.
- If details are missing, ask only for the missing details and then call the function.
- Do not confirm a booking unless the function result has success=true.
""".strip()


def build_book_appointment_action() -> ExecuteExternalActionVocodeActionConfig:
    backend_base_url = os.environ.get("BACKEND_BASE_URL", "http://127.0.0.1:5000").rstrip("/")
    signature_secret = os.environ.get("VOCODE_ACTION_SIGNATURE_SECRET_BASE64", "")
    return ExecuteExternalActionVocodeActionConfig(
        processing_mode="muted",
        name="book_appointment",
        description="Book a medical appointment for the patient",
        url=f"{backend_base_url}/api/internal/tools/book-appointment",
        input_schema=BOOK_APPOINTMENT_INPUT_SCHEMA,
        speak_on_send=False,
        speak_on_receive=False,
        signature_secret=signature_secret,
    )

def _strip_scheme(url_or_host: str) -> str:
    value = (url_or_host or "").strip()
    if not value: return ""
    if "://" not in value: return value
    return urlparse(value).netloc or value.replace("https://", "").replace("http://", "")

def resolve_base_url() -> str:
    # Hardcoded active ngrok URL provided by user for local E2E testing
    return "mausolean-theodore-planklike.ngrok-free.dev"

BASE_URL = resolve_base_url()
redis_config_manager = RedisConfigManager()

# Mount the Telephony Server to handle Twilio's SIP/Stream webhooks
telephony_server = TelephonyServer(
    base_url=BASE_URL,
    config_manager=redis_config_manager,
    inbound_call_configs=[],
)
app.include_router(telephony_server.get_router())

class CreateCallRequest(BaseModel):
    to_phone: str
    from_phone: str
    system_prompt: str
    greeting: str
    
    # Models
    llm_provider: str
    llm_model: str
    tts_provider: str
    stt_provider: str

@app.post("/create_call")
async def create_call(req: CreateCallRequest):
    effective_prompt = f"{req.system_prompt}\n\n{BOOK_APPOINTMENT_TOOL_PROMPT}".strip()
    print(f"🚀 Received Request to Call {req.to_phone} from {req.from_phone}")
    
    # 1. Build Agent Config (LLM)
    max_tokens = 80
    temperature = 0.3
    model_name = req.llm_model
    
    if req.llm_provider.upper() == "GROQ":
        if not model_name or "gpt" in model_name: 
            model_name = "llama-3.3-70b-versatile"
            
        from vocode.streaming.models.agent import GroqAgentConfig
        agent_config = GroqAgentConfig(
            initial_message=BaseMessage(text=req.greeting),
            prompt_preamble=effective_prompt,
            generate_responses=True,
            model_name=model_name,
            groq_api_key=os.environ.get("GROQ_API_KEY"),
            temperature=temperature,
            max_tokens=max_tokens,
            allowed_idle_time_seconds=60,
            num_check_human_present_times=3,
            initial_message_delay=0.0,
            send_filler_audio=False,
            use_backchannels=True,
            backchannel_probability=0.8,
            interrupt_sensitivity="high",
            end_conversation_on_goodbye=True,
            actions=[build_book_appointment_action()],
        )
    else:
        base_url_override = None
        api_key_override = None
        # Default fallback to ChatGPT Agent for OpenAI or other compatible endpoints
        agent_config = ChatGPTAgentConfig(
            initial_message=BaseMessage(text=req.greeting),
            prompt_preamble=effective_prompt,
            generate_responses=True,
            model_name=model_name,
            base_url_override=base_url_override,
            openai_api_key=api_key_override,
            temperature=temperature,
            max_tokens=max_tokens,
            allowed_idle_time_seconds=60,
            num_check_human_present_times=3,
            initial_message_delay=0.0,
            send_filler_audio=False,
            use_backchannels=True,
            backchannel_probability=0.8,
            interrupt_sensitivity="high",
            end_conversation_on_goodbye=True,
            actions=[build_book_appointment_action()],
        )

    # 2. Build STT Config
    transcriber_config = DeepgramTranscriberConfig.from_telephone_input_device(
        endpointing_config=DeepgramEndpointingConfig(
            vad_threshold_ms=200,
            utterance_cutoff_ms=500,
        ),
        min_interrupt_confidence=0.1,
        mute_during_speech=False,
        language="hi",
        model="nova-2"
    )

    # 3. Build TTS Config
    if req.tts_provider.upper() == "SARVAM":
        synthesizer_config = SarvamSynthesizerConfig.from_telephone_output_device(
            model="bulbul:v3",
            target_language_code="hi-IN",
            api_key=os.environ.get("SARVAM_API_KEY")
        )
    elif req.tts_provider.upper() == "CARTESIA":
        synthesizer_config = CartesiaSynthesizerConfig.from_telephone_output_device(
            model_id="sonic-multilingual",
            voice_id="79a125e8-cd45-4c13-8a67-188112f4dd22", # Friendly Pal
            language="hi"
        )
    else:
        # Fallback Azure
        from vocode.streaming.models.synthesizer import AzureSynthesizerConfig
        synthesizer_config = AzureSynthesizerConfig.from_telephone_output_device(
            voice_name="hi-IN-SwaraNeural"
        )

    # 4. Trigger Outbound Call
    outbound_call = OutboundCall(
        base_url=BASE_URL,
        to_phone=req.to_phone,
        from_phone=req.from_phone,
        config_manager=redis_config_manager,
        agent_config=agent_config,
        telephony_config=TwilioConfig(
            account_sid=os.environ["TWILIO_ACCOUNT_SID"],
            auth_token=os.environ["TWILIO_AUTH_TOKEN"],
        ),
        transcriber_config=transcriber_config,
        synthesizer_config=synthesizer_config,
    )

    asyncio.create_task(outbound_call.start())
    return {"status": "success", "message": f"Calling {req.to_phone}..."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
