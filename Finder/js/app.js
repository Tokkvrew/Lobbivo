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

  if (pageId === 'pageSettings') {
    if (typeof renderPrivacySettings === 'function') renderPrivacySettings();
    if (typeof renderBlacklistSettings === 'function') renderBlacklistSettings();
    if (typeof renderSettingsCustomization === 'function') renderSettingsCustomization();
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

  const targetData = AppState.users[target];
  const complaint = {
    id: Date.now(),
    target: target,
    targetId: targetData?.id || '---',
    from: AppState.currentUser,
    reason: reason,
    date: new Date().toLocaleString('ru-RU'),
    status: 'pending'
  };

  AppState.complaints.push(complaint);
  saveComplaints();

  showNotification(
    '✅ Жалоба принята',
    `Жалоба на пользователя ${target} отправлена модераторам.`
  );

  closeComplaintModal();
}

// ============================================================
//  СОЗДАНИЕ АНКЕТЫ (CREATE SQUAD)
// ============================================================

function openCreateSquadModal() {
  if (!AppState.currentUser) {
    showNotification('Требуется вход', 'Войдите в аккаунт, чтобы создать анкету');
    showAuthModal('login');
    return;
  }

  const modal = document.getElementById('createSquadModal');
  const squadRank = document.getElementById('squadRank');
  const squadDesc = document.getElementById('squadDescription');
  const squadGameSelect = document.getElementById('squadGame');
  const gameField = document.getElementById('squadGameField');
  const currentFilter = AppState.selectedGameFilter || 'all';

  if (squadRank) squadRank.value = AppState.users[AppState.currentUser]?.rank || '';
  if (squadDesc) squadDesc.value = AppState.users[AppState.currentUser]?.desc || '';
  if (typeof setDevicePickerValue === 'function') {
    setDevicePickerValue('squadDevicePicker', AppState.users[AppState.currentUser]?.device || 'PC');
  }

  if (currentFilter !== 'all') {
    if (typeof setGamePickerValue === 'function') setGamePickerValue('squadGamePicker', currentFilter);
    if (gameField) gameField.style.display = 'none';
  } else {
    const userGame = AppState.users[AppState.currentUser]?.game || 'csgo';
    if (typeof setGamePickerValue === 'function') setGamePickerValue('squadGamePicker', userGame);
    if (gameField) gameField.style.display = 'block';
  }

  modal.classList.add('show');
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

  const currentFilter = AppState.selectedGameFilter || 'all';
  let game;
  if (currentFilter !== 'all') {
    game = currentFilter;
  } else {
    game = document.getElementById('squadGame')?.value || 'csgo';
  }

  const rank = (document.getElementById('squadRank')?.value || '').trim();
  const device = document.getElementById('squadDevice')?.value || 'PC';
  const rawDescription = (document.getElementById('squadDescription')?.value || '').trim();

  if (!rawDescription) {
    showNotification('Ошибка', 'Пожалуйста, добавьте описание вашей анкеты');
    return;
  }

  const description = typeof SecurityShield !== 'undefined' ? SecurityShield.sanitizeText(rawDescription, 500) : rawDescription;

  const userData = AppState.users[AppState.currentUser];
  if (!userData) return;

  userData.game = game;
  userData.rank = rank || userData.rank || 'Не указан';
  userData.device = device;
  userData.desc = description;
  userData.lookingForTeam = true;
  userData.hasCreatedSquad = true;

  saveUsers();
  closeCreateSquadModal();
  showNotification('✅ Анкета опубликована', 'Ваша анкета теперь видна в каталоге игроков!');

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
    const glyphs = ['0', '1', '<', '>', '/', '#', '$', 'λ', '⌘', '⚡'];
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

function renderShopItems() {
  const current = AppState.currentUser;
  const user = current ? AppState.users[current] : null;
  const isPremium = current ? isUserPremium(current) : false;
  const inventory = current ? getUserInventory(current) : { frames: [], themes: [], boosts: 0 };
  const hasVipBoost = current ? isSquadVipBoosted(current) : false;

  // 1. Статус Premium
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

  // Обновление кнопок тарифов Premium
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

  // 2. Рамки: аватарки превью и кнопки
  const frameIds = ['fire', 'cyber', 'gold', 'ice', 'ghost'];
  frameIds.forEach(id => {
    const previewEl = document.getElementById(`framePreview_${id}`);
    if (previewEl) {
      if (user && user.avatar) {
        previewEl.innerHTML = `<img src="${user.avatar}" alt="${escapeHtml(current)}">`;
      } else {
        const initials = current ? current.slice(0, 2).toUpperCase() : 'VIP';
        previewEl.innerHTML = `<span>${initials}</span>`;
      }
    }

    const btn = document.querySelector(`.btn-frame-action[data-frame-id="${id}"]`);
    if (btn) {
      const isOwned = inventory.frames.includes(id);

      if (isOwned) {
        btn.className = 'btn-shop-action btn-frame-action bought-disabled';
        btn.disabled = true;
        btn.innerHTML = '<svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"><use href="#icon-check-circle"/></svg><span>Куплено</span>';
        btn.onclick = null;
      } else {
        btn.disabled = false;
        btn.className = 'btn-shop-action btn-frame-action';
        const cost = parseInt(btn.dataset.cost, 10) || 120;
        const discountCost = isPremium ? Math.round(cost * 0.9) : cost;
        btn.textContent = isPremium ? `Купить (${discountCost} LC -10%)` : `Купить (${cost} LC)`;
        btn.onclick = () => buyShopItem('frame', id, cost);
      }
    }
  });

  // 3. VIP-Буст анкеты
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

  // 4. Темы оформления
  const themeIds = ['nebula', 'crimson', 'matrix'];
  themeIds.forEach(id => {
    const btn = document.querySelector(`.btn-theme-action[data-theme-id="${id}"]`);
    if (btn) {
      const isOwned = inventory.themes.includes(id);

      if (isOwned) {
        btn.className = 'btn-shop-action btn-theme-action bought-disabled';
        btn.disabled = true;
        btn.innerHTML = '<svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"><use href="#icon-check-circle"/></svg><span>Куплено</span>';
        btn.onclick = null;
      } else {
        btn.disabled = false;
        btn.className = 'btn-shop-action btn-theme-action';
        const cost = parseInt(btn.dataset.cost, 10) || 80;
        const discountCost = isPremium ? Math.round(cost * 0.9) : cost;
        btn.textContent = isPremium ? `Купить (${discountCost} LC -10%)` : `Купить (${cost} LC)`;
        btn.onclick = () => buyShopItem('theme', id, cost);
      }
    }
  });
}

function buyShopItem(type, id, baseCost, durationDays = 0) {
  const current = AppState.currentUser;
  if (!current || !AppState.users[current]) {
    showNotification('Требуется вход', 'Войдите или создайте аккаунт, чтобы делать покупки в магазине!');
    showAuthModal('login');
    return;
  }

  const user = AppState.users[current];
  const isPremium = isUserPremium(current);
  const cost = (type !== 'premium' && isPremium) ? Math.round(baseCost * 0.9) : baseCost;

  if (typeof user.coins !== 'number') user.coins = 0;

  if (user.coins < cost) {
    showNotification('Недостаточно LC', `Для покупки требуется ${cost} LC. На вашем балансе: ${user.coins} LC.`);
    switchCoinTab('buy');
    return;
  }

  // Списание монет
  user.coins -= cost;

  if (type === 'premium') {
    if (durationDays >= 9999) {
      user.isPremium = true;
      user.premiumUntil = null;
    } else {
      const currentUntil = (user.premiumUntil && Number(user.premiumUntil) > Date.now()) ? Number(user.premiumUntil) : Date.now();
      user.premiumUntil = currentUntil + (durationDays * 24 * 60 * 60 * 1000);
      user.isPremium = true;
    }
    showNotification('Поздравляем с Premium!', 'Вам открыты GIF-аватарки, значок короны, неоновый ник и приоритет в поиске!');
  } else if (type === 'frame') {
    if (!user.inventory || typeof user.inventory !== 'object') user.inventory = { frames: [], themes: [], boosts: 0 };
    if (!Array.isArray(user.inventory.frames)) user.inventory.frames = [];
    if (!user.inventory.frames.includes(id)) {
      user.inventory.frames.push(id);
    }
    showNotification('Рамка куплена!', 'Новая рамка добавлена в раздел «Кастомизация» в Настройках вашего профиля.');
  } else if (type === 'boost') {
    const now = Date.now();
    const currentUntil = (user.vipBoostUntil && Number(user.vipBoostUntil) > now) ? Number(user.vipBoostUntil) : now;
    user.vipBoostUntil = currentUntil + (24 * 60 * 60 * 1000);
    user.lookingForTeam = true;
    user.hasCreatedSquad = true;
    showNotification('VIP-Закреп активирован!', 'Ваша анкета закреплена в шапке мирового чата на 24 часа!');
  } else if (type === 'theme') {
    if (!user.inventory || typeof user.inventory !== 'object') user.inventory = { frames: [], themes: [], boosts: 0 };
    if (!Array.isArray(user.inventory.themes)) user.inventory.themes = [];
    if (!user.inventory.themes.includes(id)) {
      user.inventory.themes.push(id);
    }
    showNotification('Тема куплена!', 'Новая тема добавлена в раздел «Кастомизация» в Настройках вашего профиля.');
  }

  saveUsers(current);
  renderCoinModal();
  renderShopItems();
  if (typeof renderSettingsCustomization === 'function') renderSettingsCustomization();
  if (typeof renderWorldChat === 'function') renderWorldChat();
  if (typeof renderPlayers === 'function') renderPlayers(AppState.selectedGameFilter);
  if (typeof updateUI === 'function') updateUI();

  // Звуковой эффект
  if (typeof playNotificationSound === 'function') {
    playNotificationSound();
  }
}

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
      taskBtnAvatar.innerHTML = '<span>✅ Забрано</span>';
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
      taskBtnBio.innerHTML = '<span>✅ Забрано</span>';
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
      taskBtnSquad.innerHTML = '<span>✅ Забрано</span>';
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
      taskBtnTeammates.innerHTML = '<span>✅ Забрано</span>';
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
      badgeEl.textContent = remainingTasks > 0 ? `${remainingTasks}` : '✓';
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
  showNotification('🎉 Награда получена!', `Задание ${taskTitles[taskId]} выполнено: +${rewardAmount} LC начислено на ваш баланс!`);
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
      showNotification('✅ Баланс пополнен', `Успешно начислено +${coins} Lobbivo Coins! Спасибо за поддержку платформы.`);
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
      document.querySelectorAll('.custom-device-picker.open').forEach(p => {
        if (p !== picker) p.classList.remove('open');
      });
      picker.classList.toggle('open', !isOpen);
    });

    // Выбор устройства при клике на карточку
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.device-option-card');
      if (!card) return;
      e.stopPropagation();

      const devId = card.dataset.device;
      setDevicePickerValue(picker.id, devId);
      picker.classList.remove('open');
    });
  });

  // Закрытие при клике вне панели
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-device-picker')) {
      document.querySelectorAll('.custom-device-picker.open').forEach(p => p.classList.remove('open'));
    }
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
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-game-picker')) {
      document.querySelectorAll('.custom-game-picker.open').forEach(p => p.classList.remove('open'));
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
        if (isChatOpen) closeChat();
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
      if (isChatOpen) closeChat();
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

  // Дропдаун профиля в шапке
  const avatarWrapper = document.getElementById('avatarWrapper');
  const avatarDropdown = document.getElementById('avatarDropdown');
  if (avatarWrapper && avatarDropdown) {
    avatarWrapper.addEventListener('click', (e) => {
      e.stopPropagation();
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
      if (action === 'admin') {
        if (typeof openAdminPanel === 'function') openAdminPanel('complaints');
      } else if (action === 'coins') {
        openCoinModal('earn');
      } else if (action === 'profile') {
        showProfile('overview');
      } else if (action === 'customization') {
        showProfile('custom');
      } else if (action === 'login') {
        showAuthModal('login');
      } else if (action === 'register') {
        showAuthModal('register');
      } else if (action === 'settings') {
        switchPage('pageSettings');
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

  // Принятие / отклонение заявки в друзья
  document.getElementById('btnAcceptFriendReq')?.addEventListener('click', handleAcceptFriendReq);
  document.getElementById('btnDeclineFriendReq')?.addEventListener('click', handleDeclineFriendReq);

  // Настройки приватности (кто может писать в ЛС)
  document.querySelectorAll('input[name="dmPrivacy"]').forEach(radio => {
    radio.addEventListener('change', function() {
      if (AppState.currentUser && AppState.users[AppState.currentUser]) {
        if (!AppState.users[AppState.currentUser].privacy) {
          AppState.users[AppState.currentUser].privacy = {};
        }
        AppState.users[AppState.currentUser].privacy.dmAccess = this.value;
        saveUsers();
        if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
          FirebaseSync.saveUser(AppState.currentUser, AppState.users[AppState.currentUser]);
        }
        showNotification(
          'Приватность обновлена',
          this.value === 'all' ? 'Теперь вам могут писать все пользователи' : 'Теперь писать в ЛС могут только друзья'
        );
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
          '🔥 Тестовое Push-уведомление успешно получено! Всё работает отлично на вашем устройстве.',
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
  document.getElementById('profileAvatar')?.addEventListener('click', (e) => {
    if (e.target.closest('#avatarEditBtn') || e.target.closest('.profile-avatar')) {
      if (!AppState.currentUser) return;
      document.getElementById('editAvatarFile')?.click();
    }
  });

  // Загрузка и оптимизация аватара
  document.getElementById('editAvatarFile')?.addEventListener('change', async function() {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Ошибка', 'Размер изображения не должен превышать 5 МБ');
        this.value = '';
        return;
      }
      try {
        const compressedBase64 = await compressImage(file, 256, 0.85);
        if (AppState.currentUser && AppState.users[AppState.currentUser]) {
          AppState.users[AppState.currentUser].avatar = compressedBase64;
          saveUsers();
          renderProfile();
          showNotification('Фото обновлено', 'Новый аватар успешно сохранен!');
        }
      } catch (err) {
        showNotification('Ошибка', err.message || 'Не удалось обработать изображение');
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
      if (typeof closeUserQuickPopover === 'function') closeUserQuickPopover();
      document.getElementById('userProfileModalOverlay')?.remove();
      document.getElementById('avatarDropdown')?.classList.remove('open');
      document.querySelectorAll('.custom-device-picker.open, .custom-game-picker.open').forEach(p => p.classList.remove('open'));
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

  updateUI();
}

document.addEventListener('DOMContentLoaded', init);