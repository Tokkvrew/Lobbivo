// ============================================================
//  LOBBIVO АДМИН-ПАНЕЛЬ И СИСТЕМА МОДЕРАЦИИ (ADMIN CONTROLLER)
// ============================================================

let currentAdminTab = 'complaints';
let activeBanTarget = null;
let activeMuteTarget = null;
let welcomeBanTimer = null;

// ============================================================
//  1. ИНИЦИАЛИЗАЦИЯ И БЕЙДЖИ АДМИНИСТРАТОРА
// ============================================================

function updateAdminBadges() {
  const adminBtn = document.getElementById('capsuleAdminBtn');
  const complaintsBadge = document.getElementById('adminComplaintsBadge');
  const isAdmin = typeof isUserAdmin === 'function' && isUserAdmin(AppState.currentUser);

  if (adminBtn) {
    adminBtn.style.display = isAdmin ? 'inline-flex' : 'none';
  }

  if (complaintsBadge) {
    const pendingCount = (AppState.complaints || []).filter(c => c.status !== 'dismissed' && c.status !== 'resolved').length;
    if (pendingCount > 0 && isAdmin) {
      complaintsBadge.textContent = pendingCount > 99 ? '99+' : pendingCount;
      complaintsBadge.style.display = 'inline-flex';
    } else {
      complaintsBadge.style.display = 'none';
    }
  }
}

// ============================================================
//  2. УПРАВЛЕНИЕ ОКНОМ АДМИН-ПАНЕЛИ
// ============================================================

function openAdminPanel(tab = 'complaints') {
  if (!AppState.currentUser || !isUserAdmin(AppState.currentUser)) {
    showNotification('Доступ ограничен', 'Панель доступна только администраторам Lobbivo');
    return;
  }

  const modal = document.getElementById('adminPanelModal');
  if (!modal) return;

  modal.classList.add('show');
  switchAdminTab(tab);
}

function closeAdminPanel() {
  const modal = document.getElementById('adminPanelModal');
  if (modal) modal.classList.remove('show');
}

function switchAdminTab(tab = 'complaints') {
  currentAdminTab = tab;
  
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  const complaintsView = document.getElementById('adminComplaintsView');
  const usersView = document.getElementById('adminUsersView');
  const punishmentsView = document.getElementById('adminPunishmentsView');
  const badgeView = document.getElementById('adminBadgeView');

  if (complaintsView) complaintsView.style.display = tab === 'complaints' ? 'block' : 'none';
  if (usersView) usersView.style.display = tab === 'users' ? 'block' : 'none';
  if (punishmentsView) punishmentsView.style.display = tab === 'punishments' ? 'block' : 'none';
  if (badgeView) badgeView.style.display = tab === 'badge' ? 'block' : 'none';

  updateAdminStats();

  if (tab === 'complaints') renderAdminComplaints();
  if (tab === 'users') renderAdminUsers();
  if (tab === 'punishments') renderAdminPunishments();
  if (tab === 'badge') renderAdminBadgeSettings();
}

function updateAdminStats() {
  const totalUsers = Object.keys(AppState.users || {}).length;
  const pendingComplaints = (AppState.complaints || []).length;
  let bannedCount = 0;
  let mutedCount = 0;

  for (const name of Object.keys(AppState.users || {})) {
    if (isUserBanned(name)) bannedCount++;
    if (isUserMuted(name)) mutedCount++;
  }

  const elUsers = document.getElementById('statTotalUsers');
  const elComplaints = document.getElementById('statTotalComplaints');
  const elBanned = document.getElementById('statTotalBanned');
  const elMuted = document.getElementById('statTotalMuted');

  if (elUsers) elUsers.textContent = totalUsers;
  if (elComplaints) elComplaints.textContent = pendingComplaints;
  if (elBanned) elBanned.textContent = bannedCount;
  if (elMuted) elMuted.textContent = mutedCount;
}

// ============================================================
//  3. РЕНДЕРИНГ ВКЛАДКИ ЖАЛОБ (COMPLAINTS)
// ============================================================

