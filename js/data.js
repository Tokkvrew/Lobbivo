// ============================================================
//  ДАННЫЕ ПРИЛОЖЕНИЯ (GAMES, DEVICES, TEST USERS)
// ============================================================

const GAME_CATEGORIES = [
  { id: 'popular', name: 'Популярное', icon: 'icon-flame', desc: 'Топ 7 главных игр платформы' },
  { id: 'competitive', name: 'Киберспорт и Рейтинг', icon: 'icon-trophy', desc: 'CS 2, Dota 2, Valorant' },
  { id: 'sandbox', name: 'Песочницы и Кооп', icon: 'icon-blocks', desc: 'Minecraft, Roblox' },
  { id: 'action_rp', name: 'Экшен, Баттл-Рояль и RP', icon: 'icon-bolt-fast', desc: 'Fortnite, GTA V Online/RP' },
  { id: 'all', name: 'Все игры (25+)', icon: 'icon-game', desc: 'Полный каталог всех игр' }
];

const GAMES = [
  // 7 ГЛАВНЫХ ИГР ПЛАТФОРМЫ
  { id: 'csgo', name: 'CS 2', icon: 'icon-csgo', image: 'assets/images/games/csgo.jpg', btnTheme: 'cyan', glow: '#00d4ff', category: 'competitive', featured: true, tagLine: 'Premier, Faceit, Matchmaking' },
  { id: 'dota2', name: 'Dota 2', icon: 'icon-dota2', image: 'assets/images/games/dota2.jpg', btnTheme: 'red', glow: '#ff4444', category: 'competitive', featured: true, tagLine: 'Позиции 1-5, Ранги, Battle Cup' },
  { id: 'valorant', name: 'Valorant', icon: 'icon-valorant', image: 'assets/images/games/valorant.jpg', btnTheme: 'cyan', glow: '#00d4ff', category: 'competitive', featured: true, tagLine: 'Рейтинг, Дуэлянты, Смокеры' },
  { id: 'minecraft', name: 'Minecraft', icon: 'icon-minecraft', image: 'assets/images/games/minecraft.jpg', btnTheme: 'cyan', glow: '#00d4ff', category: 'sandbox', featured: true, tagLine: 'Ванилла, Сборки модов, Сервера' },
  { id: 'roblox', name: 'Roblox', icon: 'icon-roblox', image: 'assets/images/games/roblox.jpg', btnTheme: 'red', glow: '#e2231a', category: 'sandbox', featured: true, tagLine: 'Blox Fruits, Doors, Tower Defense' },
  { id: 'fortnite', name: 'Fortnite', icon: 'icon-fortnite', image: 'assets/images/games/fortnite.jpg', btnTheme: 'cyan', glow: '#00d4ff', category: 'action_rp', featured: true, tagLine: 'Zero Build (Без стройки), Рейтинг' },
  { id: 'gta5', name: 'GTA V / RP', icon: 'icon-gta5', image: 'assets/images/games/gta5.jpg', btnTheme: 'cyan', glow: '#00d4ff', category: 'action_rp', featured: true, tagLine: 'Majestic RP, Radmir, Ограбления' },

  // ОСТАЛЬНЫЕ 18+ ПОПУЛЯРНЫХ ОНЛАЙН-ИГР
  { id: 'rust', name: 'Rust', icon: 'icon-rust', image: 'assets/images/games/rust.jpg', btnTheme: 'gold', glow: '#e5a93c', category: 'sandbox', tagLine: 'Вайпы, Кланы, Выживание' },
  { id: 'apex', name: 'Apex Legends', icon: 'icon-apex', image: 'assets/images/games/apex.jpg', btnTheme: 'gold', glow: '#e5a93c', category: 'action_rp', tagLine: 'Рейтинг, Трио, Сквады' },
  { id: 'pubg', name: 'PUBG', icon: 'icon-pubg', image: 'assets/images/games/pubg.jpg', btnTheme: 'gold', glow: '#e5a93c', category: 'action_rp', tagLine: 'Сквады, Дуо, Рейтинг' },
  { id: 'warzone', name: 'Warzone', icon: 'icon-warzone', image: 'assets/images/games/warzone.jpg', btnTheme: 'gold', glow: '#e5a93c', category: 'action_rp', tagLine: 'Королевская битва, Возрождение' },
  { id: 'rainbow', name: 'R6 Siege', icon: 'icon-rainbow', image: 'assets/images/games/rainbow.jpg', btnTheme: 'gold', glow: '#e5a93c', category: 'competitive', tagLine: 'Тактика, Рейтинг, Оперативники' },
  { id: 'overwatch', name: 'Overwatch 2', icon: 'icon-overwatch', image: 'assets/images/games/overwatch.jpg', btnTheme: 'gold', glow: '#e5a93c', category: 'competitive', tagLine: 'Танки, ДПС, Саппорты' },
  { id: 'league', name: 'League of Legends', icon: 'icon-league', image: 'assets/images/games/league.jpg', btnTheme: 'cyan', glow: '#00d4ff', category: 'competitive', tagLine: 'Solo/Duo, Flex, ARAM' },
  { id: 'tarkov', name: 'Escape from Tarkov', icon: 'icon-tarkov', image: 'assets/images/games/tarkov.jpg', btnTheme: 'gold', glow: '#e5a93c', category: 'action_rp', tagLine: 'Рейды, ЧВК, Лут' },
  { id: 'deadlock', name: 'Deadlock', icon: 'icon-deadlock', image: 'assets/images/games/deadlock.jpg', btnTheme: 'red', glow: '#ff4655', category: 'competitive', tagLine: 'Valve MOBA-Шутер' },
  { id: 'marvel', name: 'Marvel Rivals', icon: 'icon-marvel', image: 'assets/images/games/marvel.jpg', btnTheme: 'cyan', glow: '#00d4ff', category: 'competitive', tagLine: 'Супергеройский шутер 6v6' },
  { id: 'rocket', name: 'Rocket League', icon: 'icon-rocket', image: 'assets/images/games/rocket.jpg', btnTheme: 'cyan', glow: '#00d4ff', category: 'competitive', tagLine: '2v2, 3v3, Рейтинг' },
  { id: 'destiny', name: 'Destiny 2', icon: 'icon-destiny', image: 'assets/images/games/destiny.jpg', btnTheme: 'cyan', glow: '#00d4ff', category: 'action_rp', tagLine: 'Рейды, Подземелья, Горнило' },
  { id: 'wow', name: 'World of Warcraft', icon: 'icon-wow', image: 'assets/images/games/wow.jpg', btnTheme: 'gold', glow: '#e5a93c', category: 'sandbox', tagLine: 'Мифик+, Рейды, Арена' },
  { id: 'thefinals', name: 'The Finals', icon: 'icon-thefinals', image: 'assets/images/games/thefinals.jpg', btnTheme: 'red', glow: '#ff4444', category: 'action_rp', tagLine: 'Турниры, Разрушения' },
  { id: 'readyornot', name: 'Ready or Not', icon: 'icon-readyornot', image: 'assets/images/games/readyornot.jpg', btnTheme: 'gold', glow: '#e5a93c', category: 'action_rp', tagLine: 'Тактический SWAT Кооп' },
  { id: 'helldivers2', name: 'Helldivers 2', icon: 'icon-helldivers2', image: 'assets/images/games/helldivers2.jpg', btnTheme: 'gold', glow: '#e5a93c', category: 'action_rp', tagLine: 'Демократия, Кооп 4 игрока' },
  { id: 'palworld', name: 'Palworld', icon: 'icon-palworld', image: 'assets/images/games/palworld.jpg', btnTheme: 'cyan', glow: '#00d4ff', category: 'sandbox', tagLine: 'Выживание, База, Палы' },
  { id: 'bg3', name: 'Baldur\'s Gate 3', icon: 'icon-bg3', image: 'assets/images/games/bg3.jpg', btnTheme: 'gold', glow: '#e5a93c', category: 'sandbox', tagLine: 'Кооперативная RPG' },
  { id: 'xdefiant', name: 'XDefiant', icon: 'icon-xdefiant', image: 'assets/images/games/xdefiant.jpg', btnTheme: 'gold', glow: '#e5a93c', category: 'competitive', tagLine: 'Аркадный шутер' }
];

