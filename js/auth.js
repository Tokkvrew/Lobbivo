// ============================================================
//  АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ (AUTH)
// ============================================================

function showAuthModal(mode = 'login') {
  const modal = document.getElementById('authModal');
  const authForm = document.getElementById('authForm');
  const regForm = document.getElementById('registerForm');
  const loginErr = document.getElementById('loginError');
  const regErr = document.getElementById('regError');
  const rules = document.getElementById('rulesText');
  const rulesCheckbox = document.getElementById('rulesCheckbox');
  const regBtn = document.getElementById('registerBtn');
  const tabLogin = document.getElementById('tabLoginBtn');
  const tabRegister = document.getElementById('tabRegisterBtn');
  const titleEl = document.getElementById('authModalTitle');
  const subEl = document.getElementById('authModalSub');

  if (!modal) return;
  modal.classList.add('show');
  
  if (loginErr) loginErr.classList.remove('show');
  if (regErr) regErr.classList.remove('show');
  if (rules) rules.classList.remove('show');
  if (rulesCheckbox) rulesCheckbox.checked = false;
  if (regBtn) regBtn.disabled = true;

  if (mode === 'register') {
    if (authForm) authForm.style.display = 'none';
    if (regForm) regForm.style.display = 'block';
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabRegister) tabRegister.classList.add('active');
    if (titleEl) titleEl.textContent = 'Создание аккаунта';
    if (subEl) subEl.textContent = 'Заполните профиль и находите команду';
    
    if (typeof setDevicePickerValue === 'function') {
      setDevicePickerValue('regDevicePicker', 'PC');
    }
    if (typeof setGamePickerValue === 'function') {
      setGamePickerValue('regGamePicker', 'csgo');
    }
    const regUsername = document.getElementById('regUsername');
    if (regUsername) regUsername.focus();
  } else {
    if (authForm) authForm.style.display = 'block';
    if (regForm) regForm.style.display = 'none';
    if (tabLogin) tabLogin.classList.add('active');
    if (tabRegister) tabRegister.classList.remove('active');
    if (titleEl) titleEl.textContent = 'Вход в аккаунт';
    if (subEl) subEl.textContent = 'Единый профиль игровой платформы Lobbivo';
    
    const loginUsername = document.getElementById('loginUsername');
    if (loginUsername) loginUsername.focus();
  }
}

function hideAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('show');
}

function setErrorMessage(errEl, message) {
  if (!errEl) return;
  const span = errEl.querySelector('span');
  if (span) {
    span.textContent = message;
  } else {
    errEl.textContent = message;
  }
  errEl.classList.add('show');
}

function loginUser(username, password) {
  const loginErr = document.getElementById('loginError');

  if (typeof SecurityShield !== 'undefined' && !SecurityShield.checkRateLimit('auth')) {
    setErrorMessage(loginErr, 'Слишком много попыток. Подождите перед следующим входом.');
    return false;
  }

  loadUsers();
  const trimmedUser = (username || '').trim();
  const trimmedPass = (password || '').trim();

  if (!trimmedUser || !trimmedPass) {
    setErrorMessage(loginErr, 'Заполните логин и пароль');
    return false;
  }

  let user = AppState.users[trimmedUser];

  const proceedLogin = (authenticatedUser) => {
    if (typeof isUserBanned === 'function' && isUserBanned(trimmedUser)) {
      const banInfo = typeof getBanInfo === 'function' ? getBanInfo(trimmedUser) : null;
      hideAuthModal();
      if (typeof renderWelcomeBanNotice === 'function' && banInfo) {
        renderWelcomeBanNotice(banInfo);
      }
      switchPage('pageWelcome');
      showNotification('Аккаунт заблокирован', `Доступ ограничен: ${banInfo?.banReason || 'Блокировка'}`);
      return;
    }

    // Очищаем баннер бана если вход успешен
    const banCard = document.getElementById('welcomeBanNoticeCard');
    if (banCard) banCard.style.display = 'none';

    hideAuthModal();
    showSystemLoader('Вход в аккаунт...', 650, () => {
      AppState.currentUser = trimmedUser;
      localStorage.setItem('squad_session', trimmedUser);
      if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
        FirebaseSync.startPresenceHeartbeat(trimmedUser);
        // Запрашиваем свежий снимок пользователя из Firebase RTDB для моментальной синхронизации между устройствами
        try {
          FirebaseSync.rtdb.ref('users/' + trimmedUser).once('value').then((snap) => {
            const cloudUser = snap.val();
            if (cloudUser && typeof cloudUser === 'object') {
              AppState.users[trimmedUser] = {
                ...(AppState.users[trimmedUser] || {}),
                ...cloudUser
              };
              try {
                localStorage.setItem('squad_users', JSON.stringify(AppState.users));
              } catch (e) {}
              if (typeof updateUI === 'function') updateUI();
              if (typeof renderProfile === 'function' && document.getElementById('pageProfile')?.classList.contains('active')) {
                renderProfile();
              }
            }
          }).catch(() => {});
        } catch (e) {}
      }
      updateUI();
      switchPage('pageGames');
      showNotification('Добро пожаловать!', `Привет, ${trimmedUser}! Рады видеть тебя снова.`);
    });
  };

  const handleAuthenticated = (authenticatedUser) => {
    // Если у аккаунта привязан Telegram, запрашиваем 2FA код подтверждения
    if (typeof TelegramBotService !== 'undefined' && TelegramBotService.isTelegramLinked(trimmedUser)) {
      hideAuthModal();
      showTg2faModal(trimmedUser, () => {
        proceedLogin(authenticatedUser);
      });
      return;
    }
    proceedLogin(authenticatedUser);
  };

  if (!user) {
    // Попытка найти пользователя в облаке Firebase RTDB при входе с нового устройства/браузера
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized && FirebaseSync.rtdb) {
      FirebaseSync.rtdb.ref('users/' + trimmedUser).once('value').then((snap) => {
        const cloudUser = snap.val();
        if (cloudUser && typeof cloudUser === 'object' && cloudUser.password === trimmedPass) {
          AppState.users[trimmedUser] = cloudUser;
          try {
            localStorage.setItem('squad_users', JSON.stringify(AppState.users));
          } catch (e) {}
          handleAuthenticated(cloudUser);
        } else {
          setErrorMessage(loginErr, 'Неверный логин или пароль');
        }
      }).catch(() => {
        setErrorMessage(loginErr, 'Неверный логин или пароль');
      });
      return false;
    } else {
      setErrorMessage(loginErr, 'Неверный логин или пароль');
      return false;
    }
  }

  if (user.password !== trimmedPass) {
    setErrorMessage(loginErr, 'Неверный логин или пароль');
    return false;
  }

  handleAuthenticated(user);
  return true;
}