function renderAdminComplaints() {
  const container = document.getElementById('adminComplaintsList');
  if (!container) return;

  loadComplaints();
  const list = AppState.complaints || [];

  if (list.length === 0) {
    container.innerHTML = `
      <div class="admin-empty-state">
        <svg style="width:42px;height:42px;opacity:0.35;margin-bottom:8px;"><use href="#icon-flag"/></svg>
        <h3>Жалоб пока нет</h3>
        <p>На данный момент все игроки соблюдают правила сообщества.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(c => {
    const targetUser = AppState.users[c.target];
    const fromUser = AppState.users[c.from];
    const isTargetBanned = isUserBanned(c.target);
    const isTargetMuted = isUserMuted(c.target);
    const safeTarget = escapeHtml(c.target);
    const safeFrom = escapeHtml(c.from);
    const safeReason = escapeHtml(c.reason);
    const dateStr = c.date || (c.time ? new Date(c.time).toLocaleString('ru-RU') : 'Недавно');

    return `
      <div class="admin-complaint-card" id="complaint_card_${c.id}">
        <div class="complaint-card-header">
          <div class="complaint-users-flow">
            <span class="complaint-user from" title="Отправитель жалобы">
              <svg class="admin-icon-sm" style="width:14px;height:14px;display:inline-block;vertical-align:-2px;"><use href="#icon-user-round"/></svg> <strong>${safeFrom}</strong>
            </span>
            <span class="complaint-arrow"><svg class="admin-icon-sm" style="width:12px;height:12px;display:inline-block;vertical-align:-1px;"><use href="#icon-arrow-right"/></svg></span>
            <span class="complaint-user target" title="Нарушитель">
              <svg class="admin-icon-sm" style="width:14px;height:14px;display:inline-block;vertical-align:-2px;color:var(--neon-pink);"><use href="#icon-badge-vip"/></svg> <strong>${safeTarget}</strong>
              ${isTargetBanned ? '<span class="admin-badge badge-ban">БАН</span>' : ''}
              ${isTargetMuted ? '<span class="admin-badge badge-mute">МУТ</span>' : ''}
            </span>
          </div>
          <span class="complaint-date">${dateStr}</span>
        </div>

        <div class="complaint-reason-box">
          <div class="complaint-reason-label">Причина жалобы:</div>
          <div class="complaint-reason-text">«${safeReason}»</div>
        </div>

        <div class="complaint-actions-row">
          <button type="button" class="btn btn-sm btn-outline" onclick="showUserProfileModal('${safeTarget}')">
            <svg style="width:13px;height:13px;"><use href="#icon-profile"/></svg>
            Профиль нарушителя
          </button>
          
          <button type="button" class="btn btn-sm btn-danger" onclick="openBanModal('${safeTarget}')">
            <svg style="width:13px;height:13px;"><use href="#icon-flag"/></svg>
            Забанить
          </button>

          <button type="button" class="btn btn-sm btn-warning" onclick="openMuteModal('${safeTarget}')">
            <svg style="width:13px;height:13px;"><use href="#icon-lock"/></svg>
            Замьютить
          </button>

          <button type="button" class="btn btn-sm btn-ghost" onclick="adminDismissComplaint('${c.id}')" title="Удалить жалобу">
            <svg style="width:13px;height:13px;"><use href="#icon-close"/></svg>
            Отклонить
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function adminDismissComplaint(complaintId) {
  if (confirm('Удалить эту жалобу?')) {
    resolveComplaint(complaintId);
    showNotification('Жалоба закрыта', 'Жалоба успешно удалена из системы');
    renderAdminComplaints();
    updateAdminStats();
    updateAdminBadges();
  }
}

// ============================================================
//  4. РЕНДЕРИНГ ВКЛАДКИ ПОЛЬЗОВАТЕЛЕЙ (USERS)
// ============================================================

function renderAdminUsers(searchQuery = '', statusFilter = 'all') {
  const container = document.getElementById('adminUsersTableBody');
  if (!container) return;

  loadUsers();
  const allNames = Object.keys(AppState.users || {});
  const query = (searchQuery || '').trim().toLowerCase();

  let filtered = allNames.filter(name => {
    const u = AppState.users[name];
    if (!u) return false;
    
    // Фильтр по поисковой строке
    if (query) {
      const matchName = name.toLowerCase().includes(query);
      const matchId = String(u.id || '').includes(query);
      const matchGame = (u.game || '').toLowerCase().includes(query);
      if (!matchName && !matchId && !matchGame) return false;
    }

    // Фильтр по статусу
    if (statusFilter === 'banned' && !isUserBanned(name)) return false;
    if (statusFilter === 'muted' && !isUserMuted(name)) return false;
    if (statusFilter === 'admin' && !isUserAdmin(name)) return false;
    if (statusFilter === 'online' && !isUserOnline(name)) return false;

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">
          Пользователи не найдены
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = filtered.map(name => {
    const u = AppState.users[name];
    const safeName = escapeHtml(name);
    const isAdmin = isUserAdmin(name);
    const isBanned = isUserBanned(name);
    const isMuted = isUserMuted(name);
    const isOnline = isUserOnline(name);

    let badgesHtml = '';
    if (isAdmin) badgesHtml += '<span class="admin-badge badge-admin"><svg style="width:12px;height:12px;vertical-align:-2px;display:inline-block;"><use href="#icon-crown"/></svg> АДМИН</span> ';
    if (isBanned) badgesHtml += '<span class="admin-badge badge-ban"><svg style="width:12px;height:12px;vertical-align:-2px;display:inline-block;"><use href="#icon-ban"/></svg> БАН</span> ';
    if (isMuted) badgesHtml += '<span class="admin-badge badge-mute"><svg style="width:12px;height:12px;vertical-align:-2px;display:inline-block;"><use href="#icon-mute"/></svg> МУТ</span> ';
    if (isOnline) badgesHtml += '<span class="admin-badge badge-online"><span class="status-dot online" style="width:8px;height:8px;display:inline-block;border-radius:50%;background:var(--neon-green);box-shadow:0 0 8px var(--neon-green);"></span> ONLINE</span> ';

    return `
      <tr>
        <td>
          <div class="admin-user-cell">
            <div class="admin-user-thumb">${u.avatar ? `<img src="${u.avatar}">` : safeName.slice(0, 2).toUpperCase()}</div>
            <div class="admin-user-name-wrap">
              <strong>${safeName}</strong>
              <span class="admin-user-id">ID: ${u.id || '---'}</span>
            </div>
          </div>
        </td>
        <td>${escapeHtml(u.game || 'csgo')}</td>
        <td>${escapeHtml(u.device || 'PC')}</td>
        <td>${badgesHtml || '<span style="color:var(--text-muted);font-size:0.75rem;">Обычный</span>'}</td>
        <td>
          <div class="admin-row-actions">
            <button class="admin-mini-btn" onclick="showUserProfileModal('${safeName}')" title="Профиль"><svg style="width:14px;height:14px;"><use href="#icon-eye"/></svg></button>
            ${isBanned 
              ? `<button class="admin-mini-btn btn-unban" onclick="adminUnbanUser('${safeName}')" title="Снять бан"><svg style="width:14px;height:14px;"><use href="#icon-check"/></svg></button>`
              : `<button class="admin-mini-btn btn-ban" onclick="openBanModal('${safeName}')" title="Забанить"><svg style="width:14px;height:14px;"><use href="#icon-ban"/></svg></button>`
            }
            ${isMuted 
              ? `<button class="admin-mini-btn btn-unmute" onclick="adminUnmuteUser('${safeName}')" title="Снять мут"><svg style="width:14px;height:14px;"><use href="#icon-check"/></svg></button>`
              : `<button class="admin-mini-btn btn-mute" onclick="openMuteModal('${safeName}')" title="Замьютить"><svg style="width:14px;height:14px;"><use href="#icon-mute"/></svg></button>`
            }
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================================
//  5. РЕНДЕРИНГ ВКЛАДКИ АКТИВНЫХ НАКАЗАНИЙ (PUNISHMENTS)
// ============================================================

function renderAdminPunishments() {
  const container = document.getElementById('adminPunishmentsList');
  if (!container) return;

  loadUsers();
  const allNames = Object.keys(AppState.users || {});
  const activePunishments = [];

  for (const name of allNames) {
    const ban = getBanInfo(name);
    const mute = getMuteInfo(name);
    if (ban) activePunishments.push({ type: 'ban', user: name, info: ban });
    if (mute) activePunishments.push({ type: 'mute', user: name, info: mute });
  }

  if (activePunishments.length === 0) {
    container.innerHTML = `
      <div class="admin-empty-state">
        <svg style="width:42px;height:42px;opacity:0.35;margin-bottom:8px;"><use href="#icon-sparkles"/></svg>
        <h3>Активных ограничений нет</h3>
        <p>В данный момент ни один пользователь не находится в бане или муте.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = activePunishments.map(p => {
    const isBan = p.type === 'ban';
    const safeUser = escapeHtml(p.user);
    const info = p.info;

    return `
      <div class="admin-punishment-card ${isBan ? 'punish-ban' : 'punish-mute'}">
        <div class="punish-header">
          <div class="punish-user-title">
            <span class="punish-type-icon">${isBan ? '🚫' : '🔇'}</span>
            <strong>${safeUser}</strong>
            <span class="admin-badge ${isBan ? 'badge-ban' : 'badge-mute'}">
              ${isBan ? 'БАН АККАУНТА' : 'МУТ ЧАТА'}
            </span>
          </div>
          <span class="punish-remaining-pill">⏳ ${info.remainingFormatted}</span>
        </div>

        <div class="punish-body">
          <div><strong>Причина:</strong> ${escapeHtml(info.banReason || info.muteReason || 'Не указана')}</div>
          <div><strong>Срок:</strong> ${info.dateFormatted}</div>
          <div><strong>Кем выдано:</strong> ${escapeHtml(info.bannedBy || info.mutedBy || 'Администратор')}</div>
        </div>

        <div class="punish-footer">
          ${isBan 
            ? `<button class="btn btn-sm btn-outline" onclick="adminUnbanUser('${safeUser}')"><svg style="width:12px;height:12px;display:inline-block;vertical-align:-1px;"><use href="#icon-check"/></svg> Разбанить досрочно</button>`
            : `<button class="btn btn-sm btn-outline" onclick="adminUnmuteUser('${safeUser}')"><svg style="width:12px;height:12px;display:inline-block;vertical-align:-1px;"><use href="#icon-check"/></svg> Снять мут досрочно</button>`
          }
          <button class="btn btn-sm btn-ghost" onclick="showUserProfileModal('${safeUser}')"><svg style="width:12px;height:12px;display:inline-block;vertical-align:-1px;"><use href="#icon-eye"/></svg> Профиль</button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
//  6. МОДАЛКА БАНА (BAN MODAL)
// ============================================================

function openBanModal(targetUsername) {
  if (!targetUsername) return;
  activeBanTarget = targetUsername;

  const modal = document.getElementById('adminBanModal');
  const targetLabel = document.getElementById('banModalTargetUser');
  const reasonInput = document.getElementById('banReasonInput');
  const customHoursInput = document.getElementById('banCustomHours');

  if (targetLabel) targetLabel.textContent = targetUsername;
  if (reasonInput) reasonInput.value = 'Нарушение правил сообщества';
  if (customHoursInput) customHoursInput.value = '';

  // Сброс пресетов времени
  document.querySelectorAll('.ban-preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.duration === '1440'); // по умолчанию 24 часа
  });

  if (modal) modal.classList.add('show');
}

function closeBanModal() {
  const modal = document.getElementById('adminBanModal');
  if (modal) modal.classList.remove('show');
  activeBanTarget = null;
}

function submitBan() {
  if (!activeBanTarget) return;

  let durationMinutes = 1440; // 24 часа по умолчанию
  const activePreset = document.querySelector('.ban-preset-btn.active');
  const customHours = parseInt(document.getElementById('banCustomHours')?.value, 10);

  if (customHours && customHours > 0) {
    durationMinutes = customHours * 60;
  } else if (activePreset) {
    durationMinutes = parseInt(activePreset.dataset.duration, 10);
  }

  const rawReason = (document.getElementById('banReasonInput')?.value || '').trim();
  const reason = rawReason || 'Нарушение правил сообщества';

  const success = banUser(activeBanTarget, durationMinutes, reason, AppState.currentUser);

  if (success) {
    showNotification('Пользователь забанен', `Игрок ${activeBanTarget} успешно заблокирован`);
    closeBanModal();
    updateAdminStats();
    updateAdminBadges();
    if (currentAdminTab === 'complaints') renderAdminComplaints();
    if (currentAdminTab === 'users') renderAdminUsers();
    if (currentAdminTab === 'punishments') renderAdminPunishments();

    // Закрываем модалку профиля если была открыта
    document.getElementById('userProfileModalOverlay')?.remove();
  } else {
    showNotification('Ошибка', 'Не удалось забанить пользователя');
  }
}

function adminUnbanUser(username) {
  if (confirm(`Разбанить пользователя ${username}?`)) {
    unbanUser(username);
    showNotification('Бан снят', `Пользователь ${username} успешно разблокирован`);
    updateAdminStats();
    if (currentAdminTab === 'users') renderAdminUsers();
    if (currentAdminTab === 'punishments') renderAdminPunishments();
    if (currentAdminTab === 'complaints') renderAdminComplaints();
    document.getElementById('userProfileModalOverlay')?.remove();
  }
}

// ============================================================
//  7. МОДАЛКА МУТА (MUTE MODAL)
// ============================================================

function openMuteModal(targetUsername) {
  if (!targetUsername) return;
  activeMuteTarget = targetUsername;

  const modal = document.getElementById('adminMuteModal');
  const targetLabel = document.getElementById('muteModalTargetUser');
  const reasonInput = document.getElementById('muteReasonInput');
  const customMinsInput = document.getElementById('muteCustomMinutes');

  if (targetLabel) targetLabel.textContent = targetUsername;
  if (reasonInput) reasonInput.value = 'Спам и флуд в чате';
  if (customMinsInput) customMinsInput.value = '';

  // Сброс пресетов времени
  document.querySelectorAll('.mute-preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.duration === '15'); // по умолчанию 15 минут
  });

  if (modal) modal.classList.add('show');
}

function closeMuteModal() {
  const modal = document.getElementById('adminMuteModal');
  if (modal) modal.classList.remove('show');
  activeMuteTarget = null;
}

function submitMute() {
  if (!activeMuteTarget) return;

  let durationMinutes = 15; // 15 минут по умолчанию
  const activePreset = document.querySelector('.mute-preset-btn.active');
  const customMins = parseInt(document.getElementById('muteCustomMinutes')?.value, 10);

  if (customMins && customMins > 0) {
    durationMinutes = customMins;
  } else if (activePreset) {
    durationMinutes = parseInt(activePreset.dataset.duration, 10);
  }

  const rawReason = (document.getElementById('muteReasonInput')?.value || '').trim();
  const reason = rawReason || 'Нарушение правил чата';

  const success = muteUser(activeMuteTarget, durationMinutes, reason, AppState.currentUser);

  if (success) {
    showNotification('Чат заблокирован', `Игрок ${activeMuteTarget} замьючен на ${durationMinutes === -1 ? 'вечно' : durationMinutes + ' мин.'}`);
    closeMuteModal();
    updateAdminStats();
    if (currentAdminTab === 'complaints') renderAdminComplaints();
    if (currentAdminTab === 'users') renderAdminUsers();
    if (currentAdminTab === 'punishments') renderAdminPunishments();

    if (typeof updateChatMuteUI === 'function') updateChatMuteUI();
    document.getElementById('userProfileModalOverlay')?.remove();
  } else {
    showNotification('Ошибка', 'Не удалось замьютить пользователя');
  }
}

function adminUnmuteUser(username) {
  if (confirm(`Снять мут с пользователя ${username}?`)) {
    unmuteUser(username);
    showNotification('Мут снят', `Пользователю ${username} возвращен доступ к чату`);
    updateAdminStats();
    if (currentAdminTab === 'users') renderAdminUsers();
    if (currentAdminTab === 'punishments') renderAdminPunishments();
    if (currentAdminTab === 'complaints') renderAdminComplaints();
    if (typeof updateChatMuteUI === 'function') updateChatMuteUI();
    document.getElementById('userProfileModalOverlay')?.remove();
  }
}

// ============================================================
//  8. КИК ЗАБАНЕННОГО ПОЛЬЗОВАТЕЛЯ И БАННЕР НА WELCOME СТРАНИЦЕ
// ============================================================

function handleBannedUserKickout(username) {
  const banInfo = getBanInfo(username);
  if (!banInfo) return;

  console.warn('⛔ Обнаружена активная блокировка аккаунта. Выполняется перенаправление на Welcome.');

  // Завершение сессии
  AppState.currentUser = null;
  try {
    localStorage.removeItem('squad_session');
  } catch (e) {}

  // Закрытие всех модалок и чата
  document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
  if (typeof closeChat === 'function') closeChat();

  // Переход на 1-ю страницу
  switchPage('pageWelcome');
  updateUI();

  // Рендеринг бан-карточки
  renderWelcomeBanNotice(banInfo);
}

function renderWelcomeBanNotice(banInfo) {
  let card = document.getElementById('welcomeBanNoticeCard');
  if (!card) {
    const welcomeHero = document.querySelector('.welcome-hero-container');
    if (welcomeHero) {
      const cardEl = document.createElement('div');
      cardEl.id = 'welcomeBanNoticeCard';
      cardEl.className = 'welcome-ban-notice-card';
      welcomeHero.prepend(cardEl);
      card = cardEl;
    }
  }

  if (!card || !banInfo) return;

  if (welcomeBanTimer) clearInterval(welcomeBanTimer);

  const updateCardContent = () => {
    const currentInfo = getBanInfo(AppState.currentUser || banInfo.username || (document.getElementById('loginUsername')?.value));
    const activeInfo = currentInfo || banInfo;

    if (!activeInfo || (!activeInfo.isPermanent && activeInfo.remainingMs <= 0)) {
      if (welcomeBanTimer) clearInterval(welcomeBanTimer);
      card.innerHTML = `
        <div class="ban-notice-header success">
          <span class="ban-icon">✅</span>
          <div>
            <h3>Срок блокировки истёк!</h3>
            <p>Ваш аккаунт снова доступен. Нажмите «Войти», чтобы продолжить.</p>
          </div>
        </div>
      `;
      return;
    }

    card.innerHTML = `
      <div class="ban-notice-glow"></div>
      <div class="ban-notice-header">
        <span class="ban-icon">🚫</span>
        <div>
          <h3 class="ban-title">ВАШ АККАУНТ ЗАБЛОКИРОВАН</h3>
          <p class="ban-sub">Доступ к платформе Lobbivo временно или полностью ограничен</p>
        </div>
      </div>
      <div class="ban-notice-details">
        <div class="ban-detail-row">
          <span class="detail-label">Причина блокировки:</span>
          <span class="detail-val reason">${escapeHtml(activeInfo.banReason)}</span>
        </div>
        <div class="ban-detail-row">
          <span class="detail-label">Срок окончания:</span>
          <span class="detail-val">${activeInfo.dateFormatted}</span>
        </div>
        <div class="ban-detail-row">
          <span class="detail-label">Осталось времени:</span>
          <span class="detail-val highlight" id="banTimerLive">${activeInfo.remainingFormatted}</span>
        </div>
        <div class="ban-detail-row">
          <span class="detail-label">Заблокировал:</span>
          <span class="detail-val">${escapeHtml(activeInfo.bannedBy)}</span>
        </div>
      </div>
    `;
  };

  updateCardContent();
  card.style.display = 'block';

  welcomeBanTimer = setInterval(updateCardContent, 1000);
}

// ============================================================
//  9. ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ АДМИН-ПАНЕЛИ
// ============================================================

function initAdminControls() {
  // Кнопка в шапке
  document.getElementById('capsuleAdminBtn')?.addEventListener('click', () => openAdminPanel('complaints'));
  document.getElementById('adminPanelCloseBtn')?.addEventListener('click', closeAdminPanel);
  document.getElementById('adminPanelModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeAdminPanel();
  });

  // Вкладки админ-панели
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      switchAdminTab(this.dataset.tab);
    });
  });

  // Поиск и фильтры пользователей
  const searchUsersInput = document.getElementById('adminSearchUsers');
  const filterUsersSelect = document.getElementById('adminFilterStatus');
  if (searchUsersInput) {
    searchUsersInput.addEventListener('input', () => {
      renderAdminUsers(searchUsersInput.value, filterUsersSelect?.value || 'all');
    });
  }
  if (filterUsersSelect) {
    filterUsersSelect.addEventListener('change', () => {
      renderAdminUsers(searchUsersInput?.value || '', filterUsersSelect.value);
    });
  }

  // Модалка бана
  document.getElementById('adminBanModalClose')?.addEventListener('click', closeBanModal);
  document.getElementById('banCancelBtn')?.addEventListener('click', closeBanModal);
  document.getElementById('banSubmitBtn')?.addEventListener('click', submitBan);
  document.getElementById('adminBanModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeBanModal();
  });

  // Пресеты времени бана
  document.querySelectorAll('.ban-preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.ban-preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const customInput = document.getElementById('banCustomHours');
      if (customInput) customInput.value = '';
    });
  });

  // Пресеты причин бана
  document.querySelectorAll('.ban-reason-pill').forEach(pill => {
    pill.addEventListener('click', function() {
      const input = document.getElementById('banReasonInput');
      if (input) input.value = this.textContent;
    });
  });

  // Модалка мута
  document.getElementById('adminMuteModalClose')?.addEventListener('click', closeMuteModal);
  document.getElementById('muteCancelBtn')?.addEventListener('click', closeMuteModal);
  document.getElementById('muteSubmitBtn')?.addEventListener('click', submitMute);
  document.getElementById('adminMuteModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeMuteModal();
  });

  // Пресеты времени мута
  document.querySelectorAll('.mute-preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.mute-preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const customInput = document.getElementById('muteCustomMinutes');
      if (customInput) customInput.value = '';
    });
  });

  // Пресеты причин мута
  document.querySelectorAll('.mute-reason-pill').forEach(pill => {
    pill.addEventListener('click', function() {
      const input = document.getElementById('muteReasonInput');
      if (input) input.value = this.textContent;
    });
  });

  // Настройки тега администратора
  document.getElementById('adminBadgeToggle')?.addEventListener('change', updateAdminLivePreview);
  document.querySelectorAll('input[name="adminBadgePreset"]').forEach(radio => {
    radio.addEventListener('change', updateAdminLivePreview);
  });
  document.getElementById('adminBadgeCustomText')?.addEventListener('input', updateAdminLivePreview);
  document.getElementById('saveAdminBadgeBtn')?.addEventListener('click', saveAdminBadgeSettings);
}

// ============================================================
//  10. УПРАВЛЕНИЕ ТЕГОМ АДМИНИСТРАТОРА (ADMIN BADGE CONTROLLER)
// ============================================================

function renderAdminBadgeSettings() {
  const current = AppState.currentUser;
  if (!current || !isUserAdmin(current)) return;
  const user = AppState.users[current];
  if (!user) return;

  const toggle = document.getElementById('adminBadgeToggle');
  const customTextInput = document.getElementById('adminBadgeCustomText');
  const presetRadios = document.querySelectorAll('input[name="adminBadgePreset"]');

  const isEnabled = user.adminBadgeEnabled !== false;
  const activePreset = user.adminBadgeType || 'admin';
  const customText = user.adminBadgeText || '';

  if (toggle) toggle.checked = isEnabled;
  if (customTextInput) customTextInput.value = customText;

  presetRadios.forEach(radio => {
    radio.checked = (radio.value === activePreset);
  });

  updateAdminLivePreview();
}

function updateAdminLivePreview() {
  const current = AppState.currentUser || 'Admin';
  const user = current ? AppState.users[current] : null;
  const toggle = document.getElementById('adminBadgeToggle');
  const isEnabled = toggle ? toggle.checked : true;
  const selectedRadio = document.querySelector('input[name="adminBadgePreset"]:checked');
  const presetType = selectedRadio ? selectedRadio.value : 'admin';
  const customTextInput = document.getElementById('adminBadgeCustomText');
  const customText = customTextInput ? customTextInput.value.trim() : '';

  const previewAvatar = document.getElementById('previewAdminAvatar');
  const previewName = document.getElementById('previewAdminName');
  const previewContainer = document.getElementById('previewAdminBadgeContainer');

  if (previewAvatar) {
    if (user && user.avatar) {
      previewAvatar.innerHTML = `<img src="${user.avatar}" alt="${escapeHtml(current)}">`;
    } else {
      previewAvatar.innerHTML = `<span>${current.slice(0, 2).toUpperCase()}</span>`;
    }
  }

  if (previewName) {
    previewName.textContent = current;
  }

  if (previewContainer) {
    if (!isEnabled) {
      previewContainer.innerHTML = '<span style="font-size:0.7rem;color:var(--text-muted);font-style:italic;">(Инкогнито: тег скрыт)</span>';
    } else {
      let defaultText = 'АДМИНИСТРАТОР';
      let icon = 'icon-admin-shield';
      let styleClass = 'badge-style-admin';

      if (presetType === 'team') {
        defaultText = 'LOBBIVO TEAM';
        icon = 'icon-crown';
        styleClass = 'badge-style-team';
      } else if (presetType === 'dev') {
        defaultText = 'DEVELOPER';
        icon = 'icon-sparkles';
        styleClass = 'badge-style-dev';
      } else if (presetType === 'moderator') {
        defaultText = 'МОДЕРАТОР';
        icon = 'icon-admin-shield';
        styleClass = 'badge-style-mod';
      }

      const displayText = customText || defaultText;
      previewContainer.innerHTML = `
        <span class="admin-custom-badge ${styleClass}">
          <svg><use href="#${icon}"/></svg>
          <span>${escapeHtml(displayText)}</span>
        </span>
      `;
    }
  }
}

function saveAdminBadgeSettings() {
  const current = AppState.currentUser;
  if (!current || !isUserAdmin(current)) return;
  const user = AppState.users[current];
  if (!user) return;

  const toggle = document.getElementById('adminBadgeToggle');
  const selectedRadio = document.querySelector('input[name="adminBadgePreset"]:checked');
  const customTextInput = document.getElementById('adminBadgeCustomText');

  const isEnabled = toggle ? toggle.checked : true;
  const presetType = selectedRadio ? selectedRadio.value : 'admin';
  const customText = customTextInput ? customTextInput.value.trim() : '';

  user.adminBadgeEnabled = isEnabled;
  user.adminBadgeType = presetType;
  user.adminBadgeStyle = presetType; // 'admin' | 'team' | 'dev' | 'moderator'
  user.adminBadgeText = customText;

  saveUsers(current);
  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    FirebaseSync.saveUser(current, user);
  }

  showNotification('Настройки сохранены', isEnabled ? 'Тег администратора обновлён и активен!' : 'Включен режим Инкогнито: тег скрыт');

  updateAdminLivePreview();
  if (typeof renderWorldChat === 'function') renderWorldChat();
  if (typeof updateHeaderAvatar === 'function') updateHeaderAvatar();
  if (typeof renderPlayers === 'function') renderPlayers(AppState.selectedGameFilter);
}

document.addEventListener('DOMContentLoaded', initAdminControls);

