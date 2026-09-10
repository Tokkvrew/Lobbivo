// ============================================================
//  ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ (PROFILE DASHBOARD & CUSTOMIZATION)
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
  const isPremium = current ? isUserPremium(current) : false;
  const frameId = current ? getUserEquippedFrame(current) : 'none';

  let avatarInner = '';
  if (data && data.avatar) {
    avatarInner = `<img src="${data.avatar}" alt="${escapeHtml(current)}">`;
  } else if (current) {
    const initials = current.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    avatarInner = `<span id="headerAvatarText">${escapeHtml(initials || '?')}</span>`;
  } else {
    avatarInner = `<span id="headerAvatarText">?</span>`;
  }

  let framedAvatarHtml = avatarInner;
  if (frameId && frameId !== 'none') {
    framedAvatarHtml = `<div class="avatar-frame-wrap frame-${frameId}">${avatarInner}</div>`;
  }

  if (el) el.innerHTML = framedAvatarHtml;
  if (dropdownAvatar) dropdownAvatar.innerHTML = framedAvatarHtml;

  const isAdmin = current && typeof isUserAdmin === 'function' && isUserAdmin(current);

  if (dropdownUsername) {
    dropdownUsername.innerHTML = `<span class="${getUserNameClass(current)}">${escapeHtml(current || 'Гость')}</span>${isPremium ? ' <span class="premium-crown-badge"><svg><use href="#icon-crown"/></svg></span>' : ''}`;
  }
  if (dropdownStatusText) {
    dropdownStatusText.textContent = current ? 'В сети' : 'Не авторизован';
  }
  if (dropdownStatusDot) {
    dropdownStatusDot.className = current ? 'online-glow-dot active' : 'online-glow-dot guest';
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

  // Динамический рендеринг меню: для гостей и авторизованных пользователей
  if (menuList) {
    if (current) {
      menuList.innerHTML = `
        ${isAdmin ? `
          <button class="profile-menu-item admin-menu-item" data-action="admin">
            <span style="color:#ff3366; font-weight:700;"><svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"><use href="#icon-admin-shield"/></svg>Админ Панель</span>
          </button>
          <div class="menu-divider-line"></div>
        ` : ''}
        <button class="profile-menu-item" data-action="profile">
          <svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"><use href="#icon-profile"/></svg>
          <span>Мой профиль</span>
        </button>
        <button class="profile-menu-item" data-action="friends">
          <svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;color:var(--neon-blue);"><use href="#icon-users"/></svg>
          <span>Мои друзья</span>
          <span class="menu-badge-count" id="headerFriendsCount" style="display:none;"></span>
        </button>
        <button class="profile-menu-item" data-action="my-squads">
          <svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;color:var(--neon-cyan);"><use href="#icon-users"/></svg>
          <span>Мои анкеты</span>
          <span class="menu-badge-count" id="headerSquadsCount"></span>
        </button>
        <button class="profile-menu-item" data-action="settings">
          <svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"><use href="#icon-settings"/></svg>
          <span>Настройки</span>
        </button>
        <button class="profile-menu-item" data-action="about">
          <svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"><use href="#icon-about"/></svg>
          <span>О платформе</span>
        </button>
        <div class="menu-divider-line"></div>
        <button class="profile-menu-item logout-item" data-action="logout">
          <svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"><use href="#icon-logout"/></svg>
          <span>Выйти из аккаунта</span>
        </button>
      `;
    } else {
      menuList.innerHTML = `
        <button class="profile-menu-item" data-action="login">
          <svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"><use href="#icon-profile"/></svg>
          <span>Войти в аккаунт</span>
        </button>
        <button class="profile-menu-item" data-action="settings">
          <svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"><use href="#icon-settings"/></svg>
          <span>Настройки</span>
        </button>
        <button class="profile-menu-item" data-action="about">
          <svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"><use href="#icon-about"/></svg>
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

function showSettings() {
  switchPage('pageSettings');
  if (typeof renderPrivacySettings === 'function') renderPrivacySettings();
  if (typeof renderBlacklistSettings === 'function') renderBlacklistSettings();
}

function switchProfileTab(tabName = 'overview') {
  // Для обратной совместимости: всё находится на единой странице профиля
  renderProfile();
}

function renderProfile() {
  if (!AppState.currentUser) return;
  const current = AppState.currentUser;
  const data = AppState.users[current];
  if (!data) return;

  const isPremium = isUserPremium(current);
  const frameId = getUserEquippedFrame(current) || 'none';
  const gameObj = GAMES.find(g => g.id === data.game) || GAMES[0];
  const userCoins = typeof data.coins === 'number' ? data.coins : 0;

  // 1. Имя и ID
  const nameEl = document.getElementById('profileName');
  if (nameEl) {
    nameEl.textContent = current;
    nameEl.className = 'profile-name ' + getUserNameClass(current);
  }

  const crownEl = document.getElementById('profilePremiumCrown');
  if (crownEl) {
    crownEl.style.display = isPremium ? 'inline-flex' : 'none';
  }

  const idEl = document.getElementById('profileId');
  if (idEl) {
    const isCEO = typeof isUserCEO === 'function' ? isUserCEO(current) : (typeof isUserGA === 'function' && isUserGA(current));
    const ceoBadge = isCEO ? ` <span class="profile-ceo-badge" title="Основатель и CEO Lobbivo"><svg class="mini-svg" style="width:11px;height:11px;margin-right:3px;"><use href="#icon-crown"/></svg>CEO</span>` : '';
    idEl.innerHTML = `ID: ${data.id || '---'}${ceoBadge}`;
  }

  // 2. Аватар в шапке профиля с рамкой
  const avatarEl = document.getElementById('profileAvatar');
  const avatarWrap = document.getElementById('profileAvatarFrameWrap');

  if (avatarWrap) {
    avatarWrap.className = 'avatar-frame-wrap' + (frameId !== 'none' ? ` frame-${frameId}` : '');
  }

  if (avatarEl) {
    if (data.avatar) {
      avatarEl.innerHTML = `<img src="${data.avatar}" alt="${escapeHtml(current)}">`;
    } else {
      const initials = current.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      avatarEl.innerHTML = `<span id="profileAvatarText">${escapeHtml(initials || '?')}</span>`;
    }
  }

  // 3. Теги шапки (Игра, Платформа, Статус)
  const profileGameEl = document.getElementById('profileGame');
  if (profileGameEl) {
    const iconUse = profileGameEl.querySelector('svg use');
    if (iconUse) iconUse.setAttribute('href', '#' + gameObj.icon);
    const span = profileGameEl.querySelector('span');
    if (span) span.textContent = gameObj.name;
  }

  const profileDevicePill = document.getElementById('profileDevicePill');
  const profileDeviceText = document.getElementById('profileDeviceText');
  if (profileDeviceText) profileDeviceText.textContent = data.device || 'PC';
  if (profileDevicePill) {
    const devIconUse = profileDevicePill.querySelector('svg use');
    if (devIconUse) devIconUse.setAttribute('href', '#' + getDeviceIconSVG(data.device || 'PC'));
  }

  const sinceEl = document.getElementById('profileMemberSince');
  if (sinceEl) {
    const since = data.created ? new Date(data.created).toLocaleDateString('ru-RU') : 'недавно';
    sinceEl.textContent = `· с ${since}`;
  }

  // 4. Баланс монет и карма/лайки в шапке профиля
  const coinNumEl = document.getElementById('profileCoinBalanceNum');
  if (coinNumEl) {
    coinNumEl.textContent = `${userCoins.toLocaleString('ru-RU')} LC`;
  }

  const karmaValEl = document.getElementById('profileKarmaVal');
  if (karmaValEl) {
    const userKarma = typeof RetentionEngine !== 'undefined' ? RetentionEngine.getKarma(current) : (data.karma || 0);
    karmaValEl.textContent = `${userKarma}`;
  }

  // 5. Заполнение формы редактирования анкеты
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

  // 6. Обновление пользовательских тегов
  if (typeof initProfileEditingTags === 'function') {
    initProfileEditingTags(current);
  }

  // 7. Обновление кастомизации (рамок и тем)
  renderProfileCustomization();

  // 8. Обновление секции «Мои анкеты»
  if (typeof renderMySquads === 'function') renderMySquads();

  // 9. Обновление списка друзей
  renderProfileFriends();

  // 10. Обновление настроек приватности, Push и черного списка
  if (typeof renderPrivacySettings === 'function') renderPrivacySettings();
  if (typeof renderBlacklistSettings === 'function') renderBlacklistSettings();

  // 11. Обновление аватара в шапке
  updateHeaderAvatar();
}

function renderProfileCustomization() {
  const current = AppState.currentUser;
  const user = current ? AppState.users[current] : null;
  const equippedFrame = current ? getUserEquippedFrame(current) : 'none';
  const inventory = current ? getUserInventory(current) : { frames: [], themes: [], boosts: 0 };
  const currentTheme = AppState.currentTheme || 'default';

  // 1. Обновление стенда живого предпросмотра
  const stageWrap = document.getElementById('customStageFrameWrap');
  const stageAvatar = document.getElementById('customStageLiveAvatar');
  const stageFrameName = document.getElementById('customStageFrameName');

  if (stageWrap && stageAvatar && stageFrameName) {
    stageWrap.className = 'avatar-frame-wrap' + (equippedFrame !== 'none' ? ` frame-${equippedFrame}` : '');
    
    if (user && user.avatar) {
      stageAvatar.innerHTML = `<img src="${user.avatar}" alt="${escapeHtml(current)}">`;
    } else {
      const initials = current ? current.slice(0, 2).toUpperCase() : '?';
      stageAvatar.innerHTML = `<span>${initials}</span>`;
    }

    const currentFrameDef = FRAME_DEFINITIONS.find(f => f.id === equippedFrame) || FRAME_DEFINITIONS[0];
    stageFrameName.innerHTML = `<svg class="item-title-icon ${currentFrameDef.id}-icon"><use href="#${currentFrameDef.icon}"/></svg> <span>${currentFrameDef.name}</span>`;
  }

  const isCEO = current && (typeof isUserCEO === 'function' ? isUserCEO(current) : (typeof isUserGA === 'function' && isUserGA(current)));
  const isMod = current && typeof isUserAdmin === 'function' && isUserAdmin(current);

  // 2. Сетка рамок
  const framesGrid = document.getElementById('profileFramesGrid');
  if (framesGrid) {
    let html = '';
    FRAME_DEFINITIONS.forEach(frame => {
      const isEquipped = equippedFrame === frame.id;
      let isOwned = frame.id === 'none' || inventory.frames.includes(frame.id);
      if (frame.gaOnly) {
        isOwned = isCEO || inventory.frames.includes(frame.id);
      }
      const activeClass = isEquipped ? ' active' : '';

      let btnHtml = '';
      if (isEquipped) {
        btnHtml = `<div class="btn-custom-action btn-active"><svg><use href="#icon-check-circle"/></svg> <span>Выбрано</span></div>`;
      } else if (isOwned) {
        btnHtml = `<button type="button" class="btn-custom-action btn-equip" onclick="equipFrameFromProfile('${frame.id}')"><span>Надеть</span></button>`;
      } else if (frame.gaOnly) {
        btnHtml = `<div class="btn-custom-action btn-locked-ga" title="Только для CEO"><svg><use href="#icon-crown"/></svg> <span>Эксклюзив CEO</span></div>`;
      } else {
        btnHtml = `<button type="button" class="btn-custom-action btn-buy-link" onclick="openShopForCustomization('shop')"><svg><use href="#icon-shop"/></svg> <span>В магазине (${frame.cost} LC)</span></button>`;
      }

      const avatarContent = (user && user.avatar) ? `<img src="${user.avatar}" alt="${escapeHtml(current)}">` : `<span>${current ? current.slice(0, 2).toUpperCase() : '?'}</span>`;
      const frameWrapClass = frame.id !== 'none' ? ` frame-${frame.id}` : '';
      const gaBadgeHtml = frame.gaOnly ? '<span class="frame-ga-pill"><svg><use href="#icon-crown"/></svg>CEO EXCLUSIVE</span>' : '';

      html += `
        <div class="custom-frame-card${activeClass} ${frame.gaOnly ? 'ga-exclusive-card' : ''}" data-frame-id="${frame.id}">
          <div class="frame-preview-box">
            <div class="avatar-frame-wrap${frameWrapClass}">
              <div class="frame-preview-avatar">${avatarContent}</div>
            </div>
          </div>
          <div class="frame-card-info">
            <div class="frame-name">
              <svg class="item-title-icon ${frame.id}-icon"><use href="#${frame.icon}"/></svg>
              <span>${frame.name}</span>
              ${gaBadgeHtml}
            </div>
            <div class="frame-desc">${frame.desc}</div>
          </div>
          ${btnHtml}
        </div>
      `;
    });
    framesGrid.innerHTML = html;
  }

  // 3. Сетка тем
  const themesGrid = document.getElementById('profileThemesGrid');
  if (themesGrid) {
    let html = '';
    THEME_DEFINITIONS.forEach(theme => {
      const isActive = currentTheme === theme.id;
      const isOwned = theme.id === 'default' || theme.id === 'lobbivo' || inventory.themes.includes(theme.id);
      const activeClass = isActive ? ' active' : '';

      let btnHtml = '';
      if (isActive) {
        btnHtml = `<div class="btn-custom-action btn-active"><svg><use href="#icon-check-circle"/></svg> <span>Активна</span></div>`;
      } else if (isOwned) {
        btnHtml = `<button type="button" class="btn-custom-action btn-equip" onclick="applyThemeFromProfile('${theme.id}')"><span>Применить</span></button>`;
      } else {
        btnHtml = `<button type="button" class="btn-custom-action btn-buy-link" onclick="openShopForCustomization('shop')"><svg><use href="#icon-shop"/></svg> <span>В магазине (${theme.cost} LC)</span></button>`;
      }

      let previewChipHtml = '';
      if (theme.id === 'lobbivo') {
        previewChipHtml = `<div class="preview-theme-chip"><span class="preview-l-glyph">L</span><span class="preview-theme-tag">GLASS</span></div>`;
      } else if (theme.id === 'default') {
        previewChipHtml = `<div class="preview-theme-chip"><svg class="preview-theme-icon"><use href="#icon-sparkles"/></svg><span class="preview-theme-tag">CYBER</span></div>`;
      } else if (theme.id === 'nebula') {
        previewChipHtml = `<div class="preview-theme-chip"><svg class="preview-theme-icon"><use href="#icon-palette-shop"/></svg><span class="preview-theme-tag">NEBULA</span></div>`;
      } else if (theme.id === 'crimson') {
        previewChipHtml = `<div class="preview-theme-chip"><svg class="preview-theme-icon"><use href="#icon-flame"/></svg><span class="preview-theme-tag">CRIMSON</span></div>`;
      } else if (theme.id === 'matrix') {
        previewChipHtml = `<div class="preview-theme-chip"><svg class="preview-theme-icon"><use href="#icon-nodes-menu"/></svg><span class="preview-theme-tag">MATRIX</span></div>`;
      } else {
        previewChipHtml = `<div class="preview-theme-chip"><svg class="preview-theme-icon"><use href="#${theme.icon}"/></svg><span class="preview-theme-tag">${escapeHtml(theme.name.slice(0,6))}</span></div>`;
      }

      html += `
        <div class="custom-theme-card${activeClass}" data-theme-id="${theme.id}" onclick="if('${isOwned}' === 'true') applyThemeFromProfile('${theme.id}')">
          <div class="theme-palette-preview ${theme.previewClass}">
            ${previewChipHtml}
          </div>
          <div class="theme-card-info">
            <div class="theme-name">
              <svg class="item-title-icon ${theme.id}-icon"><use href="#${theme.icon}"/></svg>
              <span>${theme.name}</span>
            </div>
            <div class="theme-desc">${theme.desc}</div>
          </div>
          ${btnHtml}
        </div>
      `;
    });
    themesGrid.innerHTML = html;
  }

  // 4. Сетка стилей никнейма (для CEO и Модераторов)
  const nameStyleBlock = document.getElementById('adminNameStyleBlock');
  const nameStylesGrid = document.getElementById('profileNameStylesGrid');

  if (nameStyleBlock && nameStylesGrid) {
    if (isCEO || isMod) {
      nameStyleBlock.style.display = 'block';
      const currentNameStyle = user?.nameStyle || 'default';

      let availableStyles = [
        { id: 'default', name: 'Стандартный стиль', desc: 'Классический цвет никнейма (или золотой при наличии Premium)', previewClass: '' }
      ];

      if (isCEO) {
        availableStyles.push(
          { id: 'ga_inferno', name: 'CEO Inferno Blood', desc: 'Анимированный адско-багровый градиент с искрами и пламенем ярости', previewClass: 'name-style-ga-inferno' },
          { id: 'ga_void', name: 'CEO Obsidian Gold', desc: 'Императорский градиент чистого золота, титана и темного обсидиана', previewClass: 'name-style-ga-void' }
        );
      } else if (isMod) {
        availableStyles.push(
          { id: 'mod_emerald', name: 'Mod Emerald Matrix', desc: 'Сияющий изумрудный кибер-градиент команды модерации Lobbivo', previewClass: 'name-style-mod-emerald' }
        );
      }

      let stylesHtml = '';
      availableStyles.forEach(style => {
        const isSelected = currentNameStyle === style.id;
        const activeClass = isSelected ? ' active' : '';

        let btnHtml = '';
        if (isSelected) {
          btnHtml = `<div class="btn-custom-action btn-active"><svg><use href="#icon-check-circle"/></svg> <span>Выбрано</span></div>`;
        } else {
          btnHtml = `<button type="button" class="btn-custom-action btn-equip" onclick="applyNameStyleFromProfile('${style.id}')"><span>Применить</span></button>`;
        }

        stylesHtml += `
          <div class="custom-name-style-card${activeClass}" data-style-id="${style.id}">
            <div class="name-style-preview-box">
              <span class="preview-name-text ${style.previewClass}">${escapeHtml(current || 'Игрок')}</span>
            </div>
            <div class="name-style-card-info">
              <div class="name-style-title">${style.name}</div>
              <div class="name-style-desc">${style.desc}</div>
            </div>
            ${btnHtml}
          </div>
        `;
      });
      nameStylesGrid.innerHTML = stylesHtml;
    } else {
      nameStyleBlock.style.display = 'none';
    }
  }
}

function applyNameStyleFromProfile(styleId) {
  const current = AppState.currentUser;
  if (!current || !AppState.users[current]) return;

  const user = AppState.users[current];
  user.nameStyle = styleId;
  saveUsers(current);

  renderProfile();
  renderProfileCustomization();
  if (typeof renderWorldChat === 'function') renderWorldChat();
  if (typeof updateHeaderAvatar === 'function') updateHeaderAvatar();
  if (typeof updateUI === 'function') updateUI();

  showNotification('Стиль ника обновлён', 'Новый стиль никнейма успешно активирован!');
}
window.applyNameStyleFromProfile = applyNameStyleFromProfile;

// Алиас для обратной совместимости
function renderSettingsCustomization() {
  renderProfileCustomization();
}

function equipFrameFromProfile(frameId) {
  const current = AppState.currentUser;
  if (!current || !AppState.users[current]) {
    showNotification('Требуется вход', 'Войдите в аккаунт, чтобы надеть рамку');
    showAuthModal('login');
    return;
  }

  const user = AppState.users[current];
  user.equippedFrame = frameId;
  saveUsers(current);

  renderProfile();
  if (typeof renderWorldChat === 'function') renderWorldChat();
  if (typeof renderPlayers === 'function') renderPlayers(AppState.selectedGameFilter);
  if (typeof updateUI === 'function') updateUI();

  const frameDef = FRAME_DEFINITIONS.find(f => f.id === frameId);
  showNotification('Рамка установлена', frameId === 'none' ? 'Установлен стандартный аватар без рамки' : `Надета рамка: ${frameDef?.name || frameId}`);
}

function applyThemeFromProfile(themeId) {
  const current = AppState.currentUser;
  const inventory = current ? getUserInventory(current) : { frames: [], themes: [], boosts: 0 };
  const isFree = (themeId === 'default' || themeId === 'lobbivo');
  const isOwned = isFree || inventory.themes.includes(themeId);

  if (!isOwned) {
    showNotification('Тема не куплена', 'Откройте магазин, чтобы приобрести данную тему оформления');
    openCoinModal('shop');
    return;
  }

  const themeDef = THEME_DEFINITIONS.find(t => t.id === themeId);
  const themeName = themeDef?.name || themeId;

  showSystemLoader('Применяю тему...', 500, () => {
    saveTheme(themeId);
    renderProfile();
    showNotification('Тема изменена', `Активирована тема: ${themeName}`);
  });
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
    const isGif = file.type === 'image/gif' || (file.name && file.name.toLowerCase().endsWith('.gif'));

    if (isGif && !isUserPremium(current)) {
      showNotification('Lobbivo Premium', 'Для установки GIF-аватарок необходим статус Lobbivo Premium! Перейдите во вкладку Магазин.');
      if (typeof openCoinModal === 'function') openCoinModal('shop');
      return;
    }

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
  data.tags = Array.isArray(currentProfileEditingTags) ? [...currentProfileEditingTags] : [];

  if (newUsername && newUsername !== oldUsername) {
    if (AppState.users[newUsername]) {
      showNotification('Ошибка', 'Пользователь с таким ником уже существует!');
      return;
    }
    renameUser(oldUsername, newUsername);
  } else {
    saveUsers(oldUsername, true);
    renderProfile();
    updateGameCounts();
    switchProfileTab('overview');
    showNotification('Успешно', 'Профиль обновлен!');
  }
}

function renameUser(oldName, newName) {
  AppState.users[newName] = { ...AppState.users[oldName] };
  delete AppState.users[oldName];

  // Миграция истории сообщений
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
  
  updateUI();
  renderProfile();
  updateGameCounts();
  switchProfileTab('overview');
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
  localStorage.removeItem('squad_session');

  updateUI();
  showNotification('Аккаунт удален', 'Ваш аккаунт был успешно удален.');
  switchPage('pageGames');
}

// ============================================================
//  11. СИСТЕМА КАСТОМНЫХ ТЕГОВ ПРОФИЛЯ (CUSTOM GAMER TAGS)
// ============================================================

const PRESET_PROFILE_TAGS = [
  'Снайпер / Sniper',
  'Саппорт / Support',
  'Капитан / IGL',
  'Рифлер / Fragger',
  'Chill / Без токсика',
  '18+ Mature',
  'Voice / Микрофон ON',
  'Tryhard / Only Win',
  'Турниры / FastCup',
  'Ночной прайм',
  'Full-time Gamer',
  'Новичок / Rookie'
];

let currentProfileEditingTags = [];

function initProfileEditingTags(username) {
  if (!username) {
    currentProfileEditingTags = [];
  } else {
    currentProfileEditingTags = [...getUserCustomTags(username)];
  }
  renderCustomTagsUI();
}

function renderCustomTagsUI() {
  const activeList = document.getElementById('profileActiveTagsList');
  const heroList = document.getElementById('profileHeroTagsList');
  const counterEl = document.getElementById('profileTagsCounter');
  const presetGrid = document.getElementById('profilePresetTagsGrid');

  // 1. Счетчик
  if (counterEl) {
    counterEl.textContent = `${currentProfileEditingTags.length} / 6`;
    counterEl.classList.toggle('full', currentProfileEditingTags.length >= 6);
  }

  // 2. Теги в шапке Hero баннера
  if (heroList) {
    if (currentProfileEditingTags.length === 0) {
      heroList.innerHTML = '';
    } else {
      heroList.innerHTML = currentProfileEditingTags.map(t => {
        return `<span class="profile-hero-tag-pill">${escapeHtml(t)}</span>`;
      }).join('');
    }
  }

  // 3. Активные теги в форме редактирования
  if (activeList) {
    if (currentProfileEditingTags.length === 0) {
      activeList.innerHTML = `
        <div class="no-custom-tags-hint">
          <svg style="width:14px;height:14px;display:inline-block;vertical-align:-2px;margin-right:4px;"><use href="#icon-sparkles"/></svg>
          Теги ещё не выбраны. Выберите популярные теги ниже или создайте свой!
        </div>
      `;
    } else {
      activeList.innerHTML = currentProfileEditingTags.map((t, idx) => {
        return `
          <div class="active-tag-chip">
            <span class="active-tag-text">${escapeHtml(t)}</span>
            <button type="button" class="btn-remove-tag-chip" onclick="removeUserCustomTag(${idx})" title="Удалить тег">
              <svg style="width:12px;height:12px;"><use href="#icon-close"/></svg>
            </button>
          </div>
        `;
      }).join('');
    }
  }

  // 4. Популярные пресеты
  if (presetGrid) {
    presetGrid.innerHTML = PRESET_PROFILE_TAGS.map(preset => {
      const isAdded = currentProfileEditingTags.includes(preset);
      return `
        <button type="button" class="btn-preset-chip ${isAdded ? 'active-added' : ''}" onclick="toggleUserPresetTag('${escapeHtml(preset)}')">
          <span>${escapeHtml(preset)}</span>
          ${isAdded 
            ? '<svg style="width:12px;height:12px;"><use href="#icon-check"/></svg>' 
            : '<svg style="width:12px;height:12px;"><use href="#icon-plus"/></svg>'
          }
        </button>
      `;
    }).join('');
  }
}

function addUserCustomTag(rawTag) {
  if (!rawTag) return;
  let tag = String(rawTag).trim();
  if (!tag) return;

  // Ограничение по длине
  if (tag.length > 20) {
    tag = tag.slice(0, 20);
  }

  // Автоматический префикс # если нет эмодзи и спецсимволов
  if (!tag.startsWith('#') && !tag.match(/^[^\p{L}\p{N}]/u)) {
    tag = '#' + tag;
  }

  if (currentProfileEditingTags.length >= 6) {
    showNotification('Лимит тегов', 'Вы можете добавить максимум 6 тегов');
    return;
  }

  if (currentProfileEditingTags.includes(tag)) {
    showNotification('Тег уже добавлен', 'Этот тег уже есть в вашем списке');
    return;
  }

  currentProfileEditingTags.push(tag);
  renderCustomTagsUI();

  const input = document.getElementById('customTagInput');
  if (input) {
    input.value = '';
    input.focus();
  }
}

function removeUserCustomTag(index) {
  if (index >= 0 && index < currentProfileEditingTags.length) {
    currentProfileEditingTags.splice(index, 1);
    renderCustomTagsUI();
  }
}

function toggleUserPresetTag(preset) {
  const existingIdx = currentProfileEditingTags.indexOf(preset);
  if (existingIdx !== -1) {
    removeUserCustomTag(existingIdx);
  } else {
    if (currentProfileEditingTags.length >= 6) {
      showNotification('Лимит тегов', 'Вы можете добавить максимум 6 тегов');
      return;
    }
    currentProfileEditingTags.push(preset);
    renderCustomTagsUI();
  }
}

function initProfileCustomTagsControls() {
  const addBtn = document.getElementById('addCustomTagBtn');
  const tagInput = document.getElementById('customTagInput');

  if (addBtn && tagInput) {
    addBtn.addEventListener('click', () => {
      addUserCustomTag(tagInput.value);
    });

    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addUserCustomTag(tagInput.value);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', initProfileCustomTagsControls);

// ============================================================
//  СПИСОК ДРУЗЕЙ (FRIENDS LIST MANAGEMENT)
// ============================================================

function renderProfileFriends() {
  const container = document.getElementById('profileFriendsList');
  const counterEl = document.getElementById('profileFriendsCounter');
  if (!container) return;

  if (!AppState.currentUser) {
    container.innerHTML = `<div class="friends-empty-box">Войдите в аккаунт, чтобы просматривать список друзей.</div>`;
    if (counterEl) counterEl.textContent = '0';
    return;
  }

  const current = AppState.currentUser;
  const user = AppState.users[current];
  const friends = (user && Array.isArray(user.friends)) ? user.friends.filter(Boolean) : [];

  if (counterEl) {
    counterEl.textContent = friends.length;
  }

  const headerFriendsCount = document.getElementById('headerFriendsCount');
  if (headerFriendsCount) {
    headerFriendsCount.textContent = friends.length > 0 ? friends.length : '';
    headerFriendsCount.style.display = friends.length > 0 ? 'inline-block' : 'none';
  }

  if (friends.length === 0) {
    container.innerHTML = `
      <div class="friends-empty-box">
        <div class="friends-empty-icon">
          <svg style="width:36px;height:36px;color:var(--text-muted);"><use href="#icon-users"/></svg>
        </div>
        <div class="friends-empty-title">Список друзей пуст</div>
        <div class="friends-empty-sub">
          Находите тиммейтов в карточках игр, отправляйте заявки в друзья или принимайте предложения в чате!
        </div>
      </div>
    `;
    return;
  }

  let html = '<div class="profile-friends-grid">';
  friends.forEach(friendUsername => {
    const fData = AppState.users[friendUsername] || {};
    const avatarSrc = fData.avatar || 'img/avatars/user-default.png';
    const frameId = typeof getUserEquippedFrame === 'function' ? getUserEquippedFrame(friendUsername) : 'none';
    const isOnline = !!fData.isOnline;
    const gameObj = (typeof GAMES !== 'undefined' && GAMES.find(g => g.id === fData.game)) || { name: 'CS 2', icon: 'icon-csgo' };
    const isCEO = typeof isUserCEO === 'function' && isUserCEO(friendUsername);
    const isMod = typeof isUserModerator === 'function' && isUserModerator(friendUsername);
    const safeFriend = escapeHtml(friendUsername);

    let roleBadge = '';
    if (isCEO) {
      roleBadge = `<span class="profile-ceo-badge mini" title="CEO"><svg class="mini-svg" style="width:10px;height:10px;margin-right:2px;"><use href="#icon-crown"/></svg>CEO</span>`;
    } else if (isMod) {
      roleBadge = `<span class="profile-mod-badge mini" title="Модератор"><svg class="mini-svg" style="width:10px;height:10px;margin-right:2px;"><use href="#icon-admin-shield"/></svg>Модератор</span>`;
    }

    html += `
      <div class="friend-card" data-friend-username="${safeFriend}">
        <div class="friend-card-main" onclick="if(typeof openUserQuickPopover==='function') openUserQuickPopover('${safeFriend}', event)">
          <div class="avatar-frame-wrap ${frameId !== 'none' ? 'frame-' + frameId : ''} friend-avatar-wrap">
            <img src="${avatarSrc}" alt="${safeFriend}" class="friend-avatar-img">
            <span class="friend-online-dot ${isOnline ? 'online' : 'offline'}"></span>
          </div>
          <div class="friend-info">
            <div class="friend-name-row">
              <span class="friend-name ${typeof getUserNameClass === 'function' ? getUserNameClass(friendUsername) : ''}">${safeFriend}</span>
              ${roleBadge}
            </div>
            <div class="friend-game-pill">
              <svg style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:3px;"><use href="#${gameObj.icon || 'icon-game'}"/></svg>
              <span>${escapeHtml(gameObj.name)}</span>
            </div>
          </div>
        </div>
        <div class="friend-card-actions">
          <button type="button" class="btn btn-sm btn-friend-chat" onclick="if(typeof initiateChatWith==='function') initiateChatWith('${safeFriend}')" title="Написать в ЛС">
            <svg style="width:14px;height:14px;margin-right:4px;"><use href="#icon-chat"/></svg>
            <span>Чат</span>
          </button>
          <button type="button" class="btn btn-sm btn-friend-remove" onclick="handleRemoveFriend('${safeFriend}')" title="Удалить из друзей">
            <svg style="width:14px;height:14px;margin-right:4px;"><use href="#icon-trash"/></svg>
            <span>Удалить</span>
          </button>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

function handleRemoveFriend(targetUsername) {
  if (!AppState.currentUser || !targetUsername) return;
  if (!confirm(`Вы действительно хотите удалить ${targetUsername} из списка друзей?`)) return;

  removeFriend(AppState.currentUser, targetUsername);
  showNotification('Друг удалён', `Пользователь ${targetUsername} удален из списка друзей`);

  renderProfileFriends();
  if (AppState.chatPartner === targetUsername && typeof checkFriendBannerStatus === 'function') {
    checkFriendBannerStatus(targetUsername);
  }
}

window.renderProfileFriends = renderProfileFriends;
window.handleRemoveFriend = handleRemoveFriend;