// ============================================================
//  2FA АУТЕНТИФИКАЦИЯ ЧЕРЕЗ TELEGRAM BOT
// ============================================================

let _tg2faSuccessCallback = null;
let _tg2faPendingUsername = null;
let _tg2faCooldownTimer = null;
let _tg2faCooldownSec = 0;

function showTg2faModal(username, onSuccess) {
  _tg2faPendingUsername = username;
  _tg2faSuccessCallback = onSuccess;

  const modal = document.getElementById('tg2faModal');
  const userLabel = document.getElementById('tg2faUsernameLabel');
  const input = document.getElementById('tg2faCodeInput');
  const errEl = document.getElementById('tg2faError');

  if (userLabel) userLabel.textContent = username;
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 150);
  }
  if (errEl) errEl.classList.remove('show');

  if (modal) modal.classList.add('show');

  // Отправляем 2FA код в Telegram
  if (typeof TelegramBotService !== 'undefined') {
    TelegramBotService.send2faLoginCode(username).then((res) => {
      if (res && res.success) {
        if (typeof showNotification === 'function') {
          showNotification('Код отправлен в Telegram', 'Проверьте сообщения от бота @Lobbivobot');
        }
      } else {
        const msg = res?.error || 'Не удалось отправить код в Telegram';
        if (errEl) setErrorMessage(errEl, msg);
      }
    });
  }

  startTg2faResendTimer(60);
}

function hideTg2faModal() {
  const modal = document.getElementById('tg2faModal');
  if (modal) modal.classList.remove('show');
  _tg2faSuccessCallback = null;
  _tg2faPendingUsername = null;
  if (_tg2faCooldownTimer) {
    clearInterval(_tg2faCooldownTimer);
    _tg2faCooldownTimer = null;
  }
}

function startTg2faResendTimer(seconds = 60) {
  _tg2faCooldownSec = seconds;
  const resendBtn = document.getElementById('tg2faResendBtn');
  const timerSpan = document.getElementById('tg2faTimerSpan');

  if (_tg2faCooldownTimer) clearInterval(_tg2faCooldownTimer);

  if (resendBtn) resendBtn.disabled = true;

  const updateDisplay = () => {
    if (_tg2faCooldownSec <= 0) {
      if (_tg2faCooldownTimer) clearInterval(_tg2faCooldownTimer);
      if (resendBtn) resendBtn.disabled = false;
      if (timerSpan) timerSpan.textContent = '';
      return;
    }
    if (timerSpan) timerSpan.textContent = `(${_tg2faCooldownSec}с)`;
    _tg2faCooldownSec--;
  };

  updateDisplay();
  _tg2faCooldownTimer = setInterval(updateDisplay, 1000);
}

