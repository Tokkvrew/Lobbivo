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

// ============================================================
//  УПРАВЛЕНИЕ АНКЕТАМИ ПОЛЬЗОВАТЕЛЕЙ (SQUAD & APPLICATION ENGINE)
// ============================================================

function getUserSquads(username) {
  if (!username) return [];
  const u = AppState.users[username];
  if (!u) return [];

  if (Array.isArray(u.squads)) {
    return u.squads.filter(s => s && s.active !== false);
  }

  return [];
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

  const modal = document.getElementById('createSquadModal');
  const modalTitle = document.getElementById('createSquadModalTitle');
  const modalSub = document.getElementById('createSquadModalSub');
  const submitBtnText = document.getElementById('submitSquadBtnText');
  const editIdInput = document.getElementById('squadEditId');
  const squadRank = document.getElementById('squadRank');
  const squadDesc = document.getElementById('squadDescription');
  const gameField = document.getElementById('squadGameField');

  if (editIdInput) editIdInput.value = sq.id;
  if (modalTitle) modalTitle.innerHTML = '<svg><use href="#icon-users"/></svg> <span>Редактировать анкету</span>';
  if (modalSub) modalSub.textContent = 'Обновите параметры и описание вашей анкеты';
  if (submitBtnText) submitBtnText.textContent = 'Сохранить изменения';

  if (gameField) gameField.style.display = 'block';
  if (typeof setGamePickerValue === 'function') setGamePickerValue('squadGamePicker', sq.game || 'csgo');
  if (typeof setDevicePickerValue === 'function') setDevicePickerValue('squadDevicePicker', sq.device || 'PC');
  if (squadRank) squadRank.value = sq.rank || '';
  if (squadDesc) squadDesc.value = sq.desc || '';

  if (modal) modal.classList.add('show');
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
  renderMySquads();
  renderPlayers(AppState.selectedGameFilter || 'all');
  updateGameCounts();
  showNotification('Анкета удалена', 'Ваша анкета успешно удалена из каталога игроков');
}

function renderPlayers(gameFilter = 'all') {
  const grid = document.getElementById('playersGrid');
  const empty = document.getElementById('emptyPlayers');
  if (!grid || !empty) return;

  const current = AppState.currentUser;
  const squadCards = [];

  for (const [username, user] of Object.entries(AppState.users)) {
    if (username === current) continue;
    const squads = getUserSquads(username);

    if (squads.length > 0) {
      squads.forEach(sq => {
        if (sq.active === false) return;
        if (gameFilter && gameFilter !== 'all' && sq.game !== gameFilter) return;

        squadCards.push({
          username,
          userData: user,
          squad: sq
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
        }
      });
    }
  }

  // Сортировка: VIP буст -> Premium -> Онлайн
  squadCards.sort((a, b) => {
    const boostA = isSquadVipBoosted(a.username) ? 1 : 0;
    const boostB = isSquadVipBoosted(b.username) ? 1 : 0;
    if (boostA !== boostB) return boostB - boostA;

    const premA = isUserPremium(a.username) ? 1 : 0;
    const premB = isUserPremium(b.username) ? 1 : 0;
    if (premA !== premB) return premB - premA;

    const onlA = isUserOnline(a.username) ? 1 : 0;
    const onlB = isUserOnline(b.username) ? 1 : 0;
    return onlB - onlA;
  });

  if (squadCards.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = squadCards.map(item => {
    const { username, userData, squad } = item;
    const game = GAMES.find(g => g.id === squad.game) || GAMES[0];
    const safeName = escapeHtml(username);
    const safeRank = escapeHtml(squad.rank || '');
    const safeDesc = escapeHtml(squad.desc || '');
    const safeDevice = escapeHtml(squad.device || 'PC');
    const deviceIconSVG = getDeviceIconSVG(squad.device || 'PC');
    const isPremium = isUserPremium(username);
    const isBoosted = isSquadVipBoosted(username);
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
    const adminBadge = typeof getUserAdminBadge === 'function' ? getUserAdminBadge(username) : null;
    const adminBadgeHtml = adminBadge ? `<span class="admin-custom-badge badge-style-${adminBadge.style}" style="font-size:0.62rem;padding:2px 6px;"><svg style="width:11px;height:11px;"><use href="#${adminBadge.icon}"/></svg><span>${escapeHtml(adminBadge.text)}</span></span>` : '';
    const userTags = typeof getUserCustomTags === 'function' ? getUserCustomTags(username) : [];

    return `
      <div class="player-card ${isBoosted ? 'vip-boosted-card' : ''} ${isPremium ? 'premium-user-card' : ''}" data-username="${safeName}" data-game="${escapeHtml(squad.game || 'csgo')}" data-squad-id="${escapeHtml(squad.id || '')}">
        <div class="player-top">
          <div class="player-avatar">${avatarContent}</div>
          <div class="player-info">
            <div class="player-name">
              <span class="${getUserNameClass(username)}">${safeName}</span>
              ${premiumCrownHtml}
              ${adminBadgeHtml}
              ${vipPillHtml}
            </div>
            <div class="player-game">
              <svg><use href="#${escapeHtml(game.icon)}"/></svg>
              <span>${escapeHtml(game.name)}</span>
            </div>
          </div>
        </div>
        ${safeRank ? `<div class="player-rank">${safeRank}</div>` : ''}
        ${userTags.length > 0 ? `
          <div class="player-custom-tags-row">
            ${userTags.slice(0, 3).map(t => `<span class="player-custom-tag-chip">${escapeHtml(t)}</span>`).join('')}
            ${userTags.length > 3 ? `<span class="player-custom-tag-more">+${userTags.length - 3}</span>` : ''}
          </div>
        ` : ''}
        ${safeDesc ? `<div class="player-desc">${safeDesc}</div>` : '<div class="player-desc empty-desc">Описание не заполнено</div>'}
        <div class="player-device">
          <svg class="device-icon device-icon-sm"><use href="#${escapeHtml(deviceIconSVG)}"/></svg>
          <span>${safeDevice}</span>
        </div>
        <span class="looking-for-team"><svg style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:3px;"><use href="#icon-search"/></svg>Ищет команду</span>
        <div class="player-status-line">
          <span class="online-dot ${isUserOnline(username) ? 'online' : 'offline'}"></span> 
          <span class="status-text">${formatLastSeen(userData.lastSeen, username)}</span>
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
            ${safeDevice} · ID: ${data.id || '---'}${isUserGA(username) ? ' <span class="profile-ceo-badge"><svg class="mini-svg" style="width:11px;height:11px;margin-right:3px;"><use href="#icon-crown"/></svg>CEO</span>' : ''}
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