// ============================================================
//  ЧАТ LOBBIVO 2.0 (WORLD & DIRECT CHAT SYSTEM - TELEGRAM STYLE)
// ============================================================

let isChatOpen = false;
let isInChat = false;

// ============================================================
//  1. ФОРМАТИРОВАНИЕ СООБЩЕНИЙ И ПАСХАЛКИ
// ============================================================

// Форматирование текста сообщений и радужная пасхалка для слова "гей" / "gay"
function formatChatMessage(rawText) {
  if (!rawText) return '';
  let safe = escapeHtml(rawText);
  const gayRegex = /(^|[^\p{L}\p{N}_])(гей|геи|геем|геев|гейский|гейская|гейское|гейские|гейству|геями|геях|gay|gays)(?=[^\p{L}\p{N}_]|$)/giu;
  safe = safe.replace(gayRegex, (match, prefix) => {
    return `${prefix}<span class="rainbow-gay-tag" title="✨ Pride Rainbow">Gay</span>`;
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

  container.classList.add('closing');
  setTimeout(() => {
    container.classList.remove('open', 'closing');
    isChatOpen = false;
    isInChat = false;
    AppState.chatPartner = null;
    cancelReply();
    
    closeUserQuickPopover();
    updateChatBadge();
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

  if (tabWorld) tabWorld.classList.toggle('active', tab === 'world');
  if (tabDirect) tabDirect.classList.toggle('active', tab === 'direct');

  if (tab === 'world') {
    isInChat = false;
    AppState.chatPartner = null;
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
    if (chatAvatar) chatAvatar.textContent = '🌐';
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
      showDirectChatList();
    }
  }
  updateChatBadge();
}

function getChatPartnerFromKey(key, currentUser) {
  if (!key || !currentUser) return '';
  if (key.includes('___')) {
    const parts = key.split('___');
    if (parts.length === 2 && parts.includes(currentUser)) {
      return parts[0] === currentUser ? parts[1] : parts[0];
    }
    return '';
  }
  if (key.startsWith(currentUser + '_')) {
    return key.slice(currentUser.length + 1);
  }
  if (key.endsWith('_' + currentUser)) {
    return key.slice(0, key.length - currentUser.length - 1);
  }
  const parts = key.split('_');
  if (parts.includes(currentUser)) {
    return parts[0] === currentUser ? parts[1] : parts[0];
  }
  return '';
}

// ============================================================
//  5. МИРОВОЙ ЧАТ (WORLD CHAT STREAM)
// ============================================================

function renderWorldChat() {
  const container = document.getElementById('worldChatMessages');
  if (!container) return;

  loadWorldMessages();
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

    let avatarHtml;
    if (authorData && authorData.avatar) {
      avatarHtml = `<img src="${authorData.avatar}" alt="${safeAuthor}">`;
    } else {
      const initials = safeAuthor.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      avatarHtml = initials || '?';
    }

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
          <div class="world-msg-avatar">${avatarHtml}</div>
          <div class="world-msg-body">
            <div class="world-msg-header">
              <span class="world-msg-author" data-username="${safeAuthor}">${safeAuthor}</span>
              <span class="world-msg-time">${timeStr}</span>
              ${actionsHtml}
            </div>
            <div class="world-msg-text">🚫 Сообщение от заблокированного пользователя</div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="world-msg-item ${isMe ? 'from-me' : ''}" id="${msgId}" data-msg-id="${msgId}" data-user="${safeAuthor}">
          <div class="world-msg-avatar" data-username="${safeAuthor}" title="Открыть профиль">${avatarHtml}</div>
          <div class="world-msg-body">
            <div class="world-msg-header">
              <span class="world-msg-author" data-username="${safeAuthor}" title="Открыть профиль">${safeAuthor}</span>
              <span class="world-msg-tag">${escapeHtml(gameObj.name)}</span>
              <span class="world-msg-time">${timeStr}</span>
              ${actionsHtml}
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

  // Обработчики клика по автору или аватарке
  container.querySelectorAll('[data-username]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const user = el.dataset.username;
      openUserQuickPopover(user);
    });
  });

  // Обработчики кнопки ответа (Reply)
  container.querySelectorAll('.btn-msg-reply[data-scope="world"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.msgId;
      const author = btn.dataset.author;
      const text = btn.dataset.text;
      setReplyTo(id, author, text, 'world');
    });
  });

  // Обработчики модерации админа (Удалить / Замьютить)
  container.querySelectorAll('.btn-msg-del[data-scope="world"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const msgId = btn.dataset.msgId;
      if (confirm('Удалить это сообщение из мирового чата?')) {
        deleteWorldMessage(msgId);
        renderWorldChat();
        showNotification('Сообщение удалено', 'Сообщение успешно удалено из мирового чата');
      }
    });
  });

  container.querySelectorAll('.btn-msg-mute').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const author = btn.dataset.author;
      if (typeof openMuteModal === 'function') {
        openMuteModal(author);
      }
    });
  });

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

  if (nameEl) nameEl.textContent = username;

  if (data && data.avatar) {
    if (avatarEl) avatarEl.innerHTML = `<img src="${data.avatar}" alt="${escapeHtml(username)}">`;
  } else {
    const initials = username.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    if (avatarEl) avatarEl.textContent = initials || '?';
  }

  const gameObj = data ? (GAMES.find(g => g.id === data.game) || GAMES[0]) : GAMES[0];
  const rankStr = data && data.rank ? ` • ${data.rank}` : '';
  const statusStr = formatLastSeen(data ? data.lastSeen : null, username);

  if (gameTagEl) {
    gameTagEl.innerHTML = `
      <span>${escapeHtml(gameObj.name)}${rankStr}</span>
      <span class="popover-online-status ${isOnline ? 'online' : 'offline'}">• ${statusStr}</span>
    `;
  }

  if (bioEl) {
    bioEl.textContent = data && data.desc ? data.desc : 'Пользователь платформы Lobbivo';
  }

  if (tagsEl) {
    let tagHtml = `<span class="world-msg-tag">${escapeHtml(data ? (data.device || 'PC') : 'PC')}</span>`;
    if (data && data.discord) tagHtml += `<span class="world-msg-tag">Discord: ${escapeHtml(data.discord)}</span>`;
    if (areFriends(AppState.currentUser, username)) tagHtml += `<span class="world-msg-tag" style="border-color:#34d399;color:#34d399;">🤝 В друзьях</span>`;
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

  if (chatList) chatList.classList.add('open');
  if (directRoom) directRoom.style.display = 'none';
  if (chatBackBtn) chatBackBtn.style.display = 'none';
  if (chatUserName) chatUserName.textContent = 'Личные диалоги';
  if (chatAvatar) chatAvatar.textContent = '💬';
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
    return Boolean(getChatPartnerFromKey(key, currentUser));
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
    const msgsA = AppState.messages[a] || [];
    const msgsB = AppState.messages[b] || [];
    const timeA = msgsA.length ? msgsA[msgsA.length - 1].time : 0;
    const timeB = msgsB.length ? msgsB[msgsB.length - 1].time : 0;
    return timeB - timeA;
  });

  sortedKeys.forEach(key => {
    const partner = getChatPartnerFromKey(key, currentUser);
    if (!partner) return;
    const msgs = AppState.messages[key] || [];
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
      lastText = '<span style="color:#00e5ff;font-weight:600;">💬 печатает...</span>';
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
            <span>${safePartner} ${isBlocked ? '🚫' : ''}</span>
            ${last ? `<span class="chat-list-time">${new Date(last.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>` : ''}
          </div>
          <div class="last-msg">${lastText}</div>
        </div>
        ${unreadCount > 0 ? `<span class="unread">${unreadCount}</span>` : ''}
      </div>
    `;
  });

  list.innerHTML = html;
  list.querySelectorAll('.chat-list-item').forEach(item => {
    item.addEventListener('click', function() {
      openChatWith(this.dataset.partner);
    });
  });
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
  if (input) input.value = 'Привет! Давай затимимся 🎮';

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

  if (typeof SecurityShield !== 'undefined' && !SecurityShield.checkRateLimit('chat')) {
    return;
  }

  const input = document.getElementById('firstContactMessageInput');
  const rawText = input ? input.value.trim() : 'Привет! Давай затимимся!';
  const text = typeof SecurityShield !== 'undefined' ? SecurityShield.sanitizeText(rawText, 500) : rawText;

  const target = pendingFirstContactUser;
  closeFirstContactModal();

  // Отправляем первое сообщение в ЛС
  addMessage(AppState.currentUser, target, text);
  // Отправляем заявку в друзья
  sendFriendRequest(AppState.currentUser, target, text);

  showNotification('Заявка отправлена', `Сообщение и заявка в друзья отправлены ${target}`);

  // Открываем комнату чата
  openChatWith(target);
}

// ============================================================
//  9. КОМНАТА ДИАЛОГА (DIRECT CHAT ROOM)
// ============================================================

function openChatWith(username) {
  if (!AppState.currentUser) return;
  if (!username || username === AppState.currentUser) return;

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

  if (chatList) chatList.classList.remove('open');
  if (directRoom) directRoom.style.display = 'flex';
  if (chatBackBtn) chatBackBtn.style.display = 'inline-flex';
  if (chatUserName) chatUserName.textContent = username;

  const userData = AppState.users[username];
  const isOnline = isUserOnline(username);

  if (chatUserStatus) {
    chatUserStatus.style.display = 'block';
    chatUserStatus.className = 'chat-header-status ' + (isOnline ? 'online' : 'offline');
    chatUserStatus.textContent = formatLastSeen(userData ? userData.lastSeen : null, username);
  }

  if (userData && userData.avatar) {
    if (chatAvatar) chatAvatar.innerHTML = `<img src="${userData.avatar}" alt="${escapeHtml(username)}">`;
  } else {
    const initials = username.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    if (chatAvatar) chatAvatar.textContent = initials || '?';
  }

  if (chatAvatar) {
    chatAvatar.title = `Нажмите, чтобы посмотреть профиль ${username}`;
  }
  if (chatUserName) {
    chatUserName.title = `Нажмите, чтобы посмотреть профиль ${username}`;
  }

  // Мгновенно помечаем сообщения как прочитанные (исправление бага со счетчиком)
  markMessagesAsRead(AppState.currentUser, username);
  
  // Проверяем статус заявки в друзья
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
    if (lockedText) lockedText.textContent = '🚫 Переписка заблокирована';
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
    if (lockedText) lockedText.textContent = '⏳ Заявка отправлена. Ожидание подтверждения от игрока...';
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
        👋 Это начало вашей переписки с <strong>${escapeHtml(AppState.chatPartner)}</strong>.<br>
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
        ${!isOut ? `<span class="sender" data-username="${safeFrom}" style="cursor:pointer;" title="Нажмите, чтобы посмотреть профиль ${safeFrom}">${safeFrom}</span>` : ''}
        ${replyQuoteHtml}
        <div class="msg-text">${safeText}</div>
        <div class="msg-meta">
          <span class="time">${timeStr}</span>
          ${ticksHtml}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.sender[data-username]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openUserQuickPopover(el.dataset.username);
    });
  });

  // Обработчики кнопки ответа (Reply в ЛС)
  container.querySelectorAll('.btn-msg-reply[data-scope="direct"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.msgId;
      const author = btn.dataset.author;
      const text = btn.dataset.text;
      setReplyTo(id, author, text, 'direct');
    });
  });

  // Обработчики удаления сообщения модератором в ЛС
  container.querySelectorAll('.btn-msg-del[data-scope="direct"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const msgId = btn.dataset.msgId;
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
    });
  });

  // Обработчики мута из ЛС
  container.querySelectorAll('.btn-msg-mute').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const author = btn.dataset.author;
      if (typeof openMuteModal === 'function') {
        openMuteModal(author);
      }
    });
  });

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
    showNotification('Чат заблокирован', `Вы не можете отправлять сообщения: ${muteInfo?.muteReason || 'Мут'} (осталось ${muteInfo?.remainingFormatted || ''})`);
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

  const replyTo = (AppState.activeReply && AppState.activeReply.chatType === 'direct') ? AppState.activeReply : null;
  const text = typeof SecurityShield !== 'undefined' ? SecurityShield.sanitizeText(rawText, 500) : rawText;

  addMessage(AppState.currentUser, partner, text, replyTo);
  input.value = '';
  cancelReply('direct');

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
      worldInput.placeholder = '🚫 Чат заблокирован';
    }
    if (worldSendBtn) worldSendBtn.disabled = true;

    if (directInput) {
      directInput.disabled = true;
      directInput.placeholder = '🚫 Чат заблокирован';
    }
    if (directSendBtn) directSendBtn.disabled = true;

    const bannerHtml = `
      <div class="chat-mute-banner">
        <span class="mute-banner-icon">🔇</span>
        <div class="mute-banner-text">
          <span class="mute-banner-title">Блокировка чата:</span> ${escapeHtml(muteInfo.muteReason)}
          <span class="mute-banner-timer">⏳ Осталось: <strong class="mute-timer-val">${muteInfo.remainingFormatted}</strong></span>
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

  const access = user.privacy?.dmAccess || 'all';
  const radioAll = document.getElementById('privacyDmAll');
  const radioFriends = document.getElementById('privacyDmFriends');

  if (radioAll) radioAll.checked = (access === 'all');
  if (radioFriends) radioFriends.checked = (access === 'friends');

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
        ? 'Уведомления активны 🟢 (Разрешено в браузере)' 
        : 'Уведомления отключены в настройках Lobbivo ⚪';
    }
  } else if (perm === 'denied') {
    if (statusDot) statusDot.className = 'push-status-dot denied';
    if (statusText) {
      statusText.textContent = 'Доступ запрещён в браузере 🔴 (Включите в настройках сайта)';
    }
  } else {
    if (statusDot) statusDot.className = 'push-status-dot default';
    if (statusText) {
      statusText.textContent = 'Требуется разрешение браузера 🟡';
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
    const title = options.isTest ? sender : `LOBBIVO · Новое сообщение от ${sender}`;
    const cleanText = (text || '').replace(/<[^>]*>?/gm, '');
    const bodyText = cleanText.length > 90 ? cleanText.substring(0, 90) + '...' : (cleanText || 'Вам пришло новое сообщение');

    const notif = new Notification(title, {
      body: bodyText,
      icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" stop-color="%2300d4ff"/%3E%3Cstop offset="50%25" stop-color="%23b44dff"/%3E%3Cstop offset="100%25" stop-color="%23ff44cc"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="100" height="100" rx="24" fill="url(%23g)"/%3E%3Ctext x="50" y="70" font-family="sans-serif" font-weight="900" font-size="60" fill="%23ffffff" text-anchor="middle"%3EL%3C/text%3E%3C/svg%3E',
      badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" rx="24" fill="%2300d4ff"/%3E%3Ctext x="50" y="70" font-family="sans-serif" font-weight="900" font-size="60" fill="%23ffffff" text-anchor="middle"%3EL%3C/text%3E%3C/svg%3E',
      tag: `lobbivo-msg-${sender}`,
      renotify: true,
      silent: false
    });

    notif.onclick = function() {
      window.focus();
      if (!options.isTest) {
        if (typeof openChat === 'function') openChat();
        if (typeof openDirectChat === 'function') openDirectChat(sender);
      }
      this.close();
    };
  } catch (err) {
    console.warn('Push notification delivery error:', err);
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
          <div class="blacklist-avatar">🚫</div>
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