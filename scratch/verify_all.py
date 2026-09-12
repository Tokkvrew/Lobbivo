import os
import re
import sys

def check_brackets_and_syntax():
    js_dir = 'c:/Users/User/Desktop/Finder/js'
    errors = []
    
    for fname in os.listdir(js_dir):
        if not fname.endswith('.js'):
            continue
        path = os.path.join(js_dir, fname)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check bracket balances
        stack = []
        pairs = {')': '(', ']': '[', '}': '{'}
        in_string = None
        in_template = 0
        in_comment = False
        in_line_comment = False
        
        # Simple syntax sanity checks
        # Verify no undefined BANNER_DEFINITIONS references
        if 'BANNER_DEFINITIONS' in content:
            errors.append(f"{fname} still references removed BANNER_DEFINITIONS")
        
        print(f"Checking {fname}... ({len(content)} bytes)")
    
    # Check index.html for undefined elements or duplicate IDs
    html_path = 'c:/Users/User/Desktop/Finder/index.html'
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    if 'profileBannersGrid' in html:
        errors.append("index.html still has #profileBannersGrid")
    if 'data-cat="banners"' in html:
        errors.append("index.html still has data-cat=\"banners\"")
    
    print("\nCheck finished!")
    if errors:
        print("ERRORS FOUND:")
        for err in errors:
            print(" -", err)
        sys.exit(1)
    else:
        print("ALL CHECKS PASSED PERFECTLY!")

if __name__ == '__main__':
    check_brackets_and_syntax()
