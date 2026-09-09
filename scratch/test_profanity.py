import re

def clean_leetspeak(text):
    t = text.lower()
    subs = {
        '0': 'o', '1': 'i', '3': 'e', '4': 'a', '@': 'a',
        '5': 's', '$': 's', '7': 't', '8': 'b', '9': 'g',
        '!': 'i', '|': 'i', '+': 't'
    }
    for k, v in subs.items():
        t = t.replace(k, v)
    return t

def translit_phonetic_to_cyr(text):
    t = text.lower()
    # multi-char
    t = t.replace('shch', 'щ').replace('sch', 'щ').replace('sh', 'ш').replace('ch', 'ч')
    t = t.replace('zh', 'ж').replace('ya', 'я').replace('yu', 'ю').replace('yo', 'ё')
    t = t.replace('ts', 'ц').replace('kh', 'х').replace('ck', 'к')
    t = t.replace('uy', 'уй').replace('oy', 'ой').replace('ay', 'ай').replace('ey', 'ей').replace('iy', 'ий')
    
    mapping = {
        'a': 'а', 'b': 'б', 'v': 'в', 'w': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'z': 'з',
        'i': 'и', 'j': 'й', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п',
        'r': 'р', 's': 'с', 't': 'т', 'u': 'у', 'f': 'ф', 'h': 'х', 'c': 'к', 'y': 'й',
        'x': 'х', 'q': 'к'
    }
    res = ''
    for char in t:
        res += mapping.get(char, char)
    return res

PROFANITY_PATTERNS = [
    # Toxic phrases & family insults
    r'мам[уаоыеё]?т?[\s_\-\.]*рах[аеиоу]?',
    r'с[ыи]н[\s_\-\.]*(?:шл[юеяу]|сл[уеяю])',
    r'с[ыи]н[\s_\-\.]*с[оа]бак',
    r'с[ыи]н[\s_\-\.]*д[еи]бил',
    r'с[ыи]н[\s_\-\.]*даун',
    r'мам[уеёыа][\s_\-\.]*[её]б',
    r'[её]б[аеиоу]?л?[\s_\-\.]*мам',
    r'(?:^|[\s_\-\d])(?:mq|rnq|мью|мкью)(?:$|[\s_\-\d])',
    
    # Russian roots
    r'ху[йиеёяю]\w*',
    r'п[иеё]зд\w*',
    r'бл[яеэ][дт]\w*',
    r'долб[оа][её]б\w*',
    r'за[её]б\w*',
    r'[еёэ]б[аеиоуылнщц]\w*',
    r'[еёэ]бл\w*',
    r'с[уо]ч?к[аеиуоы]\w*',
    r'с[уо]к[аеиуоы](?:$|[\s_\-\d])',
    r'п[ие]д[оае]р\w*',
    r'п[ие]др\w*',
    r'г[ао]нд[оа]н\w*',
    r'м[уо]д[аеи]к\w*',
    r'м[уо]д[ие]л\w*',
    r'шл[юея]х\w*',
    r'ш[ао]л[ао]в\w*',
    r'чм[оые](?:$|[\s_\-\d])',
    r'чм[оые]ш\w*',
    r'чмо\w*',
    r'мр[ао]з[ьиея]\w*',
    r'убл[юе]д[оаеик]\w*',
    r'ч[уо]рк[аеиоу]\w*',
    r'х[ао]ч[аеиу]\w*',
    r'н[ие]гг?[еа]р?\w*',
    r'д[ао][уо]н[аеиоу]\w*',
    r'пох[еэ]р\w*',
    r'х[еэ]рн[яеи]\w*',
    
    # English/translit direct patterns
    r'fagg?ot\w*',
    r'nigg?[ae]r?\w*',
    r'bitch\w*',
    r'whore\w*'
]

def is_forbidden_username(username):
    if not username:
        return False
    u = username.strip().lower()
    
    # 1. Clean leet
    clean = clean_leetspeak(u)
    
    # 2. Transliterate to cyrillic
    cyr = translit_phonetic_to_cyr(clean)
    
    # 3. Stripped versions (without separators)
    cyr_no_sep = re.sub(r'[\s_\-\.\*\+\d]+', '', cyr)
    clean_no_sep = re.sub(r'[\s_\-\.\*\+\d]+', '', clean)
    u_no_sep = re.sub(r'[\s_\-\.\*\+\d]+', '', u)
    
    variants = [u, clean, cyr, cyr_no_sep, clean_no_sep, u_no_sep]
    
    for v in variants:
        for p in PROFANITY_PATTERNS:
            if re.search(p, v, re.IGNORECASE):
                return True
                
    return False

test_forbidden = [
    "Mamut Rahal",
    "mamut_rahal",
    "sin sluhi",
    "sin_sluhi",
    "syn shlyukhi",
    "Мамут Рахал",
    "Сын Шлюхи",
    "mq",
    "HuYLo",
    "Pidoras_777",
    "Eblan2026",
    "Shlyuha_top",
    "suka_blyat",
    "xuy_123",
    "M@mut R@hal",
    "s1n_sluh1",
    "mamut_rah",
    "ebal_mamu",
    "chmo_2026",
    "mq_killer",
    "dolboeb_pro"
]

test_allowed = [
    "GoodPlayer",
    "ProGamer_2026",
    "SniperWolf",
    "DotaMaster",
    "CS_Hero",
    "Hero_99",
    "Alex_99",
    "LobbivoKing",
    "CyberGhost",
    "NeoGamer",
    "Shadow_Ninja",
    "FireFly",
    "Pheonix",
    "SuperStar",
    "Falcon",
    "Sherlock"
]

print("--- FORBIDDEN TESTS ---")
all_forbidden_ok = True
for nick in test_forbidden:
    ok = is_forbidden_username(nick)
    if not ok:
        print(f"FAILED (should be forbidden): {nick}")
        all_forbidden_ok = False
    else:
        print(f"PASSED (blocked): {nick}")

print("\n--- ALLOWED TESTS ---")
all_allowed_ok = True
for nick in test_allowed:
    ok = not is_forbidden_username(nick)
    if not ok:
        print(f"FAILED (should be allowed): {nick}")
        all_allowed_ok = False
    else:
        print(f"PASSED (allowed): {nick}")

print(f"\nFinal Result: forbidden_ok={all_forbidden_ok}, allowed_ok={all_allowed_ok}")