const GAME_SPECIFIC_PRESETS = {
  csgo: {
    ranks: ['Premier <10k', 'Premier 10-15k', 'Premier 15-20k', 'Premier 20k+', 'Faceit 1-3 lvl', 'Faceit 4-7 lvl', 'Faceit 8-10 lvl', 'Silver - Gold Nova', 'Master Guardian - Global'],
    tags: ['Снайпер (AWP)', 'Опорник', 'Капитан (IGL)', 'Люркер', 'Прайм статус', 'Только 18+', 'Без тильта', 'Ищу стак']
  },
  dota2: {
    ranks: ['Рекрут - Страж', 'Рыцарь - Герой', 'Легенда - Властелин', 'Божество', 'Титан (Immortal)', 'Калибровка / Без рейтинга'],
    tags: ['Pos 1 (Керри)', 'Pos 2 (Мид)', 'Pos 3 (Хард)', 'Pos 4 (Семи-сапп)', 'Pos 5 (Фулл-сапп)', 'Battle Cup', 'Турбо', 'Без токсичности']
  },
  valorant: {
    ranks: ['Iron - Bronze', 'Silver - Gold', 'Platinum - Diamond', 'Ascendant - Immortal', 'Radiant', 'Без рейтинга'],
    tags: ['Дуэлянт', 'Смокер (Контроллер)', 'Инициатор', 'Страж (Sentinel)', 'С микрофоном', 'Premier режим', 'Chill катки']
  },
  minecraft: {
    ranks: ['Ванильное выживание', 'Сборка с модами (Create/Tech)', 'Сборка с магией/RPG', 'Хардкор / RLCraft', 'Hypixel (Bedwars/Skywars)', 'Анархия (2b2t/HolyWorld)', 'Свой приватный сервер'],
    tags: ['Свой сервер', 'С модами', 'Ванилла', '18+', 'Ламповый войс', 'Строительство', 'Технологии', 'Частый онлайн']
  },
  roblox: {
    ranks: ['Blox Fruits (Max lvl / Bounty)', 'Doors (Все бейджи)', 'Tower Defense Simulator', 'Brookhaven / RP', 'Blade Ball', 'Dandy\'s World', 'Любые плейсы'],
    tags: ['Blox Fruits', 'Doors', 'Tower Defense', 'Фарм', 'Голосовой чат', 'Discord связь', 'Вместе веселее']
  },
  fortnite: {
    ranks: ['Zero Build (Без стройки)', 'Классика (Со стройкой)', 'Рейтинг: Bronze - Gold', 'Рейтинг: Plat - Diamond', 'Рейтинг: Elite - Unreal', 'Турниры / Кастомки'],
    tags: ['Zero Build (Без стройки)', 'Ищу Дуо', 'Ищу Трио', 'Ищу Сквад', 'Рейтинг', 'ПК / Консоль', 'С микрофоном']
  },
  gta5: {
    ranks: ['Majestic RP', 'Radmir RP', 'Grand RP', 'GTA Online (Ограбления)', 'GTA Online (Бизнес/Фарм)', 'FiveM Кастомный'],
    tags: ['Majestic RP', 'Radmir RP', 'Ищу семью/банду', 'Ограбления', 'Фарм денег', 'Адекват 18+', 'Постоянный онлайн']
  }
};

