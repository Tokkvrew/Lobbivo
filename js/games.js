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
let _lastRenderedCategory = null;

function renderGames(searchQuery = '', force = false, category = null) {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;

  const activeCategory = category || AppState.currentCategoryFilter || 'popular';
  AppState.currentCategoryFilter = activeCategory;

  const q = (searchQuery || '').trim().toLowerCase();
  const isAuth = !!AppState.currentUser;

  // Обновляем визуальное состояние табов категорий
  document.querySelectorAll('#gameCategoryTabs .category-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.category === activeCategory);
  });

  // Если поисковый запрос, статус входа и категория не менялись и карточки уже на месте — не пересоздаем DOM
  if (!force && _lastRenderedGameQuery === q && _lastRenderedGameAuth === isAuth && _lastRenderedCategory === activeCategory && grid.children.length > 0) {
    return;
  }

  _lastRenderedGameQuery = q;
  _lastRenderedGameAuth = isAuth;
  _lastRenderedCategory = activeCategory;

  let filtered = GAMES.filter(game => {
    // Фильтр по категории
    if (activeCategory === 'popular') {
      if (!game.featured) return false;
    } else if (activeCategory !== 'all' && game.category !== activeCategory) {
      return false;
    }
    // Фильтр по поиску
    if (q) {
      const matchName = game.name.toLowerCase().includes(q);
      const matchId = game.id.toLowerCase().includes(q);
      const matchTag = game.tagLine ? game.tagLine.toLowerCase().includes(q) : false;
      return matchName || matchId || matchTag;
    }
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px;">
        <svg><use href="#icon-game"/></svg>
        <h3>Игры не найдены</h3>
        <p>Попробуйте выбрать другую категорию или изменить поисковый запрос</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map((game, idx) => {
    const imgSrc = game.image || `assets/images/games/${game.id}.jpg`;
    const loadStrategy = idx < 8 ? 'eager' : 'lazy';
    const isFeatured = Boolean(game.featured);
    const categoryObj = GAME_CATEGORIES.find(c => c.id === game.category);
    const tagLine = game.tagLine || 'Поиск тиммейтов';

    return `
      <div class="game-poster-card ${isFeatured ? 'featured-game-card' : ''} ${!isAuth ? 'guest-preview' : ''}" data-game="${escapeHtml(game.id)}" style="--card-glow:${escapeHtml(game.glow || '#00d4ff')};">
        ${isFeatured ? `
          <div class="featured-top-ribbon">
            <svg><use href="#${categoryObj ? categoryObj.icon : 'icon-sparkles'}"/></svg>
            <span>ТОП ИГРА</span>
          </div>
        ` : ''}
        <div class="poster-art-wrapper">
          <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(game.name)}" class="poster-image" decoding="async" loading="${loadStrategy}" onerror="this.onerror=null; this.classList.add('img-fallback-hidden');" />
          <div class="poster-fallback-backdrop">
            <svg class="poster-fallback-icon"><use href="#${escapeHtml(game.icon || 'icon-game')}"/></svg>
          </div>
          <div class="poster-fade-overlay"></div>
        </div>
        <div class="poster-info-wrapper">
          <div class="poster-title">${escapeHtml(game.name)}</div>
          <div class="poster-tagline">${escapeHtml(tagLine)}</div>
          ${isAuth ? `
          <button type="button" class="btn-find-party ${escapeHtml(game.btnTheme || 'cyan')}">
            <svg><use href="#icon-users"/></svg>
            <span>НАЙТИ ПАТИ</span>
          </button>
          ` : `
          <div class="poster-guest-hint">
            <svg><use href="#icon-users"/></svg>
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
        showAuthModal('login');
        return;
      }
      const gameId = this.dataset.game;
      if (typeof RetentionEngine !== 'undefined') RetentionEngine.playSound('click');
      showPlayers(gameId);
    });
  });
}

