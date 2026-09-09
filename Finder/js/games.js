// ============================================================
//  ИГРЫ И ПОИСК ТИММЕЙТОВ (GAMES & PLAYERS)
// ============================================================

function getDeviceIconSVG(device) {
  return DEVICE_ICONS[device] || 'icon-device-other';
}

// Мгновенный предзагрузчик всех постеров в кэш браузера
function preloadGameImages() {
  if (typeof window === 'undefined' || !Array.isArray(GAMES)) return;
  GAMES.forEach(game => {
    const src = game.image || `assets/images/games/${game.id}.jpg`;
    const img = new Image();
    img.src = src;
  });
}

let _lastRenderedGameQuery = null;
let _lastRenderedGameAuth = null;

function renderGames(searchQuery = '', force = false) {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;

  const q = (searchQuery || '').trim().toLowerCase();
  const isAuth = !!AppState.currentUser;

  // Если поисковый запрос и статус входа не менялись и карточки уже на месте — не пересоздаем DOM (устраняет мерцание на смартфонах)
  if (!force && _lastRenderedGameQuery === q && _lastRenderedGameAuth === isAuth && grid.children.length > 0) {
    return;
  }

  _lastRenderedGameQuery = q;
  _lastRenderedGameAuth = isAuth;

  const filtered = GAMES.filter(game => {
    if (!q) return true;
    return game.name.toLowerCase().includes(q) || game.id.toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px;">
        <svg><use href="#icon-game"/></svg>
        <h3>Игры не найдены</h3>
        <p>Попробуйте изменить поисковый запрос</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(game => {
    const imgSrc = game.image || `assets/images/games/${game.id}.jpg`;
    return `
      <div class="game-poster-card ${!isAuth ? 'guest-preview' : ''}" data-game="${escapeHtml(game.id)}" style="--card-glow:${escapeHtml(game.glow || '#00d4ff')};">
        <div class="poster-art-wrapper">
          <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(game.name)}" class="poster-image" decoding="async" loading="eager" onerror="this.style.display='none'" />
          <div class="poster-fade-overlay"></div>
        </div>
        <div class="poster-info-wrapper">
          <div class="poster-title">${escapeHtml(game.name)}</div>
          ${isAuth ? `
          <button type="button" class="btn-find-party ${escapeHtml(game.btnTheme || 'cyan')}">
            НАЙТИ ПАТИ
          </button>
          ` : `
          <div class="poster-guest-hint">
            <span>25+ Онлайн</span>
          </div>
          `}
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.game-poster-card').forEach(card => {
    card.addEventListener('click', function() {
      if (!AppState.currentUser) {
        // Режим просмотра: клики по карточкам заблокированы
        return;
      }
      const gameId = this.dataset.game;
      showPlayers(gameId);
    });
  });
}

function getRussianPlural(n, forms) {
  n = Math.abs(n) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

function updateGameCounts() {
  GAMES.forEach(game => {
    const count = Object.values(AppState.users).filter(u => u.game === game.id && u.lookingForTeam).length;
    const el = document.getElementById(`gameCount_${game.id}`);
    if (el) {
      el.textContent = `${count} ${getRussianPlural(count, ['игрок', 'игрока', 'игроков'])}`;
    }
  });
}

function showPlayers(gameId = null) {
  AppState.selectedGameFilter = gameId || 'all';
  switchPage('pagePlayers');

  const titleEl = document.getElementById('playersPageTitle');
  if (titleEl) {
    if (AppState.selectedGameFilter === 'all') {
      titleEl.textContent = 'Все тимейты';
    } else {
      const gameObj = GAMES.find(g => g.id === AppState.selectedGameFilter);
      titleEl.textContent = gameObj ? `${gameObj.name} · Тиммейты` : 'Тиммейты';
    }
  }

  renderPlayers(AppState.selectedGameFilter);
}

function renderPlayers(gameFilter = 'all') {
  const grid = document.getElementById('playersGrid');
  const empty = document.getElementById('emptyPlayers');
  if (!grid || !empty) return;

  const current = AppState.currentUser;
  const list = Object.entries(AppState.users)
    .filter(([name]) => name !== current)
    .filter(([, data]) => {
      // Показывать только тех пользователей, у кого создана и опубликована анкета
      if (!data.lookingForTeam) return false;
      if (gameFilter && gameFilter !== 'all') {
        return data.game === gameFilter;
      }
      return true;
    })
    .sort(([nameA], [nameB]) => {
      // 1. VIP-буст анкеты (первое место)
      const boostA = isSquadVipBoosted(nameA) ? 1 : 0;
      const boostB = isSquadVipBoosted(nameB) ? 1 : 0;
      if (boostA !== boostB) return boostB - boostA;

      // 2. Lobbivo Premium (второе место)
      const premA = isUserPremium(nameA) ? 1 : 0;
      const premB = isUserPremium(nameB) ? 1 : 0;
      if (premA !== premB) return premB - premA;

      // 3. Онлайн статус
      const onlA = isUserOnline(nameA) ? 1 : 0;
      const onlB = isUserOnline(nameB) ? 1 : 0;
      return onlB - onlA;
    });

  if (list.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = list.map(([name, data]) => {
    const game = GAMES.find(g => g.id === data.game) || GAMES[0];
    const safeName = escapeHtml(name);
    const safeRank = escapeHtml(data.rank || '');
    const safeDesc = escapeHtml(data.desc || '');
    const safeDevice = escapeHtml(data.device || 'PC');
    const deviceIconSVG = getDeviceIconSVG(data.device || 'PC');
    const isPremium = isUserPremium(name);
    const isBoosted = isSquadVipBoosted(name);
    const frameId = getUserEquippedFrame(name);
    
    let avatarContent;
    if (data.avatar) {
      avatarContent = `<img src="${data.avatar}" alt="${safeName}">`;
    } else {
      const initials = safeName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      avatarContent = `<span>${initials || '?'}</span>`;
    }

    if (frameId && frameId !== 'none') {
      avatarContent = `<div class="avatar-frame-wrap frame-${frameId}">${avatarContent}</div>`;
    }

    const premiumCrownHtml = isPremium ? '<span class="premium-crown-badge" title="Lobbivo Premium"><svg><use href="#icon-crown"/></svg></span>' : '';
    const vipPillHtml = isBoosted ? '<span class="vip-squad-badge"><svg><use href="#icon-badge-vip"/></svg> VIP СБОР</span>' : '';

    const lookingTag = data.lookingForTeam 
      ? `<span class="looking-for-team"><svg style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:3px;"><use href="#icon-search"/></svg>Ищет команду</span>` 
      : '';

    return `
      <div class="player-card ${isBoosted ? 'vip-boosted-card' : ''} ${isPremium ? 'premium-user-card' : ''}" data-username="${safeName}" data-game="${escapeHtml(data.game || 'csgo')}">
        <div class="player-top">
          <div class="player-avatar">${avatarContent}</div>
          <div class="player-info">
            <div class="player-name">
              <span class="${isPremium ? 'premium-author' : ''}">${safeName}</span>
              ${premiumCrownHtml}
              ${vipPillHtml}
            </div>
            <div class="player-game">
              <svg><use href="#${escapeHtml(game.icon)}"/></svg>
              <span>${escapeHtml(game.name)}</span>
            </div>
          </div>
        </div>
        ${safeRank ? `<div class="player-rank">${safeRank}</div>` : ''}
        ${safeDesc ? `<div class="player-desc">${safeDesc}</div>` : '<div class="player-desc empty-desc">Описание не заполнено</div>'}
        <div class="player-device">
          <svg class="device-icon device-icon-sm"><use href="#${escapeHtml(deviceIconSVG)}"/></svg>
          <span>${safeDevice}</span>
        </div>
        ${lookingTag}
        <div class="player-status-line">
          <span class="online-dot ${isUserOnline(name) ? 'online' : 'offline'}"></span> 
          <span class="status-text">${formatLastSeen(data.lastSeen, name)}</span>
        </div>
        <div class="card-actions">
          <button class="btn btn-outline btn-sm chat-btn" data-username="${safeName}">
            <svg><use href="#icon-chat"/></svg>
            Чат
          </button>
          <button class="btn btn-outline btn-sm report-btn" data-username="${safeName}">
            <svg><use href="#icon-flag"/></svg>
            Жалоба
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Обработчики кнопок карточек
  grid.querySelectorAll('.chat-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const username = this.dataset.username;
      initiateChatWith(username);
    });
  });

  grid.querySelectorAll('.report-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const username = this.dataset.username;
      if (!AppState.currentUser) {
        showNotification('Требуется вход', 'Войдите в аккаунт, чтобы отправить жалобу');
        showAuthModal('login');
        return;
      }
      openComplaintModal(username);
    });
  });

  grid.querySelectorAll('.player-card').forEach(card => {
    card.addEventListener('click', function() {
      const username = this.dataset.username;
      showUserProfileModal(username);
    });
  });
}

function showUserProfileModal(username) {
  const data = AppState.users[username];
  if (!data) return;

  const safeName = escapeHtml(username);
  const game = GAMES.find(g => g.id === data.game) || GAMES[0];
  const deviceIconSVG = getDeviceIconSVG(data.device);
  const safeRank = escapeHtml(data.rank || 'Не указан');
  const safeDesc = escapeHtml(data.desc || 'Информация о себе не указана');
  const safeDevice = escapeHtml(data.device || 'Не указано');

  let avatarHtml;
  if (data.avatar) {
    avatarHtml = `<img src="${data.avatar}" alt="${safeName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    const initials = safeName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    avatarHtml = initials || '?';
  }

  const isViewerAdmin = typeof isUserAdmin === 'function' && isUserAdmin(AppState.currentUser);
  const isTargetBanned = typeof isUserBanned === 'function' && isUserBanned(username);
  const isTargetMuted = typeof isUserMuted === 'function' && isUserMuted(username);

  let adminActionsHtml = '';
  if (isViewerAdmin && AppState.currentUser !== username) {
    adminActionsHtml = `
      <div class="modal-admin-section">
        <div class="admin-section-title">
          <svg style="width:14px;height:14px;"><use href="#icon-admin-shield"/></svg>
          <span>Управление администратора</span>
        </div>
        <div class="admin-actions-grid">
          ${isTargetBanned 
            ? `<button type="button" class="btn btn-sm btn-outline" id="modalAdminUnbanBtn">✅ Снять бан</button>`
            : `<button type="button" class="btn btn-sm btn-danger" id="modalAdminBanBtn">🔨 Забанить игрока</button>`
          }
          ${isTargetMuted 
            ? `<button type="button" class="btn btn-sm btn-outline" id="modalAdminUnmuteBtn">🔊 Снять мут</button>`
            : `<button type="button" class="btn btn-sm btn-warning" id="modalAdminMuteBtn">🔇 Замьютить в чате</button>`
          }
        </div>
      </div>
    `;
  }

  const existing = document.getElementById('userProfileModalOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'userProfileModalOverlay';
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal user-profile-modal" style="max-width: 480px;">
      <button class="modal-close" id="closeUserModalBtn">
        <svg><use href="#icon-close"/></svg>
      </button>
      <h2>
        <svg><use href="#icon-profile"/></svg>
        Профиль игрока
      </h2>
      <div class="modal-user-header">
        <div class="modal-user-avatar">
          ${avatarHtml}
        </div>
        <div>
          <div class="modal-user-name">
            ${safeName}
            ${isTargetBanned ? '<span class="admin-badge badge-ban" style="margin-left:6px;">БАН</span>' : ''}
            ${isTargetMuted ? '<span class="admin-badge badge-mute" style="margin-left:6px;">МУТ</span>' : ''}
          </div>
          <div class="modal-user-game">
            <svg><use href="#${escapeHtml(game.icon)}"/></svg>
            ${escapeHtml(game.name)}
          </div>
          <div class="modal-user-meta">
            <svg class="device-icon device-icon-sm"><use href="#${escapeHtml(deviceIconSVG)}"/></svg>
            ${safeDevice} · ID: ${data.id || '---'}
          </div>
          <div class="modal-user-status" style="margin-top: 4px; font-size: 0.8rem; font-weight: 600; color: ${isUserOnline(username) ? '#00ff9d' : 'var(--text-muted)'};">
            <span class="online-dot ${isUserOnline(username) ? 'online' : 'offline'}" style="display:inline-block; vertical-align:middle; margin-right:4px;"></span>
            ${formatLastSeen(data.lastSeen, username)}
          </div>
        </div>
      </div>
      <div class="profile-field">
        <label>Ранг / Уровень</label>
        <div class="value">${safeRank}</div>
      </div>
      <div class="profile-field">
        <label>О себе</label>
        <div class="value">${safeDesc}</div>
      </div>
      ${adminActionsHtml}
      <div class="modal-user-actions">
        <button class="btn" id="modalChatBtn">
          <svg><use href="#icon-chat"/></svg>
          Написать сообщение
        </button>
        <button class="btn btn-outline modal-report-btn" id="modalReportBtn">
          <svg><use href="#icon-flag"/></svg>
          Пожаловаться
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#closeUserModalBtn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector('#modalChatBtn').addEventListener('click', () => {
    overlay.remove();
    initiateChatWith(username);
  });

  overlay.querySelector('#modalReportBtn').addEventListener('click', () => {
    overlay.remove();
    if (!AppState.currentUser) {
      showNotification('Требуется вход', 'Войдите в аккаунт, чтобы пожаловаться');
      showAuthModal('login');
      return;
    }
    openComplaintModal(username);
  });

  // Админские обработчики в карточке профиля
  overlay.querySelector('#modalAdminBanBtn')?.addEventListener('click', () => {
    if (typeof openBanModal === 'function') openBanModal(username);
  });
  overlay.querySelector('#modalAdminUnbanBtn')?.addEventListener('click', () => {
    if (typeof adminUnbanUser === 'function') adminUnbanUser(username);
  });
  overlay.querySelector('#modalAdminMuteBtn')?.addEventListener('click', () => {
    if (typeof openMuteModal === 'function') openMuteModal(username);
  });
  overlay.querySelector('#modalAdminUnmuteBtn')?.addEventListener('click', () => {
    if (typeof adminUnmuteUser === 'function') adminUnmuteUser(username);
  });
}