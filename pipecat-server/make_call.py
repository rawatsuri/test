"""
Generic Outbound Call Script
Makes a call from your Twilio number to any phone,
connecting audio to the Pipecat voice AI pipeline.

Usage:
  python make_call.py +91XXXXXXXXXX [key=value ...]
  python make_call.py +91XXXXXXXXXX '{"language":"hi-IN","tts_provider":"cartesia"}'

Examples:
  python make_call.py +919053916964 language=hi-IN tts_provider=cartesia
  python make_call.py +919053916964 language=en-IN tts_provider=elevenlabs llm_provider=openai
"""

import os
import sys
import json
import uuid
import time
import requests
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv(override=True)

ACCOUNT_SID        = os.getenv("TWILIO_ACCOUNT_SID")
AUTH_TOKEN         = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE       = os.getenv("TWILIO_PHONE_NUMBER", "+19787189580")
PIPECAT_PUBLIC_URL = os.getenv("PIPECAT_PUBLIC_URL")

if not PIPECAT_PUBLIC_URL:
    print("❌ ERROR: Set PIPECAT_PUBLIC_URL in .env")
    print("   Example: PIPECAT_PUBLIC_URL=https://abc123.ngrok-free.app")
    print("   Start ngrok with: ngrok http 3001")
    sys.exit(1)

WS_URL = PIPECAT_PUBLIC_URL.replace("https://", "wss://").replace("http://", "ws://")


def make_call(to_number: str, args_list: list = []):
    client = Client(ACCOUNT_SID, AUTH_TOKEN)
    session_id = str(uuid.uuid4())
    config_payload = {}

    # Parse args: either a single JSON string or key=value pairs
    if args_list and args_list[0].startswith("{"):
        try:
            config_payload = json.loads(args_list[0])
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON config: {e}")
            sys.exit(1)
    else:
        for arg in args_list:
            if "=" in arg:
                key, val = arg.split("=", 1)
                config_payload[key.strip()] = val.strip()

    print(f"📡 Creating pipeline session with config: {config_payload or '(defaults)'}")
    try:
        resp = requests.post("http://localhost:3001/conversations", json=config_payload, timeout=10)
        resp.raise_for_status()
        result = resp.json()
        session_id = result.get("conversation_id", session_id)
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
    try:
        call = client.calls.create(twiml=twiml, to=to_number, from_=TWILIO_PHONE)
        print(f"✅ Call SID: {call.sid}")
        print("📱 Answer your phone to talk to the AI!")
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
        print("Usage: python make_call.py +91XXXXXXXXXX [key=value overrides]")
        sys.exit(1)

    to_number = sys.argv[1]
    args_list = sys.argv[2:]
    make_call(to_number, args_list)