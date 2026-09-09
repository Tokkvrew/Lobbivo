// ============================================================
//  ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ (PROFILE MANAGEMENT)
// ============================================================

function updateHeaderAvatar() {
  const el = document.getElementById('headerAvatar');
  const dropdownAvatar = document.getElementById('dropdownAvatar');
  const dropdownUsername = document.getElementById('dropdownUsername');
  const dropdownStatusText = document.getElementById('dropdownStatusText');
  const dropdownStatusDot = document.getElementById('dropdownStatusDot');
  const capsuleLabel = document.getElementById('capsuleProfileLabel');
  const menuList = document.getElementById('profileMenuList');

  const current = AppState.currentUser;
  const data = current ? AppState.users[current] : null;

  if (data && data.avatar) {
    if (el) el.innerHTML = `<img src="${data.avatar}" alt="${escapeHtml(current)}">`;
    if (dropdownAvatar) dropdownAvatar.innerHTML = `<img src="${data.avatar}" alt="${escapeHtml(current)}">`;
  } else if (current) {
    const initials = current.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    if (el) el.innerHTML = `<span id="headerAvatarText">${escapeHtml(initials || '?')}</span>`;
    if (dropdownAvatar) dropdownAvatar.innerHTML = `<span>${escapeHtml(initials || '?')}</span>`;
  } else {
    if (el) el.innerHTML = `<span id="headerAvatarText">?</span>`;
    if (dropdownAvatar) dropdownAvatar.innerHTML = `<span>?</span>`;
  }

  const isAdmin = current && typeof isUserAdmin === 'function' && isUserAdmin(current);

  if (dropdownUsername) {
    dropdownUsername.textContent = current || 'Гость';
  }
  if (dropdownStatusText) {
    dropdownStatusText.textContent = isAdmin ? '👑 Администратор' : (current ? 'В сети' : 'Не авторизован');
  }
  if (dropdownStatusDot) {
    dropdownStatusDot.className = isAdmin ? 'online-glow-dot admin' : (current ? 'online-glow-dot active' : 'online-glow-dot guest');
  }
  if (capsuleLabel) {
    capsuleLabel.textContent = current || 'Профиль';
  }

  // Обновление баланса Lobbivo Coin в шапке и модалке
  const userCoins = data && typeof data.coins === 'number' ? data.coins : 0;
  const headerCoinEl = document.getElementById('headerCoinBalance');
  const modalCoinEl = document.getElementById('modalCoinBalance');
  const dropdownCoinEl = document.getElementById('dropdownCoinBalance');

  if (headerCoinEl) {
    headerCoinEl.textContent = userCoins.toLocaleString('ru-RU');
  }
  if (modalCoinEl) {
    modalCoinEl.textContent = userCoins.toLocaleString('ru-RU');
  }
  if (dropdownCoinEl) {
    dropdownCoinEl.textContent = `${userCoins.toLocaleString('ru-RU')} LC`;
    dropdownCoinEl.style.display = current ? 'inline-block' : 'none';
  }

  // Динамический рендеринг меню: для гостей и пользователей
  if (menuList) {
    if (current) {
      menuList.innerHTML = `
        ${isAdmin ? `
          <button class="profile-menu-item admin-menu-item" data-action="admin">
            <span style="color:#ff3366; font-weight:700;">🛡️ Админ Панель</span>
          </button>
          <div class="menu-divider-line"></div>
        ` : ''}
        <button class="profile-menu-item" data-action="profile">
          <span>Мой профиль</span>
        </button>
        <button class="profile-menu-item" data-action="settings">
          <span>Настройки интерфейса</span>
        </button>
        <button class="profile-menu-item" data-action="about">
          <span>О платформе</span>
        </button>
        <div class="menu-divider-line"></div>
        <button class="profile-menu-item logout-item" data-action="logout">
          <span>Выйти из аккаунта</span>
        </button>
      `;
    } else {
      menuList.innerHTML = `
        <button class="profile-menu-item" data-action="login">
          <span>Войти в аккаунт</span>
        </button>
        <button class="profile-menu-item" data-action="settings">
          <span>Настройки интерфейса</span>
        </button>
        <button class="profile-menu-item" data-action="about">
          <span>О платформе</span>
        </button>
      `;
    }
  }
}

function showProfile() {
  if (!AppState.currentUser) {
    showAuthModal('login');
    return;
  }
  switchPage('pageProfile');
  renderProfile();
}