const DEVICES = [
  { id: 'PC', name: 'PC', label: 'PC (Компьютер)', desc: 'Windows / Steam / Epic', icon: 'icon-device-pc', color: '#00d4ff' },
  { id: 'PlayStation', name: 'PlayStation', label: 'PlayStation', desc: 'PS5 / PS4 Pro', icon: 'icon-device-playstation', color: '#0066ff' },
  { id: 'Xbox', name: 'Xbox', label: 'Xbox', desc: 'Series X|S / One', icon: 'icon-device-xbox', color: '#107c10' },
  { id: 'Nintendo Switch', name: 'Nintendo Switch', label: 'Nintendo Switch', desc: 'OLED / Lite', icon: 'icon-device-nintendo', color: '#e60012' },
  { id: 'Mobile', name: 'Mobile', label: 'Мобильные', desc: 'iOS / Android', icon: 'icon-device-mobile', color: '#ff44cc' },
  { id: 'Other', name: 'Other', label: 'Другое', desc: 'VR / Steam Deck / Портативные', icon: 'icon-device-other', color: '#b44dff' }
];

const DEVICE_ICONS = {
  'PC': 'icon-device-pc',
  'PlayStation': 'icon-device-playstation',
  'Xbox': 'icon-device-xbox',
  'Nintendo Switch': 'icon-device-nintendo',
  'Mobile': 'icon-device-mobile',
  'Other': 'icon-device-other'
};

const FRAME_DEFINITIONS = [
  { id: 'none', name: 'Без рамки', icon: 'icon-ban', desc: 'Стандартный профиль без эффектов', cost: 0 },
  { id: 'ga_overlord', name: 'CEO Blood-Fire Dominator', icon: 'icon-crown', desc: 'Эксклюзив Владельца и CEO: адская плазма, багрово-золотое лезвие и корона превосходства', cost: 0, gaOnly: true },
  { id: 'fire', name: 'Flame Fury', icon: 'icon-flame', desc: 'Пылающий неоновый огонь', cost: 120 },
  { id: 'cyber', name: 'Cyber Neon', icon: 'icon-cyber', desc: 'Киберпанковое свечение', cost: 140 },
  { id: 'gold', name: 'Imperial Gold', icon: 'icon-crown', desc: 'Золотой ореол императора', cost: 180 },
  { id: 'ice', name: 'Glacier Ice', icon: 'icon-ice', desc: 'Ледяное мерцание кристалла', cost: 120 },
  { id: 'ghost', name: 'Ghost Void', icon: 'icon-ghost', desc: 'Мистическая фиолетовая бездна', cost: 130 }
];

const THEME_DEFINITIONS = [
  { id: 'default', name: 'Neon Cyber', previewClass: 'theme-default-preview', icon: 'icon-sparkles', desc: 'Классический неоново-голубой стиль', cost: 0 },
  { id: 'lobbivo', name: 'Liquid Glass', previewClass: 'theme-lobbivo-preview', icon: 'icon-palette-shop', desc: 'Фирменный фиолетовый кибер-интерфейс', cost: 0 },
  { id: 'nebula', name: 'Deep Nebula', previewClass: 'theme-nebula-preview', icon: 'icon-palette-shop', desc: 'Космический ультра-фиолет и звезды', cost: 80 },
  { id: 'crimson', name: 'Crimson Red', previewClass: 'theme-crimson-preview', icon: 'icon-flame', desc: 'Огненно-бордовый с искрами', cost: 80 },
  { id: 'matrix', name: 'Matrix Emerald', previewClass: 'theme-matrix-preview', icon: 'icon-nodes-menu', desc: 'Изумрудный кибернетический код', cost: 80 }
];