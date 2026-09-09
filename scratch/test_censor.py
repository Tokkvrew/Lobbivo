import re

CHAT_PROFANITY_REGEXES = [
    # Phrases
    re.compile(r'мам[уаоыеё]?т?[\s_\-\.]*рах[аеиоу]?', re.IGNORECASE),
    re.compile(r'с[ыи]н[\s_\-\.]*(?:шл[юеяу]|сл[уеяю])', re.IGNORECASE),
    re.compile(r'с[ыи]н[\s_\-\.]*с[оа]бак\w*', re.IGNORECASE),
    re.compile(r'с[ыи]н[\s_\-\.]*д[еи]бил\w*', re.IGNORECASE),
    re.compile(r'с[ыи]н[\s_\-\.]*даун\w*', re.IGNORECASE),
    re.compile(r'мам[уеёыа][\s_\-\.]*[её]б\w*', re.IGNORECASE),
    re.compile(r'[её]б[аеиоу]?л?[\s_\-\.]*мам\w*', re.IGNORECASE),
    re.compile(r'(^|[^\w])(mq|rnq|мью|мкью)(?=[^\w]|$)', re.IGNORECASE),

    # Russian root words
    re.compile(r'(^|[^\w])(ху[йиеёяю]\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(п[иеё]зд\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(бл[яеэ][дт]\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(долб[оа][её]б\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(за[её]б\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])([еёэ]б[аеиоуылнщц]\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])([еёэ]бл\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(с[уо]ч?к[аеиуоы]\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(с[уо]к[аеиуоы])(?=[^\w]|$)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(п[ие]д[оае]р\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(п[ие]др\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(г[ао]нд[оа]н\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(м[уо]д[аеи]к\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(м[уо]д[ие]л\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(шл[юея]х\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(ш[ао]л[ао]в\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(чм[оые])(?=[^\w]|$)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(чм[оые]ш\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(мр[ао]з[ьиея]\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(убл[юе]д[оаеик]\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(ч[уо]рк[аеиоу]\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(х[ао]ч[аеиу]\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(н[ие]гг?[еа]р?\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(д[ао][уо]н[аеиоу]\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(пох[еэ]р\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])(х[еэ]рн[яеи]\w*)', re.IGNORECASE),

    # Translit roots
    re.compile(r'(^|[^\w])((?:huy|xuy|pizd|blyad|blyat|ebal|ebat|eblan|zaebal|pidor|pidaras|gandon|mudak|shlyuha|shluha|cyka|suka)\w*)', re.IGNORECASE),
    re.compile(r'(^|[^\w])((?:fagg?ot|nigg?[ae]r?|bitch|whore)\w*)', re.IGNORECASE)
]

def censor_text(text):
    result = text
    for regex in CHAT_PROFANITY_REGEXES:
        def repl(m):
            if len(m.groups()) == 2:
                prefix = m.group(1)
                word = m.group(2)
                return f'{prefix}<span class="censored-word" onclick="this.classList.toggle(\'revealed\')" title="Нажмите, чтобы показать">{word}</span>'
            else:
                word = m.group(0)
                return f'<span class="censored-word" onclick="this.classList.toggle(\'revealed\')" title="Нажмите, чтобы показать">{word}</span>'
        result = regex.sub(repl, result)
    return result

sample = "Привет, ты долбоеб или как? Мамут рахал твой скилл, suka blyat! Пошли в cs2"
censored = censor_text(sample)
print("Original:", sample)
print("Censored:", censored)
