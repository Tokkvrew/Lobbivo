import os, re, sys, glob

def check_js_syntax(filepath):
    print(f"Checking JS: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    for line_idx, line in enumerate(lines, 1):
        clean_line = re.sub(r'//.*', '', line)
        for char in clean_line:
            if char in '{[(':
                stack.append((char, line_idx))
            elif char in '}])':
                if not stack:
                    print(f"  [ERROR] Unmatched closing '{char}' at line {line_idx} in {filepath}")
                    return False
                last, last_line = stack.pop()
                expected = {'{': '}', '[': ']', '(': ')'}[last]
                if char != expected:
                    print(f"  [ERROR] Mismatched '{char}', expected '{expected}' (opened at line {last_line}) in {filepath}:{line_idx}")
                    return False
    if stack:
        print(f"  [ERROR] Unclosed tokens in {filepath}: {stack[:5]}")
        return False
    print(f"  [OK] Syntax balance check passed for {filepath}")
    return True

def check_html_ids():
    print("Checking HTML IDs and references...")
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    html_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html))
    print(f"  Found {len(html_ids)} unique IDs in index.html")

    required_ids = [
        'profileFramesGrid',
        'profileThemesGrid',
        'adminNameStyleBlock',
        'profileNameStylesGrid',
        'profileId',
        'profileName',
        'deleteDirectChatHeaderBtn',
        'deleteChatModal'
    ]
    for rid in required_ids:
        if rid in html_ids:
            print(f"  [OK] Required ID present: #{rid}")
        else:
            print(f"  [ERROR] Missing required ID: #{rid}")
            return False
    return True

def check_css():
    print("Checking CSS balance...")
    with open('css/components.css', 'r', encoding='utf-8') as f:
        css = f.read()
    open_c = css.count('{')
    close_c = css.count('}')
    print(f"  components.css braces: open={open_c}, close={close_c}")
    if open_c != close_c:
        print(f"  [ERROR] CSS brace mismatch: {open_c} vs {close_c}")
        return False
    print("  [OK] CSS balance check passed")
    return True

if __name__ == '__main__':
    all_ok = True
    for js_file in sorted(glob.glob('js/*.js')):
        if not check_js_syntax(js_file):
            all_ok = False
    if not check_html_ids():
        all_ok = False
    if not check_css():
        all_ok = False
    
    if all_ok:
        print("\n>>> ALL JS FILES & PROJECT HEALTH 100% OK! <<<")
        sys.exit(0)
    else:
        print("\n>>> CHECKS FAILED! <<<")
        sys.exit(1)
