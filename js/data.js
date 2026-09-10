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
  { id: 'none', name: 'Без рамки', icon: 'icon-ban', desc: 'Стандартный профиль без эффектов', cost: 0, tag: 'Базовый' },
  { id: 'ga_overlord', name: 'CEO Blood-Fire Dominator', icon: 'icon-crown', desc: 'Эксклюзив Владельца и CEO: адская плазма, багрово-золотое лезвие и корона превосходства', cost: 0, gaOnly: true, tag: 'CEO EXCLUSIVE' },
  { id: 'fire', name: 'Flame Fury', icon: 'icon-flame', desc: 'Пылающий неоновый огонь с вихрем искр', cost: 120, tag: 'Rare' },
  { id: 'cyber', name: 'Cyber Neon', icon: 'icon-cyber', desc: 'Пульсирующий цианово-фиолетовый неон', cost: 140, tag: 'Rare' },
  { id: 'gold', name: 'Imperial Gold', icon: 'icon-crown', desc: 'Сияющий золотой ореол 24k с лучами', cost: 180, tag: 'Epic' },
  { id: 'ice', name: 'Glacier Frost', icon: 'icon-ice', desc: 'Ледяные морозные кристаллы и иней', cost: 120, tag: 'Rare' },
  { id: 'ghost', name: 'Ghost Void', icon: 'icon-ghost', desc: 'Эфирная мистическая фиолетовая аура', cost: 130, tag: 'Rare' },
  { id: 'synthwave', name: 'Synthwave Sunset', icon: 'icon-sparkles', desc: 'Градиент ретро-заката 80-х, неон маджента-оранж', cost: 250, tag: 'Epic' },
  { id: 'toxic_matrix', name: 'Toxic Biohazard', icon: 'icon-nodes-menu', desc: 'Ядовитый кислотный неоновый пульс', cost: 350, tag: 'Epic' },
  { id: 'plasma_storm', name: 'Plasma Thunder', icon: 'icon-bolt-fast', desc: 'Электрические разряды и фиолетовая плазма', cost: 500, tag: 'Legendary' },
  { id: 'blood_moon', name: 'Blood Moon Eclipse', icon: 'icon-flame', desc: 'Багрово-алое затмение и рубиновый ореол', cost: 750, tag: 'Legendary' },
  { id: 'galaxy_nebula', name: 'Galaxy Nebula', icon: 'icon-sparkles', desc: 'Глубокий космос, звездная пыль и ультрамарин', cost: 1200, tag: 'Mythic' },
  { id: 'prism_hologram', name: 'Chroma Hologram', icon: 'icon-sparkles', desc: 'Радужная переливающаяся хрома-голограмма', cost: 2000, tag: 'Mythic' },
  { id: 'dragon_emperor', name: 'Dragon Emperor', icon: 'icon-crown', desc: 'Драконье пламя, кружащиеся огненные угли и золотая чешуя', cost: 5000, tag: 'ULTRA MYTHIC' },
  { id: 'quantum_singularity', name: 'Quantum Singularity', icon: 'icon-sparkles', desc: 'Горизонт событий, квантовый пространственный вихрь и хрома-плазма', cost: 10000, tag: 'CELESTIAL PRESTIGE' }
];

const THEME_DEFINITIONS = [
  { id: 'default', name: 'Neon Cyber', previewClass: 'theme-default-preview', icon: 'icon-sparkles', desc: 'Классический неоново-голубой стиль', cost: 0 },
  { id: 'lobbivo', name: 'Liquid Glass', previewClass: 'theme-lobbivo-preview', icon: 'icon-palette-shop', desc: 'Фирменный фиолетовый кибер-интерфейс', cost: 0 },
  { id: 'nebula', name: 'Deep Nebula', previewClass: 'theme-nebula-preview', icon: 'icon-palette-shop', desc: 'Космический ультра-фиолет и звезды', cost: 80 },
  { id: 'crimson', name: 'Crimson Red', previewClass: 'theme-crimson-preview', icon: 'icon-flame', desc: 'Огненно-бордовый с искрами', cost: 80 },
  { id: 'matrix', name: 'Matrix Emerald', previewClass: 'theme-matrix-preview', icon: 'icon-nodes-menu', desc: 'Изумрудный кибернетический код', cost: 80 }
];

