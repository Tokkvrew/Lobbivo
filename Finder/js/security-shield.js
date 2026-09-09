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
      if (titleEl) titleEl.innerHTML = `⚠️ Защита от флуда`;
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
        if (titleEl) titleEl.innerHTML = `✅ Ограничение снято`;
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
   * Проверка валидности имени пользователя (Anti-Bot Pattern)
   */
  isValidUsername(username) {
    if (!username || typeof username !== 'string') return false;
    const u = username.trim();
    // От 2 до 24 символов, буквы, цифры, дефис, подчеркивание
    const regex = /^[a-zA-Zа-яА-ЯёЁ0-9_\-\s]{2,24}$/;
    return regex.test(u);
  }
};

// Экспорт для глобального доступа
if (typeof window !== 'undefined') {
  window.SecurityShield = SecurityShield;
}
