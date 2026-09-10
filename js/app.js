// ============================================================
//  ГЛАВНОЕ ПРИЛОЖЕНИЕ (MAIN APPLICATION CONTROLLER)
// ============================================================

function showSystemLoader(message = 'Загрузка...', duration = 650, callback = null) {
  const loader = document.getElementById('systemLoaderOverlay');
  const textEl = document.getElementById('loaderStatusText');
  if (!loader) {
    if (typeof callback === 'function') callback();
    return;
  }
  if (textEl) textEl.textContent = message || 'Загрузка...';
  loader.classList.add('show');

  setTimeout(() => {
    if (typeof callback === 'function') {
      try {
        callback();
      } catch (err) {
        console.error('Error in loader callback:', err);
      }
    }
    setTimeout(() => {
      loader.classList.remove('show');
    }, 120);
  }, duration);
}

function switchPage(pageId) {
  if (typeof closeChat === 'function') closeChat();
  if (typeof closeCoinModal === 'function') closeCoinModal();
  if (typeof closeShopItemPreview === 'function') closeShopItemPreview();
  const avatarDropdown = document.getElementById('avatarDropdown');
  if (avatarDropdown) avatarDropdown.classList.remove('open');

  const pages = document.querySelectorAll('.page');
  const targetPage = document.getElementById(pageId);
  if (!targetPage) return;

  pages.forEach(p => {
    if (p.classList.contains('active') && p.id !== pageId) {
      p.classList.remove('active');
      p.classList.add('page-exit');
      setTimeout(() => {
        p.classList.remove('page-exit');
        p.style.display = 'none';
      }, 200);
    }
  });

  setTimeout(() => {
    targetPage.style.display = 'block';
    targetPage.classList.add('active', 'page-enter');
    setTimeout(() => {
      targetPage.classList.remove('page-enter');
    }, 300);
  }, 200);

  // Обновление активного пункта в навигации шапки
  document.querySelectorAll('.header-nav .nav-link').forEach(link => {
    if (link.dataset.nav === pageId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  if (pageId === 'pageProfile') {
    if (typeof renderProfile === 'function') renderProfile();
    if (typeof renderProfileCustomization === 'function') renderProfileCustomization();
    if (typeof renderMySquads === 'function') renderMySquads();
  } else if (pageId === 'pageFriends') {
    if (typeof renderFriendsPage === 'function') renderFriendsPage();
  } else if (pageId === 'pageSettings') {
    if (typeof renderPrivacySettings === 'function') renderPrivacySettings();
    if (typeof renderBlacklistSettings === 'function') renderBlacklistSettings();
  }

  // Скролл вверх при смене страницы
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showNotification(title, body) {
  const notif = document.getElementById('notification');
  const titleEl = document.getElementById('notifTitle');
  const bodyEl = document.getElementById('notifBody');

  if (!notif || !titleEl || !bodyEl) return;

  titleEl.textContent = title;
  bodyEl.textContent = body;
  notif.classList.add('show');

  clearTimeout(AppState.notificationTimeout);
  AppState.notificationTimeout = setTimeout(() => {
    notif.classList.remove('show');
  }, 4000);
}

// ============================================================
//  ЖАЛОБЫ (COMPLAINTS)
// ============================================================

function openComplaintModal(target) {
  if (!AppState.currentUser) {
    showNotification('Требуется вход', 'Войдите в аккаунт, чтобы отправить жалобу');
    showAuthModal('login');
    return;
  }

  if (target === AppState.currentUser) {
    showNotification('Внимание', 'Вы не можете отправить жалобу на самого себя');
    return;
  }

  const modal = document.getElementById('complaintModal');
  const reasonInput = document.getElementById('complaintReason');
  if (reasonInput) reasonInput.value = '';

  modal.dataset.target = target;
  modal.classList.add('show');
}

function closeComplaintModal() {
  const modal = document.getElementById('complaintModal');
  if (modal) {
    modal.classList.remove('show');
    delete modal.dataset.target;
  }
}

function sendComplaint() {
  if (typeof SecurityShield !== 'undefined' && !SecurityShield.checkRateLimit('complaint')) {
    return;
  }

  const modal = document.getElementById('complaintModal');
  const target = modal.dataset.target;
  const rawReason = (document.getElementById('complaintReason')?.value || '').trim();

  if (!target || target === AppState.currentUser) {
    showNotification('Ошибка', 'Некорректная цель для жалобы');
    return;
  }

  if (!rawReason) {
    showNotification('Ошибка', 'Пожалуйста, укажите причину жалобы');
    return;
  }

  const reason = typeof SecurityShield !== 'undefined' ? SecurityShield.sanitizeText(rawReason, 500) : rawReason;

  if (!Array.isArray(AppState.complaints)) {
    AppState.complaints = [];
  }

  const complaintObj = {
    id: 'comp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    from: AppState.currentUser,
    target: target,
    reason: reason,
    timestamp: Date.now(),
    status: 'pending'
  };

  AppState.complaints.push(complaintObj);
  saveComplaints();

  showNotification('Жалоба отправлена', 'Ваша жалоба передана модераторам');
  closeComplaintModal();
}

// ============================================================
//  СОЗДАНИЕ И РЕДАКТИРОВАНИЕ АНКЕТЫ (CREATE & EDIT SQUAD)
// ============================================================

function openCreateSquadModal(defaultGame = null, editSquadId = null) {
  if (!AppState.currentUser) {
    showNotification('Требуется вход', 'Войдите в аккаунт, чтобы создать анкету');
    showAuthModal('login');
    return;
  }

  const modal = document.getElementById('createSquadModal');
  const modalTitle = document.getElementById('createSquadModalTitle');
  const modalSub = document.getElementById('createSquadModalSub');
  const submitBtnText = document.getElementById('submitSquadBtnText');
  const editIdInput = document.getElementById('squadEditId');
  const squadRank = document.getElementById('squadRank');
  const squadDesc = document.getElementById('squadDescription');
  const gameField = document.getElementById('squadGameField');
  const squadGamePicker = document.getElementById('squadGamePicker');
  const hiddenGameInput = document.getElementById('squadGame');

  const currentUserData = AppState.users[AppState.currentUser];
  let userSquads = currentUserData?.squads;
  if (!Array.isArray(userSquads)) {
    if (userSquads && typeof userSquads === 'object') {
      userSquads = Object.values(userSquads);
      if (currentUserData) currentUserData.squads = userSquads;
    } else {
      userSquads = [];
      if (currentUserData) currentUserData.squads = userSquads;
    }
  }

  // Safely resolve defaultGame parameter (ignore MouseEvent or non-string arguments)
  let initialGame = (typeof defaultGame === 'string' && defaultGame) ? defaultGame : (AppState.selectedGameFilter || 'all');
  let squadToEdit = null;

  if (editSquadId && typeof editSquadId === 'string') {
    squadToEdit = userSquads.find(s => s && s.id === editSquadId);
  }

  if (squadToEdit) {
    if (editIdInput) editIdInput.value = squadToEdit.id;
    if (modalTitle) modalTitle.innerHTML = '<svg><use href="#icon-users"/></svg> <span>Редактировать анкету</span>';
    if (modalSub) modalSub.textContent = 'Обновите параметры и описание вашей анкеты';
    if (submitBtnText) submitBtnText.textContent = 'Сохранить изменения';

    if (squadRank) squadRank.value = squadToEdit.rank || '';
    if (squadDesc) squadDesc.value = squadToEdit.desc || '';
    if (typeof setDevicePickerValue === 'function') {
      setDevicePickerValue('squadDevicePicker', squadToEdit.device || currentUserData?.device || 'PC');
    }
    const currentPartySize = squadToEdit.partySize || '+1';
    const partySizeInput = document.getElementById('squadPartySize');
    if (partySizeInput) partySizeInput.value = currentPartySize;
    document.querySelectorAll('#squadPartySizeSelector .party-size-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.size === currentPartySize);
    });
    initialGame = squadToEdit.game || initialGame;
  } else {
    if (editIdInput) editIdInput.value = '';
    if (squadRank) squadRank.value = '';
    if (squadDesc) squadDesc.value = '';
    if (typeof setDevicePickerValue === 'function') {
      setDevicePickerValue('squadDevicePicker', currentUserData?.device || 'PC');
    }
    const partySizeInput = document.getElementById('squadPartySize');
    if (partySizeInput) partySizeInput.value = '+1';
    document.querySelectorAll('#squadPartySizeSelector .party-size-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.size === '+1');
    });
    if (submitBtnText) submitBtnText.textContent = 'Опубликовать анкету';
  }

  // Remove existing locked badge if any
  const oldLockedBadge = document.getElementById('squadGameLockedBadge');
  if (oldLockedBadge) oldLockedBadge.remove();

  if (initialGame && initialGame !== 'all') {
    const gameObj = GAMES.find(g => g.id === initialGame) || GAMES[0];
    if (!squadToEdit) {
      if (modalTitle) modalTitle.innerHTML = `<svg><use href="#icon-users"/></svg> <span>Анкета: ${escapeHtml(gameObj.name)}</span>`;
      if (modalSub) modalSub.textContent = `Поиск тиммейтов и напарников в ${escapeHtml(gameObj.name)}`;
    }

    if (typeof setGamePickerValue === 'function') setGamePickerValue('squadGamePicker', initialGame);
    if (hiddenGameInput) hiddenGameInput.value = initialGame;

    if (squadGamePicker) squadGamePicker.style.display = 'none';
    if (gameField) {
      gameField.style.display = 'block';
      const lockedHtml = `
        <div class="squad-game-locked-badge" id="squadGameLockedBadge">
          <div class="locked-game-icon"><svg><use href="#${escapeHtml(gameObj.icon)}"/></svg></div>
          <div class="locked-game-info">
            <span class="locked-game-title">${escapeHtml(gameObj.name)}</span>
            <span class="locked-game-sub">Игра выбрана в каталоге</span>
          </div>
        </div>
      `;
      gameField.insertAdjacentHTML('beforeend', lockedHtml);
    }
  } else {
    if (!squadToEdit) {
      if (modalTitle) modalTitle.innerHTML = '<svg><use href="#icon-users"/></svg> <span>Создать анкету</span>';
      if (modalSub) modalSub.textContent = 'Найдите тиммейтов в любой выбранной онлайн-игре';
    }

    const fallbackGame = currentUserData?.game || 'csgo';
    if (typeof setGamePickerValue === 'function') setGamePickerValue('squadGamePicker', fallbackGame);
    if (hiddenGameInput) hiddenGameInput.value = fallbackGame;
    if (squadGamePicker) squadGamePicker.style.display = 'block';
    if (gameField) gameField.style.display = 'block';
  }

  if (modal) modal.classList.add('show');
}

function closeCreateSquadModal() {
  const modal = document.getElementById('createSquadModal');
  if (modal) modal.classList.remove('show');
}

function submitSquad() {
  if (!AppState.currentUser) return;

  if (typeof SecurityShield !== 'undefined' && !SecurityShield.checkRateLimit('squad')) {
    return;
  }

  const editIdInput = document.getElementById('squadEditId');
  const editingId = editIdInput ? editIdInput.value : '';

  const game = document.getElementById('squadGame')?.value || 'csgo';
  const rank = (document.getElementById('squadRank')?.value || '').trim();
  const partySize = document.getElementById('squadPartySize')?.value || '+1';
  const device = document.getElementById('squadDevice')?.value || 'PC';
  const rawDescription = (document.getElementById('squadDescription')?.value || '').trim();

  if (!rawDescription) {
    showNotification('Ошибка', 'Пожалуйста, добавьте описание вашей анкеты');
    return;
  }

  const description = typeof SecurityShield !== 'undefined' ? SecurityShield.sanitizeText(rawDescription, 500) : rawDescription;

  const userData = AppState.users[AppState.currentUser];
  if (!userData) return;

  if (userData.squads && !Array.isArray(userData.squads) && typeof userData.squads === 'object') {
    userData.squads = Object.values(userData.squads);
  }
  if (!Array.isArray(userData.squads)) {
    userData.squads = [];
  }

  if (editingId) {
    const existingIndex = userData.squads.findIndex(s => s.id === editingId);
    if (existingIndex !== -1) {
      userData.squads[existingIndex] = {
        ...userData.squads[existingIndex],
        game,
        rank: rank || 'Не указан',
        partySize,
        device,
        desc: description,
        updatedAt: Date.now()
      };
      showNotification('Анкета обновлена', 'Изменения успешно сохранены!');
    }
  } else {
    // Проверяем, есть ли уже анкета для этой игры
    const duplicateIndex = userData.squads.findIndex(s => s.game === game);
    if (duplicateIndex !== -1) {
      userData.squads[duplicateIndex] = {
        ...userData.squads[duplicateIndex],
        rank: rank || userData.squads[duplicateIndex].rank || 'Не указан',
        partySize,
        device,
        desc: description,
        updatedAt: Date.now()
      };
      showNotification('Анкета обновлена', 'Анкета для этой игры была обновлена!');
    } else {
      userData.squads.push({
        id: 'sq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        game,
        rank: rank || 'Не указан',
        partySize,
        device,
        desc: description,
        createdAt: Date.now(),
        active: true
      });
      showNotification('Анкета опубликована', 'Ваша анкета теперь видна в каталоге игроков!');
    }
  }

  userData.lookingForTeam = true;
  userData.hasCreatedSquad = true;

  saveUsers(AppState.currentUser, true);
  closeCreateSquadModal();

  if (typeof renderMySquads === 'function') renderMySquads();
  renderPlayers(AppState.selectedGameFilter || 'all');
  updateGameCounts();
  updateUI();
}

// ============================================================
//  ВИЗУАЛЬНЫЕ ЭФФЕКТЫ (PARTICLES & RIPPLE)
// ============================================================

function createParticles(theme) {
  const currentTheme = theme || AppState.currentTheme || document.documentElement.getAttribute('data-theme') || 'default';
  const container = document.getElementById('particlesContainer');
  if (!container) return;
  container.innerHTML = '';

  // Оптимизация производительности: на Android и мобильных отключаем тяжелые DOM-частицы во избежание нагрева и расхода батареи
  const isAndroid = (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) || document.documentElement.classList.contains('android-device');
  const isMobile = isAndroid || window.innerWidth <= 768 || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
  if (isMobile) {
    return;
  }

  const frag = document.createDocumentFragment();

  if (currentTheme === 'lobbivo' || currentTheme === 'finder') {
    // В теме Lobbivo летают стилизованные неоновые стеклянные буквы "L"
    const count = 28;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle particle-l';
      p.style.left = `${Math.random() * 96 + 2}%`;
      p.style.animationDuration = `${11 + Math.random() * 15}s`;
      p.style.animationDelay = `${(Math.random() * 10).toFixed(2)}s`;
      
      const fontSize = 14 + Math.random() * 16;
      p.style.fontSize = `${fontSize.toFixed(1)}px`;
      p.style.opacity = `${(0.2 + Math.random() * 0.5).toFixed(2)}`;
      
      const sway = ((Math.random() - 0.5) * 80).toFixed(1);
      const rotInit = ((Math.random() - 0.5) * 35).toFixed(1);
      const rotEnd = ((Math.random() - 0.5) * 120).toFixed(1);
      
      p.style.setProperty('--sway-x', `${sway}px`);
      p.style.setProperty('--rot-init', `${rotInit}deg`);
      p.style.setProperty('--rot-end', `${rotEnd}deg`);
      
      p.innerHTML = '<span class="particle-l-glyph">L</span>';
      frag.appendChild(p);
    }
  } else if (currentTheme === 'crimson') {
    // Огненные искры / тлеющие угли
    const count = 30;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle particle-ember';
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDuration = `${7 + Math.random() * 10}s`;
      p.style.animationDelay = `${(Math.random() * 6).toFixed(2)}s`;
      const size = 3 + Math.random() * 5;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.opacity = `${0.3 + Math.random() * 0.6}`;
      frag.appendChild(p);
    }
  } else if (currentTheme === 'nebula') {
    // Сияющая космическая звездная пыль
    const count = 32;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle particle-star';
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDuration = `${10 + Math.random() * 14}s`;
      p.style.animationDelay = `${(Math.random() * 8).toFixed(2)}s`;
      const size = 2.5 + Math.random() * 5.5;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.opacity = `${0.25 + Math.random() * 0.55}`;
      frag.appendChild(p);
    }
  } else if (currentTheme === 'matrix') {
    // Зеленый терминальный кибер-код
    const glyphs = ['0', '1', '<', '>', '/', '#', '$', 'λ', 'X', 'Z', '7', '9', '%', '&'];
    const count = 26;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle particle-matrix';
      p.style.left = `${Math.random() * 96 + 2}%`;
      p.style.animationDuration = `${9 + Math.random() * 12}s`;
      p.style.animationDelay = `${(Math.random() * 8).toFixed(2)}s`;
      p.style.fontSize = `${(11 + Math.random() * 8).toFixed(0)}px`;
      p.style.opacity = `${(0.25 + Math.random() * 0.6).toFixed(2)}`;
      p.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      frag.appendChild(p);
    }
  } else {
    // Дефолтные неоновые циановые сферы
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDuration = `${14 + Math.random() * 18}s`;
      p.style.animationDelay = `${Math.random() * 8}s`;
      const size = 3 + Math.random() * 5;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.opacity = `${0.12 + Math.random() * 0.28}`;
      frag.appendChild(p);
    }
  }

  container.appendChild(frag);
}

