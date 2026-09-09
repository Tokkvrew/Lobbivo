// ============================================================
//  LOBBIVO CLOUD FIREBASE SYNC (REALTIME DATABASE)
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCOLXDaP3artfXx0-2teOkiP_S1nW3w35w",
  authDomain: "lobbivo.firebaseapp.com",
  databaseURL: "https://lobbivo-default-rtdb.firebaseio.com",
  projectId: "lobbivo",
  storageBucket: "lobbivo.firebasestorage.app",
  messagingSenderId: "440005878748",
  appId: "1:440005878748:web:9baa26f6dd3218a3fbe519",
  measurementId: "G-1XKZ9KQ1F8"
};

const FirebaseSync = {
  initialized: false,
  rtdb: null,

  init() {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK не загружен. Работа в режиме оффлайн LocalStorage.');
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      
      this.rtdb = firebase.database();
      this.initialized = true;

      this.initListeners();
      this.pruneWorldMessages(500);

      if (AppState.currentUser) {
        this.startPresenceHeartbeat(AppState.currentUser);
      }
    } catch (err) {
      console.warn('Ошибка подключения Firebase Realtime Database:', err);
    }
  },

  initListeners() {
    if (!this.initialized || !this.rtdb) return;

    // 1. Слушатель пользователей (все аккаунты и анкеты синхронизируются онлайн)
    try {
      this.rtdb.ref('users').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && typeof data === 'object') {
          // Мягкое слияние облачных данных с локальным состоянием
          for (const username of Object.keys(data)) {
            if (username && data[username]) {
              const cloudUser = data[username];
              if (!Array.isArray(cloudUser.squads)) {
                cloudUser.squads = [];
              }
              AppState.users[username] = {
                ...AppState.users[username],
                ...cloudUser
              };
            }
          }

          try {
            localStorage.setItem('squad_users', JSON.stringify(AppState.users));
          } catch (e) {}

          // Проверяем, не получил ли текущий авторизованный пользователь бан онлайн
          if (AppState.currentUser && typeof isUserBanned === 'function' && isUserBanned(AppState.currentUser)) {
            if (typeof handleBannedUserKickout === 'function') {
              handleBannedUserKickout(AppState.currentUser);
            }
          }

          if (typeof updateUI === 'function') updateUI();
          if (typeof updateGameCounts === 'function') updateGameCounts();
          if (typeof renderProfile === 'function' && AppState.currentUser) renderProfile();
          if (typeof updateAdminBadges === 'function') updateAdminBadges();
        }
      }, (error) => {
        console.warn('Realtime DB users notice (проверьте Rules):', error.message);
      });
    } catch (e) {
      console.warn('Users listener setup failed:', e);
    }

    // 2. Слушатель мирового чата (сообщения приходят онлайн в реальном времени, лимит 500)
    try {
      this.rtdb.ref('worldMessages').limitToLast(500).on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && typeof data === 'object') {
          const messages = Object.values(data).sort((a, b) => (a.time || 0) - (b.time || 0));
          AppState.worldMessages = messages.slice(-500);
          try {
            localStorage.setItem('squad_world_messages', JSON.stringify(AppState.worldMessages));
          } catch (e) {}

          if (typeof renderWorldChat === 'function' && AppState.activeChatTab === 'world') {
            renderWorldChat();
          }
        } else {
          AppState.worldMessages = [];
          if (typeof renderWorldChat === 'function' && AppState.activeChatTab === 'world') {
            renderWorldChat();
          }
        }
      }, (error) => {
        console.warn('Realtime DB worldMessages notice:', error.message);
      });
    } catch (e) {
      console.warn('World messages listener setup failed:', e);
    }

    // 3. Слушатель личных сообщений (диалоги приходят моментально + Push-уведомления)
    let _directMsgInitialLoadDone = false;
    const _seenDirectMsgKeys = new Set();

    try {
      this.rtdb.ref('directMessages').on('value', (snapshot) => {
        const data = snapshot.val();
        const incomingPushQueue = [];

        if (data && typeof data === 'object') {
          for (const key of Object.keys(data)) {
            if (key && data[key] && Array.isArray(data[key].messages)) {
              AppState.messages[key] = data[key].messages;

              // Отслеживаем новые сообщения для отправки Push-уведомлений
              for (const msg of data[key].messages) {
                const uniqueKey = msg.id || `${key}_${msg.time}_${msg.text}`;
                if (!_seenDirectMsgKeys.has(uniqueKey)) {
                  _seenDirectMsgKeys.add(uniqueKey);
                  if (_directMsgInitialLoadDone && AppState.currentUser && msg.to === AppState.currentUser && msg.from !== AppState.currentUser) {
                    incomingPushQueue.push(msg);
                  }
                }
              }
            }
          }

          _directMsgInitialLoadDone = true;

          try {
            localStorage.setItem('squad_messages', JSON.stringify(AppState.messages));
          } catch (e) {}

          // Если пришло новое входящее сообщение в ЛС, вызываем Push-уведомление
          if (incomingPushQueue.length > 0) {
            const latestMsg = incomingPushQueue[incomingPushQueue.length - 1];
            const isLookingAtChat = !document.hidden && 
                                    typeof isChatOpen !== 'undefined' && isChatOpen && 
                                    typeof isInChat !== 'undefined' && isInChat && 
                                    AppState.chatPartner === latestMsg.from;
            if (!isLookingAtChat && typeof sendWebPushNotification === 'function') {
              sendWebPushNotification(latestMsg.from, latestMsg.text);
            }
          }

          // Если сейчас открыт диалог с собеседником, мгновенно помечаем входящие прочитанными
          if (typeof isChatOpen !== 'undefined' && isChatOpen && 
              typeof isInChat !== 'undefined' && isInChat && 
              AppState.currentUser && AppState.chatPartner) {
            if (typeof markMessagesAsRead === 'function') {
              markMessagesAsRead(AppState.currentUser, AppState.chatPartner);
            }
          }

          if (typeof updateChatList === 'function') updateChatList();
          if (typeof updateChatBadge === 'function') updateChatBadge();
          if (typeof renderChatMessages === 'function' && AppState.chatPartner) {
            renderChatMessages();
          }
        }
      }, (error) => {
        console.warn('Realtime DB directMessages notice:', error.message);
      });
    } catch (e) {
      console.warn('Direct messages listener setup failed:', e);
    }

    // 4. Слушатель статуса набора текста в мировом чате
    try {
      this.rtdb.ref('typing/world').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        AppState.typingUsers.world = data;
        if (typeof renderWorldTypingIndicator === 'function') {
          renderWorldTypingIndicator();
        }
      });
    } catch (e) {
      console.warn('World typing listener setup failed:', e);
    }

    // 5. Слушатель статуса набора текста в личных чатах
    try {
      this.rtdb.ref('typing/direct').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        AppState.typingUsers.direct = data;
        if (typeof renderDirectTypingIndicator === 'function') {
          renderDirectTypingIndicator();
        }
        if (typeof updateChatList === 'function') {
          updateChatList();
        }
      });
    } catch (e) {
      console.warn('Direct typing listener setup failed:', e);
    }

    // 6. Слушатель жалоб (实时同步 для админ-панели)
    try {
      this.rtdb.ref('complaints').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && typeof data === 'object') {
          AppState.complaints = Object.values(data).sort((a, b) => (b.id || 0) - (a.id || 0));
        } else {
          AppState.complaints = [];
        }
        try {
          localStorage.setItem('squad_complaints', JSON.stringify(AppState.complaints));
        } catch (e) {}

        if (typeof updateAdminBadges === 'function') updateAdminBadges();
        if (typeof renderAdminComplaints === 'function') renderAdminComplaints();
      }, (error) => {
        console.warn('Realtime DB complaints notice:', error.message);
      });
    } catch (e) {
      console.warn('Complaints listener setup failed:', e);
    }
  },

  _userSaveTimers: {},
  _heartbeatInterval: null,

  // Запуск постоянного онлайн-хартбита для активного пользователя
  startPresenceHeartbeat(username) {
    if (!this.initialized || !this.rtdb || !username) return;
    const userRef = this.rtdb.ref('users/' + username);

    const now = Date.now();
    userRef.child('lastSeen').set(now);
    userRef.child('isOnline').set(true);

    try {
      userRef.child('isOnline').onDisconnect().set(false);
      userRef.child('lastSeen').onDisconnect().set(firebase.database.ServerValue.TIMESTAMP || Date.now());
    } catch (e) {}

    if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);
    this._heartbeatInterval = setInterval(() => {
      if (AppState.currentUser === username && this.initialized && this.rtdb) {
        userRef.child('lastSeen').set(Date.now());
        userRef.child('isOnline').set(true);
      }
    }, 25000);
  },

  // Отправка статуса "печатает..." в Realtime DB
  setTyping(scope, key, username, isTyping) {
    if (!this.initialized || !this.rtdb || !username) return;
    try {
      if (scope === 'world') {
        const ref = this.rtdb.ref('typing/world/' + username);
        if (isTyping) {
          ref.set(Date.now());
        } else {
          ref.remove();
        }
      } else if (scope === 'direct' && key) {
        const ref = this.rtdb.ref('typing/direct/' + key + '/' + username);
        if (isTyping) {
          ref.set(Date.now());
        } else {
          ref.remove();
        }
      }
    } catch (e) {}
  },

  // Сохранение пользователя в облако с дебаунсом (или немедленно)
  saveUser(username, immediate = false) {
    if (!this.initialized || !this.rtdb || !username) return;
    const userData = AppState.users[username];
    if (!userData) return;

    if (this._userSaveTimers[username]) {
      clearTimeout(this._userSaveTimers[username]);
      delete this._userSaveTimers[username];
    }

    const executeSave = () => {
      try {
        const payload = JSON.parse(JSON.stringify(userData));
        if (!Array.isArray(payload.squads) || payload.squads.length === 0) {
          payload.squads = [];
          payload.lookingForTeam = false;
          payload.hasCreatedSquad = false;
        }
        this.rtdb.ref('users/' + username).set(payload)
          .catch(err => console.warn('Cloud save user error:', err.message));
      } catch (err) {
        console.warn('Cloud save user exception:', err);
      }
    };

    if (immediate) {
      executeSave();
    } else {
      this._userSaveTimers[username] = setTimeout(executeSave, 250);
    }
  },

  // Сохранение всех пользователей в облако
  saveAllUsers() {
    if (!this.initialized || !this.rtdb) return;
    for (const username of Object.keys(AppState.users)) {
      this.saveUser(username);
    }
  },

  // Удаление пользователя из облака
  deleteUser(username) {
    if (!this.initialized || !this.rtdb || !username) return;
    try {
      this.rtdb.ref('users/' + username).remove()
        .catch(err => console.warn('Cloud delete user error:', err.message));
    } catch (err) {
      console.warn('Cloud delete user exception:', err);
    }
  },

  _pruneTimer: null,

  // Автоочистка хоста: если сообщений в мировом чате больше 500, удаляем самые старые из Firebase RTDB
  pruneWorldMessages(maxLimit = 500) {
    if (!this.initialized || !this.rtdb) return;
    if (this._pruneTimer) clearTimeout(this._pruneTimer);
    this._pruneTimer = setTimeout(() => {
      try {
        this.rtdb.ref('worldMessages').orderByChild('time').once('value', (snapshot) => {
          const total = snapshot.numChildren();
          if (total > maxLimit) {
            const deleteCount = total - maxLimit;
            let deleted = 0;
            const updates = {};
            snapshot.forEach((childSnap) => {
              if (deleted < deleteCount) {
                updates[childSnap.key] = null;
                deleted++;
              }
            });
            if (Object.keys(updates).length > 0) {
              this.rtdb.ref('worldMessages').update(updates)
                .catch(err => console.warn('World messages prune error:', err.message));
            }
          }
        });
      } catch (e) {
        console.warn('Prune world messages exception:', e);
      }
    }, 1200);
  },

  // Отправка сообщения в мировой чат
  sendWorldMessage(msg) {
    if (!this.initialized || !this.rtdb || !msg || !msg.id) return;
    try {
      this.rtdb.ref('worldMessages/' + msg.id).set(msg)
        .then(() => {
          this.pruneWorldMessages(500);
        })
        .catch(err => console.warn('Cloud send world msg error:', err.message));
    } catch (err) {
      console.warn('Cloud send world msg exception:', err);
    }
  },

  // Сохранение диалога в облако
  saveDirectChat(key) {
    if (!this.initialized || !this.rtdb || !key) return;
    const msgs = AppState.messages[key] || [];
    try {
      this.rtdb.ref('directMessages/' + key).set({
        messages: msgs,
        updatedAt: Date.now()
      }).catch(err => console.warn('Cloud save direct chat error:', err.message));
    } catch (err) {
      console.warn('Cloud save direct chat exception:', err);
    }
  },

  // Удаление личного чата для обоих участников в облаке
  deleteDirectChat(key) {
    if (!this.initialized || !this.rtdb || !key) return;
    try {
      this.rtdb.ref('directMessages/' + key).remove()
        .catch(err => console.warn('Cloud delete direct chat error:', err.message));
    } catch (err) {
      console.warn('Cloud delete direct chat exception:', err);
    }
  },

  // Сохранение жалобы в облако
  saveComplaint(complaint) {
    if (!this.initialized || !this.rtdb || !complaint || !complaint.id) return;
    try {
      this.rtdb.ref('complaints/' + complaint.id).set(complaint)
        .catch(err => console.warn('Cloud save complaint error:', err.message));
    } catch (err) {
      console.warn('Cloud save complaint exception:', err);
    }
  },

  // Удаление сообщения из мирового чата модератором
  deleteWorldMessage(msgId) {
    if (!this.initialized || !this.rtdb || !msgId) return;
    try {
      this.rtdb.ref('worldMessages/' + msgId).remove()
        .catch(err => console.warn('Cloud delete world msg error:', err.message));
    } catch (err) {
      console.warn('Cloud delete world msg exception:', err);
    }
  },

  // Удаление / закрытие жалобы модератором
  deleteComplaint(complaintId) {
    if (!this.initialized || !this.rtdb || !complaintId) return;
    try {
      this.rtdb.ref('complaints/' + complaintId).remove()
        .catch(err => console.warn('Cloud delete complaint error:', err.message));
    } catch (err) {
      console.warn('Cloud delete complaint exception:', err);
    }
  }
};
