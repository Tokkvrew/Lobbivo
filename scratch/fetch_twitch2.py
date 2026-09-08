import requests, re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

slugs = [
    'xdefiant',
    'tom-clancys-xdefiant',
    'deadlock',
    'deadlock-1',
    'project-8',
    'neon-prime'
]

for s in slugs:
    url = f'https://www.twitch.tv/directory/category/{s}'
    r = requests.get(url, headers=headers, timeout=5)
    m = re.findall(r'https://static-cdn\.jtvnw\.net/ttv-boxart/[^\'\"\s\<\>]+', r.text)
    print(s, '->', m[0] if m else 'NOT FOUND')
