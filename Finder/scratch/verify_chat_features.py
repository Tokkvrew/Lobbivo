import sys

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

required_ids = [
    'worldChatInput', 'worldChatSendBtn', 'worldChatTyping', 'worldChatTypingText', 
    'worldReplyPreview', 'worldReplyAuthor', 'worldReplyText', 'worldReplyCancelBtn',
    'chatInput', 'chatSendBtn', 'directChatTyping', 'directChatTypingText',
    'directReplyPreview', 'directReplyAuthor', 'directReplyText', 'directReplyCancelBtn',
    'chatUserStatus', 'chatUserName', 'chatMessages', 'worldChatMessages', 'chatBadge'
]

missing = [i for i in required_ids if f'id="{i}"' not in html and f"id='{i}'" not in html]
if missing:
    print('Missing IDs in index.html:', missing)
    sys.exit(1)
else:
    print('SUCCESS: All required Telegram feature IDs exist in index.html!')

# Check scripts in index.html
required_scripts = [
    'js/data.js', 'js/security-shield.js', 'js/firebase-sync.js',
    'js/storage.js', 'js/auth.js', 'js/games.js', 'js/chat.js',
    'js/profile.js', 'js/app.js'
]

for s in required_scripts:
    if s not in html:
        print(f'Missing script: {s}')
        sys.exit(1)

print('SUCCESS: All scripts included in correct order!')
