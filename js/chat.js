// ============================================================
//  ЧАТ LOBBIVO 2.0 (WORLD & DIRECT CHAT SYSTEM - TELEGRAM STYLE)
// ============================================================

let isChatOpen = false;
let isInChat = false;

// ============================================================
//  1. ФОРМАТИРОВАНИЕ СООБЩЕНИЙ И ПАСХАЛКИ
// ============================================================

// Форматирование текста сообщений, модерация мата и пасхалки
function formatChatMessage(rawText) {
  if (!rawText) return '';
  let safe = escapeHtml(String(rawText).trim());

  // Автоматическая цензура / блюр мата (по умолчанию включена)
  const isCensorshipActive = typeof AppState === 'undefined' || AppState.chatCensorship !== false;
  if (typeof SecurityShield !== 'undefined' && typeof SecurityShield.censorProfanity === 'function') {
    safe = SecurityShield.censorProfanity(safe, isCensorshipActive);
  }

  const gayRegex = /(^|[^\p{L}\p{N}_])(гей|геи|геем|геев|гейский|гейская|гейское|гейские|гейству|геями|геях|gay|gays)(?=[^\p{L}\p{N}_]|$)/giu;
  safe = safe.replace(gayRegex, (match, prefix) => {
    return `${prefix}<span class="rainbow-gay-tag" title="Pride Rainbow">Gay</span>`;
  });
  return safe;
}

// ============================================================
//  2. ОТВЕТЫ НА СООБЩЕНИЯ (REPLY SYSTEM - TELEGRAM STYLE)
// ============================================================

function setReplyTo(msgId, author, text, chatType) {
  AppState.activeReply = {
    id: msgId,
    author: author,
    text: text,
    chatType: chatType // 'world' | 'direct'
  };

  const previewEl = document.getElementById(chatType === 'world' ? 'worldReplyPreview' : 'directReplyPreview');
  const authorEl = document.getElementById(chatType === 'world' ? 'worldReplyAuthor' : 'directReplyAuthor');
  const textEl = document.getElementById(chatType === 'world' ? 'worldReplyText' : 'directReplyText');
  const inputEl = document.getElementById(chatType === 'world' ? 'worldChatInput' : 'chatInput');

  if (previewEl && authorEl && textEl) {
    authorEl.textContent = `Ответ для ${author}`;
    textEl.textContent = text.length > 80 ? text.slice(0, 80) + '...' : text;
    previewEl.style.display = 'flex';
  }

  if (inputEl) {
    inputEl.focus();
  }
}

function cancelReply(chatType = null) {
  AppState.activeReply = null;
  const worldPreview = document.getElementById('worldReplyPreview');
  const directPreview = document.getElementById('directReplyPreview');
  if (!chatType || chatType === 'world') {
    if (worldPreview) worldPreview.style.display = 'none';
  }
  if (!chatType || chatType === 'direct') {
    if (directPreview) directPreview.style.display = 'none';
  }
}

