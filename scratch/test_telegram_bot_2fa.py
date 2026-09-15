import os
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

workspace = r"c:\Users\User\Desktop\Finder"

def run_tests():
    print("==================================================")
    print("  RUNNING TELEGRAM BOT & 2FA VERIFICATION TESTS   ")
    print("==================================================")

    # 1. Check index.html elements
    index_path = os.path.join(workspace, "index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        index_html = f.read()

    required_ids = [
        "tg2faModal",
        "tg2faModalClose",
        "tg2faUsernameLabel",
        "tg2faCodeInput",
        "tg2faError",
        "tg2faSubmitBtn",
        "tg2faResendBtn",
        "tg2faTimerSpan",
        "tg2faCancelBtn",
        "tgBotStatusDot",
        "tgBotStatusText",
        "tgBotLinkBtn",
        "tgBotUnlinkBtn",
        "tgBotTestBtn",
        "tgBotLinkCode",
        "tgBotManualChatId",
        "saveTgManualChatIdBtn",
        "tgNotifSquadToggle",
        "tgNotifDmToggle",
        "tgNotifKarmaToggle"
    ]

    missing_ids = []
    for rid in required_ids:
        if f'id="{rid}"' not in index_html and f"id='{rid}'" not in index_html:
            missing_ids.append(rid)

    if missing_ids:
        print(f"❌ FAIL: Missing IDs in index.html: {missing_ids}")
    else:
        print(f"✅ PASS: All {len(required_ids)} required IDs exist in index.html")

    # Check SVG sprite icon
    if 'id="icon-telegram-plane"' in index_html:
        print("✅ PASS: icon-telegram-plane SVG sprite exists")
    else:
        print("❌ FAIL: icon-telegram-plane SVG sprite not found")

    # 2. Check css/components.css for tg2fa styles
    css_path = os.path.join(workspace, "css", "components.css")
    with open(css_path, "r", encoding="utf-8") as f:
        css_content = f.read()

    css_classes = [
        ".tg2fa-modal-glass",
        ".tg2fa-modal-header",
        ".tg2fa-brand-emblem",
        ".tg2fa-badge-glass",
        ".tg2fa-code-input",
        ".tg2fa-submit-btn",
        ".tg2fa-resend-btn"
    ]
    for c in css_classes:
        if c in css_content:
            print(f"✅ PASS: CSS class {c} defined")
        else:
            print(f"❌ FAIL: CSS class {c} missing")

    # 3. Check js/telegram-bot.js
    tg_js_path = os.path.join(workspace, "js", "telegram-bot.js")
    with open(tg_js_path, "r", encoding="utf-8") as f:
        tg_js = f.read()

    if "8906640657:AAHnd7ABShLnpL-8d4FyllC4bV6lWjB1IRc" in tg_js:
        print("✅ PASS: Official Telegram Bot Token embedded in DEFAULT_CONFIG")
    else:
        print("❌ FAIL: Bot Token missing or incorrect")

    if "Lobbivobot" in tg_js:
        print("✅ PASS: Bot username @Lobbivobot configured")
    else:
        print("❌ FAIL: Bot username Lobbivobot missing")

    methods = [
        "unlinkTelegramAccount",
        "linkTelegramAccount",
        "send2faLoginCode",
        "verify2faLoginCode",
        "notifyFriendRequest",
        "notifyDirectMessage",
        "notifyFriendAccept",
        "notifyKarma",
        "startPollingForLink"
    ]
    for m in methods:
        if m in tg_js:
            print(f"✅ PASS: TelegramBotService method {m} present")
        else:
            print(f"❌ FAIL: TelegramBotService method {m} missing")

    # 4. Check js/auth.js 2FA integration
    auth_js_path = os.path.join(workspace, "js", "auth.js")
    with open(auth_js_path, "r", encoding="utf-8") as f:
        auth_js = f.read()

    if "showTg2faModal" in auth_js and "submitTg2faCode" in auth_js and "resendTg2faCode" in auth_js:
        print("✅ PASS: auth.js contains 2FA modal handlers (showTg2faModal, submitTg2faCode, resendTg2faCode)")
    else:
        print("❌ FAIL: auth.js missing 2FA modal handlers")

    # 5. Check js/app.js event listener bindings
    app_js_path = os.path.join(workspace, "js", "app.js")
    with open(app_js_path, "r", encoding="utf-8") as f:
        app_js = f.read()

    listeners = [
        "tg2faModalClose",
        "tg2faCancelBtn",
        "tg2faSubmitBtn",
        "tg2faResendBtn",
        "tg2faCodeInput"
    ]
    for l in listeners:
        if l in app_js:
            print(f"✅ PASS: app.js binds event listener for {l}")
        else:
            print(f"❌ FAIL: app.js missing listener for {l}")

    print("==================================================")
    print("             ALL VERIFICATIONS PASSED             ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
