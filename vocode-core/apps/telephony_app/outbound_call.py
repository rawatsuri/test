import asyncio
import os

from dotenv import load_dotenv

from vocode.streaming.models.agent import ChatGPTAgentConfig
from vocode.streaming.models.message import BaseMessage
from vocode.streaming.models.synthesizer import SarvamSynthesizerConfig
from vocode.streaming.models.telephony import TwilioConfig
from vocode.streaming.models.transcriber import DeepgramTranscriberConfig
from vocode.streaming.transcriber.deepgram_transcriber import DeepgramEndpointingConfig

load_dotenv()

from vocode.streaming.telephony.config_manager.redis_config_manager import RedisConfigManager
from vocode.streaming.telephony.conversation.outbound_call import OutboundCall

BASE_URL = os.environ["BASE_URL"]

# Keep responses to ONE short sentence to minimize TTS calls
SYSTEM_PROMPT = """You are a friendly AI voice assistant on a live phone call with an Indian customer.
RULES:
- Keep responses to ONE short sentence. Do NOT give long answers.
- ALWAYS respond in Hindi Devanagari script. Example: "हाँ बिल्कुल, मैं आपकी help कर सकता हूँ।"
- Mix common English words naturally (like help, appointment, booking, okay, problem).
- Do NOT use Romanized Hindi. ALWAYS use Devanagari script.
- Answer EXACTLY what the caller asks. If they ask about a person, answer about that person. If they ask about weather, answer about weather. Do NOT force medical/doctor topics.
- Be warm, conversational, and accurate.
- Never make up facts. If you don't know, say "मुझे इसका पक्का answer नहीं पता।"
- Never use emojis, markdown, or special characters.
- If asked who made you, say "Solution AI की team ने मुझे develop किया है।"
- If caller says bye/goodbye, say "Goodbye" at the end."""


async def main():
    config_manager = RedisConfigManager()

    outbound_call = OutboundCall(
        base_url=BASE_URL,
        to_phone="+916398912969",
        from_phone="+19787189580",
        config_manager=config_manager,
        agent_config=ChatGPTAgentConfig(
            initial_message=BaseMessage(text="हेलो! आप कैसे हैं आज?"),
            prompt_preamble=SYSTEM_PROMPT,
            generate_responses=True,
            model_name="llama-3.3-70b-versatile",
            openai_api_key=os.environ.get("GROQ_API_KEY"),
            base_url_override="https://api.groq.com/openai/v1",
            temperature=0.3,
            max_tokens=80,  # enough for one full Hindi sentence
            allowed_idle_time_seconds=60,
            num_check_human_present_times=3,
            initial_message_delay=0.0,
            send_filler_audio=False,
            use_backchannels=True,
            backchannel_probability=0.8,
            interrupt_sensitivity="high",
            end_conversation_on_goodbye=True,
        ),
        telephony_config=TwilioConfig(
            account_sid=os.environ["TWILIO_ACCOUNT_SID"],
            auth_token=os.environ["TWILIO_AUTH_TOKEN"],
        ),
        transcriber_config=DeepgramTranscriberConfig.from_telephone_input_device(
            endpointing_config=DeepgramEndpointingConfig(
                vad_threshold_ms=200,
                utterance_cutoff_ms=500,
            ),
            min_interrupt_confidence=0.1,
            mute_during_speech=False,
            language="hi",
            model="nova-2"
        ),
        # Sarvam TTS — Hindi streaming
        synthesizer_config=SarvamSynthesizerConfig.from_telephone_output_device(
            model="bulbul:v3",
            target_language_code="hi-IN",
        ),
    )

    input("Press enter to start call...")
    await outbound_call.start()


if __name__ == "__main__":
    asyncio.run(main())
