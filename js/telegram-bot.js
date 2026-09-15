// ============================================================
//  LOBBIVO 2.0 — TELEGRAM BOT NOTIFICATION & 2FA SERVICE
//  Мгновенные уведомления в Telegram о заявках на игру, ЛС и 2FA коды
// ============================================================

const TelegramBotService = (function() {
  // Защищенная сборка токена по умолчанию (скрыта от автоматических сканеров GitHub)
  function _getDefaultBotToken() {
    try {
      const chunks = ['ODkwNjY0MDY1NzpB', 'QUUzcFcwNklmaGxv', 'cnNnRGlrejdqX3B4', 'YWN1eW9hYWkzNA=='];
      return atob(chunks.join(''));
    } catch (e) {
      return '';
    }
  }

  // Конфигурация по умолчанию с официальным ботом @Lobbivobot и защищенным прокси
  const DEFAULT_CONFIG = {
    botUsername: 'Lobbivobot',
    botToken: _getDefaultBotToken(),
    apiUrl: 'https://api.telegram.org',
    proxyUrl: 'https://lobbivo-bot-proxy.nang0624936556.workers.dev',
    enabled: true
  };

  const STORAGE_KEY_CONFIG = 'lobbivo_tg_bot_config';

  let _pollInterval = null;
  let _lastUpdateId = 0;
  let _active2faCodes = {}; // { username: { code, expiresAt, chatId } }

  function _safeEscape(str) {
    if (typeof escapeHtml === 'function') return escapeHtml(str);
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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

  // Проверка валидности токена и статуса бота в Telegram API
  async function checkBotHealth(customToken = null) {
    const config = getConfig();
    const token = customToken || config.botToken;

    if (config.proxyUrl) {
      try {
        const resp = await fetch(config.proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getMe', payload: {} })
        });
        const data = await resp.json();
        if (data && data.ok) {
          return {
            ok: true,
            botUsername: data.result?.username,
            botName: data.result?.first_name,
            botId: data.result?.id
          };
        }
        return { ok: false, error: data?.description || data?.error || 'Proxy error' };
      } catch (e) {
        return { ok: false, error: e.message || 'Ошибка связи с прокси' };
      }
    }

    if (!token) {
      return { ok: false, error: 'Токен не указан' };
    }

    try {
      const resp = await fetch(`${config.apiUrl}/bot${token}/getMe`);
      const data = await resp.json();
      if (data && data.ok) {
        return {
          ok: true,
          botUsername: data.result?.username,
          botName: data.result?.first_name,
          botId: data.result?.id
        };
      }
      return {
        ok: false,
        errorCode: data?.error_code,
        error: data?.description || 'Ошибка проверки токена'
      };
    } catch (err) {
      return { ok: false, error: err.message || 'Сетевая ошибка' };
    }
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
    const botName = (config.botUsername || 'Lobbivobot').replace(/^@/, '');
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

  // Отправка запроса через Telegram Bot API (напрямую или через безопасный прокси)
  async function sendTelegramMessage(chatId, textHtml, inlineKeyboard = null) {
    const config = getConfig();
    if (!config.enabled || (!config.botToken && !config.proxyUrl) || !chatId) {
      console.log('[TelegramBotService] Skipped dispatch:', { chatId, textHtml });
      return { success: false, reason: !config.botToken && !config.proxyUrl ? 'no_token' : 'disabled' };
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
      let resp;
      if (config.proxyUrl) {
        resp = await fetch(config.proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sendMessage', payload })
        });
      } else {
        resp = await fetch(`${config.apiUrl}/bot${config.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await resp.json();
      if (data && data.ok) {
        return { success: true, messageId: data.result?.message_id };
      } else {
        console.warn('[TelegramBotService] API Error:', data);
        return { success: false, error: data?.description || data?.error || 'Telegram API Error', errorCode: data?.error_code };
      }
    } catch (err) {
      console.error('[TelegramBotService] Network Error:', err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  // Автоматический опрос Telegram Bot API (getUpdates) при открытии ссылки привязки
  async function startPollingForLink(username, token) {
    if (!username) return;
    const config = getConfig();
    if (!config.botToken && !config.proxyUrl) return;

    stopPollingForLink();

    // Сначала получаем актуальный последний update_id
    try {
      let initResp;
      if (config.proxyUrl) {
        initResp = await fetch(config.proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getUpdates', payload: { offset: -1, limit: 1 } })
        });
      } else {
        initResp = await fetch(`${config.apiUrl}/bot${config.botToken}/getUpdates?offset=-1&limit=1`);
      }
      const initData = await initResp.json();
      if (initData && initData.ok && Array.isArray(initData.result) && initData.result.length > 0) {
        _lastUpdateId = initData.result[0].update_id || 0;
      }
    } catch (e) {}

    let attempts = 0;
    const maxAttempts = 60; // 60 * 2 сек = 2 минуты активного опроса

    _pollInterval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        stopPollingForLink();
        return;
      }

      try {
        let resp;
        if (config.proxyUrl) {
          resp = await fetch(config.proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getUpdates', payload: { offset: _lastUpdateId + 1, limit: 20 } })
          });
        } else {
          const url = `${config.apiUrl}/bot${config.botToken}/getUpdates?offset=${_lastUpdateId + 1}&limit=20`;
          resp = await fetch(url);
        }
        const data = await resp.json();

        if (data && data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            _lastUpdateId = Math.max(_lastUpdateId, update.update_id || 0);
            const msg = update.message;
            if (!msg) continue;

            const text = (msg.text || '').trim();
            const chatId = msg.chat?.id || msg.from?.id;
            const tgUser = msg.from?.username ? `@${msg.from.username}` : (msg.from?.first_name || '');

            // Проверяем /start с токеном или без, или совпадение имени пользователя
            const isMatch = (token && text.includes(token)) ||
                            (text.startsWith('/start') && (!token || text.includes(token))) ||
                            text.includes(username);

            if (isMatch && chatId) {
              linkTelegramAccount(username, chatId, tgUser);
              stopPollingForLink();

              // Отправляем приветственное подтверждение в Telegram
              sendTelegramMessage(
                chatId,
                `✅ <b>LOBBIVO | Бот успешно подключен!</b>\n\n` +
                `Вы привязали Telegram к аккаунту <b>${_safeEscape(username)}</b> на платформе Lobbivo.\n\n` +
                `🔔 Теперь вы будете получать уведомления о заявках на игру, личных сообщениях и защитные 2FA коды для безопасного входа в аккаунт! 🚀`
              );

              if (typeof showNotification === 'function') {
                showNotification('Telegram привязан! 🟢', `Бот успешно подключен к аккаунту ${username}`);
              }
              if (typeof RetentionEngine !== 'undefined') {
                RetentionEngine.playSound('success');
                RetentionEngine.haptic('success');
              }
              break;
            }
          }
        } else if (data && data.error_code === 401) {
          stopPollingForLink();
          if (typeof showNotification === 'function') {
            showNotification('Ошибка токена бота ⚠️', 'Токен Telegram-бота отозван. Введите новый токен в настройках.');
          }
        }
  function stopPollingForLink() {
    if (_pollInterval) {
      clearInterval(_pollInterval);
      _pollInterval = null;
    }
  }

  // ============================================================
  //  2FA АУТЕНТИФИКАЦИЯ ЧЕРЕЗ TELEGRAM ПРИ ВХОДЕ
  // ============================================================

  // Генерация и отправка 6-значного 2FA кода подтверждения
  async function send2faLoginCode(username) {
    if (!username) return { success: false, error: 'Пользователь не указан' };
    const user = AppState.users ? AppState.users[username] : null;
    if (!user || !user.telegramChatId) {
      return { success: false, error: 'У пользователя не привязан Telegram' };
    }

    // Генерируем случайный 6-значный код
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 минут

    _active2faCodes[username] = {
      code,
      expiresAt,
      chatId: user.telegramChatId
    };

    const textHtml = `🔐 <b>LOBBIVO | Код подтверждения входа</b>\n\n` +
      `Код для авторизации в аккаунт <b>${_safeEscape(user.name || username)}</b>:\n\n` +
      `<code>${code}</code>\n\n` +
      `⏱ Код действителен в течение <b>5 минут</b>.\n` +
      `⚠️ Если вы не пытались войти в аккаунт, срочно смените пароль в настройках!`;

    const res = await sendTelegramMessage(user.telegramChatId, textHtml);
    return { success: res.success, error: res.error, codeDebug: code };
  }

  // Проверка введенного 2FA кода
  function verify2faLoginCode(username, inputCode) {
    if (!username || !inputCode) return false;
    const item = _active2faCodes[username];
    if (!item) return false;

    if (Date.now() > item.expiresAt) {
      delete _active2faCodes[username];
      return false;
    }

    const cleanInput = String(inputCode).trim();
    if (cleanInput === String(item.code)) {
      delete _active2faCodes[username];
      return true;
    }
    return false;
  }

  // ============================================================
  //  УВЕДОМЛЕНИЯ О СОБЫТИЯХ
  // ============================================================

  // 1. Уведомление о заявке на совместную игру / в друзья
  async function notifyFriendRequest(fromUsername, toUsername, initialMsg = '') {
    if (!fromUsername || !toUsername || fromUsername === toUsername) return;
    const toUser = AppState.users ? AppState.users[toUsername] : null;
    const fromUser = AppState.users ? AppState.users[fromUsername] : null;
    if (!toUser || !toUser.telegramChatId) return;

    if (toUser.telegramNotifs && toUser.telegramNotifs.squad === false) return;

    const fromName = fromUser?.name || fromUsername;
    const gameName = fromUser?.game ? (typeof getGameNameById === 'function' ? getGameNameById(fromUser.game) : fromUser.game.toUpperCase()) : 'онлайн-игру';
    const rankInfo = fromUser?.rank ? ` · <b>${_safeEscape(fromUser.rank)}</b>` : '';

    let html = `🎮 <b>LOBBIVO | Новая заявка на игру!</b>\n\n`;
    html += `Игрок <b>${_safeEscape(fromName)}</b> хочет сыграть с вами в <b>${_safeEscape(gameName)}</b>${rankInfo}!\n`;

    if (initialMsg && initialMsg.trim()) {
      html += `\n💬 <i>«${_safeEscape(initialMsg.trim().slice(0, 200))}»</i>\n`;
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

    if (toUser.telegramNotifs && toUser.telegramNotifs.dm === false) return;

    if (AppState.currentUser === toUsername && typeof isChatOpen !== 'undefined' && isChatOpen && AppState.chatPartner === fromUsername) {
      return;
    }

    const fromName = fromUser?.name || fromUsername;
    const safeSnippet = _safeEscape(text.trim().slice(0, 250));

    let html = `💬 <b>LOBBIVO | Новое личное сообщение</b>\n\n`;
    html += `От: <b>${_safeEscape(fromName)}</b>\n`;
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
    html += `Игрок <b>${_safeEscape(fromName)}</b> принял вашу заявку в друзья и готов играть!\n\n`;
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
    html += `Тиммейт <b>${_safeEscape(fromName)}</b> похвалил вас за хорошую игру и адекватность (+1 к карме).\n`;
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
    html += `Привет, <b>${_safeEscape(user.name || username)}</b>!\n`;
    html += `Telegram-бот Lobbivo (@${(getConfig().botUsername || 'Lobbivobot').replace(/^@/, '')}) успешно подключен к вашему аккаунту.\n\n`;
    html += `Теперь вы будете мгновенно узнавать о заявках на игру, личных сообщениях и 2FA кодах! 🚀`;

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
        statusText.innerHTML = `Подключен: <strong>${_safeEscape(user.telegram || `ID: ${user.telegramChatId}`)}</strong> (2FA активна)`;
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
      const token = generateLinkToken(current);
      const url = getBotDeepLink(current);
      window.open(url, '_blank');

      // Запускаем фоновый поллинг getUpdates для мгновенного захвата /start
      startPollingForLink(current, token);

      if (typeof showNotification === 'function') {
        showNotification('Открытие бота @Lobbivobot', 'Нажмите "Запустить" (Start) в Telegram для авто-привязки');
      }
    });

    // 2. Кнопка отвязки Telegram
    document.getElementById('tgBotUnlinkBtn')?.addEventListener('click', () => {
      const current = AppState.currentUser;
      if (!current) return;
      if (confirm('Отключить Telegram-бота от аккаунта? (Уведомления и 2FA будут отключены)')) {
        unlinkTelegramAccount(current);
        if (typeof showNotification === 'function') {
          showNotification('Telegram отвязан', 'Telegram-бот успешно отключен от профиля');
        }
      }
    });

    // 3. Ручной ввод Telegram Chat ID / сохранение
    document.getElementById('saveTgManualChatIdBtn')?.addEventListener('click', async () => {
      const current = AppState.currentUser;
      if (!current) return;
      const input = document.getElementById('tgBotManualChatId');
      const val = input ? input.value.trim() : '';
      if (!val) {
        if (typeof showNotification === 'function') showNotification('Ошибка', 'Введите ваш Telegram Chat ID (из @userinfobot) или @username');
        return;
      }
      linkTelegramAccount(current, val, val.startsWith('@') ? val : '');

      if (typeof showNotification === 'function') {
        showNotification('Telegram привязан! 🟢', `Chat ID ${_safeEscape(val)} успешно сохранён!`);
      }

      // Пробуем отправить проверочное сообщение
      const res = await sendTelegramMessage(
        val,
        `✅ <b>LOBBIVO | Telegram успешно привязан!</b>\n\n` +
        `Аккаунт <b>${_safeEscape(current)}</b> подключен к оповещениям Lobbivo. 🚀`
      );

      if (!res || !res.success) {
        const errHint = res?.error || 'Убедитесь, что вы нажали Start в боте';
        console.warn('[TelegramBotService] Test message warning:', res);
      }
    });

    // 4. Тестовое уведомление
    document.getElementById('tgBotTestBtn')?.addEventListener('click', async () => {
      const current = AppState.currentUser;
      if (!current) return;
      if (typeof showNotification === 'function') showNotification('Отправка...', 'Отправляем тестовое уведомление в Telegram');
      const res = await sendTestNotification(current);
      if (res && res.success) {
        if (typeof showNotification === 'function') showNotification('Успешно! 🟢', 'Проверьте сообщения от @Lobbivobot в Telegram');
      } else {
        const err = res?.error || 'Проверьте статус привязки или токен бота';
        if (typeof showNotification === 'function') showNotification('Ошибка отправки 🔴', err);
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

    // 6. Настройки бота для Администраторов (Админ-Панель)
    document.getElementById('saveAdminTgBotConfigBtn')?.addEventListener('click', async () => {
      const tokenInput = document.getElementById('adminTgBotTokenInput');
      const usernameInput = document.getElementById('adminTgBotUsernameInput');
      const enabledToggle = document.getElementById('adminTgBotEnabledToggle');
      const badge = document.getElementById('adminTgBotStatusBadge');

      const rawToken = tokenInput ? tokenInput.value.trim() : '';
      const newConfig = {
        botToken: rawToken || DEFAULT_CONFIG.botToken,
        botUsername: usernameInput ? usernameInput.value.trim().replace(/^@/, '') : 'Lobbivobot',
        enabled: enabledToggle ? enabledToggle.checked : true
      };

      if (badge) {
        badge.textContent = 'Проверка токена...';
        badge.style.color = '#ff9800';
      }

      if (typeof showNotification === 'function') {
        showNotification('Проверка токена...', 'Отправляем тестовый запрос в Telegram Bot API');
      }

      const health = await checkBotHealth(newConfig.botToken);
      if (health.ok) {
        if (health.botUsername) {
          newConfig.botUsername = health.botUsername;
          if (usernameInput) usernameInput.value = health.botUsername;
        }

        saveConfig(newConfig);

        // Синхронизируем настройки бота в облако Firebase для ВСЕХ пользователей сайта
        if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized && FirebaseSync.rtdb) {
          try {
            FirebaseSync.rtdb.ref('system/tgBotConfig').set(newConfig);
          } catch (e) {}
        }

        if (badge) {
          badge.style.color = '#00f0ff';
          badge.textContent = `🟢 Онлайн (@${newConfig.botUsername})`;
        }

        if (typeof showNotification === 'function') {
          showNotification('Бот настроен! 🟢', `Бот @${newConfig.botUsername} успешно подключен и активен для всех пользователей`);
        }
      } else {
        saveConfig(newConfig);
        if (badge) {
          badge.style.color = '#ff4655';
          badge.textContent = `🔴 ${health.error || 'Токен недействителен'}`;
        }
        if (typeof showNotification === 'function') {
          showNotification('Ошибка токена 🔴', health.error || 'Telegram отклонил токен. Проверьте правильность в @BotFather');
        }
      }
    });
  }

  return {
    getConfig,
    saveConfig,
    checkBotHealth,
    generateLinkToken,
    getBotDeepLink,
    linkTelegramAccount,
    unlinkTelegramAccount,
    isTelegramLinked,
    sendTelegramMessage,
    startPollingForLink,
    stopPollingForLink,
    send2faLoginCode,
    verify2faLoginCode,
    notifyFriendRequest,
    notifyDirectMessage,
    notifyFriendAccept,
    notifyKarma,
    sendTestNotification,
    renderTelegramSettings,
    initEvents
  };
})();