function renderProfile() {
  if (!AppState.currentUser) return;
  const current = AppState.currentUser;
  const data = AppState.users[current];
  if (!data) return;

  const nameEl = document.getElementById('profileName');
  if (nameEl) nameEl.textContent = current;

  const gameObj = GAMES.find(g => g.id === data.game) || GAMES[0];
  const profileGameEl = document.getElementById('profileGame');
  if (profileGameEl) {
    const iconUse = profileGameEl.querySelector('svg use');
    if (iconUse) iconUse.setAttribute('href', '#' + gameObj.icon);
    const span = profileGameEl.querySelector('span');
    if (span) span.textContent = gameObj.name;
  }

  const avatarEl = document.getElementById('profileAvatar');
  if (avatarEl) {
    if (data.avatar) {
      avatarEl.innerHTML = `
        <img src="${data.avatar}" alt="${escapeHtml(current)}">
        <span class="online-dot"></span>
        <div class="avatar-edit-btn" id="avatarEditBtn">
          <svg style="width:13px;height:13px;stroke:currentColor;fill:none;display:inline-block;vertical-align:middle;margin-right:2px;"><use href="#icon-sparkles"/></svg>
          Фото
        </div>
      `;
    } else {
      const initials = current.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      avatarEl.innerHTML = `
        <span id="profileAvatarText">${escapeHtml(initials || '?')}</span>
        <span class="online-dot"></span>
        <div class="avatar-edit-btn" id="avatarEditBtn">
          <svg style="width:13px;height:13px;stroke:currentColor;fill:none;display:inline-block;vertical-align:middle;margin-right:2px;"><use href="#icon-sparkles"/></svg>
          Фото
        </div>
      `;
    }
    // Повторное подключение клика для загрузки фото
    document.getElementById('avatarEditBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('editAvatarFile')?.click();
    });
  }

  const descEl = document.getElementById('profileDesc');
  if (descEl) {
    descEl.innerHTML = data.desc 
      ? `<div class="desc-text">${escapeHtml(data.desc)}</div>` 
      : '<span class="empty">Информация о себе не заполнена. Расскажите о любимых ролях и времени игры в настройках профиля.</span>';
  }

  const deviceIconSVG = getDeviceIconSVG(data.device || 'PC');
  const deviceEl = document.getElementById('profileDevice');
  if (deviceEl) {
    deviceEl.innerHTML = data.device 
      ? `<div class="device-pill-view"><svg class="device-icon device-icon-sm"><use href="#${escapeHtml(deviceIconSVG)}"/></svg><span>${escapeHtml(data.device)}</span></div>`
      : '<span class="empty">Не указано</span>';
  }

  const idEl = document.getElementById('profileId');
  if (idEl) idEl.textContent = `ID: ${data.id || '---'}`;

  const sinceEl = document.getElementById('profileMemberSince');
  if (sinceEl) {
    const since = data.created ? new Date(data.created).toLocaleDateString('ru-RU') : 'недавно';
    sinceEl.textContent = `· с ${since}`;
  }

  // Заполнение формы редактирования
  const editUsername = document.getElementById('editUsername');
  const editGame = document.getElementById('editGame');
  const editDesc = document.getElementById('editDesc');

  if (editUsername) editUsername.value = current;
  if (typeof setGamePickerValue === 'function') {
    setGamePickerValue('editGamePicker', data.game || 'csgo');
  } else if (editGame) {
    editGame.value = data.game || 'csgo';
  }
  if (typeof setDevicePickerValue === 'function') {
    setDevicePickerValue('editDevicePicker', data.device || 'PC');
  }
  if (editDesc) editDesc.value = data.desc || '';

  const editForm = document.getElementById('profileEditForm');
  const editProfileBtn = document.getElementById('editProfileBtn');

  if (AppState.isEditing) {
    if (editForm) editForm.classList.add('open');
    if (editProfileBtn) {
      editProfileBtn.classList.add('active');
      editProfileBtn.innerHTML = '<svg><use href="#icon-close"/></svg> <span>Закрыть настройки</span>';
    }
  } else {
    if (editForm) editForm.classList.remove('open');
    if (editProfileBtn) {
      editProfileBtn.classList.remove('active');
      editProfileBtn.innerHTML = '<svg><use href="#icon-settings"/></svg> <span>Редактировать профиль</span>';
    }
  }

  updateHeaderAvatar();
}

async function saveProfile() {
  if (!AppState.currentUser) return;
  const current = AppState.currentUser;
  const data = AppState.users[current];
  if (!data) return;

  const newUsername = (document.getElementById('editUsername')?.value || '').trim();
  const game = document.getElementById('editGame')?.value || data.game;
  const device = document.getElementById('editDevice')?.value || data.device;
  const desc = (document.getElementById('editDesc')?.value || '').trim();

  if (newUsername.length < 2 || newUsername.length > 20) {
    showNotification('Ошибка', 'Имя пользователя должно быть от 2 до 20 символов');
    return;
  }

  const fileInput = document.getElementById('editAvatarFile');
  if (fileInput && fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    if (file.size > 5 * 1024 * 1024) {
      showNotification('Ошибка', 'Размер изображения не должен превышать 5 МБ');
      return;
    }
    try {
      data.avatar = await compressImage(file, 256, 0.85);
    } catch (err) {
      showNotification('Ошибка загрузки фото', err.message || 'Не удалось обработать изображение');
      return;
    }
    fileInput.value = '';
  }

  finishProfileSave(current, newUsername, game, device, desc);
}

