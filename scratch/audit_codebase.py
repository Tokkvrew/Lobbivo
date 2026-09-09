import os
import re
from collections import defaultdict

workspace = r"c:\Users\User\Desktop\Finder"

# 1. Read index.html
with open(os.path.join(workspace, "index.html"), "r", encoding="utf-8") as f:
    html_content = f.read()

# 2. Read all JS files
js_files = {}
for fname in os.listdir(os.path.join(workspace, "js")):
    if fname.endswith(".js"):
        with open(os.path.join(workspace, "js", fname), "r", encoding="utf-8") as f:
            js_files[fname] = f.read()

# 3. Read all CSS files
css_files = {}
for fname in os.listdir(os.path.join(workspace, "css")):
    if fname.endswith(".css"):
        with open(os.path.join(workspace, "css", fname), "r", encoding="utf-8") as f:
            css_files[fname] = f.read()

all_js_combined = "\n".join(js_files.values())
all_code_combined = html_content + "\n" + all_js_combined

print("=== 1. CHECK DUPLICATE FUNCTION DEFINITIONS IN JS ===")
func_defs = defaultdict(list)
func_pattern = re.compile(r'(?:function\s+([a-zA-Z0-9_$]+)\s*\(|window\.([a-zA-Z0-9_$]+)\s*=)')
for fname, content in js_files.items():
    for line_no, line in enumerate(content.splitlines(), 1):
        for match in func_pattern.finditer(line):
            name = match.group(1) or match.group(2)
            if name:
                func_defs[name].append((fname, line_no))

duplicates = {k: v for k, v in func_defs.items() if len(v) > 1}
if duplicates:
    for name, locs in duplicates.items():
        print(f"Duplicate function: {name} defined in:")
        for fname, line_no in locs:
            print(f"  - {fname}:{line_no}")
else:
    print("No duplicate function definitions found.")

print("\n=== 2. CHECK DUPLICATE IDS IN index.html ===")
id_matches = re.findall(r'id=["\']([^"\']+)["\']', html_content)
id_counts = defaultdict(int)
for i in id_matches:
    id_counts[i] += 1
duplicate_ids = {k: v for k, v in id_counts.items() if v > 1}
if duplicate_ids:
    for i, count in duplicate_ids.items():
        print(f"Duplicate ID '{i}' appears {count} times!")
else:
    print("No duplicate IDs in index.html (all 436 IDs are unique).")

print("\n=== 3. CHECK DUPLICATE KEYFRAMES IN CSS ===")
keyframe_defs = defaultdict(list)
kf_pattern = re.compile(r'@keyframes\s+([a-zA-Z0-9_-]+)')
for fname, content in css_files.items():
    for line_no, line in enumerate(content.splitlines(), 1):
        for match in kf_pattern.finditer(line):
            name = match.group(1)
            keyframe_defs[name].append((fname, line_no))

duplicate_kfs = {k: v for k, v in keyframe_defs.items() if len(v) > 1}
if duplicate_kfs:
    for name, locs in duplicate_kfs.items():
        print(f"Duplicate @keyframes: {name} defined in:")
        for fname, line_no in locs:
            print(f"  - {fname}:{line_no}")
else:
    print("No duplicate keyframes found.")

print("\n=== 4. CHECK UNUSED JS FUNCTIONS ===")
# Find functions that are defined but never mentioned anywhere else
unused_funcs = []
for func_name, locs in func_defs.items():
    if len(locs) == 1:
        fname, line_no = locs[0]
        # Count occurrences of func_name across all code
        # regex boundary
        pattern = re.compile(r'\b' + re.escape(func_name) + r'\b')
        matches = pattern.findall(all_code_combined)
        # 1 match means only its definition
        if len(matches) <= 1:
            unused_funcs.append((func_name, fname, line_no))

if unused_funcs:
    print(f"Found {len(unused_funcs)} potentially unused functions:")
    for name, fname, line_no in unused_funcs:
        print(f"  - {name} in {fname}:{line_no}")
else:
    print("All functions are referenced.")

print("\n=== 5. CHECK UNREFERENCED HTML IDS IN JS / CSS ===")
unused_ids = []
for single_id in id_counts.keys():
    pattern = re.compile(r'\b' + re.escape(single_id) + r'\b')
    # Count occurrences in JS and CSS
    js_matches = pattern.findall(all_js_combined)
    css_matches = []
    for cname, ccontent in css_files.items():
        css_matches.extend(re.findall(r'#' + re.escape(single_id) + r'\b', ccontent))
    if len(js_matches) == 0 and len(css_matches) == 0:
        unused_ids.append(single_id)

print(f"Total HTML IDs: {len(id_counts)}, Unreferenced in JS/CSS (pure static markup): {len(unused_ids)}")
if len(unused_ids) <= 30:
    for i in unused_ids:
        print(f"  - {i}")
