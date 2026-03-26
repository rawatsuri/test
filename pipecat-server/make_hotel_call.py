"""
Test: Outbound Hotel Booking Call
Usage:
  python make_hotel_call.py +91XXXXXXXXXX [language]

Examples:
  python make_hotel_call.py +919053916964           # Hindi (default)
  python make_hotel_call.py +919053916964 en-IN     # English
"""

import os
import sys
import json
import uuid
import time
import requests
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv(override=False)

ACCOUNT_SID    = os.getenv("TWILIO_ACCOUNT_SID")
AUTH_TOKEN     = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE   = os.getenv("TWILIO_PHONE_NUMBER", "+19787189580")
PIPECAT_PUBLIC_URL = os.getenv("PIPECAT_PUBLIC_URL")

if not PIPECAT_PUBLIC_URL:
    print("❌ ERROR: Set PIPECAT_PUBLIC_URL in .env  (your ngrok URL for port 3001)")
    sys.exit(1)

WS_URL = PIPECAT_PUBLIC_URL.replace("https://", "wss://").replace("http://", "ws://")


def make_hotel_call(to_number: str, language: str = "hi-IN"):
    client = Client(ACCOUNT_SID, AUTH_TOKEN)

    config_payload = {
        "language": language,
        "tts_provider": "cartesia",
        "stt_provider": "deepgram",
        "llm_provider": "groq",
        "llm_model": "llama-3.3-70b-versatile",
        "context": {
            "agent_type": "hotel",
        },
    }

    print(f"📡 Creating hotel booking pipeline session …")
    try:
        resp = requests.post("http://localhost:3001/conversations", json=config_payload, timeout=10)
        resp.raise_for_status()
        result = resp.json()
        session_id = result.get("conversation_id", str(uuid.uuid4()))
        print(f"✅ Session: {session_id}")
    except Exception as e:
        print(f"❌ Could not reach Pipecat server: {e}")
        sys.exit(1)

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{WS_URL}/connect_call/{session_id}">
            <Parameter name="sessionId" value="{session_id}"/>
        </Stream>
    </Connect>
</Response>"""

    print(f"📞 Calling {to_number} from {TWILIO_PHONE} …")
    print(f"🏨 Agent type: Hotel Booking")
    print(f"🌐 Language: {language}")
    try:
        call = client.calls.create(twiml=twiml, to=to_number, from_=TWILIO_PHONE)
        print(f"✅ Call SID: {call.sid}")
        print("📱 Answer your phone to talk to Ria!")
        print("\n   Press Ctrl+C to hang up early")
    except Exception as e:
        print(f"❌ Twilio error: {e}")
        sys.exit(1)

    try:
        while True:
            time.sleep(3)
            call = client.calls(call.sid).fetch()
            print(f"   Status: {call.status}")
            if call.status in ("completed", "failed", "busy", "no-answer", "canceled"):
                break
    except KeyboardInterrupt:
        print("\n🔴 Hanging up …")
        client.calls(call.sid).update(status="completed")

    print(f"\n📊 Final status: {call.status}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_hotel_call.py +91XXXXXXXXXX [language]")
        print("Examples:")
        print('  python make_hotel_call.py +919053916964          # Hindi')
        print('  python make_hotel_call.py +919053916964 en-IN    # English')
        sys.exit(1)

    to_number = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else "hi-IN"
    make_hotel_call(to_number, language)
