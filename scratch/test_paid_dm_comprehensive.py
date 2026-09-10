import re

with open('js/storage.js', 'r', encoding='utf-8') as f:
    storage_js = f.read()

with open('js/chat.js', 'r', encoding='utf-8') as f:
    chat_js = f.read()

with open('js/firebase-sync.js', 'r', encoding='utf-8') as f:
    firebase_js = f.read()

with open('js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

with open('sw.js', 'r', encoding='utf-8') as f:
    sw_js = f.read()

# 1. Check areFriends
assert 'function areFriends(user1, user2)' in storage_js
assert 'u1.friends.includes(user2)' in storage_js and 'u2.friends.includes(user1)' in storage_js, "areFriends must check mutual friendship"

# 2. Check removeFriend
rf_block = storage_js[storage_js.find('function removeFriend'):storage_js.find('function removeFriend') + 1500]
assert 'paidDmUsers' in rf_block and 'unlockedDms' in rf_block, "removeFriend must clean paidDmUsers and unlockedDms"
assert 'FirebaseSync.saveUser(user1, true)' in rf_block and 'FirebaseSync.saveUser(user2, true)' in rf_block, "removeFriend must sync with immediate=true"

# 3. Check deleteChatForBoth
dc_block = storage_js[storage_js.find('function deleteChatForBoth'):storage_js.find('function deleteChatForBoth') + 2500]
assert 'paidDmUsers' in dc_block and 'unlockedDms' in dc_block, "deleteChatForBoth must clean paidDmUsers and unlockedDms"
assert 'FirebaseSync.saveUser(user1, true)' in dc_block and 'FirebaseSync.saveUser(user2, true)' in dc_block, "deleteChatForBoth must sync with immediate=true"

# 4. Check addMessage
am_block = storage_js[storage_js.find('function addMessage'):storage_js.find('function addMessage') + 600]
assert 'isDmUnlockedForUser' in am_block, "addMessage must check isDmUnlockedForUser"

# 5. Check chat.js isDmUnlockedForUser
assert 'function isDmUnlockedForUser(targetUser, currentUsername)' in chat_js
dm_block = chat_js[chat_js.find('function isDmUnlockedForUser'):chat_js.find('function isDmUnlockedForUser') + 1500]
assert 'paidDmUsers' in dm_block and 'areFriends' in dm_block

# 6. Check sendMessage has paid check
sm_block = chat_js[chat_js.find('function sendMessage'):chat_js.find('function sendMessage') + 2500]
assert 'isDmUnlockedForUser' in sm_block, "sendMessage must check isDmUnlockedForUser"
assert 'openPaidDmModal' in sm_block, "sendMessage must open paid modal when locked"

# 7. Check submitFirstContact has paid check
sfc_block = chat_js[chat_js.find('function submitFirstContact'):chat_js.find('function submitFirstContact') + 2000]
assert 'isDmUnlockedForUser' in sfc_block, "submitFirstContact must check isDmUnlockedForUser"

# 8. Check checkFriendBannerStatus locks input and shows paid notice
bs_block = chat_js[chat_js.find('function checkFriendBannerStatus'):chat_js.find('function checkFriendBannerStatus') + 1500]
assert 'targetDmAccess === \'coins\'' in bs_block and 'isDmUnlockedForUser' in bs_block, "checkFriendBannerStatus must check paid DM"
assert 'lockedNotice.style.display = \'block\'' in bs_block, "checkFriendBannerStatus must show lockedNotice for paid DM"

# 9. Check firebase-sync.js normalizes paidDmUsers & unlockedDms
assert 'cloudUser.paidDmUsers = cloudUser.paidDmUsers ?' in firebase_js, "firebase-sync must normalize paidDmUsers"
assert 'cloudUser.unlockedDms = cloudUser.unlockedDms ?' in firebase_js, "firebase-sync must normalize unlockedDms"
assert 'checkFriendBannerStatus' in firebase_js, "firebase-sync must re-check friend banner status on user data update"

# 10. Check Cache Versions
assert 'lobbivo-cache-v2.9.14' in sw_js, "sw.js cache version mismatch"
assert 'v=2.9.14' in app_js, "app.js registration version mismatch"

print("ALL COMPREHENSIVE PAID DM INTEGRITY TESTS PASSED SUCCESSFULLY!")
