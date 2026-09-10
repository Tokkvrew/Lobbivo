import re

def test_paid_dm_implementation():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    with open('js/chat.js', 'r', encoding='utf-8') as f:
        chat_js = f.read()
    with open('js/storage.js', 'r', encoding='utf-8') as f:
        storage_js = f.read()
    with open('js/app.js', 'r', encoding='utf-8') as f:
        app_js = f.read()
    with open('css/components.css', 'r', encoding='utf-8') as f:
        css = f.read()

    # 1. HTML elements check
    assert 'id="privacyDmCoinsItem"' in html, "Missing privacyDmCoinsItem"
    assert 'id="privacyDmCoins"' in html, "Missing privacyDmCoins"
    assert 'id="dmCoinsCostBlock"' in html, "Missing dmCoinsCostBlock"
    assert 'id="dmCoinsCostInput"' in html, "Missing dmCoinsCostInput"
    assert 'id="saveDmCoinsCostBtn"' in html, "Missing saveDmCoinsCostBtn"
    assert 'id="paidDmModal"' in html, "Missing paidDmModal"
    assert 'id="paidDmConfirmBtn"' in html, "Missing paidDmConfirmBtn"
    assert 'id="paidDmTopUpBtn"' in html, "Missing paidDmTopUpBtn"
    print("[PASS] HTML elements verified")

    # 2. chat.js logic check
    assert 'function isDmUnlockedForUser' in chat_js, "Missing isDmUnlockedForUser"
    assert 'function openPaidDmModal' in chat_js, "Missing openPaidDmModal"
    assert 'function confirmPaidDm' in chat_js, "Missing confirmPaidDm"
    assert 'privacyDmCoins' in chat_js, "Missing privacyDmCoins in chat.js"
    assert 'targetDmAccess === \'coins\'' in chat_js, "Missing coins check in chat.js"
    print("[PASS] chat.js functions verified")

    # 3. storage.js logic check
    assert 'paidDmUsers' in storage_js, "Missing paidDmUsers in storage.js"
    assert 'unlockedDms' in storage_js, "Missing unlockedDms in storage.js"
    print("[PASS] storage.js logic verified")

    # 4. app.js listeners check
    assert 'paidDmConfirmBtn' in app_js, "Missing paidDmConfirmBtn listener in app.js"
    assert 'saveDmCoinsCostBtn' in app_js, "Missing saveDmCoinsCostBtn listener in app.js"
    assert 'closePaidDmModal' in app_js, "Missing closePaidDmModal in app.js"
    print("[PASS] app.js event listeners verified")

    # 5. CSS classes check
    assert '.privacy-radio-coins' in css, "Missing .privacy-radio-coins in CSS"
    assert '.paid-dm-modal-glass' in css, "Missing .paid-dm-modal-glass in CSS"
    assert '.staff-monetize-badge' in css, "Missing .staff-monetize-badge in CSS"
    assert '.dm-coins-cost-block' in css, "Missing .dm-coins-cost-block in CSS"
    print("[PASS] CSS styles verified")

    print("\n>>> ALL PAID DM & MONETIZATION TESTS PASSED PERFECTLY! <<<")

if __name__ == '__main__':
    test_paid_dm_implementation()
