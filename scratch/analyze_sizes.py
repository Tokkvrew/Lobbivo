import os

workspace = r"c:\Users\User\Desktop\Finder"

def analyze_sizes():
    print("=== ASSET & CODE SIZES ===")
    total_size = 0
    for root, dirs, files in os.walk(workspace):
        if "scratch" in root or ".git" in root:
            continue
        for f in files:
            p = os.path.join(root, f)
            sz = os.path.getsize(p)
            rel = os.path.relpath(p, workspace)
            total_size += sz
            if sz > 20000:
                print(f"{rel}: {sz / 1024:.1f} KB")
    print(f"\nTotal production payload: {total_size / 1024:.1f} KB")

analyze_sizes()
