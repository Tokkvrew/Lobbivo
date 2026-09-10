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

// Оптимизация и сжатие аватара через Canvas (макс. 256x256, JPEG 0.85) с полной поддержкой мобильных устройств
function compressImage(file, maxSize = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('Файл не выбран'));
    }

    const fileName = (file.name || '').toLowerCase();
    const isImage = file.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif|svg)$/i.test(fileName) || !file.type;
    
    if (!isImage) {
      return reject(new Error('Выбранный файл не является поддерживаемым изображением'));
    }

    const isGif = file.type === 'image/gif' || fileName.endsWith('.gif');
    if (isGif) {
      if (file.size > 4 * 1024 * 1024) {
        return reject(new Error('Размер GIF-аватарки не должен превышать 4 МБ'));
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Не удалось прочитать GIF файл'));
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
      return;
    }

    const processImageSource = (srcUrl, isBlobUrl = false) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onerror = () => {
        if (isBlobUrl) URL.revokeObjectURL(srcUrl);
        // Резервная попытка через FileReader
        const fallbackReader = new FileReader();
        fallbackReader.onload = (fe) => {
          const fallbackImg = new Image();
          fallbackImg.onload = () => renderToCanvas(fallbackImg);
          fallbackImg.onerror = () => reject(new Error('Не удалось открыть изображение с камеры/галереи'));
          fallbackImg.src = fe.target.result;
        };
        fallbackReader.onerror = () => reject(new Error('Ошибка чтения файла'));
        fallbackReader.readAsDataURL(file);
      };

      const renderToCanvas = (loadedImg) => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = loadedImg;
          
          if (!width || !height) {
            width = maxSize;
            height = maxSize;
          }

          // Квадратное центрированное кадрирование для идеального аватара
          const minSide = Math.min(width, height);
          const startX = (width - minSide) / 2;
          const startY = (height - minSide) / 2;
          
          canvas.width = Math.min(maxSize, minSide);
          canvas.height = Math.min(maxSize, minSide);
          
          const ctx = canvas.getContext('2d', { alpha: false });
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(loadedImg, startX, startY, minSide, minSide, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
          } else {
            resolve(loadedImg.src);
          }
        } catch (err) {
          reject(err);
        }
      };

      img.onload = () => {
        if (isBlobUrl) URL.revokeObjectURL(srcUrl);
        renderToCanvas(img);
      };

      img.src = srcUrl;
    };

    if (window.URL && typeof window.URL.createObjectURL === 'function') {
      try {
        const blobUrl = URL.createObjectURL(file);
        processImageSource(blobUrl, true);
        return;
      } catch (e) {
        // Fallback to FileReader below
      }
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = (e) => processImageSource(e.target.result, false);
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
  currentCategoryFilter: 'popular',
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
const getUserAvatarFrame = getUserEquippedFrame;

// Получение надетого стиля никнейма
function getUserNameStyle(username) {
  if (!username) return 'default';
  const user = AppState.users[username];
  if (!user || !user.nameStyle) return 'default';
  return user.nameStyle;
}

// Получение надетого фона мини-профиля
function getUserEquippedMiniBg(username) {
  if (!username) return 'default';
  const user = AppState.users[username];
  if (!user || !user.equippedMiniBg) return 'default';
  return user.equippedMiniBg;
}

// Получение надетой шапки / обложки профиля
function getUserEquippedBanner(username) {
  if (!username) return 'default';
  const user = AppState.users[username];
  if (!user || !user.equippedBanner) return 'default';
  return user.equippedBanner;
}

// Получение инвентаря пользователя
function getUserInventory(username) {
  if (!username) return { frames: [], themes: [], nameStyles: [], miniBgs: [], banners: [], boosts: 0 };
  const user = AppState.users[username];
  if (!user) return { frames: [], themes: [], nameStyles: [], miniBgs: [], banners: [], boosts: 0 };
  if (!user.inventory || typeof user.inventory !== 'object') {
    user.inventory = { frames: [], themes: [], nameStyles: [], miniBgs: [], banners: [], boosts: 0 };
  }
  if (!Array.isArray(user.inventory.frames)) user.inventory.frames = [];
  if (!Array.isArray(user.inventory.themes)) user.inventory.themes = [];
  if (!Array.isArray(user.inventory.nameStyles)) user.inventory.nameStyles = [];
  if (!Array.isArray(user.inventory.miniBgs)) user.inventory.miniBgs = [];
  if (!Array.isArray(user.inventory.banners)) user.inventory.banners = [];
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

// Проверка прав персонала (CEO или Модератор)
function isUserAdmin(username) {
  if (!username) return false;
  const u = AppState.users[username];
  if (!u) return false;
  return u.isAdmin === true || u.role === 'admin' || u.role === 'ga' || u.role === 'ceo' || u.role === 'moderator';
}

// Проверка роли Главного Администратора и Владельца (CEO)
function isUserCEO(username) {
  if (!username) return false;
  const u = AppState.users[username];
  if (!u) return false;
  if (u.role === 'ceo' || u.role === 'ga') return true;
  if (u.role === 'moderator') return false;
  return u.isAdmin === true || u.role === 'admin';
}

// Алиас для обратной совместимости
const isUserGA = isUserCEO;

// Проверка роли Модератора
function isUserModerator(username) {
  if (!username) return false;
  const u = AppState.users[username];
  if (!u) return false;
  return u.role === 'moderator';
}

// Получение роли персонала пользователя ('ceo' | 'moderator' | null)
function getUserAdminRole(username) {
  if (!username) return null;
  if (isUserCEO(username)) return 'ceo';
  if (isUserModerator(username)) return 'moderator';
  return null;
}

// Назначение роли пользователю
function setUserRole(username, role = 'user') {
  if (!username || !AppState.users[username]) {
    console.error(`[Role] Пользователь ${username} не найден`);
    return false;
  }
  const u = AppState.users[username];
  u.role = role;
  u.isAdmin = (role === 'moderator' || role === 'admin' || role === 'ceo' || role === 'ga');
  if (role === 'moderator') {
    if (!u.adminBadgeType) u.adminBadgeType = 'moderator';
    if (!u.adminBadgeStyle) u.adminBadgeStyle = 'moderator';
  }
  saveUsers(username, true);
  console.log(`[Role] Пользователю ${username} установлена роль: ${role}`);
  return true;
}
window.setUserRole = setUserRole;

// Быстрое назначение модератора
function setModerator(username) {
  return setUserRole(username, 'moderator');
}
window.setModerator = setModerator;

// Быстрое снятие модератора
function removeModerator(username) {
  return setUserRole(username, 'user');
}
window.removeModerator = removeModerator;

// Проверка права наказания: модератор НЕ может банить/мутить других модераторов и CEO
function canAdminPunishTarget(actorUsername, targetUsername) {
  if (!actorUsername || !targetUsername) return false;
  if (actorUsername === targetUsername) return false; // Нельзя наказывать самого себя
  
  // Владелец и Главный администратор (CEO) имеет полный доступ
  if (isUserCEO(actorUsername)) return true;

  // Модератор:
  if (isUserModerator(actorUsername)) {
    // Не может наказывать CEO, модераторов или любого сотрудника персонала
    if (isUserAdmin(targetUsername) || isUserCEO(targetUsername) || isUserModerator(targetUsername)) {
      return false;
    }
    return true;
  }

  return false;
}

// Получение информации о бейдже администратора (с поддержкой CEO и Модераторов)
function getUserAdminBadge(username) {
  if (!username) return null;
  const u = AppState.users[username];
  if (!u) return null;
  if (!isUserAdmin(username)) return null;
  
  // Если администратор отключил бейдж (режим Инкогнито)
  if (u.adminBadgeEnabled === false) return null;

  const isCEO = isUserCEO(username);
  const isMod = isUserModerator(username);

  const style = u.adminBadgeStyle || (isMod ? 'moderator' : 'admin');
  const type = u.adminBadgeType || (isMod ? 'moderator' : 'admin');
  const customText = (u.adminBadgeText || '').trim();

  let defaultText = 'CEO';
  let defaultIcon = 'icon-crown';

  if (isMod || type === 'moderator') {
    defaultText = 'МОДЕРАТОР';
    defaultIcon = 'icon-shield';
  } else if (type === 'team') {
    defaultText = 'LOBBIVO TEAM';
    defaultIcon = 'icon-crown';
  } else if (type === 'dev') {
    defaultText = 'DEVELOPER';
    defaultIcon = 'icon-sparkles';
  } else if (type === 'admin' || type === 'ga' || type === 'ceo') {
    defaultText = 'CEO';
    defaultIcon = 'icon-crown';
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
  const actor = adminName || AppState.currentUser;
  if (actor && typeof canAdminPunishTarget === 'function' && !canAdminPunishTarget(actor, target)) {
    console.warn(`[Security] ${actor} не имеет прав забанить ${target}`);
    if (typeof showNotification === 'function') {
      showNotification('Отказано в доступе', 'Модератор не может заблокировать другого модератора или CEO');
    }
    return false;
  }
  const now = Date.now();
  let bannedUntil = -1;
  if (durationMinutes !== -1 && durationMinutes > 0) {
    bannedUntil = now + (durationMinutes * 60 * 1000);
  }
  u.bannedUntil = bannedUntil;
  u.banReason = reason || 'Нарушение правил сообщества Lobbivo';
  u.bannedBy = actor || (isUserCEO(actor) ? 'CEO' : 'Модератор');
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
  const actor = adminName || AppState.currentUser;
  if (actor && typeof canAdminPunishTarget === 'function' && !canAdminPunishTarget(actor, target)) {
    console.warn(`[Security] ${actor} не имеет прав замутить ${target}`);
    if (typeof showNotification === 'function') {
      showNotification('Отказано в доступе', 'Модератор не может замутить другого модератора или CEO');
    }
    return false;
  }
  const now = Date.now();
  let mutedUntil = -1;
  if (durationMinutes !== -1 && durationMinutes > 0) {
    mutedUntil = now + (durationMinutes * 60 * 1000);
  }
  u.mutedUntil = mutedUntil;
  u.muteReason = reason || 'Нарушение правил чата';
  u.mutedBy = actor || (isUserCEO(actor) ? 'CEO' : 'Модератор');
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
    if (!u || typeof u !== 'object') continue;

    // Нормализация анкет (squads)
    if (u.squads) {
      if (Array.isArray(u.squads)) {
        u.squads = u.squads.filter(s => s && typeof s === 'object');
      } else if (typeof u.squads === 'object') {
        u.squads = Object.values(u.squads).filter(s => s && typeof s === 'object');
      } else {
        u.squads = [];
      }
    } else {
      u.squads = [];
    }

    if (u.squads.length > 0) {
      u.lookingForTeam = u.squads.some(s => s && s.active !== false);
      u.hasCreatedSquad = true;
    }

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
      u.hasCreatedSquad = Boolean(u.lookingForTeam || (u.squads && u.squads.length > 0));
    }
    if (typeof u.isPremium !== 'boolean') u.isPremium = false;
    if (typeof u.equippedFrame !== 'string') u.equippedFrame = 'none';
    if (typeof u.equippedMiniBg !== 'string') u.equippedMiniBg = 'default';
    if (typeof u.equippedBanner !== 'string') u.equippedBanner = 'default';
    if (!u.inventory || typeof u.inventory !== 'object') {
      u.inventory = { frames: [], themes: [], nameStyles: [], miniBgs: [], banners: [], boosts: 0 };
    }
    if (!Array.isArray(u.inventory.frames)) u.inventory.frames = [];
    if (!Array.isArray(u.inventory.themes)) u.inventory.themes = [];
    if (!Array.isArray(u.inventory.nameStyles)) u.inventory.nameStyles = [];
    if (!Array.isArray(u.inventory.miniBgs)) u.inventory.miniBgs = [];
    if (!Array.isArray(u.inventory.banners)) u.inventory.banners = [];
    if (typeof u.nameStyle !== 'string') u.nameStyle = 'default';
    if (!u.chatDeletedTimestamps || typeof u.chatDeletedTimestamps !== 'object') {
      u.chatDeletedTimestamps = {};
    }
  }

  return AppState.users;
}

function saveUsers(specificUser = null, immediate = false) {
  try {
    localStorage.setItem('squad_users', JSON.stringify(AppState.users));
  } catch (err) {
    console.error('Ошибка сохранения пользователей:', err);
  }

  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    if (specificUser) {
      FirebaseSync.saveUser(specificUser, immediate);
    } else if (AppState.currentUser) {
      FirebaseSync.saveUser(AppState.currentUser, immediate);
    }
  }
}

