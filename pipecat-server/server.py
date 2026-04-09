"""
Pipecat Voice Pipeline Server — FIXED
FastAPI server that handles Twilio/Plivo/Exotel media streams and runs voice AI pipelines.
"""

import asyncio
import json
import os
import re
import time
import uuid
from typing import Dict, Optional
from urllib import error as urllib_error
from urllib import request as urllib_request

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from loguru import logger
from pydantic import BaseModel

load_dotenv(override=True)

# Pipecat imports
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import (
    EndFrame,
    LLMContextFrame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    LLMTextFrame,
    TTSSpeakFrame,
    TTSStartedFrame,
    TTSAudioRawFrame,
    TextFrame,
    TranscriptionFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
# SentenceAggregator intentionally NOT used — each TTS provider handles
# text aggregation internally, removing it cuts ~300ms latency.
from pipecat.serializers.twilio import TwilioFrameSerializer
from pipecat.transcriptions.language import Language
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)
from pipecat.turns.user_start import VADUserTurnStartStrategy
from pipecat.turns.user_stop import SpeechTimeoutUserTurnStopStrategy
from pipecat.turns.user_turn_strategies import UserTurnStrategies
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

app = FastAPI(title="Pipecat Voice Pipeline Server")

# Active pipeline sessions
sessions: Dict[str, dict] = {}

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:5001").rstrip("/")
INTERNAL_API_SECRET = os.getenv("INTERNAL_API_SECRET")

HOTEL_CITY_HINTS = [
    "delhi",
    "दिल्ली",
    "mumbai",
    "मुंबई",
    "bombay",
    "goa",
    "गोवा",
    "jaipur",
    "जयपुर",
    "udaipur",
    "उदयपुर",
    "bangalore",
    "bengaluru",
    "बैंगलोर",
    "बेंगलुरु",
    "shimla",
    "शिमला",
    "manali",
    "मनाली",
    "rishikesh",
    "ऋषिकेश",
    "varanasi",
    "वाराणसी",
    "agra",
    "आगरा",
    "ooty",
    "ऊटी",
    "उटी",
]

NUMBER_WORDS = {
    "एक": 1,
    "दो": 2,
    "तीन": 3,
    "चार": 4,
    "पांच": 5,
    "पाँच": 5,
    "छह": 6,
    "सात": 7,
    "आठ": 8,
    "नौ": 9,
    "दस": 10,
    "eleven": 11,
    "ten": 10,
    "nine": 9,
    "eight": 8,
    "seven": 7,
    "six": 6,
    "five": 5,
    "four": 4,
    "three": 3,
    "two": 2,
    "one": 1,
}


def _cleanup_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s+([?.!,।])", r"\1", text)
    return text


def _parse_number_token(token: str) -> Optional[int]:
    if not token:
        return None
    token = token.strip().lower()
    if token.isdigit():
        return int(token)
    return NUMBER_WORDS.get(token)


def _normalize_runtime_context(context: Optional[dict]) -> dict:
    context = dict(context or {})
    if "callerContext" in context and "caller_context" not in context:
        context["caller_context"] = context["callerContext"]
    if "memoryPrompt" in context and "memory_prompt" not in context:
        context["memory_prompt"] = context["memoryPrompt"]
    if "fallbackMessage" in context and "fallback_message" not in context:
        context["fallback_message"] = context["fallbackMessage"]
    if "maxCallDuration" in context and "max_call_duration" not in context:
        context["max_call_duration"] = context["maxCallDuration"]
    return context


def _append_memory_prompt(system_prompt: str, runtime_context: dict) -> str:
    memory_prompt = runtime_context.get("memory_prompt")
    if not memory_prompt:
        return system_prompt

    memory_prompt = str(memory_prompt).strip()
    if not memory_prompt:
        return system_prompt

    return f"{system_prompt.strip()}\n\n## CALLER CONTEXT\n{memory_prompt}"


async def _post_internal_event(call_id: Optional[str], action: str, payload: dict) -> None:
    if not call_id:
        return

    url = f"{BACKEND_BASE_URL}/api/internal/calls/{call_id}/{action}"
    headers = {
        "Content-Type": "application/json",
    }
    if INTERNAL_API_SECRET:
        headers["X-Internal-Api-Secret"] = INTERNAL_API_SECRET

    def _send() -> None:
        data = json.dumps(payload).encode("utf-8")
        req = urllib_request.Request(url, data=data, headers=headers, method="POST")
        with urllib_request.urlopen(req, timeout=5) as response:
            response.read()

    try:
        await asyncio.to_thread(_send)
    except urllib_error.HTTPError as error:
        logger.warning(f"Failed internal event {action} for {call_id}: HTTP {error.code}")
    except Exception as error:
        logger.warning(f"Failed internal event {action} for {call_id}: {error}")


def _truncate_text(text: str, limit: int = 180) -> str:
    text = _cleanup_text(text)
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def _build_call_summary(state: dict, agent_type: str) -> Optional[str]:
    entries = state.get("transcript_entries", [])
    if not entries:
        return None

    caller_entries = [entry["content"] for entry in entries if entry["role"] == "CALLER"]
    agent_entries = [entry["content"] for entry in entries if entry["role"] == "AGENT"]

    last_caller = _truncate_text(caller_entries[-1]) if caller_entries else ""
    last_agent = _truncate_text(agent_entries[-1]) if agent_entries else ""

    if last_caller and last_agent:
        return f"Caller discussed {last_caller} Assistant replied {last_agent}"
    if last_caller:
        return f"Caller discussed {last_caller}"
    if last_agent:
        prefix = "Assistant handled the call"
        if agent_type in {"doctor", "hotel", "booking"}:
            prefix = f"Assistant handled the {agent_type} request"
        return f"{prefix}. Final response: {last_agent}"
    return None