function submitTg2faCode() {
  if (!_tg2faPendingUsername) return;
  const input = document.getElementById('tg2faCodeInput');
  const errEl = document.getElementById('tg2faError');
  const code = input ? input.value.trim() : '';

  if (!code || code.length < 6) {
    if (errEl) setErrorMessage(errEl, 'Введите 6-значный код из Telegram');
    return;
  }

  if (typeof TelegramBotService !== 'undefined') {
    const isValid = TelegramBotService.verify2faLoginCode(_tg2faPendingUsername, code);
    if (!isValid) {
      if (errEl) setErrorMessage(errEl, 'Неверный или истёкший код подтверждения');
      if (input) {
        input.value = '';
        input.focus();
      }
      return;
    }

    // Код верный!
    const cb = _tg2faSuccessCallback;
    hideTg2faModal();
    if (typeof cb === 'function') {
      cb();
    }
  }
}

function resendTg2faCode() {
  if (!_tg2faPendingUsername) return;
  const errEl = document.getElementById('tg2faError');
  if (errEl) errEl.classList.remove('show');

  if (typeof TelegramBotService !== 'undefined') {
    TelegramBotService.send2faLoginCode(_tg2faPendingUsername).then((res) => {
      if (res && res.success) {
        if (typeof showNotification === 'function') {
          showNotification('Новый код отправлен', 'Проверьте сообщения от @Lobbivobot в Telegram');
        }
        startTg2faResendTimer(60);
      } else {
        const msg = res?.error || 'Не удалось отправить код';
        if (errEl) setErrorMessage(errEl, msg);
      }
    });
  }
}

function registerUser(username, password, game, device) {
  const regErr = document.getElementById('regError');

  if (typeof SecurityShield !== 'undefined' && !SecurityShield.checkRateLimit('auth')) {
    setErrorMessage(regErr, 'Слишком много попыток регистрации. Подождите немного.');
    return false;
  }

  loadUsers();
  const trimmedUser = (username || '').trim();
  const trimmedPass = (password || '').trim();
  const rulesCheckbox = document.getElementById('rulesCheckbox');

  if (!trimmedUser || !trimmedPass) {
    setErrorMessage(regErr, 'Введите имя пользователя и пароль');
    return false;
  }

  if (trimmedUser.length < 2 || trimmedUser.length > 20) {
    setErrorMessage(regErr, 'Имя пользователя должно быть от 2 до 20 символов');
    return false;
  }

  if (typeof SecurityShield !== 'undefined' && !SecurityShield.isValidUsername(trimmedUser)) {
    setErrorMessage(regErr, 'Имя может содержать только буквы, цифры, дефис (2-20 символов)');
    return false;
  }

  if (trimmedPass.length < 3) {
    setErrorMessage(regErr, 'Пароль должен содержать минимум 3 символа');
    return false;
  }

  if (AppState.users[trimmedUser]) {
    setErrorMessage(regErr, 'Пользователь с таким именем уже существует');
    return false;
  }

  if (rulesCheckbox && !rulesCheckbox.checked) {
    setErrorMessage(regErr, 'Необходимо согласиться с правилами сервиса');
    return false;
  }

  AppState.users[trimmedUser] = {
    username: trimmedUser,
    password: trimmedPass,
    game: game || 'csgo',
    rank: '',
    desc: '',
    avatar: '',
    device: device || 'PC',
    created: Date.now(),
    id: generateUserId(),
    karma: 0,
    karmaGivenTo: [],
    squads: [],
    lookingForTeam: false,
    hasCreatedSquad: false,
    coins: 0,
    friends: [],
    blockedUsers: [],
    friendRequests: [],
    privacy: { dmAccess: 'all' },
    claimedTasks: {
      avatar: false,
      bio: false,
      squad: false,
      teammates: false
    },
    contactedTeammates: []
  };

  saveUsers(trimmedUser, true);
  hideAuthModal();
  showSystemLoader('Создание профиля...', 700, () => {
    AppState.currentUser = trimmedUser;
    localStorage.setItem('squad_session', trimmedUser);
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
      FirebaseSync.startPresenceHeartbeat(trimmedUser);
    }
    updateUI();
    switchPage('pageGames');
    showNotification('Аккаунт создан!', `Добро пожаловать в Lobbivo, ${trimmedUser}!`);
  });
  return true;
}

function logout() {
  const currentPage = document.querySelector('.page.active');
  if (currentPage) {
    currentPage.classList.add('page-exit');
    setTimeout(() => {
      currentPage.classList.remove('active', 'page-exit');
      currentPage.style.display = 'none';
    }, 250);
  }

  AppState.currentUser = null;
  AppState.chatPartner = null;

  const chatContainer = document.getElementById('chatContainer');
  if (chatContainer) chatContainer.classList.remove('open');

  localStorage.removeItem('squad_session');
  updateUI();
  showNotification('Выход', 'Вы вышли из своего аккаунта');

  setTimeout(() => {
    switchPage('pageWelcome');
  }, 250);
}