function highlightChatMessage(msgId) {
  if (!msgId) return;
  const el = document.getElementById(msgId) || document.querySelector(`[data-msg-id="${msgId}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('msg-highlight');
    setTimeout(() => el.classList.remove('msg-highlight'), 1600);
  }
}

// ============================================================
//  3. ИНДИКАТОРЫ НАБОРА ТЕКСТА (TYPING INDICATORS)
// ============================================================

let worldTypingTimer = null;
let directTypingTimer = null;

function handleWorldInputTyping() {
  if (!AppState.currentUser) return;
  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    FirebaseSync.setTyping('world', null, AppState.currentUser, true);
  }
  clearTimeout(worldTypingTimer);
  worldTypingTimer = setTimeout(() => {
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized && AppState.currentUser) {
      FirebaseSync.setTyping('world', null, AppState.currentUser, false);
    }
  }, 3500);
}

function handleDirectInputTyping() {
  if (!AppState.currentUser || !AppState.chatPartner) return;
  const key = getMessagesKey(AppState.currentUser, AppState.chatPartner);
  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    FirebaseSync.setTyping('direct', key, AppState.currentUser, true);
  }
  clearTimeout(directTypingTimer);
  directTypingTimer = setTimeout(() => {
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized && AppState.currentUser) {
      FirebaseSync.setTyping('direct', key, AppState.currentUser, false);
    }
  }, 3500);
}

function renderWorldTypingIndicator() {
  const bar = document.getElementById('worldChatTyping');
  const textEl = document.getElementById('worldChatTypingText');
  if (!bar || !textEl) return;

  const typingMap = AppState.typingUsers.world || {};
  const now = Date.now();
  const typingList = Object.keys(typingMap).filter(user => {
    return user !== AppState.currentUser && (now - Number(typingMap[user])) < 4000;
  });

  if (typingList.length > 0) {
    const names = typingList.slice(0, 2).join(', ') + (typingList.length > 2 ? ` и ещё ${typingList.length - 2}` : '');
    textEl.textContent = `${names} печатает...`;
    bar.style.display = 'flex';
  } else {
    bar.style.display = 'none';
  }
}

function renderDirectTypingIndicator() {
  const bar = document.getElementById('directChatTyping');
  const textEl = document.getElementById('directChatTypingText');
  const statusEl = document.getElementById('chatUserStatus');
  if (!bar) return;

  if (!AppState.currentUser || !AppState.chatPartner) {
    bar.style.display = 'none';
    return;
  }

  const key = getMessagesKey(AppState.currentUser, AppState.chatPartner);
  const directMap = (AppState.typingUsers.direct && AppState.typingUsers.direct[key]) || {};
  const now = Date.now();
  const partnerTimestamp = directMap[AppState.chatPartner];
  const isTyping = partnerTimestamp && (now - Number(partnerTimestamp)) < 4000;

  if (isTyping) {
    if (textEl) textEl.textContent = `${AppState.chatPartner} печатает...`;
    bar.style.display = 'flex';
    if (statusEl) {
      statusEl.className = 'chat-header-status typing';
      statusEl.textContent = 'печатает...';
    }
  } else {
    bar.style.display = 'none';
    if (statusEl) {
      const partnerData = AppState.users[AppState.chatPartner];
      const isOnline = isUserOnline(AppState.chatPartner);
      statusEl.className = 'chat-header-status ' + (isOnline ? 'online' : 'offline');
      statusEl.textContent = formatLastSeen(partnerData ? partnerData.lastSeen : null, AppState.chatPartner);
    }
  }
}

// ============================================================
//  4. УПРАВЛЕНИЕ ОКНОМ И ВКЛАДКАМИ ЧАТА
// ============================================================

function toggleChat() {
  const container = document.getElementById('chatContainer');
  if (!container) return;

  if (container.classList.contains('open')) {
    closeChat();
  } else {
    openChat(AppState.activeChatTab || 'world');
  }
}

function openChat(tab = 'world') {
  // Закрываем меню профиля, магазин и предосмотр товаров
  const avatarDropdown = document.getElementById('avatarDropdown');
  if (avatarDropdown) avatarDropdown.classList.remove('open');
  if (typeof closeCoinModal === 'function') closeCoinModal();
  if (typeof closeShopItemPreview === 'function') closeShopItemPreview();
  const container = document.getElementById('chatContainer');
  if (!container) return;

  container.classList.remove('closing');
  container.classList.add('open');
  isChatOpen = true;

  switchChatTab(tab);
}

function closeChat() {
  const container = document.getElementById('chatContainer');
  if (!container) return;

  // Если чат уже закрыт — немедленно выходим и не запускаем анимацию
  if (!container.classList.contains('open') && !isChatOpen) return;

  container.classList.remove('open');
  container.classList.add('closing');
  isChatOpen = false;
  isInChat = false;
  AppState.chatPartner = null;
  cancelReply();
  
  closeUserQuickPopover();
  updateChatBadge();

  setTimeout(() => {
    container.classList.remove('closing');
  }, 240);
}

function switchChatTab(tab) {
  AppState.activeChatTab = tab;
  cancelReply();

  const tabWorld = document.getElementById('chatTabWorld');
  const tabDirect = document.getElementById('chatTabDirect');
  const worldView = document.getElementById('worldChatView');
  const directView = document.getElementById('directChatView');
  const chatBackBtn = document.getElementById('chatBackBtn');
  const chatUserName = document.getElementById('chatUserName');
  const chatAvatar = document.getElementById('chatAvatar');
  const chatUserStatus = document.getElementById('chatUserStatus');

  const deleteDirectHeaderBtn = document.getElementById('deleteDirectChatHeaderBtn');

  if (tabWorld) tabWorld.classList.toggle('active', tab === 'world');
  if (tabDirect) tabDirect.classList.toggle('active', tab === 'direct');

  if (tab === 'world') {
    isInChat = false;
    AppState.chatPartner = null;
    if (deleteDirectHeaderBtn) deleteDirectHeaderBtn.style.display = 'none';
    if (worldView) {
      worldView.style.display = 'flex';
      worldView.classList.add('active');
    }
    if (directView) {
      directView.style.display = 'none';
      directView.classList.remove('active');
    }
    if (chatBackBtn) chatBackBtn.style.display = 'none';
    if (chatUserName) chatUserName.textContent = 'Мировой чат';
    if (chatAvatar) chatAvatar.innerHTML = '<svg class="mini-svg" style="width:20px;height:20px;color:var(--brand-start);"><use href="#icon-globe"/></svg>';
    if (chatUserStatus) chatUserStatus.style.display = 'none';

    renderWorldChat();
    renderWorldTypingIndicator();
  } else {
    if (worldView) {
      worldView.style.display = 'none';
      worldView.classList.remove('active');
    }
    if (directView) {
      directView.style.display = 'flex';
      directView.classList.add('active');
    }
    if (!isInChat || !AppState.chatPartner) {
      if (deleteDirectHeaderBtn) deleteDirectHeaderBtn.style.display = 'none';
      showDirectChatList();
    }
  }
  updateChatBadge();
}


// ============================================================
//  5. МИРОВОЙ ЧАТ (WORLD CHAT STREAM)
// ============================================================

function renderVipSquadPinnedBar() {
  const bar = document.getElementById('vipSquadPinnedBar');
  if (!bar) return;

  const current = AppState.currentUser;
  const now = Date.now();
  
  // Ищем анкеты, которые пользователь ЯВНО закрепил через тумблер в «Мои анкеты»
  let pinnedCandidate = null;

  // 1. Сначала проверяем закреп текущего пользователя (чтобы он сразу видел свой закреп)
  if (current && AppState.users[current]) {
    const meSquads = Array.isArray(AppState.users[current].squads) ? AppState.users[current].squads : [];
    const myPinned = meSquads.find(s => s && s.pinnedInChat === true && s.active !== false);
    if (myPinned) {
      pinnedCandidate = {
        username: current,
        data: AppState.users[current],
        squad: myPinned,
        isBoosted: isSquadVipBoosted(current)
      };
    }
  }

  // 2. Если у текущего пользователя нет закрепа, ищем закрепленные анкеты других пользователей
  if (!pinnedCandidate) {
    for (const [name, data] of Object.entries(AppState.users)) {
      if (name === current) continue;
      if (!Array.isArray(data.squads)) continue;
      const pinnedSq = data.squads.find(s => s && s.pinnedInChat === true && s.active !== false);
      if (pinnedSq) {
        pinnedCandidate = {
          username: name,
          data: data,
          squad: pinnedSq,
          isBoosted: isSquadVipBoosted(name)
        };
        break;
      }
    }
  }

  // Если ни у кого не включен тумблер закрепления — по умолчанию ничего не закрепляется
  if (!pinnedCandidate) {
    bar.style.display = 'none';
    bar.innerHTML = '';
    return;
  }

  const { username, data, squad, isBoosted } = pinnedCandidate;

  // Проверка скрытия объявления пользователем в localStorage
  const dismissKey = `lobbivo_dismissed_vip_${username}_${squad.id || 'sq'}`;
  if (localStorage.getItem(dismissKey) === 'true') {
    bar.style.display = 'none';
    bar.innerHTML = '';
    return;
  }

  const safeName = escapeHtml(username);
  const targetGameId = squad.game || data.game || 'csgo';
  const gameObj = GAMES.find(g => g.id === targetGameId) || GAMES[0];
  const frameId = getUserEquippedFrame(username);
  const safeDesc = escapeHtml(squad.desc || data.desc || 'Ищу тиммейтов для совместной игры и побед!');
  const safeRank = escapeHtml(squad.rank || data.rank || '');
  const isMe = current === username;

  let avatarHtml;
  if (data.avatar) {
    avatarHtml = `<img src="${data.avatar}" alt="${safeName}">`;
  } else {
    const initials = safeName.slice(0, 2).toUpperCase();
    avatarHtml = `<span>${initials || '?'}</span>`;
  }

  if (frameId && frameId !== 'none') {
    avatarHtml = `<div class="avatar-frame-wrap frame-${frameId}">${avatarHtml}</div>`;
  }

  bar.innerHTML = `
    <div class="vip-pinned-capsule ${isBoosted ? 'boosted' : 'premium'}">
      <div class="vip-pinned-left">
        <div class="vip-pinned-badge">
          <svg><use href="#icon-badge-vip"/></svg>
          <span>VIP СБОР</span>
        </div>
        <div class="vip-pinned-avatar" data-username="${safeName}">
          ${avatarHtml}
        </div>
        <div class="vip-pinned-info">
          <div class="vip-pinned-header">
            <span class="vip-pinned-name ${getUserNameClass(username)}" data-username="${safeName}">
              ${safeName}
            </span>
            ${isUserPremium(username) ? '<span class="premium-crown-badge"><svg><use href="#icon-crown"/></svg></span>' : ''}
            <span class="vip-pinned-game">
              <svg><use href="#${escapeHtml(gameObj.icon)}"/></svg>
              <span>${escapeHtml(gameObj.name)}</span>
            </span>
            ${safeRank ? `<span class="vip-pinned-rank">${safeRank}</span>` : ''}
          </div>
          <div class="vip-pinned-desc">${safeDesc}</div>
        </div>
      </div>
      <div class="vip-pinned-actions">
        ${!isMe ? `
          <button type="button" class="btn-vip-join" data-username="${safeName}" title="Написать игроку">
            <svg><use href="#icon-chat"/></svg>
            <span>Вступить</span>
          </button>
        ` : `
          <span class="vip-my-squad-tag">Ваш закреп</span>
        `}
        <button type="button" class="btn-vip-dismiss" data-dismiss-user="${safeName}" title="Скрыть это объявление навсегда">
          <svg><use href="#icon-close-sm"/></svg>
        </button>
      </div>
    </div>
  `;

  bar.style.display = 'block';

  // Обработчики кликов
  bar.querySelectorAll('[data-username]').forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      openUserQuickPopover(el.dataset.username);
    };
  });

  const joinBtn = bar.querySelector('.btn-vip-join');
  if (joinBtn) {
    joinBtn.onclick = (e) => {
      e.stopPropagation();
      initiateChatWith(joinBtn.dataset.username);
    };
  }

  const dismissBtn = bar.querySelector('.btn-vip-dismiss');
  if (dismissBtn) {
    dismissBtn.onclick = (e) => {
      e.stopPropagation();
      const targetUser = dismissBtn.dataset.dismissUser;
      localStorage.setItem(`lobbivo_dismissed_vip_${targetUser}`, 'true');
      bar.classList.add('dismissing');
      setTimeout(() => {
        bar.style.display = 'none';
        bar.classList.remove('dismissing');
        bar.innerHTML = '';
      }, 240);
    };
  }
}

function renderWorldChat() {
  const container = document.getElementById('worldChatMessages');
  if (!container) return;

  renderVipSquadPinnedBar();

  if (!AppState.worldMessages || !AppState.worldMessages.length) {
    loadWorldMessages();
  }
  const msgs = AppState.worldMessages || [];

  if (msgs.length === 0) {
    container.innerHTML = `
      <div class="empty-chats">
        <svg style="width:36px;height:36px;opacity:0.4;margin-bottom:8px;"><use href="#icon-sparkles"/></svg><br>
        В мировом чате пока тихо.<br>Будьте первым, кто напишет сюда!
      </div>
    `;
    return;
  }

  const current = AppState.currentUser;
  const isCurrentAdmin = typeof isUserAdmin === 'function' && isUserAdmin(current);
  let html = '';

  msgs.forEach(msg => {
    const isMe = current && msg.from === current;
    const authorData = AppState.users[msg.from];
    const isBlocked = isUserBlocked(current, msg.from);
    const safeAuthor = escapeHtml(msg.from);
    const msgId = escapeHtml(msg.id || '');
    const timeStr = new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const gameObj = GAMES.find(g => g.id === (authorData ? authorData.game : msg.game)) || GAMES[0];
    const isAuthorPremium = isUserPremium(msg.from);
    const authorFrame = getUserEquippedFrame(msg.from);
    const adminBadge = typeof getUserAdminBadge === 'function' ? getUserAdminBadge(msg.from) : null;
    const userTags = typeof getUserCustomTags === 'function' ? getUserCustomTags(msg.from) : [];
    const primaryTag = userTags.length > 0 ? userTags[0] : null;

    let avatarHtml;
    if (authorData && authorData.avatar) {
      avatarHtml = `<img src="${authorData.avatar}" alt="${safeAuthor}">`;
    } else {
      const initials = safeAuthor.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      avatarHtml = initials || '?';
    }

    if (authorFrame && authorFrame !== 'none') {
      avatarHtml = `<div class="avatar-frame-wrap frame-${authorFrame}">${avatarHtml}</div>`;
    }

    const premiumBadgeHtml = isAuthorPremium ? `<span class="premium-crown-badge" title="Lobbivo Premium"><svg><use href="#icon-crown"/></svg></span>` : '';
    const adminBadgeHtml = adminBadge ? `
      <span class="admin-custom-badge badge-style-${adminBadge.style}" title="Администратор Lobbivo: ${escapeHtml(adminBadge.text)}">
        <svg><use href="#${adminBadge.icon}"/></svg>
        <span>${escapeHtml(adminBadge.text)}</span>
      </span>
    ` : '';
    const authorClass = 'world-msg-author ' + getUserNameClass(safeAuthor);

    const gameBadgeHtml = gameObj ? `
      <span class="chat-game-badge" title="Игра: ${escapeHtml(gameObj.name)}">
        <svg class="chat-game-icon"><use href="#${escapeHtml(gameObj.icon)}"/></svg>
        <span class="chat-game-title">${escapeHtml(gameObj.name)}</span>
      </span>
    ` : '';

    const tagBadgeHtml = primaryTag ? `
      <span class="chat-user-tag-mini" title="Тег игрока: ${escapeHtml(primaryTag)}">
        ${escapeHtml(primaryTag)}
      </span>
    ` : '';

    // Рендеринг цитаты ответа (если есть)
    let replyQuoteHtml = '';
    if (msg.replyTo && msg.replyTo.author) {
      replyQuoteHtml = `
        <div class="msg-reply-quote" onclick="highlightChatMessage('${escapeHtml(msg.replyTo.id)}')">
          <div class="reply-quote-bar"></div>
          <div class="reply-quote-content">
            <span class="reply-quote-author">${escapeHtml(msg.replyTo.author)}</span>
            <span class="reply-quote-text">${escapeHtml(msg.replyTo.text)}</span>
          </div>
        </div>
      `;
    }

    // Кнопки действий над сообщением (Ответ + Админ модерация)
    const actionsHtml = `
      <div class="msg-actions-bar">
        <button type="button" class="btn-msg-reply" data-msg-id="${msgId}" data-author="${safeAuthor}" data-text="${escapeHtml(msg.text)}" data-scope="world" title="Ответить">
          <svg><use href="#icon-back"/></svg>
        </button>
        ${isCurrentAdmin ? `
          <button type="button" class="btn-msg-admin btn-msg-mute" data-author="${safeAuthor}" title="Замьютить ${safeAuthor}">
            <svg><use href="#icon-mute"/></svg>
          </button>
          <button type="button" class="btn-msg-admin btn-msg-del" data-msg-id="${msgId}" data-scope="world" title="Удалить сообщение">
            <svg><use href="#icon-trash"/></svg>
          </button>
        ` : ''}
      </div>
    `;

    if (isBlocked) {
      html += `
        <div class="world-msg-item world-msg-blocked" id="${msgId}" data-msg-id="${msgId}" data-user="${safeAuthor}">
          ${actionsHtml}
          <div class="world-msg-avatar">${avatarHtml}</div>
          <div class="world-msg-body">
            <div class="world-msg-header">
              <span class="${authorClass}" data-username="${safeAuthor}">${safeAuthor}</span>
              ${premiumBadgeHtml}
              ${adminBadgeHtml}
              <span class="world-msg-time">${timeStr}</span>
            </div>
            <div class="world-msg-text blocked-msg-notice"><svg class="mini-svg" style="width:14px;height:14px;color:#ff4466;"><use href="#icon-ban"/></svg> Сообщение от заблокированного пользователя</div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="world-msg-item ${isMe ? 'from-me' : ''}" id="${msgId}" data-msg-id="${msgId}" data-user="${safeAuthor}">
          ${actionsHtml}
          <div class="world-msg-avatar" data-username="${safeAuthor}" title="Открыть профиль">${avatarHtml}</div>
          <div class="world-msg-body">
            <div class="world-msg-header">
              <span class="${authorClass}" data-username="${safeAuthor}" title="Открыть профиль">${safeAuthor}</span>
              ${premiumBadgeHtml}
              ${adminBadgeHtml}
              ${gameBadgeHtml}
              ${tagBadgeHtml}
              <span class="world-msg-time">${timeStr}</span>
            </div>
            ${replyQuoteHtml}
            <div class="world-msg-text">${formatChatMessage(msg.text)}</div>
          </div>
        </div>
      `;
    }
  });

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;

  // Делегирование событий на контейнер мирового чата (добавляется единожды)
  if (!container._delegatedEventsBound) {
    container._delegatedEventsBound = true;
    container.addEventListener('click', (e) => {
      const replyBtn = e.target.closest('.btn-msg-reply[data-scope="world"]');
      if (replyBtn) {
        e.stopPropagation();
        setReplyTo(replyBtn.dataset.msgId, replyBtn.dataset.author, replyBtn.dataset.text, 'world');
        return;
      }

      const delBtn = e.target.closest('.btn-msg-del[data-scope="world"]');
      if (delBtn) {
        e.stopPropagation();
        const msgId = delBtn.dataset.msgId;
        if (confirm('Удалить это сообщение из мирового чата?')) {
          deleteWorldMessage(msgId);
          renderWorldChat();
          showNotification('Сообщение удалено', 'Сообщение успешно удалено из мирового чата');
        }
        return;
      }

      const muteBtn = e.target.closest('.btn-msg-mute');
      if (muteBtn) {
        e.stopPropagation();
        const author = muteBtn.dataset.author;
        if (typeof openMuteModal === 'function') {
          openMuteModal(author);
        }
        return;
      }

      const userEl = e.target.closest('[data-username]');
      if (userEl && !e.target.closest('.msg-actions-bar') && !e.target.closest('.msg-reply-quote')) {
        e.stopPropagation();
        const user = userEl.dataset.username;
        if (user) openUserQuickPopover(user);
        return;
      }
    });
  }

  renderWorldTypingIndicator();
  updateChatMuteUI();
}

function sendWorldMessage() {
  const input = document.getElementById('worldChatInput');
  if (!input) return;

  const rawText = input.value.trim();
  if (!rawText) return;

  if (typeof SecurityShield !== 'undefined' && !SecurityShield.checkRateLimit('world_chat')) {
    return;
  }

  if (!AppState.currentUser) {
    showNotification('Требуется вход', 'Войдите в аккаунт, чтобы писать в мировой чат');
    showAuthModal('login');
    return;
  }

  if (typeof isUserMuted === 'function' && isUserMuted(AppState.currentUser)) {
    const muteInfo = getMuteInfo(AppState.currentUser);
    showNotification('Чат заблокирован', `Вы не можете отправлять сообщения: ${muteInfo?.muteReason || 'Мут'} (осталось ${muteInfo?.remainingFormatted || ''})`);
    return;
  }

  if (typeof isUserBanned === 'function' && isUserBanned(AppState.currentUser)) {
    showNotification('Аккаунт заблокирован', 'Ваш аккаунт заблокирован');
    return;
  }

  const replyTo = (AppState.activeReply && AppState.activeReply.chatType === 'world') ? AppState.activeReply : null;
  const text = typeof SecurityShield !== 'undefined' ? SecurityShield.sanitizeText(rawText, 500) : rawText;

  addWorldMessage(AppState.currentUser, text, replyTo);
  input.value = '';
  cancelReply('world');

  if (typeof RetentionEngine !== 'undefined') {
    RetentionEngine.playSound('message');
    RetentionEngine.haptic('light');
  }

  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    FirebaseSync.setTyping('world', null, AppState.currentUser, false);
  }

  renderWorldChat();
}

// ============================================================
//  6. БЫСТРАЯ КАРТОЧКА ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ (USER QUICK POPOVER)
// ============================================================

function openUserQuickPopover(username) {
  if (!username) return;

  const popover = document.getElementById('userQuickPopover');
  if (!popover) return;

  const data = AppState.users[username];
  const isMe = AppState.currentUser === username;
  const isBlocked = isUserBlocked(AppState.currentUser, username);
  const isOnline = isUserOnline(username);

  const avatarEl = document.getElementById('popoverAvatar');
  const nameEl = document.getElementById('popoverUsername');
  const gameTagEl = document.getElementById('popoverGameTag');
  const bioEl = document.getElementById('popoverBio');
  const tagsEl = document.getElementById('popoverTags');
  const msgBtn = document.getElementById('popoverMsgBtn');
  const blockBtn = document.getElementById('popoverBlockBtn');
  const blockText = document.getElementById('popoverBlockText');

  const isPremium = isUserPremium(username);
  const frameId = getUserEquippedFrame(username);
  const miniBg = typeof getUserEquippedMiniBg === 'function' ? getUserEquippedMiniBg(username) : 'default';
  const adminBadge = typeof getUserAdminBadge === 'function' ? getUserAdminBadge(username) : null;
  const adminBadgeHtml = adminBadge ? `<span class="admin-custom-badge badge-style-${adminBadge.style}" title="Администратор Lobbivo"><svg><use href="#${adminBadge.icon}"/></svg><span>${escapeHtml(adminBadge.text)}</span></span>` : '';

  // Применение анимированного фона Steam мини-профиля
  const popoverAnimatedBg = document.getElementById('popoverAnimatedBg');
  const popoverCard = document.getElementById('popoverCard') || popover.querySelector('.popover-card');
  if (popoverAnimatedBg) {
    popoverAnimatedBg.className = `popover-animated-bg mini-bg-${miniBg}`;
  }
  if (popoverCard) {
    popoverCard.setAttribute('data-mini-bg', miniBg);
  }

  if (nameEl) {
    nameEl.innerHTML = `<span class="${getUserNameClass(username)}">${escapeHtml(username)}</span>${isPremium ? ' <span class="premium-crown-badge" title="Lobbivo Premium"><svg><use href="#icon-crown"/></svg></span>' : ''} ${adminBadgeHtml}`;
  }

  let avatarContent;
  if (data && data.avatar) {
    avatarContent = `<img src="${data.avatar}" alt="${escapeHtml(username)}">`;
  } else {
    const initials = username.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    avatarContent = `<span>${initials || '?'}</span>`;
  }

  if (frameId && frameId !== 'none') {
    avatarContent = `<div class="avatar-frame-wrap frame-${frameId}">${avatarContent}</div>`;
  }
  if (avatarEl) avatarEl.innerHTML = avatarContent;

  const gameObj = data ? (GAMES.find(g => g.id === data.game) || GAMES[0]) : GAMES[0];
  const rankStr = data && data.rank ? ` • ${data.rank}` : '';
  const statusStr = formatLastSeen(data ? data.lastSeen : null, username);

  if (gameTagEl) {
    gameTagEl.innerHTML = `
      <div class="chat-game-badge popover-game-pill" title="${escapeHtml(gameObj.name)}">
        <svg class="chat-game-icon"><use href="#${escapeHtml(gameObj.icon)}"/></svg>
        <span class="chat-game-title">${escapeHtml(gameObj.name)}${rankStr}</span>
      </div>
      <span class="popover-online-status ${isOnline ? 'online' : 'offline'}">• ${statusStr}</span>
    `;
  }

  if (bioEl) {
    bioEl.textContent = data && data.desc ? data.desc : 'Пользователь платформы Lobbivo';
  }

  if (tagsEl) {
    let tagHtml = `<span class="world-msg-tag"><svg class="device-icon device-icon-sm" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:3px;"><use href="#${getDeviceIconSVG(data ? (data.device || 'PC') : 'PC')}"/></svg>${escapeHtml(data ? (data.device || 'PC') : 'PC')}</span>`;
    
    if (data && data.discord) {
      tagHtml += `<span class="world-msg-tag">Discord: ${escapeHtml(data.discord)}</span>`;
    }
    if (areFriends(AppState.currentUser, username)) {
      tagHtml += `<span class="world-msg-tag" style="border-color:#34d399;color:#34d399;"><svg class="mini-svg" style="width:12px;height:12px;margin-right:4px;vertical-align:-1px;"><use href="#icon-users"/></svg>В друзьях</span>`;
    }
    
    const userCustomTags = typeof getUserCustomTags === 'function' ? getUserCustomTags(username) : [];
    userCustomTags.forEach(t => {
      tagHtml += `<span class="chat-user-tag-mini">${escapeHtml(t)}</span>`;
    });

    tagsEl.innerHTML = tagHtml;
  }

  const profileBtn = document.getElementById('popoverProfileBtn');
  if (profileBtn) {
    profileBtn.onclick = () => {
      closeUserQuickPopover();
      showUserProfileModal(username);
    };
  }

  if (msgBtn) {
    msgBtn.style.display = isMe ? 'none' : 'flex';
    msgBtn.onclick = () => {
      closeUserQuickPopover();
      initiateChatWith(username);
    };
  }

  if (blockBtn) {
    blockBtn.style.display = isMe ? 'none' : 'flex';
    if (blockText) blockText.textContent = isBlocked ? 'Разблокировать' : 'В чёрный список';
    blockBtn.onclick = () => {
      if (isBlocked) {
        unblockUser(AppState.currentUser, username);
        showNotification('Разблокирован', `Пользователь ${username} удалён из чёрного списка`);
      } else {
        blockUser(AppState.currentUser, username);
        showNotification('Заблокирован', `Пользователь ${username} добавлен в чёрный список`);
      }
      closeUserQuickPopover();
      renderWorldChat();
      updateChatList();
      renderBlacklistSettings();
    };
  }

  const unfriendBtn = document.getElementById('popoverUnfriendBtn');
  if (unfriendBtn) {
    const isFriend = !isMe && typeof areFriends === 'function' && areFriends(AppState.currentUser, username);
    unfriendBtn.style.display = isFriend ? 'flex' : 'none';
    unfriendBtn.onclick = () => {
      closeUserQuickPopover();
      if (typeof handleRemoveFriend === 'function') {
        handleRemoveFriend(username);
      } else if (typeof removeFriend === 'function') {
        removeFriend(AppState.currentUser, username);
        showNotification('Друг удалён', `Пользователь ${username} удален из списка друзей`);
      }
    };
  }

  popover.style.display = 'flex';
}

