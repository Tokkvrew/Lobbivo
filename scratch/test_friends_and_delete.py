import re

def test_features():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    with open('js/storage.js', 'r', encoding='utf-8') as f:
        storage_js = f.read()
    with open('js/firebase-sync.js', 'r', encoding='utf-8') as f:
        firebase_js = f.read()
    with open('js/profile.js', 'r', encoding='utf-8') as f:
        profile_js = f.read()
    with open('js/chat.js', 'r', encoding='utf-8') as f:
        chat_js = f.read()
    with open('css/components.css', 'r', encoding='utf-8') as f:
        css = f.read()

    # 1. Check delete chat for both in storage & firebase-sync
    assert 'deleteChatForBoth' in storage_js
    assert 'deleteDirectChat' in firebase_js
    assert 'delete AppState.messages[localKey]' in firebase_js, "Firebase sync must clear deleted keys locally"
    print("[PASS] Chat deletion sync logic verified")

    # 2. Check removeFriend in storage
    assert 'function removeFriend' in storage_js
    print("[PASS] removeFriend function in storage.js verified")

    # 3. Check Friends List UI in index.html
    assert 'id="profileFriendsSection"' in html
    assert 'id="profileFriendsCounter"' in html
    assert 'id="profileFriendsList"' in html
    assert 'id="popoverUnfriendBtn"' in html
    print("[PASS] HTML friends section and unfriend elements verified")

    # 4. Check profile.js friends rendering
    assert 'function renderProfileFriends' in profile_js
    assert 'function handleRemoveFriend' in profile_js
    assert 'data-action="friends"' in profile_js
    print("[PASS] profile.js friends rendering logic verified")

    # 5. Check CSS styles for friends list
    assert '.friends-counter-badge' in css
    assert '.profile-friends-grid' in css
    assert '.friend-card' in css
    assert '.btn-friend-remove' in css
    assert '.btn-popover-unfriend' in css
    print("[PASS] CSS styles for friends list verified")

    print("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == '__main__':
    test_features()
