"""
Sarvam AI transcriber for Indian language speech-to-text.

Sarvam AI offers real-time streaming STT via WebSocket optimized for Indian languages.

Documentation: https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe
Pricing: ₹30/hour of audio (₹0.50/minute)

Features:
- Real-time WebSocket streaming at wss://api.sarvam.ai/speech-to-text/ws
- Supports 22 Indian languages + English with Indian accent
- Auto language detection
- Code-mixing support (switching languages mid-sentence)
- Optimized for 8kHz/16kHz telephony audio

Supported languages:
- hi-IN (Hindi), bn-IN (Bengali), ta-IN (Tamil), te-IN (Telugu)
- kn-IN (Kannada), ml-IN (Malayalam), mr-IN (Marathi), gu-IN (Gujarati)
- pa-IN (Punjabi), or-IN (Odia), en-IN (Indian English)
"""

import asyncio
import base64
import audioop
import json
from typing import Optional

import websockets
from loguru import logger
from websockets.exceptions import ConnectionClosedError, ConnectionClosedOK
from websockets.asyncio.client import ClientConnection

from vocode import getenv
from vocode.streaming.models.audio import AudioEncoding
from vocode.streaming.models.transcriber import (
    SarvamTranscriberConfig,
    Transcription,
)
from vocode.streaming.transcriber.base_transcriber import BaseAsyncTranscriber

# Sarvam WebSocket message types
SARVAM_EVENT_TRANSCRIPT = "transcript"
SARVAM_EVENT_PARTIAL = "partial"
SARVAM_EVENT_CONNECTED = "connected"
SARVAM_EVENT_ERROR = "error"

NUM_RESTARTS = 3


