// ============================================================
//  ДАННЫЕ ПРИЛОЖЕНИЯ (GAMES, DEVICES, TEST USERS)
// ============================================================

const GAMES = [
  { id: 'valorant', name: 'Valorant', icon: 'icon-valorant', image: 'assets/images/games/valorant.jpg', btnTheme: 'cyan', glow: '#00d4ff' },
  { id: 'apex', name: 'Apex Legends', icon: 'icon-apex', image: 'assets/images/games/apex.jpg', btnTheme: 'gold', glow: '#e5a93c' },
  { id: 'dota2', name: 'Dota 2', icon: 'icon-dota2', image: 'assets/images/games/dota2.jpg', btnTheme: 'red', glow: '#ff4444' },
  { id: 'csgo', name: 'CS 2', icon: 'icon-csgo', image: 'assets/images/games/csgo.jpg', btnTheme: 'cyan', glow: '#00d4ff' },
  { id: 'overwatch', name: 'Overwatch', icon: 'icon-overwatch', image: 'assets/images/games/overwatch.jpg', btnTheme: 'gold', glow: '#e5a93c' },
  { id: 'pubg', name: 'PUBG', icon: 'icon-pubg', image: 'assets/images/games/pubg.jpg', btnTheme: 'gold', glow: '#e5a93c' },
  { id: 'fortnite', name: 'Fortnite', icon: 'icon-fortnite', image: 'assets/images/games/fortnite.jpg', btnTheme: 'cyan', glow: '#00d4ff' },
  { id: 'minecraft', name: 'Minecraft', icon: 'icon-minecraft', image: 'assets/images/games/minecraft.jpg', btnTheme: 'cyan', glow: '#00d4ff' },
  { id: 'league', name: 'LoL', icon: 'icon-league', image: 'assets/images/games/league.jpg', btnTheme: 'cyan', glow: '#00d4ff' },
  { id: 'rust', name: 'Rust', icon: 'icon-rust', image: 'assets/images/games/rust.jpg', btnTheme: 'gold', glow: '#e5a93c' },
  { id: 'gta5', name: 'GTA V Online', icon: 'icon-gta5', image: 'assets/images/games/gta5.jpg', btnTheme: 'cyan', glow: '#00d4ff' },
  { id: 'warzone', name: 'Warzone', icon: 'icon-warzone', image: 'assets/images/games/warzone.jpg', btnTheme: 'gold', glow: '#e5a93c' },
  { id: 'rocket', name: 'Rocket League', icon: 'icon-rocket', image: 'assets/images/games/rocket.jpg', btnTheme: 'cyan', glow: '#00d4ff' },
  { id: 'rainbow', name: 'R6 Siege', icon: 'icon-rainbow', image: 'assets/images/games/rainbow.jpg', btnTheme: 'gold', glow: '#e5a93c' },
  { id: 'tarkov', name: 'Escape from Tarkov', icon: 'icon-tarkov', image: 'assets/images/games/tarkov.jpg', btnTheme: 'gold', glow: '#e5a93c' },
  { id: 'destiny', name: 'Destiny 2', icon: 'icon-destiny', image: 'assets/images/games/destiny.jpg', btnTheme: 'cyan', glow: '#00d4ff' },
  { id: 'wow', name: 'World of Warcraft', icon: 'icon-wow', image: 'assets/images/games/wow.jpg', btnTheme: 'gold', glow: '#e5a93c' },
  { id: 'deadlock', name: 'Deadlock', icon: 'icon-deadlock', image: 'assets/images/games/deadlock.jpg', btnTheme: 'red', glow: '#ff4655' },
  { id: 'marvel', name: 'Marvel Rivals', icon: 'icon-marvel', image: 'assets/images/games/marvel.jpg', btnTheme: 'cyan', glow: '#00d4ff' },
  { id: 'xdefiant', name: 'XDefiant', icon: 'icon-xdefiant', image: 'assets/images/games/xdefiant.jpg', btnTheme: 'gold', glow: '#e5a93c' },
  { id: 'thefinals', name: 'The Finals', icon: 'icon-thefinals', image: 'assets/images/games/thefinals.jpg', btnTheme: 'red', glow: '#ff4444' },
  { id: 'readyornot', name: 'Ready or Not', icon: 'icon-readyornot', image: 'assets/images/games/readyornot.jpg', btnTheme: 'gold', glow: '#e5a93c' },
  { id: 'helldivers2', name: 'Helldivers 2', icon: 'icon-helldivers2', image: 'assets/images/games/helldivers2.jpg', btnTheme: 'gold', glow: '#e5a93c' },
  { id: 'palworld', name: 'Palworld', icon: 'icon-palworld', image: 'assets/images/games/palworld.jpg', btnTheme: 'cyan', glow: '#00d4ff' },
  { id: 'bg3', name: 'Baldur\'s Gate 3', icon: 'icon-bg3', image: 'assets/images/games/bg3.jpg', btnTheme: 'gold', glow: '#e5a93c' }
];

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