// Получение CSS-класса для стилизации и раскраски никнейма (CEO / Модераторы / Косметические / Premium)
function getUserNameClass(username, overrideStyle = null) {
  if (!username) return '';
  const user = AppState.users[username];
  const nameStyle = overrideStyle || user?.nameStyle || 'default';

  // 1. Стили Владельца и CEO
  if (isUserCEO(username)) {
    if (nameStyle === 'ga_inferno' || nameStyle === 'ceo_inferno') return 'name-style-ceo-inferno';
    if (nameStyle === 'ga_void' || nameStyle === 'ceo_void') return 'name-style-ceo-void';
  }

  // 2. Стили Модераторов
  if (isUserAdmin(username)) {
    if (nameStyle === 'mod_emerald') return 'name-style-mod-emerald';
  }

  // 3. Косметические стили никнейма (из магазина/гардероба)
  if (nameStyle && nameStyle !== 'default') {
    return `name-style-${nameStyle}`;
  }

  // 4. Стиль Premium по умолчанию
  if (isUserPremium(username)) {
    return 'premium-author';
  }

  return '';
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
  const u2 = AppState.users[user2];
  if (!u1 || !Array.isArray(u1.friends) || !u1.friends.includes(user2)) return false;
  if (!u2 || !Array.isArray(u2.friends) || !u2.friends.includes(user1)) return false;
  return true;
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
  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    if (uFrom) FirebaseSync.saveUser(from, true);
    if (uTo) FirebaseSync.saveUser(to, true);
  }
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
  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    if (uViewer) FirebaseSync.saveUser(viewer, true);
    if (uSender) FirebaseSync.saveUser(sender, true);
  }
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
  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    if (uViewer) FirebaseSync.saveUser(viewer, true);
    if (uSender) FirebaseSync.saveUser(sender, true);
  }
  return true;
}

