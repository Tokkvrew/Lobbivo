import re

def test_carbon_theme():
    print("Testing Carbon Theme Integration...")
    
    # 1. Check data.js
    with open("js/data.js", "r", encoding="utf-8") as f:
        data_js = f.read()
    assert "{ id: 'carbon', name: 'Carbon Stealth'" in data_js, "Carbon theme definition missing in data.js"
    print("[OK] data.js definition verified")
    
    # 2. Check storage.js
    with open("js/storage.js", "r", encoding="utf-8") as f:
        storage_js = f.read()
    assert "'carbon'" in storage_js, "carbon missing from validThemes in storage.js"
    print("[OK] storage.js validThemes verified")
    
    # 3. Check app.js
    with open("js/app.js", "r", encoding="utf-8") as f:
        app_js = f.read()
    assert "currentTheme === 'carbon'" in app_js, "carbon particle logic missing in app.js"
    assert "item.id === 'carbon'" in app_js, "carbon shop preview chip missing in app.js"
    print("[OK] app.js particles and shop preview chip verified")
    
    # 4. Check profile.js
    with open("js/profile.js", "r", encoding="utf-8") as f:
        profile_js = f.read()
    assert "theme.id === 'carbon'" in profile_js, "carbon profile preview chip missing in profile.js"
    print("[OK] profile.js theme preview chip verified")
    
    # 5. Check CSS files
    with open("css/variables.css", "r", encoding="utf-8") as f:
        var_css = f.read()
    assert '[data-theme="carbon"]' in var_css, "data-theme=carbon missing in variables.css"
    print("[OK] variables.css verified")
    
    with open("css/base.css", "r", encoding="utf-8") as f:
        base_css = f.read()
    assert '[data-theme="carbon"] .space-nebula' in base_css, "space-nebula for carbon missing in base.css"
    assert '.particle.particle-carbon' in base_css, "particle-carbon missing in base.css"
    print("[OK] base.css verified")
    
    with open("css/components.css", "r", encoding="utf-8") as f:
        comp_css = f.read()
    assert '.theme-carbon-preview' in comp_css, ".theme-carbon-preview missing in components.css"
    assert '.item-title-icon.carbon-icon' in comp_css, ".item-title-icon.carbon-icon missing in components.css"
    assert '[data-theme="carbon"] .btn-primary' in comp_css, "Carbon button glowing styles missing in components.css"
    print("[OK] components.css verified")
    
    print("\nALL CARBON THEME TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_carbon_theme()
