# -*- coding: utf-8 -*-
import sys
import os
import re

sys.path.append(os.path.dirname(__file__))
from test_censor_cases import TEST_CASES

# Translit to Cyrillic for Russian profanities written in Latin
TRANSLIT_TO_CYRILLIC = {
    'shch': 'щ', 'sch': 'щ',
    'ch': 'ч', 'sh': 'ш', 'zh': 'ж',
    'yo': 'ё', 'jo': 'ё',
    'yu': 'ю', 'ju': 'ю',
    'ya': 'я', 'ja': 'я',
    'ye': 'е', 'je': 'е',
    'kh': 'х', 'ts': 'ц',
    'x': 'х',
    'p': 'п',
    'r': 'р',
    'c': 'к',
    'w': 'в', 'v': 'в',
    'y': 'у', 'u': 'у',
    'i': 'и', 'j': 'й',
    'e': 'е', 'a': 'а',
    'b': 'б', 'g': 'г',
    'd': 'д', 'z': 'з',
    'k': 'к', 'l': 'л',
    'm': 'м', 'n': 'н',
    'o': 'о', 's': 'с',
    't': 'т', 'f': 'ф',
    'h': 'х',
}

# English Profanities (tested in original Latin lowercase)
ENGLISH_PROFANITIES = [
    r'\bfuck\w*',
    r'\bfucking\w*',
    r'\bfucker\w*',
    r'\bmotherfuck\w*',
    r'\bbitch\w*',
    r'\bwhore\w*',
    r'\bslut\w*',
    r'\bdick\w*',
    r'\bcunt\w*',
    r'\basshole\w*',
    r'\bfagg?ot\w*',
    r'\bnigg?[ae]r?\w*',
    r'\bretard\w*',
    r'\bmq\b',
    r'\brnq\b',
]
COMPILED_EN_PROFANITIES = [re.compile(p, re.IGNORECASE) for p in ENGLISH_PROFANITIES]

# Cyrillic Leetspeak Replacements (mixed Cyrillic/Latin characters)
LEETSPEAK_MAP = {
    '@': 'а', '4': 'а', 'a': 'а',
    '6': 'б', 'b': 'б',
    'v': 'в', 'w': 'в',
    'g': 'г',
    'd': 'д',
    '3': 'з', 'z': 'з',
    '1': 'и', '!': 'и', '|': 'и', 'i': 'и', 'j': 'й',
    'k': 'к',
    'l': 'л',
    'm': 'м',
    'h': 'н', 'n': 'н',
    '0': 'о', 'o': 'о',
    'p': 'р', 'r': 'р',
    'c': 'с', 's': 'с', '$': 'с',
    't': 'т',
    'u': 'у', 'y': 'у',
    'x': 'х',
    'e': 'е', 'ё': 'е',
}

WHITELIST_WORDS = {
    'рубль', 'рубля', 'рублю', 'рублем', 'рубли', 'рублей', 'рублям', 'рублях',
    'колебание', 'колебания', 'колебаний', 'колебаниям', 'колебаться', 'колеблется', 'колеблются',
    'стебель', 'стебля', 'стебли', 'стеблей',
    'хлеб', 'хлеба', 'хлебу', 'хлебом', 'хлебе', 'хлебный', 'хлебница',
    'ослабление', 'ослабления', 'ослабить', 'ослаблен', 'ослабленный',
    'ястреб', 'ястреба', 'ястребы', 'ястребов',
    'парикмахер', 'парикмахера', 'парикмахеры', 'парикмахерская',
    'страховка', 'страховки', 'страховку', 'страховкой', 'страхование', 'застрахован', 'застрахована', 'застраховать', 'страховой',
    'выхухоль', 'выхухоли',
    'скипидар', 'скипидара',
    'педагог', 'педагога', 'педагоги', 'педагогика',
    'эпидермис',
    'употреблять', 'употребление', 'употребил', 'употребить', 'употребляет',
    'оскорблять', 'оскорбление', 'оскорбил', 'оскорбить', 'оскорбляет', 'оскорбления',
    'посуда', 'посуды', 'посуду', 'посудой',
    'рисунок', 'рисунка', 'рисунку', 'рисунки', 'рисунков',
    'барсук', 'барсука', 'барсуки', 'барсуков',
    'сукно', 'сукна',
    'сосуд', 'сосуда', 'сосуды', 'сосудов',
    'кусок', 'куска', 'куску', 'куски', 'кусков', 'кусочек', 'кусочки',
    'брусок', 'бруска', 'бруски',
    'носок', 'носка', 'носки', 'носков',
    'песок', 'песка', 'песку', 'песком', 'песочница', 'песочный', 'песочницы',
    'лесок', 'леска', 'лески',
    'гребля', 'гребли', 'загребать', 'выгребать', 'погреб',
    'грабли', 'граблями',
    'дубль', 'дубли', 'дубликат',
    'теребить', 'теребит',
    'шапка', 'шапку', 'шапки',
}