function finishProfileSave(oldUsername, newUsername, game, device, desc) {
  const data = AppState.users[oldUsername];
  if (!data) return;

  data.game = game;
  data.device = device;
  data.desc = desc;

  if (newUsername && newUsername !== oldUsername) {
    if (AppState.users[newUsername]) {
      showNotification('Ошибка', 'Пользователь с таким ником уже существует!');
      return;
    }
    renameUser(oldUsername, newUsername);
  } else {
    saveUsers();
    AppState.isEditing = false;
    renderProfile();
    updateGameCounts();
    showNotification('Успешно', 'Профиль обновлен!');
  }
}

function renameUser(oldName, newName) {
  AppState.users[newName] = { ...AppState.users[oldName] };
  delete AppState.users[oldName];

  // Миграция истории сообщений с поддержкой нового и старого формата ключей
  const updatedMessages = {};
  for (const [key, msgs] of Object.entries(AppState.messages)) {
    let newKey = key;
    if (key.includes(oldName)) {
      if (key.includes('___')) {
        const parts = key.split('___');
        const updatedParts = parts.map(p => p === oldName ? newName : p);
        newKey = updatedParts.sort().join('___');
      } else {
        const parts = key.split('_');
        const updatedParts = parts.map(p => p === oldName ? newName : p);
        newKey = updatedParts.sort().join('___');
      }
    }
    const updatedMsgs = msgs.map(m => {
      return {
        ...m,
        from: m.from === oldName ? newName : m.from,
        to: m.to === oldName ? newName : m.to
      };
    });
    updatedMessages[newKey] = updatedMsgs;
  }
  AppState.messages = updatedMessages;

  // Обновление друзей, черного списка и заявок у всех пользователей
  for (const username of Object.keys(AppState.users)) {
    const u = AppState.users[username];
    if (Array.isArray(u.friends)) {
      u.friends = u.friends.map(f => f === oldName ? newName : f);
    }
    if (Array.isArray(u.blockedUsers)) {
      u.blockedUsers = u.blockedUsers.map(b => b === oldName ? newName : b);
    }
    if (Array.isArray(u.friendRequests)) {
      u.friendRequests.forEach(r => {
        if (r.from === oldName) r.from = newName;
        if (r.to === oldName) r.to = newName;
      });
    }
  }

  // Обновление автора в мировом чате
  if (Array.isArray(AppState.worldMessages)) {
    AppState.worldMessages.forEach(wm => {
      if (wm.from === oldName) wm.from = newName;
    });
    saveWorldMessages();
  }

  AppState.currentUser = newName;
  localStorage.setItem('squad_session', newName);

  saveUsers();
  saveMessages();
  AppState.isEditing = false;
  
  updateUI();
  renderProfile();
  updateGameCounts();
  showNotification('Профиль обновлен', `Ник успешно изменен на ${newName}`);
}

function deleteAccount() {
  if (!AppState.currentUser) return;
  const current = AppState.currentUser;

  if (!confirm(`Вы действительно хотите удалить аккаунт "${current}"? Это действие невозможно отменить.`)) {
    return;
  }

  delete AppState.users[current];

  // Очистка сообщений удаленного пользователя
  const cleanMessages = {};
  for (const [key, msgs] of Object.entries(AppState.messages)) {
    const partner = getChatPartnerFromKey(key, current);
    if (!partner) {
      cleanMessages[key] = msgs;
    }
  }
  AppState.messages = cleanMessages;

  // Очистка связей с удалённым пользователем у других игроков
  for (const username of Object.keys(AppState.users)) {
    const u = AppState.users[username];
    if (Array.isArray(u.friends)) {
      u.friends = u.friends.filter(f => f !== current);
    }
    if (Array.isArray(u.blockedUsers)) {
      u.blockedUsers = u.blockedUsers.filter(b => b !== current);
    }
    if (Array.isArray(u.friendRequests)) {
      u.friendRequests = u.friendRequests.filter(r => r.from !== current && r.to !== current);
    }
    if (Array.isArray(u.contactedTeammates)) {
      u.contactedTeammates = u.contactedTeammates.filter(c => c !== current);
    }
  }

  // Очистка сообщений в мировом чате
  if (Array.isArray(AppState.worldMessages)) {
    AppState.worldMessages = AppState.worldMessages.filter(wm => wm.from !== current);
    saveWorldMessages();
  }

  saveUsers();
  saveMessages();

  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    FirebaseSync.deleteUser(current);
  }

  AppState.currentUser = null;
  AppState.chatPartner = null;
  AppState.isEditing = false;
  localStorage.removeItem('squad_session');

  updateUI();
  showNotification('Аккаунт удален', 'Ваш аккаунт был успешно удален.');
  switchPage('pageGames');
}