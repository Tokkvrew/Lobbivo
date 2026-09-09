# -*- coding: utf-8 -*-
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

pattern = r'(^|[^\w])(гей|геи|геем|геев|гейский|гейская|гейское|гейские|гейству|геями|геях|gay|gays)(?=[^\w]|$)'
tests = [
    'Я гей',
    'он ГЕЙ!',
    'ты гей?',
    'Сергей тут?',
    'геймер 2000',
    'геймпад сломался',
    'gay party',
    'он геем стал',
    'ты гейский тип'
]

for t in tests:
    res = re.sub(pattern, r'\g<1><span class="rainbow-gay-tag">Gay</span>', t, flags=re.IGNORECASE)
    print(f"{t:20} => {res}")