class SarvamTranscriber(BaseAsyncTranscriber[SarvamTranscriberConfig]):
    """
    Real-time streaming transcriber using Sarvam AI WebSocket API.
    
    Optimized for Indian languages with support for:
    - Hindi, Bengali, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Odia
    - Indian English (en-IN)
    - Code-mixing (switching between languages mid-sentence)
    """
    
    # Correct Sarvam API values (overrides stale Poetry package defaults)
    SARVAM_WS_URL = "wss://api.sarvam.ai/speech-to-text-translate/ws"
    SARVAM_MODEL = "saaras:v3"
    SARVAM_MODE = "transcribe"

    def __init__(self, transcriber_config: SarvamTranscriberConfig):
        super().__init__(transcriber_config)
        self.api_key = transcriber_config.api_key or getenv("SARVAM_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Please set SARVAM_API_KEY environment variable or pass it as a parameter"
            )
        self._ended = False
        self.is_ready = False
        self.ws_connection: Optional[ClientConnection] = None
        self._ratecv_state = None
        
    def get_sarvam_url(self) -> str:
        """Build WebSocket URL with query parameters."""
        # Always use the correct endpoint (config may have stale defaults)
        base_url = self.SARVAM_WS_URL
        model = self.SARVAM_MODEL
        mode = self.SARVAM_MODE
        
        params = []
        params.append("sample_rate=16000")
        params.append(f"mode={mode}")
        params.append("input_audio_codec=pcm_s16le")
        if self.transcriber_config.language:
            params.append(f"language-code={self.transcriber_config.language}")
        params.append(f"model={model}")
        
        return f"{base_url}?{'&'.join(params)}"
    
    async def _run_loop(self):
        """Main loop that handles WebSocket connection and audio streaming."""
        restarts = 0
        logger.info(f"Sarvam STT _run_loop started (url={self.transcriber_config.ws_url}, lang={self.transcriber_config.language})")
        print(f"[SARVAM] _run_loop started, ws_url={self.transcriber_config.ws_url}")
        while not self._ended and restarts < NUM_RESTARTS:
            try:
                await self._process_audio()
                restarts += 1
                logger.info(f"Sarvam connection closed normally, restart attempt={restarts}/{NUM_RESTARTS}")
            except Exception as e:
                restarts += 1
                logger.error(f"Sarvam connection error (attempt {restarts}/{NUM_RESTARTS}): {type(e).__name__}: {e}")
                print(f"[SARVAM] ERROR (attempt {restarts}): {type(e).__name__}: {e}")
                await asyncio.sleep(0.5)
        
        if restarts >= NUM_RESTARTS:
            logger.error("Sarvam STT failed after max restarts — transcription will not work")
            print(f"[SARVAM] FATAL: failed after {NUM_RESTARTS} restarts")
    
    async def _process_audio(self):
        """Process audio through Sarvam WebSocket."""
        url = self.get_sarvam_url()
        headers = {
            "api-subscription-key": self.api_key,
        }
        
        logger.info(f"Connecting to Sarvam WebSocket at {url}")
        print(f"[SARVAM] Connecting to {url}")
        async with websockets.connect(url, additional_headers=headers) as ws:
            self.ws_connection = ws
            self.is_ready = True
            logger.info("Connected to Sarvam AI WebSocket")
            print("[SARVAM] Connected successfully")

            # Run send and receive concurrently
            await asyncio.gather(
                self._send_audio_loop(ws),
                self._receive_transcription_loop(ws),
            )
    
    async def _send_audio_loop(self, ws: ClientConnection):
        """Send audio chunks to Sarvam as raw binary PCM frames."""
        chunks_sent = 0
        while not self._ended:
            try:
                # Get audio chunk from input queue
                audio_chunk = await asyncio.wait_for(
                    self._input_queue.get(),
                    timeout=5.0
                )
                
                if audio_chunk is None:
                    print("[SARVAM] send: got None chunk, breaking")
                    break
                
                # Twilio media stream is mu-law at 8kHz. Sarvam expects pcm_s16le at 16kHz.
                if self.transcriber_config.audio_encoding == AudioEncoding.MULAW:
                    audio_chunk = audioop.ulaw2lin(audio_chunk, 2)

                audio_chunk, self._ratecv_state = audioop.ratecv(
                    audio_chunk,
                    2,
                    1,
                    self.transcriber_config.sampling_rate,
                    16000,
                    self._ratecv_state,
                )

                # Send as raw binary PCM frame (NOT JSON)
                await ws.send(audio_chunk)
                chunks_sent += 1
                if chunks_sent == 1:
                    print(f"[SARVAM] send: first audio chunk sent ({len(audio_chunk)} bytes)")
                elif chunks_sent % 100 == 0:
                    print(f"[SARVAM] send: {chunks_sent} chunks sent")
                
            except asyncio.TimeoutError:
                # Send short silence heartbeat to avoid idle socket closure.
                silent_audio = b"\0" * 640
                await ws.send(silent_audio)
                continue
            except asyncio.CancelledError:
                print(f"[SARVAM] send: cancelled after {chunks_sent} chunks")
                break
            except ConnectionClosedOK:
                print(f"[SARVAM] send: connection closed OK after {chunks_sent} chunks")
                break
            except ConnectionClosedError as e:
                print(f"[SARVAM] send: connection closed with error: {e}")
                logger.error(f"Error sending audio to Sarvam: {e}")
                break
            except Exception as e:
                print(f"[SARVAM] send: unexpected error: {type(e).__name__}: {e}")
                logger.error(f"Error sending audio to Sarvam: {e}")
                break
    
    async def _receive_transcription_loop(self, ws: ClientConnection):
        """Receive transcription results from Sarvam."""
        msgs_received = 0
        while not self._ended:
            try:
                message = await ws.recv()
                msgs_received += 1
                
                # Log first few raw messages for debugging
                if msgs_received <= 3:
                    preview = str(message)[:200]
                    print(f"[SARVAM] recv #{msgs_received}: {preview}")
                
                data = json.loads(message)
                
                event_type = data.get("type", data.get("event", ""))
                payload = data.get("data") if isinstance(data.get("data"), dict) else {}

                if event_type == SARVAM_EVENT_CONNECTED:
                    print(f"[SARVAM] recv: session started event")
                    logger.info("Sarvam session started")

                elif event_type in (SARVAM_EVENT_PARTIAL, "partial_transcript"):
                    text = (
                        data.get("text")
                        or data.get("transcript")
                        or payload.get("text")
                        or payload.get("transcript")
                        or data.get("payload", "")
                    )
                    if text and event_type != "error":
                        print(f"[SARVAM] recv: partial='{text}'")
                        transcription = Transcription(
                            message=text,
                            confidence=data.get("confidence", 0.0),
                            is_final=False,
                        )
                        self.produce_nonblocking(transcription)

                elif event_type in (SARVAM_EVENT_TRANSCRIPT, "final_transcript"):
                    text = (
                        data.get("text")
                        or data.get("transcript")
                        or payload.get("text")
                        or payload.get("transcript")
                        or data.get("payload", "")
                    )
                    if text and event_type != "error":
                        print(f"[SARVAM] recv: FINAL='{text}' conf={data.get('confidence')}")
                        transcription = Transcription(
                            message=text,
                            confidence=data.get("confidence", 1.0),
                            is_final=True,
                            duration_seconds=data.get("duration"),
                        )
                        self.produce_nonblocking(transcription)

                elif event_type == SARVAM_EVENT_ERROR:
                    error_msg = payload.get("message") or data.get("message", data.get("error", "Unknown error"))
                    print(f"[SARVAM] recv: ERROR event: {error_msg}")
                    logger.error(f"Sarvam error: {error_msg}")
                else:
                    print(f"[SARVAM] recv: unknown event_type='{event_type}' data={str(data)[:200]}")
                    
            except asyncio.CancelledError:
                print(f"[SARVAM] recv: cancelled after {msgs_received} messages")
                break
            except ConnectionClosedOK as e:
                print(f"[SARVAM] recv: connection closed OK (code={e.code}, reason={e.reason}) after {msgs_received} messages")
                break
            except ConnectionClosedError as e:
                print(f"[SARVAM] recv: connection closed error (code={e.code}, reason={e.reason})")
                if e.code == 1003 and "Rate limit exceeded" in str(e):
                    logger.error("Sarvam rate limit exceeded; ending transcriber loop")
                    self._ended = True
                else:
                    logger.error(f"Error receiving from Sarvam: {e}")
                break
            except Exception as e:
                print(f"[SARVAM] recv: unexpected error: {type(e).__name__}: {e}")
                logger.error(f"Error receiving from Sarvam: {e}")
                break
    
    async def terminate(self):
        """Close WebSocket connection."""
        self._ended = True
        self.is_ready = False
        if self.ws_connection:
            try:
                await self.ws_connection.close()
            except Exception:
                pass
        await super().terminate()