TOXIC_PHRASE_PATTERNS = [
    r'мам[уаоыеё]?т?[\s_\-\.]*рах[аеиоу]\w*',
    r'с[ыи]н[\s_\-\.]*(?:шл[юеяу]|сл[уеяю]|собак|псин|проститут|дур|даун|дебил|говн|дерьм)\w*',
    r'мам[уеёыа][\s_\-\.]*(?:[еёэ]б|тр[ао]х|шата|верт)\w*',
    r'(?:твой|твую|твой|ваш|его|ее|их)[\s_\-\.]*рот[\s_\-\.]*[еёэ]б\w*',
    r'рот[\s_\-\.]*(?:твой|ваш)?[\s_\-\.]*[еёэ]б\w*',
    r'[еёэ]б[аеиоу]?л?[\s_\-\.]*мам\w*',
    r'матер[иеь][\s_\-\.]*привет',
]
COMPILED_PHRASES = [re.compile(p, re.IGNORECASE) for p in TOXIC_PHRASE_PATTERNS]

CYRILLIC_PROFANITY_ROOTS = [
    # 1. Еб / ёб / эб
    r'(?:[а-яё]*[еёэ]б[аеиоуылнщцчк].*|[а-яё]*[еёэ]бл.*|[а-яё]*[еёэ]б[оу]т.*|[а-яё]*[еёэ]бну.*|[а-яё]*[еёэ]б[а-яё]*|за[еёэ]б.*|съ[еёэ]б.*|въ[еёэ]б.*|подъ[еёэ]б.*|отъ[еёэ]б.*|разъ[еёэ]б.*|объ[еёэ]б.*|изъ[еёэ]б.*|взъ[еёэ]б.*|у[еёэ]б.*)',
    # 2. Хуй / хуе / хуя / похуй / нахуй / нихуя / дохуя / охуел / ахуел / хер
    r'(?:[а-яё]*ху[йиеёяю].*|[а-яё]*х[еэ]р[а-яё]*)',
    # 3. Пизд / спиздил / распиздяй / допизделся / впизду
    r'(?:[а-яё]*п[иеё]зд.*)',
    # 4. Бля / блять / блядь / блядина / блядский
    r'(?:[а-яё]*бл[яеэ][дт].*|бл[яеэ])',
    # 5. Сука / сучка / сучара / сучий
    r'(?:с[уо]ч?к[аеиуоы]|с[уо]чар[аеыу]|с[уо]чи[йеих])',
    # 6. Пидор / пидорас / пидарас / пидрила / педик
    r'(?:[а-яё]*п[ие]д[оае]р.*|п[ие]др[иа].*|п[еи]д[ие]к.*|п[еи]д[еи]раст.*)',
    # 7. Гандон / гондон
    r'(?:[а-яё]*г[ао]нд[оа]н.*)',
    # 8. Мудак / мудила / мудозвон
    r'(?:[а-яё]*м[уо]д[аеио].*)',
    # 9. Шлюха / шалава / шаболда / прошмандовка
    r'(?:[а-яё]*шл[юея]х.*|ш[ао]л[ао]в.*|ш[ао]б[оа]лд.*|прошманд.*)',
    # 10. Мразь / мразота / ублюдок
    r'(?:[а-яё]*мр[ао]з[ьиея].*|убл[юе]д.*)',
    # 11. Чмо / чмошник / чмырь
    r'(?:чм[оые]|чм[оые]ш.*|чмыр.*|чмон.*)',
    # 12. Долбоеб / долбоёб / долбаеб / долбик
    r'(?:долб[оа][еёэ]б.*|долбик.*)',
    # 13. Залупа / залупился / дрочить / задрот
    r'(?:[а-яё]*зал[уо]п.*|др[оа]ч.*|задр[оа]т.*)',
    # 14. Манда / целка
    r'(?:м[ао]нд[аеуоы].*|ц[еэ]лк[аеуоы])',
    # 15. MQ / RNQ / Мью
    r'(?:mq|rnq|мью|мкью)',
    # 16. Slurs / insults
    r'(?:н[ие]гг?[еа]р.*|ч[уо]рк.*|х[ао]ч[аеиу].*|хачил.*)',
]
COMPILED_CYRILLIC_ROOTS = [re.compile(f'^{p}$', re.IGNORECASE) for p in CYRILLIC_PROFANITY_ROOTS]

