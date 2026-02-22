import asyncio, os
from dotenv import load_dotenv
load_dotenv("apps/telephony_app/.env")
from cartesia import AsyncCartesia

async def main():
    client = AsyncCartesia(api_key=os.environ["CARTESIA_API_KEY"])
    
    # List all voices across pages
    page = await client.voices.list()
    all_voices = list(page.data)
    
    # Try get_next_page
    while True:
        try:
            page = await page.get_next_page()
            if not page.data:
                break
            all_voices.extend(page.data)
        except Exception:
            break
    
    print(f"Total voices found: {len(all_voices)}")
    for v in all_voices:
        name = getattr(v, 'name', '')
        vid = getattr(v, 'id', '')
        print(f"  {name}: {vid}")
    
    await client.close()

asyncio.run(main())