def _build_generic_extraction(state: dict, agent_type: str) -> Optional[dict]:
    last_user_text = _cleanup_text(state.get("last_user_text", ""))
    last_assistant_text = _cleanup_text(state.get("last_assistant_text", ""))

    if not last_user_text and not last_assistant_text:
        return None

    return {
        "type": "conversation_summary",
        "data": {
            "agent_type": agent_type,
            "caller_request": last_user_text or None,
            "assistant_response": last_assistant_text or None,
            "turn_count": state.get("turn_id", 0),
        },
        "confidence": 0.5,
    }


def _extract_booking_fields(text: str, booking_state: dict) -> dict:
    cleaned = _cleanup_text(text)
    lowered = cleaned.lower()
    extracted: dict[str, object] = {}

    for city in HOTEL_CITY_HINTS:
        if city in lowered:
            extracted["city"] = city
            break

    if any(token in lowered for token in ["आज", "today"]):
        extracted["check_in"] = "आज"
    elif any(token in lowered for token in ["परसों", "day after tomorrow"]):
        extracted["check_in"] = "परसों"
    elif any(token in lowered for token in ["कल", "tomorrow"]):
        extracted["check_in"] = "कल"

    nights_match = re.search(
        r"\b(\d+|एक|दो|तीन|चार|पांच|पाँच|छह|सात|आठ|नौ|दस|one|two|three|four|five|six|seven|eight|nine|ten)\s+"
        r"(दिन|दिवस|day|days|रात|रातें|night|nights)\b",
        lowered,
    )
    if nights_match:
        nights = _parse_number_token(nights_match.group(1))
        if nights:
            extracted["nights"] = nights

    guests_match = re.search(
        r"\b(\d+|एक|दो|तीन|चार|पांच|पाँच|छह|सात|आठ|नौ|दस|one|two|three|four|five|six|seven|eight|nine|ten)\s+"
        r"(लोग|guest|guests|मेहमान|adult|adults)\b",
        lowered,
    )
    if guests_match:
        guests = _parse_number_token(guests_match.group(1))
        if guests:
            extracted["guests"] = guests

    if any(token in lowered for token in ["suite", "सुइट"]):
        extracted["room_type"] = "suite"
    elif any(token in lowered for token in ["family room", "फैमिली रूम"]):
        extracted["room_type"] = "family"
    elif any(token in lowered for token in ["deluxe", "डीलक्स"]):
        extracted["room_type"] = "deluxe"
    elif any(token in lowered for token in ["standard", "स्टैंडर्ड"]):
        extracted["room_type"] = "standard"

    if any(token in lowered for token in ["budget", "बजट"]):
        extracted["budget"] = "budget"
    elif any(token in lowered for token in ["mid-range", "mid range", "मिड-रेंज", "मिड रेंज"]):
        extracted["budget"] = "mid-range"
    elif any(token in lowered for token in ["premium", "प्रीमियम"]):
        extracted["budget"] = "premium"

    if any(
        token in lowered
        for token in ["hotel book", "होटल बुक", "booking", "बुकिंग", "room book", "रूम चाहिए", "hotel चाहिए"]
    ):
        extracted["intent"] = "booking"

    asked_slot = booking_state.get("last_requested_slot")
    if asked_slot == "check_in" and cleaned in {"कल", "परसों", "आज"}:
        extracted["check_in"] = cleaned
    elif asked_slot == "guests":
        value = _parse_number_token(lowered)
        if value:
            extracted["guests"] = value

    return extracted


def _update_booking_state(state: dict, user_text: str) -> None:
    booking_state = state.setdefault(
        "booking_state",
        {
            "intent": None,
            "city": None,
            "check_in": None,
            "nights": None,
            "guests": None,
            "room_type": None,
            "budget": None,
            "guest_name": None,
            "contact_number": None,
            "last_requested_slot": None,
        },
    )

    extracted = _extract_booking_fields(user_text, booking_state)
    if extracted.get("intent") == "booking" or any(
        extracted.get(key) for key in ["city", "check_in", "nights", "guests", "room_type", "budget"]
    ):
        booking_state["intent"] = "booking"

    for key in ["city", "check_in", "nights", "guests", "room_type", "budget"]:
        if extracted.get(key) is not None:
            booking_state[key] = extracted[key]


