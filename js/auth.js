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

  const user = AppState.users[trimmedUser];

  if (!trimmedUser || !trimmedPass) {
    setErrorMessage(loginErr, 'Заполните логин и пароль');
    return false;
  }

  if (!user || user.password !== trimmedPass) {
    setErrorMessage(loginErr, 'Неверный логин или пароль');
    return false;
  }

  if (typeof isUserBanned === 'function' && isUserBanned(trimmedUser)) {
    const banInfo = typeof getBanInfo === 'function' ? getBanInfo(trimmedUser) : null;
    hideAuthModal();
    if (typeof renderWelcomeBanNotice === 'function' && banInfo) {
      renderWelcomeBanNotice(banInfo);
    }
    switchPage('pageWelcome');
    showNotification('Аккаунт заблокирован', `Доступ ограничен: ${banInfo?.banReason || 'Блокировка'}`);
    return false;
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
    }
    updateUI();
    switchPage('pageGames');
    showNotification('Добро пожаловать!', `Привет, ${trimmedUser}! Рады видеть тебя снова.`);
  });
  return true;
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
    password: trimmedPass,
    game: game || 'csgo',
    rank: '',
    desc: '',
    avatar: '',
    device: device || 'PC',
    created: Date.now(),
    id: generateUserId(),
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

  saveUsers();
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