// Привязка кликов по табам категорий
function initCategoryTabs() {
  const container = document.getElementById('gameCategoryTabs');
  if (!container) return;

  container.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const category = this.dataset.category || 'all';
      if (typeof RetentionEngine !== 'undefined') {
        RetentionEngine.playSound('click');
        RetentionEngine.haptic('light');
      }
      renderGames(document.getElementById('gameSearchInput')?.value || '', true, category);
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

function getPartySizeLabel(size) {
  switch (size) {
    case '+1': return '+1 в пати (Дуо)';
    case '+2': return '+2 в пати (Трио)';
    case '+3': return '+3 в пати (Сквад)';
    case '+4': return '+4 (Фулл стак)';
    case 'solo': return 'Ищу стак (Я один)';
    default: return size ? `${size}` : '+1 в пати';
  }
}

function updateGameCounts() {
  GAMES.forEach(game => {
    let count = 0;
    for (const [uname, user] of Object.entries(AppState.users)) {
      if (!user) continue;
      if (Array.isArray(user.squads) && user.squads.length > 0) {
        if (user.squads.some(s => s && s.active !== false && s.game === game.id)) {
          count++;
        }
      } else if (user.game === game.id && user.lookingForTeam) {
        count++;
      }
    }
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

// ============================================================
//  УПРАВЛЕНИЕ АНКЕТАМИ ПОЛЬЗОВАТЕЛЕЙ (SQUAD & APPLICATION ENGINE)
// ============================================================

function getUserSquads(username) {
  if (!username) return [];
  const u = AppState.users[username];
  if (!u) return [];

  let squads = u.squads;
  if (!Array.isArray(squads)) {
    if (squads && typeof squads === 'object') {
      squads = Object.values(squads);
      u.squads = squads;
    } else {
      squads = [];
    }
  }

  return squads.filter(s => s && typeof s === 'object' && s.active !== false);
}

function renderMySquads() {
  const current = AppState.currentUser;
  const listContainer = document.getElementById('profileMySquadsList');
  const modalListContainer = document.getElementById('mySquadsModalList');
  const countBadge = document.getElementById('headerSquadsCount');

  if (!current || !AppState.users[current]) {
    const guestHtml = `
      <div class="my-squads-empty">
        <div class="my-squads-empty-icon">
          <svg><use href="#icon-users"/></svg>
        </div>
        <div class="empty-title">Войдите в аккаунт</div>
        <div class="empty-sub">Авторизуйтесь, чтобы создавать и редактировать ваши анкеты поиска тиммейтов</div>
        <button type="button" class="btn btn-sm btn-primary-glow" onclick="showAuthModal('login')">Войти в аккаунт</button>
      </div>
    `;
    if (listContainer) listContainer.innerHTML = guestHtml;
    if (modalListContainer) modalListContainer.innerHTML = guestHtml;
    if (countBadge) countBadge.textContent = '';
    return;
  }

  const squads = getUserSquads(current);
  if (countBadge) {
    countBadge.textContent = squads.length > 0 ? squads.length : '';
    countBadge.style.display = squads.length > 0 ? 'inline-block' : 'none';
  }

  if (squads.length === 0) {
    const emptyHtml = `
      <div class="my-squads-empty">
        <div class="my-squads-empty-icon">
          <svg><use href="#icon-users"/></svg>
        </div>
        <div class="empty-title">У вас пока нет активных анкет</div>
        <div class="empty-sub">Создайте анкету поиска напарников для нужной игры — и другие игроки смогут найти вас в каталоге и написать в чат!</div>
        <button type="button" class="btn btn-primary-glow" onclick="if(document.getElementById('mySquadsModal')?.classList.contains('show')) closeMySquadsModal(); openCreateSquadModal();">
          <svg><use href="#icon-plus"/></svg>
          <span>Создать первую анкету</span>
        </button>
      </div>
    `;
    if (listContainer) listContainer.innerHTML = emptyHtml;
    if (modalListContainer) modalListContainer.innerHTML = emptyHtml;
    return;
  }

  const squadsHtml = `
    <div class="my-squads-grid">
      ${squads.map(sq => {
        const game = GAMES.find(g => g.id === sq.game) || GAMES[0];
        const safeRank = escapeHtml(sq.rank || 'Не указан');
        const safeDesc = escapeHtml(sq.desc || 'Описание не заполнено');
        const safeDevice = escapeHtml(sq.device || 'PC');
        const devIcon = getDeviceIconSVG(sq.device || 'PC');
        const dateStr = sq.createdAt ? new Date(sq.createdAt).toLocaleDateString('ru-RU') : 'недавно';
        const isBoosted = isSquadVipBoosted(current);

        return `
          <div class="my-squad-card ${isBoosted ? 'vip-active' : ''}" data-squad-id="${sq.id}">
            <div class="my-squad-card-top">
              <div class="my-squad-game-badge">
                <svg><use href="#${game.icon}"/></svg>
                <span>${game.name}</span>
              </div>
              <div class="my-squad-status-badges">
                ${isBoosted ? '<span class="badge-squad-vip"><svg><use href="#icon-badge-vip"/></svg> VIP Закреп</span>' : '<span class="badge-squad-active"><span class="pulse-dot active" style="width:6px;height:6px;background:#34d399;border-radius:50%;display:inline-block;margin-right:5px;box-shadow:0 0 6px #34d399;"></span>Опубликована</span>'}
              </div>
            </div>

            <div class="my-squad-info-row">
              <div class="squad-info-pill">
                <span class="info-label">Состав:</span>
                <span class="info-val">${escapeHtml(getPartySizeLabel(sq.partySize || '+1'))}</span>
              </div>
              <div class="squad-info-pill">
                <span class="info-label">Ранг:</span>
                <span class="info-val">${safeRank}</span>
              </div>
              <div class="squad-info-pill">
                <span class="info-label">Платформа:</span>
                <span class="info-val"><svg class="device-icon device-icon-sm"><use href="#${devIcon}"/></svg> ${safeDevice}</span>
              </div>
            </div>

            <div class="my-squad-desc-box">
              <div class="desc-text">${safeDesc}</div>
            </div>

            <!-- ТУМБЛЕР ЗАКРЕПЛЕНИЯ АНКЕТЫ В ЧАТЕ -->
            <div class="my-squad-pin-row">
              <div class="pin-toggle-info">
                <svg style="width:14px;height:14px;color:var(--neon-cyan);display:inline-block;vertical-align:middle;margin-right:6px;"><use href="#icon-badge-vip"/></svg>
                <span style="font-size:0.82rem;font-weight:600;color:var(--text-primary);">Закрепить вашу анкету в чате</span>
              </div>
              <label class="cyber-switch cyber-switch-sm" title="Закрепить или открепить эту анкету в шапке мирового чата">
                <input type="checkbox" onchange="toggleSquadPinInChat('${sq.id}', this.checked)" ${sq.pinnedInChat ? 'checked' : ''}>
                <span class="cyber-switch-slider"></span>
              </label>
            </div>

            <div class="my-squad-card-footer">
              <span class="squad-date">Создана: ${dateStr}</span>
              <div class="my-squad-actions">
                <button type="button" class="btn-squad-action btn-edit-squad" onclick="openEditSquadModal('${sq.id}')" title="Редактировать анкету">
                  <svg><use href="#icon-sparkles"/></svg>
                  <span>Редактировать</span>
                </button>
                <button type="button" class="btn-squad-action btn-delete-squad" onclick="deleteSquad('${sq.id}')" title="Удалить анкету">
                  <svg><use href="#icon-ban"/></svg>
                  <span>Удалить</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  if (listContainer) listContainer.innerHTML = squadsHtml;
  if (modalListContainer) modalListContainer.innerHTML = squadsHtml;
}

/**
 * Переключение закрепления анкеты в шапке мирового чата (по умолчанию выключено)
 */
function toggleSquadPinInChat(squadId, isPinned) {
  if (!AppState.currentUser) return;
  const user = AppState.users[AppState.currentUser];
  if (!user || !Array.isArray(user.squads)) return;

  user.squads.forEach(s => {
    if (s.id === squadId) {
      s.pinnedInChat = Boolean(isPinned);
    } else if (isPinned) {
      // Только одна анкета пользователя может быть одновременно закреплена
      s.pinnedInChat = false;
    }
  });

  saveUsers();
  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    FirebaseSync.saveUser(AppState.currentUser, user);
  }

  renderMySquads();
  if (typeof renderVipSquadPinnedBar === 'function') {
    renderVipSquadPinnedBar();
  }

  showNotification(
    isPinned ? 'Закреплено в чате' : 'Закрепление снято',
    isPinned ? 'Ваша анкета теперь закреплена в шапке мирового чата!' : 'Анкета откреплена из шапки чата'
  );
}

function openMySquadsModal() {
  if (!AppState.currentUser) {
    showNotification('Требуется вход', 'Войдите в аккаунт, чтобы просматривать ваши анкеты');
    showAuthModal('login');
    return;
  }
  renderMySquads();
  const modal = document.getElementById('mySquadsModal');
  if (modal) modal.classList.add('show');
}

function closeMySquadsModal() {
  const modal = document.getElementById('mySquadsModal');
  if (modal) modal.classList.remove('show');
}

function openEditSquadModal(squadId) {
  if (!AppState.currentUser) return;
  const squads = getUserSquads(AppState.currentUser);
  const sq = squads.find(s => s.id === squadId);
  if (!sq) {
    showNotification('Ошибка', 'Анкета не найдена');
    return;
  }

  // Закрываем модалку со списком если была открыта
  closeMySquadsModal();
  if (typeof openCreateSquadModal === 'function') {
    openCreateSquadModal(sq.game, sq.id);
  }
}

function deleteSquad(squadId) {
  if (!AppState.currentUser) return;
  if (!confirm('Вы действительно хотите удалить эту анкету из каталога игроков?')) {
    return;
  }

  const user = AppState.users[AppState.currentUser];
  if (!user) return;

  if (Array.isArray(user.squads)) {
    user.squads = user.squads.filter(s => s.id !== squadId);
    user.lookingForTeam = user.squads.some(s => s.active !== false);
    user.hasCreatedSquad = user.squads.length > 0;
    if (user.squads.length > 0) {
      user.game = user.squads[0].game || user.game;
    }
  } else {
    user.squads = [];
    user.lookingForTeam = false;
    user.hasCreatedSquad = false;
  }

  saveUsers(AppState.currentUser, true);
  if (typeof renderMySquads === 'function') renderMySquads();
  renderPlayers(AppState.selectedGameFilter || 'all');
  updateGameCounts();
  if (typeof updateUI === 'function') updateUI();
  showNotification('Анкета удалена', 'Ваша анкета успешно удалена из каталога игроков');
}

function renderPlayers(gameFilter = 'all') {
  const grid = document.getElementById('playersGrid');
  const empty = document.getElementById('emptyPlayers');
  if (!grid || !empty) return;

  const current = AppState.currentUser;
  const squadCards = [];

  for (const [username, user] of Object.entries(AppState.users)) {
    const isMe = (username === current);
    const squads = getUserSquads(username);

    if (squads.length > 0) {
      squads.forEach(sq => {
        if (sq.active === false) return;
        if (gameFilter && gameFilter !== 'all' && sq.game !== gameFilter) return;

        squadCards.push({
          username,
          userData: user,
          squad: sq,
          isMe
        });
      });
    } else if (user.lookingForTeam) {
      if (gameFilter && gameFilter !== 'all' && user.game !== gameFilter) return;
      squadCards.push({
        username,
        userData: user,
        squad: {
          id: 'sq_' + (user.id || username),
          game: user.game || 'csgo',
          rank: user.rank || '',
          device: user.device || 'PC',
          desc: user.desc || '',
          createdAt: user.created || Date.now()
        },
        isMe
      });
    }
  }

  // Сортировка: VIP буст -> Срочный сбор -> Моя анкета -> Premium -> Онлайн -> Новые
  squadCards.sort((a, b) => {
    const boostA = isSquadVipBoosted(a.username) ? 1 : 0;
    const boostB = isSquadVipBoosted(b.username) ? 1 : 0;
    if (boostA !== boostB) return boostB - boostA;

    const urgA = (typeof RetentionEngine !== 'undefined' && RetentionEngine.isUrgent(a.squad, a.username)) ? 1 : 0;
    const urgB = (typeof RetentionEngine !== 'undefined' && RetentionEngine.isUrgent(b.squad, b.username)) ? 1 : 0;
    if (urgA !== urgB) return urgB - urgA;

    const meA = a.isMe ? 1 : 0;
    const meB = b.isMe ? 1 : 0;
    if (meA !== meB) return meB - meA;

    const premA = isUserPremium(a.username) ? 1 : 0;
    const premB = isUserPremium(b.username) ? 1 : 0;
    if (premA !== premB) return premB - premA;

    const onlA = isUserOnline(a.username) ? 1 : 0;
    const onlB = isUserOnline(b.username) ? 1 : 0;
    if (onlA !== onlB) return onlB - onlA;

    return (b.squad.createdAt || 0) - (a.squad.createdAt || 0);
  });

  if (squadCards.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = squadCards.map(item => {
    const { username, userData, squad, isMe } = item;
    const game = GAMES.find(g => g.id === squad.game) || GAMES[0];
    const safeName = escapeHtml(username);
    const safeRank = escapeHtml(squad.rank || '');
    const safeDesc = escapeHtml(squad.desc || '');
    const safeDevice = escapeHtml(squad.device || 'PC');
    const deviceIconSVG = getDeviceIconSVG(squad.device || 'PC');
    const isPremium = isUserPremium(username);
    const isBoosted = isSquadVipBoosted(username);
    const isUrgent = typeof RetentionEngine !== 'undefined' ? RetentionEngine.isUrgent(squad, username) : false;
    const karma = typeof RetentionEngine !== 'undefined' ? RetentionEngine.getKarma(username) : (userData.karma || 0);
    const frameId = getUserEquippedFrame(username);
    
    let avatarContent;
    if (userData.avatar) {
      avatarContent = `<img src="${userData.avatar}" alt="${safeName}">`;
    } else {
      const initials = safeName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      avatarContent = `<span>${initials || '?'}</span>`;
    }

    if (frameId && frameId !== 'none') {
      avatarContent = `<div class="avatar-frame-wrap frame-${frameId}">${avatarContent}</div>`;
    }

    const premiumCrownHtml = isPremium ? '<span class="premium-crown-badge" title="Lobbivo Premium"><svg><use href="#icon-crown"/></svg></span>' : '';
    const vipPillHtml = isBoosted ? '<span class="vip-squad-badge"><svg><use href="#icon-badge-vip"/></svg> VIP СБОР</span>' : '';
    const urgentBadgeHtml = isUrgent ? '<span class="urgent-squad-badge"><svg><use href="#icon-bolt-fast"/></svg> СРОЧНО В КАТКУ</span>' : '';
    const mySquadBadgeHtml = isMe ? '<span class="my-squad-badge"><svg><use href="#icon-sparkles"/></svg> Ваша анкета</span>' : '';
    const adminBadge = typeof getUserAdminBadge === 'function' ? getUserAdminBadge(username) : null;
    const adminBadgeHtml = adminBadge ? `<span class="admin-custom-badge badge-style-${adminBadge.style}" style="font-size:0.62rem;padding:2px 6px;"><svg style="width:11px;height:11px;"><use href="#${adminBadge.icon}"/></svg><span>${escapeHtml(adminBadge.text)}</span></span>` : '';
    const userTags = typeof getUserCustomTags === 'function' ? getUserCustomTags(username) : [];

    const karmaHtml = `
      <button type="button" class="karma-pill-btn ${isMe ? 'is-self' : ''}" onclick="event.stopPropagation(); if (typeof RetentionEngine !== 'undefined') RetentionEngine.giveKarma('${safeName}');" title="${isMe ? 'Ваша репутация' : 'Поставить лайк за адекватность (+1 к карме)'}">
        <svg><use href="#icon-thumbs-up"/></svg>
        <span>${karma}</span>
      </button>
    `;

    // 1-Click Connect Chips
    let connectChipsHtml = '';
    if (userData.discord || userData.telegram || userData.steam) {
      connectChipsHtml = `
        <div class="player-connect-chips-row">
          ${userData.discord ? `<button type="button" class="connect-chip-btn discord" onclick="RetentionEngine.copyDiscord('${escapeHtml(userData.discord)}', event)" title="Скопировать Discord"><svg><use href="#icon-discord-simple"/></svg><span>${escapeHtml(userData.discord)}</span></button>` : ''}
          ${userData.telegram ? `<button type="button" class="connect-chip-btn telegram" onclick="RetentionEngine.openTelegram('${escapeHtml(userData.telegram)}', event)" title="Открыть в Telegram"><svg><use href="#icon-telegram-plane"/></svg><span>${escapeHtml(userData.telegram)}</span></button>` : ''}
          ${userData.steam ? `<button type="button" class="connect-chip-btn steam" onclick="event.stopPropagation(); window.open('${escapeHtml(userData.steam)}', '_blank');" title="Открыть Steam"><svg><use href="#icon-steam-simple"/></svg><span>Steam</span></button>` : ''}
        </div>
      `;
    }

    let actionsHtml = '';
    if (isMe) {
      actionsHtml = `
        <button class="btn btn-outline btn-sm edit-my-squad-btn" data-squad-id="${escapeHtml(squad.id || '')}" data-game="${escapeHtml(squad.game || '')}">
          <svg><use href="#icon-sparkles"/></svg>
          Редактировать
        </button>
        <button class="btn btn-outline btn-sm del-my-squad-btn" data-squad-id="${escapeHtml(squad.id || '')}">
          <svg><use href="#icon-ban"/></svg>
          Удалить
        </button>
      `;
    } else {
      actionsHtml = `
        <button class="btn btn-outline btn-sm chat-btn" data-username="${safeName}">
          <svg><use href="#icon-chat"/></svg>
          Чат
        </button>
        <button class="btn btn-outline btn-sm report-btn" data-username="${safeName}">
          <svg><use href="#icon-flag"/></svg>
          Жалоба
        </button>
      `;
    }

    const partySizeStr = squad.partySize || '+1';
    const partySizeLabel = getPartySizeLabel(partySizeStr);
    const partySizeBadgeHtml = `<span class="party-size-pill" title="Ищет тиммейтов"><svg><use href="#icon-users"/></svg><span>${escapeHtml(partySizeLabel)}</span></span>`;

    return `
      <div class="player-card ${isMe ? 'my-squad-card' : ''} ${isUrgent ? 'urgent-fast-match-card' : ''} ${isBoosted ? 'vip-boosted-card' : ''} ${isPremium ? 'premium-user-card' : ''}" data-username="${safeName}" data-game="${escapeHtml(squad.game || 'csgo')}" data-squad-id="${escapeHtml(squad.id || '')}">
        <div class="player-top">
          <div class="player-avatar">${avatarContent}</div>
          <div class="player-info">
            <div class="player-header-row">
              <span class="player-name-text ${getUserNameClass(username)}">${safeName}</span>
              ${premiumCrownHtml}
              ${adminBadgeHtml}
              ${mySquadBadgeHtml}
              ${vipPillHtml}
              ${urgentBadgeHtml}
            </div>
            <div class="player-game-row">
              <div class="player-game">
                <svg><use href="#${escapeHtml(game.icon)}"/></svg>
                <span>${escapeHtml(game.name)}</span>
              </div>
              ${karmaHtml}
            </div>
          </div>
        </div>
        <div class="player-rank-row">
          ${partySizeBadgeHtml}
          ${safeRank ? `<div class="player-rank">${safeRank}</div>` : ''}
        </div>
        ${userTags.length > 0 ? `
          <div class="player-custom-tags-row">
            ${userTags.slice(0, 3).map(t => `<span class="player-custom-tag-chip">${escapeHtml(t)}</span>`).join('')}
            ${userTags.length > 3 ? `<span class="player-custom-tag-more">+${userTags.length - 3}</span>` : ''}
          </div>
        ` : ''}
        ${safeDesc ? `<div class="player-desc">${safeDesc}</div>` : '<div class="player-desc empty-desc">Описание не заполнено</div>'}
        
        ${connectChipsHtml}

        <div class="player-device">
          <svg class="device-icon device-icon-sm"><use href="#${escapeHtml(deviceIconSVG)}"/></svg>
          <span>${safeDevice}</span>
        </div>
        <span class="looking-for-team"><svg style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:3px;"><use href="#icon-search"/></svg>${isMe ? 'Вы ищете команду' : 'Ищет команду'}</span>
        <div class="player-status-line">
          <span class="online-dot ${isUserOnline(username) ? 'online' : 'offline'}"></span> 
          <span class="status-text">${isMe ? 'В сети (Вы)' : formatLastSeen(userData.lastSeen, username)}</span>
        </div>
        <div class="card-actions">
          ${actionsHtml}
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

  grid.querySelectorAll('.edit-my-squad-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const squadId = this.dataset.squadId;
      openEditSquadModal(squadId);
    });
  });

  grid.querySelectorAll('.del-my-squad-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const squadId = this.dataset.squadId;
      deleteSquad(squadId);
    });
  });

  grid.querySelectorAll('.player-card').forEach(card => {
    card.addEventListener('click', function() {
      const username = this.dataset.username;
      if (username === AppState.currentUser) {
        switchPage('pageProfile');
      } else {
        showUserProfileModal(username);
      }
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
  const canModerateTarget = typeof canAdminPunishTarget === 'function' ? canAdminPunishTarget(AppState.currentUser, username) : isViewerAdmin;
  const isTargetBanned = typeof isUserBanned === 'function' && isUserBanned(username);
  const isTargetMuted = typeof isUserMuted === 'function' && isUserMuted(username);

  let adminActionsHtml = '';
  if (isViewerAdmin && AppState.currentUser !== username) {
    if (canModerateTarget) {
      adminActionsHtml = `
        <div class="modal-admin-section">
          <div class="admin-section-title">
            <svg style="width:14px;height:14px;"><use href="#icon-admin-shield"/></svg>
            <span>Управление администратора</span>
          </div>
          <div class="admin-actions-grid">
            ${isTargetBanned 
              ? `<button type="button" class="btn btn-sm btn-outline" id="modalAdminUnbanBtn"><svg class="mini-svg" style="width:12px;height:12px;margin-right:4px;"><use href="#icon-check"/></svg>Снять бан</button>`
              : `<button type="button" class="btn btn-sm btn-danger" id="modalAdminBanBtn"><svg class="mini-svg" style="width:12px;height:12px;margin-right:4px;"><use href="#icon-ban"/></svg>Забанить игрока</button>`
            }
            ${isTargetMuted 
              ? `<button type="button" class="btn btn-sm btn-outline" id="modalAdminUnmuteBtn"><svg class="mini-svg" style="width:12px;height:12px;margin-right:4px;"><use href="#icon-volume"/></svg>Снять мут</button>`
              : `<button type="button" class="btn btn-sm btn-warning" id="modalAdminMuteBtn"><svg class="mini-svg" style="width:12px;height:12px;margin-right:4px;"><use href="#icon-mute"/></svg>Замьютить в чате</button>`
            }
          </div>
        </div>
      `;
    } else {
      adminActionsHtml = `
        <div class="modal-admin-section" style="background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.25);border-radius:10px;padding:8px 12px;">
          <div class="admin-section-title" style="color:var(--neon-cyan);margin:0;font-size:0.78rem;">
            <svg style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"><use href="#icon-shield"/></svg>
            <span>Персонал платформы (Защита от модерации)</span>
          </div>
        </div>
      `;
    }
  }

  const isMe = AppState.currentUser === username;
  const karma = typeof RetentionEngine !== 'undefined' ? RetentionEngine.getKarma(username) : (data.karma || 0);

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
            <span class="${getUserNameClass(username)}">${safeName}</span>
            ${isUserPremium(username) ? '<span class="premium-crown-badge"><svg><use href="#icon-crown"/></svg></span>' : ''}
            ${(typeof getUserAdminBadge === 'function' && getUserAdminBadge(username)) ? `<span class="admin-custom-badge badge-style-${getUserAdminBadge(username).style}" style="margin-left:6px;"><svg><use href="#${getUserAdminBadge(username).icon}"/></svg><span>${escapeHtml(getUserAdminBadge(username).text)}</span></span>` : ''}
            ${isTargetBanned ? '<span class="admin-badge badge-ban" style="margin-left:6px;">БАН</span>' : ''}
            ${isTargetMuted ? '<span class="admin-badge badge-mute" style="margin-left:6px;">МУТ</span>' : ''}
          </div>
          <div class="modal-user-game">
            <svg><use href="#${escapeHtml(game.icon)}"/></svg>
            ${escapeHtml(game.name)}
          </div>
          <div class="modal-user-meta">
            <svg class="device-icon device-icon-sm"><use href="#${escapeHtml(deviceIconSVG)}"/></svg>
            <span>${safeDevice}</span> · <span>ID: ${data.id || '---'}</span>${((typeof isUserCEO === 'function' ? isUserCEO(username) : (typeof isUserGA === 'function' && isUserGA(username)))) ? ' · <span class="profile-ceo-badge" title="CEO & Founder"><svg class="mini-svg" style="width:11px;height:11px;margin-right:3px;"><use href="#icon-crown"/></svg>CEO</span>' : ''} · <span class="modal-user-karma-badge" title="Репутация игрока" style="display:inline-flex;align-items:center;gap:3px;color:#34d399;font-weight:700;"><svg class="mini-svg" style="width:12px;height:12px;stroke:#34d399;fill:none;vertical-align:-1px;"><use href="#icon-thumbs-up"/></svg><span id="modalKarmaNumVal">${karma}</span></span>
          </div>
          <div class="modal-user-status" style="margin-top: 5px; font-size: 0.8rem; font-weight: 600; color: ${isUserOnline(username) ? '#00ff9d' : 'var(--text-muted)'};">
            <span class="online-dot ${isUserOnline(username) ? 'online' : 'offline'}" style="display:inline-block; vertical-align:middle; margin-right:4px;"></span>
            ${formatLastSeen(data.lastSeen, username)}
          </div>
        </div>
      </div>
      <div class="profile-field">
        <label>Ранг / Уровень</label>
        <div class="value">${safeRank}</div>
      </div>
      ${(typeof getUserCustomTags === 'function' && getUserCustomTags(username).length > 0) ? `
        <div class="profile-field">
          <label>Теги и стиль игры</label>
          <div class="modal-user-tags-row">
            ${getUserCustomTags(username).map(t => `<span class="profile-hero-tag-pill">${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      <div class="profile-field">
        <label>О себе</label>
        <div class="value">${safeDesc}</div>
      </div>
      ${(data.discord || data.telegram || data.steam) ? `
        <div class="profile-field">
          <label>Быстрая связь (1-Click Connect)</label>
          <div class="player-connect-chips-row" style="margin-top:4px;">
            ${data.discord ? `<button type="button" class="connect-chip-btn discord" onclick="RetentionEngine.copyDiscord('${escapeHtml(data.discord)}', event)" title="Скопировать Discord"><svg><use href="#icon-discord-simple"/></svg><span>Discord: ${escapeHtml(data.discord)}</span></button>` : ''}
            ${data.telegram ? `<button type="button" class="connect-chip-btn telegram" onclick="RetentionEngine.openTelegram('${escapeHtml(data.telegram)}', event)" title="Открыть в Telegram"><svg><use href="#icon-telegram-plane"/></svg><span>Telegram: ${escapeHtml(data.telegram)}</span></button>` : ''}
            ${data.steam ? `<button type="button" class="connect-chip-btn steam" onclick="event.stopPropagation(); window.open('${escapeHtml(data.steam)}', '_blank');" title="Открыть Steam"><svg><use href="#icon-steam-simple"/></svg><span>Steam Профиль</span></button>` : ''}
          </div>
        </div>
      ` : ''}
      ${adminActionsHtml}
      <div class="modal-user-actions">
        ${!isMe ? `
          <button class="btn btn-outline modal-karma-action-btn" id="modalKarmaActionBtn" title="Поставить лайк за адекватность (+1 к карме)">
            <svg><use href="#icon-thumbs-up"/></svg>
            <span>Похвалить (+1)</span>
          </button>
        ` : ''}
        <button class="btn" id="modalChatBtn">
          <svg><use href="#icon-chat"/></svg>
          <span>Написать</span>
        </button>
        <button class="btn btn-outline modal-report-btn" id="modalReportBtn">
          <svg><use href="#icon-flag"/></svg>
          <span>Жалоба</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#closeUserModalBtn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const handleModalKarma = () => {
    if (typeof RetentionEngine !== 'undefined') {
      RetentionEngine.giveKarma(username);
      const updatedKarma = RetentionEngine.getKarma(username);
      const numEl = overlay.querySelector('#modalKarmaNumVal');
      if (numEl) numEl.textContent = updatedKarma;
      const karmaActionBtn = overlay.querySelector('#modalKarmaActionBtn');
      if (karmaActionBtn) {
        karmaActionBtn.classList.add('voted');
        karmaActionBtn.innerHTML = `<svg class="mini-svg" style="width:13px;height:13px;"><use href="#icon-check"/></svg><span>Похвалено!</span>`;
      }
    }
  };

  if (!isMe) {
    overlay.querySelector('#modalKarmaActionBtn')?.addEventListener('click', handleModalKarma);
  }

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