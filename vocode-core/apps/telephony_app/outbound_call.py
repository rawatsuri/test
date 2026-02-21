import asyncio
import os

from dotenv import load_dotenv

from vocode.streaming.models.agent import ChatGPTAgentConfig, FillerAudioConfig
from vocode.streaming.models.message import BaseMessage
from vocode.streaming.models.synthesizer import SarvamSynthesizerConfig
from vocode.streaming.models.telephony import TwilioConfig
from vocode.streaming.models.transcriber import SarvamTranscriberConfig, TimeEndpointingConfig

load_dotenv()

from vocode.streaming.telephony.config_manager.redis_config_manager import RedisConfigManager
from vocode.streaming.telephony.conversation.outbound_call import OutboundCall

BASE_URL = os.environ["BASE_URL"]

# --- Agent Configuration ---
SYSTEM_PROMPT = """You are a friendly AI voice assistant on a live phone call in India.
You are speaking with someone who uses Hinglish (a mix of Hindi and English).
RULES:
- You CAN hear the caller. You are on a real-time phone call.
- Keep responses SHORT: 1-2 sentences maximum.
- Match the caller's language: if they speak Hindi, reply in Hindi. If English, reply in English. If Hinglish, reply in Hinglish.
- Be conversational and natural, like a real person.
- Never say you cannot hear or that you are text-based.
- Never use emojis, markdown, or special characters.
- If you don't understand something, ask them to repeat politely."""


async def main():
    config_manager = RedisConfigManager()

    outbound_call = OutboundCall(
        base_url=BASE_URL,
        to_phone="+916398912969",  # <-- PUT YOUR PHONE NUMBER HERE
        from_phone="+19787189580",  # Your Twilio number
        config_manager=config_manager,
        agent_config=ChatGPTAgentConfig(
            initial_message=BaseMessage(text="Hello! Kaise hain aap? Main aapki kya madad kar sakta hoon?"),
            prompt_preamble=SYSTEM_PROMPT,
            generate_responses=True,
            model_name="gpt-4o-mini",
            temperature=0.3,
            # -- Stability settings --
            allowed_idle_time_seconds=60,
            num_check_human_present_times=3,
            send_filler_audio=FillerAudioConfig(
                silence_threshold_seconds=1.5,
                use_phrases=True,
            ),
            interrupt_sensitivity="low",
            end_conversation_on_goodbye=True,
        ),
        telephony_config=TwilioConfig(
            account_sid=os.environ["TWILIO_ACCOUNT_SID"],
            auth_token=os.environ["TWILIO_AUTH_TOKEN"],
        ),
        # Sarvam AI for best Hinglish STT
        transcriber_config=SarvamTranscriberConfig.from_telephone_input_device(
            endpointing_config=TimeEndpointingConfig(time_cutoff_seconds=0.8),
            language="hi-IN", # Explicitly set to Hindi/Hinglish
        ),
        # Sarvam AI for natural Indian TTS
        synthesizer_config=SarvamSynthesizerConfig.from_telephone_output_device(
            model="bulbul:v3",
            target_language_code="hi-IN",
        ),
    )

    input("Press enter to start call...")
    await outbound_call.start()


if __name__ == "__main__":
    asyncio.run(main())
