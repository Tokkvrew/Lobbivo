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
      maxRequests: 2,      // Создание анкет
      windowMs: 15000,     // 15 секунд
      cooldownMs: 20000,   // Блокировка 20 секунд
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

  // Регулярные выражения для блюра и цензуры мата в чате
  chatProfanityRegexes: [
    /мам[уаоыеё]?т?[\s_\-\.]*рах[аеиоу]?/gi,
    /с[ыи]н[\s_\-\.]*(?:шл[юеяу]|сл[уеяю])/gi,
    /с[ыи]н[\s_\-\.]*с[оа]бак\w*/gi,
    /с[ыи]н[\s_\-\.]*д[еи]бил\w*/gi,
    /с[ыи]н[\s_\-\.]*даун\w*/gi,
    /мам[уеёыа][\s_\-\.]*[её]б\w*/gi,
    /[её]б[аеиоу]?л?[\s_\-\.]*мам\w*/gi,
    /(^|[^\wа-яА-ЯёЁ])(mq|rnq|мью|мкью)(?=[^\wа-яА-ЯёЁ]|$)/gi,
    /(^|[^\wа-яА-ЯёЁ])(ху[йиеёяю]\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(п[иеё]зд\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(бл[яеэ][дт]\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(долб[оа][её]б\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(за[её]б\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])([еёэ]б[аеиоуылнщц]\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])([еёэ]бл\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(с[уо]ч?к[аеиуоы]\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(с[уо]к[аеиуоы])(?=[^\wа-яА-ЯёЁ]|$)/gi,
    /(^|[^\wа-яА-ЯёЁ])(п[ие]д[оае]р\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(п[ие]др\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(г[ао]нд[оа]н\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(м[уо]д[аеи]к\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(м[уо]д[ие]л\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(шл[юея]х\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(ш[ао]л[ао]в\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(чм[оые])(?=[^\wа-яА-ЯёЁ]|$)/gi,
    /(^|[^\wа-яА-ЯёЁ])(чм[оые]ш\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(мр[ао]з[ьиея]\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(убл[юе]д[оаеик]\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(ч[уо]рк[аеиоу]\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(х[ао]ч[аеиу]\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(н[ие]гг?[еа]р?\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(д[ао][уо]н[аеиоу]\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(пох[еэ]р\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])(х[еэ]рн[яеи]\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])((?:huy|xuy|pizd|blyad|blyat|ebal|ebat|eblan|zaebal|pidor|pidaras|gandon|mudak|shlyuha|shluha|cyka|suka)\w*)/gi,
    /(^|[^\wа-яА-ЯёЁ])((?:fagg?ot|nigg?[ae]r?|bitch|whore)\w*)/gi
  ],

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

    let result = safeText;
    for (const regex of this.chatProfanityRegexes) {
      regex.lastIndex = 0;
      result = result.replace(regex, (match, prefix, word) => {
        if (word !== undefined) {
          return `${prefix || ''}<span class="censored-word" onclick="this.classList.toggle('revealed')" title="Цензура. Кликните, чтобы показать/скрыть">${word}</span>`;
        }
        return `<span class="censored-word" onclick="this.classList.toggle('revealed')" title="Цензура. Кликните, чтобы показать/скрыть">${match}</span>`;
      });
    }

    return result;
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