function closeUserQuickPopover() {
  const popover = document.getElementById('userQuickPopover');
  if (popover) popover.style.display = 'none';
}

// ============================================================
//  7. ЛИЧНЫЕ СООБЩЕНИЯ (DIRECT MESSAGES & FRIENDS)
// ============================================================

function showDirectChatList() {
  isInChat = false;
  AppState.chatPartner = null;
  cancelReply();

  const chatList = document.getElementById('chatList');
  const directRoom = document.getElementById('directChatRoom');
  const chatBackBtn = document.getElementById('chatBackBtn');
  const chatUserName = document.getElementById('chatUserName');
  const chatAvatar = document.getElementById('chatAvatar');
  const chatUserStatus = document.getElementById('chatUserStatus');
  const deleteDirectHeaderBtn = document.getElementById('deleteDirectChatHeaderBtn');

  if (deleteDirectHeaderBtn) deleteDirectHeaderBtn.style.display = 'none';
  if (chatList) chatList.classList.add('open');
  if (directRoom) directRoom.style.display = 'none';
  if (chatBackBtn) chatBackBtn.style.display = 'flex';
  if (chatUserName) chatUserName.textContent = 'Личные сообщения';
  if (chatAvatar) chatAvatar.innerHTML = '<svg class="mini-svg" style="width:20px;height:20px;color:var(--brand-start);"><use href="#icon-chat"/></svg>';
  if (chatUserStatus) chatUserStatus.style.display = 'none';

  updateChatList();
  updateChatBadge();
}

