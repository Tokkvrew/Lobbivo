import re

with open('c:/Users/User/Desktop/Finder/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

symbols = set(re.findall(r'<symbol\s+id="([^"]+)"', html))
uses = set(re.findall(r'<use\s+href="#([^"]+)"', html))

missing = uses - symbols
print("Defined symbols count:", len(symbols))
print("Used symbols count:", len(uses))
print("Missing symbols in sprite:", missing)