function removeFriend(user1, user2) {
  if (!user1 || !user2) return false;
  const u1 = AppState.users[user1];
  const u2 = AppState.users[user2];
  if (!u1 && !u2) return false;

  if (u1 && Array.isArray(u1.friends)) {
    u1.friends = u1.friends.filter(f => f !== user2);
  }
  if (u2 && Array.isArray(u2.friends)) {
    u2.friends = u2.friends.filter(f => f !== user1);
  }

  // Очищаем списки платного доступа при удалении из друзей
  if (u1 && Array.isArray(u1.paidDmUsers)) {
    u1.paidDmUsers = u1.paidDmUsers.filter(u => u !== user2);
  }
  if (u2 && Array.isArray(u2.paidDmUsers)) {
    u2.paidDmUsers = u2.paidDmUsers.filter(u => u !== user1);
  }
  if (u1 && Array.isArray(u1.unlockedDms)) {
    u1.unlockedDms = u1.unlockedDms.filter(u => u !== user2);
  }
  if (u2 && Array.isArray(u2.unlockedDms)) {
    u2.unlockedDms = u2.unlockedDms.filter(u => u !== user1);
  }

  const cleanRequests = (userObj) => {
    if (userObj && Array.isArray(userObj.friendRequests)) {
      userObj.friendRequests = userObj.friendRequests.filter(r => 
        !((r.from === user1 && r.to === user2) || (r.from === user2 && r.to === user1))
      );
    }
  };
  cleanRequests(u1);
  cleanRequests(u2);

  saveUsers();
  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    if (u1) FirebaseSync.saveUser(user1, true);
    if (u2) FirebaseSync.saveUser(user2, true);
  }
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
  let allMsgs = [];
  if (Array.isArray(AppState.messages[key1])) {
    allMsgs = AppState.messages[key1];
  } else {
    const oldKey = [String(user1), String(user2)].sort().join('_');
    if (Array.isArray(AppState.messages[oldKey])) {
      allMsgs = AppState.messages[oldKey];
    }
  }

  // Проверка метки удаления переписки «для себя» у пользователя user1
  const u1 = AppState.users[user1];
  const deletedUntil = (u1 && u1.chatDeletedTimestamps && u1.chatDeletedTimestamps[user2]) ? Number(u1.chatDeletedTimestamps[user2]) : 0;
  if (deletedUntil > 0) {
    return allMsgs.filter(m => (m.time || 0) > deletedUntil);
  }
  return allMsgs;
}

