"""
Outbound COD Confirmation Call
Usage:
  python make_cod_call.py +91XXXXXXXXXX "Customer Name" "Item Name" "4500"
"""

import os
import sys
import json
import uuid
import requests
import time
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv(override=True)

ACCOUNT_SID    = os.getenv("TWILIO_ACCOUNT_SID")
AUTH_TOKEN     = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE   = os.getenv("TWILIO_PHONE_NUMBER", "+19787189580")
PIPECAT_PUBLIC_URL = os.getenv("PIPECAT_PUBLIC_URL")

if not PIPECAT_PUBLIC_URL:
    print("❌ ERROR: Set PIPECAT_PUBLIC_URL in .env  (your ngrok URL for port 3001)")
    sys.exit(1)

WS_URL = PIPECAT_PUBLIC_URL.replace("https://", "wss://").replace("http://", "ws://")


# ---------------------------------------------------------------------------
# Number → Hindi words  (supports up to crores)
# ---------------------------------------------------------------------------

_ONES = [
    "", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस",
    "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस",
    "बीस", "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताईस", "अठाईस", "उनतीस",
    "तीस", "इकतीस", "बत्तीस", "तैंतीस", "चौंतीस", "पैंतीस", "छत्तीस", "सैंतीस", "अड़तीस", "उनतालीस",
    "चालीस", "इकतालीस", "बयालीस", "तैंतालीस", "चवालीस", "पैंतालीस", "छियालीस", "सैंतालीस", "अड़तालीस", "उनचास",
    "पचास", "इक्यावन", "बावन", "तिरपन", "चौवन", "पचपन", "छप्पन", "सत्तावन", "अठ्ठावन", "उनसठ",
    "साठ", "इकसठ", "बासठ", "तिरसठ", "चौंसठ", "पैंसठ", "छियासठ", "सड़सठ", "अड़सठ", "उनहत्तर",
    "सत्तर", "इकहत्तर", "बहत्तर", "तिहत्तर", "चौहत्तर", "पचहत्तर", "छिहत्तर", "सतहत्तर", "अठहत्तर", "उनासी",
    "अस्सी", "इक्यासी", "बयासी", "तिरासी", "चौरासी", "पचासी", "छियासी", "सत्तासी", "अठ्ठासी", "नवासी",
    "नब्बे", "इक्यानवे", "बानवे", "तिरानवे", "चौरानवे", "पंचानवे", "छियानवे", "सत्तानवे", "अठ्ठानवे", "निन्यानवे",
]

def _to_words(n: int) -> str:
    if n == 0:
        return "शून्य"
    parts = []
    if n >= 10_000_000:
        parts.append(_ONES[n // 10_000_000] + " करोड़")
        n %= 10_000_000
    if n >= 100_000:
        parts.append(_ONES[n // 100_000] + " लाख")
        n %= 100_000
    if n >= 1_000:
        parts.append(_ONES[n // 1_000] + " हज़ार")
        n %= 1_000
    if n >= 100:
        parts.append(_ONES[n // 100] + " सौ")
        n %= 100
    if n > 0:
        parts.append(_ONES[n])
    return " ".join(parts)


def amount_to_hindi_words(amount_str: str) -> str:
    """Convert a numeric string (may contain commas/spaces) to Hindi words."""
    digits = "".join(c for c in amount_str if c.isdigit())
    if not digits:
        return amount_str
    return _to_words(int(digits))


# ---------------------------------------------------------------------------
# Build prompt — STRICT, no room for hallucination
# ---------------------------------------------------------------------------

def build_system_prompt(customer_name: str, item_name: str, amount: str, amount_words: str) -> str:
    return f"""You are 'Ria', an AI agent for Flash E-Commerce.

## YOUR ONLY JOB
Confirm or cancel ONE Cash-on-Delivery order. Nothing else.

## ORDER DETAILS (READ-ONLY — do not change these)
- Customer name : {customer_name}
- Item          : {item_name}
- Amount        : {amount_words} rupaye  ← USE THESE WORDS EXACTLY

## PRODUCT & DELIVERY FACTS (answer ONLY from this list)
- Delivery time      : 2 se 3 din mein
- Delivery charges   : Free delivery
- Return policy      : 7 din replacement warranty
- Open box delivery  : Haan, delivery executive ke saamne box khol ke check kar sakte hain aur tab pay kar sakte hain

## CONVERSATION FLOW
1. Greet → ask if they placed this order and want it delivered.
2. If YES / they confirm → say order confirm ho gaya, cash ready rakhein, goodbye.
3. If they ASK A QUESTION → answer ONLY from "PRODUCT & DELIVERY FACTS" above, then re-ask step 1.
4. If ONLY BACKGROUND NOISE / unclear → ask "Hello, sun pa rahe hain aap?" — NEVER cancel on noise.
5. If they EXPLICITLY say cancel / nahi chahiye / nahi lena → confirm cancellation, say goodbye.

## ABSOLUTE RULES — NEVER BREAK
- NEVER write any digit (0 1 2 3 4 5 6 7 8 9). Write ALL numbers as Hindi Devanagari words.
- NEVER make up information not listed above.
- NEVER answer questions unrelated to this order (e.g. other products, news, anything else).
- Keep EVERY reply to 1–2 short sentences. No lists, no bullet points.
- Speak natural Hinglish — mix Hindi and English the way the customer does.
"""


# ---------------------------------------------------------------------------
# Make the call
# ---------------------------------------------------------------------------

def make_cod_call(to_number: str, customer_name: str, item_name: str, amount: str):
    client = Client(ACCOUNT_SID, AUTH_TOKEN)

    amount_clean = amount.replace(",", "").strip()
    amount_words = amount_to_hindi_words(amount_clean)

    system_prompt = build_system_prompt(customer_name, item_name, amount, amount_words)

    # Greeting — spoken amount in Hindi words, NOT digits
    greeting = (
        f"Hello {customer_name} ji! Main Flash E-Commerce se Ria bol rahi hoon. "
        f"Aapka ek cash on delivery order hai — {item_name} — "
        f"jiska amount {amount_words} rupaye hai. "
        f"Kya aap yeh order receive karna chahte hain?"
    )

    config_payload = {
        "language"       : "hi-IN",
        "tts_provider"   : "azure",
        "stt_provider"   : "deepgram",
        "llm_provider"   : "groq",
        "llm_model"      : "llama-3.3-70b-versatile",
        "system_prompt"  : system_prompt,
        "context": {
            "greeting"       : greeting,
            "customer_name"  : customer_name,
            "item_name"      : item_name,
            "amount"         : amount,
        },
    }

    print(f"📡 Creating pipeline session …")
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
        print("Usage: python make_cod_call.py +91XXXXXXXXXX [customer_name] [item_name] [amount]")
        print('Example: python make_cod_call.py +919053916964 "Rahul" "Nike Shoes" "4500"')
        sys.exit(1)

    to_number     = sys.argv[1]
    customer_name = sys.argv[2] if len(sys.argv) > 2 else "Customer"
    item_name     = sys.argv[3] if len(sys.argv) > 3 else "Apple iPhone 15 Pro Max"
    amount        = sys.argv[4] if len(sys.argv) > 4 else "99000"

    make_cod_call(to_number, customer_name, item_name, amount)