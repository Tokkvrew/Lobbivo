import re
import glob

# Unicode emoji pattern
emoji_pattern = re.compile(
    r'[\U00010000-\U0010ffff]|'
    r'[\u2600-\u27BF]|'
    r'[\u2300-\u23FF]|'
    r'[\u2B50\u2B55\u2934\u2935\u25AA\u25AB\u25FE\u25FD\u25FB\u25FC\u25B6\u25C0\u3030\u303D\u3297\u3299]'
)

files = glob.glob('js/*.js') + ['index.html']
print("=== SCANNING FOR ALL EMOJIS IN CODEBASE ===")
for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    found = []
    for i, line in enumerate(lines, 1):
        emojis = emoji_pattern.findall(line)
        if emojis:
            clean_emojis = ''.join(set(emojis))
            found.append((i, clean_emojis, line.strip()[:100]))
    if found:
        print(f"\n--- {path} ({len(found)} lines with emojis) ---")
        for line_no, ems, snippet in found[:15]:
            print(f"L{line_no} [{ems}]: {snippet}")
        if len(found) > 15:
            print(f"... and {len(found) - 15} more lines.")
