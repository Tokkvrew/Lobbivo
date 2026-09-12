// ============================================================
//  LOBBIVO SECURITY SHIELD (DDoS, ANTI-FLOOD & RATE LIMITING)
// ============================================================

const SecurityShield = {
  // Настройки лимитов по типам действий
  limits: {
    chat: {
      maxRequests: 4,      // Макс запросов за окно
      windowMs: 4000,      // Временное окно (4 секунды)
      cooldownMs: 12000,   // Время блокировки при превышении (12 секунд)
      label: 'Личные сообщения'
    },
    world_chat: {
      maxRequests: 3,      // Макс запросов за окно
      windowMs: 5000,      // Временное окно (5 секунд)
      cooldownMs: 15000,   // Время блокировки (15 секунд)
      label: 'Мировой чат'
    },
    auth: {
      maxRequests: 5,      // Макс попыток авторизации в минуту
      windowMs: 60000,     // Окно 60 секунд
      cooldownMs: 30000,   // Блокировка 30 секунд
      label: 'Авторизация'
    },
    squad: {
      maxRequests: 6,      // Создание анкет
      windowMs: 10000,     // 10 секунд
      cooldownMs: 8000,    // Блокировка 8 секунд
      label: 'Создание анкеты'
    },
    complaint: {
      maxRequests: 3,      // Жалобы
      windowMs: 60000,
      cooldownMs: 45000,
      label: 'Отправка жалобы'
    },
    coins: {
      maxRequests: 6,      // Действия с монетами
      windowMs: 10000,
      cooldownMs: 15000,
      label: 'Операции с монетами'
    }
  },

  // Хранилище временных меток и активных блокировок
  history: {},
  cooldowns: {},
  countdownTimers: {},

  /**
   * Проверка лимита запросов для заданного действия
   * @param {string} actionType - 'chat' | 'world_chat' | 'auth' | 'squad' | 'complaint' | 'coins'
   * @returns {boolean} true, если действие разрешено; false, если заблокировано
   */
  checkRateLimit(actionType) {
    const config = this.limits[actionType] || { maxRequests: 5, windowMs: 5000, cooldownMs: 10000, label: 'Действие' };
    const now = Date.now();

    // 1. Проверка активного кулдауна (блокировки)
    if (this.cooldowns[actionType] && this.cooldowns[actionType] > now) {
      const remainingSeconds = Math.ceil((this.cooldowns[actionType] - now) / 1000);
      this.showCooldownAlert(actionType, remainingSeconds);
      return false;
    }

    // 2. Инициализация истории для данного действия
    if (!this.history[actionType]) {
      this.history[actionType] = [];
    }

    // Очистка устаревших меток времени за пределами окна
    this.history[actionType] = this.history[actionType].filter(ts => (now - ts) < config.windowMs);

    // 3. Проверка превышения лимита
    if (this.history[actionType].length >= config.maxRequests) {
      // Активируем кулдаун
      this.cooldowns[actionType] = now + config.cooldownMs;
      this.history[actionType] = []; // Сброс истории

      const waitSec = Math.ceil(config.cooldownMs / 1000);
      console.warn(`[Shield] Anti-Flood сработал для [${actionType}]. Блокировка на ${waitSec} сек.`);
      this.showCooldownAlert(actionType, waitSec);
      return false;
    }

    // Добавляем текущую метку
    this.history[actionType].push(now);
    return true;
  },

  /**
   * Показ интерактивного баннера с обратным отсчетом при спаме
   */
  showCooldownAlert(actionType, seconds) {
    const config = this.limits[actionType] || { label: 'Действие' };
    const notif = document.getElementById('notification');
    const titleEl = document.getElementById('notifTitle');
    const bodyEl = document.getElementById('notifBody');
    if (!notif) return;

    if (this.countdownTimers[actionType]) {
      clearInterval(this.countdownTimers[actionType]);
    }

    let remaining = seconds;
    const updateText = () => {
      if (titleEl) titleEl.innerHTML = `<svg class="mini-svg" style="width:14px;height:14px;margin-right:4px;vertical-align:-2px;"><use href="#icon-shield"/></svg>Защита от флуда`;
      if (bodyEl) {
        bodyEl.innerHTML = `Слишком много действий (${config.label}). Подождите <b>${remaining} сек.</b>`;
      }
    };

    updateText();
    notif.classList.add('show');

    this.countdownTimers[actionType] = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(this.countdownTimers[actionType]);
        delete this.countdownTimers[actionType];
        if (titleEl) titleEl.innerHTML = `<svg class="mini-svg" style="width:14px;height:14px;margin-right:4px;vertical-align:-2px;"><use href="#icon-check"/></svg>Ограничение снято`;
        if (bodyEl) bodyEl.innerHTML = `Можете продолжать работу (${config.label}).`;
        setTimeout(() => {
          notif.classList.remove('show');
        }, 2200);
      } else {
        updateText();
      }
    }, 1000);
  },

  /**
   * Валидация и защита входящего текста (Anti-Payload / XSS / Giant Buffer)
   * @param {string} text - Исходный текст
   * @param {number} maxLength - Максимально допустимая длина
   * @returns {string} Очищенный безопасный текст
   */
  sanitizeText(text, maxLength = 500) {
    if (!text || typeof text !== 'string') return '';
    let sanitized = text.trim();
    // Ограничиваем длину (защита от гигантских пакетов)
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    return sanitized;
  },

  /**
   * Очистка текста от leetspeak-замен (0->o, @->a, 1->i и т.д.)
   */
  cleanLeetspeak(text) {
    if (!text || typeof text !== 'string') return '';
    let t = text.toLowerCase();
    const subs = {
      '0': 'o', '1': 'i', '3': 'e', '4': 'a', '@': 'a',
      '5': 's', '$': 's', '7': 't', '8': 'b', '9': 'g',
      '!': 'i', '|': 'i', '+': 't'
    };
    for (const [k, v] of Object.entries(subs)) {
      t = t.split(k).join(v);
    }
    return t;
  },

  /**
   * Фонетическая транслитерация латиницы в кириллицу для выявления завуалированного мата
   */
  translitPhoneticToCyr(text) {
    if (!text || typeof text !== 'string') return '';
    let t = text.toLowerCase();
    t = t.replace(/shch/g, 'щ').replace(/sch/g, 'щ').replace(/sh/g, 'ш').replace(/ch/g, 'ч');
    t = t.replace(/zh/g, 'ж').replace(/ya/g, 'я').replace(/yu/g, 'ю').replace(/yo/g, 'ё');
    t = t.replace(/ts/g, 'ц').replace(/kh/g, 'х').replace(/ck/g, 'к');
    t = t.replace(/uy/g, 'уй').replace(/oy/g, 'ой').replace(/ay/g, 'ай').replace(/ey/g, 'ей').replace(/iy/g, 'ий');

    const mapping = {
      'a': 'а', 'b': 'б', 'v': 'в', 'w': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'z': 'з',
      'i': 'и', 'j': 'й', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п',
      'r': 'р', 's': 'с', 't': 'т', 'u': 'у', 'f': 'ф', 'h': 'х', 'c': 'к', 'y': 'й',
      'x': 'х', 'q': 'к'
    };

    let res = '';
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      res += mapping[ch] || ch;
    }
    return res;
  },

  // Базовые запрещенные паттерны для никнеймов
  forbiddenNickPatterns: [
    // Оскорбления родных и токсичные фразы
    /мам[уаоыеё]?т?[\s_\-\.]*рах[аеиоу]?/i,
    /с[ыи]н[\s_\-\.]*(?:шл[юеяу]|сл[уеяю])/i,
    /с[ыи]н[\s_\-\.]*с[оа]бак/i,
    /с[ыи]н[\s_\-\.]*д[еи]бил/i,
    /с[ыи]н[\s_\-\.]*даун/i,
    /мам[уеёыа][\s_\-\.]*[её]б/i,
    /[её]б[аеиоу]?л?[\s_\-\.]*мам/i,
    /(?:^|[\s_\-\d])(?:mq|rnq|мью|мкью)(?:$|[\s_\-\d])/i,

    // Корни мата
    /ху[йиеёяю]\w*/i,
    /п[иеё]зд\w*/i,
    /бл[яеэ][дт]\w*/i,
    /долб[оа][её]б\w*/i,
    /за[её]б\w*/i,
    /[еёэ]б[аеиоуылнщц]\w*/i,
    /[еёэ]бл\w*/i,
    /с[уо]ч?к[аеиуоы]\w*/i,
    /с[уо]к[аеиуоы](?:$|[\s_\-\d])/i,
    /п[ие]д[оае]р\w*/i,
    /п[ие]др\w*/i,
    /г[ао]нд[оа]н\w*/i,
    /м[уо]д[аеи]к\w*/i,
    /м[уо]д[ие]л\w*/i,
    /шл[юея]х\w*/i,
    /ш[ао]л[ао]в\w*/i,
    /чм[оые](?:$|[\s_\-\d])/i,
    /чм[оые]ш\w*/i,
    /чмо\w*/i,
    /мр[ао]з[ьиея]\w*/i,
    /убл[юе]д[оаеик]\w*/i,
    /ч[уо]рк[аеиоу]\w*/i,
    /х[ао]ч[аеиу]\w*/i,
    /н[ие]гг?[еа]р?\w*/i,
    /д[ао][уо]н[аеиоу]\w*/i,
    /пох[еэ]р\w*/i,
    /х[еэ]рн[яеи]\w*/i,

    // Английские / транслитные формы
    /fagg?ot\w*/i,
    /nigg?[ae]r?\w*/i,
    /bitch\w*/i,
    /whore\w*/i
  ],

  // Регулярные выражения для цензуры токсичных многословных связок (оскорбления родителей/родных)
  toxicPhraseRegexes: [
    /мам[уаоыеё]?т?[\s_\-\.]*рах[аеиоу]\w*/gi,
    /с[ыи]н[\s_\-\.]*(?:шл[юеяу]|сл[уеяю]|собак|псин|проститут|дур|даун|дебил|говн|дерьм)\w*/gi,
    /мам[уеёыа][\s_\-\.]*(?:[еёэ]б|тр[ао]х|шата|верт)\w*/gi,
    /(?:твой|твою|твой|ваш|вашу|его|ее|их)[\s_\-\.]*рот[\s_\-\.]*[еёэ]б\w*/gi,
    /рот[\s_\-\.]*(?:твой|ваш)?[\s_\-\.]*[еёэ]б\w*/gi,
    /[еёэ]б[аеиоу]?л?[\s_\-\.]*мам\w*/gi,
    /матер[иеь][\s_\-\.]*привет/gi
  ],

  // Регулярные выражения корней нецензурных слов для проверки отдельных токенов
  profanityWordRoots: [
    // Еб / ёб / эб (с любыми приставками и суффиксами: заебал, съебись, выебон, подъеб, наебалово, проеб, разъеб, отъебись, въебал, доебался, переебал, уебок, поебать, приебался и др.)
    /^(?:[а-яё]*[еёэ]б[аеиоуылнщцчк].*|[а-яё]*[еёэ]бл.*|[а-яё]*[еёэ]б[оу]т.*|[а-яё]*[еёэ]бну.*|[а-яё]*[еёэ]б[а-яё]*|за[еёэ]б.*|съ[еёэ]б.*|въ[еёэ]б.*|подъ[еёэ]б.*|отъ[еёэ]б.*|разъ[еёэ]б.*|объ[еёэ]б.*|изъ[еёэ]б.*|взъ[еёэ]б.*|у[еёэ]б.*)$/i,
    // Хуй / хуе / хуя / похуй / нахуй / нихуя / дохуя / охуел / ахуел / хер
    /^(?:[а-яё]*ху[йиеёяю].*|[а-яё]*х[еэ]р[а-яё]*)$/i,
    // Пизд / спиздил / распиздяй / допизделся / впизду / отпиздить
    /^(?:[а-яё]*п[иеё]зд.*)$/i,
    // Бля / блять / блядь / блядина / блядский
    /^(?:[а-яё]*бл[яеэ][дт].*|бл[яеэ])$/i,
    // Сука / сучка / сучара / сучий
    /^(?:с[уо]ч?к[аеиуоы]|с[уо]чар[аеыу]|с[уо]чи[йеих])$/i,
    // Пидор / пидорас / пидарас / пидрила / педик
    /^(?:[а-яё]*п[ие]д[оае]р.*|п[ие]др[иа].*|п[еи]д[ие]к.*|п[еи]д[еи]раст.*)$/i,
    // Гандон / гондон
    /^(?:[а-яё]*г[ао]нд[оа]н.*)$/i,
    // Мудак / мудила / мудозвон
    /^(?:[а-яё]*м[уо]д[аеио].*)$/i,
    // Шлюха / шалава / шаболда / прошмандовка
    /^(?:[а-яё]*шл[юея]х.*|ш[ао]л[ао]в.*|ш[ао]б[оа]лд.*|прошманд.*)$/i,
    // Мразь / мразота / ублюдок
    /^(?:[а-яё]*мр[ао]з[ьиея].*|убл[юе]д.*)$/i,
    // Чмо / чмошник / чмырь
    /^(?:чм[оые]|чм[оые]ш.*|чмыр.*|чмон.*)$/i,
    // Долбоеб / долбоёб / долбаеб / долбик
    /^(?:долб[оа][еёэ]б.*|долбик.*)$/i,
    // Залупа / залупился / дрочить / задрот
    /^(?:[а-яё]*зал[уо]п.*|др[оа]ч.*|задр[оа]т.*)$/i,
    // Манда / целка
    /^(?:м[ао]нд[аеуоы].*|ц[еэ]лк[аеуоы])$/i,
    // MQ / RNQ / Мью
    /^(?:mq|rnq|мью|мкью)$/i,
    // Slurs / insults
    /^(?:н[ие]гг?[еа]р.*|ч[уо]рк.*|х[ао]ч[аеиу].*|хачил.*)$/i,
    // English & Translit profanities
    /^(?:fagg?ot.*|nigg?[ae]r?.*|bitch.*|whore.*|slut.*|fuck.*|dick.*|cunt.*|asshole.*|retard.*|huy.*|xuy.*|nahuy.*|pohuy.*|doxuy.*|nixuy.*|pizd.*|blya.*|blyat.*|blyad.*|ebat.*|ebal.*|ebnut.*|eblan.*|zaeb.*|ueb.*|pidor.*|pidaras.*|gandon.*|mudak.*|shlyuh.*|shalav.*|mraz.*|zalup.*)$/i
  ],

  // Белый список легитимных слов (исключение ложных срабатываний)
  profanityWhitelist: new Set([
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
    'шапка', 'шапку', 'шапки', 'шапке', 'шапкой'
  ]),

  // Карта литспика и схожих символов для нормализации
  leetspeakMap: {
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
    'e': 'е', 'ё': 'е'
  },

  /**
   * Проверка никнейма (стандартная проверка формата)
   */
  isForbiddenUsername(username) {
    return { forbidden: false };
  },

  /**
   * Цензура и блюр нецензурных выражений в тексте сообщений
   * @param {string} safeText - Уже экранированный текст
   * @param {boolean} isCensorshipActive - Включена ли цензура в настройках
   * @returns {string} Текст со стилизованным блюром
   */
  censorProfanity(safeText, isCensorshipActive = true) {
    if (!safeText || typeof safeText !== 'string') return '';
    if (!isCensorshipActive) return safeText;

    let text = safeText;

    // 1. Сначала обрабатываем токсичные фразы из нескольких слов
    for (const phraseRegex of this.toxicPhraseRegexes) {
      phraseRegex.lastIndex = 0;
      text = text.replace(phraseRegex, (match) => {
        return `<span class="censored-word" onclick="this.classList.toggle('revealed')" title="Цензура. Кликните, чтобы показать/скрыть">${match}</span>`;
      });
    }

    // 2. Обработка отдельных слов и токенов (не затрагивая уже созданные span блоки)
    const parts = text.split(/(<span class="censored-word"[^>]*>.*?<\/span>)/gs);
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith('<span class="censored-word"')) continue;

      parts[i] = parts[i].replace(/[^\s.,!?:;"'()<>«»[\]{}]+/g, (rawWord) => {
        const cleanWord = rawWord.replace(/^[^\wа-яА-ЯёЁ]+|[^\wа-яА-ЯёЁ]+$/g, '');
        if (!cleanWord) return rawWord;

        const lowerWord = cleanWord.toLowerCase();
        if (this.profanityWhitelist.has(lowerWord)) return rawWord;

        let normLeet = '';
        for (const ch of lowerWord) {
          normLeet += this.leetspeakMap[ch] || ch;
        }

        if (this.profanityWhitelist.has(normLeet)) return rawWord;

        let isBad = false;
        for (const rootRegex of this.profanityWordRoots) {
          if (rootRegex.test(normLeet) || rootRegex.test(lowerWord)) {
            isBad = true;
            break;
          }
        }

        if (isBad) {
          // Заворачиваем ВСЁ слово целиком, чтобы ни одна буква префикса не торчала наружу
          return `<span class="censored-word" onclick="this.classList.toggle('revealed')" title="Цензура. Кликните, чтобы показать/скрыть">${rawWord}</span>`;
        }
        return rawWord;
      });
    }

    return parts.join('');
  },

  /**
   * Проверка валидности имени пользователя (Anti-Bot Pattern)
   */
  isValidUsername(username) {
    if (!username || typeof username !== 'string') return false;
    const u = username.trim();
    // От 2 до 24 символов, любые буквы, цифры, дефис, подчеркивание, пробел
    const regex = /^[a-zA-Zа-яА-ЯёЁ0-9_\-\s]{2,24}$/;
    return regex.test(u);
  }
};

// Экспорт для глобального доступа
if (typeof window !== 'undefined') {
  window.SecurityShield = SecurityShield;
}
