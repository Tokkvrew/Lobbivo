import re
import os

def test_karma_logic():
    print("Testing Karma Logic...")
    with open("js/retention.js", "r", encoding="utf-8") as f:
        retention_code = f.read()
    
    assert "COOLDOWN_MS = 3000" in retention_code, "COOLDOWN_MS should be 3000ms"
    assert "targetUser.karma = currentKarma + 1" in retention_code, "Karma should be incremented"
    assert "saveUsers(targetUsername, true)" in retention_code, "targetUsername should be saved"
    assert "FirebaseSync.rtdb.ref('users/' + targetUsername + '/karma').set(targetUser.karma)" in retention_code, "Direct RTDB karma sync should be present"
    print("[OK] Retention karma logic verified.")

    with open("js/firebase-sync.js", "r", encoding="utf-8") as f:
        firebase_code = f.read()
    
    assert "fp += `${k}:${u.karma || 0}:" in firebase_code, "Fingerprint must include u.karma"
    assert "cloudUser.karma = typeof cloudUser.karma === 'number' ? cloudUser.karma : (Number(cloudUser.karma) || 0);" in firebase_code, "Karma parsing in RTDB listener verified"
    assert "if (typeof payload.karma !== 'number') payload.karma = Number(userData.karma) || 0;" in firebase_code, "Karma in saveUser payload verified"
    print("[OK] Firebase sync karma logic verified.")

    with open("js/storage.js", "r", encoding="utf-8") as f:
        storage_code = f.read()
    
    assert "if (typeof u.karma !== 'number') u.karma = Number(u.karma) || 0;" in storage_code, "Storage loadUsers karma normalization verified"
    print("[OK] Storage karma normalization verified.")

def test_android_censorship_styles():
    print("Testing Android Censorship Styles...")
    with open("css/media.css", "r", encoding="utf-8") as f:
        media_css = f.read()
    
    assert "html.android-device *:not(.censored-word)" in media_css, "Android optimization should exclude .censored-word"
    assert "html.android-device .censored-word:not(.revealed)" in media_css, "Android censored word blur rule should be present"
    assert "filter: blur(5px) !important;" in media_css, "Blur should be applied on Android"
    assert "text-shadow: 0 0 7px rgba(255, 45, 85, 0.95) !important;" in media_css, "Text-shadow fallback must be present on Android"
    
    with open("css/components.css", "r", encoding="utf-8") as f:
        comp_css = f.read()
    
    assert ".censored-word" in comp_css, ".censored-word must be present in components.css"
    assert "color: transparent !important;" in comp_css, "Transparent color fallback in components.css"
    print("[OK] Censorship styles verified.")

if __name__ == "__main__":
    test_karma_logic()
    test_android_censorship_styles()
    print("\nALL SYSTEM TESTS PASSED SUCCESSFULLY!")
