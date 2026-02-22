import asyncio
import os

from dotenv import load_dotenv

from vocode.streaming.models.agent import ChatGPTAgentConfig
from vocode.streaming.models.message import BaseMessage
from vocode.streaming.models.synthesizer import CartesiaSynthesizerConfig
from vocode.streaming.models.telephony import TwilioConfig
from vocode.streaming.models.transcriber import DeepgramTranscriberConfig
from vocode.streaming.transcriber.deepgram_transcriber import DeepgramEndpointingConfig

load_dotenv()

from vocode.streaming.telephony.config_manager.redis_config_manager import RedisConfigManager
from vocode.streaming.telephony.conversation.outbound_call import OutboundCall

BASE_URL = os.environ["BASE_URL"]

SYSTEM_PROMPT = """You are a friendly AI voice assistant on a live phone call.
RULES:
- You ARE on a real-time phone call. You CAN hear the caller.
- Keep responses short but complete. 1-3 sentences max.
- Always respond in clear English.
- Be warm, helpful, and conversational. Sound like a real person, not robotic.
- Give useful answers, not just one-word replies.
- If the caller wants to end the call, say "Goodbye" at the end.
- Never use emojis, markdown, or special characters.
- If you don't understand, ask them to repeat.
- If asked who made you, created you, or developed you, say you were developed by the team at Solution AI."""


async def main():
    config_manager = RedisConfigManager()

    outbound_call = OutboundCall(
        base_url=BASE_URL,
        to_phone="+916398912969",  # <-- PUT YOUR PHONE NUMBER HERE
        from_phone="+19787189580",  # Your Twilio number
        config_manager=config_manager,
        agent_config=ChatGPTAgentConfig(
            initial_message=BaseMessage(text="Hello! How are you doing today?"),
            prompt_preamble=SYSTEM_PROMPT,
            generate_responses=True,
            model_name="llama-3.3-70b-versatile",  # Groq: ~200ms inference
            openai_api_key=os.environ.get("GROQ_API_KEY"),
            base_url_override="https://api.groq.com/openai/v1",
            temperature=0.2,
            max_tokens=80,
            # -- Stability settings --
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
                vad_threshold_ms=200,       # Was 500ms — react faster to speech end
                utterance_cutoff_ms=500,    # Was 1000ms — cut off sooner
            ),
            min_interrupt_confidence=0.1,
            mute_during_speech=False,
            language="en",
            model="nova-2"
        ),
        # Cartesia TTS — clear English voice, low latency
        synthesizer_config=CartesiaSynthesizerConfig.from_telephone_output_device(
            model_id="sonic",  # English-optimized, lowest latency
            voice_id="c63361f8-d142-4c62-8da7-8f8149d973d6",  # Krishna - Friendly Pal
        ),
    )

    input("Press enter to start call...")
    await outbound_call.start()


if __name__ == "__main__":
    asyncio.run(main())