function addMessage(from, to, text, replyTo = null) {
  if (isUserBanned(from)) {
    throw new Error('Ваш аккаунт заблокирован');
  }
  if (isUserMuted(from)) {
    const info = getMuteInfo(from);
    throw new Error(`Вам ограничен доступ к чату: ${info?.muteReason || 'Блокировка'} (${info?.remainingFormatted || ''})`);
  }
  if (typeof isDmUnlockedForUser === 'function' && !isDmUnlockedForUser(to, from)) {
    throw new Error('Требуется оплата за отправку личного сообщения');
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
      const msgs = getChatMessages(username, partner);
      total += msgs.filter(m => m.from === partner && !m.read).length;
    }
  }
  return total;
}

// Удаление личного чата для себя (Telegram style)
function deleteChatForSelf(currentUser, partner) {
  if (!currentUser || !partner) return false;
  const user = AppState.users[currentUser];
  if (!user) return false;
  if (!user.chatDeletedTimestamps || typeof user.chatDeletedTimestamps !== 'object') {
    user.chatDeletedTimestamps = {};
  }
  user.chatDeletedTimestamps[partner] = Date.now();
  saveUsers(currentUser);
  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    FirebaseSync.saveUser(currentUser);
  }
  return true;
}

// Удаление личного чата для обоих участников (Telegram style)
function deleteChatForBoth(user1, user2) {
  if (!user1 || !user2) return false;
  const key = getMessagesKey(user1, user2);
  const oldKey = [String(user1), String(user2)].sort().join('_');
  const directKey1 = `${user1}_${user2}`;
  const directKey2 = `${user2}_${user1}`;

  delete AppState.messages[key];
  delete AppState.messages[oldKey];
  delete AppState.messages[directKey1];
  delete AppState.messages[directKey2];
  saveMessages();

  // Очищаем метки удаления для себя у обоих участников
  if (AppState.users[user1]?.chatDeletedTimestamps?.[user2]) {
    delete AppState.users[user1].chatDeletedTimestamps[user2];
  }
  if (AppState.users[user2]?.chatDeletedTimestamps?.[user1]) {
    delete AppState.users[user2].chatDeletedTimestamps[user1];
  }

  // Очищаем платный доступ и разблокировки при полном удалении переписки
  if (AppState.users[user1]?.paidDmUsers) {
    AppState.users[user1].paidDmUsers = AppState.users[user1].paidDmUsers.filter(u => u !== user2);
  }
  if (AppState.users[user2]?.paidDmUsers) {
    AppState.users[user2].paidDmUsers = AppState.users[user2].paidDmUsers.filter(u => u !== user1);
  }
  if (AppState.users[user1]?.unlockedDms) {
    AppState.users[user1].unlockedDms = AppState.users[user1].unlockedDms.filter(u => u !== user2);
  }
  if (AppState.users[user2]?.unlockedDms) {
    AppState.users[user2].unlockedDms = AppState.users[user2].unlockedDms.filter(u => u !== user1);
  }

  saveUsers(user1);
  saveUsers(user2);

  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.initialized) {
    FirebaseSync.deleteDirectChat(key);
    if (oldKey !== key) {
      FirebaseSync.deleteDirectChat(oldKey);
    }
    FirebaseSync.deleteDirectChat(directKey1);
    FirebaseSync.deleteDirectChat(directKey2);
    FirebaseSync.saveUser(user1, true);
    FirebaseSync.saveUser(user2, true);
  }
  return true;
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
  document.querySelectorAll('.theme-card, .settings-theme-card, .custom-theme-card').forEach(c => {
    c.classList.toggle('active', c.dataset.theme === currentTheme || c.dataset.themeId === currentTheme);
  });

  if (typeof createParticles === 'function') {
    createParticles(currentTheme);
  }

  if (typeof renderSettingsCustomization === 'function') {
    renderSettingsCustomization();
  }
}

