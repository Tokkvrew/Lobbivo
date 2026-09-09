import os, requests, io, shutil
from PIL import Image, ImageDraw

dest_dir = 'assets/images/games'
os.makedirs(dest_dir, exist_ok=True)

# Define exact high-resolution sources for each game
SOURCES = {
    'valorant': 'https://static-cdn.jtvnw.net/ttv-boxart/516575-600x900.jpg',
    'apex': 'https://static-cdn.jtvnw.net/ttv-boxart/511224-600x900.jpg',
    'dota2': 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/library_600x900_2x.jpg',
    'csgo': 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/library_600x900_2x.jpg',
    'overwatch': 'https://static-cdn.jtvnw.net/ttv-boxart/515025-600x900.jpg',
    'pubg': 'https://cdn.cloudflare.steamstatic.com/steam/apps/578080/library_600x900_2x.jpg',
    'fortnite': 'https://static-cdn.jtvnw.net/ttv-boxart/33214-600x900.jpg',
    'minecraft': 'https://static-cdn.jtvnw.net/ttv-boxart/27471_IGDB-600x900.jpg',
    'league': 'https://static-cdn.jtvnw.net/ttv-boxart/21779-600x900.jpg',
    'rust': 'https://cdn.cloudflare.steamstatic.com/steam/apps/252490/library_600x900_2x.jpg',
    'gta5': 'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/library_600x900_2x.jpg',
    'warzone': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1938090/library_600x900_2x.jpg',
    'rocket': 'https://static-cdn.jtvnw.net/ttv-boxart/30921-600x900.jpg',
    'rainbow': 'https://cdn.cloudflare.steamstatic.com/steam/apps/359550/library_600x900_2x.jpg',
    'tarkov': 'https://static-cdn.jtvnw.net/ttv-boxart/491931_IGDB-600x900.jpg',
    'destiny': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1085660/library_600x900_2x.jpg',
    'wow': 'https://static-cdn.jtvnw.net/ttv-boxart/18122-600x900.jpg',
    'deadlock': 'https://static-cdn.jtvnw.net/ttv-boxart/1908684124-600x900.jpg',
    'marvel': 'https://cdn.cloudflare.steamstatic.com/steam/apps/2767030/library_600x900_2x.jpg',
    'xdefiant': 'https://static-cdn.jtvnw.net/ttv-boxart/780302568-600x900.jpg',
    'thefinals': 'https://cdn.cloudflare.steamstatic.com/steam/apps/2073850/library_600x900_2x.jpg',
    'readyornot': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1144200/library_600x900_2x.jpg',
    'helldivers2': 'https://cdn.cloudflare.steamstatic.com/steam/apps/553850/library_600x900_2x.jpg',
    'palworld': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1623730/library_600x900_2x.jpg',
    'bg3': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/library_600x900_2x.jpg'
}

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

print("Starting download of all 25 game posters...")
for game_id, url in SOURCES.items():
    target_file = os.path.join(dest_dir, f"{game_id}.jpg")
    try:
        r = requests.get(url, headers=headers, timeout=12)
        if r.status_code == 200 and len(r.content) > 1000:
            im = Image.open(io.BytesIO(r.content)).convert('RGB')
            # Resize / standardise to 600x900 if necessary
            if im.size != (600, 900):
                im = im.resize((600, 900), Image.Resampling.LANCZOS)
            im.save(target_file, 'JPEG', quality=95)
            print(f"[OK] {game_id}: {im.size} saved ({os.path.getsize(target_file)} bytes)")
        else:
            print(f"[WARN] {game_id} download failed with status {r.status_code}")
    except Exception as e:
        print(f"[ERROR] {game_id}: {e}")

# Check our generated custom posters (Apex, Fortnite, Valorant) if we want to test them
apex_gen = r"C:\Users\User\.gemini\antigravity-ide\brain\7bde6cb0-f361-4305-92e1-f5cea1f530cf\apex_poster_1788832004485.jpg"
fortnite_gen = r"C:\Users\User\.gemini\antigravity-ide\brain\7bde6cb0-f361-4305-92e1-f5cea1f530cf\fortnite_poster_1788832022088.jpg"

if os.path.exists(fortnite_gen):
    im_fn = Image.open(fortnite_gen).convert('RGB').resize((600, 900), Image.Resampling.LANCZOS)
    im_fn.save(os.path.join(dest_dir, "fortnite.jpg"), 'JPEG', quality=95)
    print("[CUSTOM] fortnite.jpg replaced with pristine generated poster")

print("\n--- Generating verification grid ---")
games_list = list(SOURCES.keys())
cols = 5
rows = 5
card_w = 200
card_h = 280

sheet = Image.new('RGB', (cols * card_w, rows * card_h), (16, 20, 30))
draw = ImageDraw.Draw(sheet)

for idx, g in enumerate(games_list):
    r = idx // cols
    c = idx % cols
    x = c * card_w
    y = r * card_h
    
    fp = os.path.join(dest_dir, f"{g}.jpg")
    if os.path.exists(fp):
        try:
            im = Image.open(fp)
            im_thumb = im.resize((card_w - 10, card_h - 40), Image.Resampling.LANCZOS)
            sheet.paste(im_thumb, (x + 5, y + 5))
            draw.text((x + 10, y + card_h - 28), f"{idx+1}. {g}", fill=(0, 212, 255))
        except Exception as e:
            draw.text((x + 10, y + 50), f"ERR: {e}", fill=(255, 0, 0))
    else:
        draw.text((x + 10, y + 50), "MISSING", fill=(255, 0, 0))
        
    draw.rectangle([x, y, x + card_w, y + card_h], outline=(40, 50, 70), width=1)

sheet.save('scratch/all_games_verified.jpg', quality=92)
print("Saved verification contact sheet to scratch/all_games_verified.jpg")