def translit_to_cyrillic(text):
    t = text.lower()
    for lat, cyr in sorted(TRANSLIT_TO_CYRILLIC.items(), key=lambda x: -len(x[0])):
        t = t.replace(lat, cyr)
    return t

def leetspeak_normalize(text):
    res = []
    for ch in text.lower():
        res.append(LEETSPEAK_MAP.get(ch, ch))
    return ''.join(res)

def is_word_profane(word):
    clean_original = re.sub(r'^[^\wа-яА-ЯёЁ]+|[^\wа-яА-ЯёЁ]+$', '', word)
    if not clean_original:
        return False

    # 1. English profanities check
    for en_regex in COMPILED_EN_PROFANITIES:
        if en_regex.search(clean_original):
            return True

    # 2. Cyrillic whitelist check
    norm_leet = leetspeak_normalize(clean_original)
    if norm_leet in WHITELIST_WORDS or clean_original.lower() in WHITELIST_WORDS:
        return False

    # 3. Cyrillic profanity roots check (with leetspeak)
    for r in COMPILED_CYRILLIC_ROOTS:
        if r.match(norm_leet):
            return True

    # 4. Transliterated Russian check (e.g., ebat, pizdec, nahuy)
    norm_translit = translit_to_cyrillic(clean_original)
    if norm_translit in WHITELIST_WORDS:
        return False
    for r in COMPILED_CYRILLIC_ROOTS:
        if r.match(norm_translit):
            return True

    return False

# Test with test cases
passed = 0
failed = 0
for text, should_be_profane in TEST_CASES:
    is_profane = False
    
    # 1. Check toxic multi-word phrases
    norm_phrase = leetspeak_normalize(text)
    for pr in COMPILED_PHRASES:
        if pr.search(norm_phrase) or pr.search(text):
            is_profane = True
            break
            
    # 2. Check individual words
    if not is_profane:
        words = re.findall(r'[^\s.,!?:;"\'()<>«»\[\]{}]+', text)
        for w in words:
            if is_word_profane(w):
                is_profane = True
                break
                
    if is_profane == should_be_profane:
        passed += 1
    else:
        failed += 1
        print(f"FAILED: '{text}' -> got {is_profane}, expected {should_be_profane}")

print(f"\nRESULTS: Passed {passed}/{len(TEST_CASES)}, Failed {failed}")