const NAME_STYLE_DEFINITIONS = [
  { id: 'default', name: 'Стандартный', desc: 'Классический цвет никнейма', cost: 0, previewClass: 'name-style-default', tag: 'Базовый' },
  { id: 'neon_cyan', name: 'Neon Cyber Cyan', desc: 'Электрический циановый неон', cost: 150, previewClass: 'name-style-neon-cyan', tag: 'Rare' },
  { id: 'toxic_lime', name: 'Toxic Acid Lime', desc: 'Ядовито-зеленый кислотный градиент', cost: 200, previewClass: 'name-style-toxic-lime', tag: 'Rare' },
  { id: 'sunset_fire', name: 'Sunset Ember Glow', desc: 'Теплый пылающий закатный градиент', cost: 300, previewClass: 'name-style-sunset-fire', tag: 'Epic' },
  { id: 'ice_frost', name: 'Glacier Diamond Ice', desc: 'Ледяной кристаллический градиент', cost: 400, previewClass: 'name-style-ice-frost', tag: 'Epic' },
  { id: 'royal_gold', name: 'Gilded Royal Gold', desc: 'Роскошное сияющее 24k золото', cost: 600, previewClass: 'name-style-royal-gold', tag: 'Legendary' },
  { id: 'chroma_hologram', name: 'Hologram Prism', desc: 'Анимированный радужный перелив', cost: 1000, previewClass: 'name-style-chroma-hologram', tag: 'Legendary' },
  { id: 'cosmic_quasar', name: 'Cosmic Quasar Nebula', desc: 'Ультра-фиолетовый квазар с мерцанием звезд', cost: 2500, previewClass: 'name-style-cosmic-quasar', tag: 'Mythic' },
  { id: 'phoenix_flame', name: 'Phoenix Mythic Fire', desc: 'Яростное пламя феникса с живым огненным переливом', cost: 5000, previewClass: 'name-style-phoenix-flame', tag: 'ULTRA MYTHIC' },
  { id: 'void_singularity', name: 'Void Singularity Eclipse', desc: 'Глубокая черная дыра с хроматическим ореолом', cost: 8000, previewClass: 'name-style-void-singularity', tag: 'CELESTIAL' }
];

const MINI_BG_DEFINITIONS = [
  { id: 'default', name: 'Obsidian Cyber Stealth', desc: 'Базовый тёмно-графитовый интерфейс с матовым стеклом', cost: 0, previewClass: 'mini-bg-default', tag: 'Базовый' },
  { id: 'retrowave_grid', name: 'Retro Neon Synthwave', desc: 'Неоновая кибер-сетка, закатный горизонт и бегущие световые волны', cost: 300, previewClass: 'mini-bg-retrowave-grid', tag: 'Epic' },
  { id: 'cyber_rain', name: 'Neo-Tokyo Cyber Pulse', desc: 'Электрический киберпанк-дождь и неоновые световые лучи', cost: 450, previewClass: 'mini-bg-cyber-rain', tag: 'Epic' },
  { id: 'deep_space', name: 'Cosmic Starlight Nebula', desc: 'Космическая ультрамариновая туманность и живые мерцающие звёзды', cost: 600, previewClass: 'mini-bg-deep-space', tag: 'Legendary' },
  { id: 'glitch_matrix', name: 'Cyber Emerald Matrix', desc: 'Каскадный цифровой поток матричного кода и глитч-эффекты', cost: 800, previewClass: 'mini-bg-glitch-matrix', tag: 'Legendary' },
  { id: 'volcanic_magma', name: 'Infernal Magma Core', desc: 'Пылающее вулканическое ядро, лавовые потоки и парящие искры', cost: 1200, previewClass: 'mini-bg-volcanic-magma', tag: 'Mythic' },
  { id: 'aurora_borealis', name: 'Celestial Aurora Borealis', desc: 'Северное сияние с изумрудно-фиолетовыми волнами и космической пылью', cost: 2000, previewClass: 'mini-bg-aurora-borealis', tag: 'Mythic' },
  { id: 'warp_drive', name: 'Hyperdrive Dimension Warp', desc: 'Сверхсветовой квантовый скачок сквозь пространственные туннели', cost: 4000, previewClass: 'mini-bg-warp-drive', tag: 'ULTRA MYTHIC' }
];

const BANNER_DEFINITIONS = [
  { id: 'default', name: 'Lobbivo Titanium Carbon', desc: 'Классический карбоновый градиент с бирюзовой подсветкой', cost: 0, previewClass: 'banner-default', tag: 'Базовый' },
  { id: 'tokyo_night', name: 'Tokyo Neon Metropolis', desc: 'Ночной неоновый мегаполис, влажный асфальт и киберпанк-свет', cost: 250, previewClass: 'banner-tokyo-night', tag: 'Epic' },
  { id: 'synthwave_highway', name: 'Outrun 80s Horizon', desc: 'Ретро-хайвей, закатное неоновое солнце и бесконечная трасса', cost: 400, previewClass: 'banner-synthwave-highway', tag: 'Epic' },
  { id: 'matrix_nexus', name: 'Quantum Matrix Grid', desc: 'Высокотехнологичный нейросетевой хаб и светящиеся цепи данных', cost: 600, previewClass: 'banner-matrix-nexus', tag: 'Legendary' },
  { id: 'crimson_dragon', name: 'Crimson Dragon Forge', desc: 'Мифический драконий алтарь, багровое пламя и золотые искры', cost: 1000, previewClass: 'banner-crimson-dragon', tag: 'Legendary' },
  { id: 'cosmic_supernova', name: 'Cosmic Supernova Burst', desc: 'Взрыв сверхновой звезды с кольцами плазмы и звездной пылью', cost: 1800, previewClass: 'banner-cosmic-supernova', tag: 'Mythic' },
  { id: 'cyberpunk_edge', name: 'Titan Combat HUD Matrix', desc: 'Тактический боевой интерфейс с голографическими элементами', cost: 3000, previewClass: 'banner-cyberpunk-edge', tag: 'Mythic' },
  { id: 'immortal_monarch', name: 'Immortal Celestial Zenith', desc: 'Императорский золотой трон, лучи превосходства и солнечная корона', cost: 6000, previewClass: 'banner-immortal-monarch', tag: 'CELESTIAL PRESTIGE' }
];