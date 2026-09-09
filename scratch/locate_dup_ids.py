with open(r"c:\Users\User\Desktop\Finder\index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines, 1):
    for dup in ['editGame', 'regGame', 'squadGame', 'fire', 'cyber', 'gold', 'ice', 'ghost', 'nebula', 'crimson', 'matrix']:
        if f'id="{dup}"' in line or f"id='{dup}'" in line:
            print(f"Line {idx}: {dup} -> {line.strip()}")
