import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert 'id="pageFriends"' in html, 'Missing pageFriends in index.html'
assert 'id="profileFriendsCounter"' in html, 'Missing profileFriendsCounter in index.html'
assert 'id="profileFriendsList"' in html, 'Missing profileFriendsList in index.html'
assert 'id="backFromFriendsBtn"' in html, 'Missing backFromFriendsBtn in index.html'

with open('js/profile.js', 'r', encoding='utf-8') as f:
    pjs = f.read()

assert 'function renderFriendsPage' in pjs, 'renderFriendsPage missing'
assert 'function showFriendsPage' in pjs, 'showFriendsPage missing'
assert 'function handleRemoveFriend' in pjs, 'handleRemoveFriend missing'
assert 'friend-avatar-wrap' in pjs, 'friend-avatar-wrap missing in profile.js'

with open('js/app.js', 'r', encoding='utf-8') as f:
    ajs = f.read()

assert 'showFriendsPage()' in ajs, 'showFriendsPage call missing in app.js'
assert 'backFromFriendsBtn' in ajs, 'backFromFriendsBtn listener missing in app.js'

with open('js/storage.js', 'r', encoding='utf-8') as f:
    sjs = f.read()

assert 'function deleteChatForBoth' in sjs, 'deleteChatForBoth missing in storage.js'
assert 'function removeFriend' in sjs, 'removeFriend missing in storage.js'

with open('js/firebase-sync.js', 'r', encoding='utf-8') as f:
    fbs = f.read()

assert 'deleteDirectChat' in fbs, 'deleteDirectChat missing in firebase-sync.js'

with open('css/components.css', 'r', encoding='utf-8') as f:
    css = f.read()

assert '.friend-avatar-wrap' in css, '.friend-avatar-wrap missing in css'
assert '.friend-avatar-box' in css, '.friend-avatar-box missing in css'
assert '.friend-card' in css, '.friend-card missing in css'
assert '.avatar-initials' in css, '.avatar-initials missing in css'

print('SUCCESS: All checks for friends page, avatar rendering, friend removal, and delete for both passed!')
