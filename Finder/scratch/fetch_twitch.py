import requests, re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

slugs = {
    'minecraft': 'minecraft',
    'league': 'league-of-legends',
    'tarkov': 'escape-from-tarkov',
    'wow': 'world-of-warcraft',
    'xdefiant': 'xdefiant',
    'deadlock': 'deadlock',
    'apex': 'apex-legends',
    'valorant': 'valorant',
    'overwatch': 'overwatch-2',
    'rust': 'rust'
}

for k, slug in slugs.items():
    try:
        url = f'https://www.twitch.tv/directory/category/{slug}'
        r = requests.get(url, headers=headers, timeout=10)
        m = re.findall(r'https://static-cdn\.jtvnw\.net/ttv-boxart/[^\"\'\s\<\>]+', r.text)
        if m:
            # pick one and format to 600x900
            box_url = m[0].replace('{width}', '600').replace('{height}', '900').replace('-285x380', '-600x900').replace('-52x72', '-600x900')
            print(f'{k} -> {box_url}')
        else:
            print(f'{k} -> NOT FOUND')
    except Exception as e:
        print(f'{k} -> ERROR: {e}')
