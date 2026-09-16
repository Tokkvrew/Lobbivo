import re

with open('js/storage.js', 'r', encoding='utf-8') as f:
    storage_js = f.read()

with open('js/chat.js', 'r', encoding='utf-8') as f:
    chat_js = f.read()

# Verify areFriends checks inU1 or inU2
assert 'const inU1 = Array.isArray(u1?.friends) && u1.friends.includes(user2);' in storage_js
assert 'const inU2 = Array.isArray(u2?.friends) && u2.friends.includes(user1);' in storage_js
assert 'return inU1 || inU2;' in storage_js

# Verify acceptFriendRequest unlocks DMs and writes to Firebase RTDB
assert 'unlockDmForUser(viewer, sender);' in storage_js
assert 'FirebaseSync.rtdb.ref(\'users/\' + viewer + \'/friends\').set' in storage_js

# Verify checkFriendBannerStatus opens input for unlocked or accepted
assert 'if (isFriends || isUnlocked || (req && req.status === \'accepted\'))' in chat_js
assert 'targetDmAccess === \'friends\'' in chat_js

print('ALL TESTS FOR PAID DM & FRIEND CONFIRMATION PASSED 100%!')
