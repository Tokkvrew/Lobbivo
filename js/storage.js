// ============================================================
//  ХРАНИЛИЩЕ И СОСТОЯНИЕ (STORAGE & STATE)
// ============================================================

// XSS защита: безопасное экранирование строк
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Генерация уникального 6-значного ID
function generateUserId() {
  return Math.floor(100000 + Math.random() * 900000);
}

// Утилита debounce для оптимизации поиска
function debounce(func, wait = 150) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Оптимизация и сжатие аватара через Canvas (макс. 256x256, JPEG 0.85)
function compressImage(file, maxSize = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || (!file.type.startsWith('image/') && !file.name?.toLowerCase().endsWith('.gif'))) {
      return reject(new Error('Выбранный файл не является изображением'));
    }

    const isGif = file.type === 'image/gif' || (file.name && file.name.toLowerCase().endsWith('.gif'));
    if (isGif) {
      // GIF аватарка: сохраняем кадры анимации напрямую без сжатия через Canvas
      if (file.size > 3.5 * 1024 * 1024) {
        return reject(new Error('Размер GIF-аватарки не должен превышать 3.5 МБ'));
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Не удалось прочитать GIF файл'));
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = function(e) {
      const img = new Image();
      img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Глобальное состояние
const AppState = {
  currentUser: null,
  users: {},
  messages: {},
  worldMessages: [],
  complaints: [],
  currentTheme: 'default',
  chatPartner: null,
  activeChatTab: 'world', // 'world' | 'direct'
  isEditing: false,
  notificationTimeout: null,
  typingTimeout: null,
  gameSearchQuery: '',
  selectedGameFilter: 'all',
  activeReply: null, // { id, author, text, chatType }
  typingUsers: { world: {}, direct: {} }, // Хранилище статуса набора текста
  vipSquad: null // Активная VIP-анкета
};

// Проверка активности подписки Lobbivo Premium
function isUserPremium(username) {
  if (!username) return false;
  const user = AppState.users[username];
  if (!user) return false;
  if (user.isPremium === true) return true;
  if (user.premiumUntil && Number(user.premiumUntil) > Date.now()) return true;
  return false;
}

// Получение надетой рамки профиля
function getUserEquippedFrame(username) {
  if (!username) return 'none';
  const user = AppState.users[username];
  if (!user || !user.equippedFrame) return 'none';
  return user.equippedFrame;
}

// Получение инвентаря пользователя
function getUserInventory(username) {
  if (!username) return { frames: [], themes: [], boosts: 0 };
  const user = AppState.users[username];
  if (!user) return { frames: [], themes: [], boosts: 0 };
  if (!user.inventory || typeof user.inventory !== 'object') {
    user.inventory = { frames: [], themes: [], boosts: 0 };
  }
  if (!Array.isArray(user.inventory.frames)) user.inventory.frames = [];
  if (!Array.isArray(user.inventory.themes)) user.inventory.themes = [];
  return user.inventory;
}

// Проверка активности VIP-буста анкеты
function isSquadVipBoosted(username) {
  if (!username) return false;
  const user = AppState.users[username];
  if (!user) return false;
  if (user.vipBoostUntil && Number(user.vipBoostUntil) > Date.now()) return true;
  return false;
}

// Проверка онлайн-статуса пользователя
function isUserOnline(username) {
  if (!username) return false;
  if (AppState.currentUser === username) return true;
  const user = AppState.users[username];
  if (!user) return false;
  if (user.isOnline === true) return true;
  const lastSeen = user.lastSeen;
  if (!lastSeen) return false;
  return (Date.now() - Number(lastSeen)) < 150000; // онлайн если активность была менее 2.5 минут назад
}

// Форматирование времени последнего визита
function formatLastSeen(lastSeen, username = null) {
  if (username && isUserOnline(username)) {
    return 'в сети';
  }
  if (!lastSeen) {
    return 'не в сети';
  }
  const ts = Number(lastSeen);
  const diffMs = Date.now() - ts;
  if (diffMs < 150000) {
    return 'в сети';
  }
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) {
    return `был(а) ${diffMinutes} мин. назад`;
  }
  const d = new Date(ts);
  const now = new Date();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return `был(а) сегодня в ${timeStr}`;
  }
  const dateStr = d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  return `был(а) ${dateStr} в ${timeStr}`;
}

// ============================================================
//  АДМИНИСТРИРОВАНИЕ, БАНЫ И МУТЫ (ADMIN, BANS & MUTES)
// ============================================================

// Проверка прав администратора (выдаются через базу данных isAdmin: true или role: 'admin')
function isUserAdmin(username) {
  if (!username) return false;
  const u = AppState.users[username];
  if (!u) return false;
  return u.isAdmin === true || u.role === 'admin';
}

// Получение информации о бейдже администратора (с поддержкой переключателя вкл/выкл)
function getUserAdminBadge(username) {
  if (!username) return null;
  const u = AppState.users[username];
  if (!u) return null;
  if (!isUserAdmin(username)) return null;
  
  // Если администратор отключил бейдж (режим Инкогнито)
  if (u.adminBadgeEnabled === false) return null;

  const style = u.adminBadgeStyle || 'admin';
  const type = u.adminBadgeType || 'admin';
  const customText = (u.adminBadgeText || '').trim();

  let defaultText = 'АДМИНИСТРАТОР';
  let defaultIcon = 'icon-admin-shield';

  if (type === 'team') {
    defaultText = 'LOBBIVO TEAM';
    defaultIcon = 'icon-crown';
  } else if (type === 'dev') {
    defaultText = 'DEVELOPER';
    defaultIcon = 'icon-sparkles';
  } else if (type === 'moderator') {
    defaultText = 'МОДЕРАТОР';
    defaultIcon = 'icon-admin-shield';
  }

  return {
    enabled: true,
    type: type,
    style: style,
    text: customText || defaultText,
    icon: defaultIcon
  };
}

// Получение списка кастомных тегов игрока
function getUserCustomTags(username) {
  if (!username) return [];
  const u = AppState.users[username];
  if (!u) return [];
  if (Array.isArray(u.tags)) return u.tags.filter(Boolean);
  if (Array.isArray(u.customTags)) return u.customTags.filter(Boolean);
  return [];
}


// Проверка блокировки аккаунта (Бан)
function isUserBanned(username) {
  if (!username) return false;
  const u = AppState.users[username];
  if (!u || !u.bannedUntil) return false;
  if (u.bannedUntil === -1) return true; // Вечный бан
  const bannedUntilTs = Number(u.bannedUntil);
  if (bannedUntilTs > Date.now()) return true;
  // Срок бана истек - автоматически снимаем
  u.bannedUntil = null;
  u.banReason = null;
  u.bannedBy = null;
  u.bannedAt = null;
  saveUsers(username);
  return false;
}

// Проверка блокировки чата (Мут)
function isUserMuted(username) {
  if (!username) return false;
  const u = AppState.users[username];
  if (!u || !u.mutedUntil) return false;
  if (u.mutedUntil === -1) return true; // Вечный мут
  const mutedUntilTs = Number(u.mutedUntil);
  if (mutedUntilTs > Date.now()) return true;
  // Срок мута истек - автоматически снимаем
  u.mutedUntil = null;
  u.muteReason = null;
  u.mutedBy = null;
  u.mutedAt = null;
  saveUsers(username);
  return false;
}

// Получение подробной информации о бане с форматированием времени
function getBanInfo(username) {
  if (!username) return null;
  const u = AppState.users[username];
  if (!u || !u.bannedUntil) return null;
  if (u.bannedUntil !== -1 && Number(u.bannedUntil) <= Date.now()) {
    u.bannedUntil = null;
    u.banReason = null;
    saveUsers(username);
    return null;
  }
  const isPermanent = u.bannedUntil === -1;
  const remainingMs = isPermanent ? Infinity : Math.max(0, Number(u.bannedUntil) - Date.now());
  return {
    isBanned: true,
    isPermanent,
    bannedUntil: u.bannedUntil,
    banReason: u.banReason || 'Нарушение правил сообщества Lobbivo',
    bannedBy: u.bannedBy || 'Администратор',
    bannedAt: u.bannedAt || Date.now(),
    remainingMs,
    remainingFormatted: formatDurationRemaining(remainingMs, isPermanent),
    dateFormatted: isPermanent ? 'Навсегда' : new Date(Number(u.bannedUntil)).toLocaleString('ru-RU')
  };
}

// Получение подробной информации о муте с форматированием времени
function getMuteInfo(username) {
  if (!username) return null;
  const u = AppState.users[username];
  if (!u || !u.mutedUntil) return null;
  if (u.mutedUntil !== -1 && Number(u.mutedUntil) <= Date.now()) {
    u.mutedUntil = null;
    u.muteReason = null;
    saveUsers(username);
    return null;
  }
  const isPermanent = u.mutedUntil === -1;
  const remainingMs = isPermanent ? Infinity : Math.max(0, Number(u.mutedUntil) - Date.now());
  return {
    isMuted: true,
    isPermanent,
    mutedUntil: u.mutedUntil,
    muteReason: u.muteReason || 'Нарушение правил чата',
    mutedBy: u.mutedBy || 'Модератор',
    mutedAt: u.mutedAt || Date.now(),
    remainingMs,
    remainingFormatted: formatDurationRemaining(remainingMs, isPermanent),
    dateFormatted: isPermanent ? 'Навсегда' : new Date(Number(u.mutedUntil)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

// Форматирование оставшегося времени (дни, часы, минуты, секунды)
function formatDurationRemaining(ms, isPermanent = false) {
  if (isPermanent) return 'Навсегда';
  if (!ms || ms <= 0) return '0 сек.';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days} д. ${hours} ч.`;
  }
  if (hours > 0) {
    return `${hours} ч. ${minutes} мин.`;
  }
  if (minutes > 0) {
    return `${minutes} мин. ${seconds} сек.`;
  }
  return `${seconds} сек.`;
}

// Выдача бана пользователю
function banUser(target, durationMinutes, reason, adminName = null) {
  const u = AppState.users[target];
  if (!u) return false;
  const now = Date.now();
  let bannedUntil = -1;
  if (durationMinutes !== -1 && durationMinutes > 0) {
    bannedUntil = now + (durationMinutes * 60 * 1000);
  }
  u.bannedUntil = bannedUntil;
  u.banReason = reason || 'Нарушение правил сообщества Lobbivo';
  u.bannedBy = adminName || AppState.currentUser || 'Администратор';
  u.bannedAt = now;
  saveUsers(target);
  return true;
}

// Снятие бана
function unbanUser(target) {
  const u = AppState.users[target];
  if (!u) return false;
  u.bannedUntil = null;
  u.banReason = null;
  u.bannedBy = null;
  u.bannedAt = null;
  saveUsers(target);
  return true;
}

// Выдача мута пользователю
function muteUser(target, durationMinutes, reason, adminName = null) {
  const u = AppState.users[target];
  if (!u) return false;
  const now = Date.now();
  let mutedUntil = -1;
  if (durationMinutes !== -1 && durationMinutes > 0) {
    mutedUntil = now + (durationMinutes * 60 * 1000);
  }
  u.mutedUntil = mutedUntil;
  u.muteReason = reason || 'Нарушение правил чата';
  u.mutedBy = adminName || AppState.currentUser || 'Модератор';
  u.mutedAt = now;
  saveUsers(target);
  return true;
}

// Снятие мута
function unmuteUser(target) {
  const u = AppState.users[target];
  if (!u) return false;
  u.mutedUntil = null;
  u.muteReason = null;
  u.mutedBy = null;
  u.mutedAt = null;
  saveUsers(target);
  return true;
}

// Удаление сообщения из мирового чата
function deleteWorldMessage(msgId) {
  if (!msgId) return false;
  AppState.worldMessages = AppState.worldMessages.filter(m => m.id !== msgId);
  saveWorldMessages();
  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    FirebaseSync.deleteWorldMessage(msgId);
  }
  return true;
}

// Закрытие/удаление жалобы
function resolveComplaint(complaintId) {
  if (!complaintId) return false;
  AppState.complaints = AppState.complaints.filter(c => String(c.id) !== String(complaintId));
  saveComplaints();
  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    FirebaseSync.deleteComplaint(complaintId);
  }
  return true;
}

// Загрузка пользователей
function loadUsers() {
  try {
    const raw = localStorage.getItem('squad_users');
    AppState.users = raw ? JSON.parse(raw) : {};
  } catch {
    AppState.users = {};
  }

  // Очистка тестовых данных, если они были сохранены ранее
  if (AppState.users['CyberViper']) {
    delete AppState.users['CyberViper'];
  }

  // Проверка и инициализация полей у всех пользователей
  for (const name of Object.keys(AppState.users)) {
    const u = AppState.users[name];
    if (typeof u.coins !== 'number') u.coins = 0;
    if (!Array.isArray(u.friends)) u.friends = [];
    if (!Array.isArray(u.blockedUsers)) u.blockedUsers = [];
    if (!Array.isArray(u.friendRequests)) u.friendRequests = [];
    if (!u.privacy || typeof u.privacy !== 'object') {
      u.privacy = { dmAccess: 'all' };
    }
    if (!u.claimedTasks || typeof u.claimedTasks !== 'object') {
      u.claimedTasks = { avatar: false, bio: false, squad: false, teammates: false };
    }
    if (!Array.isArray(u.contactedTeammates)) {
      u.contactedTeammates = [];
    }
    if (typeof u.hasCreatedSquad !== 'boolean') {
      u.hasCreatedSquad = Boolean(u.lookingForTeam);
    }
    if (typeof u.isPremium !== 'boolean') u.isPremium = false;
    if (typeof u.equippedFrame !== 'string') u.equippedFrame = 'none';
    if (!u.inventory || typeof u.inventory !== 'object') {
      u.inventory = { frames: [], themes: [], boosts: 0 };
    }
    if (!Array.isArray(u.inventory.frames)) u.inventory.frames = [];
    if (!Array.isArray(u.inventory.themes)) u.inventory.themes = [];
  }

  saveUsers();
  return AppState.users;
}

function saveUsers(specificUser = null) {
  try {
    localStorage.setItem('squad_users', JSON.stringify(AppState.users));
  } catch (err) {
    console.error('Ошибка сохранения пользователей:', err);
  }

  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    if (specificUser) {
      FirebaseSync.saveUser(specificUser);
    } else {
      FirebaseSync.saveAllUsers();
    }
  }
}

// ============================================================
//  МИРОВОЙ ЧАТ (WORLD CHAT STORAGE)
// ============================================================
function loadWorldMessages() {
  try {
    const raw = localStorage.getItem('squad_world_messages');
    AppState.worldMessages = raw ? JSON.parse(raw) : [];
  } catch {
    AppState.worldMessages = [];
  }

  // Очистка сообщений тестового пользователя
  if (Array.isArray(AppState.worldMessages)) {
    AppState.worldMessages = AppState.worldMessages.filter(m => m.from !== 'CyberViper');
  } else {
    AppState.worldMessages = [];
  }

  return AppState.worldMessages;
}

function saveWorldMessages() {
  try {
    localStorage.setItem('squad_world_messages', JSON.stringify(AppState.worldMessages));
  } catch (err) {
    console.error('Ошибка сохранения мирового чата:', err);
  }
}

function addWorldMessage(from, text, replyTo = null) {
  if (isUserBanned(from)) {
    throw new Error('Ваш аккаунт заблокирован');
  }
  if (isUserMuted(from)) {
    const info = getMuteInfo(from);
    throw new Error(`Вам ограничен доступ к чату: ${info?.muteReason || 'Блокировка'} (${info?.remainingFormatted || ''})`);
  }
  const u = AppState.users[from];
  const msg = {
    id: 'wm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    from,
    text,
    time: Date.now(),
    game: u ? u.game : 'csgo',
    rank: u ? (u.rank || '') : '',
    replyTo: replyTo ? {
      id: replyTo.id || '',
      author: replyTo.author || '',
      text: (replyTo.text || '').slice(0, 100)
    } : null
  };
  AppState.worldMessages.push(msg);
  if (AppState.worldMessages.length > 500) {
    AppState.worldMessages = AppState.worldMessages.slice(-500);
  }
  saveWorldMessages();

  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    FirebaseSync.sendWorldMessage(msg);
  }

  return msg;
}

// ============================================================
//  ЧЁРНЫЙ СПИСОК И БЛОКИРОВКИ (BLACKLIST)
// ============================================================
function isUserBlocked(viewer, target) {
  if (!viewer || !target) return false;
  const u = AppState.users[viewer];
  return u && Array.isArray(u.blockedUsers) && u.blockedUsers.includes(target);
}

function isBlockedBy(viewer, target) {
  if (!viewer || !target) return false;
  const t = AppState.users[target];
  return t && Array.isArray(t.blockedUsers) && t.blockedUsers.includes(viewer);
}

function blockUser(viewer, target) {
  if (!viewer || !target || viewer === target) return false;
  const u = AppState.users[viewer];
  if (!u) return false;
  if (!Array.isArray(u.blockedUsers)) u.blockedUsers = [];
  if (!u.blockedUsers.includes(target)) {
    u.blockedUsers.push(target);
    saveUsers();
  }
  return true;
}

function unblockUser(viewer, target) {
  if (!viewer || !target) return false;
  const u = AppState.users[viewer];
  if (!u || !Array.isArray(u.blockedUsers)) return false;
  u.blockedUsers = u.blockedUsers.filter(n => n !== target);
  saveUsers();
  return true;
}

// ============================================================
//  ДРУЗЬЯ И ЗАЯВКИ В ДРУЗЬЯ (FRIENDS & REQUESTS)
// ============================================================
function areFriends(user1, user2) {
  if (!user1 || !user2) return false;
  const u1 = AppState.users[user1];
  return u1 && Array.isArray(u1.friends) && u1.friends.includes(user2);
}

function getFriendRequest(user1, user2) {
  const u1 = AppState.users[user1];
  const u2 = AppState.users[user2];
  const req1 = u1?.friendRequests?.find(r => (r.from === user1 && r.to === user2) || (r.from === user2 && r.to === user1));
  const req2 = u2?.friendRequests?.find(r => (r.from === user1 && r.to === user2) || (r.from === user2 && r.to === user1));
  return req1 || req2 || null;
}

function sendFriendRequest(from, to, initialMessage = '') {
  if (!from || !to || from === to) return null;
  const uFrom = AppState.users[from];
  const uTo = AppState.users[to];
  if (!uFrom || !uTo) return null;

  if (!Array.isArray(uFrom.friendRequests)) uFrom.friendRequests = [];
  if (!Array.isArray(uTo.friendRequests)) uTo.friendRequests = [];

  if (areFriends(from, to)) return { status: 'accepted', from, to };

  let req = getFriendRequest(from, to);
  if (!req) {
    req = {
      id: 'fr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      from,
      to,
      message: initialMessage,
      time: Date.now(),
      status: 'pending'
    };
    uFrom.friendRequests.push(req);
    uTo.friendRequests.push(req);
  } else {
    req.status = 'pending';
    req.from = from;
    req.to = to;
    if (initialMessage) req.message = initialMessage;
    req.time = Date.now();
  }

  saveUsers();
  return req;
}

function acceptFriendRequest(viewer, sender) {
  const uViewer = AppState.users[viewer];
  const uSender = AppState.users[sender];
  if (!uViewer || !uSender) return false;

  if (!Array.isArray(uViewer.friends)) uViewer.friends = [];
  if (!Array.isArray(uSender.friends)) uSender.friends = [];

  if (!uViewer.friends.includes(sender)) uViewer.friends.push(sender);
  if (!uSender.friends.includes(viewer)) uSender.friends.push(viewer);

  const updateStatus = (userObj) => {
    if (Array.isArray(userObj.friendRequests)) {
      userObj.friendRequests.forEach(r => {
        if ((r.from === sender && r.to === viewer) || (r.from === viewer && r.to === sender)) {
          r.status = 'accepted';
        }
      });
    }
  };
  updateStatus(uViewer);
  updateStatus(uSender);

  saveUsers();
  return true;
}

function declineFriendRequest(viewer, sender) {
  const uViewer = AppState.users[viewer];
  const uSender = AppState.users[sender];
  if (!uViewer || !uSender) return false;

  const updateStatus = (userObj) => {
    if (Array.isArray(userObj.friendRequests)) {
      userObj.friendRequests.forEach(r => {
        if ((r.from === sender && r.to === viewer) || (r.from === viewer && r.to === sender)) {
          r.status = 'declined';
        }
      });
    }
  };
  updateStatus(uViewer);
  updateStatus(uSender);

  saveUsers();
  return true;
}

// ============================================================
//  ЛИЧНЫЕ СООБЩЕНИЯ (DIRECT MESSAGES)
// ============================================================
function loadMessages() {
  try {
    const raw = localStorage.getItem('squad_messages');
    AppState.messages = raw ? JSON.parse(raw) : {};
  } catch {
    AppState.messages = {};
  }
  // Очистка сообщений тестового пользователя
  for (const key of Object.keys(AppState.messages)) {
    if (key.includes('CyberViper')) {
      delete AppState.messages[key];
    }
  }
  return AppState.messages;
}

function saveMessages() {
  try {
    localStorage.setItem('squad_messages', JSON.stringify(AppState.messages));
  } catch (err) {
    console.error('Ошибка сохранения сообщений:', err);
  }
}

function getMessagesKey(user1, user2) {
  return [String(user1), String(user2)].sort().join('___');
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

function getChatMessages(user1, user2) {
  if (!user1 || !user2) return [];
  const key1 = getMessagesKey(user1, user2);
  if (Array.isArray(AppState.messages[key1])) return AppState.messages[key1];
  const oldKey = [String(user1), String(user2)].sort().join('_');
  if (Array.isArray(AppState.messages[oldKey])) return AppState.messages[oldKey];
  return [];
}

function addMessage(from, to, text, replyTo = null) {
  if (isUserBanned(from)) {
    throw new Error('Ваш аккаунт заблокирован');
  }
  if (isUserMuted(from)) {
    const info = getMuteInfo(from);
    throw new Error(`Вам ограничен доступ к чату: ${info?.muteReason || 'Блокировка'} (${info?.remainingFormatted || ''})`);
  }
  const key = getMessagesKey(from, to);
  const oldKey = [String(from), String(to)].sort().join('_');

  if (!AppState.messages[key]) {
    if (Array.isArray(AppState.messages[oldKey])) {
      AppState.messages[key] = AppState.messages[oldKey];
      delete AppState.messages[oldKey];
    } else {
      AppState.messages[key] = [];
    }
  }

  const msg = {
    id: 'dm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    from,
    to,
    text,
    time: Date.now(),
    read: false,
    replyTo: replyTo ? {
      id: replyTo.id || '',
      author: replyTo.author || '',
      text: (replyTo.text || '').slice(0, 100)
    } : null
  };
  AppState.messages[key].push(msg);
  saveMessages();

  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    FirebaseSync.saveDirectChat(key);
  }

  return msg;
}

function markMessagesAsRead(viewer, partner) {
  const msgs = getChatMessages(viewer, partner);
  if (!msgs || msgs.length === 0) return false;

  let changed = false;
  msgs.forEach(m => {
    if (m.from === partner && !m.read) {
      m.read = true;
      changed = true;
    }
  });

  if (changed) {
    saveMessages();
    const key = getMessagesKey(viewer, partner);
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
      FirebaseSync.saveDirectChat(key);
    }
  }
  return changed;
}

function getTotalUnreadCount(username) {
  if (!username) return 0;
  let total = 0;
  for (const key of Object.keys(AppState.messages)) {
    const partner = getChatPartnerFromKey(key, username);
    if (partner) {
      const msgs = AppState.messages[key] || [];
      total += msgs.filter(m => m.from === partner && !m.read).length;
    }
  }
  return total;
}

// Жалобы
function loadComplaints() {
  try {
    const raw = localStorage.getItem('squad_complaints');
    AppState.complaints = raw ? JSON.parse(raw) : [];
  } catch {
    AppState.complaints = [];
  }
  return AppState.complaints;
}

function saveComplaints() {
  try {
    localStorage.setItem('squad_complaints', JSON.stringify(AppState.complaints));
  } catch (err) {
    console.error('Ошибка сохранения жалоб:', err);
  }

  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized && AppState.complaints.length > 0) {
    const lastComplaint = AppState.complaints[AppState.complaints.length - 1];
    FirebaseSync.saveComplaint(lastComplaint);
  }
}

// Тема оформления
function loadTheme() {
  const saved = localStorage.getItem('squad_theme');
  const validThemes = ['default', 'lobbivo', 'finder', 'nebula', 'crimson', 'matrix'];
  if (saved && validThemes.includes(saved)) {
    AppState.currentTheme = (saved === 'finder') ? 'lobbivo' : saved;
  } else {
    AppState.currentTheme = 'default';
  }
  applyTheme(AppState.currentTheme);
}

function saveTheme(theme) {
  const currentTheme = theme || 'default';
  AppState.currentTheme = currentTheme;
  localStorage.setItem('squad_theme', currentTheme);

  // Сохраняем тему в профиль пользователя, если авторизован
  const current = AppState.currentUser;
  if (current && AppState.users[current]) {
    AppState.users[current].theme = currentTheme;
    if (typeof saveUsers === 'function') saveUsers(current);
  }

  applyTheme(currentTheme);
}

function applyTheme(theme) {
  const currentTheme = theme || 'default';
  AppState.currentTheme = currentTheme;

  if (currentTheme === 'default') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }

  // Обновляем активные классы на карточках тем
  document.querySelectorAll('.theme-card, .settings-theme-card').forEach(c => {
    c.classList.toggle('active', c.dataset.theme === currentTheme || c.dataset.themeId === currentTheme);
  });

  if (typeof createParticles === 'function') {
    createParticles(currentTheme);
  }

  if (typeof renderSettingsCustomization === 'function') {
    renderSettingsCustomization();
  }
}