class StageLatencyTracker(FrameProcessor):
    def __init__(self, session_id: str, stage: str, state: dict):
        super().__init__()
        self._session_id = session_id
        self._stage = stage
        self._state = state

    async def process_frame(self, frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if self._stage == "stt" and isinstance(frame, TranscriptionFrame) and frame.finalized:
            turn_id = self._state.get("turn_id", 0)
            last_logged = self._state.get("stt_logged_turn")
            if turn_id and turn_id != last_logged:
                self._state["stt_logged_turn"] = turn_id
                self._state["stt_final_at"] = time.monotonic()
                started_at = self._state.get("turn_started_at")
                if started_at:
                    logger.info(
                        f"⏱️ [{self._session_id}] STT finalized in "
                        f"{self._state['stt_final_at'] - started_at:.3f}s | transcript={frame.text!r}"
                    )

        elif self._stage == "llm" and isinstance(frame, LLMTextFrame):
            turn_id = self._state.get("turn_id", 0)
            last_logged = self._state.get("llm_logged_turn")
            if turn_id and turn_id != last_logged:
                self._state["llm_logged_turn"] = turn_id
                self._state["llm_first_token_at"] = time.monotonic()
                turn_stopped_at = self._state.get("turn_stopped_at")
                stt_final_at = self._state.get("stt_final_at")
                parts = []
                if turn_stopped_at:
                    parts.append(f"after turn-stop={self._state['llm_first_token_at'] - turn_stopped_at:.3f}s")
                if stt_final_at:
                    parts.append(f"after stt={self._state['llm_first_token_at'] - stt_final_at:.3f}s")
                logger.info(f"⏱️ [{self._session_id}] LLM first token | {' | '.join(parts)}")

        elif self._stage == "tts" and isinstance(frame, (TTSStartedFrame, TTSAudioRawFrame)):
            turn_id = self._state.get("turn_id", 0)
            last_logged = self._state.get("tts_logged_turn")
            if turn_id and turn_id != last_logged:
                self._state["tts_logged_turn"] = turn_id
                self._state["tts_first_audio_at"] = time.monotonic()
                turn_stopped_at = self._state.get("turn_stopped_at")
                llm_first_token_at = self._state.get("llm_first_token_at")
                parts = []
                if turn_stopped_at:
                    parts.append(
                        f"after turn-stop={self._state['tts_first_audio_at'] - turn_stopped_at:.3f}s"
                    )
                if llm_first_token_at:
                    parts.append(
                        f"after llm={self._state['tts_first_audio_at'] - llm_first_token_at:.3f}s"
                    )
                logger.info(f"⏱️ [{self._session_id}] TTS first audio | {' | '.join(parts)}")

        await self.push_frame(frame, direction)


class ContextSanitizer(FrameProcessor):
    def __init__(self, max_history_messages: int = 8):
        super().__init__()
        self._max_history_messages = max_history_messages

    def _content_text(self, message) -> str:
        if not isinstance(message, dict):
            return ""
        content = message.get("content")
        if isinstance(content, str):
            return content.strip()
        return ""

    async def process_frame(self, frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, LLMContextFrame):
            original_messages = frame.context.get_messages()
            if original_messages:
                system_messages = []
                history_messages = []

                for index, message in enumerate(original_messages):
                    if not isinstance(message, dict):
                        continue

                    role = message.get("role")
                    content = self._content_text(message)

                    if index == 0 and role == "system":
                        system_messages.append(message)
                        continue

                    if role not in {"user", "assistant"}:
                        history_messages.append(message)
                        continue

                    if not content:
                        continue

                    cleaned_message = {**message, "content": content}

                    if history_messages and isinstance(history_messages[-1], dict):
                        prev_role = history_messages[-1].get("role")
                        prev_content = self._content_text(history_messages[-1])
                        if prev_role == role == "user" and prev_content and content:
                            history_messages[-1] = {
                                **history_messages[-1],
                                "content": f"{prev_content} {content}".strip(),
                            }
                            continue
                        if prev_role == role and prev_content == content:
                            continue

                    history_messages.append(cleaned_message)

                sanitized_messages = system_messages + history_messages[-self._max_history_messages :]
                frame.context.set_messages(sanitized_messages)

        await self.push_frame(frame, direction)


class AssistantResponseNormalizer(FrameProcessor):
    def __init__(self, state: dict, agent_type: str):
        super().__init__()
        self._state = state
        self._agent_type = agent_type
        self._buffer = []
        self._in_response = False

    def _cleanup(self, text: str) -> str:
        return _cleanup_text(text)

    def _sentence_key(self, text: str) -> str:
        return re.sub(r"[^\w\u0900-\u097F]+", "", text).lower()

    def _split_sentences(self, text: str) -> list[str]:
        parts = re.split(r"(?<=[?.!।])\s*", text)
        return [part.strip() for part in parts if part.strip()]

    def _build_capability_reply(self) -> str:
        if self._agent_type == "hotel":
            return "मैं होटल बुकिंग में मदद कर सकती हूँ, बताइए आपको क्या चाहिए?"
        if self._agent_type == "doctor":
            return "मैं डॉक्टर अपॉइंटमेंट बुकिंग में मदद कर सकती हूँ, बताइए आपको क्या चाहिए?"
        return "मैं आपकी मदद कर सकती हूँ, बताइए आपको क्या चाहिए?"

    def _build_scope_boundary_reply(self) -> str:
        if self._agent_type == "hotel":
            return "अभी मैं सिर्फ होटल बुकिंग में मदद कर सकती हूँ, अगर होटल चाहिए तो शहर बताइए।"
        if self._agent_type == "doctor":
            return "अभी मैं सिर्फ डॉक्टर अपॉइंटमेंट बुकिंग में मदद कर सकती हूँ, अगर appointment चाहिए तो बताइए।"
        return "अभी मैं इसी कॉल से जुड़ी मदद कर सकती हूँ, बताइए आपको क्या चाहिए।"

    def _looks_like_acknowledgement_only(self, text: str) -> bool:
        normalized = re.sub(r"[^a-zA-Z\u0900-\u097F\s]", " ", text.lower())
        normalized = re.sub(r"\s+", " ", normalized).strip()
        if not normalized:
            return True

        tokens = [token for token in normalized.split() if token]
        acknowledgement_tokens = {
            "ठीक",
            "ठीक है",
            "जी",
            "हाँ",
            "हां",
            "okay",
            "ok",
            "acha",
            "अच्छा",
            "theek",
        }
        return all(token in acknowledgement_tokens for token in tokens)

    def _looks_incomplete(self, text: str) -> bool:
        text = self._cleanup(text)
        if not text:
            return True
        lowered = text.lower()
        trailing_fragments = (
            "किस",
            "कौन",
            "क्या",
            "कहाँ",
            "कब",
            "तो",
            "और",
            "की",
            "के",
            "for",
            "in",
        )
        if any(lowered.endswith(fragment) for fragment in trailing_fragments):
            return True
        return len(text.split()) <= 3 and not any(ch in text for ch in "?.!")

    def _get_booking_state(self) -> dict:
        return self._state.setdefault(
            "booking_state",
            {
                "intent": None,
                "city": None,
                "check_in": None,
                "nights": None,
                "guests": None,
                "room_type": None,
                "budget": None,
                "guest_name": None,
                "contact_number": None,
                "last_requested_slot": None,
            },
        )

    def _detect_requested_slot(self, text: str) -> Optional[str]:
        lowered = text.lower()
        if "किस शहर" in text or "शहर बताइए" in text or "which city" in lowered:
            return "city"
        if "चेक-इन" in text or "check-in" in lowered or "कब से" in text:
            return "check_in"
        if "कितने लोगों" in text or "how many guests" in lowered:
            return "guests"
        if "room type" in lowered or "किस तरह का रूम" in text or "कौन सा रूम" in text:
            return "room_type"
        if "budget" in lowered or "बजट" in text:
            return "budget"
        if "नाम" in text and "पूरा" in text:
            return "guest_name"
        if "number" in lowered or "फोन नंबर" in text or "contact" in lowered:
            return "contact_number"
        return None

    def _is_generic_fallback_reply(self, text: str) -> bool:
        lowered = text.lower()
        return any(
            phrase in lowered
            for phrase in [
                "बताइए आपको क्या चाहिए",
                "बताइए आपको क्या मदद चाहिए",
                "what do you need",
                "how can i help",
            ]
        )

    def _short_reply_fills_slot(self, user_text: str, booking_state: dict) -> bool:
        asked_slot = booking_state.get("last_requested_slot")
        if not asked_slot:
            return False
        extracted = _extract_booking_fields(user_text, booking_state)
        return extracted.get(asked_slot) is not None

    def _next_booking_question(self, booking_state: dict) -> str:
        if not booking_state.get("city"):
            booking_state["last_requested_slot"] = "city"
            return "ज़रूर जी, किस शहर में होटल चाहिए?"
        if not booking_state.get("check_in"):
            booking_state["last_requested_slot"] = "check_in"
            return "ठीक है जी, चेक-इन कब से चाहिए?"
        if not booking_state.get("nights"):
            booking_state["last_requested_slot"] = "nights"
            return "कितने दिन के लिए रुकना है?"
        if not booking_state.get("guests"):
            booking_state["last_requested_slot"] = "guests"
            return "कितने लोगों के लिए रूम चाहिए?"
        if not booking_state.get("room_type"):
            booking_state["last_requested_slot"] = "room_type"
            return "किस तरह का रूम चाहिए?"
        if not booking_state.get("budget"):
            booking_state["last_requested_slot"] = "budget"
            return "आपका प्रति रात का बजट क्या रहेगा?"
        booking_state["last_requested_slot"] = None
        return ""

    def _normalize_response(self, text: str) -> str:
        text = self._cleanup(text)
        if not text:
            return ""
        user_text = self._cleanup(self._state.get("last_user_text", ""))
        user_text_lower = user_text.lower()
        last_assistant_text = self._cleanup(self._state.get("last_assistant_text", ""))
        booking_state = self._get_booking_state()
        booking_active = self._agent_type == "hotel" and booking_state.get("intent") == "booking"
        short_reply_fills_slot = booking_active and self._short_reply_fills_slot(user_text, booking_state)

        if self._looks_like_acknowledgement_only(user_text):
            return ""
        if self._looks_incomplete(user_text) and not short_reply_fills_slot:
            return ""

        asks_capability = any(
            phrase in user_text_lower
            for phrase in [
                "क्या मदद",
                "क्या कर",
                "help",
                "what can",
                "how can",
                "कैसे मदद",
                "मदद कर सकते",
                "मदद कर सकती",
                "किस तरीके से मदद",
                "what all can",
            ]
        )
        asks_outside_scope = any(
            phrase in user_text_lower
            for phrase in ["के अलावा", "इसके अलावा", "other than", "apart from", "except", "अलावा और"]
        )
        sounds_fragmented = len(user_text.split()) <= 4 and not any(
            token in user_text_lower for token in ["hotel", "होटल", "doctor", "डॉक्टर", "booking", "बुक"]
        )

        if asks_outside_scope:
            return self._build_scope_boundary_reply()
        if asks_capability:
            capability_reply = self._build_capability_reply()
            if capability_reply == last_assistant_text:
                return self._build_scope_boundary_reply()
            return capability_reply
        if sounds_fragmented and not booking_active:
            return "जी, बताइए आपको क्या चाहिए?"

        sentences = []
        seen = set()
        for sentence in self._split_sentences(text):
            key = self._sentence_key(sentence)
            if not key or key in seen:
                continue
            seen.add(key)
            sentences.append(sentence)

        if not sentences:
            return ""

        filtered = []
        for sentence in sentences:
            lowered = sentence.lower()
            if "मैं रिया हूँ" in sentence and len(sentences) > 1:
                continue
            if "i'm ria" in lowered and len(sentences) > 1:
                continue
            filtered.append(sentence)

        if filtered:
            sentences = filtered

        apology = next(
            (
                sentence
                for sentence in sentences
                if sentence.startswith(("माफ़", "माफ़", "सॉरी", "क्षमा"))
            ),
            None,
        )
        questions = [sentence for sentence in sentences if "?" in sentence]

        if apology and questions:
            best_question = questions[-1]
            if apology != best_question:
                return self._cleanup(f"{apology} {best_question}")
            return self._cleanup(best_question)

        if len(sentences) == 1:
            normalized = self._cleanup(sentences[0])
            if booking_active and self._is_generic_fallback_reply(normalized):
                return self._next_booking_question(booking_state)
            return normalized

        if len(sentences) == 2:
            first, second = sentences
            first_has_question = "?" in first
            second_has_question = "?" in second

            # Keep a natural acknowledge + question reply intact.
            if not first_has_question and second_has_question:
                return self._cleanup(f"{first} {second}")

            # If both are questions, keep only the more actionable closing question.
            if first_has_question and second_has_question:
                normalized = self._cleanup(second)
                if booking_active and self._is_generic_fallback_reply(normalized):
                    return self._next_booking_question(booking_state)
                return normalized

            normalized = self._cleanup(f"{first} {second}")
            if booking_active and self._is_generic_fallback_reply(normalized):
                return self._next_booking_question(booking_state)
            return normalized

        if questions:
            normalized = self._cleanup(questions[-1])
            if booking_active and self._is_generic_fallback_reply(normalized):
                return self._next_booking_question(booking_state)
            return normalized

        normalized = self._cleanup(" ".join(sentences[:2]))
        if booking_active and self._is_generic_fallback_reply(normalized):
            return self._next_booking_question(booking_state)
        return normalized

    async def process_frame(self, frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, LLMFullResponseStartFrame):
            self._in_response = True
            self._buffer = []
            await self.push_frame(frame, direction)
            return

        if isinstance(frame, LLMTextFrame):
            if self._in_response:
                self._buffer.append(frame.text)
                return
            await self.push_frame(frame, direction)
            return

        if isinstance(frame, LLMFullResponseEndFrame):
            normalized = self._normalize_response("".join(self._buffer))
            self._buffer = []
            self._in_response = False
            if normalized:
                self._state["last_assistant_text"] = normalized
                self._get_booking_state()["last_requested_slot"] = self._detect_requested_slot(normalized)
                await self.push_frame(LLMTextFrame(normalized), direction)
            await self.push_frame(frame, direction)
            return

        if isinstance(frame, EndFrame):
            self._buffer = []
            self._in_response = False

        await self.push_frame(frame, direction)


class BackendPersistenceProcessor(FrameProcessor):
    def __init__(self, session_id: str, call_id: Optional[str], state: dict):
        super().__init__()
        self._session_id = session_id
        self._call_id = call_id
        self._state = state
        self._last_saved_agent_turn = None

    async def process_frame(self, frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, TranscriptionFrame) and frame.finalized:
            content = _cleanup_text(getattr(frame, "text", "") or "")
            if content:
                signature = (self._state.get("turn_id"), content)
                if signature != self._state.get("last_saved_caller_signature"):
                    self._state["last_saved_caller_signature"] = signature
                    self._state.setdefault("transcript_entries", []).append({
                        "role": "CALLER",
                        "content": content,
                    })
                    await _post_internal_event(
                        self._call_id,
                        "transcript",
                        {
                            "role": "CALLER",
                            "content": content,
                            "confidence": getattr(frame, "confidence", None),
                        },
                    )

        elif isinstance(frame, LLMTextFrame):
            content = _cleanup_text(getattr(frame, "text", "") or "")
            current_turn = self._state.get("turn_id")
            if content and current_turn != self._last_saved_agent_turn:
                self._last_saved_agent_turn = current_turn
                self._state["last_assistant_text"] = content
                self._state.setdefault("transcript_entries", []).append({
                    "role": "AGENT",
                    "content": content,
                })
                await _post_internal_event(
                    self._call_id,
                    "transcript",
                    {
                        "role": "AGENT",
                        "content": content,
                    },
                )

        await self.push_frame(frame, direction)


# ---------------------------------------------------------------------------
# Telephony Serializers — auto-capture stream SID from the 'start' event
# ---------------------------------------------------------------------------

class TwilioAutoSidSerializer(TwilioFrameSerializer):
    async def deserialize(self, data):
        message = json.loads(data)
        if message.get("event") == "start":
            start = message.get("start", {})
            if not self._stream_sid:
                self._stream_sid = start.get("streamSid")
                logger.info(f"📡 Twilio stream_sid: {self._stream_sid}")
            if "callSid" in start:
                self._call_sid = start["callSid"]
        return await super().deserialize(data)


class PlivoAutoSidSerializer:
    """Lazy import wrapper so missing optional dep doesn't crash startup."""
    def __new__(cls, *args, **kwargs):
        from pipecat.serializers.plivo import PlivoFrameSerializer
        class _Impl(PlivoFrameSerializer):
            async def deserialize(self, data):
                message = json.loads(data)
                if message.get("event") == "start":
                    start = message.get("start", {})
                    if not getattr(self, "_stream_id", None):
                        self._stream_id = start.get("streamId")
                        logger.info(f"📡 Plivo stream_id: {self._stream_id}")
                return await super().deserialize(data)
        return _Impl(*args, **kwargs)


class ExotelAutoSidSerializer:
    def __new__(cls, *args, **kwargs):
        from pipecat.serializers.exotel import ExotelFrameSerializer
        class _Impl(ExotelFrameSerializer):
            async def deserialize(self, data):
                message = json.loads(data)
                if message.get("event") == "start":
                    start = message.get("start", {})
                    if not getattr(self, "_stream_sid", None):
                        self._stream_sid = start.get("streamSid")
                        logger.info(f"📡 Exotel stream_sid: {self._stream_sid}")
                return await super().deserialize(data)
        return _Impl(*args, **kwargs)


# ---------------------------------------------------------------------------
# Config model
# ---------------------------------------------------------------------------

class ConversationConfig(BaseModel):
    telephony_provider: str = "twilio"
    language: str = "hi-IN"
    tts_provider: str = "cartesia"
    stt_provider: str = "deepgram"
    llm_provider: str = "groq"
    llm_model: Optional[str] = "llama-3.3-70b-versatile"
    tts_api_key: Optional[str] = None
    stt_api_key: Optional[str] = None
    llm_api_key: Optional[str] = None
    voice_id: Optional[str] = None
    system_prompt: Optional[str] = None
    context: Optional[dict] = {}

    class Config:
        extra = "allow"


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "active_sessions": len(sessions)}


