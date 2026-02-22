"""Validate Cartesia mulaw audio output for Twilio compatibility"""
import asyncio
import os
import wave
import audioop
from dotenv import load_dotenv

load_dotenv("apps/telephony_app/.env")
from cartesia import AsyncCartesia

async def test():
    api_key = os.environ.get("CARTESIA_API_KEY")
    client = AsyncCartesia(api_key=api_key)
    ws_manager = client.tts.websocket_connect()
    ws = await ws_manager.__aenter__()
    ctx = ws.context()
    
    # Request mulaw 8kHz (what Twilio needs)
    mulaw_format = {
        "sample_rate": 8000,
        "encoding": "pcm_mulaw",
        "container": "raw",
    }
    
    # Also test pcm_s16le to see if that format works better  
    pcm_format = {
        "sample_rate": 8000,
        "encoding": "pcm_s16le",
        "container": "raw",
    }
    
    voice = {"mode": "id", "id": "79a125e8-cd45-4c13-8a67-188112f4dd22"}
    
    # Test 1: mulaw
    print("=== Test 1: pcm_mulaw 8kHz ===")
    await ctx.send(
        model_id="sonic-multilingual",
        transcript="Hello, how are you?",
        voice=voice,
        continue_=False,
        output_format=mulaw_format,
    )
    
    mulaw_buffer = bytearray()
    async for event in ctx.receive():
        if getattr(event, "type", None) == "chunk":
            audio = event.audio
            if audio:
                mulaw_buffer.extend(audio)
        elif getattr(event, "type", None) == "done":
            break
    
    print(f"  Total mulaw bytes: {len(mulaw_buffer)}")
    print(f"  Duration: {len(mulaw_buffer)/8000:.2f}s (mulaw=1 byte/sample at 8kHz)")
    print(f"  First 20 bytes: {mulaw_buffer[:20].hex()}")
    
    # Convert mulaw to PCM to verify it's valid
    try:
        pcm_data = audioop.ulaw2lin(bytes(mulaw_buffer), 2)
        print(f"  Converted to PCM: {len(pcm_data)} bytes ✅")
        
        # Save as WAV to verify
        with wave.open("test_mulaw.wav", "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(8000)
            wf.writeframes(pcm_data)
        print(f"  Saved test_mulaw.wav ✅")
    except Exception as e:
        print(f"  Mulaw conversion FAILED: {e}")
    
    # Test 2: pcm_s16le  
    print("\n=== Test 2: pcm_s16le 8kHz ===")
    ctx2 = ws.context()
    await ctx2.send(
        model_id="sonic-multilingual",
        transcript="Hello, how are you?",
        voice=voice,
        continue_=False,
        output_format=pcm_format,
    )
    
    pcm_buffer = bytearray()
    async for event in ctx2.receive():
        if getattr(event, "type", None) == "chunk":
            audio = event.audio
            if audio:
                pcm_buffer.extend(audio)
        elif getattr(event, "type", None) == "done":
            break
    
    print(f"  Total pcm bytes: {len(pcm_buffer)}")
    print(f"  Duration: {len(pcm_buffer)/(8000*2):.2f}s (s16le=2 bytes/sample at 8kHz)")
    print(f"  First 20 bytes: {pcm_buffer[:20].hex()}")

    # Convert PCM to mulaw  
    try:
        converted_mulaw = audioop.lin2ulaw(bytes(pcm_buffer), 2)
        print(f"  Converted PCM→mulaw: {len(converted_mulaw)} bytes ✅")
        
        # Save both as WAV
        with wave.open("test_pcm.wav", "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(8000)
            wf.writeframes(pcm_buffer)
        print(f"  Saved test_pcm.wav ✅")
    except Exception as e:
        print(f"  PCM conversion FAILED: {e}")
    
    await ws_manager.__aexit__(None, None, None)
    await client.close()

if __name__ == "__main__":
    asyncio.run(test())