function updateChatBadge() {
  const badge = document.getElementById('chatBadge');
  const directTabBadge = document.getElementById('directTabBadge');
  if (!badge) return;

  const unreadTotal = getTotalUnreadCount(AppState.currentUser);

  if (unreadTotal > 0) {
    badge.style.display = 'flex';
    badge.textContent = unreadTotal > 99 ? '99+' : unreadTotal;
    if (directTabBadge) {
      directTabBadge.style.display = 'inline-block';
      directTabBadge.textContent = unreadTotal;
    }
  } else {
    badge.style.display = 'none';
    badge.textContent = '0';
    if (directTabBadge) directTabBadge.style.display = 'none';
  }
}

function updateChatList() {
  const list = document.getElementById('chatList');
  if (!list) return;

  if (!AppState.currentUser) {
    list.innerHTML = `
      <div class="empty-chats">
        <svg style="width:36px;height:36px;opacity:0.4;margin-bottom:8px;"><use href="#icon-profile"/></svg><br>
        Войдите в аккаунт, чтобы просматривать сообщения и начинать диалоги
      </div>
    `;
    return;
  }

  loadMessages();
  const currentUser = AppState.currentUser;
  const chatKeys = Object.keys(AppState.messages).filter(key => {
    const partner = getChatPartnerFromKey(key, currentUser);
    if (!partner) return false;
    const msgs = getChatMessages(currentUser, partner);
    return msgs.length > 0;
  });

  if (chatKeys.length === 0) {
    list.innerHTML = `
      <div class="empty-chats">
        <svg style="width:36px;height:36px;opacity:0.4;margin-bottom:8px;"><use href="#icon-chat"/></svg><br>
        У вас пока нет личных диалогов.<br>Кликните по игроку в Мировом чате или выберите тиммейта!
      </div>
    `;
    return;
  }

  let html = '';
  const sortedKeys = [...chatKeys].sort((a, b) => {
    const partnerA = getChatPartnerFromKey(a, currentUser);
    const partnerB = getChatPartnerFromKey(b, currentUser);
    const msgsA = getChatMessages(currentUser, partnerA);
    const msgsB = getChatMessages(currentUser, partnerB);
    const timeA = msgsA.length ? msgsA[msgsA.length - 1].time : 0;
    const timeB = msgsB.length ? msgsB[msgsB.length - 1].time : 0;
    return timeB - timeA;
  });

  sortedKeys.forEach(key => {
    const partner = getChatPartnerFromKey(key, currentUser);
    if (!partner) return;
    const msgs = getChatMessages(currentUser, partner);
    const last = msgs[msgs.length - 1];
    const userData = AppState.users[partner];
    const safePartner = escapeHtml(partner);
    const isBlocked = isUserBlocked(currentUser, partner);
    const isOnline = isUserOnline(partner);

    // Проверка статуса набора текста собеседником
    const directMap = (AppState.typingUsers.direct && AppState.typingUsers.direct[key]) || {};
    const partnerTypingTs = directMap[partner];
    const isTyping = partnerTypingTs && (Date.now() - Number(partnerTypingTs)) < 4000;

    let avatarContent;
    if (userData && userData.avatar) {
      avatarContent = `<img src="${userData.avatar}" alt="${safePartner}">`;
    } else {
      const initials = safePartner.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      avatarContent = initials || '?';
    }

    const unreadCount = msgs.filter(m => m.from === partner && !m.read).length;

    let lastText = 'Нет сообщений';
    if (isBlocked) {
      lastText = 'Пользователь в чёрном списке';
    } else if (isTyping) {
      lastText = '<span style="color:#00e5ff;font-weight:600;"><svg class="mini-svg" style="width:12px;height:12px;vertical-align:-1px;margin-right:4px;"><use href="#icon-chat"/></svg>печатает...</span>';
    } else if (last) {
      const isOut = last.from === currentUser;
      const ticks = isOut ? `<span class="list-ticks ${last.read ? 'read' : 'sent'}">${last.read ? '✓✓' : '✓'}</span> ` : '';
      lastText = ticks + formatChatMessage(last.text);
    }

    html += `
      <div class="chat-list-item ${isBlocked ? 'blocked' : ''}" data-partner="${safePartner}">
        <div class="avatar">
          ${avatarContent}
          <span class="online-indicator-dot ${isOnline ? 'online' : 'offline'}"></span>
        </div>
        <div class="chat-item-body">
          <div class="name">
            <span>${safePartner} ${isBlocked ? '<svg class="mini-svg" style="width:13px;height:13px;color:#ff4466;vertical-align:-2px;"><use href="#icon-ban"/></svg>' : ''}</span>
            ${last ? `<span class="chat-list-time">${new Date(last.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>` : ''}
          </div>
          <div class="last-msg">${lastText}</div>
        </div>
        <div class="chat-item-actions">
          ${unreadCount > 0 ? `<span class="unread">${unreadCount}</span>` : ''}
          <button type="button" class="chat-item-delete-btn" data-delete-partner="${safePartner}" title="Удалить переписку">
            <svg><use href="#icon-trash"/></svg>
          </button>
        </div>
      </div>
    `;
  });

  list.innerHTML = html;
  list.querySelectorAll('.chat-list-item').forEach(item => {
    item.addEventListener('click', function(e) {
      // Игнорируем клик, если нажата кнопка удаления
      if (e.target.closest('.chat-item-delete-btn')) return;
      openChatWith(this.dataset.partner);
    });
  });

  list.querySelectorAll('.chat-item-delete-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const partner = this.dataset.deletePartner;
      openDeleteChatModal(partner);
    });
  });
}

function isDmUnlockedForUser(targetUser, currentUsername) {
  if (!targetUser || !currentUsername) return true;
  if (targetUser === currentUsername) return true;
  // Персонал (CEO/модераторы) пишут друг другу свободно
  if (typeof isUserAdmin === 'function' && isUserAdmin(currentUsername)) return true;
  if (typeof isUserCEO === 'function' && isUserCEO(currentUsername)) return true;
  if (typeof isUserModerator === 'function' && isUserModerator(currentUsername)) return true;
  // Друзьям писать бесплатно (обоюдная дружба)
  if (typeof areFriends === 'function' && areFriends(currentUsername, targetUser)) return true;

  const targetData = AppState.users ? AppState.users[targetUser] : null;
  if (!targetData) return true;

  // Платный ЛС доступен ТОЛЬКО для персонала (CEO / Модераторы)
  const isTargetStaff = (typeof isUserCEO === 'function' && isUserCEO(targetUser)) || 
                        (typeof isUserModerator === 'function' && isUserModerator(targetUser)) ||
                        (typeof isUserAdmin === 'function' && isUserAdmin(targetUser));
  if (!isTargetStaff) return true;

  const dmAccess = targetData.privacy?.dmAccess || 'all';
  if (dmAccess !== 'coins' && dmAccess !== 'paid') return true;

  // Проверка: оплачен ли доступ пользователем в профиле целевого стаффа
  const hasPaid = Array.isArray(targetData.paidDmUsers) && targetData.paidDmUsers.includes(currentUsername);

  return !!hasPaid;
}

let pendingPaidDmUser = null;
let pendingPaidDmCost = 50;