function addRipples() {
  document.addEventListener('click', function(e) {
    const target = e.target.closest('.btn, .send-btn, .game-card, .player-card, .chat-list-item');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    target.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

// ============================================================
//  LOBBIVO COIN & REWARDS HUB (ECONOMY & QUESTS)
// ============================================================

function openCoinModal(tab = 'earn') {
  if (typeof closeChat === 'function') closeChat();
  const modal = document.getElementById('coinModal');
  if (!modal) return;

  switchCoinTab(tab);
  renderCoinModal();
  updateCoinConverterLive();
  modal.classList.add('show');
}

function closeCoinModal() {
  const modal = document.getElementById('coinModal');
  if (modal) modal.classList.remove('show');
}

function switchCoinTab(tab = 'earn') {
  const tabEarnBtn = document.getElementById('tabCoinEarnBtn');
  const tabShopBtn = document.getElementById('tabCoinShopBtn');
  const tabBuyBtn = document.getElementById('tabCoinBuyBtn');
  const earnContent = document.getElementById('coinEarnContent');
  const shopContent = document.getElementById('coinShopContent');
  const buyContent = document.getElementById('coinBuyContent');

  [tabEarnBtn, tabShopBtn, tabBuyBtn].forEach(b => b?.classList.remove('active'));
  if (earnContent) earnContent.style.display = 'none';
  if (shopContent) shopContent.style.display = 'none';
  if (buyContent) buyContent.style.display = 'none';

  if (tab === 'shop') {
    tabShopBtn?.classList.add('active');
    if (shopContent) {
      shopContent.style.display = 'block';
      renderShopItems();
    }
  } else if (tab === 'buy') {
    tabBuyBtn?.classList.add('active');
    if (buyContent) buyContent.style.display = 'block';
  } else {
    tabEarnBtn?.classList.add('active');
    if (earnContent) earnContent.style.display = 'block';
  }
}

const shopState = {
  category: 'frames',
  page: 1,
  perPage: 6
};

function switchShopCategory(cat) {
  shopState.category = cat;
  shopState.page = 1;
  renderShopItems();
}
window.switchShopCategory = switchShopCategory;

function changeShopPage(delta) {
  shopState.page += delta;
  renderShopItems();
}
window.changeShopPage = changeShopPage;

function setShopPage(pageNum) {
  shopState.page = pageNum;
  renderShopItems();
}
window.setShopPage = setShopPage;

function renderShopItems() {
  const current = AppState.currentUser;
  const user = current ? AppState.users[current] : null;
  const isPremium = current ? isUserPremium(current) : false;
  const inventory = current ? getUserInventory(current) : { frames: [], themes: [], nameStyles: [], miniBgs: [], banners: [], boosts: 0 };
  const hasVipBoost = current ? isSquadVipBoosted(current) : false;

  // 1. Обновление кнопок категорий в навигации
  document.querySelectorAll('.shop-cat-btn').forEach(btn => {
    const cat = btn.dataset.cat;
    btn.classList.toggle('active', cat === shopState.category);
  });

  const discountPill = document.getElementById('shopDiscountPill');
  if (discountPill) {
    discountPill.style.display = isPremium ? 'inline-flex' : 'none';
  }

  // Обновление счетчика рамок
  const framesCountEl = document.getElementById('shopFramesCount');
  if (framesCountEl) {
    framesCountEl.textContent = `${FRAME_DEFINITIONS.filter(f => !f.gaOnly && f.id !== 'none').length}`;
  }

  // 2. Мета-информация активной категории
  const catBadge = document.getElementById('shopCatBadge');
  const catBadgeIcon = document.getElementById('shopCatBadgeIcon');
  const catBadgeText = document.getElementById('shopCatBadgeText');
  const catTitle = document.getElementById('shopCatTitle');
  const catDesc = document.getElementById('shopCatDesc');
  const catHeader = document.getElementById('shopActiveCatHeader');
  const dynamicGrid = document.getElementById('shopDynamicGrid');
  const paginationBar = document.getElementById('shopPaginationBar');
  const premiumView = document.getElementById('shopPremiumIntegratedView');

  const catMeta = {
    frames: { title: 'Рамки для аватарок', desc: 'Уникальные анимированные эффекты вокруг вашей аватарки во всех чатах и анкетах', badge: 'ГАРДЕРОБ', icon: '#icon-frame' },
    name_styles: { title: 'Стили и цвета никнейма', desc: 'Косметическая раскраска, градиенты и неоновые переливы вашего никнейма', badge: 'СТИЛЬ НИКА', icon: '#icon-sparkles' },
    mini_bgs: { title: 'Анимированные фоны мини-профиля', desc: 'Живые динамические фоны быстрой карточки профиля при клике на игрока в чате', badge: 'ЖИВЫЕ ФОНЫ', icon: '#icon-sparkles' },
    banners: { title: 'Шапки и обложки профиля', desc: 'Панорамный арт в шапке вашего полного профиля игрока', badge: 'ШАПКА', icon: '#icon-game' },
    themes: { title: 'Темы оформления сайта', desc: 'Глубокая трансформация цветовой схемы интерфейса, космических туманностей и частиц', badge: 'ТЕМЫ', icon: '#icon-palette-shop' },
    premium: { title: 'Lobbivo Premium & VIP Буст', desc: 'Максимальный VIP статус, анимированные GIF-аватарки, корона и закреп анкеты', badge: 'VIP СТАТУС', icon: '#icon-crown' }
  };

  const activeMeta = catMeta[shopState.category] || catMeta.frames;
  if (catTitle) catTitle.textContent = activeMeta.title;
  if (catDesc) catDesc.textContent = activeMeta.desc;
  if (catBadgeText) catBadgeText.textContent = activeMeta.badge;
  if (catBadgeIcon) catBadgeIcon.setAttribute('href', activeMeta.icon);

  // 3. Если выбрана категория 'premium'
  if (shopState.category === 'premium') {
    if (dynamicGrid) dynamicGrid.style.display = 'none';
    if (paginationBar) paginationBar.style.display = 'none';
    if (premiumView) premiumView.style.display = 'block';

    // Статус Premium
    const statusEl = document.getElementById('shopPremiumStatusText');
    const statusBox = document.getElementById('shopPremiumStatusIndicator');
    if (statusEl && statusBox) {
      if (isPremium) {
        statusBox.className = 'shop-premium-status-indicator active';
        if (user.premiumUntil && Number(user.premiumUntil) > Date.now()) {
          const remainingDays = Math.ceil((Number(user.premiumUntil) - Date.now()) / (24 * 60 * 60 * 1000));
          statusEl.textContent = `Активен (${remainingDays} дн.)`;
        } else {
          statusEl.textContent = 'Активен (LIFETIME)';
        }
      } else {
        statusBox.className = 'shop-premium-status-indicator';
        statusEl.textContent = 'Не активен';
      }
    }

    // Кнопки Premium тарифов
    document.querySelectorAll('.btn-buy-premium').forEach(btn => {
      if (isPremium && user?.isPremium === true && !user?.premiumUntil) {
        btn.disabled = true;
        btn.className = 'btn-buy-shop-item btn-buy-premium bought-disabled';
        btn.innerHTML = '<svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"><use href="#icon-check-circle"/></svg><span>Куплено навсегда</span>';
      } else {
        btn.disabled = false;
        const plan = btn.closest('.premium-plan-card')?.dataset.plan;
        btn.textContent = plan === '9999' ? 'Навсегда' : (plan === '30' ? 'Выбрать' : 'Купить');
      }
    });

    // VIP-Буст
    const boostBtn = document.getElementById('btnBuySquadBoost');
    if (boostBtn) {
      if (hasVipBoost && user.vipBoostUntil) {
        const remainingHours = Math.max(1, Math.ceil((Number(user.vipBoostUntil) - Date.now()) / (60 * 60 * 1000)));
        boostBtn.className = 'btn-shop-action btn-buy-boost active';
        boostBtn.textContent = `Закреп активен (ещё ${remainingHours} ч.)`;
        boostBtn.onclick = () => showNotification('VIP-Закреп', `Ваша анкета закреплена в мировом чате ещё ${remainingHours} ч.`);
      } else {
        const cost = isPremium ? 81 : 90;
        boostBtn.className = 'btn-shop-action btn-buy-boost';
        boostBtn.textContent = isPremium ? `Закрепить анкету (${cost} LC -10%)` : `Закрепить анкету (${cost} LC)`;
        boostBtn.onclick = () => buyShopItem('boost', 'vip_squad', 90);
      }
    }
    return;
  }

  // 4. Обычные категории товаров (Рамки, Стили ника, Фоны, Шапки, Темы) - отображаем весь ассортимент
  if (premiumView) premiumView.style.display = 'none';
  if (dynamicGrid) dynamicGrid.style.display = 'grid';

  let itemsList = [];
  if (shopState.category === 'frames') {
    itemsList = FRAME_DEFINITIONS.filter(f => !f.gaOnly && f.id !== 'none');
  } else if (shopState.category === 'name_styles') {
    itemsList = NAME_STYLE_DEFINITIONS.filter(s => s.id !== 'default');
  } else if (shopState.category === 'mini_bgs') {
    itemsList = MINI_BG_DEFINITIONS.filter(b => b.id !== 'default');
  } else if (shopState.category === 'banners') {
    itemsList = BANNER_DEFINITIONS.filter(b => b.id !== 'default');
  } else if (shopState.category === 'themes') {
    itemsList = THEME_DEFINITIONS.filter(t => t.id !== 'default' && t.id !== 'lobbivo');
  }

  let gridHtml = '';
  const avatarContent = (user && user.avatar) ? `<img src="${user.avatar}" alt="${escapeHtml(current)}">` : `<span>${current ? current.slice(0, 2).toUpperCase() : 'VIP'}</span>`;

  itemsList.forEach(item => {
    const rawCost = item.cost || 0;
    const finalCost = isPremium ? Math.round(rawCost * 0.9) : rawCost;
    let isOwned = false;

    if (shopState.category === 'frames') {
      isOwned = inventory.frames.includes(item.id);
    } else if (shopState.category === 'name_styles') {
      isOwned = inventory.nameStyles.includes(item.id);
    } else if (shopState.category === 'mini_bgs') {
      isOwned = inventory.miniBgs.includes(item.id);
    } else if (shopState.category === 'banners') {
      isOwned = inventory.banners.includes(item.id);
    } else if (shopState.category === 'themes') {
      isOwned = inventory.themes.includes(item.id);
    }

    const priceHtml = isPremium ? `
      <div class="shop-price-container">
        <div class="shop-price-main-row">
          <span class="shop-price-old-striked">${rawCost} LC</span>
          <span class="shop-item-curr-price is-discount"><span class="shop-coin-l">L</span> ${finalCost} LC</span>
          <span class="shop-discount-tag-badge">-10% VIP</span>
        </div>
      </div>
    ` : `
      <div class="shop-price-container">
        <div class="shop-price-main-row">
          <span class="shop-item-curr-price"><span class="shop-coin-l">L</span> ${rawCost} LC</span>
        </div>
      </div>
    `;

    const tagBadge = item.tag ? `<span class="item-tag-pill tag-${(item.tag || '').toLowerCase().replace(/\s+/g, '-')}">${escapeHtml(item.tag)}</span>` : '';
    const badgeRow = `<div class="shop-card-badge-row">${tagBadge}<span class="shop-card-try-hint"><svg style="width:11px;height:11px;fill:currentColor;"><use href="#icon-sparkles"/></svg><span>Примерить</span></span></div>`;

    let buyOrEquipBtnHtml = '';
    const itemType = shopState.category === 'frames' ? 'frame' : (shopState.category === 'name_styles' ? 'name_style' : (shopState.category === 'mini_bgs' ? 'mini_bg' : (shopState.category === 'banners' ? 'banner' : 'theme')));

    let isItemEquipped = false;
    if (shopState.category === 'frames') {
      isItemEquipped = getUserAvatarFrame(current) === item.id;
    } else if (shopState.category === 'name_styles') {
      isItemEquipped = getUserNameStyle(current) === item.id;
    } else if (shopState.category === 'mini_bgs') {
      isItemEquipped = getUserEquippedMiniBg(current) === item.id;
    } else if (shopState.category === 'banners') {
      isItemEquipped = getUserEquippedBanner(current) === item.id;
    } else if (shopState.category === 'themes') {
      isItemEquipped = (AppState.currentTheme || localStorage.getItem('squad_theme') || 'default') === item.id;
    }

    if (isItemEquipped) {
      buyOrEquipBtnHtml = `
        <button type="button" class="btn-shop-buy-action is-equipped" disabled>
          <svg style="width:13px;height:13px;display:inline-block;vertical-align:middle;"><use href="#icon-check-circle"/></svg>
          <span>Надето</span>
        </button>
      `;
    } else if (isOwned) {
      buyOrEquipBtnHtml = `
        <button type="button" class="btn-shop-buy-action is-owned" onclick="event.stopPropagation(); equipItemFromShop('${shopState.category}', '${item.id}')">
          <span>Надеть</span>
        </button>
      `;
    } else {
      buyOrEquipBtnHtml = `
        <button type="button" class="btn-shop-buy-action" onclick="event.stopPropagation(); buyShopItem('${itemType}', '${item.id}', ${rawCost})">
          <span>Купить · ${finalCost} LC</span>
        </button>
      `;
    }

    const actionsRowHtml = `
      <div class="shop-card-actions-row">
        <button type="button" class="btn-shop-preview-action" onclick="event.stopPropagation(); openShopItemPreview('${shopState.category}', '${item.id}')" title="Примерить на себе">
          <svg><use href="#icon-sparkles"/></svg>
          <span>Примерить</span>
        </button>
        ${buyOrEquipBtnHtml}
      </div>
    `;

    if (shopState.category === 'frames') {
      gridHtml += `
        <div class="shop-item-card shop-frame-card-pro" data-id="${item.id}" onclick="openShopItemPreview('frames', '${item.id}')" title="Нажмите для примерки">
          ${badgeRow}
          <div class="frame-preview-box">
            <div class="avatar-frame-wrap frame-${item.id}">
              <div class="frame-preview-avatar">${avatarContent}</div>
            </div>
          </div>
          <div class="frame-card-info">
            <div class="frame-name"><svg class="item-title-icon ${item.id}-icon"><use href="#${item.icon}"/></svg> <span>${escapeHtml(item.name)}</span></div>
            <div class="frame-desc">${escapeHtml(item.desc)}</div>
            ${priceHtml}
          </div>
          ${actionsRowHtml}
        </div>
      `;
    } else if (shopState.category === 'name_styles') {
      gridHtml += `
        <div class="shop-item-card shop-name-style-card-pro" data-id="${item.id}" onclick="openShopItemPreview('name_styles', '${item.id}')" title="Нажмите для примерки">
          ${badgeRow}
          <div class="name-style-preview-box">
            <span class="preview-name-text name-style-${item.id}">${escapeHtml(current || 'Игрок')}</span>
          </div>
          <div class="frame-card-info">
            <div class="frame-name"><svg class="item-title-icon"><use href="#icon-sparkles"/></svg> <span>${escapeHtml(item.name)}</span></div>
            <div class="frame-desc">${escapeHtml(item.desc)}</div>
            ${priceHtml}
          </div>
          ${actionsRowHtml}
        </div>
      `;
    } else if (shopState.category === 'mini_bgs') {
      gridHtml += `
        <div class="shop-item-card shop-mini-bg-card-pro" data-id="${item.id}" onclick="openShopItemPreview('mini_bgs', '${item.id}')" title="Нажмите для примерки">
          ${badgeRow}
          <div class="mini-bg-preview-canvas mini-bg-${item.id}">
            <div class="mini-bg-preview-overlay">
              <span class="mini-bg-preview-tag">${escapeHtml(item.name)}</span>
            </div>
          </div>
          <div class="frame-card-info">
            <div class="frame-name"><svg class="item-title-icon"><use href="#icon-sparkles"/></svg> <span>${escapeHtml(item.name)}</span></div>
            <div class="frame-desc">${escapeHtml(item.desc)}</div>
            ${priceHtml}
          </div>
          ${actionsRowHtml}
        </div>
      `;
    } else if (shopState.category === 'banners') {
      gridHtml += `
        <div class="shop-item-card shop-banner-card-pro" data-id="${item.id}" onclick="openShopItemPreview('banners', '${item.id}')" title="Нажмите для примерки">
          ${badgeRow}
          <div class="banner-preview-box banner-${item.id}">
            <div class="banner-preview-overlay">
              <span class="banner-preview-tag">${escapeHtml(item.name)}</span>
            </div>
          </div>
          <div class="frame-card-info">
            <div class="frame-name"><svg class="item-title-icon"><use href="#icon-game"/></svg> <span>${escapeHtml(item.name)}</span></div>
            <div class="frame-desc">${escapeHtml(item.desc)}</div>
            ${priceHtml}
          </div>
          ${actionsRowHtml}
        </div>
      `;
    } else if (shopState.category === 'themes') {
      let previewChipHtml = '';
      if (item.id === 'nebula') {
        previewChipHtml = `<div class="preview-theme-chip"><svg class="preview-theme-icon"><use href="#icon-palette-shop"/></svg><span class="preview-theme-tag">NEBULA</span></div>`;
      } else if (item.id === 'crimson') {
        previewChipHtml = `<div class="preview-theme-chip"><svg class="preview-theme-icon"><use href="#icon-flame"/></svg><span class="preview-theme-tag">CRIMSON</span></div>`;
      } else if (item.id === 'matrix') {
        previewChipHtml = `<div class="preview-theme-chip"><svg class="preview-theme-icon"><use href="#icon-nodes-menu"/></svg><span class="preview-theme-tag">MATRIX</span></div>`;
      } else {
        previewChipHtml = `<div class="preview-theme-chip"><svg class="preview-theme-icon"><use href="#${item.icon}"/></svg><span class="preview-theme-tag">${escapeHtml(item.name.slice(0,6))}</span></div>`;
      }

      gridHtml += `
        <div class="shop-item-card shop-theme-card-pro" data-id="${item.id}" onclick="openShopItemPreview('themes', '${item.id}')" title="Нажмите для примерки">
          <div class="shop-card-badge-row"><span class="item-tag-pill tag-theme">ТЕМА</span><span class="shop-card-try-hint"><svg style="width:11px;height:11px;fill:currentColor;"><use href="#icon-sparkles"/></svg><span>Примерить</span></span></div>
          <div class="theme-palette-preview ${item.previewClass}">
            ${previewChipHtml}
          </div>
          <div class="frame-card-info">
            <div class="frame-name"><svg class="item-title-icon ${item.id}-icon"><use href="#${item.icon}"/></svg> <span>${escapeHtml(item.name)}</span></div>
            <div class="frame-desc">${escapeHtml(item.desc)}</div>
            ${priceHtml}
          </div>
          ${actionsRowHtml}
        </div>
      `;
    }
  });

  if (dynamicGrid) dynamicGrid.innerHTML = gridHtml;

  // 5. Скрываем ненужную пагинацию
  if (paginationBar) {
    paginationBar.style.display = 'none';
  }
}

// Быстрая экипировка предмета прямо из магазина
function equipItemFromShop(category, itemId) {
  const current = AppState.currentUser;
  if (!current || !AppState.users[current]) {
    showNotification('Требуется вход', 'Войдите в аккаунт, чтобы надеть предмет');
    showAuthModal('login');
    return;
  }

  const user = AppState.users[current];
  if (category === 'frames') {
    user.equippedFrame = itemId;
  } else if (category === 'name_styles') {
    user.nameStyle = itemId;
  } else if (category === 'mini_bgs') {
    user.equippedMiniBg = itemId;
  } else if (category === 'banners') {
    user.equippedBanner = itemId;
  } else if (category === 'themes') {
    saveTheme(itemId);
  }

  saveUsers(current);
  renderShopItems();
  if (typeof renderProfileCustomization === 'function') renderProfileCustomization();
  if (typeof renderProfile === 'function') renderProfile();
  if (typeof renderWorldChat === 'function') renderWorldChat();
  if (typeof renderPlayers === 'function') renderPlayers(AppState.selectedGameFilter);
  if (typeof updateUI === 'function') updateUI();

  showNotification('Успешно экипировано', 'Предмет активирован на вашем профиле!');
}
window.equipItemFromShop = equipItemFromShop;

function buyShopItem(type, id, cost, duration = 30) {
  const current = AppState.currentUser;
  if (!current) {
    showNotification('Требуется вход', 'Войдите или зарегистрируйтесь, чтобы совершать покупки!');
    showAuthModal('login');
    return;
  }

  const user = AppState.users[current];
  if (!user) return;

  const isPremium = isUserPremium(current);
  const finalCost = (isPremium && type !== 'premium') ? Math.round(cost * 0.9) : cost;
  const userCoins = typeof user.coins === 'number' ? user.coins : 0;

  if (userCoins < finalCost) {
    const diff = finalCost - userCoins;
    showNotification('Недостаточно монет', `Вам не хватает ${diff} LC. Выполните задания или пополните баланс!`);
    switchCoinTab('buy');
    return;
  }

  // Списание монет
  user.coins = userCoins - finalCost;

  if (type === 'premium') {
    const now = Date.now();
    const currentUntil = (user.premiumUntil && Number(user.premiumUntil) > now) ? Number(user.premiumUntil) : now;
    user.isPremium = true;
    user.premiumUntil = currentUntil + (duration * 24 * 60 * 60 * 1000);
    showNotification('Поздравляем с VIP!', `Статус Lobbivo Premium успешно продлен на ${duration} дней!`);
  } else if (type === 'frame') {
    if (!user.inventory || typeof user.inventory !== 'object') user.inventory = { frames: [], themes: [], nameStyles: [], miniBgs: [], banners: [], boosts: 0 };
    if (!Array.isArray(user.inventory.frames)) user.inventory.frames = [];
    if (!user.inventory.frames.includes(id)) {
      user.inventory.frames.push(id);
    }
    user.equippedFrame = id;
    const def = FRAME_DEFINITIONS.find(f => f.id === id);
    showNotification('Рамка куплена и надета!', `Рамка «${def?.name || id}» успешно добавлена в гардероб и активирована!`);
  } else if (type === 'name_style') {
    if (!user.inventory || typeof user.inventory !== 'object') user.inventory = { frames: [], themes: [], nameStyles: [], miniBgs: [], banners: [], boosts: 0 };
    if (!Array.isArray(user.inventory.nameStyles)) user.inventory.nameStyles = [];
    if (!user.inventory.nameStyles.includes(id)) {
      user.inventory.nameStyles.push(id);
    }
    user.nameStyle = id;
    const def = NAME_STYLE_DEFINITIONS.find(s => s.id === id);
    showNotification('Стиль ника куплен и надет!', `Стиль «${def?.name || id}» успешно добавлен и активирован!`);
  } else if (type === 'mini_bg') {
    if (!user.inventory || typeof user.inventory !== 'object') user.inventory = { frames: [], themes: [], nameStyles: [], miniBgs: [], banners: [], boosts: 0 };
    if (!Array.isArray(user.inventory.miniBgs)) user.inventory.miniBgs = [];
    if (!user.inventory.miniBgs.includes(id)) {
      user.inventory.miniBgs.push(id);
    }
    user.equippedMiniBg = id;
    const def = MINI_BG_DEFINITIONS.find(b => b.id === id);
    showNotification('Фон мини-профиля куплен!', `Фон «${def?.name || id}» успешно добавлен и активирован!`);
  } else if (type === 'banner') {
    if (!user.inventory || typeof user.inventory !== 'object') user.inventory = { frames: [], themes: [], nameStyles: [], miniBgs: [], banners: [], boosts: 0 };
    if (!Array.isArray(user.inventory.banners)) user.inventory.banners = [];
    if (!user.inventory.banners.includes(id)) {
      user.inventory.banners.push(id);
    }
    user.equippedBanner = id;
    const def = BANNER_DEFINITIONS.find(b => b.id === id);
    showNotification('Шапка профиля куплена!', `Обложка «${def?.name || id}» успешно добавлена и активирована!`);
  } else if (type === 'boost') {
    const now = Date.now();
    const currentUntil = (user.vipBoostUntil && Number(user.vipBoostUntil) > now) ? Number(user.vipBoostUntil) : now;
    user.vipBoostUntil = currentUntil + (24 * 60 * 60 * 1000);
    user.lookingForTeam = true;
    user.hasCreatedSquad = true;
    showNotification('VIP-Закреп активирован!', 'Ваша анкета закреплена в шапке мирового чата на 24 часа!');
  } else if (type === 'theme') {
    if (!user.inventory || typeof user.inventory !== 'object') user.inventory = { frames: [], themes: [], nameStyles: [], miniBgs: [], banners: [], boosts: 0 };
    if (!Array.isArray(user.inventory.themes)) user.inventory.themes = [];
    if (!user.inventory.themes.includes(id)) {
      user.inventory.themes.push(id);
    }
    saveTheme(id);
    const def = THEME_DEFINITIONS.find(t => t.id === id);
    showNotification('Тема куплена и активирована!', `Тема «${def?.name || id}» успешно применена!`);
  }

  saveUsers(current);
  renderCoinModal();
  renderShopItems();
  if (typeof renderProfileCustomization === 'function') renderProfileCustomization();
  if (typeof renderProfile === 'function') renderProfile();
  if (typeof renderWorldChat === 'function') renderWorldChat();
  if (typeof renderPlayers === 'function') renderPlayers(AppState.selectedGameFilter);
  if (typeof updateUI === 'function') updateUI();

  // Звуковой эффект
  if (typeof playNotificationSound === 'function') {
    playNotificationSound();
  }
}
window.buyShopItem = buyShopItem;

function equipItemFromShop(category, itemId) {
  const current = AppState.currentUser;
  if (!current || !AppState.users[current]) {
    showNotification('Требуется вход', 'Войдите в аккаунт, чтобы надеть предмет');
    showAuthModal('login');
    return;
  }

  const user = AppState.users[current];
  let itemName = itemId;

  if (category === 'frames') {
    user.equippedFrame = itemId;
    const def = FRAME_DEFINITIONS.find(f => f.id === itemId);
    if (def) itemName = def.name;
  } else if (category === 'name_styles') {
    user.nameStyle = itemId;
    const def = NAME_STYLE_DEFINITIONS.find(s => s.id === itemId);
    if (def) itemName = def.name;
  } else if (category === 'mini_bgs') {
    user.equippedMiniBg = itemId;
    const def = MINI_BG_DEFINITIONS.find(b => b.id === itemId);
    if (def) itemName = def.name;
  } else if (category === 'banners') {
    user.equippedBanner = itemId;
    const def = BANNER_DEFINITIONS.find(b => b.id === itemId);
    if (def) itemName = def.name;
  } else if (category === 'themes') {
    saveTheme(itemId);
    const def = THEME_DEFINITIONS.find(t => t.id === itemId);
    if (def) itemName = def.name;
  }

  saveUsers(current);
  renderShopItems();
  if (typeof renderProfileCustomization === 'function') renderProfileCustomization();
  if (typeof renderProfile === 'function') renderProfile();
  if (typeof renderWorldChat === 'function') renderWorldChat();
  if (typeof renderPlayers === 'function') renderPlayers(AppState.selectedGameFilter);
  if (typeof updateUI === 'function') updateUI();

  showNotification('Предмет надет!', `Вы успешно активировали «${itemName}»!`);
}
window.equipItemFromShop = equipItemFromShop;

// ============================================================
//  ИНТЕРАКТИВНЫЙ РЕЖИМ ПРИМЕРКИ И ПРЕДОСМОТРА ТОВАРОВ (LIVE SHOWCASE)
// ============================================================

// Тестовое интерактивное состояние внутри модалки предпросмотра
const ShopPreviewState = {
  activeCategory: 'frames',
  activeItemId: 'default',
  testStatus: 'in_game', // 'online' | 'in_game' | 'away'
  testPraiseCount: 48,
  testFrameId: null
};

function openShopItemPreview(category, itemId, options = {}) {
  const modal = document.getElementById('shopPreviewModal');
  if (!modal) return;

  ShopPreviewState.activeCategory = category;
  ShopPreviewState.activeItemId = itemId;
  if (options.testFrameId !== undefined) ShopPreviewState.testFrameId = options.testFrameId;

  const current = AppState.currentUser;
  const user = current ? (AppState.users[current] || {}) : {};
  const inventory = current ? getUserInventory(current) : { frames: [], themes: [], nameStyles: [], miniBgs: [], banners: [], boosts: 0 };
  const isPremium = isUserPremium(current);
  const userCoins = typeof user.coins === 'number' ? user.coins : 0;

  let item = null;
  let catLabel = 'ПРИМЕРКА ПРЕДМЕТА';
  let catIcon = 'icon-sparkles';
  let typeBadge = '';
  let categoryItems = [];
  let selectorTitle = '⚡ Быстрое переключение для теста:';

  if (category === 'frames') {
    item = FRAME_DEFINITIONS.find(f => f.id === itemId);
    catLabel = 'РАМКА ДЛЯ АВАТАРА';
    catIcon = 'icon-frame';
    typeBadge = 'Рамка аватара';
    categoryItems = FRAME_DEFINITIONS;
    selectorTitle = `⚡ Быстрый тест всех рамок (${FRAME_DEFINITIONS.length}):`;
  } else if (category === 'name_styles') {
    item = NAME_STYLE_DEFINITIONS.find(s => s.id === itemId);
    catLabel = 'СТИЛЬ И ЦВЕТ НИКА';
    catIcon = 'icon-sparkles';
    typeBadge = 'Стиль никнейма';
    categoryItems = NAME_STYLE_DEFINITIONS;
    selectorTitle = `⚡ Быстрый тест стилей ника (${NAME_STYLE_DEFINITIONS.length}):`;
  } else if (category === 'mini_bgs') {
    item = MINI_BG_DEFINITIONS.find(b => b.id === itemId);
    catLabel = 'ЖИВОЙ ФОН МИНИ-ПРОФИЛЯ';
    catIcon = 'icon-sparkles';
    typeBadge = 'Анимированный фон';
    categoryItems = MINI_BG_DEFINITIONS;
    selectorTitle = `⚡ Быстрый тест всех живых фонов (${MINI_BG_DEFINITIONS.length}):`;
  } else if (category === 'banners') {
    item = BANNER_DEFINITIONS.find(b => b.id === itemId);
    catLabel = 'ШАПКА ПОЛНОГО ПРОФИЛЯ';
    catIcon = 'icon-game';
    typeBadge = 'Панорамный баннер';
    categoryItems = BANNER_DEFINITIONS;
    selectorTitle = `⚡ Быстрый тест всех шапок профиля (${BANNER_DEFINITIONS.length}):`;
  } else if (category === 'themes') {
    item = THEME_DEFINITIONS.find(t => t.id === itemId);
    catLabel = 'ТЕМА ОФОРМЛЕНИЯ САЙТА';
    catIcon = 'icon-palette-shop';
    typeBadge = 'Визуальная тема';
    categoryItems = THEME_DEFINITIONS;
    selectorTitle = `⚡ Быстрый тест всех тем сайта (${THEME_DEFINITIONS.length}):`;
  }

  if (!item) return;

  // 1. Метаданные товара
  const catIconEl = document.getElementById('previewCatIcon');
  if (catIconEl) catIconEl.setAttribute('href', `#${catIcon}`);
  const catLabelEl = document.getElementById('previewCatLabel');
  if (catLabelEl) catLabelEl.textContent = catLabel;
  const titleEl = document.getElementById('previewItemTitle');
  if (titleEl) titleEl.textContent = item.name;
  
  const rarityTagEl = document.getElementById('previewItemRarityTag');
  if (rarityTagEl) {
    rarityTagEl.textContent = item.tag || (category === 'themes' ? 'ТЕМА' : 'ПРЕМИУМ');
    rarityTagEl.className = `item-tag-pill tag-${(item.tag || 'rare').toLowerCase().replace(/\s+/g, '-')}`;
  }

  const typeBadgeEl = document.getElementById('previewItemTypeBadge');
  if (typeBadgeEl) typeBadgeEl.textContent = typeBadge;

  const descEl = document.getElementById('previewItemDesc');
  if (descEl) descEl.textContent = item.desc || '';

  const userBalanceEl = document.getElementById('previewUserBalanceVal');
  if (userBalanceEl) userBalanceEl.textContent = userCoins.toLocaleString('ru-RU');

  // 2. Расчет стоимости
  const rawCost = item.cost || 0;
  const finalCost = isPremium ? Math.round(rawCost * 0.9) : rawCost;

  const priceBox = document.getElementById('previewPriceBox');
  if (priceBox) {
    if (isPremium && rawCost > 0) {
      priceBox.innerHTML = `
        <div class="shop-price-container">
          <div class="shop-price-main-row">
            <span class="shop-price-old-striked">${rawCost} LC</span>
            <span class="shop-item-curr-price is-discount"><span class="shop-coin-l">L</span> ${finalCost} LC</span>
            <span class="shop-discount-tag-badge">-10% VIP</span>
          </div>
        </div>
      `;
    } else {
      priceBox.innerHTML = `
        <div class="shop-price-container">
          <div class="shop-price-main-row">
            <span class="shop-item-curr-price"><span class="shop-coin-l">L</span> ${rawCost} LC</span>
          </div>
        </div>
      `;
    }
  }

  // 3. Интерактивная сцена примерки (РЕАЛИСТИЧНЫЙ ЧАТ, STEAM МИНИ-ПРОФИЛЬ, ШАПКА, ТЕМА)
  const viewport = document.getElementById('previewStageViewport');
  if (viewport) {
    const avatarContent = (user && user.avatar) 
      ? `<img src="${user.avatar}" class="preview-large-avatar-img" alt="${escapeHtml(current || 'Игрок')}">` 
      : `<div class="preview-large-avatar-img">${current ? escapeHtml(current.slice(0, 2).toUpperCase()) : 'VIP'}</div>`;

    const avatarContentMini = (user && user.avatar)
      ? `<img src="${user.avatar}" alt="${escapeHtml(current || 'Игрок')}">`
      : `<span>${current ? escapeHtml(current.slice(0, 2).toUpperCase()) : 'VIP'}</span>`;

    const userFrame = ShopPreviewState.testFrameId || (category === 'frames' ? itemId : getUserAvatarFrame(current));
    const userNameStyle = category === 'name_styles' ? itemId : getUserNameStyle(current);
    const nameClass = getUserNameClass(current, userNameStyle);

    if (category === 'frames' || category === 'name_styles') {
      // Реалистичный чат и карточка аватара
      viewport.innerHTML = `
        <div class="preview-chat-showcase">
          <div class="preview-hero-identity-card">
            <div class="avatar-frame-wrap frame-${userFrame}" style="width: 72px; height: 72px; flex-shrink: 0;">
              ${avatarContent}
            </div>
            <div class="preview-hero-identity-info">
              <div class="preview-hero-name ${nameClass}">${escapeHtml(current || 'Ваш никнейм')}</div>
              <div class="preview-hero-badges">
                <span class="preview-badge-pill preview-badge-vip"><svg style="width:11px;height:11px;"><use href="#icon-crown"/></svg> VIP</span>
                <span class="preview-badge-pill preview-badge-lvl">LVL ${user.level || 15}</span>
                <span class="preview-badge-pill preview-badge-game">CS 2 • Premier</span>
              </div>
            </div>
          </div>

          <div class="preview-fake-chat-card">
            <div class="fake-chat-header">
              <div class="fake-chat-title">
                <span class="fake-chat-dot"></span>
                <span>Мировой чат Lobbivo</span>
              </div>
              <span class="fake-chat-tag">ПРЕДПРОСМОТР В ЧАТЕ</span>
            </div>

            <div class="fake-chat-msg">
              <div class="fake-chat-avatar-mini">
                <div class="preview-small-avatar"><span>AL</span></div>
              </div>
              <div class="fake-chat-bubble">
                <div class="fake-chat-author-line">
                  <span class="fake-chat-author-other">Alex_Sniper</span>
                  <span class="fake-chat-time">19:42</span>
                </div>
                <div class="fake-chat-text">Ищем +1 в сквад на вечерний рейтинг, кто с нами?</div>
              </div>
            </div>

            <div class="fake-chat-msg highlight-demo">
              <div class="fake-chat-avatar-mini">
                <div class="avatar-frame-wrap frame-${userFrame}" style="width:38px;height:38px;">
                  <div class="preview-small-avatar">${avatarContentMini}</div>
                </div>
              </div>
              <div class="fake-chat-bubble">
                <div class="fake-chat-author-line">
                  <span class="fake-chat-author-me ${nameClass}">${escapeHtml(current || 'Ваш никнейм')}</span>
                  <span class="preview-crown-mini"><svg style="width:12px;height:12px;"><use href="#icon-crown"/></svg></span>
                  <span class="fake-chat-time">только что</span>
                </div>
                <div class="fake-chat-text">Я готов! Залетаю в лобби, связь в дискорде 🚀🔥</div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (category === 'mini_bgs') {
      // Реалистичный Steam-style мини-профиль с живым тестом похвал и статусов
      let statusText = '🟢 В сети • Ищет команду';
      let statusDotClass = 'online';
      if (ShopPreviewState.testStatus === 'in_game') {
        statusText = '🎮 В игре: Counter-Strike 2 • Premier';
        statusDotClass = 'online';
      } else if (ShopPreviewState.testStatus === 'away') {
        statusText = '🌙 Отошёл • Скоро буду';
        statusDotClass = 'away';
      }

      viewport.innerHTML = `
        <div class="preview-steam-miniprofile-wrap">
          <div class="steam-miniprofile-card">
            <div class="popover-animated-bg mini-bg-${itemId}"></div>
            <div class="steam-miniprofile-glow-layer"></div>
            
            <div class="steam-miniprofile-content">
              <div class="miniprofile-header-row">
                <div class="avatar-frame-wrap frame-${userFrame}" style="width: 68px; height: 68px; flex-shrink: 0;">
                  ${avatarContent}
                </div>
                <div class="miniprofile-user-meta">
                  <div class="${nameClass}" style="font-size: 1.15rem; font-weight: 900;">
                    ${escapeHtml(current || 'Ваш никнейм')}
                  </div>
                  <div class="miniprofile-status-row">
                    <span class="miniprofile-status-dot ${statusDotClass}"></span>
                    <span>${statusText}</span>
                  </div>
                  <div class="miniprofile-level-badge">
                    <span>Уровень ${user.level || 25}</span>
                  </div>
                </div>
              </div>

              <div class="miniprofile-game-card">
                <div class="miniprofile-game-icon">
                  <svg style="width: 18px; height: 18px;"><use href="#icon-game"/></svg>
                </div>
                <div class="miniprofile-game-info">
                  <div class="miniprofile-game-name">Counter-Strike 2</div>
                  <div class="miniprofile-game-details">Premier 19,450 ELO • Сквад</div>
                </div>
              </div>

              <div class="miniprofile-bio-box">
                «Играю на победу. Прайм-тайм каждый вечер с 19:00»
              </div>

              <div class="miniprofile-stats-row">
                <div class="miniprofile-stat-chip miniprofile-praise-btn" onclick="testMiniProfilePraise()" title="Нажмите, чтобы протестировать реакцию похвалы">
                  <svg style="width:12px;height:12px;color:#34d399;"><use href="#icon-thumbs-up"/></svg>
                  <span id="previewPraiseNumVal">+${ShopPreviewState.testPraiseCount} Похвал (Тест)</span>
                </div>
                <div class="miniprofile-stat-chip">
                  <svg style="width:12px;height:12px;color:#00d4ff;"><use href="#icon-clock"/></svg>
                  <span>780 ч. в игре</span>
                </div>
              </div>

              <div class="miniprofile-actions-row">
                <div class="miniprofile-action-btn primary">Написать в ЛС</div>
                <div class="miniprofile-action-btn secondary">В друзья</div>
              </div>
            </div>
          </div>

          <!-- Интерактивные тест-кнопки статуса профиля -->
          <div class="preview-live-interactive-bar">
            <span style="font-size:0.72rem;color:rgba(255,255,255,0.5);margin-right:2px;">Тест статуса:</span>
            <button type="button" class="preview-test-toggle-btn ${ShopPreviewState.testStatus === 'online' ? 'active' : ''}" onclick="testMiniProfileStatus('online')">🟢 Онлайн</button>
            <button type="button" class="preview-test-toggle-btn ${ShopPreviewState.testStatus === 'in_game' ? 'active' : ''}" onclick="testMiniProfileStatus('in_game')">🎮 В игре CS2</button>
            <button type="button" class="preview-test-toggle-btn ${ShopPreviewState.testStatus === 'away' ? 'active' : ''}" onclick="testMiniProfileStatus('away')">🌙 Отошёл</button>
          </div>
        </div>
      `;
    } else if (category === 'banners') {
      // Реалистичная панорамная шапка профиля (Gamer Hero Banner)
      viewport.innerHTML = `
        <div class="preview-profile-banner-showcase">
          <div class="preview-hero-banner-frame">
            <div class="profile-hero-banner-cover banner-${itemId}"></div>
            <div class="preview-banner-vignette"></div>

            <div class="preview-hero-banner-content">
              <div class="avatar-frame-wrap frame-${userFrame}" style="width: 60px; height: 60px; flex-shrink: 0;">
                ${avatarContent}
              </div>
              <div class="preview-banner-identity">
                <div class="preview-banner-username ${nameClass}">${escapeHtml(current || 'Ваш никнейм')}</div>
                <div class="preview-banner-tags">
                  <span class="preview-banner-pill"><svg style="width:11px;height:11px;"><use href="#icon-device-pc"/></svg> PC</span>
                  <span class="preview-banner-pill"><svg style="width:11px;height:11px;"><use href="#icon-game"/></svg> CS 2</span>
                  <span class="preview-banner-pill" style="color:#00ff9d;">• Онлайн</span>
                </div>
              </div>
              <div class="preview-banner-karma-pill">
                <svg style="width:13px;height:13px;"><use href="#icon-thumbs-up"/></svg>
                <span>+52</span>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (category === 'themes') {
      // Реалистичный мини UI интерфейса темы
      viewport.innerHTML = `
        <div class="preview-theme-showcase-wrap ${item.previewClass}">
          <div class="mini-ui-mockup">
            <div class="mini-ui-header">
              <div class="mini-ui-brand">
                <span class="mini-ui-logo-badge">L</span>
                <span class="mini-ui-brand-title">Lobbivo</span>
              </div>
              <div class="mini-ui-nav">
                <span class="mini-ui-nav-link active">Игры</span>
                <span class="mini-ui-nav-link">Тиммейты</span>
              </div>
              <div class="mini-ui-coin-pill">
                <span class="coin-l-letter">L</span>
                <span>850 LC</span>
              </div>
            </div>

            <div class="mini-ui-card">
              <div class="mini-ui-card-title">Тема: ${escapeHtml(item.name)}</div>
              <div class="mini-ui-card-sub">${escapeHtml(item.desc || 'Уникальная цветовая палитра всего сайта')}</div>
              <div class="mini-ui-btn-row">
                <div class="mini-ui-btn primary">Войти в лобби</div>
                <div class="mini-ui-btn outline">Подробнее</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // 4. Панель быстрого переключения и теста всех предметов текущей категории (QUICK SWITCHER TRAY)
  const quickSelectorWrap = document.getElementById('previewQuickSelectorWrap');
  const quickSelectorRow = document.getElementById('previewQuickSelectorRow');
  const quickSelectorTitleEl = document.getElementById('previewQuickSelectorTitle');

  if (quickSelectorWrap && quickSelectorRow && categoryItems.length > 0) {
    quickSelectorWrap.style.display = 'block';
    if (quickSelectorTitleEl) quickSelectorTitleEl.textContent = selectorTitle;

    let trayHtml = '';
    categoryItems.forEach(catItem => {
      const isActive = catItem.id === itemId;
      let isItemOwned = false;
      let isItemEquipped = false;

      if (category === 'frames') {
        isItemOwned = inventory.frames.includes(catItem.id);
        isItemEquipped = getUserAvatarFrame(current) === catItem.id;
      } else if (category === 'name_styles') {
        isItemOwned = inventory.nameStyles.includes(catItem.id);
        isItemEquipped = getUserNameStyle(current) === catItem.id;
      } else if (category === 'mini_bgs') {
        isItemOwned = inventory.miniBgs.includes(catItem.id);
        isItemEquipped = getUserEquippedMiniBg(current) === catItem.id;
      } else if (category === 'banners') {
        isItemOwned = inventory.banners.includes(catItem.id);
        isItemEquipped = getUserEquippedBanner(current) === catItem.id;
      } else if (category === 'themes') {
        isItemOwned = inventory.themes.includes(catItem.id);
        isItemEquipped = (AppState.currentTheme || localStorage.getItem('squad_theme') || 'default') === catItem.id;
      }

      let thumbHtml = '';
      if (category === 'mini_bgs') {
        thumbHtml = `<div class="preview-quick-thumb mini-bg-${catItem.id}"></div>`;
      } else if (category === 'banners') {
        thumbHtml = `<div class="preview-quick-thumb banner-${catItem.id}"></div>`;
      } else if (category === 'frames') {
        thumbHtml = `<div class="preview-quick-thumb" style="display:flex;align-items:center;justify-content:center;background:#0d1527;"><div class="avatar-frame-wrap frame-${catItem.id}" style="width:34px;height:34px;"><div style="width:100%;height:100%;border-radius:50%;background:#1b253b;font-size:10px;display:flex;align-items:center;justify-content:center;">★</div></div></div>`;
      } else if (category === 'name_styles') {
        thumbHtml = `<div class="preview-quick-thumb" style="display:flex;align-items:center;justify-content:center;background:#0d1527;"><span class="name-style-${catItem.id}" style="font-size:11px;font-weight:900;">ААА</span></div>`;
      } else if (category === 'themes') {
        thumbHtml = `<div class="preview-quick-thumb ${catItem.previewClass}" style="display:flex;align-items:center;justify-content:center;"><span style="font-size:10px;font-weight:900;color:#fff;">${escapeHtml(catItem.name.slice(0,3))}</span></div>`;
      }

      let statusBadge = isItemEquipped ? '✓ Надето' : (isItemOwned ? 'В наличии' : `${catItem.cost || 0} LC`);

      trayHtml += `
        <div class="preview-quick-item-btn ${isActive ? 'active' : ''} ${isItemEquipped ? 'is-equipped' : ''}" onclick="openShopItemPreview('${category}', '${catItem.id}')" title="Нажмите для мгновенного теста «${escapeHtml(catItem.name)}»">
          ${thumbHtml}
          <span class="preview-quick-item-name">${escapeHtml(catItem.name)}</span>
          <span class="preview-quick-item-status">${statusBadge}</span>
        </div>
      `;
    });

    quickSelectorRow.innerHTML = trayHtml;
  } else if (quickSelectorWrap) {
    quickSelectorWrap.style.display = 'none';
  }

  // 5. Проверка владения и экипировки
  let isOwned = false;
  let isEquipped = false;

  if (category === 'frames') {
    isOwned = inventory.frames.includes(itemId);
    isEquipped = getUserAvatarFrame(current) === itemId;
  } else if (category === 'name_styles') {
    isOwned = inventory.nameStyles.includes(itemId);
    isEquipped = getUserNameStyle(current) === itemId;
  } else if (category === 'mini_bgs') {
    isOwned = inventory.miniBgs.includes(itemId);
    isEquipped = getUserEquippedMiniBg(current) === itemId;
  } else if (category === 'banners') {
    isOwned = inventory.banners.includes(itemId);
    isEquipped = getUserEquippedBanner(current) === itemId;
  } else if (category === 'themes') {
    isOwned = inventory.themes.includes(itemId);
    isEquipped = (AppState.currentTheme || localStorage.getItem('squad_theme') || 'default') === itemId;
  }

  const actionBtn = document.getElementById('previewActionBtn');
  const actionBtnText = document.getElementById('previewActionBtnText');

  if (actionBtn && actionBtnText) {
    if (isEquipped) {
      actionBtn.className = 'btn btn-primary preview-action-btn is-equipped';
      actionBtn.disabled = true;
      actionBtnText.textContent = '✓ Уже надето';
      actionBtn.onclick = null;
    } else if (isOwned) {
      actionBtn.className = 'btn btn-primary preview-action-btn';
      actionBtn.disabled = false;
      actionBtnText.textContent = 'Экипировать сейчас';
      actionBtn.onclick = () => {
        if (!current) return;
        if (category === 'frames') {
          user.equippedFrame = itemId;
        } else if (category === 'name_styles') {
          user.nameStyle = itemId;
        } else if (category === 'mini_bgs') {
          user.equippedMiniBg = itemId;
        } else if (category === 'banners') {
          user.equippedBanner = itemId;
        } else if (category === 'themes') {
          saveTheme(itemId);
        }
        saveUsers(current);
        if (typeof renderProfileCustomization === 'function') renderProfileCustomization();
        if (typeof renderProfile === 'function') renderProfile();
        if (typeof renderWorldChat === 'function') renderWorldChat();
        if (typeof updateUI === 'function') updateUI();
        showNotification('Успешно экипировано', `Предмет «${item.name}» теперь активен на вашем профиле!`);
        closeShopItemPreview();
      };
    } else {
      if (!current) {
        actionBtn.className = 'btn btn-primary preview-action-btn';
        actionBtn.disabled = false;
        actionBtnText.textContent = `Войти для покупки (${finalCost} LC)`;
        actionBtn.onclick = () => {
          closeShopItemPreview();
          showAuthModal('login');
        };
      } else if (userCoins >= finalCost) {
        actionBtn.className = 'btn btn-primary preview-action-btn';
        actionBtn.disabled = false;
        actionBtnText.textContent = `Купить за ${finalCost} LC`;
        actionBtn.onclick = () => {
          const type = category === 'frames' ? 'frame' : (category === 'name_styles' ? 'name_style' : (category === 'mini_bgs' ? 'mini_bg' : (category === 'banners' ? 'banner' : 'theme')));
          buyShopItem(type, itemId, rawCost);
          closeShopItemPreview();
        };
      } else {
        const diff = finalCost - userCoins;
        actionBtn.className = 'btn btn-primary preview-action-btn';
        actionBtn.disabled = false;
        actionBtnText.textContent = `Не хватает ${diff} LC • Пополнить`;
        actionBtn.onclick = () => {
          closeShopItemPreview();
          switchCoinTab('buy');
        };
      }
    }
  }

  modal.classList.add('show');
}

// Интерактивные тест-хендлеры для предпросмотра
function testMiniProfilePraise() {
  ShopPreviewState.testPraiseCount += 1;
  const praiseEl = document.getElementById('previewPraiseNumVal');
  if (praiseEl) {
    praiseEl.textContent = `+${ShopPreviewState.testPraiseCount} Похвал (Тест)`;
  }
  showNotification('Похвала добавлена!', `Тестовая репутация игрока увеличена: +${ShopPreviewState.testPraiseCount}`);
}
window.testMiniProfilePraise = testMiniProfilePraise;

function testMiniProfileStatus(status) {
  ShopPreviewState.testStatus = status;
  openShopItemPreview(ShopPreviewState.activeCategory, ShopPreviewState.activeItemId);
}
window.testMiniProfileStatus = testMiniProfileStatus;

function closeShopItemPreview() {
  const modal = document.getElementById('shopPreviewModal');
  if (modal) {
    modal.classList.remove('show');
    modal.classList.remove('open');
  }
}
window.openShopItemPreview = openShopItemPreview;
window.closeShopItemPreview = closeShopItemPreview;

// Привязка закрытия модалки предпросмотра
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('shopPreviewCloseBtn');
  const cancelBtn = document.getElementById('previewCancelBtn');
  const modal = document.getElementById('shopPreviewModal');
  if (closeBtn) closeBtn.onclick = closeShopItemPreview;
  if (cancelBtn) cancelBtn.onclick = closeShopItemPreview;
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === this) closeShopItemPreview();
    });
  }
});

// ============================================================
//  КАСТОМИЗАЦИЯ ПРОФИЛЯ (ГАРДЕРОБ РАМОК И ТЕМ)
// ============================================================

function openShopForCustomization(tab = 'shop') {
  openCoinModal(tab);
}

function renderCoinModal() {
  const current = AppState.currentUser;
  const user = current ? AppState.users[current] : null;

  const modalCoinEl = document.getElementById('modalCoinBalance');
  const headerCoinEl = document.getElementById('headerCoinBalance');
  const dropdownCoinEl = document.getElementById('dropdownCoinBalance');

  const coins = user && typeof user.coins === 'number' ? user.coins : 0;
  if (modalCoinEl) modalCoinEl.textContent = coins.toLocaleString('ru-RU');
  if (headerCoinEl) headerCoinEl.textContent = coins.toLocaleString('ru-RU');
  if (dropdownCoinEl) dropdownCoinEl.textContent = `${coins.toLocaleString('ru-RU')} LC`;

  if (!user) {
    renderGuestCoinTasks();
    return;
  }

  if (!user.claimedTasks || typeof user.claimedTasks !== 'object') {
    user.claimedTasks = { avatar: false, bio: false, squad: false, teammates: false };
  }
  if (!Array.isArray(user.contactedTeammates)) {
    user.contactedTeammates = [];
  }

  // Подсчёт уникальных тимейтов из сообщений и контактов
  const chatPartners = new Set(user.contactedTeammates);
  for (const key of Object.keys(AppState.messages)) {
    const partner = getChatPartnerFromKey(key, current);
    if (partner && partner !== current) {
      chatPartners.add(partner);
    }
  }
  const teammatesCount = chatPartners.size;

  let availableRewardsCount = 0;

  // 1. Аватарка (50 LC)
  const hasAvatar = Boolean(user.avatar && user.avatar.trim().length > 0);
  const isAvatarClaimed = Boolean(user.claimedTasks.avatar);
  const taskBtnAvatar = document.getElementById('taskBtnAvatar');
  const taskCardAvatar = document.getElementById('taskCardAvatar');

  if (isAvatarClaimed) {
    taskCardAvatar?.classList.add('claimed');
    taskCardAvatar?.classList.remove('ready-to-claim');
    if (taskBtnAvatar) {
      taskBtnAvatar.disabled = true;
      taskBtnAvatar.className = 'task-action-btn claimed';
      taskBtnAvatar.innerHTML = '<span class="task-claimed-text"><svg class="mini-svg" style="width:12px;height:12px;margin-right:4px;"><use href="#icon-check"/></svg>Забрано</span>';
    }
  } else if (hasAvatar) {
    availableRewardsCount++;
    taskCardAvatar?.classList.add('ready-to-claim');
    taskCardAvatar?.classList.remove('claimed');
    if (taskBtnAvatar) {
      taskBtnAvatar.disabled = false;
      taskBtnAvatar.className = 'task-action-btn claim-ready';
      taskBtnAvatar.innerHTML = '<span>Забрать +50 LC</span>';
    }
  } else {
    taskCardAvatar?.classList.remove('claimed', 'ready-to-claim');
    if (taskBtnAvatar) {
      taskBtnAvatar.disabled = false;
      taskBtnAvatar.className = 'task-action-btn';
      taskBtnAvatar.innerHTML = '<span>Выполнить</span>';
    }
  }

  // 2. Инфо о себе (50 LC)
  const hasBio = Boolean(user.desc && user.desc.trim().length > 0);
  const isBioClaimed = Boolean(user.claimedTasks.bio);
  const taskBtnBio = document.getElementById('taskBtnBio');
  const taskCardBio = document.getElementById('taskCardBio');

  if (isBioClaimed) {
    taskCardBio?.classList.add('claimed');
    taskCardBio?.classList.remove('ready-to-claim');
    if (taskBtnBio) {
      taskBtnBio.disabled = true;
      taskBtnBio.className = 'task-action-btn claimed';
      taskBtnBio.innerHTML = '<span class="task-claimed-text"><svg class="mini-svg" style="width:12px;height:12px;margin-right:4px;"><use href="#icon-check"/></svg>Забрано</span>';
    }
  } else if (hasBio) {
    availableRewardsCount++;
    taskCardBio?.classList.add('ready-to-claim');
    taskCardBio?.classList.remove('claimed');
    if (taskBtnBio) {
      taskBtnBio.disabled = false;
      taskBtnBio.className = 'task-action-btn claim-ready';
      taskBtnBio.innerHTML = '<span>Забрать +50 LC</span>';
    }
  } else {
    taskCardBio?.classList.remove('claimed', 'ready-to-claim');
    if (taskBtnBio) {
      taskBtnBio.disabled = false;
      taskBtnBio.className = 'task-action-btn';
      taskBtnBio.innerHTML = '<span>Выполнить</span>';
    }
  }

  // 3. Создай 1 анкету (50 LC)
  const hasSquad = Boolean(user.lookingForTeam || user.hasCreatedSquad);
  const isSquadClaimed = Boolean(user.claimedTasks.squad);
  const taskBtnSquad = document.getElementById('taskBtnSquad');
  const taskCardSquad = document.getElementById('taskCardSquad');

  if (isSquadClaimed) {
    taskCardSquad?.classList.add('claimed');
    taskCardSquad?.classList.remove('ready-to-claim');
    if (taskBtnSquad) {
      taskBtnSquad.disabled = true;
      taskBtnSquad.className = 'task-action-btn claimed';
      taskBtnSquad.innerHTML = '<span class="task-claimed-text"><svg class="mini-svg" style="width:12px;height:12px;margin-right:4px;"><use href="#icon-check"/></svg>Забрано</span>';
    }
  } else if (hasSquad) {
    availableRewardsCount++;
    taskCardSquad?.classList.add('ready-to-claim');
    taskCardSquad?.classList.remove('claimed');
    if (taskBtnSquad) {
      taskBtnSquad.disabled = false;
      taskBtnSquad.className = 'task-action-btn claim-ready';
      taskBtnSquad.innerHTML = '<span>Забрать +50 LC</span>';
    }
  } else {
    taskCardSquad?.classList.remove('claimed', 'ready-to-claim');
    if (taskBtnSquad) {
      taskBtnSquad.disabled = false;
      taskBtnSquad.className = 'task-action-btn';
      taskBtnSquad.innerHTML = '<span>Выполнить</span>';
    }
  }

  // 4. Найди 5 тимейтов (200 LC)
  const isTeammatesClaimed = Boolean(user.claimedTasks.teammates);
  const taskBtnTeammates = document.getElementById('taskBtnTeammates');
  const taskCardTeammates = document.getElementById('taskCardTeammates');
  const progressFill = document.getElementById('taskTeammatesProgressFill');
  const progressText = document.getElementById('taskTeammatesProgressText');

  const currentTeammatesProgress = Math.min(teammatesCount, 5);
  const progressPercent = Math.round((currentTeammatesProgress / 5) * 100);

  if (progressFill) progressFill.style.width = `${progressPercent}%`;
  if (progressText) progressText.textContent = `Прогресс: ${currentTeammatesProgress} / 5 тиммейтов`;

  if (isTeammatesClaimed) {
    taskCardTeammates?.classList.add('claimed');
    taskCardTeammates?.classList.remove('ready-to-claim');
    if (taskBtnTeammates) {
      taskBtnTeammates.disabled = true;
      taskBtnTeammates.className = 'task-action-btn claimed';
      taskBtnTeammates.innerHTML = '<span class="task-claimed-text"><svg class="mini-svg" style="width:12px;height:12px;margin-right:4px;"><use href="#icon-check"/></svg>Забрано</span>';
    }
  } else if (teammatesCount >= 5) {
    availableRewardsCount++;
    taskCardTeammates?.classList.add('ready-to-claim');
    taskCardTeammates?.classList.remove('claimed');
    if (taskBtnTeammates) {
      taskBtnTeammates.disabled = false;
      taskBtnTeammates.className = 'task-action-btn claim-ready gold-pulse';
      taskBtnTeammates.innerHTML = '<span>Забрать +200 LC</span>';
    }
  } else {
    taskCardTeammates?.classList.remove('claimed', 'ready-to-claim');
    if (taskBtnTeammates) {
      taskBtnTeammates.disabled = false;
      taskBtnTeammates.className = 'task-action-btn featured-action';
      taskBtnTeammates.innerHTML = '<span>Найти игроков</span>';
    }
  }

  // Бейдж доступных наград
  const badgeEl = document.getElementById('coinTasksBadge');
  if (badgeEl) {
    if (availableRewardsCount > 0) {
      badgeEl.textContent = `+${availableRewardsCount}`;
      badgeEl.classList.add('highlight-badge');
    } else {
      const remainingTasks = [isAvatarClaimed, isBioClaimed, isSquadClaimed, isTeammatesClaimed].filter(c => !c).length;
      badgeEl.innerHTML = remainingTasks > 0 ? `${remainingTasks}` : '<svg class="mini-svg" style="width:11px;height:11px;display:inline-block;vertical-align:middle;"><use href="#icon-check"/></svg>';
      badgeEl.classList.remove('highlight-badge');
    }
  }
}

function renderGuestCoinTasks() {
  const badgeEl = document.getElementById('coinTasksBadge');
  if (badgeEl) badgeEl.textContent = '4';

  ['taskCardAvatar', 'taskCardBio', 'taskCardSquad', 'taskCardTeammates'].forEach(id => {
    document.getElementById(id)?.classList.remove('claimed', 'ready-to-claim');
  });

  const btnA = document.getElementById('taskBtnAvatar');
  const btnB = document.getElementById('taskBtnBio');
  const btnS = document.getElementById('taskBtnSquad');
  const btnT = document.getElementById('taskBtnTeammates');

  if (btnA) { btnA.disabled = false; btnA.className = 'task-action-btn'; btnA.innerHTML = '<span>Выполнить</span>'; }
  if (btnB) { btnB.disabled = false; btnB.className = 'task-action-btn'; btnB.innerHTML = '<span>Выполнить</span>'; }
  if (btnS) { btnS.disabled = false; btnS.className = 'task-action-btn'; btnS.innerHTML = '<span>Выполнить</span>'; }
  if (btnT) { btnT.disabled = false; btnT.className = 'task-action-btn featured-action'; btnT.innerHTML = '<span>Найти игроков</span>'; }
}

function claimTaskReward(taskId) {
  if (!AppState.currentUser) {
    closeCoinModal();
    showAuthModal('login');
    showNotification('Требуется вход', 'Войдите в аккаунт, чтобы получать награды');
    return;
  }

  const user = AppState.users[AppState.currentUser];
  if (!user) return;

  if (!user.claimedTasks || typeof user.claimedTasks !== 'object') {
    user.claimedTasks = { avatar: false, bio: false, squad: false, teammates: false };
  }

  if (user.claimedTasks[taskId]) {
    showNotification('Уже получено', 'Вы уже забрали награду за это задание');
    return;
  }

  const rewards = {
    avatar: 50,
    bio: 50,
    squad: 50,
    teammates: 200
  };

  const taskTitles = {
    avatar: '«Поставь аватарку для профиля»',
    bio: '«Заполни информацию о себе»',
    squad: '«Создай 1 анкету»',
    teammates: '«Найди 5 тимейтов»'
  };

  const rewardAmount = rewards[taskId] || 50;

  // Проверка условий выполнения
  if (taskId === 'avatar' && (!user.avatar || !user.avatar.trim())) {
    closeCoinModal();
    showProfile();
    document.getElementById('editAvatarFile')?.click();
    showNotification('Задание', 'Загрузите аватарку в профиль, чтобы забрать +50 LC');
    return;
  }

  if (taskId === 'bio' && (!user.desc || !user.desc.trim())) {
    closeCoinModal();
    showProfile();
    AppState.isEditing = true;
    renderProfile();
    document.getElementById('editDesc')?.focus();
    showNotification('Задание', 'Заполните информацию о себе в профиле для получения +50 LC');
    return;
  }

  if (taskId === 'squad' && (!user.lookingForTeam && !user.hasCreatedSquad)) {
    closeCoinModal();
    openCreateSquadModal();
    showNotification('Задание', 'Создайте анкету поиска тимейтов для получения +50 LC');
    return;
  }

  if (taskId === 'teammates') {
    const chatPartners = new Set(user.contactedTeammates || []);
    for (const key of Object.keys(AppState.messages)) {
      const partner = getChatPartnerFromKey(key, AppState.currentUser);
      if (partner && partner !== AppState.currentUser) {
        chatPartners.add(partner);
      }
    }
    if (chatPartners.size < 5) {
      closeCoinModal();
      switchPage('pagePlayers');
      showNotification('Задание', `Пообщайтесь с 5 тимейтами (сейчас: ${chatPartners.size}/5) для получения +200 LC`);
      return;
    }
  }

  // Начисление награды
  user.claimedTasks[taskId] = true;
  user.coins = (typeof user.coins === 'number' ? user.coins : 0) + rewardAmount;
  saveUsers();

  updateUI();
  renderCoinModal();

  triggerCoinConfetti();
  showNotification('Награда получена', `Задание ${taskTitles[taskId]} выполнено: +${rewardAmount} LC начислено на ваш баланс!`);
}

function buyCoinPack(coins, cost) {
  if (!AppState.currentUser) {
    closeCoinModal();
    showAuthModal('login');
    showNotification('Требуется вход', 'Войдите в аккаунт для пополнения Lobbivo Coin');
    return;
  }

  if (typeof SecurityShield !== 'undefined' && !SecurityShield.checkRateLimit('coins')) {
    return;
  }

  showSystemLoader(`Зачисление ${coins} LC...`, 700, () => {
    const user = AppState.users[AppState.currentUser];
    if (user) {
      user.coins = (typeof user.coins === 'number' ? user.coins : 0) + Number(coins);
      saveUsers();
      updateUI();
      renderCoinModal();
      triggerCoinConfetti();
      showNotification('Баланс пополнен', `Успешно начислено +${coins} Lobbivo Coins! Спасибо за поддержку платформы.`);
    }
  });
}

function updateCoinConverterLive() {
  const rublesInput = document.getElementById('calcRubles');
  const resultEl = document.getElementById('calcCoinsResult');
  if (!rublesInput || !resultEl) return;

  const rubles = Math.max(0, parseInt(rublesInput.value, 10) || 0);
  let multiplier = 1.0;
  if (rubles >= 1500) {
    multiplier = 1.35; // +35% бонус
  } else if (rubles >= 800) {
    multiplier = 1.25; // +25% бонус
  } else if (rubles >= 400) {
    multiplier = 1.15; // +15% бонус
  } else if (rubles >= 100) {
    multiplier = 1.05;
  }

  const calculatedCoins = Math.round(rubles * multiplier);
  resultEl.textContent = calculatedCoins.toLocaleString('ru-RU');
}

function triggerCoinConfetti() {
  const coinBtn = document.getElementById('capsuleCoinBtn');
  if (coinBtn) {
    coinBtn.classList.add('coin-earned-flash');
    setTimeout(() => coinBtn.classList.remove('coin-earned-flash'), 1200);
  }
}

// ============================================================
//  ОБНОВЛЕНИЕ UI
// ============================================================

function updateUI() {
  const authBtn = document.getElementById('authBtn');
  const avatarWrapper = document.getElementById('avatarWrapper');
  const guestBanner = document.getElementById('gamesGuestBanner');
  const headerContainer = document.getElementById('capsuleHeaderContainer');

  if (avatarWrapper) avatarWrapper.style.display = 'inline-block';
  if (authBtn) {
    authBtn.style.display = AppState.currentUser ? 'none' : 'none'; // Using capsule profile button
  }
  if (guestBanner) {
    guestBanner.style.display = AppState.currentUser ? 'none' : 'flex';
  }
  if (headerContainer) {
    headerContainer.style.display = AppState.currentUser ? 'flex' : 'none';
  }

  updateHeaderAvatar();
  renderGames(document.getElementById('gameSearchInput')?.value || '');
  renderPlayers(AppState.selectedGameFilter || 'all');
  updateGameCounts();
  updateChatBadge();
  if (typeof updateAdminBadges === 'function') updateAdminBadges();
  if (typeof updateChatMuteUI === 'function') updateChatMuteUI();

  // Если модалка монет открыта, обновляем её в реальном времени
  const coinModal = document.getElementById('coinModal');
  if (coinModal && coinModal.classList.contains('show')) {
    renderCoinModal();
  }
}

// ============================================================
//  КАСТОМНЫЙ СЕЛЕКТОР УСТРОЙСТВ (CYBER DEVICE PICKERS)
// ============================================================

function initDevicePickers() {
  const pickers = document.querySelectorAll('.custom-device-picker');
  pickers.forEach(picker => {
    const inputId = picker.dataset.inputId;
    const input = document.getElementById(inputId);
    const trigger = picker.querySelector('.device-picker-trigger');
    const grid = picker.querySelector('.device-panel-grid');

    if (!grid) return;

    const currentVal = input?.value || 'PC';

    // Рендерим опции платформ
    grid.innerHTML = DEVICES.map(dev => `
      <div class="device-option-card ${dev.id === currentVal ? 'active' : ''}" data-device="${escapeHtml(dev.id)}">
        <div class="device-option-icon" style="--dev-color:${escapeHtml(dev.color)};">
          <svg><use href="#${escapeHtml(dev.icon)}"/></svg>
        </div>
        <div class="device-option-text">
          <div class="device-option-name">${escapeHtml(dev.label)}</div>
          <div class="device-option-desc">${escapeHtml(dev.desc)}</div>
        </div>
        <div class="device-option-check">
          <svg><use href="#icon-check"/></svg>
        </div>
      </div>
    `).join('');

    // Открытие/закрытие панели
    trigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = picker.classList.contains('open');
      document.querySelectorAll('.custom-device-picker.open, .custom-game-picker.open').forEach(p => {
        if (p !== picker) p.classList.remove('open');
      });
      picker.classList.toggle('open', !isOpen);
      syncPickerActiveStacking();
    });

    // Выбор устройства при клике на карточку
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.device-option-card');
      if (!card) return;
      e.stopPropagation();

      const devId = card.dataset.device;
      setDevicePickerValue(picker.id, devId);
      picker.classList.remove('open');
      syncPickerActiveStacking();
    });
  });

  // Закрытие при клике вне панели
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-device-picker, .custom-game-picker')) {
      document.querySelectorAll('.custom-device-picker.open, .custom-game-picker.open').forEach(p => p.classList.remove('open'));
      syncPickerActiveStacking();
    }
  });
}

function syncPickerActiveStacking() {
  document.querySelectorAll('.edit-clean-card, .field, .form-group').forEach(el => {
    const hasOpenPicker = Boolean(el.querySelector('.custom-game-picker.open, .custom-device-picker.open'));
    el.classList.toggle('is-picker-active', hasOpenPicker);
  });
}

function setDevicePickerValue(pickerId, deviceId) {
  const picker = document.getElementById(pickerId);
  if (!picker) return;

  const inputId = picker.dataset.inputId;
  const input = document.getElementById(inputId);
  if (input) input.value = deviceId;

  const devInfo = DEVICES.find(d => d.id === deviceId) || DEVICES[0];

  const badge = picker.querySelector('.device-picker-badge');
  const nameEl = picker.querySelector('.device-picker-name');
  const descEl = picker.querySelector('.device-picker-desc');

  if (badge) {
    badge.innerHTML = `<svg class="device-icon"><use href="#${escapeHtml(devInfo.icon)}"/></svg>`;
    badge.style.color = devInfo.color;
    badge.style.borderColor = devInfo.color;
    badge.style.boxShadow = `0 0 12px ${devInfo.color}40`;
  }
  if (nameEl) nameEl.textContent = devInfo.label;
  if (descEl) descEl.textContent = devInfo.desc;

  picker.querySelectorAll('.device-option-card').forEach(card => {
    if (card.dataset.device === deviceId) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

// ============================================================
//  КАСТОМНЫЙ СЕЛЕКТОР ИГР (CYBER GAME PICKERS)
// ============================================================

function initGamePickers() {
  const pickers = document.querySelectorAll('.custom-game-picker');
  pickers.forEach(picker => {
    const inputId = picker.dataset.inputId;
    const input = document.getElementById(inputId);
    const trigger = picker.querySelector('.game-picker-trigger');
    const grid = picker.querySelector('.game-picker-grid');
    const searchInput = picker.querySelector('.game-picker-search-input');

    if (!grid) return;

    function renderGameOptions(query = '') {
      const q = (query || '').trim().toLowerCase();
      const filtered = GAMES.filter(g => g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q));
      const currentVal = input?.value || 'csgo';

      grid.innerHTML = filtered.map(g => `
        <div class="game-option-card ${g.id === currentVal ? 'active' : ''}" data-game="${escapeHtml(g.id)}">
          <div class="game-option-icon">
            <svg><use href="#${escapeHtml(g.icon)}"/></svg>
          </div>
          <span class="game-option-name">${escapeHtml(g.name)}</span>
          <div class="game-option-check">
            <svg><use href="#icon-check"/></svg>
          </div>
        </div>
      `).join('');
    }

    renderGameOptions();

    trigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = picker.classList.contains('open');
      document.querySelectorAll('.custom-game-picker.open, .custom-device-picker.open').forEach(p => {
        if (p !== picker) p.classList.remove('open');
      });
      picker.classList.toggle('open', !isOpen);
      syncPickerActiveStacking();
      if (!isOpen && searchInput) {
        searchInput.value = '';
        renderGameOptions();
        setTimeout(() => searchInput.focus(), 50);
      }
    });

    const debouncedPickerSearch = debounce(val => renderGameOptions(val), 100);
    searchInput?.addEventListener('input', function() {
      debouncedPickerSearch(this.value);
    });

    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.game-option-card');
      if (!card) return;
      e.stopPropagation();

      const gameId = card.dataset.game;
      setGamePickerValue(picker.id, gameId);
      picker.classList.remove('open');
      syncPickerActiveStacking();
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-game-picker, .custom-device-picker')) {
      document.querySelectorAll('.custom-game-picker.open, .custom-device-picker.open').forEach(p => p.classList.remove('open'));
      syncPickerActiveStacking();
    }
  });
}

function setGamePickerValue(pickerId, gameId) {
  const picker = document.getElementById(pickerId);
  if (!picker) return;

  const inputId = picker.dataset.inputId;
  const input = document.getElementById(inputId);
  if (input) input.value = gameId;

  const gameObj = GAMES.find(g => g.id === gameId) || GAMES[0];

  const badge = picker.querySelector('.game-picker-badge');
  const nameEl = picker.querySelector('.game-picker-name');

  if (badge) {
    badge.innerHTML = `<svg><use href="#${escapeHtml(gameObj.icon)}"/></svg>`;
  }
  if (nameEl) nameEl.textContent = gameObj.name;

  picker.querySelectorAll('.game-option-card').forEach(card => {
    card.classList.toggle('active', card.dataset.game === gameId);
  });
}

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ (INIT)
// ============================================================

function init() {
  const isAndroid = typeof navigator !== 'undefined' && (/android/i.test(navigator.userAgent) || (navigator.platform && /android/i.test(navigator.platform)));
  const isMobile = isAndroid || window.innerWidth <= 768 || (typeof navigator !== 'undefined' && (/android|iphone|ipad|ipod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1));
  if (isAndroid) {
    document.documentElement.classList.add('android-device', 'is-android');
  }
  if (isMobile) {
    document.documentElement.classList.add('mobile-device');
  }

  if (typeof preloadGameImages === 'function') {
    preloadGameImages();
  }
  loadUsers();
  loadMessages();
  loadWorldMessages();
  loadComplaints();
  loadTheme();
  createParticles();
  renderGames();
  addRipples();
  initDevicePickers();
  initGamePickers();

  // Инициализация облачной синхронизации Firebase Realtime
  if (typeof FirebaseSync !== 'undefined') {
    FirebaseSync.init();
  }

  // Живой поиск игр с debounce оптимизацией
  const searchInput = document.getElementById('gameSearchInput');
  if (searchInput) {
    const debouncedGameSearch = debounce(val => renderGames(val), 120);
    searchInput.addEventListener('input', function() {
      debouncedGameSearch(this.value);
    });
  }

  // Навигация шапки (кнопки Игры, Тиммейты, О сервисе)
  document.querySelectorAll('.header-nav .nav-link').forEach(link => {
    link.addEventListener('click', function() {
      const targetPage = this.dataset.nav;
      if (targetPage) {
        if (typeof closeChat === 'function') closeChat();
        if (typeof closeCoinModal === 'function') closeCoinModal();
        if (typeof closeShopItemPreview === 'function') closeShopItemPreview();
        if (targetPage === 'pagePlayers') {
          showPlayers(AppState.selectedGameFilter || 'all');
        } else {
          switchPage(targetPage);
        }
      }
    });
  });

  // Логотип - возврат на главную (к играм если авторизован, или на Welcome если гость)
  const logo = document.getElementById('logoHome');
  if (logo) {
    logo.addEventListener('click', () => {
      if (typeof closeChat === 'function') closeChat();
      if (typeof closeCoinModal === 'function') closeCoinModal();
      if (typeof closeShopItemPreview === 'function') closeShopItemPreview();
      const avatarDropdown = document.getElementById('avatarDropdown');
      if (avatarDropdown) avatarDropdown.classList.remove('open');
      if (AppState.currentUser) {
        switchPage('pageGames');
      } else {
        switchPage('pageWelcome');
      }
    });
  }

  // Кнопки приветственной страницы (Welcome Gateway)
  document.getElementById('welcomeLoginBtn')?.addEventListener('click', () => showAuthModal('login'));
  document.getElementById('welcomeRegisterBtn')?.addEventListener('click', () => showAuthModal('register'));
  document.getElementById('welcomeExploreBtn')?.addEventListener('click', () => switchPage('pageGames'));
  document.getElementById('welcomeAboutBtn')?.addEventListener('click', () => switchPage('pageAbout'));

  // Дропдаун профиля в шапке / Клик по своей иконке в главном меню
  const avatarWrapper = document.getElementById('avatarWrapper');
  const avatarDropdown = document.getElementById('avatarDropdown');
  if (avatarWrapper && avatarDropdown) {
    avatarWrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      // Закрываем чат, магазин и предпросмотр при клике на свою иконку
      if (typeof closeChat === 'function') closeChat();
      if (typeof closeCoinModal === 'function') closeCoinModal();
      if (typeof closeShopItemPreview === 'function') closeShopItemPreview();
      avatarDropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => {
      avatarDropdown.classList.remove('open');
    });
  }

  // Кнопка быстрого поиска
  const searchToggleBtn = document.getElementById('searchToggleBtn');
  if (searchToggleBtn) {
    searchToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const input = document.getElementById('gameSearchInput');
      if (input) {
        if (document.getElementById('pageGames')?.style.display === 'none') {
          switchPage('pageGames');
        }
        input.focus();
      }
    });
  }

  const profileMenuList = document.getElementById('profileMenuList');
  if (profileMenuList) {
    profileMenuList.addEventListener('click', (e) => {
      // Клик по пунктам меню
      const item = e.target.closest('.profile-menu-item');
      if (!item) return;
      e.stopPropagation();
      const action = item.dataset.action;
      if (avatarDropdown) avatarDropdown.classList.remove('open');
      if (typeof closeChat === 'function') closeChat();
      if (typeof closeCoinModal === 'function') closeCoinModal();
      if (typeof closeShopItemPreview === 'function') closeShopItemPreview();

      if (action === 'admin') {
        if (typeof openAdminPanel === 'function') openAdminPanel('complaints');
      } else if (action === 'coins') {
        openCoinModal('earn');
      } else if (action === 'profile' || action === 'customization') {
        showProfile();
      } else if (action === 'friends') {
        if (typeof showFriendsPage === 'function') {
          showFriendsPage();
        } else {
          switchPage('pageFriends');
        }
      } else if (action === 'settings') {
        if (typeof showSettings === 'function') {
          showSettings();
        } else {
          switchPage('pageSettings');
        }
      } else if (action === 'my-squads') {
        if (typeof openMySquadsModal === 'function') openMySquadsModal();
      } else if (action === 'login') {
        showAuthModal('login');
      } else if (action === 'register') {
        showAuthModal('register');
      } else if (action === 'about') {
        switchPage('pageAbout');
      } else if (action === 'logout') {
        logout();
      }
    });
  }

  // Авторизация
  document.getElementById('authBtn')?.addEventListener('click', () => showAuthModal('login'));
  document.getElementById('authModalClose')?.addEventListener('click', hideAuthModal);
  document.getElementById('authModal')?.addEventListener('click', function(e) {
    if (e.target === this) hideAuthModal();
  });

  // Вкладки авторизации
  document.getElementById('tabLoginBtn')?.addEventListener('click', () => showAuthModal('login'));
  document.getElementById('tabRegisterBtn')?.addEventListener('click', () => showAuthModal('register'));

  document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    showAuthModal('register');
  });

  document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    showAuthModal('login');
  });

  // Показ / скрытие пароля
  document.getElementById('toggleLoginPassword')?.addEventListener('click', function() {
    const input = document.getElementById('loginPassword');
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    this.classList.toggle('active', isPass);
  });

  document.getElementById('toggleRegPassword')?.addEventListener('click', function() {
    const input = document.getElementById('regPassword');
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    this.classList.toggle('active', isPass);
  });

  document.getElementById('showRulesLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('rulesText')?.classList.toggle('show');
  });

  document.getElementById('rulesCheckbox')?.addEventListener('change', function() {
    const regBtn = document.getElementById('registerBtn');
    if (regBtn) regBtn.disabled = !this.checked;
    if (this.checked) {
      document.getElementById('regError')?.classList.remove('show');
    }
  });

  document.getElementById('loginBtn')?.addEventListener('click', () => {
    const u = document.getElementById('loginUsername')?.value;
    const p = document.getElementById('loginPassword')?.value;
    loginUser(u, p);
  });

  document.getElementById('loginUsername')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginPassword')?.focus();
  });

  document.getElementById('loginPassword')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginBtn')?.click();
  });

  document.getElementById('regUsername')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('regPassword')?.focus();
  });

  document.getElementById('regPassword')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const regBtn = document.getElementById('registerBtn');
      if (regBtn && !regBtn.disabled) regBtn.click();
    }
  });

  document.getElementById('registerBtn')?.addEventListener('click', () => {
    const u = document.getElementById('regUsername')?.value;
    const p = document.getElementById('regPassword')?.value;
    const g = document.getElementById('regGame')?.value;
    const d = document.getElementById('regDevice')?.value;
    registerUser(u, p, g, d);
  });

  // Навигация "Назад"
  document.getElementById('backToGamesBtn')?.addEventListener('click', () => {
    switchPage('pageGames');
  });
  document.getElementById('backFromProfileBtn')?.addEventListener('click', () => {
    switchPage(AppState.currentUser ? 'pageGames' : 'pageWelcome');
  });
  document.getElementById('backFromFriendsBtn')?.addEventListener('click', () => {
    switchPage(AppState.currentUser ? 'pageGames' : 'pageWelcome');
  });
  document.getElementById('backFromSettingsBtn')?.addEventListener('click', () => {
    switchPage(AppState.currentUser ? 'pageGames' : 'pageWelcome');
  });
  document.getElementById('backFromAboutBtn')?.addEventListener('click', () => {
    switchPage(AppState.currentUser ? 'pageGames' : 'pageWelcome');
  });
  document.getElementById('backToWelcomeFromGamesBtn')?.addEventListener('click', () => switchPage('pageWelcome'));
  document.getElementById('guestBannerLoginBtn')?.addEventListener('click', () => showAuthModal('login'));

  // Создание анкеты
  document.getElementById('createSquadBtn')?.addEventListener('click', openCreateSquadModal);
  document.getElementById('createSquadModalClose')?.addEventListener('click', closeCreateSquadModal);
  document.getElementById('createSquadModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeCreateSquadModal();
  });
  document.getElementById('submitSquadBtn')?.addEventListener('click', submitSquad);

  // Выбор размера пати (Сколько человек ищет)
  document.querySelectorAll('#squadPartySizeSelector .party-size-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      const size = this.dataset.size || '+1';
      const input = document.getElementById('squadPartySize');
      if (input) input.value = size;
      document.querySelectorAll('#squadPartySizeSelector .party-size-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      if (typeof RetentionEngine !== 'undefined') RetentionEngine.playSound('click');
    });
  });

  // Жалобы
  document.getElementById('complaintModalClose')?.addEventListener('click', closeComplaintModal);
  document.getElementById('complaintModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeComplaintModal();
  });
  document.getElementById('sendComplaintBtn')?.addEventListener('click', sendComplaint);

  // Чат 2.0: Вкладки и управление
  document.getElementById('chatFab')?.addEventListener('click', toggleChat);
  document.getElementById('chatCloseBtn')?.addEventListener('click', closeChat);
  document.getElementById('chatTabWorld')?.addEventListener('click', () => switchChatTab('world'));
  document.getElementById('chatTabDirect')?.addEventListener('click', () => switchChatTab('direct'));

  document.getElementById('chatBackBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    showDirectChatList();
  });

  // Клик по аватарке или имени собеседника в шапке чата
  document.getElementById('chatAvatar')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (AppState.chatPartner) {
      openUserQuickPopover(AppState.chatPartner);
    }
  });

  document.getElementById('chatUserName')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (AppState.chatPartner) {
      openUserQuickPopover(AppState.chatPartner);
    }
  });

  // Мировой чат отправка и индикатор набора
  document.getElementById('worldChatSendBtn')?.addEventListener('click', sendWorldMessage);
  document.getElementById('worldChatInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendWorldMessage();
  });
  document.getElementById('worldChatInput')?.addEventListener('input', () => {
    if (typeof handleWorldInputTyping === 'function') handleWorldInputTyping();
  });
  document.getElementById('worldReplyCancelBtn')?.addEventListener('click', () => {
    if (typeof cancelReply === 'function') cancelReply('world');
  });

  // Личные сообщения отправка и индикатор набора
  document.getElementById('chatSendBtn')?.addEventListener('click', sendMessage);
  document.getElementById('chatInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  document.getElementById('chatInput')?.addEventListener('input', () => {
    if (typeof handleDirectInputTyping === 'function') handleDirectInputTyping();
  });
  document.getElementById('directReplyCancelBtn')?.addEventListener('click', () => {
    if (typeof cancelReply === 'function') cancelReply('direct');
  });

  // Быстрый попап профиля
  document.getElementById('popoverCloseBtn')?.addEventListener('click', closeUserQuickPopover);
  document.getElementById('popoverBackdrop')?.addEventListener('click', closeUserQuickPopover);

  // Модалка первого контакта и заявки в друзья
  document.getElementById('firstContactModalClose')?.addEventListener('click', closeFirstContactModal);
  document.getElementById('firstContactCancelBtn')?.addEventListener('click', closeFirstContactModal);
  document.getElementById('firstContactSendBtn')?.addEventListener('click', submitFirstContact);
  document.getElementById('firstContactModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeFirstContactModal();
  });

  // Модалка удаления переписки (Telegram style)
  document.getElementById('deleteDirectChatHeaderBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (AppState.chatPartner) {
      openDeleteChatModal(AppState.chatPartner);
    }
  });
  document.getElementById('deleteChatModalClose')?.addEventListener('click', closeDeleteChatModal);
  document.getElementById('deleteChatCancelBtn')?.addEventListener('click', closeDeleteChatModal);
  document.getElementById('deleteChatConfirmBtn')?.addEventListener('click', confirmDeleteChat);
  document.getElementById('deleteChatModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeDeleteChatModal();
  });

  // Модалка платного обращения (СМС за коины)
  document.getElementById('paidDmModalClose')?.addEventListener('click', closePaidDmModal);
  document.getElementById('paidDmCancelBtn')?.addEventListener('click', closePaidDmModal);
  document.getElementById('paidDmConfirmBtn')?.addEventListener('click', confirmPaidDm);
  document.getElementById('paidDmModal')?.addEventListener('click', function(e) {
    if (e.target === this) closePaidDmModal();
  });

  // Принятие / отклонение заявки в друзья
  document.getElementById('btnAcceptFriendReq')?.addEventListener('click', handleAcceptFriendReq);
  document.getElementById('btnDeclineFriendReq')?.addEventListener('click', handleDeclineFriendReq);

  // Сохранение стоимости платного сообщения (СМС за коины)
  document.getElementById('saveDmCoinsCostBtn')?.addEventListener('click', function() {
    if (!AppState.currentUser || !AppState.users[AppState.currentUser]) return;
    const input = document.getElementById('dmCoinsCostInput');
    let val = parseInt(input ? input.value : 50, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 10000) val = 10000;
    if (input) input.value = val;

    if (!AppState.users[AppState.currentUser].privacy) {
      AppState.users[AppState.currentUser].privacy = {};
    }
    AppState.users[AppState.currentUser].privacy.dmCost = val;
    saveUsers();
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
      FirebaseSync.saveUser(AppState.currentUser, AppState.users[AppState.currentUser]);
    }
    showNotification('Стоимость сохранена', `Стоимость платного обращения в ЛС установлена: ${val} LC`);
  });

  // Настройки приватности (кто может писать в ЛС)
  document.querySelectorAll('input[name="dmPrivacy"]').forEach(radio => {
    radio.addEventListener('change', function() {
      if (AppState.currentUser && AppState.users[AppState.currentUser]) {
        if (!AppState.users[AppState.currentUser].privacy) {
          AppState.users[AppState.currentUser].privacy = {};
        }
        const isStaff = (typeof isUserCEO === 'function' && isUserCEO(AppState.currentUser)) ||
                        (typeof isUserModerator === 'function' && isUserModerator(AppState.currentUser)) ||
                        (typeof isUserAdmin === 'function' && isUserAdmin(AppState.currentUser));

        let chosenValue = this.value;
        if (chosenValue === 'coins' && !isStaff) {
          chosenValue = 'all';
          const radioAll = document.getElementById('privacyDmAll');
          if (radioAll) radioAll.checked = true;
          showNotification('Ограничение роли', 'Платный доступ к сообщениям доступен только Модераторам и CEO');
        }

        AppState.users[AppState.currentUser].privacy.dmAccess = chosenValue;

        const costBlock = document.getElementById('dmCoinsCostBlock');
        if (costBlock) {
          costBlock.style.display = (isStaff && chosenValue === 'coins') ? 'block' : 'none';
        }

        saveUsers();
        if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
          FirebaseSync.saveUser(AppState.currentUser, AppState.users[AppState.currentUser]);
        }

        let msg = 'Теперь вам могут писать все пользователи';
        if (chosenValue === 'friends') {
          msg = 'Теперь писать в ЛС могут только друзья';
        } else if (chosenValue === 'coins') {
          const cost = AppState.users[AppState.currentUser].privacy.dmCost || 50;
          msg = `Включен платный доступ: ${cost} LC за первое обращение`;
        }

        showNotification('Приватность обновлена', msg);
      }
    });
  });

  // Настройки Push-уведомлений (Включение / Выключение)
  document.getElementById('pushNotifToggle')?.addEventListener('change', function() {
    if (!AppState.currentUser) {
      this.checked = false;
      showNotification('Требуется вход', 'Войдите в аккаунт для настройки уведомлений');
      showAuthModal('login');
      return;
    }

    if (this.checked) {
      if (typeof requestPushNotificationPermission === 'function') {
        requestPushNotificationPermission();
      }
    } else {
      if (typeof setPushNotificationEnabled === 'function') {
        setPushNotificationEnabled(false);
        showNotification('Уведомления отключены', 'Push-уведомления выключены в настройках');
      }
    }
  });

  // Кнопка тестового Push-уведомления
  document.getElementById('testPushBtn')?.addEventListener('click', () => {
    if (!AppState.currentUser) {
      showNotification('Требуется вход', 'Войдите в аккаунт для проверки Push-уведомлений');
      showAuthModal('login');
      return;
    }

    if (!('Notification' in window)) {
      showNotification('Не поддерживается', 'Ваш браузер не поддерживает Push-уведомления');
      return;
    }

    if (Notification.permission === 'granted') {
      if (typeof sendWebPushNotification === 'function') {
        sendWebPushNotification(
          'LOBBIVO Test',
          'Тестовое Push-уведомление успешно получено! Всё работает отлично на вашем устройстве.',
          { isTest: true }
        );
      }
      showNotification('Push отправлен', 'Проверьте шторку уведомлений вашего устройства');
    } else {
      if (typeof requestPushNotificationPermission === 'function') {
        requestPushNotificationPermission();
      }
    }
  });

  // Профиль
  document.getElementById('editProfileBtn')?.addEventListener('click', () => {
    if (!AppState.currentUser) { showAuthModal('login'); return; }
    AppState.isEditing = !AppState.isEditing;
    renderProfile();
  });

  document.getElementById('saveProfileBtn')?.addEventListener('click', saveProfile);
  document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
    AppState.isEditing = false;
    renderProfile();
  });
  document.getElementById('deleteAccountBtn')?.addEventListener('click', deleteAccount);

  // Делегирование клика по аватару профиля для смены фото
  const triggerAvatarUpload = () => {
    if (!AppState.currentUser) {
      showAuthModal('login');
      return;
    }
    const fileInput = document.getElementById('editAvatarFile');
    if (fileInput) {
      fileInput.click();
    }
  };

  document.getElementById('profileAvatar')?.addEventListener('click', triggerAvatarUpload);
  document.getElementById('avatarEditBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerAvatarUpload();
  });

  // Загрузка и мгновенная оптимизация аватара
  document.getElementById('editAvatarFile')?.addEventListener('change', async function() {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      if (file.size > 8 * 1024 * 1024) {
        showNotification('Ошибка', 'Размер изображения не должен превышать 8 МБ');
        this.value = '';
        return;
      }
      
      const isGif = file.type === 'image/gif' || (file.name && file.name.toLowerCase().endsWith('.gif'));
      if (isGif && !isUserPremium(AppState.currentUser)) {
        showNotification('Lobbivo Premium', 'Для установки анимированных GIF-аватарок требуется статус Premium');
        if (typeof openCoinModal === 'function') openCoinModal('shop');
        this.value = '';
        return;
      }

      showNotification('Обработка фото...', 'Оптимизирую изображение для профиля');
      try {
        const compressedBase64 = await compressImage(file, 256, 0.85);
        if (AppState.currentUser && AppState.users[AppState.currentUser]) {
          AppState.users[AppState.currentUser].avatar = compressedBase64;
          AppState.users[AppState.currentUser].avatarUpdatedAt = Date.now();
          AppState.users[AppState.currentUser].updatedAt = Date.now();
          saveUsers(AppState.currentUser, true);
          renderProfile();
          if (typeof updateHeaderAvatar === 'function') updateHeaderAvatar();
          showNotification('Фото обновлено', 'Новый аватар успешно сохранен!');
        }
      } catch (err) {
        showNotification('Ошибка загрузки', err.message || 'Не удалось обработать изображение');
      }
      this.value = '';
    }
  });

  // Настройки тем с системной анимацией загрузки
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', function() {
      const theme = this.dataset.theme;
      const themeName = this.querySelector('.theme-name')?.textContent || theme;
      showSystemLoader('Применяю тему...', 550, () => {
        saveTheme(theme);
        showNotification('Тема изменена', `Выбрана тема: ${themeName}`);
      });
    });
  });

  // ============================================================
  //  СОБЫТИЯ: LOBBIVO COIN HUB (МОНЕТКА, МОДАЛКА, ЗАДАНИЯ, ПОКУПКА)
  // ============================================================
  document.getElementById('capsuleCoinBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openCoinModal('earn');
  });

  document.getElementById('coinModalClose')?.addEventListener('click', closeCoinModal);
  document.getElementById('coinModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeCoinModal();
  });

  // Вкладки Lobbivo Coin Hub
  document.getElementById('tabCoinEarnBtn')?.addEventListener('click', () => switchCoinTab('earn'));
  document.getElementById('tabCoinShopBtn')?.addEventListener('click', () => switchCoinTab('shop'));
  document.getElementById('tabCoinBuyBtn')?.addEventListener('click', () => switchCoinTab('buy'));

  // Переключение категорий магазина
  document.getElementById('shopCategoryNav')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.shop-cat-btn');
    if (!btn) return;
    const cat = btn.dataset.cat;
    if (cat) {
      switchShopCategory(cat);
    }
  });

  // Клик по тарифам Premium в магазине
  document.querySelectorAll('.btn-buy-premium').forEach(btn => {
    btn.addEventListener('click', function() {
      const type = this.dataset.type || 'premium';
      const id = this.dataset.id || 'premium_30';
      const cost = parseInt(this.dataset.cost, 10) || 450;
      const duration = parseInt(this.dataset.duration, 10) || 30;
      buyShopItem(type, id, cost, duration);
    });
  });

  // Делегирование клика по кнопкам заданий
  document.getElementById('coinTasksList')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.task-action-btn');
    if (!btn || btn.disabled) return;
    const task = btn.dataset.task;
    if (task) {
      claimTaskReward(task);
    }
  });

  // Покупка готовых пакетов монет
  document.querySelectorAll('.btn-pack-buy').forEach(btn => {
    btn.addEventListener('click', function() {
      const pack = this.dataset.pack;
      const cost = this.dataset.cost;
      buyCoinPack(pack, cost);
    });
  });

  // Калькулятор конвертации монет
  const calcRublesInput = document.getElementById('calcRubles');
  if (calcRublesInput) {
    calcRublesInput.addEventListener('input', updateCoinConverterLive);
    calcRublesInput.addEventListener('change', updateCoinConverterLive);
  }

  document.getElementById('buyCustomCoinsBtn')?.addEventListener('click', () => {
    const rublesInput = document.getElementById('calcRubles');
    const rubles = Math.max(50, parseInt(rublesInput?.value, 10) || 50);
    const resultEl = document.getElementById('calcCoinsResult');
    const coins = parseInt(resultEl?.textContent?.replace(/\s+/g, ''), 10) || Math.round(rubles * 1.05);
    buyCoinPack(coins, rubles);
  });

  // Уведомления
  document.getElementById('notifClose')?.addEventListener('click', () => {
    document.getElementById('notification')?.classList.remove('show');
    clearTimeout(AppState.notificationTimeout);
  });

  // Глобальная обработка Escape для закрытия всех модалок, меню и чата
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideAuthModal();
      closeCreateSquadModal();
      closeComplaintModal();
      closeCoinModal();
      if (typeof closeAdminPanel === 'function') closeAdminPanel();
      if (typeof closeBanModal === 'function') closeBanModal();
      if (typeof closeMuteModal === 'function') closeMuteModal();
      if (typeof closeFirstContactModal === 'function') closeFirstContactModal();
      if (typeof closePaidDmModal === 'function') closePaidDmModal();
      if (typeof closeUserQuickPopover === 'function') closeUserQuickPopover();
      document.getElementById('userProfileModalOverlay')?.remove();
      document.getElementById('avatarDropdown')?.classList.remove('open');
      document.querySelectorAll('.custom-device-picker.open, .custom-game-picker.open').forEach(p => p.classList.remove('open'));
      if (typeof syncPickerActiveStacking === 'function') syncPickerActiveStacking();
      if (isChatOpen) closeChat();
    }
  });

  // Авторизация по сохраненной сессии и определение стартовой страницы
  const savedSession = localStorage.getItem('squad_session');
  if (savedSession && AppState.users[savedSession]) {
    if (typeof isUserBanned === 'function' && isUserBanned(savedSession)) {
      if (typeof handleBannedUserKickout === 'function') {
        handleBannedUserKickout(savedSession);
      }
    } else {
      AppState.currentUser = savedSession;
      if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
        FirebaseSync.startPresenceHeartbeat(savedSession);
      }
      switchPage('pageGames');
    }
  } else {
    AppState.currentUser = null;
    switchPage('pageWelcome');
  }

  // Настройки платформы: Цензура чата (по умолчанию включена)
  const savedCensorship = localStorage.getItem('lobbivo_chat_censorship');
  AppState.chatCensorship = savedCensorship !== 'false';

  const censorshipToggle = document.getElementById('chatCensorshipToggle');
  if (censorshipToggle) {
    censorshipToggle.checked = AppState.chatCensorship !== false;
    censorshipToggle.addEventListener('change', function() {
      AppState.chatCensorship = this.checked;
      localStorage.setItem('lobbivo_chat_censorship', this.checked ? 'true' : 'false');
      if (AppState.currentUser && AppState.users[AppState.currentUser]) {
        if (!AppState.users[AppState.currentUser].settings) {
          AppState.users[AppState.currentUser].settings = {};
        }
        AppState.users[AppState.currentUser].settings.chatCensorship = this.checked;
        saveUsers();
      }
      if (typeof renderWorldChat === 'function') renderWorldChat();
      if (typeof renderChatMessages === 'function') renderChatMessages();
      if (typeof updateChatList === 'function') updateChatList();
      if (typeof showNotification === 'function') {
        showNotification(
          this.checked ? 'Цензура чата включена' : 'Цензура чата отключена',
          this.checked ? 'Нецензурные выражения в чате теперь блюрятся' : 'Фильтр отключен, сообщения отображаются без цензуры'
        );
      }
    });
  }

  // Переключение категорий в Настройках платформы (Чаты / Приватность)
  const settingsCatTabs = document.querySelectorAll('.settings-category-tab');
  const settingsCatPanels = document.querySelectorAll('.settings-category-panel');

  settingsCatTabs.forEach(tabBtn => {
    tabBtn.addEventListener('click', function() {
      const targetTab = this.dataset.settingsTab;
      settingsCatTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');

      settingsCatPanels.forEach(panel => {
        panel.classList.remove('active');
        panel.style.display = 'none';
      });

      if (targetTab === 'chats') {
        const chatsPanel = document.getElementById('settingsPanelChats');
        if (chatsPanel) {
          chatsPanel.classList.add('active');
          chatsPanel.style.display = 'block';
        }
      } else if (targetTab === 'privacy') {
        const privacyPanel = document.getElementById('settingsPanelPrivacy');
        if (privacyPanel) {
          privacyPanel.classList.add('active');
          privacyPanel.style.display = 'block';
        }
        if (typeof renderPrivacySettings === 'function') {
          renderPrivacySettings();
        }
      }
    });
  });

  // Регистрация PWA Service Worker с устойчивым Stale-While-Revalidate кэшем и Push-уведомлениями
  if ('serviceWorker' in navigator) {
    let hadPreviousController = !!navigator.serviceWorker.controller;
    let swRefreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Перезагружаем ТОЛЬКО при смене старой версии на новую при явном фокусе, а не на первом открытии
      if (hadPreviousController && !swRefreshing) {
        swRefreshing = true;
        console.log('[Lobbivo SW] Обновление Service Worker активировано.');
      }
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js?v=2.9.15', { updateViaCache: 'none' })
        .then((reg) => {
          reg.update().catch(() => {});
          console.log('[Lobbivo SW] Service Worker v2.9.15 активен:', reg.scope);

          // Проверяем обновления при возврате пользователя на вкладку
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              reg.update().catch(() => {});
            }
          });
        })
        .catch((err) => {
          console.warn('[Lobbivo SW] Service Worker registration note:', err);
        });
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'OPEN_DIRECT_CHAT') {
        if (typeof openChat === 'function') openChat();
        if (typeof openDirectChat === 'function') openDirectChat(event.data.sender);
      }
    });
  }

  // Очистка параметра ?nocache= из адресной строки браузера для чистого красивого URL
  if (window.location.search.includes('nocache=')) {
    const cleanSearch = window.location.search
      .replace(/(\?|&)nocache=[^&]*/g, '')
      .replace(/^&/, '?');
    const cleanUrl = window.location.pathname + (cleanSearch || '') + window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  // Проверка прямого перехода в чат из Push-уведомления через URL
  const urlParams = new URLSearchParams(window.location.search);
  const chatPartnerFromUrl = urlParams.get('chat');
  if (chatPartnerFromUrl) {
    setTimeout(() => {
      if (typeof openChat === 'function') openChat();
      if (typeof openDirectChat === 'function') openDirectChat(chatPartnerFromUrl);
    }, 600);
  }

  if (typeof initCategoryTabs === 'function') {
    initCategoryTabs();
  }
  if (typeof RetentionEngine !== 'undefined') {
    RetentionEngine.init();
  }

  updateUI();
}

/**
 * Принудительный сброс локального кэша, PWA Service Worker и чистая перезагрузка
 */
window.forceClearCacheAndReload = async function() {
  if (typeof showNotification === 'function') {
    showNotification('Сброс кэша и обновление файлов...', 'info');
  }
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }
  } catch (err) {
    console.warn('Cache clearing error:', err);
  }
  window.location.href = window.location.origin + window.location.pathname;
};

document.addEventListener('DOMContentLoaded', init);