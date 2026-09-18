const fs = require('fs');

global.window = { ...global, addEventListener: () => {} };
global.document = {
  getElementById: (id) => ({
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    style: {},
    innerHTML: '',
    textContent: '',
    querySelectorAll: () => [],
    querySelector: () => null,
    setAttribute: () => {},
    addEventListener: () => {}
  }),
  querySelectorAll: () => [],
  documentElement: { getAttribute: () => 'default' },
  addEventListener: () => {}
};
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, val) { this.store[key] = String(val); },
  removeItem(key) { delete this.store[key]; }
};
global.navigator = { clipboard: { writeText: () => Promise.resolve() } };

// Инициализация AppState
global.AppState = {
  currentUser: 'tester',
  users: {
    tester: {
      username: 'tester',
      name: 'Тестер',
      role: 'ceo',
      isAdmin: true,
      squads: [
        { id: 'sq_1', game: 'csgo', rank: 'Global', active: true, createdAt: 1000 }
      ],
      coins: 100,
      karma: 5
    },
    vip_player_1: {
      username: 'vip_player_1',
      name: 'VIP 1',
      squads: [
        { id: 'sq_v1', game: 'dota2', rank: 'Immortal', active: true, pinnedInChat: true, createdAt: 2000 }
      ],
      vipSquadBoostUntil: Date.now() + 1000000
    },
    vip_player_2: {
      username: 'vip_player_2',
      name: 'VIP 2',
      squads: [
        { id: 'sq_v2', game: 'valorant', rank: 'Radiant', active: true, pinnedInChat: true, createdAt: 3000 }
      ],
      vipSquadBoostUntil: Date.now() + 1000000
    },
    bad_guy: {
      username: 'bad_guy',
      name: 'Нарушитель',
      squads: []
    }
  },
  complaints: [
    { id: 'comp_1', target: 'bad_guy', from: 'tester', reason: 'Оскорбления', time: Date.now() }
  ],
  worldMessages: []
};

global.localStorage.setItem('squad_users', JSON.stringify(global.AppState.users));
global.localStorage.setItem('squad_complaints', JSON.stringify(global.AppState.complaints));

// Хелперы
global.escapeHtml = s => String(s);
global.showNotification = (title, desc) => { /* console.log(`[Notification] ${title}: ${desc}`); */ };
global.showAuthModal = () => {};
global.playCyberSound = () => {};
global.triggerHaptic = () => {};
// global.saveUsers = () => {};
// global.saveComplaints = () => {};
global.isUserCEO = (u) => global.AppState.users[u]?.role === 'ceo';
global.isUserAdmin = (u) => global.AppState.users[u]?.isAdmin === true;
global.canAdminPunishTarget = () => true;
global.isSquadVipBoosted = (u) => Boolean(AppState.users[u]?.vipSquadBoostUntil > Date.now());
global.isUserPremium = () => false;
global.isUserOnline = () => true;
global.getUserEquippedFrame = () => 'none';
global.getUserNameClass = () => '';
global.DEVICE_ICONS = { PC: 'icon-device-pc', Console: 'icon-device-console', Mobile: 'icon-device-mobile' };
global.getDeviceIconSVG = (device) => global.DEVICE_ICONS[device] || 'icon-device-pc';
global.GAMES = [{ id: 'csgo', name: 'CS 2', icon: 'icon-csgo' }, { id: 'dota2', name: 'Dota 2', icon: 'icon-dota2' }];

// Загружаем скрипты
const dataCode = fs.readFileSync('js/data.js', 'utf8');
eval(dataCode.replace(/const /g, 'global.').replace(/let /g, 'global.'));

const storageCode = fs.readFileSync('js/storage.js', 'utf8')
  .replace('const AppState =', 'var AppState = global.AppState =');
eval(storageCode);
// Восстанавливаем данные тестов
AppState.currentUser = 'tester';
AppState.users = JSON.parse(localStorage.getItem('squad_users'));
AppState.complaints = JSON.parse(localStorage.getItem('squad_complaints'));
loadUsers();
loadComplaints();

const retentionCode = fs.readFileSync('js/retention.js', 'utf8');
global.RetentionEngine = eval(retentionCode + '; RetentionEngine;');

