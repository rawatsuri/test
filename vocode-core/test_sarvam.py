"""Test Sarvam with WAV-formatted audio instead of raw PCM."""
import asyncio
import json
import os
import sys
import struct
import io
import wave

sys.path.insert(0, ".")
from dotenv import load_dotenv
load_dotenv("apps/telephony_app/.env")

import websockets

def make_wav_chunk(pcm_data, sample_rate=16000, sample_width=2, channels=1):
    """Wrap raw PCM in a WAV container."""
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)
    return buf.getvalue()

async def test_config(label, url, api_key, use_wav=False):
    headers = {"api-subscription-key": api_key}
    result = [f"\n=== {label} ==="]
    try:
        async with websockets.connect(url, additional_headers=headers) as ws:
            result.append("Connected!")
            
            # Generate silence
            silence_pcm = b"\x00" * 3200  # 100ms of 16kHz 16-bit mono
            
            if use_wav:
                # Send as complete WAV
                full_pcm = silence_pcm * 20  # 2 seconds
                wav_data = make_wav_chunk(full_pcm)
                await ws.send(wav_data)
                result.append(f"Sent WAV ({len(wav_data)} bytes)")
            else:
                for i in range(20):
                    await ws.send(silence_pcm)
                result.append("Sent 20 raw PCM chunks")
            
            # Collect responses
            for _ in range(5):
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    result.append(f"RECV: {str(msg)[:500]}")
                except asyncio.TimeoutError:
                    result.append("TIMEOUT (no response)")
                    break
                except websockets.exceptions.ConnectionClosedOK as e:
                    result.append(f"CLOSED OK: code={e.code}")
                    break
                except websockets.exceptions.ConnectionClosedError as e:
                    result.append(f"CLOSED ERROR: code={e.code} reason={e.reason}")
                    break
    except Exception as e:
        result.append(f"ERROR: {type(e).__name__}: {e}")
    return "\n".join(result)

async def main():
    api_key = os.environ.get("SARVAM_API_KEY", "")
    results = [f"API Key: {api_key[:12]}..."]
    
    base = "wss://api.sarvam.ai"
    
    configs = [
        # WAV format tests
        ("v3 translate WAV", f"{base}/speech-to-text-translate/ws?sample_rate=16000&model=saaras:v3&mode=transcribe&language-code=hi-IN", True),
        # WAV with input_audio_codec=wav
        ("v3 translate WAV codec=wav", f"{base}/speech-to-text-translate/ws?sample_rate=16000&model=saaras:v3&mode=transcribe&language-code=hi-IN&input_audio_codec=wav", True),
        # Raw PCM without input_audio_codec param
        ("v3 translate PCM no-codec", f"{base}/speech-to-text-translate/ws?sample_rate=16000&model=saaras:v3&mode=transcribe&language-code=hi-IN", False),
        # codec=pcm_s16le as they specifically support
        ("v3 translate PCM pcm_s16le", f"{base}/speech-to-text-translate/ws?sample_rate=16000&model=saaras:v3&mode=transcribe&language-code=hi-IN&input_audio_codec=pcm_s16le", False),
        # On /speech-to-text/ws with saaras:v3
        ("v3 stt WAV", f"{base}/speech-to-text/ws?sample_rate=16000&model=saaras:v3&mode=transcribe&language-code=hi-IN", True),
    ]
    
    for label, url, use_wav in configs:
        r = await test_config(label, url, api_key, use_wav)
        results.append(r)
    
    output = "\n".join(results)
    with open("test_sarvam_results3.txt", "w") as f:
        f.write(output)
    print("Done! Results in test_sarvam_results3.txt")

if __name__ == "__main__":
    asyncio.run(main())