function openPaidDmModal(username, cost) {
  pendingPaidDmUser = username;
  pendingPaidDmCost = cost || 50;

  const modal = document.getElementById('paidDmModal');
  const avatarEl = document.getElementById('paidDmAvatar');
  const targetNameEl = document.getElementById('paidDmTargetName');
  const staffRoleEl = document.getElementById('paidDmStaffRole');
  const costAmountEl = document.getElementById('paidDmCostAmount');
  const userBalanceEl = document.getElementById('paidDmUserBalance');
  const confirmBtn = document.getElementById('paidDmConfirmBtn');
  const confirmBtnText = document.getElementById('paidDmConfirmBtnText');
  const topUpBtn = document.getElementById('paidDmTopUpBtn');
  const errorBox = document.getElementById('paidDmErrorBox');

  const targetData = AppState.users ? AppState.users[username] : null;
  const currentUserData = AppState.currentUser && AppState.users ? AppState.users[AppState.currentUser] : null;
  const userCoins = currentUserData && typeof currentUserData.coins === 'number' ? currentUserData.coins : 0;

  if (avatarEl) {
    avatarEl.src = targetData?.avatar || 'img/avatars/user-default.png';
  }
  if (targetNameEl) {
    targetNameEl.textContent = username;
  }
  if (staffRoleEl) {
    if (targetData?.role === 'ceo' || targetData?.role === 'ga') {
      staffRoleEl.textContent = 'CEO';
    } else if (targetData?.role === 'moderator') {
      staffRoleEl.textContent = 'Модератор';
    } else if (targetData?.isAdmin) {
      staffRoleEl.textContent = 'Админ';
    } else {
      staffRoleEl.textContent = 'VIP';
    }
  }

  if (costAmountEl) costAmountEl.textContent = pendingPaidDmCost.toLocaleString('ru-RU');
  if (userBalanceEl) userBalanceEl.textContent = `${userCoins.toLocaleString('ru-RU')} LC`;
  if (confirmBtnText) confirmBtnText.textContent = `Оплатить ${pendingPaidDmCost} LC и открыть чат`;

  const hasEnoughCoins = userCoins >= pendingPaidDmCost;
  if (errorBox) errorBox.style.display = hasEnoughCoins ? 'none' : 'flex';
  if (confirmBtn) confirmBtn.style.display = hasEnoughCoins ? 'inline-flex' : 'none';
  if (topUpBtn) topUpBtn.style.display = hasEnoughCoins ? 'none' : 'inline-flex';

  if (modal) {
    modal.classList.add('show', 'open');
  }
}

function closePaidDmModal() {
  const modal = document.getElementById('paidDmModal');
  if (modal) {
    modal.classList.remove('show', 'open');
  }
  pendingPaidDmUser = null;
}

function confirmPaidDm() {
  if (!pendingPaidDmUser || !AppState.currentUser) return;
  const targetUser = pendingPaidDmUser;
  const targetData = AppState.users[targetUser];
  const currentUserData = AppState.users[AppState.currentUser];

  if (!targetData || !currentUserData) return;

  const cost = Math.max(1, parseInt(targetData?.privacy?.dmCost, 10) || pendingPaidDmCost || 50);
  const userCoins = typeof currentUserData.coins === 'number' ? currentUserData.coins : 0;

  if (userCoins < cost) {
    showNotification('Недостаточно коинов', `Для открытия диалога требуется ${cost} LC. Пополните ваш баланс.`);
    if (typeof openCoinModal === 'function') {
      closePaidDmModal();
      openCoinModal('shop');
    }
    return;
  }

  // Списание у отправителя
  currentUserData.coins = Math.max(0, userCoins - cost);

  // Начисление целевому пользователю (CEO/модератору)
  targetData.coins = (typeof targetData.coins === 'number' ? targetData.coins : 0) + cost;

  // Разблокировка в обоих профилях для надежности
  if (!Array.isArray(targetData.paidDmUsers)) targetData.paidDmUsers = [];
  if (!targetData.paidDmUsers.includes(AppState.currentUser)) {
    targetData.paidDmUsers.push(AppState.currentUser);
  }

  if (!Array.isArray(currentUserData.unlockedDms)) currentUserData.unlockedDms = [];
  if (!currentUserData.unlockedDms.includes(targetUser)) {
    currentUserData.unlockedDms.push(targetUser);
  }

  saveUsers();

  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    FirebaseSync.saveUser(AppState.currentUser, true);
    FirebaseSync.saveUser(targetUser, true);
  }

  if (typeof updateCoinDisplay === 'function') {
    updateCoinDisplay();
  }
  if (typeof renderHeaderProfile === 'function') {
    renderHeaderProfile();
  }

  closePaidDmModal();
  showNotification('Диалог открыт! 💎', `Списано ${cost} LC. Доступ к переписке с ${targetUser} открыт.`);

  const isFriends = areFriends(AppState.currentUser, targetUser);
  const msgs = getChatMessages(AppState.currentUser, targetUser);
  const friendReq = getFriendRequest(AppState.currentUser, targetUser);

  if (msgs.length === 0 && !isFriends && !friendReq) {
    openFirstContactModal(targetUser);
  } else {
    openChatWith(targetUser);
  }
}

function initiateChatWith(targetUser) {
  if (!AppState.currentUser) {
    showNotification('Требуется вход', 'Войдите в аккаунт, чтобы написать игроку');
    showAuthModal('login');
    return;
  }

  if (targetUser === AppState.currentUser) {
    showNotification('Ошибка', 'Вы не можете написать самому себе');
    return;
  }

  if (isUserBlocked(AppState.currentUser, targetUser)) {
    showNotification('В чёрном списке', 'Вы заблокировали этого пользователя. Разблокируйте его для переписки.');
    return;
  }

  if (isBlockedBy(AppState.currentUser, targetUser)) {
    showNotification('Доступ ограничен', 'Пользователь ограничил возможность писать ему');
    return;
  }

  const targetData = AppState.users[targetUser];
  const targetDmAccess = targetData?.privacy?.dmAccess || 'all';
  const isFriends = areFriends(AppState.currentUser, targetUser);

  // ПЛАТНЫЙ ДОСТУП В ЛС ДЛЯ CEO И МОДЕРАЦИИ
  if (targetDmAccess === 'coins' && typeof isDmUnlockedForUser === 'function' && !isDmUnlockedForUser(targetUser, AppState.currentUser)) {
    const cost = Math.max(1, parseInt(targetData?.privacy?.dmCost, 10) || 50);
    openPaidDmModal(targetUser, cost);
    return;
  }

  if (targetDmAccess === 'friends' && !isFriends) {
    showNotification('Приватный профиль', 'Этот пользователь принимает сообщения только от друзей. Отправьте заявку!');
  }

  const msgs = getChatMessages(AppState.currentUser, targetUser);
  const friendReq = getFriendRequest(AppState.currentUser, targetUser);

  if (msgs.length === 0 && !isFriends && !friendReq) {
    openFirstContactModal(targetUser);
  } else {
    openChatWith(targetUser);
  }
}

// ============================================================
//  8. МОДАЛКА ПЕРВОГО КОНТАКТА (FIRST CONTACT)
// ============================================================

let pendingFirstContactUser = null;

function openFirstContactModal(username) {
  pendingFirstContactUser = username;
  const modal = document.getElementById('firstContactModal');
  const sub = document.getElementById('firstContactSub');
  const input = document.getElementById('firstContactMessageInput');

  if (sub) sub.textContent = `Отправка первого сообщения и заявки в друзья пользователю ${username}`;
    if (input) input.value = 'Привет! Давай сыграем вместе';

  if (modal) {
    modal.classList.add('show', 'open');
  }
  if (input) setTimeout(() => input.focus(), 60);
}

function closeFirstContactModal() {
  const modal = document.getElementById('firstContactModal');
  if (modal) {
    modal.classList.remove('show', 'open');
  }
  pendingFirstContactUser = null;
}

function submitFirstContact() {
  if (!pendingFirstContactUser || !AppState.currentUser) return;

  const target = pendingFirstContactUser;
  const targetData = AppState.users ? AppState.users[target] : null;
  const targetDmAccess = targetData?.privacy?.dmAccess || 'all';

  if (targetDmAccess === 'coins' && typeof isDmUnlockedForUser === 'function' && !isDmUnlockedForUser(target, AppState.currentUser)) {
    const cost = Math.max(1, parseInt(targetData?.privacy?.dmCost, 10) || 50);
    closeFirstContactModal();
    openPaidDmModal(target, cost);
    return;
  }

  if (typeof SecurityShield !== 'undefined' && !SecurityShield.checkRateLimit('chat')) {
    return;
  }

  const input = document.getElementById('firstContactMessageInput');
  const rawText = input ? input.value.trim() : 'Привет! Давай затимимся!';
  const text = typeof SecurityShield !== 'undefined' ? SecurityShield.sanitizeText(rawText, 500) : rawText;

  closeFirstContactModal();

  try {
    // Отправляем первое сообщение в ЛС
    addMessage(AppState.currentUser, target, text);
    // Отправляем заявку в друзья
    sendFriendRequest(AppState.currentUser, target, text);
    showNotification('Заявка отправлена', `Сообщение и заявка в друзья отправлены ${target}`);
    // Открываем комнату чата
    openChatWith(target);
  } catch (err) {
    showNotification('Ошибка отправки', err.message || 'Не удалось отправить сообщение');
  }
}

// ============================================================
//  9. КОМНАТА ДИАЛОГА (DIRECT CHAT ROOM)
// ============================================================