const gamesCode = fs.readFileSync('js/games.js', 'utf8');
eval(gamesCode);

const chatCode = fs.readFileSync('js/chat.js', 'utf8');
eval(chatCode);

console.log('--- ТЕСТ 1: Срочный сбор ---');
const tester = AppState.users.tester;
console.log('До включения urgentUntil:', tester.urgentUntil);
RetentionEngine.toggleFastMatch();
console.log('После включения urgentUntil:', tester.urgentUntil);
if (tester.urgentUntil > Date.now()) {
  console.log('✓ ТЕСТ 1.1 ПРОЙДЕН: Срочный сбор успешно включен на 2 часа!');
} else {
  throw new Error('Срочный сбор не включился!');
}

console.log('Проверка сортировки:');
const cards = [
  { username: 'vip_player_1', squad: AppState.users.vip_player_1.squads[0], isMe: false },
  { username: 'tester', squad: tester.squads[0], isMe: true }
];

cards.sort((a, b) => {
  const urgA = (typeof RetentionEngine !== 'undefined' && RetentionEngine.isUrgent(a.squad, a.username)) ? 1 : 0;
  const urgB = (typeof RetentionEngine !== 'undefined' && RetentionEngine.isUrgent(b.squad, b.username)) ? 1 : 0;
  if (urgA !== urgB) return urgB - urgA;

  const boostA = isSquadVipBoosted(a.username) ? 1 : 0;
  const boostB = isSquadVipBoosted(b.username) ? 1 : 0;
  if (boostA !== boostB) return boostB - boostA;
  return 0;
});

console.log('Первый в списке:', cards[0].username);
if (cards[0].username === 'tester') {
  console.log('✓ ТЕСТ 1.2 ПРОЙДЕН: Анкета со срочным сбором поднялась на 1 место выше VIP!');
} else {
  throw new Error('Анкета не поднялась на первое место!');
}

console.log('--- ТЕСТ 2: Ротация VIP закрепов в чате ---');
const candidates = collectVipPinnedCandidates();
console.log('Найдено закрепленных VIP анкет:', candidates.length);
if (candidates.length >= 2) {
  console.log('✓ ТЕСТ 2.1 ПРОЙДЕН: Собраны анкеты всех VIP пользователей (найдено:', candidates.map(c => c.username).join(', '), ')');
} else {
  throw new Error('Кандидаты VIP не собраны!');
}

console.log('--- ТЕСТ 3: Авто-удаление жалобы при бане ---');
console.log('tester user:', AppState.users.tester);
console.log('isUserCEO tester:', isUserCEO('tester'));
console.log('Жалоб до бана:', AppState.complaints.length);
console.log('u:', AppState.users['bad_guy']);
console.log('actor:', AppState.currentUser);
console.log('Жалоб до бана:', JSON.stringify(AppState.complaints));
const res = banUser('bad_guy', 60, 'Нарушение правил');
console.log('Результат banUser:', res);
console.log('Жалоб после бана нарушителя bad_guy:', JSON.stringify(AppState.complaints));
if (AppState.complaints.length === 0) {
  console.log('✓ ТЕСТ 3.1 ПРОЙДЕН: Жалоба на забаненного нарушителя автоматически удалена!');
} else {
  throw new Error('Жалоба не удалилась!');
}

// Тест авто-удаления при муте
AppState.complaints.push({ id: 'comp_2', target: 'bad_guy_2', from: 'tester', reason: 'Флуд' });
AppState.users.bad_guy_2 = { username: 'bad_guy_2' };
console.log('Жалоб до мута:', AppState.complaints.length);
muteUser('bad_guy_2', 15, 'Спам');
console.log('Жалоб после мута:', AppState.complaints.length);
if (AppState.complaints.length === 0) {
  console.log('✓ ТЕСТ 3.2 ПРОЙДЕН: Жалоба на замьюченного нарушителя автоматически удалена!');
} else {
  throw new Error('Жалоба при муте не удалилась!');
}

console.log('\n========================================');
console.log(' ВСЕ АВТОМАТИЧЕСКИЕ ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ!');
console.log('========================================');
