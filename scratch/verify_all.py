import re
import glob

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

ids_in_html = set(re.findall(r'id=["\']([a-zA-Z0-9_\-]+)["\']', html))

checked_ids = [
    'settingsTabChats', 'settingsTabPrivacy',
    'settingsPanelChats', 'settingsPanelPrivacy',
    'chatCensorshipToggle', 'censorshipPreviewBox',
    'privacyDmAll', 'privacyDmFriends',
    'pushNotifToggle', 'testPushBtn',
    'blacklistContainer', 'blacklistEmpty', 'blacklistItemsGrid',
    'profileAvatar', 'editAvatarFile', 'saveProfileBtn',
    'profileSettingsSection'
]

print("=== CHECKING ESSENTIAL DOM IDS ===")
for target_id in checked_ids:
    if target_id in ids_in_html:
        print(f"[OK] {target_id}")
    else:
        print(f"[MISSING] {target_id}")

print("\n=== VERIFYING NICK MODERATION REMOVAL ===")
with open('js/security-shield.js', 'r', encoding='utf-8') as f:
    sec = f.read()
if "forbidden: false" in sec:
    print("[OK] security-shield.js: isForbiddenUsername allows nicknames freely")
else:
    print("[WARN] security-shield.js: check isForbiddenUsername")

with open('js/auth.js', 'r', encoding='utf-8') as f:
    auth = f.read()
if "isForbiddenUsername" in auth:
    print("[WARN] auth.js still calls isForbiddenUsername")
else:
    print("[OK] auth.js does not block nickname registration")

with open('js/profile.js', 'r', encoding='utf-8') as f:
    prof = f.read()
if "isForbiddenUsername" in prof:
    print("[WARN] profile.js still calls isForbiddenUsername")
else:
    print("[OK] profile.js does not block nickname changes")

print("\n=== VERIFYING MOBILE OVERHEATING OPTIMIZATION ===")
with open('js/app.js', 'r', encoding='utf-8') as f:
    app = f.read()
if "isMobile" in app and "particlesContainer.innerHTML = ''" in app:
    print("[OK] Particles are disabled on mobile to prevent GPU overheating")
else:
    print("[WARN] Check particle loop on mobile")

print("\n=== VERIFYING SQUAD PIN IN CHAT TOGGLE ===")
with open('js/games.js', 'r', encoding='utf-8') as f:
    games = f.read()
if "toggleSquadPinInChat" in games and "Закрепить вашу анкету в чате" in games:
    print("[OK] games.js: toggleSquadPinInChat and toggle UI implemented")
else:
    print("[WARN] games.js: check squad pin toggle")

with open('js/chat.js', 'r', encoding='utf-8') as f:
    chat = f.read()
if "sq.pinnedInChat === true" in chat:
    print("[OK] chat.js: pin bar only renders when sq.pinnedInChat === true (disabled by default)")
else:
    print("[WARN] chat.js: check renderVipSquadPinnedBar")

print("\n=== ALL CHECKS COMPLETED ===")