function openChatWith(username) {
  if (!AppState.currentUser) return;
  if (!username || username === AppState.currentUser) return;

  const avatarDropdown = document.getElementById('avatarDropdown');
  if (avatarDropdown) avatarDropdown.classList.remove('open');
  if (typeof closeCoinModal === 'function') closeCoinModal();
  if (typeof closeShopItemPreview === 'function') closeShopItemPreview();

  // ПЛАТНЫЙ ДОСТУП В ЛС ДЛЯ CEO И МОДЕРАЦИИ
  const targetData = AppState.users ? AppState.users[username] : null;
  const targetDmAccess = targetData?.privacy?.dmAccess || 'all';
  if (targetDmAccess === 'coins' && typeof isDmUnlockedForUser === 'function' && !isDmUnlockedForUser(username, AppState.currentUser)) {
    const cost = Math.max(1, parseInt(targetData?.privacy?.dmCost, 10) || 50);
    openPaidDmModal(username, cost);
    return;
  }

  AppState.chatPartner = username;
  isInChat = true;
  AppState.activeChatTab = 'direct';
  cancelReply('direct');

  const container = document.getElementById('chatContainer');
  if (!container.classList.contains('open')) {
    container.classList.remove('closing');
    container.classList.add('open');
    isChatOpen = true;
  }

  const tabWorld = document.getElementById('chatTabWorld');
  const tabDirect = document.getElementById('chatTabDirect');
  const worldView = document.getElementById('worldChatView');
  const directView = document.getElementById('directChatView');

  if (tabWorld) tabWorld.classList.remove('active');
  if (tabDirect) tabDirect.classList.add('active');

  if (worldView) {
    worldView.style.display = 'none';
    worldView.classList.remove('active');
  }
  if (directView) {
    directView.style.display = 'flex';
    directView.classList.add('active');
  }

  const chatList = document.getElementById('chatList');
  const directRoom = document.getElementById('directChatRoom');
  const chatBackBtn = document.getElementById('chatBackBtn');
  const chatUserName = document.getElementById('chatUserName');
  const chatAvatar = document.getElementById('chatAvatar');
  const chatUserStatus = document.getElementById('chatUserStatus');
  const deleteDirectHeaderBtn = document.getElementById('deleteDirectChatHeaderBtn');

  if (chatList) chatList.classList.remove('open');
  if (directRoom) directRoom.style.display = 'flex';
  if (chatBackBtn) chatBackBtn.style.display = 'inline-flex';
  if (deleteDirectHeaderBtn) deleteDirectHeaderBtn.style.display = 'inline-flex';
  const userData = AppState.users[username];
  const isOnline = isUserOnline(username);
  const isPremium = isUserPremium(username);
  const adminBadge = typeof getUserAdminBadge === 'function' ? getUserAdminBadge(username) : null;
  const adminBadgeHtml = adminBadge ? `<span class="admin-custom-badge badge-style-${adminBadge.style} chat-header-admin-badge" title="Сотрудник Lobbivo: ${escapeHtml(adminBadge.text)}"><svg style="width:10px;height:10px;"><use href="#${adminBadge.icon}"/></svg><span>${escapeHtml(adminBadge.text)}</span></span>` : '';
  const crownHtml = isPremium ? '<span class="premium-crown-badge mini" title="Lobbivo Premium"><svg><use href="#icon-crown"/></svg></span>' : '';
  const frameId = getUserEquippedFrame(username);

  if (chatUserName) {
    chatUserName.innerHTML = `<span class="${getUserNameClass(username)} chat-username-text">${escapeHtml(username)}</span>${crownHtml}${adminBadgeHtml}`;
  }

  if (chatUserStatus) {
    chatUserStatus.style.display = 'block';
    chatUserStatus.className = 'chat-header-status ' + (isOnline ? 'online' : 'offline');
    chatUserStatus.textContent = formatLastSeen(userData ? userData.lastSeen : null, username);
  }

  let avatarInner = '';
  if (userData && userData.avatar) {
    avatarInner = `<img src="${userData.avatar}" alt="${escapeHtml(username)}">`;
  } else {
    const initials = username.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    avatarInner = `<span>${initials || '?'}</span>`;
  }

  if (frameId && frameId !== 'none') {
    avatarInner = `<div class="avatar-frame-wrap frame-${frameId}">${avatarInner}</div>`;
  }

  if (chatAvatar) {
    chatAvatar.innerHTML = avatarInner;
    chatAvatar.title = `Нажмите, чтобы посмотреть профиль ${username}`;
  }
  if (chatUserName) {
    chatUserName.title = `Нажмите, чтобы посмотреть профиль ${username}`;
  }

  // Мгновенно помечаем сообщения как прочитанные (исправление бага со счетчиком)
  markMessagesAsRead(AppState.currentUser, username);
  
  // Проверяем статус заявки в друзья и блокировки
  checkFriendBannerStatus(username);

  // Отрисовываем историю сообщений
  renderChatMessages();
  updateChatBadge();

  // Фиксируем контакт для Lobbivo Coin
  const currentUserData = AppState.users[AppState.currentUser];
  if (currentUserData) {
    if (!Array.isArray(currentUserData.contactedTeammates)) currentUserData.contactedTeammates = [];
    if (!currentUserData.contactedTeammates.includes(username)) {
      currentUserData.contactedTeammates.push(username);
      saveUsers();
    }
  }

  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    setTimeout(() => {
      chatInput.focus();
    }, 60);
  }
}

function checkFriendBannerStatus(partner) {
  const banner = document.getElementById('chatFriendRequestBanner');
  const bannerTitle = document.getElementById('friendBannerTitle');
  const bannerSub = document.getElementById('friendBannerSub');
  const inputArea = document.getElementById('chatInputArea');
  const lockedNotice = document.getElementById('chatLockedNotice');
  const lockedText = document.getElementById('chatLockedNoticeText');

  if (!banner || !inputArea || !lockedNotice) return;

  const isFriends = areFriends(AppState.currentUser, partner);
  const isBlocked = isUserBlocked(AppState.currentUser, partner) || isBlockedBy(AppState.currentUser, partner);

  if (isBlocked) {
    banner.style.display = 'none';
    inputArea.style.display = 'none';
    lockedNotice.style.display = 'block';
    if (lockedText) lockedText.innerHTML = '<svg class="mini-svg" style="width:14px;height:14px;color:#ff4466;vertical-align:-2px;margin-right:4px;"><use href="#icon-ban"/></svg> Переписка заблокирована';
    return;
  }

  const targetData = AppState.users ? AppState.users[partner] : null;
  const targetDmAccess = targetData?.privacy?.dmAccess || 'all';

  // ПЛАТНЫЙ ДОСТУП К ДИАЛОГУ (ДЛЯ CEO / МОДЕРАТОРОВ)
  if (targetDmAccess === 'coins' && typeof isDmUnlockedForUser === 'function' && !isDmUnlockedForUser(partner, AppState.currentUser)) {
    const cost = Math.max(1, parseInt(targetData?.privacy?.dmCost, 10) || 50);
    banner.style.display = 'none';
    inputArea.style.display = 'none';
    lockedNotice.style.display = 'block';
    if (lockedText) {
      lockedText.innerHTML = `<svg class="mini-svg" style="width:14px;height:14px;color:#ffd700;vertical-align:-2px;margin-right:4px;"><use href="#icon-coins"/></svg> Платный доступ к диалогу (${cost} LC). <a href="javascript:void(0)" onclick="openPaidDmModal('${escapeHtml(partner)}', ${cost})" style="color:#7289da;text-decoration:underline;font-weight:600;margin-left:4px;">Оплатить</a>`;
    }
    return;
  }

  const req = getFriendRequest(AppState.currentUser, partner);

  if (isFriends || (req && req.status === 'accepted')) {
    banner.style.display = 'none';
    inputArea.style.display = 'flex';
    lockedNotice.style.display = 'none';
    return;
  }

  // Если у нас висит входящая заявка от собеседника:
  if (req && req.status === 'pending' && req.from === partner && req.to === AppState.currentUser) {
    banner.style.display = 'flex';
    if (bannerTitle) bannerTitle.textContent = `Заявка в друзья от ${partner}`;
    if (bannerSub) bannerSub.textContent = req.message ? `«${escapeHtml(req.message)}»` : 'Хочет играть в пати';
    inputArea.style.display = 'flex';
    lockedNotice.style.display = 'none';
    return;
  }

  // Если мы отправили заявку и она ожидает подтверждения:
  if (req && req.status === 'pending' && req.from === AppState.currentUser && req.to === partner) {
    banner.style.display = 'none';
    inputArea.style.display = 'none';
    lockedNotice.style.display = 'block';
    if (lockedText) lockedText.innerHTML = '<svg class="mini-svg" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"><use href="#icon-clock"/></svg> Заявка отправлена. Ожидание подтверждения...';
    return;
  }

  // Дефолтное состояние
  banner.style.display = 'none';
  inputArea.style.display = 'flex';
  lockedNotice.style.display = 'none';
}

function handleAcceptFriendReq() {
  if (!AppState.chatPartner || !AppState.currentUser) return;
  const partner = AppState.chatPartner;

  acceptFriendRequest(AppState.currentUser, partner);
  showNotification('Дружба принята', `Вы и ${partner} теперь друзья!`);
  
  checkFriendBannerStatus(partner);
  renderChatMessages();
}

function handleDeclineFriendReq() {
  if (!AppState.chatPartner || !AppState.currentUser) return;
  const partner = AppState.chatPartner;

  declineFriendRequest(AppState.currentUser, partner);
  showNotification('Заявка отклонена', `Заявка от ${partner} отклонена`);
  
  checkFriendBannerStatus(partner);
}

