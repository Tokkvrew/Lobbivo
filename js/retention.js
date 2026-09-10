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
    const ONE_DAY = 24 * 60 * 60 * 1000;

    if (lastGiven && (Date.now() - lastGiven.timestamp < ONE_DAY)) {
      const remainingHours = Math.ceil((ONE_DAY - (Date.now() - lastGiven.timestamp)) / (60 * 60 * 1000));
      showNotification('Кулдаун', `Вы уже хвалили этого игрока. Повторно можно через ${remainingHours} ч.`);
      return;
    }

    // Добавляем карму
    targetUser.karma = (targetUser.karma || 0) + 1;
    
    // Записываем историю
    if (lastGiven) {
      lastGiven.timestamp = Date.now();
    } else {
      me.karmaGivenTo.push({ username: targetUsername, timestamp: Date.now() });
    }

    saveUsers(AppState.currentUser, true);
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
      FirebaseSync.saveUser(targetUsername, targetUser);
    }

    playCyberSound('karma');
    triggerHaptic('success');
    showNotification('Репутация повышена!', `Вы поставили +1 к карме игроку ${targetUsername}`);

    // Перерисовываем карточки и профиль
    if (typeof renderPlayers === 'function') {
      renderPlayers(AppState.selectedGameFilter || 'all');
    }
  }

  // ============================================================
  //  СРОЧНЫЙ ПОИСК «ИЩУ ПРЯМО СЕЙЧАС» (FAST MATCH ENGINE)
  // ============================================================

  function isSquadUrgent(squad, username) {
    const sqUrgent = squad && squad.urgentUntil && squad.urgentUntil > Date.now();
    const userUrgent = AppState.users[username] && AppState.users[username].urgentUntil && AppState.users[username].urgentUntil > Date.now();
    return Boolean(sqUrgent || userUrgent);
  }

  function toggleMyFastMatch() {
    if (!AppState.currentUser) {
      showNotification('Требуется вход', 'Войдите в аккаунт, чтобы включить срочный поиск');
      showAuthModal('login');
      return;
    }

    const user = AppState.users[AppState.currentUser];
    if (!user) return;

    const isCurrentlyUrgent = Boolean(user.urgentUntil && user.urgentUntil > Date.now());
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    if (isCurrentlyUrgent) {
      user.urgentUntil = 0;
      if (Array.isArray(user.squads)) {
        user.squads.forEach(s => { s.urgentUntil = 0; });
      }
      showNotification('Срочный поиск отключен', 'Ваш статус переведен в обычный режим');
    } else {
      user.urgentUntil = Date.now() + TWO_HOURS;
      if (Array.isArray(user.squads)) {
        user.squads.forEach(s => { s.urgentUntil = Date.now() + TWO_HOURS; });
      }
      playCyberSound('karma');
      triggerHaptic('success');
      showNotification('Срочный поиск активен!', 'Ваша анкета закреплена на 2 часа с яркой пульсацией!');
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
    if (!fastMatchBtn) return;

    const user = AppState.currentUser ? AppState.users[AppState.currentUser] : null;
    const isUrgent = Boolean(user && user.urgentUntil && user.urgentUntil > Date.now());

    fastMatchBtn.classList.toggle('active', isUrgent);
    if (fastMatchBadge) {
      fastMatchBadge.style.display = isUrgent ? 'inline-flex' : 'none';
    }
  }

  // ============================================================
  //  1-CLICK CONNECT (DISCORD, TELEGRAM, STEAM)
  // ============================================================

  function copyDiscordTag(discordTag, event) {
    if (event) event.stopPropagation();
    if (!discordTag || discordTag === 'Не указан') {
      showNotification('Контакт не указан', 'Пользователь не привязал Discord');
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(discordTag).then(() => {
        triggerHaptic('light');
        playCyberSound('click');
        showNotification('Discord скопирован', `Тег "${escapeHtml(discordTag)}" скопирован в буфер обмена`);
      }).catch(() => {
        fallbackCopy(discordTag);
      });
    } else {
      fallbackCopy(discordTag);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showNotification('Скопировано', `"${escapeHtml(text)}" скопировано в буфер`);
    } catch (err) {
      prompt('Скопируйте контакт:', text);
    }
    document.body.removeChild(ta);
  }

  function openTelegramContact(tgUsername, event) {
    if (event) event.stopPropagation();
    if (!tgUsername) {
      showNotification('Контакт не указан', 'Пользователь не привязал Telegram');
      return;
    }
    const cleanName = tgUsername.replace(/^@/, '').trim();
    const url = `https://t.me/${cleanName}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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

      // Авто-вход по профилю Telegram если пользователь еще не авторизован
      if (!AppState.currentUser && twa.initDataUnsafe && twa.initDataUnsafe.user) {
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
            created: Date.now(),
            lastSeen: Date.now()
          };
        }
        
        AppState.currentUser = tgUsername;
        saveUsers(tgUsername, true);
        if (typeof updateUI === 'function') updateUI();
        if (typeof renderProfile === 'function') renderProfile();
        showNotification('Вход через Telegram', `Добро пожаловать, ${escapeHtml(AppState.users[tgUsername].name)}!`);
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
