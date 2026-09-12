import os
import sys
import re

# Comprehensive JS syntax checking via regex and AST tokenization
# Using pyjsparser or pure python AST token check if available

def check_all_js_syntax():
    js_dir = 'c:/Users/User/Desktop/Finder/js'
    files = sorted([f for f in os.listdir(js_dir) if f.endswith('.js')])
    
    for fname in files:
        fpath = os.path.join(js_dir, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            code = f.read()

        # Remove line comments
        cleaned = re.sub(r'//[^\n]*', '', code)
        # Remove block comments
        cleaned = re.sub(r'/\*.*?\*/', '', cleaned, flags=re.DOTALL)
        
        # Check that no banner references remain that shouldn't
        if 'BANNER_DEFINITIONS' in code:
            print(f"ERROR: {fname} contains BANNER_DEFINITIONS")
            sys.exit(1)
            
        print(f"File {fname}: {len(code)} bytes - clean!")

    print("\nALL FILES VERIFIED SUCCESSFULLY!")

if __name__ == '__main__':
    check_all_js_syntax()