@app.post("/conversations")
async def create_conversation(config: ConversationConfig):
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "id": session_id,
        "config": config.dict(),
        "status": "waiting",
        "task": None,
    }
    logger.info(f"✅ Session created: {session_id}")
    return {"conversation_id": session_id, "status": "created"}


@app.post("/conversations/{session_id}/end")
async def end_conversation(session_id: str):
    session = sessions.get(session_id)
    if not session:
        return JSONResponse(status_code=404, content={"error": "Session not found"})
    task = session.get("task")
    if task:
        await task.cancel()
    sessions.pop(session_id, None)
    return {"status": "ended"}


# ---------------------------------------------------------------------------
# WebSocket — main voice pipeline
# ---------------------------------------------------------------------------

@app.websocket("/connect_call/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    logger.info(f"🔌 WebSocket connected: {session_id}")

    session = sessions.get(session_id)
    config = session.get("config", {}) if session else {}
    runtime_context = _normalize_runtime_context(config.get("context", {}) or {})
    call_id = config.get("call_id")

    raw_language    = config.get("language", "hi-IN")
    stt_name        = config.get("stt_provider", "deepgram").lower()
    tts_name        = config.get("tts_provider", "cartesia").lower()
    llm_name        = config.get("llm_provider", "groq").lower()
    telephony       = config.get("telephony_provider", "twilio").lower()

    # --- Language helpers ---
    is_hindi        = "hi" in raw_language
    deepgram_lang   = "hi" if is_hindi else "en-IN"
    cartesia_lang   = Language.HI if is_hindi else Language.EN
    agent_type = runtime_context.get("agent_type", "general")
    report_completion = None

    # --- Build system prompt using prompts module ---
    from prompts import build_prompt, build_greeting

    raw_prompt = config.get("system_prompt")
    provided_prompt = raw_prompt.strip() if isinstance(raw_prompt, str) else ""
    if provided_prompt:
        system_prompt = _append_memory_prompt(provided_prompt, runtime_context)
    else:
        system_prompt = build_prompt(agent_type, runtime_context)

    # --- Build greeting ---
    default_greeting = build_greeting(agent_type, raw_language, runtime_context)

    try:
        # ----------------------------------------------------------------
        # Serializer
        # ----------------------------------------------------------------
        if telephony == "exotel":
            from pipecat.serializers.exotel import ExotelFrameSerializer
            serializer = ExotelAutoSidSerializer(
                stream_sid="",
                params=ExotelFrameSerializer.InputParams()
            )
        elif telephony == "plivo":
            from pipecat.serializers.plivo import PlivoFrameSerializer
            serializer = PlivoAutoSidSerializer(
                stream_id="",
                params=PlivoFrameSerializer.InputParams(auto_hang_up=False)
            )
        else:
            serializer = TwilioAutoSidSerializer(
                stream_sid="",
                params=TwilioFrameSerializer.InputParams(auto_hang_up=False),
            )

        transport = FastAPIWebsocketTransport(
            websocket=websocket,
            params=FastAPIWebsocketParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                serializer=serializer,
                session_timeout=int(runtime_context.get("max_call_duration") or 300),
            ),
        )

        # ----------------------------------------------------------------
        # STT
        # ----------------------------------------------------------------
        if stt_name == "deepgram":
            from pipecat.services.deepgram import DeepgramSTTService, LiveOptions
            stt = DeepgramSTTService(
                api_key=config.get("stt_api_key") or os.getenv("DEEPGRAM_API_KEY"),
                live_options=LiveOptions(
                    language=deepgram_lang,
                    model="nova-2",
                    smart_format=True,
                    punctuate=True,
                    interim_results=True,
                    endpointing=180,
                    encoding="linear16",
                    sample_rate=16000,
                    channels=1,
                )
            )
        elif stt_name == "sarvam":
            try:
                from pipecat.services.sarvam.stt import SarvamSTTService
                stt = SarvamSTTService(
                    api_key=config.get("stt_api_key") or os.getenv("SARVAM_API_KEY"),
                    model="saarika:v2.5",
                    params=SarvamSTTService.InputParams(
                        language=Language.HI if is_hindi else Language.EN,
                    ),
                )
            except ImportError:
                logger.warning("SarvamSTTService not found — falling back to Deepgram")
                from pipecat.services.deepgram import DeepgramSTTService, LiveOptions
                stt = DeepgramSTTService(
                    api_key=os.getenv("DEEPGRAM_API_KEY"),
                    live_options=LiveOptions(language=deepgram_lang, model="nova-2"),
                )
        else:
            raise ValueError(f"Unsupported STT provider: {stt_name}")

        # ----------------------------------------------------------------
        # TTS
        # ----------------------------------------------------------------
        if tts_name == "cartesia":
            from pipecat.services.cartesia.tts import CartesiaTTSService
            tts = CartesiaTTSService(
                api_key=config.get("tts_api_key") or os.getenv("CARTESIA_API_KEY"),
                voice_id=config.get("voice_id") or "95d51f79-c397-46f9-b49a-23763d3eaa2d",
                model="sonic-3",
                params=CartesiaTTSService.InputParams(language=cartesia_lang),
            )
        elif tts_name == "elevenlabs":
            from pipecat.services.elevenlabs import ElevenLabsTTSService
            tts = ElevenLabsTTSService(
                api_key=config.get("tts_api_key") or os.getenv("ELEVENLABS_API_KEY"),
                voice_id=config.get("voice_id") or "pFZP5JQG7iQjIQuC4Bku",
                model="eleven_multilingual_v2",
            )
        elif tts_name == "azure":
            from pipecat.services.azure.tts import AzureTTSService
            from pipecat.frames.frames import StartFrame
            import azure.cognitiveservices.speech as speechsdk

            class FastAzureTTSService(AzureTTSService):
                async def start(self, frame: StartFrame):
                    await super().start(frame)
                    if not getattr(self, "_connection_opened", False) and self._speech_synthesizer:
                        try:
                            conn = speechsdk.Connection.from_speech_synthesizer(self._speech_synthesizer)
                            conn.open(True)
                            self._connection_opened = True
                            logger.info("⚡ Azure TTS pre-warmed")
                        except Exception as e:
                            logger.warning(f"Azure pre-warm failed: {e}")

            tts = FastAzureTTSService(
                api_key=config.get("tts_api_key") or os.getenv("AZURE_SPEECH_KEY"),
                region=os.getenv("AZURE_SPEECH_REGION"),
                voice=config.get("voice_id") or "hi-IN-SwaraNeural",
            )
        elif tts_name == "sarvam":
            try:
                from pipecat.services.sarvam.tts import SarvamTTSService
                tts = SarvamTTSService(
                    api_key=config.get("tts_api_key") or os.getenv("SARVAM_API_KEY"),
                    voice_id=config.get("voice_id") or "shubh",
                    model="bulbul:v3",
                )
            except ImportError:
                logger.warning("SarvamTTSService not found — falling back to Cartesia")
                from pipecat.services.cartesia.tts import CartesiaTTSService
                tts = CartesiaTTSService(
                    api_key=os.getenv("CARTESIA_API_KEY"),
                    voice_id="95d51f79-c397-46f9-b49a-23763d3eaa2d",
                    model="sonic-3",
                    params=CartesiaTTSService.InputParams(language=cartesia_lang),
                )
        else:
            raise ValueError(f"Unsupported TTS provider: {tts_name}")

        # ----------------------------------------------------------------
        # LLM
        # ----------------------------------------------------------------
        llm_model = config.get("llm_model")

        if llm_name == "groq":
            from pipecat.services.groq.llm import GroqLLMService
            llm = GroqLLMService(
                api_key=config.get("llm_api_key") or os.getenv("GROQ_API_KEY"),
                model=llm_model or "llama-3.3-70b-versatile",
            )
        elif llm_name == "openai":
            from pipecat.services.openai import OpenAILLMService
            llm = OpenAILLMService(
                api_key=config.get("llm_api_key") or os.getenv("OPENAI_API_KEY"),
                model=llm_model or "gpt-4o",
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {llm_name}")

        # ----------------------------------------------------------------
        # Context & Aggregators
        # ----------------------------------------------------------------
        messages = [{"role": "system", "content": system_prompt}]
        context = LLMContext(messages)

        vad_params = VADParams(
            confidence=0.5,
            start_secs=0.18,
            stop_secs=0.28,
            min_volume=0.07,
        )
        user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
            context,
            user_params=LLMUserAggregatorParams(
                vad_analyzer=SileroVADAnalyzer(params=vad_params),
                user_turn_stop_timeout=1.8,
                user_turn_strategies=UserTurnStrategies(
                    start=[
                        VADUserTurnStartStrategy(enable_interruptions=True),
                    ],
                    stop=[SpeechTimeoutUserTurnStopStrategy(user_speech_timeout=0.65)],
                ),
            ),
        )

        latency_state = {
            "turn_id": 0,
            "turn_started_at": None,
            "turn_stopped_at": None,
            "stt_final_at": None,
            "llm_first_token_at": None,
            "tts_first_audio_at": None,
            "stt_logged_turn": None,
            "llm_logged_turn": None,
            "tts_logged_turn": None,
            "last_user_text": "",
            "last_assistant_text": "",
            "transcript_entries": [],
            "last_saved_caller_signature": None,
            "completion_reported": False,
            "booking_state": {
                "intent": None,
                "city": None,
                "check_in": None,
                "nights": None,
                "guests": None,
                "room_type": None,
                "budget": None,
                "guest_name": None,
                "contact_number": None,
                "last_requested_slot": None,
            },
        }

        stt_latency_tracker = StageLatencyTracker(session_id, "stt", latency_state)
        llm_latency_tracker = StageLatencyTracker(session_id, "llm", latency_state)
        tts_latency_tracker = StageLatencyTracker(session_id, "tts", latency_state)
        context_sanitizer = ContextSanitizer(max_history_messages=8)
        assistant_response_normalizer = AssistantResponseNormalizer(latency_state, agent_type)
        backend_persistence = BackendPersistenceProcessor(session_id, call_id, latency_state)

        # ----------------------------------------------------------------
        # Pipeline (no SentenceAggregator — TTS handles text aggregation)
        # ----------------------------------------------------------------
        pipeline = Pipeline([
            transport.input(),
            stt,
            stt_latency_tracker,
            user_aggregator,
            context_sanitizer,
            llm,
            llm_latency_tracker,
            assistant_response_normalizer,
            backend_persistence,
            tts,
            tts_latency_tracker,
            transport.output(),
            assistant_aggregator,
        ])

        async def report_completion() -> None:
            if latency_state.get("completion_reported"):
                return
            latency_state["completion_reported"] = True

            extraction_payload = _build_generic_extraction(latency_state, agent_type)
            if extraction_payload:
                await _post_internal_event(call_id, "extraction", extraction_payload)

            summary = _build_call_summary(latency_state, agent_type)
            completion_payload = {}
            if summary:
                completion_payload["summary"] = summary

            await _post_internal_event(call_id, "complete", completion_payload)

        task = PipelineTask(
            pipeline,
            params=PipelineParams(
                enable_metrics=True,
                enable_usage_metrics=True,
            ),
        )

        if session:
            session["task"] = task
            session["status"] = "active"

        # ----------------------------------------------------------------
        # Event handlers
        # ----------------------------------------------------------------
        @transport.event_handler("on_client_connected")
        async def on_client_connected(transport, client):
            logger.info(f"📞 Audio stream connected: {session_id}")
            await task.queue_frames([TTSSpeakFrame(default_greeting, append_to_context=False)])

        @transport.event_handler("on_client_disconnected")
        async def on_client_disconnected(transport, client):
            logger.info(f"📴 Audio stream disconnected: {session_id}")
            await report_completion()
            await task.cancel()

        @transport.event_handler("on_session_timeout")
        async def on_session_timeout(transport, client):
            logger.info(f"⏰ Session timeout: {session_id}")
            await report_completion()
            await task.cancel()

        @user_aggregator.event_handler("on_user_turn_started")
        async def on_user_turn_started(aggregator, strategy):
            latency_state["turn_id"] += 1
            latency_state["turn_started_at"] = time.monotonic()
            latency_state["turn_stopped_at"] = None
            latency_state["stt_final_at"] = None
            latency_state["llm_first_token_at"] = None
            latency_state["tts_first_audio_at"] = None
            latency_state["stt_logged_turn"] = None
            latency_state["llm_logged_turn"] = None
            latency_state["tts_logged_turn"] = None
            logger.info(f"🎙️ [{session_id}] Turn {latency_state['turn_id']} started")

        @user_aggregator.event_handler("on_user_turn_stopped")
        async def on_user_turn_stopped(aggregator, strategy, message):
            latency_state["turn_stopped_at"] = time.monotonic()
            user_text = _cleanup_text(getattr(message, "content", "") or "")
            latency_state["last_user_text"] = user_text
            if user_text:
                signature = (latency_state.get("turn_id"), user_text)
                if signature != latency_state.get("last_saved_caller_signature"):
                    latency_state["last_saved_caller_signature"] = signature
                    latency_state.setdefault("transcript_entries", []).append({
                        "role": "CALLER",
                        "content": user_text,
                    })
                    await _post_internal_event(
                        call_id,
                        "transcript",
                        {
                            "role": "CALLER",
                            "content": user_text,
                        },
                    )
            if agent_type == "hotel":
                _update_booking_state(latency_state, latency_state["last_user_text"])
            started_at = latency_state.get("turn_started_at")
            if started_at:
                logger.info(
                    f"🎙️ [{session_id}] Turn {latency_state['turn_id']} stopped in "
                    f"{latency_state['turn_stopped_at'] - started_at:.3f}s | user={message.content!r}"
                )

        runner = PipelineRunner(handle_sigint=False)
        await runner.run(task)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")
    except Exception as e:
        logger.error(f"Pipeline error [{session_id}]: {e}")
        import traceback
        traceback.print_exc()
    finally:
        try:
            if report_completion is not None:
                await report_completion()
        except Exception:
            pass
        sessions.pop(session_id, None)
        logger.info(f"🧹 Cleaned up: {session_id}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PIPECAT_PORT", "3001"))
    logger.info(f"🚀 Pipecat Pipeline Server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
