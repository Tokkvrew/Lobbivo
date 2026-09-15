import re

# Simulate JS SecurityShield.censorProfanity logic
toxic_phrases = [
    re.compile(r'мам[уаоыеё]?т?[\s_\-\.]*рах[аеиоу]\w*', re.I),
    re.compile(r'с[ыи]н[\s_\-\.]*(?:шл[юеяу]|сл[уеяю]|собак|псин|проститут|дур|даун|дебил|говн|дерьм)\w*', re.I),
    re.compile(r'мам[уеёыа][\s_\-\.]*(?:[еёэ]б|тр[ао]х|шата|верт)\w*', re.I),
]

word_roots = [
    re.compile(r'^(?:(?:вы|до|за|на|по|пере|при|про|у|недо|само|съ|въ|подъ|отъ|разъ|объ|изъ|взъ)[еёэ]б.*|[еёэ]б[аеиоуыйлнщцчк].*|[еёэ]бл.*|[еёэ]б[оу]т.*|[еёэ]бну.*|[еёэ]б[оыа].*|долб[оа][еёэ]б.*)$', re.I),
    re.compile(r'^(?:[а-яё]*ху[йиеёяю].*|[а-яё]*х[еэ]р[а-яё]*)$', re.I),
    re.compile(r'^(?:[а-яё]*п[иеё]зд.*)$', re.I),
    re.compile(r'^(?:[а-яё]*бл[яеэ][дт].*|бл[яеэ])$', re.I),
    re.compile(r'^(?:с[уо]ч?к[аеиуоы]|с[уо]чар[аеыу]|с[уо]чи[йеих])$', re.I),
]

whitelist = {
    'тебе', 'тебя', 'себе', 'себя', 'себестоимость',
    'ребенок', 'ребёнок', 'ребята', 'ребятам',
    'учебник', 'учебника', 'учебники', 'учеба', 'учёба', 'учебе',
    'требовать', 'требование', 'требования', 'востребован', 'востребованный',
    'потребность', 'потребности', 'потребитель', 'потребление', 'употреблять',
    'победа', 'победил', 'победитель', 'победить',
    'хлеб', 'стебель', 'мебель', 'лебедь'
}

def censor(text):
    for phr in toxic_phrases:
        text = phr.sub(r'[BLUR:\g<0>]', text)
    
    parts = re.split(r'(\[BLUR:[^\]]+\])', text)
    for i in range(len(parts)):
        if parts[i].startswith('[BLUR:'):
            continue
        
        def repl_word(m):
            raw_word = m.group(0)
            clean_word = re.sub(r'^[^\wа-яА-ЯёЁ]+|[^\wа-яА-ЯёЁ]+$', '', raw_word)
            if not clean_word:
                return raw_word
            lower_word = clean_word.lower()
            if lower_word in whitelist:
                return raw_word
            for r in word_roots:
                if r.search(lower_word):
                    return f'[BLUR:{raw_word}]'
            return raw_word
        
        parts[i] = re.sub(r'[^\s.,!?:;"\'()<>«»[\]{}]+', repl_word, parts[i])
    return ''.join(parts)

# Test cases
cases = [
    ("Привет, я отправляю тебе сообщение!", "Привет, я отправляю тебе сообщение!"),
    ("Возьми себе дроп, я помогу тебе.", "Возьми себе дроп, я помогу тебе."),
    ("Поздравляю с победой, отличная победа!", "Поздравляю с победой, отличная победа!"),
    ("Купи хлеб и новую мебель", "Купи хлеб и новую мебель"),
    ("Да похуй мне на твой рейтинг", "Да [BLUR:похуй] мне на твой рейтинг"),
    ("Ты ебанутый долбоеб нахуй", "Ты [BLUR:ебанутый] [BLUR:долбоеб] [BLUR:нахуй]"),
    ("Заебись сыграли, победа за нами", "[BLUR:Заебись] сыграли, победа за нами")
]

all_passed = True
for inp, exp in cases:
    res = censor(inp)
    if res != exp:
        print(f"FAILED!\nInput:    {inp}\nExpected: {exp}\nGot:      {res}")
        all_passed = False
    else:
        print(f"PASSED: {inp} -> {res}")

if all_passed:
    print("\nALL SENTENCE TESTS PASSED PERFECTLY!")
