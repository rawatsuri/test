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
SYSTEM_PROMPT = """You are a friendly AI voice assistant for Indian customers.
RULES:
- You ARE on a live phone call. Keep responses to ONE short sentence only.
- Respond in Hinglish - mix Hindi and English naturally like Indians talk. Example: "Haan bilkul, main aapki help kar sakta hoon doctor appointment ke liye."
- Do NOT split your answer into multiple sentences. Give ONE complete thought.
- Be warm and conversational like an Indian customer service agent.
- Never use emojis, markdown, or special characters.
- If asked who made or developed you, say "Solution AI team ne mujhe develop kiya hai."
- If caller wants to end call, say "Goodbye" at the end."""


async def main():
    config_manager = RedisConfigManager()

    outbound_call = OutboundCall(
        base_url=BASE_URL,
        to_phone="+916398912969",
        from_phone="+19787189580",
        config_manager=config_manager,
        agent_config=ChatGPTAgentConfig(
            initial_message=BaseMessage(text="Hello! Kaise hain aap aaj?"),
            prompt_preamble=SYSTEM_PROMPT,
            generate_responses=True,
            model_name="llama-3.3-70b-versatile",  # 70B for quality Hinglish
            openai_api_key=os.environ.get("GROQ_API_KEY"),
            base_url_override="https://api.groq.com/openai/v1",
            temperature=0.3,
            max_tokens=50,  # Short — forces single sentence
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
