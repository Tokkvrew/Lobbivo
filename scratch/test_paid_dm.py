import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert 'Модерация & CEO' in html or 'CEO' in html, "Missing CEO / Moderator label in settings"
assert 'privacyDmCoinsItem' in html, "Missing privacyDmCoinsItem in index.html"
assert 'dmCoinsCostBlock' in html, "Missing dmCoinsCostBlock in index.html"

with open('js/chat.js', 'r', encoding='utf-8') as f:
    chat_js = f.read()

assert 'function isDmUnlockedForUser' in chat_js, "Missing isDmUnlockedForUser"
assert 'function renderPrivacySettings' in chat_js, "Missing renderPrivacySettings"
assert 'isUserCEO' in chat_js, "Missing isUserCEO check in chat.js"
assert 'isUserModerator' in chat_js, "Missing isUserModerator check in chat.js"
assert 'chat-header-admin-badge' in chat_js, "Missing chat-header-admin-badge class in chat.js"

with open('js/storage.js', 'r', encoding='utf-8') as f:
    storage_js = f.read()

assert 'paidDmUsers' in storage_js, "Missing paidDmUsers in storage.js"
assert 'unlockedDms' in storage_js, "Missing unlockedDms in storage.js"
assert 'removeFriend' in storage_js, "Missing removeFriend in storage.js"
assert 'deleteChatForBoth' in storage_js, "Missing deleteChatForBoth in storage.js"

# Verify that removeFriend cleans paidDmUsers and unlockedDms
remove_friend_block = storage_js[storage_js.find('function removeFriend'):storage_js.find('function removeFriend') + 1200]
assert 'paidDmUsers' in remove_friend_block, "removeFriend must clean paidDmUsers"
assert 'unlockedDms' in remove_friend_block, "removeFriend must clean unlockedDms"

# Verify deleteChatForBoth cleans paidDmUsers and unlockedDms
delete_both_block = storage_js[storage_js.find('function deleteChatForBoth'):storage_js.find('function deleteChatForBoth') + 1500]
assert 'paidDmUsers' in delete_both_block, "deleteChatForBoth must clean paidDmUsers"
assert 'unlockedDms' in delete_both_block, "deleteChatForBoth must clean unlockedDms"

with open('js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

assert 'isUserCEO' in app_js, "Missing isUserCEO in app.js privacy handler"
assert 'isUserModerator' in app_js, "Missing isUserModerator in app.js privacy handler"

with open('css/components.css', 'r', encoding='utf-8') as f:
    css = f.read()

assert '.chat-header-admin-badge' in css, "Missing .chat-header-admin-badge in components.css"
assert '.chat-header-meta' in css, "Missing .chat-header-meta in components.css"
assert '.chat-header-status' in css, "Missing .chat-header-status in components.css"

print("ALL PAID DM, MODERATION PRIVACY & CHAT HEADER TESTS PASSED!")