function renderChatMessages() {
  if (!AppState.chatPartner || !AppState.currentUser) return;
  loadMessages();

  // При рендере открытого диалога всегда сбрасываем непрочитанные входящие
  markMessagesAsRead(AppState.currentUser, AppState.chatPartner);
  updateChatBadge();

  const msgs = getChatMessages(AppState.currentUser, AppState.chatPartner);
  const container = document.getElementById('chatMessages');
  if (!container) return;

  if (msgs.length === 0) {
    container.innerHTML = `
      <div class="chat-greeting">
        Это начало вашей переписки с <strong>${escapeHtml(AppState.chatPartner)}</strong>.<br>
        Предложите сыграть вместе или созвониться в войсе!
      </div>
    `;
    updateChatMuteUI();
    return;
  }

  const isCurrentAdmin = typeof isUserAdmin === 'function' && isUserAdmin(AppState.currentUser);

  container.innerHTML = msgs.map(msg => {
    const isOut = msg.from === AppState.currentUser;
    const safeText = formatChatMessage(msg.text);
    const msgId = escapeHtml(msg.id || '');
    const safeFrom = escapeHtml(msg.from);
    const timeStr = new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Рендеринг цитаты ответа (если есть)
    let replyQuoteHtml = '';
    if (msg.replyTo && msg.replyTo.author) {
      replyQuoteHtml = `
        <div class="msg-reply-quote" onclick="highlightChatMessage('${escapeHtml(msg.replyTo.id)}')">
          <div class="reply-quote-bar"></div>
          <div class="reply-quote-content">
            <span class="reply-quote-author">${escapeHtml(msg.replyTo.author)}</span>
            <span class="reply-quote-text">${escapeHtml(msg.replyTo.text)}</span>
          </div>
        </div>
      `;
    }

    // Галочки прочитанности (как в Telegram)
    const ticksHtml = isOut ? `
      <span class="msg-status-ticks ${msg.read ? 'read' : 'sent'}" title="${msg.read ? 'Прочитано' : 'Отправлено'}">
        ${msg.read ? '✓✓' : '✓'}
      </span>
    ` : '';

    // Кнопки действий над сообщением
    const actionsHtml = `
      <div class="msg-actions-bar">
        <button type="button" class="btn-msg-reply" data-msg-id="${msgId}" data-author="${safeFrom}" data-text="${escapeHtml(msg.text)}" data-scope="direct" title="Ответить">
          <svg><use href="#icon-back"/></svg>
        </button>
        ${isCurrentAdmin ? `
          <button type="button" class="btn-msg-admin btn-msg-mute" data-author="${safeFrom}" title="Замьютить ${safeFrom}">
            <svg><use href="#icon-mute"/></svg>
          </button>
          <button type="button" class="btn-msg-admin btn-msg-del" data-msg-id="${msgId}" data-scope="direct" title="Удалить сообщение">
            <svg><use href="#icon-trash"/></svg>
          </button>
        ` : ''}
      </div>
    `;

    return `
      <div class="msg ${isOut ? 'out' : 'in'}" id="${msgId}" data-msg-id="${msgId}">
        ${actionsHtml}
        ${!isOut ? `<span class="sender ${getUserNameClass(safeFrom)}" data-username="${safeFrom}" style="cursor:pointer;" title="Нажмите, чтобы посмотреть профиль ${safeFrom}">${safeFrom}</span>` : ''}
        ${replyQuoteHtml}
        <div class="msg-text">${safeText}</div>
        <div class="msg-meta">
          <span class="time">${timeStr}</span>
          ${ticksHtml}
        </div>
      </div>
    `;
  }).join('');
  container.scrollTop = container.scrollHeight;

  // Делегирование событий на контейнер ЛС (добавляется единожды)
  if (!container._delegatedEventsBound) {
    container._delegatedEventsBound = true;
    container.addEventListener('click', (e) => {
      const replyBtn = e.target.closest('.btn-msg-reply[data-scope="direct"]');
      if (replyBtn) {
        e.stopPropagation();
        setReplyTo(replyBtn.dataset.msgId, replyBtn.dataset.author, replyBtn.dataset.text, 'direct');
        return;
      }

      const delBtn = e.target.closest('.btn-msg-del[data-scope="direct"]');
      if (delBtn) {
        e.stopPropagation();
        const msgId = delBtn.dataset.msgId;
        if (confirm('Удалить это сообщение из диалога?')) {
          if (AppState.chatPartner && AppState.currentUser) {
            const key = getMessagesKey(AppState.currentUser, AppState.chatPartner);
            if (AppState.messages[key]) {
              AppState.messages[key] = AppState.messages[key].filter(m => m.id !== msgId);
              saveMessages();
              renderChatMessages();
              showNotification('Сообщение удалено', 'Сообщение удалено из диалога');
            }
          }
        }
        return;
      }

      const muteBtn = e.target.closest('.btn-msg-mute');
      if (muteBtn) {
        e.stopPropagation();
        const author = muteBtn.dataset.author;
        if (typeof openMuteModal === 'function') {
          openMuteModal(author);
        }
        return;
      }

      const userEl = e.target.closest('.sender[data-username]');
      if (userEl) {
        e.stopPropagation();
        openUserQuickPopover(userEl.dataset.username);
        return;
      }
    });
  }

  renderDirectTypingIndicator();
  updateChatMuteUI();
  container.scrollTop = container.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  if (!input) return;

  const rawText = input.value.trim();
  if (!rawText) return;

  if (typeof SecurityShield !== 'undefined' && !SecurityShield.checkRateLimit('chat')) {
    return;
  }

  if (!AppState.currentUser) {
    showNotification('Требуется вход', 'Войдите в аккаунт, чтобы отправлять сообщения');
    showAuthModal('login');
    return;
  }

  if (typeof isUserMuted === 'function' && isUserMuted(AppState.currentUser)) {
    const muteInfo = getMuteInfo(AppState.currentUser);
    showNotification('Чат заблокирован', `Вы не можете отправлять сообщения: ${muteInfo?.muteReason || 'Мут'} (${muteInfo?.remainingFormatted || ''})`);
    return;
  }

  if (typeof isUserBanned === 'function' && isUserBanned(AppState.currentUser)) {
    showNotification('Аккаунт заблокирован', 'Ваш аккаунт заблокирован');
    return;
  }

  if (!AppState.chatPartner) {
    showNotification('Ошибка', 'Выберите собеседника для отправки сообщения');
    return;
  }

  const partner = AppState.chatPartner;
  if (isUserBlocked(AppState.currentUser, partner)) {
    showNotification('Ошибка', 'Вы заблокировали этого пользователя');
    return;
  }

  // ПЛАТНЫЙ ДОСТУП В ЛС ДЛЯ CEO И МОДЕРАЦИИ
  const targetData = AppState.users ? AppState.users[partner] : null;
  const targetDmAccess = targetData?.privacy?.dmAccess || 'all';
  if (targetDmAccess === 'coins' && typeof isDmUnlockedForUser === 'function' && !isDmUnlockedForUser(partner, AppState.currentUser)) {
    const cost = Math.max(1, parseInt(targetData?.privacy?.dmCost, 10) || 50);
    showNotification('Платный доступ', `Для отправки сообщений необходимо оплатить доступ (${cost} LC)`);
    openPaidDmModal(partner, cost);
    return;
  }

  const replyTo = (AppState.activeReply && AppState.activeReply.chatType === 'direct') ? AppState.activeReply : null;
  const text = typeof SecurityShield !== 'undefined' ? SecurityShield.sanitizeText(rawText, 500) : rawText;

  try {
    addMessage(AppState.currentUser, partner, text, replyTo);
  } catch (err) {
    showNotification('Ошибка отправки', err.message || 'Не удалось отправить сообщение');
    return;
  }

  input.value = '';
  cancelReply('direct');

  if (typeof RetentionEngine !== 'undefined') {
    RetentionEngine.playSound('message');
    RetentionEngine.haptic('light');
  }

  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    const key = getMessagesKey(AppState.currentUser, partner);
    FirebaseSync.setTyping('direct', key, AppState.currentUser, false);
  }

  const isFriends = areFriends(AppState.currentUser, partner);
  const req = getFriendRequest(AppState.currentUser, partner);
  if (!isFriends && !req) {
    sendFriendRequest(AppState.currentUser, partner, text);
  }

  checkFriendBannerStatus(partner);
  renderChatMessages();
  updateChatList();
  updateChatBadge();
}

// ============================================================
//  ИНДИКАТОР И БЛОКИРОВКА ЧАТА ПРИ МУТЕ (MUTE SYSTEM)
// ============================================================

let chatMuteInterval = null;

function updateChatMuteUI() {
  const current = AppState.currentUser;
  const isMuted = current && typeof isUserMuted === 'function' && isUserMuted(current);
  const muteInfo = isMuted ? getMuteInfo(current) : null;

  const worldInput = document.getElementById('worldChatInput');
  const worldSendBtn = document.getElementById('worldChatSendBtn');
  const worldArea = document.getElementById('worldChatInputArea');

  const directInput = document.getElementById('chatInput');
  const directSendBtn = document.getElementById('chatSendBtn');
  const directArea = document.getElementById('chatInputArea');

  // Убираем старый баннер мута если был
  document.querySelectorAll('.chat-mute-banner').forEach(el => el.remove());

  if (isMuted && muteInfo) {
    if (worldInput) {
      worldInput.disabled = true;
      worldInput.placeholder = 'Чат заблокирован';
    }
    if (worldSendBtn) worldSendBtn.disabled = true;

    if (directInput) {
      directInput.disabled = true;
      directInput.placeholder = 'Чат заблокирован';
    }
    if (directSendBtn) directSendBtn.disabled = true;

    const bannerHtml = `
      <div class="chat-mute-banner">
        <span class="mute-banner-icon"><svg class="mini-svg" style="width:16px;height:16px;color:#f59e0b;"><use href="#icon-mute"/></svg></span>
        <div class="mute-banner-text">
          <span class="mute-banner-title">Блокировка чата:</span> ${escapeHtml(muteInfo.muteReason)}
          <span class="mute-banner-timer"><svg class="mini-svg" style="width:12px;height:12px;vertical-align:-1px;margin-right:3px;"><use href="#icon-clock"/></svg>Осталось: <strong class="mute-timer-val">${muteInfo.remainingFormatted}</strong></span>
        </div>
      </div>
    `;

    if (worldArea) {
      worldArea.insertAdjacentHTML('beforebegin', bannerHtml);
    }
    if (directArea) {
      directArea.insertAdjacentHTML('beforebegin', bannerHtml);
    }

    if (!chatMuteInterval) {
      chatMuteInterval = setInterval(() => {
        if (!AppState.currentUser || !isUserMuted(AppState.currentUser)) {
          clearInterval(chatMuteInterval);
          chatMuteInterval = null;
          updateChatMuteUI();
          showNotification('Чат разблокирован', 'Срок блокировки истёк, вы снова можете общаться');
          return;
        }
        const info = getMuteInfo(AppState.currentUser);
        if (info) {
          document.querySelectorAll('.mute-timer-val').forEach(el => {
            el.textContent = info.remainingFormatted;
          });
        }
      }, 1000);
    }
  } else {
    if (chatMuteInterval) {
      clearInterval(chatMuteInterval);
      chatMuteInterval = null;
    }
    if (worldInput) {
      worldInput.disabled = false;
      worldInput.placeholder = 'Сообщение в мировой чат...';
    }
    if (worldSendBtn) worldSendBtn.disabled = false;

    if (directInput) {
      directInput.disabled = false;
      directInput.placeholder = 'Напишите сообщение...';
    }
    if (directSendBtn) directSendBtn.disabled = false;
  }
}

// ============================================================
//  10. НАСТРОЙКИ ПРИВАТНОСТИ И ЧЁРНЫЙ СПИСОК (SETTINGS INTEGRATION)
// ============================================================

function renderPrivacySettings() {
  if (!AppState.currentUser) return;
  const user = AppState.users[AppState.currentUser];
  if (!user) return;

  const isStaff = (typeof isUserCEO === 'function' && isUserCEO(AppState.currentUser)) ||
                  (typeof isUserModerator === 'function' && isUserModerator(AppState.currentUser)) ||
                  (typeof isUserAdmin === 'function' && isUserAdmin(AppState.currentUser));

  let access = user.privacy?.dmAccess || 'all';

  // Если у обычного пользователя или VIP стояло 'coins', сбрасываем на 'all'
  if (!isStaff && access === 'coins') {
    access = 'all';
    if (!user.privacy) user.privacy = {};
    user.privacy.dmAccess = 'all';
    saveUsers();
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
      FirebaseSync.saveUser(AppState.currentUser, user);
    }
  }

  const radioAll = document.getElementById('privacyDmAll');
  const radioFriends = document.getElementById('privacyDmFriends');
  const radioCoins = document.getElementById('privacyDmCoins');
  const coinsItem = document.getElementById('privacyDmCoinsItem');
  const costBlock = document.getElementById('dmCoinsCostBlock');
  const costInput = document.getElementById('dmCoinsCostInput');

  if (radioAll) radioAll.checked = access === 'all';
  if (radioFriends) radioFriends.checked = access === 'friends';
  if (radioCoins) radioCoins.checked = access === 'coins';

  if (coinsItem) {
    coinsItem.style.display = isStaff ? 'flex' : 'none';
  }
  if (costBlock) {
    costBlock.style.display = (isStaff && access === 'coins') ? 'block' : 'none';
  }
  if (costInput) {
    costInput.value = user.privacy?.dmCost || 50;
  }

  const censorshipToggle = document.getElementById('chatCensorshipToggle');
  if (censorshipToggle) {
    censorshipToggle.checked = AppState.chatCensorship !== false;
  }

  updatePushSettingsUI();
}

