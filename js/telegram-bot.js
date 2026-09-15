// ============================================================
//  LOBBIVO 2.0 — TELEGRAM BOT NOTIFICATION SERVICE
//  Мгновенные уведомления в Telegram о заявках на игру и ЛС
// ============================================================

const TelegramBotService = (function() {
  // Конфигурация по умолчанию (может быть переопределена через Админ-панель или localStorage)
  const DEFAULT_CONFIG = {
    botUsername: 'LobbivoBot',
    botToken: '', // Вводится администратором в настройках платформы
    apiUrl: 'https://api.telegram.org',
    enabled: true
  };

  const STORAGE_KEY_CONFIG = 'lobbivo_tg_bot_config';

  function getConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        return Object.assign({}, DEFAULT_CONFIG, JSON.parse(saved));
      }
    } catch (e) {}
    return Object.assign({}, DEFAULT_CONFIG);
  }

  function saveConfig(newConfig) {
    const current = getConfig();
    const merged = Object.assign({}, current, newConfig);
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(merged));
    } catch (e) {}
    return merged;
  }

  // Генерация уникального токена привязки аккаунта к Telegram боту
  function generateLinkToken(username) {
    if (!username) return null;
    const user = AppState.users ? AppState.users[username] : null;
    if (!user) return null;

    if (!user.tgLinkToken) {
      user.tgLinkToken = 'link_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      if (typeof saveUsers === 'function') saveUsers(username, true);
    }
    return user.tgLinkToken;
  }

  // Получить прямую ссылку на бота для привязки в 1 клик
  function getBotDeepLink(username) {
    const config = getConfig();
    const token = generateLinkToken(username);
    const botName = (config.botUsername || 'LobbivoBot').replace(/^@/, '');
    return `https://t.me/${botName}?start=${encodeURIComponent(token || username)}`;
  }

  // Привязать Telegram Chat ID к аккаунту Lobbivo
  function linkTelegramAccount(username, chatId, tgUsername = '') {
    if (!username || !chatId) return false;
    const user = AppState.users ? AppState.users[username] : null;
    if (!user) return false;

    user.telegramChatId = String(chatId).trim();
    if (tgUsername) {
      user.telegram = tgUsername.startsWith('@') ? tgUsername : `@${tgUsername}`;
    }
    if (!user.telegramNotifs) {
      user.telegramNotifs = { dm: true, squad: true, karma: true };
    }

    if (typeof saveUsers === 'function') saveUsers(username, true);
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
      FirebaseSync.saveUser(username, true);
    }

    renderTelegramSettings();
    return true;
  }

  // Отвязать Telegram-бота
  function unlinkTelegramAccount(username) {
    if (!username) return false;
    const user = AppState.users ? AppState.users[username] : null;
    if (!user) return false;

    delete user.telegramChatId;
    delete user.tgLinkToken;

    if (typeof saveUsers === 'function') saveUsers(username, true);
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
      FirebaseSync.saveUser(username, true);
    }

    renderTelegramSettings();
    return true;
  }

  // Проверка статуса подключения Telegram у пользователя
  function isTelegramLinked(username) {
    if (!username || !AppState.users || !AppState.users[username]) return false;
    return !!AppState.users[username].telegramChatId;
  }

  // Отправка запроса через Telegram Bot API
  async function sendTelegramMessage(chatId, textHtml, inlineKeyboard = null) {
    const config = getConfig();
    if (!config.enabled || !config.botToken || !chatId) {
      console.log('[TelegramBotService] Simulation / Skipped dispatch:', { chatId, textHtml });
      return { success: false, reason: !config.botToken ? 'no_token' : 'disabled' };
    }

    const payload = {
      chat_id: chatId,
      text: textHtml,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    };

    if (inlineKeyboard && Array.isArray(inlineKeyboard) && inlineKeyboard.length > 0) {
      payload.reply_markup = {
        inline_keyboard: inlineKeyboard
      };
    }

    try {
      const resp = await fetch(`${config.apiUrl}/bot${config.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await resp.json();
      if (data && data.ok) {
        return { success: true, messageId: data.result?.message_id };
      } else {
        console.warn('[TelegramBotService] API Error:', data);
        return { success: false, error: data?.description || 'Telegram API Error' };
      }
    } catch (err) {
      console.error('[TelegramBotService] Network Error:', err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  // 1. Уведомление о заявке на совместную игру / в друзья
  async function notifyFriendRequest(fromUsername, toUsername, initialMsg = '') {
    if (!fromUsername || !toUsername || fromUsername === toUsername) return;
    const toUser = AppState.users ? AppState.users[toUsername] : null;
    const fromUser = AppState.users ? AppState.users[fromUsername] : null;
    if (!toUser || !toUser.telegramChatId) return;

    // Проверяем настройки уведомлений получателя
    if (toUser.telegramNotifs && toUser.telegramNotifs.squad === false) return;

    const fromName = fromUser?.name || fromUsername;
    const gameName = fromUser?.game ? (typeof getGameNameById === 'function' ? getGameNameById(fromUser.game) : fromUser.game.toUpperCase()) : 'онлайн-игру';
    const rankInfo = fromUser?.rank ? ` · <b>${escapeHtml(fromUser.rank)}</b>` : '';

    let html = `🎮 <b>LOBBIVO | Новая заявка на игру!</b>\n\n`;
    html += `Игрок <b>${escapeHtml(fromName)}</b> хочет сыграть с вами в <b>${escapeHtml(gameName)}</b>${rankInfo}!\n`;

    if (initialMsg && initialMsg.trim()) {
      html += `\n💬 <i>«${escapeHtml(initialMsg.trim().slice(0, 200))}»</i>\n`;
    }

    html += `\n⚡ <i>Откройте платформу Lobbivo, чтобы принять заявку и начать игру:</i>`;

    const appUrl = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : 'https://lobbivo.ru';
    const inlineKeyboard = [
      [
        { text: '💬 Открыть диалог в Lobbivo', url: `${appUrl}/?chat=${encodeURIComponent(fromUsername)}` }
      ]
    ];

    return await sendTelegramMessage(toUser.telegramChatId, html, inlineKeyboard);
  }

  // 2. Уведомление о новом личном сообщении
  async function notifyDirectMessage(fromUsername, toUsername, text = '') {
    if (!fromUsername || !toUsername || fromUsername === toUsername) return;
    const toUser = AppState.users ? AppState.users[toUsername] : null;
    const fromUser = AppState.users ? AppState.users[fromUsername] : null;
    if (!toUser || !toUser.telegramChatId) return;

    // Проверяем настройки уведомлений получателя
    if (toUser.telegramNotifs && toUser.telegramNotifs.dm === false) return;

    // Не спамим, если получатель прямо сейчас в сети и держит открытым чат с отправителем
    if (AppState.currentUser === toUsername && isChatOpen && AppState.chatPartner === fromUsername) {
      return;
    }

    const fromName = fromUser?.name || fromUsername;
    const safeSnippet = escapeHtml(text.trim().slice(0, 250));

    let html = `💬 <b>LOBBIVO | Новое личное сообщение</b>\n\n`;
    html += `От: <b>${escapeHtml(fromName)}</b>\n`;
    html += `<i>«${safeSnippet}»</i>\n\n`;
    html += `⚡ <i>Нажмите кнопку ниже, чтобы ответить:</i>`;

    const appUrl = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : 'https://lobbivo.ru';
    const inlineKeyboard = [
      [
        { text: '✉️ Ответить в Lobbivo', url: `${appUrl}/?chat=${encodeURIComponent(fromUsername)}` }
      ]
    ];

    return await sendTelegramMessage(toUser.telegramChatId, html, inlineKeyboard);
  }

  // 3. Уведомление о принятии заявки в друзья
  async function notifyFriendAccept(fromUsername, toUsername) {
    if (!fromUsername || !toUsername || fromUsername === toUsername) return;
    const toUser = AppState.users ? AppState.users[toUsername] : null;
    const fromUser = AppState.users ? AppState.users[fromUsername] : null;
    if (!toUser || !toUser.telegramChatId) return;

    if (toUser.telegramNotifs && toUser.telegramNotifs.squad === false) return;

    const fromName = fromUser?.name || fromUsername;
    let html = `🤝 <b>LOBBIVO | Заявка в команду принята!</b>\n\n`;
    html += `Игрок <b>${escapeHtml(fromName)}</b> принял вашу заявку в друзья и готов играть!\n\n`;
    html += `🎯 <i>Договоритесь о времени матча или перейдите в войс-чат.</i>`;

    const appUrl = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : 'https://lobbivo.ru';
    const inlineKeyboard = [
      [
        { text: '🚀 Перейти к чату', url: `${appUrl}/?chat=${encodeURIComponent(fromUsername)}` }
      ]
    ];

    return await sendTelegramMessage(toUser.telegramChatId, html, inlineKeyboard);
  }

  // 4. Уведомление о похвале / карме (+1)
  async function notifyKarma(fromUsername, toUsername) {
    if (!fromUsername || !toUsername || fromUsername === toUsername) return;
    const toUser = AppState.users ? AppState.users[toUsername] : null;
    const fromUser = AppState.users ? AppState.users[fromUsername] : null;
    if (!toUser || !toUser.telegramChatId) return;

    if (toUser.telegramNotifs && toUser.telegramNotifs.karma === false) return;

    const fromName = fromUser?.name || fromUsername;
    const totalKarma = toUser.karma || 1;

    let html = `🏆 <b>LOBBIVO | Вам повысили репутацию!</b>\n\n`;
    html += `Тиммейт <b>${escapeHtml(fromName)}</b> похвалил вас за хорошую игру и адекватность (+1 к карме).\n`;
    html += `Ваша общая репутация: <b>${totalKarma} 👍</b>\n`;

    const appUrl = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : 'https://lobbivo.ru';
    const inlineKeyboard = [
      [
        { text: '⭐ Открыть мой профиль', url: `${appUrl}/` }
      ]
    ];

    return await sendTelegramMessage(toUser.telegramChatId, html, inlineKeyboard);
  }

  // 5. Тестовое уведомление
  async function sendTestNotification(username) {
    if (!username) return { success: false, error: 'Пользователь не найден' };
    const user = AppState.users ? AppState.users[username] : null;
    if (!user || !user.telegramChatId) {
      return { success: false, error: 'Сначала привяжите Telegram-бота к вашему профилю' };
    }

    let html = `🔔 <b>LOBBIVO | Тестовое уведомление</b>\n\n`;
    html += `Привет, <b>${escapeHtml(user.name || username)}</b>!\n`;
    html += `Telegram-бот Lobbivo успешно подключен к вашему аккаунту.\n\n`;
    html += `Теперь вы будете мгновенно узнавать, когда вам пишут тиммейты или кидают заявки на игру! 🚀`;

    const appUrl = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : 'https://lobbivo.ru';
    const inlineKeyboard = [
      [
        { text: '🎮 Открыть Lobbivo', url: `${appUrl}/` }
      ]
    ];

    return await sendTelegramMessage(user.telegramChatId, html, inlineKeyboard);
  }

  // Отрисовка UI настроек Telegram-бота в профиле
  function renderTelegramSettings() {
    const current = AppState.currentUser;
    if (!current || !AppState.users) return;
    const user = AppState.users[current];
    if (!user) return;

    const isLinked = !!user.telegramChatId;
    const statusDot = document.getElementById('tgBotStatusDot');
    const statusText = document.getElementById('tgBotStatusText');
    const linkBtn = document.getElementById('tgBotLinkBtn');
    const unlinkBtn = document.getElementById('tgBotUnlinkBtn');
    const testBtn = document.getElementById('tgBotTestBtn');
    const codeSpan = document.getElementById('tgBotLinkCode');
    const directChatIdInput = document.getElementById('tgBotManualChatId');

    const toggleDm = document.getElementById('tgNotifDmToggle');
    const toggleSquad = document.getElementById('tgNotifSquadToggle');
    const toggleKarma = document.getElementById('tgNotifKarmaToggle');

    const notifs = user.telegramNotifs || { dm: true, squad: true, karma: true };
    if (toggleDm) toggleDm.checked = notifs.dm !== false;
    if (toggleSquad) toggleSquad.checked = notifs.squad !== false;
    if (toggleKarma) toggleKarma.checked = notifs.karma !== false;

    const token = generateLinkToken(current);
    if (codeSpan) codeSpan.textContent = token || '---';

    if (isLinked) {
      if (statusDot) {
        statusDot.className = 'tg-status-dot online';
      }
      if (statusText) {
        statusText.innerHTML = `Подключен: <strong>${escapeHtml(user.telegram || `ID: ${user.telegramChatId}`)}</strong>`;
      }
      if (linkBtn) linkBtn.style.display = 'none';
      if (unlinkBtn) unlinkBtn.style.display = 'inline-flex';
      if (testBtn) testBtn.style.display = 'inline-flex';
      if (directChatIdInput) directChatIdInput.value = user.telegramChatId;
    } else {
      if (statusDot) {
        statusDot.className = 'tg-status-dot offline';
      }
      if (statusText) {
        statusText.innerHTML = `Бот не привязан. Нажмите кнопку для подключения`;
      }
      if (linkBtn) linkBtn.style.display = 'inline-flex';
      if (unlinkBtn) unlinkBtn.style.display = 'none';
      if (testBtn) testBtn.style.display = 'none';
      if (directChatIdInput) directChatIdInput.value = '';
    }
  }

  // Привязка слушателей событий для UI настроек Telegram-бота
  function initEvents() {
    // 1. Кнопка привязки через Telegram бота
    document.getElementById('tgBotLinkBtn')?.addEventListener('click', () => {
      const current = AppState.currentUser;
      if (!current) {
        if (typeof showNotification === 'function') showNotification('Требуется авторизация', 'Войдите в профиль');
        return;
      }
      const url = getBotDeepLink(current);
      window.open(url, '_blank');
      if (typeof showNotification === 'function') {
        showNotification('Открытие бота', 'Нажмите "Запустить" (Start) в открывшемся боте Telegram');
      }
    });

    // 2. Кнопка отвязки
    document.getElementById('tgBotUnlinkBtn')?.addEventListener('click', () => {
      const current = AppState.currentUser;
      if (!current) return;
      if (confirm('Отключить получение уведомлений в Telegram?')) {
        unlinkTelegramAccount(current);
        if (typeof showNotification === 'function') {
          showNotification('Telegram отключен', 'Уведомления больше не будут приходить в Telegram');
        }
      }
    });

    // 3. Ручной ввод Telegram Chat ID / сохранение
    document.getElementById('saveTgManualChatIdBtn')?.addEventListener('click', () => {
      const current = AppState.currentUser;
      if (!current) return;
      const input = document.getElementById('tgBotManualChatId');
      const val = input ? input.value.trim() : '';
      if (!val) {
        if (typeof showNotification === 'function') showNotification('Ошибка', 'Введите ваш Telegram Chat ID или Username');
        return;
      }
      linkTelegramAccount(current, val, val.startsWith('@') ? val : '');
      if (typeof showNotification === 'function') {
        showNotification('Telegram привязан', `Chat ID ${escapeHtml(val)} успешно сохранён!`);
      }
    });

    // 4. Тестовое уведомление
    document.getElementById('tgBotTestBtn')?.addEventListener('click', async () => {
      const current = AppState.currentUser;
      if (!current) return;
      if (typeof showNotification === 'function') showNotification('Отправка...', 'Отправляем тестовое уведомление в Telegram');
      const res = await sendTestNotification(current);
      if (res && res.success) {
        if (typeof showNotification === 'function') showNotification('Успешно!', 'Проверьте сообщения от бота в Telegram');
      } else {
        const err = res?.error || 'Проверьте токен бота в админ-панели или статус привязки';
        if (typeof showNotification === 'function') showNotification('Ошибка отправки', err);
      }
    });

    // 5. Переключатели типов уведомлений
    const updateNotifSetting = (key, val) => {
      const current = AppState.currentUser;
      if (!current || !AppState.users || !AppState.users[current]) return;
      if (!AppState.users[current].telegramNotifs) {
        AppState.users[current].telegramNotifs = { dm: true, squad: true, karma: true };
      }
      AppState.users[current].telegramNotifs[key] = val;
      if (typeof saveUsers === 'function') saveUsers(current, true);
    };

    document.getElementById('tgNotifDmToggle')?.addEventListener('change', function() {
      updateNotifSetting('dm', this.checked);
    });
    document.getElementById('tgNotifSquadToggle')?.addEventListener('change', function() {
      updateNotifSetting('squad', this.checked);
    });
    document.getElementById('tgNotifKarmaToggle')?.addEventListener('change', function() {
      updateNotifSetting('karma', this.checked);
    });

    // 6. Настройки бота для Администраторов
    document.getElementById('saveAdminTgBotConfigBtn')?.addEventListener('click', () => {
      const tokenInput = document.getElementById('adminTgBotTokenInput');
      const usernameInput = document.getElementById('adminTgBotUsernameInput');
      const enabledToggle = document.getElementById('adminTgBotEnabledToggle');

      const newConfig = {
        botToken: tokenInput ? tokenInput.value.trim() : '',
        botUsername: usernameInput ? usernameInput.value.trim().replace(/^@/, '') : 'LobbivoBot',
        enabled: enabledToggle ? enabledToggle.checked : true
      };

      saveConfig(newConfig);
      if (typeof showNotification === 'function') {
        showNotification('Бот настроен', 'Конфигурация Telegram-бота успешно сохранена');
      }
    });
  }

  return {
    getConfig,
    saveConfig,
    generateLinkToken,
    getBotDeepLink,
    linkTelegramAccount,
    unlinkTelegramAccount,
    isTelegramLinked,
    sendTelegramMessage,
    notifyFriendRequest,
    notifyDirectMessage,
    notifyFriendAccept,
    notifyKarma,
    sendTestNotification,
    renderTelegramSettings,
    initEvents
  };
})();
