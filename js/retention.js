// ============================================================
//  LOBBIVO RETENTION & GROWTH ENGINE (v2.9.0)
//  Web Audio API, Karma/Reputation, Fast Match, TWA & 1-Click Connect
// ============================================================

const RetentionEngine = (function() {
  let audioCtx = null;
  let soundEnabled = localStorage.getItem('lobbivo_sound_enabled') !== 'false';

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Звуковой синтезатор (чистый Web Audio API без внешних mp3)
  function playCyberSound(type = 'message') {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);

      if (type === 'message') {
        // Мягкий футуристичный двухтональный колокольчик (520Hz -> 780Hz)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';

        osc1.frequency.setValueAtTime(520, now);
        osc1.frequency.exponentialRampToValueAtTime(780, now + 0.12);

        osc2.frequency.setValueAtTime(780, now + 0.08);
        osc2.frequency.exponentialRampToValueAtTime(1040, now + 0.25);

        gain1.gain.setValueAtTime(0.08, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        gain2.gain.setValueAtTime(0.05, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(masterGain);
        gain2.connect(masterGain);

        osc1.start(now);
        osc2.start(now + 0.08);
        osc1.stop(now + 0.36);
        osc2.stop(now + 0.41);
      } else if (type === 'karma') {
        // Гармоничный мажорный аккорд похвалы
        const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);
          gain.gain.setValueAtTime(0.06, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + idx * 0.04);
          osc.stop(now + 0.46);
        });
      } else if (type === 'click') {
        // Мягкий тактильный щелчок
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {
      // AudioContext unavailable or blocked by autoplay policy
    }
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('lobbivo_sound_enabled', soundEnabled ? 'true' : 'false');
    updateSoundUI();
    if (soundEnabled) {
      playCyberSound('click');
      showNotification('Звук включен', 'Звуковые уведомления активны');
    } else {
      showNotification('Звук выключен', 'Звуковые уведомления отключены');
    }
    return soundEnabled;
  }

  function isSoundEnabled() {
    return soundEnabled;
  }

  function updateSoundUI() {
    const soundBtns = document.querySelectorAll('.sound-toggle-btn');
    soundBtns.forEach(btn => {
      btn.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
      btn.classList.toggle('active', soundEnabled);
      const iconUse = btn.querySelector('use');
      if (iconUse) {
        iconUse.setAttribute('href', soundEnabled ? '#icon-volume-on' : '#icon-volume-off');
      }
      const label = btn.querySelector('.sound-toggle-label');
      if (label) {
        label.textContent = soundEnabled ? 'Звук вкл' : 'Без звука';
      }
    });
  }

  // ============================================================
  //  СИСТЕМА КАРМЫ И РЕПУТАЦИИ (KARMA / REPUTATION)
  // ============================================================

  function getUserKarma(username) {
    if (!username) return 0;
    const user = AppState.users[username];
    if (!user) return 0;
    return typeof user.karma === 'number' ? user.karma : 0;
  }

  function giveUserKarma(targetUsername) {
    if (!AppState.currentUser) {
      showNotification('Требуется вход', 'Войдите в аккаунт, чтобы поблагодарить тиммейта');
      showAuthModal('login');
      return;
    }

    if (AppState.currentUser === targetUsername) {
      showNotification('Внимание', 'Нельзя похвалить самого себя');
      return;
    }

    const targetUser = AppState.users[targetUsername];
    if (!targetUser) return;

    const me = AppState.users[AppState.currentUser];
    if (!me) return;

    if (!Array.isArray(me.karmaGivenTo)) {
      me.karmaGivenTo = [];
    }

    const lastGiven = me.karmaGivenTo.find(item => item && item.username === targetUsername);
    const COOLDOWN_MS = 3000;

    if (lastGiven && (Date.now() - (lastGiven.timestamp || 0) < COOLDOWN_MS)) {
      const remainingSec = Math.ceil((COOLDOWN_MS - (Date.now() - lastGiven.timestamp)) / 1000);
      showNotification('Подождите', `Следующий лайк можно поставить через ${remainingSec} сек.`);
      return;
    }

    // Увеличиваем карму
    const currentKarma = typeof targetUser.karma === 'number' ? targetUser.karma : (Number(targetUser.karma) || 0);
    targetUser.karma = currentKarma + 1;
    
    // Записываем историю
    if (lastGiven) {
      lastGiven.timestamp = Date.now();
      lastGiven.count = (lastGiven.count || 1) + 1;
    } else {
      me.karmaGivenTo.push({ username: targetUsername, timestamp: Date.now(), count: 1 });
    }

    saveUsers(AppState.currentUser, true);
    saveUsers(targetUsername, true);

    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized && FirebaseSync.rtdb) {
      try {
        FirebaseSync.rtdb.ref('users/' + targetUsername + '/karma').set(targetUser.karma).catch(() => {});
      } catch (e) {}
    }

    playCyberSound('karma');
    triggerHaptic('success');
    showNotification('Репутация повышена!', `+1 к карме игроку ${targetUsername} (Всего: ${targetUser.karma})`);

    // Мгновенное оповещение в Telegram-бот о повышении репутации
    if (typeof TelegramBotService !== 'undefined' && typeof TelegramBotService.notifyKarma === 'function') {
      TelegramBotService.notifyKarma(AppState.currentUser, targetUsername);
    }

    // Перерисовываем карточки и профиль
    if (typeof renderPlayers === 'function') {
      renderPlayers(AppState.selectedGameFilter || 'all');
    }
    if (typeof renderProfile === 'function' && AppState.currentUser && document.getElementById('pageProfile')?.classList.contains('active')) {
      renderProfile();
    }
  }

  // ============================================================
  //  СРОЧНЫЙ ПОИСК «ИЩУ ПРЯМО СЕЙЧАС» (FAST MATCH ENGINE)
  // ============================================================

  let fastMatchTimerInterval = null;

  function formatUrgentRemaining(ms) {
    if (ms <= 0) return '00:00:00';
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const pad = n => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  function formatUrgentRemainingShort(ms) {
    if (ms <= 0) return '0м';
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    if (hours > 0) return `${hours}ч ${minutes}м`;
    return `${minutes}м`;
  }

  function isSquadUrgent(squad, username) {
    const sqUrgent = squad && squad.urgentUntil && squad.urgentUntil > Date.now();
    const userUrgent = AppState.users[username] && AppState.users[username].urgentUntil && AppState.users[username].urgentUntil > Date.now();
    return Boolean(sqUrgent || userUrgent);
  }

  function getUrgentRemainingMs(squad, username) {
    const now = Date.now();
    const sqMs = (squad && squad.urgentUntil && squad.urgentUntil > now) ? (squad.urgentUntil - now) : 0;
    const userMs = (AppState.users[username] && AppState.users[username].urgentUntil && AppState.users[username].urgentUntil > now) ? (AppState.users[username].urgentUntil - now) : 0;
    return Math.max(sqMs, userMs);
  }

  function toggleMyFastMatch() {
    if (!AppState.currentUser) {
      showNotification('Требуется вход', 'Войдите в аккаунт, чтобы включить срочный поиск');
      showAuthModal('login');
      return;
    }

    const user = AppState.users[AppState.currentUser];
    if (!user) return;

    let squads = user.squads;
    if (!Array.isArray(squads)) {
      if (squads && typeof squads === 'object') {
        squads = Object.values(squads);
        user.squads = squads;
      } else {
        squads = [];
        user.squads = squads;
      }
    }

    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const isCurrentlyUrgent = Boolean(user.urgentUntil && user.urgentUntil > Date.now());

    // Если у пользователя пока нет ни одной анкеты, открываем модалку создания
    if (squads.length === 0) {
      user.urgentUntil = Date.now() + TWO_HOURS;
      saveUsers(AppState.currentUser, true);
      updateFastMatchUI();
      showNotification('Создайте анкету', 'Срочный сбор активен! Создайте вашу первую анкету, и она сразу появится в топе с пульсацией.');
      if (typeof openCreateSquadModal === 'function') {
        openCreateSquadModal();
      }
      return;
    }

    if (isCurrentlyUrgent) {
      user.urgentUntil = 0;
      squads.forEach(s => { if (s) s.urgentUntil = 0; });
      showNotification('Срочный поиск отключен', 'Ваш статус переведен в обычный режим');
    } else {
      const urgentUntilTime = Date.now() + TWO_HOURS;
      user.urgentUntil = urgentUntilTime;
      squads.forEach(s => { if (s) s.urgentUntil = urgentUntilTime; });
      playCyberSound('karma');
      triggerHaptic('success');
      showNotification('Срочный сбор активен!', 'Ваша анкета закреплена в самом верху каталога на 2 часа с яркой пульсацией!');
    }

    saveUsers(AppState.currentUser, true);
    updateFastMatchUI();
    if (typeof renderPlayers === 'function') {
      renderPlayers(AppState.selectedGameFilter || 'all');
    }
    if (typeof renderMySquads === 'function') {
      renderMySquads();
    }
  }

  function updateFastMatchUI() {
    const fastMatchBtn = document.getElementById('fastMatchHeroBtn');
    const fastMatchBadge = document.getElementById('fastMatchHeroBadge');
    const heroBar = document.getElementById('fastMatchHeroBar');
    if (!fastMatchBtn) return;

    const user = AppState.currentUser ? AppState.users[AppState.currentUser] : null;
    const now = Date.now();
    const isUrgent = Boolean(user && user.urgentUntil && user.urgentUntil > now);

    fastMatchBtn.classList.toggle('active', isUrgent);
    if (heroBar) heroBar.classList.toggle('urgent-active', isUrgent);

    if (isUrgent) {
      const remainingMs = user.urgentUntil - now;
      const formatted = formatUrgentRemaining(remainingMs);
      if (fastMatchBadge) {
        fastMatchBadge.style.display = 'inline-flex';
        fastMatchBadge.innerHTML = `<svg style="width:11px;height:11px;margin-right:4px;"><use href="#icon-clock"/></svg><span>АКТИВЕН ${formatted}</span>`;
      }
      fastMatchBtn.innerHTML = `<svg><use href="#icon-bolt-fast"/></svg><span>Срочный сбор (${formatted})</span>`;

      // Динамически обновляем карточки с таймером в DOM без полной перерисовки
      document.querySelectorAll('.urgent-card-timer-val').forEach(el => {
        el.textContent = formatted;
      });

      if (!fastMatchTimerInterval) {
        fastMatchTimerInterval = setInterval(() => {
          updateFastMatchUI();
        }, 1000);
      }
    } else {
      if (fastMatchBadge) {
        fastMatchBadge.style.display = 'none';
      }
      fastMatchBtn.innerHTML = `<svg><use href="#icon-bolt-fast"/></svg><span>Включить срочный сбор</span>`;
      if (fastMatchTimerInterval) {
        clearInterval(fastMatchTimerInterval);
        fastMatchTimerInterval = null;
      }
      // Если время только что вышло
      if (user && user.urgentUntil && user.urgentUntil <= now) {
        user.urgentUntil = 0;
        if (Array.isArray(user.squads)) {
          user.squads.forEach(s => { if (s) s.urgentUntil = 0; });
        }
        saveUsers(AppState.currentUser, true);
        if (typeof renderPlayers === 'function') {
          renderPlayers(AppState.selectedGameFilter || 'all');
        }
        if (typeof renderMySquads === 'function') {
          renderMySquads();
        }
      }
    }
  }

  // ============================================================
  //  1-CLICK CONNECT (DISCORD, TELEGRAM, STEAM)
  // ============================================================

  function copyDiscordTag(discordTag, event) {
    if (event) event.stopPropagation();
    if (!discordTag) {
      showNotification('Контакт не указан', 'Пользователь не привязал Discord');
      return;
    }
    navigator.clipboard.writeText(discordTag).then(() => {
      playCyberSound('click');
      triggerHaptic('success');
      showNotification('Скопировано!', `Discord тег ${discordTag} скопирован в буфер`);
    }).catch(() => {
      showNotification('Discord', discordTag);
    });
  }

  function openTelegramContact(tgUsername, event) {
    if (event) event.stopPropagation();
    if (!tgUsername) {
      showNotification('Контакт не указан', 'Пользователь не привязал Telegram');
      return;
    }
    const cleanTag = tgUsername.replace(/^@/, '');
    const url = `https://t.me/${cleanTag}`;
    playCyberSound('click');
    triggerHaptic('light');
    window.open(url, '_blank');
  }

  // ============================================================
  //  TELEGRAM WEB APP (TWA) INTEGRATION
  // ============================================================

  function initTelegramWebApp() {
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
      const twa = window.Telegram.WebApp;
      twa.ready();
      twa.expand();

      // Устанавливаем цвета темы Telegram
      try {
        twa.setHeaderColor('#070709');
        twa.setBackgroundColor('#070709');
      } catch (e) {}

      document.body.classList.add('twa-mode');

      // Кнопка назад Telegram
      twa.BackButton.onClick(() => {
        if (AppState.currentPage && AppState.currentPage !== 'pageGames') {
          switchPage('pageGames');
        } else {
          twa.close();
        }
      });

      // Авто-вход по профилю Telegram и автоматическая привязка Chat ID бота
      if (twa.initDataUnsafe && twa.initDataUnsafe.user) {
        const tgUser = twa.initDataUnsafe.user;
        const tgUsername = tgUser.username || `tg_${tgUser.id}`;
        
        if (!AppState.users[tgUsername]) {
          AppState.users[tgUsername] = {
            name: tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : ''),
            avatar: tgUser.photo_url || null,
            game: 'csgo',
            device: 'PC',
            coins: 50,
            karma: 1,
            squads: [],
            lookingForTeam: true,
            telegram: tgUser.username ? `@${tgUser.username}` : '',
            telegramChatId: String(tgUser.id),
            telegramNotifs: { dm: true, squad: true, karma: true },
            created: Date.now(),
            lastSeen: Date.now()
          };
          saveUsers(tgUsername, true);
          if (typeof updateUI === 'function') updateUI();
          if (typeof renderProfile === 'function') renderProfile();
          showNotification('Вход через Telegram', `Добро пожаловать, ${escapeHtml(AppState.users[tgUsername].name)}!`);
        }
      }
    }
  }

  function triggerHaptic(style = 'light') {
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
      try {
        if (style === 'light') window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        if (style === 'medium') window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        if (style === 'success') window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      } catch (e) {}
    }
  }

  return {
    init: function() {
      updateSoundUI();
      initTelegramWebApp();
      updateFastMatchUI();
    },
    playSound: playCyberSound,
    toggleSound: toggleSound,
    isSoundEnabled: isSoundEnabled,
    giveKarma: giveUserKarma,
    getKarma: getUserKarma,
    toggleFastMatch: toggleMyFastMatch,
    isUrgent: isSquadUrgent,
    getUrgentRemainingMs: getUrgentRemainingMs,
    formatUrgentRemaining: formatUrgentRemaining,
    formatUrgentRemainingShort: formatUrgentRemainingShort,
    updateFastMatchUI: updateFastMatchUI,
    copyDiscord: copyDiscordTag,
    openTelegram: openTelegramContact,
    haptic: triggerHaptic
  };
})();

// Глобальная инициализация при старте
window.addEventListener('DOMContentLoaded', () => {
  if (typeof RetentionEngine !== 'undefined') {
    RetentionEngine.init();
  }
});