// ============================================================
//  11. СИСТЕМА PUSH-УВЕДОМЛЕНИЙ (WEB & MOBILE PUSH ENGINE)
// ============================================================

function isPushNotificationEnabled() {
  if (!AppState.currentUser) return false;
  const user = AppState.users[AppState.currentUser];
  if (!user) return false;
  // По умолчанию включено если разрешено в браузере
  if (user.settings?.pushEnabled !== undefined) {
    return !!user.settings.pushEnabled;
  }
  return true;
}

function setPushNotificationEnabled(enabled) {
  if (!AppState.currentUser || !AppState.users[AppState.currentUser]) return;
  if (!AppState.users[AppState.currentUser].settings) {
    AppState.users[AppState.currentUser].settings = {};
  }
  AppState.users[AppState.currentUser].settings.pushEnabled = !!enabled;
  saveUsers();
  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    FirebaseSync.saveUser(AppState.currentUser, AppState.users[AppState.currentUser]);
  }
  updatePushSettingsUI();
}

function updatePushSettingsUI() {
  const toggle = document.getElementById('pushNotifToggle');
  const statusDot = document.getElementById('pushStatusDot');
  const statusText = document.getElementById('pushStatusText');

  const enabled = isPushNotificationEnabled();
  if (toggle) toggle.checked = enabled;

  if (!('Notification' in window)) {
    if (statusDot) {
      statusDot.className = 'push-status-dot denied';
    }
    if (statusText) {
      statusText.textContent = 'Push-уведомления не поддерживаются вашим браузером';
    }
    return;
  }

  const perm = Notification.permission;
  if (perm === 'granted') {
    if (statusDot) statusDot.className = 'push-status-dot granted';
    if (statusText) {
      statusText.textContent = enabled 
        ? 'Уведомления активны (Разрешено в браузере)' 
        : 'Уведомления отключены в настройках Lobbivo';
    }
  } else if (perm === 'denied') {
    if (statusDot) statusDot.className = 'push-status-dot denied';
    if (statusText) {
      statusText.textContent = 'Доступ запрещён в браузере (Включите в настройках сайта)';
    }
  } else {
    if (statusDot) statusDot.className = 'push-status-dot default';
    if (statusText) {
      statusText.textContent = 'Требуется разрешение браузера';
    }
  }
}

function requestPushNotificationPermission() {
  if (!('Notification' in window)) {
    showNotification('Не поддерживается', 'Ваш браузер не поддерживает Push-уведомления');
    return Promise.resolve('unsupported');
  }

  return Notification.requestPermission().then(permission => {
    updatePushSettingsUI();
    if (permission === 'granted') {
      setPushNotificationEnabled(true);
      showNotification('Push включены', 'Вы будете получать уведомления о сообщениях в ЛС');
      sendWebPushNotification('LOBBIVO Platform', 'Push-уведомления успешно активированы! Теперь вы не пропустите сообщение тиммейта.', { isTest: true });
    } else if (permission === 'denied') {
      showNotification('Доступ запрещён', 'Разрешите уведомления для этого сайта в настройках браузера');
    }
    return permission;
  });
}

function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1318.5, ctx.currentTime + 0.08); // E6

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.33);
  } catch (e) {}
}

function sendWebPushNotification(sender, text, options = {}) {
  // Проверяем включены ли пуши
  if (!options.isTest && !isPushNotificationEnabled()) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  playNotificationSound();

  try {
    const title = options.isTest ? sender : `LOBBIVO · Сообщение от ${sender}`;
    const cleanText = (text || '').replace(/<[^>]*>?/gm, '');
    const bodyText = cleanText.length > 90 ? cleanText.substring(0, 90) + '...' : (cleanText || 'Вам пришло новое сообщение');

    const notifPayload = {
      body: bodyText,
      icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" stop-color="%2300d4ff"/%3E%3Cstop offset="50%25" stop-color="%23b44dff"/%3E%3Cstop offset="100%25" stop-color="%23ff44cc"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="100" height="100" rx="24" fill="url(%23g)"/%3E%3Ctext x="50" y="70" font-family="sans-serif" font-weight="900" font-size="60" fill="%23ffffff" text-anchor="middle"%3EL%3C/text%3E%3C/svg%3E',
      badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" rx="24" fill="%2300d4ff"/%3E%3Ctext x="50" y="70" font-family="sans-serif" font-weight="900" font-size="60" fill="%23ffffff" text-anchor="middle"%3EL%3C/text%3E%3C/svg%3E',
      tag: `lobbivo-msg-${sender}`,
      renotify: true,
      silent: false,
      vibrate: [250, 100, 250, 100, 250],
      data: {
        sender: sender,
        url: window.location.origin + window.location.pathname + `?chat=${encodeURIComponent(sender)}`
      }
    };

    // 1. Попытка отправки через Service Worker (работает в фоне, на заблокированном экране и мобильных)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, notifPayload).catch(() => {
          triggerStandardNotification(title, notifPayload, sender, options);
        });
      }).catch(() => {
        triggerStandardNotification(title, notifPayload, sender, options);
      });
    } else {
      triggerStandardNotification(title, notifPayload, sender, options);
    }
  } catch (err) {
    console.warn('Push notification delivery error:', err);
  }
}

function triggerStandardNotification(title, notifPayload, sender, options) {
  try {
    const notif = new Notification(title, notifPayload);
    notif.onclick = function() {
      window.focus();
      if (!options.isTest) {
        if (typeof openChat === 'function') openChat();
        if (typeof openDirectChat === 'function') openDirectChat(sender);
      }
      this.close();
    };
  } catch (err) {
    console.warn('Standard Notification fallback error:', err);
  }
}

function renderBlacklistSettings() {
  const container = document.getElementById('blacklistContainer');
  const empty = document.getElementById('blacklistEmpty');
  const grid = document.getElementById('blacklistItemsGrid');
  if (!container || !grid) return;

  if (!AppState.currentUser) {
    if (empty) {
      empty.style.display = 'block';
      empty.textContent = 'Войдите в аккаунт для управления чёрным списком';
    }
    grid.innerHTML = '';
    return;
  }

  const user = AppState.users[AppState.currentUser];
  const blocked = user && Array.isArray(user.blockedUsers) ? user.blockedUsers : [];

  if (blocked.length === 0) {
    if (empty) {
      empty.style.display = 'block';
      empty.textContent = 'В чёрном списке пока никого нет';
    }
    grid.innerHTML = '';
    return;
  }

  if (empty) empty.style.display = 'none';

  grid.innerHTML = blocked.map(name => {
    const safeName = escapeHtml(name);
    return `
      <div class="blacklist-item">
        <div class="blacklist-user-info">
          <div class="blacklist-avatar"><svg class="mini-svg" style="width:16px;height:16px;color:#ff4466;"><use href="#icon-ban"/></svg></div>
          <div class="blacklist-name">${safeName}</div>
        </div>
        <button type="button" class="btn-unblock" data-unblock="${safeName}">Разблокировать</button>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.btn-unblock').forEach(btn => {
    btn.addEventListener('click', function() {
      const target = this.dataset.unblock;
      unblockUser(AppState.currentUser, target);
      showNotification('Разблокирован', `${target} удалён из чёрного списка`);
      renderBlacklistSettings();
      renderWorldChat();
      updateChatList();
    });
  });
}

// ============================================================
//  12. УДАЛЕНИЕ ДИАЛОГА (DELETE CHAT MODAL - TELEGRAM STYLE)
// ============================================================

let pendingDeleteChatPartner = null;

function openDeleteChatModal(partner) {
  if (!partner) return;
  pendingDeleteChatPartner = partner;
  const modal = document.getElementById('deleteChatModal');
  const partnerNameEl = document.getElementById('deleteChatPartnerName');
  const forBothPartnerNameEl = document.getElementById('deleteForBothPartnerName');
  const checkbox = document.getElementById('deleteForBothCheckbox');
  const subEl = document.getElementById('deleteChatModalSub');

  if (partnerNameEl) partnerNameEl.textContent = partner;
  if (forBothPartnerNameEl) forBothPartnerNameEl.textContent = partner;
  if (subEl) subEl.textContent = `Удаление переписки с ${partner}`;
  if (checkbox) checkbox.checked = false;

  if (modal) {
    modal.classList.add('show', 'open');
  }
}

function closeDeleteChatModal() {
  const modal = document.getElementById('deleteChatModal');
  if (modal) {
    modal.classList.remove('show', 'open');
  }
  pendingDeleteChatPartner = null;
}

function confirmDeleteChat() {
  if (!pendingDeleteChatPartner || !AppState.currentUser) {
    closeDeleteChatModal();
    return;
  }

  const partner = pendingDeleteChatPartner;
  const checkbox = document.getElementById('deleteForBothCheckbox');
  const deleteForBoth = checkbox ? checkbox.checked : false;

  if (deleteForBoth) {
    deleteChatForBoth(AppState.currentUser, partner);
  } else {
    deleteChatForSelf(AppState.currentUser, partner);
  }

  closeDeleteChatModal();

  // Если был открыт диалог с этим собеседником — возвращаемся в список диалогов
  if (AppState.chatPartner === partner) {
    showDirectChatList();
  } else {
    updateChatList();
    updateChatBadge();
  }

  showNotification('Чат удалён', deleteForBoth 
    ? `Переписка с ${partner} удалена для обоих участников` 
    : `Переписка с ${partner} удалена`);
}

function openDirectChat(username) {
  openChatWith(username);
}

// Экспорт в глобальную область видимости
window.openDeleteChatModal = openDeleteChatModal;
window.closeDeleteChatModal = closeDeleteChatModal;
window.confirmDeleteChat = confirmDeleteChat;
window.openDirectChat = openDirectChat;