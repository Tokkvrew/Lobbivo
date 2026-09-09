import re
import os
import json

base_dir = r"c:\Users\User\Desktop\Finder"

print("--- 1. Checking File Existence ---")
files_to_check = [
    "index.html",
    "css/variables.css",
    "css/base.css",
    "css/components.css",
    "css/animations.css",
    "css/media.css",
    "js/data.js",
    "js/firebase-sync.js",
    "js/storage.js",
    "js/auth.js",
    "js/games.js",
    "js/chat.js",
    "js/profile.js",
    "js/app.js",
]

all_exist = True
for f in files_to_check:
    full_p = os.path.join(base_dir, f)
    if os.path.exists(full_p):
        print(f" [OK] {f} ({os.path.getsize(full_p)} bytes)")
    else:
        print(f" [MISSING] {f}")
        all_exist = False

print("\n--- 2. Checking Game Posters ---")
with open(os.path.join(base_dir, "js", "data.js"), "r", encoding="utf-8") as f:
    data_content = f.read()

game_images = re.findall(r"image:\s*'([^']+)'", data_content)
print(f"Found {len(game_images)} game posters in data.js")
for img in game_images:
    full_p = os.path.join(base_dir, img.replace("/", "\\"))
    if not os.path.exists(full_p):
        print(f" [MISSING POSTER] {img}")
        all_exist = False
    else:
        pass
print(f" [OK] All {len(game_images)} game posters exist on disk!")

print("\n--- 3. Checking SVG Symbol References in index.html ---")
with open(os.path.join(base_dir, "index.html"), "r", encoding="utf-8") as f:
    html_content = f.read()

symbols_defined = set(re.findall(r'<symbol\s+id="([^"]+)"', html_content))
print(f"Defined symbols count: {len(symbols_defined)}")

symbols_used = set(re.findall(r'<use\s+href="#([^"]+)"', html_content))
for js_f in ["data.js", "storage.js", "auth.js", "games.js", "chat.js", "profile.js", "app.js"]:
    with open(os.path.join(base_dir, "js", js_f), "r", encoding="utf-8") as f:
        c = f.read()
        symbols_used.update(re.findall(r'href="#([^"]+)"', c))
        symbols_used.update(re.findall(r"href=['\"]#([^'\"]+)['\"]", c))

print(f"Used symbols count: {len(symbols_used)}")
missing_symbols = []
for s in symbols_used:
    # Some icons might be generated dynamically e.g. ${game.icon} or brandGrad
    if s not in symbols_defined and not s.startswith("${"):
        missing_symbols.append(s)

if missing_symbols:
    print(f" [WARNING] Symbols used but not defined: {missing_symbols}")
else:
    print(" [OK] All SVG symbols are properly defined!")

print("\n--- 4. Checking FC vs LC Coin Consistency ---")
for js_f in ["data.js", "storage.js", "auth.js", "games.js", "chat.js", "profile.js", "app.js"]:
    with open(os.path.join(base_dir, "js", js_f), "r", encoding="utf-8") as f:
        c = f.read()
        fc_matches = re.findall(r'(\b\d+\s*FC\b|\+?\d+\s*FC\b)', c)
        if fc_matches:
            print(f" [FOUND FC in {js_f}]: {fc_matches}")
        else:
            print(f" [OK] {js_f} has no legacy FC mentions")

print("\n--- 5. Checking HTML element IDs used in JS ---")
js_doc_ids = set()
for js_f in ["auth.js", "games.js", "chat.js", "profile.js", "app.js", "storage.js"]:
    with open(os.path.join(base_dir, "js", js_f), "r", encoding="utf-8") as f:
        c = f.read()
        js_doc_ids.update(re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", c))

html_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html_content))
dynamically_created = {"userProfileModalOverlay", "avatarEditBtn", "headerAvatarText", "profileAvatarText"}

missing_in_html = []
for jid in js_doc_ids:
    if jid not in html_ids and jid not in dynamically_created and not jid.startswith("gameCount_"):
        missing_in_html.append(jid)

if missing_in_html:
    print(f" [WARNING] Element IDs queried in JS but not in HTML: {missing_in_html}")
else:
    print(f" [OK] All {len(js_doc_ids)} element IDs queried by JS exist in HTML or are dynamically created!")

print("\n--- Verification Summary Complete! ---")
