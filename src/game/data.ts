// ─── ROBOT LEGENDS: BATTLE OF KNOWLEDGE — static game data ───────────────────
// Shared between the 3D engine (client) and UI panels.

export const ARENA = {
  width: 176, // x
  depth: 116, // z
  laneZ: [-36, 0, 36] as const,
  baseX: 74, // |x| of each base center
  turretOffsets: [-21, -36, -51], // distance from center line per turret tier (mirrored)
};

export type SkillType =
  | "shield" | "slam" | "dash" | "blink" | "bolt" | "nova" | "heal"
  | "buffAS" | "mark" | "chain" | "storm" | "execute" | "stealth" | "reflect"
  | "zone" | "arc" | "revive";

export interface SkillDef {
  key: "Q" | "E" | "R" | "F";
  name: string;
  type: SkillType;
  cd: number;          // cooldown seconds
  cost: number;        // energy cost
  base: number;        // base power (damage / heal / shield absorb)
  per: number;         // gain per upgrade level
  radius?: number;     // aoe radius
  range?: number;      // effect range
  slow?: number;       // slow fraction 0..1
  dur?: number;        // effect duration
  icon: string;        // lucide icon key used by HUD
  desc: string;
}

export interface HeroDef {
  id: string;
  name: string;
  role: string;
  title: string;
  quote: string;
  desc: string;
  color: number;       // body tint
  emissive: number;    // glow color
  accent: string;      // css accent (bars / chips)
  difficulty: 1 | 2 | 3;
  ranged: boolean;
  stats: { hp: number; ad: number; def: number; ms: number; as: number; range: number };
  skills: SkillDef[];
}

const S = (
  key: SkillDef["key"], name: string, type: SkillType, cd: number, cost: number,
  base: number, per: number, icon: string, desc: string,
  extra?: Partial<SkillDef>
): SkillDef => ({ key, name, type, cd, cost, base, per, icon, desc, ...extra });

export const HEROES: HeroDef[] = [
  {
    id: "titan", name: "TITAN", role: "Tank", title: "The Unbreakable Wall",
    quote: "My shield is the fortress of my team.",
    desc: "Robot benteng berarmor tebal. Menahan damage, memperlambat musuh, dan melindungi tim di garis depan.",
    color: 0x5a6b8c, emissive: 0x38bdf8, accent: "#38bdf8", difficulty: 1, ranged: false,
    stats: { hp: 1180, ad: 56, def: 42, ms: 9.4, as: 0.78, range: 3.2 },
    skills: [
      S("Q", "Shield Wall", "shield", 12, 25, 220, 130, "Shield", "Perisai energi menyerap damage: 220 / 350 / 480."),
      S("E", "Ground Slam", "slam", 9, 25, 80, 70, "Hammer", "Hantam tanah: 80 / 150 / 220 damage + slow 35% selama 2 dtk (radius 7).", { radius: 7, slow: 0.35, dur: 2 }),
      S("R", "Magnetic Pull", "dash", 14, 35, 100, 70, "Magnet", "Tarik semua musuh dalam radius 9 ke arah Titan: 100 / 170 / 240 damage.", { radius: 9, range: 9 }),
      S("F", "Fortress Mode", "shield", 60, 50, 420, 0, "Castle", "ULTIMATE — Benteng hidup: +80% Defense dan perisai 420. Bertahan 6 detik.", { dur: 6 }),
    ],
  },
  {
    id: "blaze", name: "BLAZE", role: "Assassin", title: "Plasma Twin Fangs",
    quote: "Two blades. Zero mercy. Full overdrive.",
    desc: "Pedang plasma berkecepatan tinggi. Menyelinap, meledak, lalu menghilang sebelum musuh sadar.",
    color: 0x7c2d12, emissive: 0xfb7185, accent: "#fb7185", difficulty: 3, ranged: false,
    stats: { hp: 830, ad: 92, def: 18, ms: 11.2, as: 1.25, range: 2.8 },
    skills: [
      S("Q", "Plasma Dash", "dash", 8, 25, 110, 70, "Wind", "Melaju 9 unit ke depan, menebas musuh di jalur: 110 / 180 / 250 damage.", { range: 9 }),
      S("E", "Shadow Strike", "blink", 10, 30, 135, 75, "Zap", "Blink ke belakang musuh terdekat (jangkauan 12): 135 / 210 / 285 damage.", { range: 12 }),
      S("R", "Blade Spin", "nova", 7, 25, 125, 70, "RefreshCw", "Putaran pedang plasma (radius 5.2): 125 / 195 / 265 damage.", { radius: 5.2 }),
      S("F", "Overdrive Execution", "execute", 70, 50, 520, 220, "Crosshair", "ULTIMATE — Eksekusi musuh dengan HP terendah dalam 11 unit: 520 / 740 / 960 true damage.", { range: 11 }),
    ],
  },
  {
    id: "volt", name: "VOLT", role: "Marksman", title: "The Orbital Sniper",
    quote: "One shot. One deletion.",
    desc: "Penembak presisi jarak jauh dengan rail-cannon. Menara meriam berjalan yang menghabisi dari belakang.",
    color: 0x1e3a8a, emissive: 0x22d3ee, accent: "#22d3ee", difficulty: 2, ranged: true,
    stats: { hp: 790, ad: 88, def: 16, ms: 10, as: 1.35, range: 17 },
    skills: [
      S("Q", "Laser Shot", "bolt", 5, 25, 155, 80, "Crosshair", "Tembakan laser lurus: 155 / 235 / 315 damage ke target pertama.", { range: 30 }),
      S("E", "Rapid Fire", "buffAS", 12, 25, 0.55, 0.2, "Gauge", "+55 / +75 / +95% Attack Speed selama 4 detik.", { dur: 4 }),
      S("R", "Target Lock", "mark", 10, 30, 125, 65, "LocateFixed", "Kunci target (jangkauan 15): 125 / 190 / 255 damage, target menerima +30% damage dari VOLT selama 4 dtk.", { range: 15, dur: 4 }),
      S("F", "Orbital Barrage", "storm", 80, 50, 190, 80, "Rocket", "ULTIMATE — 5 salvo orbital menghantam musuh acak dalam 14 unit: 190 / 270 / 350 damage per salvo.", { radius: 14, dur: 5 }),
    ],
  },
  {
    id: "nexa", name: "NEXA", role: "Support", title: "The Pulse of Life",
    quote: "No unit of my squad falls today.",
    desc: "Robot medik tempur. Menyembuhkan, memperkuat shield tim, dan membangkitkan rekan yang tumbang.",
    color: 0x0f766e, emissive: 0x34d399, accent: "#34d399", difficulty: 1, ranged: true,
    stats: { hp: 890, ad: 52, def: 23, ms: 10.4, as: 0.9, range: 12 },
    skills: [
      S("Q", "Healing Pulse", "heal", 10, 30, 145, 75, "HeartPulse", "Denyut penyembuhan (radius 9): pulihkan 145 / 220 / 295 HP sekutu.", { radius: 9 }),
      S("E", "Energy Link", "buffAS", 14, 25, 0.35, 0.12, "Link", "+35 / +47 / +59% Attack Speed untuk sekutu di sekitar selama 6 detik.", { radius: 10, dur: 6 }),
      S("R", "Protection Dome", "shield", 14, 35, 170, 85, "Umbrella", "Kubah pelindung (radius 9): sekutu menerima shield 170 / 255 / 340.", { radius: 9 }),
      S("F", "Resurrection Field", "revive", 90, 50, 0.5, 0, "Sparkles", "ULTIMATE — Bangkitkan sekutu yang gugur dengan 50% HP dan pulihkan seluruh tim penuh.", { radius: 14 }),
    ],
  },
  {
    id: "photon", name: "PHOTON", role: "Mage", title: "The Cosmic Conductor",
    quote: "Light bends. Matter obeys. You won't.",
    desc: "Pengendali energi plasma dan gravitasi. Menghapus area luas dengan ledakan kosmik.",
    color: 0x6d28d9, emissive: 0xc084fc, accent: "#c084fc", difficulty: 2, ranged: true,
    stats: { hp: 810, ad: 62, def: 15, ms: 9.5, as: 0.85, range: 13 },
    skills: [
      S("Q", "Plasma Ball", "bolt", 6, 25, 175, 80, "CircleDot", "Bola plasma: 175 / 255 / 335 damage + slow 20% selama 1.5 dtk.", { range: 30, slow: 0.2, dur: 1.5 }),
      S("E", "Energy Nova", "nova", 9, 30, 145, 75, "Sun", "Ledakan energi (radius 7): 145 / 220 / 295 damage ke semua musuh.", { radius: 7 }),
      S("R", "Gravity Field", "zone", 12, 35, 46, 25, "Orbit", "Zona gravitasi (radius 6, 4 dtk): slow 50% + 46 / 71 / 96 damage per detik.", { radius: 6, slow: 0.5, dur: 4 }),
      S("F", "Cosmic Explosion", "nova", 75, 50, 420, 140, "Bomb", "ULTIMATE — Ledakan kosmik (radius 10.5): 420 / 560 / 700 damage.", { radius: 10.5 }),
    ],
  },
  {
    id: "goliath", name: "GOLIATH", role: "Fighter", title: "The Walking Earthquake",
    quote: "My fists write history in the ground.",
    desc: "Petarung melee dengan daya hantam luar biasa. Setiap tinju mengguncang fondasi arena.",
    color: 0x92400e, emissive: 0xfbbf24, accent: "#fbbf24", difficulty: 1, ranged: false,
    stats: { hp: 1020, ad: 78, def: 28, ms: 10, as: 0.95, range: 3.2 },
    skills: [
      S("Q", "Heavy Punch", "arc", 7, 25, 165, 80, "Grab", "Tinju berat ke arah depan (busur 2.6): 165 / 245 / 325 damage.", { range: 4.2 }),
      S("E", "Earthquake", "slam", 10, 30, 125, 70, "Activity", "Gempa (radius 6.2): 125 / 195 / 265 damage + slow 40% selama 1.5 dtk.", { radius: 6.2, slow: 0.4, dur: 1.5 }),
      S("R", "Iron Charge", "dash", 12, 30, 135, 75, "Truck", "Menyeruduk 10 unit, menabrak musuh: 135 / 210 / 285 damage + knockback.", { range: 10 }),
      S("F", "Titan Smash", "slam", 75, 50, 460, 140, "Mountain", "ULTIMATE — Hantaman raksasa (radius 8.2): 460 / 600 / 740 damage + stun 1.2 dtk.", { radius: 8.2, dur: 1.2 }),
    ],
  },
  {
    id: "frost", name: "FROST", role: "Control", title: "The Absolute Chill",
    quote: "Freeze the brave. Queue the delete.",
    desc: "Pengendali suhu kriogenik. Membekukan serangan, memperlambat gerak, mematikan momentum musuh.",
    color: 0x0e7490, emissive: 0x67e8f9, accent: "#67e8f9", difficulty: 2, ranged: true,
    stats: { hp: 870, ad: 66, def: 21, ms: 9.5, as: 0.85, range: 12 },
    skills: [
      S("Q", "Ice Blast", "bolt", 6, 25, 135, 70, "Snowflake", "Ledakan es: 135 / 205 / 275 damage + slow 40% selama 2 dtk.", { range: 30, slow: 0.4, dur: 2 }),
      S("E", "Freeze Trap", "zone", 12, 30, 38, 22, "Boxes", "Zona es (radius 5.5, 4 dtk): slow 50% + 38 / 60 / 82 damage per detik.", { radius: 5.5, slow: 0.5, dur: 4 }),
      S("R", "Frost Wave", "nova", 11, 30, 155, 70, "Waves", "Gelombang beku (radius 8.4): 155 / 225 / 295 damage + slow 55% selama 2.5 dtk.", { radius: 8.4, slow: 0.55, dur: 2.5 }),
      S("F", "Absolute Zero", "slam", 80, 50, 390, 115, "ThermometerSnowflake", "ULTIMATE — Nol Mutlak (radius 10): 390 / 505 / 620 damage + freeze (slow 80%) 2 dtk.", { radius: 10, slow: 0.8, dur: 2 }),
    ],
  },
  {
    id: "shadow", name: "SHADOW", role: "Assassin", title: "The Silent Protocol",
    quote: "You never saw me. That's the point.",
    desc: "Ninja futuristik dengan cloaking stealth. MenStrike dari bayangan, lalu menguap tanpa jejak.",
    color: 0x1f2937, emissive: 0xa78bfa, accent: "#a78bfa", difficulty: 3, ranged: false,
    stats: { hp: 765, ad: 95, def: 14, ms: 11.6, as: 1.3, range: 2.8 },
    skills: [
      S("Q", "Stealth", "stealth", 14, 30, 0, 0, "Ghost", "Menghilang 3.5 dtk + 30% Movement Speed. Serangan membatalkan stealth.", { dur: 3.5 }),
      S("E", "Blade Storm", "nova", 8, 25, 155, 75, "Tornado", "Badai bilah (radius 5.2): 155 / 230 / 305 damage.", { radius: 5.2 }),
      S("R", "Teleport Strike", "blink", 11, 35, 175, 80, "MoveRight", "Teleport ke musuh terdekat (jangkauan 14): 175 / 255 / 335 damage.", { range: 14 }),
      S("F", "Phantom Kill", "execute", 75, 50, 560, 210, "Skull", "ULTIMATE — Strike bayangan ke musuh HP terendah (jangkauan 12): 560 / 770 / 980 true damage.", { range: 12 }),
    ],
  },
  {
    id: "aegis", name: "AEGIS", role: "Defender", title: "The Immortal Barrier",
    quote: "Behind me. Always behind me.",
    desc: "Pelindung tim dengan barrier energi dan counter-damage. Dinding hidup yang memantulkan rasa sakit.",
    color: 0x334155, emissive: 0xfacc15, accent: "#facc15", difficulty: 1, ranged: false,
    stats: { hp: 1120, ad: 58, def: 37, ms: 9, as: 0.8, range: 3.2 },
    skills: [
      S("Q", "Energy Barrier", "shield", 11, 25, 230, 115, "ShieldCheck", "Perisai energi: 230 / 345 / 460 absorb."),
      S("E", "Reflect Damage", "reflect", 12, 30, 0.45, 0.15, "Reply", "Pantulkan 45 / 60 / 75% damage yang diterima selama 4 detik.", { dur: 4 }),
      S("R", "Guardian Link", "heal", 13, 35, 210, 105, "HeartHandshake", "Sekutu dengan HP terendah: shield 210 / 315 / 420 + heal 120.", { radius: 99 }),
      S("F", "Invincible Fortress", "shield", 85, 50, 320, 140, "ShieldHalf", "ULTIMATE — Seluruh tim menerima shield 320 / 460 / 600 selama 5 detik.", { radius: 99, dur: 5 }),
    ],
  },
  {
    id: "thunder", name: "THUNDER", role: "Fighter", title: "The Living Tempest",
    quote: "A million volts of bad decisions — for you.",
    desc: "Petarung beraliran listrik jutaan volt. Rantai petir memburu dan menyengat setiap target.",
    color: 0x7f1d1d, emissive: 0xfde047, accent: "#fde047", difficulty: 2, ranged: false,
    stats: { hp: 930, ad: 82, def: 24, ms: 10.6, as: 1.0, range: 3.2 },
    skills: [
      S("Q", "Thunder Punch", "arc", 6, 25, 155, 75, "Zap", "Tinju petir (busur 2.6): 155 / 230 / 305 damage + slow 25% 1.5 dtk.", { range: 4.4, slow: 0.25, dur: 1.5 }),
      S("E", "Electric Chain", "chain", 10, 30, 125, 65, "Share2", "Rantai petir menyambar hingga 4 musuh terdekat: 125 / 190 / 255 damage.", { range: 14 }),
      S("R", "Lightning Rush", "dash", 10, 30, 145, 70, "FastForward", "Terjang 9 unit menjadi petir: 145 / 215 / 285 damage + damage melintas jalur.", { range: 9 }),
      S("F", "Thunder Storm", "storm", 80, 50, 165, 75, "CloudLightning", "ULTIMATE — 6 sambaran petir menghantam musuh acak (jangkauan 13): 165 / 240 / 315 damage per sambaran.", { radius: 13, dur: 6 }),
    ],
  },
];

export const heroById = (id: string | null | undefined): HeroDef =>
  HEROES.find((h) => h.id === id) ?? HEROES[1];

// ─── Item shop ───────────────────────────────────────────────────────────────
export type ItemCategory = "attack" | "defense" | "movement" | "magic" | "support";

export interface ItemDef {
  id: string;
  name: string;
  cat: ItemCategory;
  price: number;
  desc: string;
  icon: string;           // lucide key
  stats?: Partial<Record<"ad" | "def" | "hp" | "mp" | "as" | "ms" | "crit" | "regen", number>>;
}

export const ITEMS: ItemDef[] = [
  // ATTACK
  { id: "plasma_sword", name: "Plasma Sword", cat: "attack", price: 2100, icon: "Sword", desc: "+40 Attack Damage.", stats: { ad: 40 } },
  { id: "laser_cannon", name: "Laser Cannon", cat: "attack", price: 2650, icon: "Crosshair", desc: "+55 Attack Damage.", stats: { ad: 55 } },
  { id: "quantum_rifle", name: "Quantum Rifle", cat: "attack", price: 2800, icon: "Scan", desc: "+30 Attack Damage, +25% Attack Speed.", stats: { ad: 30, as: 25 } },
  { id: "critical_core", name: "Critical Core", cat: "attack", price: 3100, icon: "Target", desc: "+35 Attack Damage, +25% Crit Chance.", stats: { ad: 35, crit: 25 } },
  // DEFENSE
  { id: "titanium_armor", name: "Titanium Armor", cat: "defense", price: 2200, icon: "Shield", desc: "+40 Defense.", stats: { def: 40 } },
  { id: "quantum_shield", name: "Quantum Shield", cat: "defense", price: 2450, icon: "ShieldCheck", desc: "+550 HP.", stats: { hp: 550 } },
  { id: "guardian_plate", name: "Guardian Plate", cat: "defense", price: 1900, icon: "ShieldHalf", desc: "+25 Defense, +280 HP.", stats: { def: 25, hp: 280 } },
  { id: "energy_barrier", name: "Energy Barrier", cat: "defense", price: 2350, icon: "BrickWall", desc: "+32 Defense, +320 HP.", stats: { def: 32, hp: 320 } },
  // MOVEMENT
  { id: "turbo_boots", name: "Turbo Boots", cat: "movement", price: 720, icon: "Footprints", desc: "+45 Movement Speed.", stats: { ms: 45 } },
  { id: "jet_engine", name: "Jet Engine", cat: "movement", price: 1500, icon: "Rocket", desc: "+75 Movement Speed.", stats: { ms: 75 } },
  { id: "hyper_drive", name: "Hyper Drive", cat: "movement", price: 2900, icon: "Gauge", desc: "+95 Movement Speed, +20% Attack Speed.", stats: { ms: 95, as: 20 } },
  // MAGIC
  { id: "plasma_crystal", name: "Plasma Crystal", cat: "magic", price: 2300, icon: "Gem", desc: "+45 Magic Power (memperkuat skill).", stats: { mp: 45 } },
  { id: "cosmic_orb", name: "Cosmic Orb", cat: "magic", price: 3200, icon: "Orbit", desc: "+75 Magic Power.", stats: { mp: 75 } },
  { id: "energy_amplifier", name: "Energy Amplifier", cat: "magic", price: 2600, icon: "Zap", desc: "+30 Magic Power, +25% Attack Speed.", stats: { mp: 30, as: 25 } },
  // SUPPORT
  { id: "healing_core", name: "Healing Core", cat: "support", price: 1800, icon: "HeartPulse", desc: "+18 HP regen / detik.", stats: { regen: 18 } },
  { id: "guardian_module", name: "Guardian Module", cat: "support", price: 2100, icon: "Package", desc: "+15 Defense, +12 HP regen / detik.", stats: { def: 15, regen: 12 } },
  { id: "regen_chip", name: "Regeneration Chip", cat: "support", price: 1600, icon: "Cpu", desc: "+30 HP regen / detik.", stats: { regen: 30 } },
];

export const ITEM_CATEGORIES: { id: ItemCategory; label: string; icon: string }[] = [
  { id: "attack", label: "ATTACK", icon: "Swords" },
  { id: "defense", label: "DEFENSE", icon: "Shield" },
  { id: "movement", label: "MOVEMENT", icon: "Footprints" },
  { id: "magic", label: "MAGIC", icon: "Gem" },
  { id: "support", label: "SUPPORT", icon: "HeartPulse" },
];

// ─── Knowledge Battle fallback bank (used only if DB unreachable) ────────────
// Konten asli seputar IPAS Kelas 6, dapat diverifikasi.
export interface FallbackQuestion {
  id: number; materi: string; pertanyaan: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  kunci: string; pembahasan: string; difficulty: string;
}

export const FALLBACK_QUESTIONS: FallbackQuestion[] = [
  { id: -1, materi: "Sistem Pencernaan Manusia", pertanyaan: "Organ yang mengubah makanan menjadi bubur halus dan mencernanya dengan asam lambung adalah…", optionA: "Usus halus", optionB: "Lambung", optionC: "Kerongkongan", optionD: "Hati", kunci: "B", pembahasan: "Lambung mengaduk makanan dengan dinding ototnya dan mencernanya menggunakan asam lambung (HCl) serta enzim pepsin.", difficulty: "mudah" },
  { id: -2, materi: "Sistem Pencernaan Manusia", pertanyaan: "Sari-sari makanan diserap oleh tubuh terutama di…", optionA: "Usus besar", optionB: "Usus halus", optionC: "Lambung", optionD: "Kerongkongan", kunci: "B", pembahasan: "Usus halus, khususnya ileum dan jejunum, memiliki vili (jonjot) yang memperluas permukaan penyerapan sari makanan.", difficulty: "mudah" },
  { id: -3, materi: "Sistem Pernapasan Manusia", pertanyaan: "Tempat terjadinya pertukaran oksigen dan karbon dioksida adalah…", optionA: "Bronkus", optionB: "Trakea", optionC: "Alveolus", optionD: "Laring", kunci: "C", pembahasan: "Alveolus adalah kantong udara kecil di ujung bronkiolus; dindingnya sangat tipis dan dikelilingi kapiler darah.", difficulty: "mudah" },
  { id: -4, materi: "Sistem Pernapasan Manusia", pertanyaan: "Saat menarik napas (inspirasi), diafragma…", optionA: "Mendatar dan turun", optionB: "Melengkung ke atas", optionC: "Diam saja", optionD: "Bergetar cepat", kunci: "A", pembahasan: "Saat inspirasi, otot diafragma berkontraksi sehingga mendatar dan rongga dada membesar; tekanan udara dalam paru menurun dan udara masuk.", difficulty: "sedang" },
  { id: -5, materi: "Sistem Tata Surya", pertanyaan: "Planet terdekat dengan Matahari adalah…", optionA: "Venus", optionB: "Bumi", optionC: "Merkurius", optionD: "Mars", kunci: "C", pembahasan: "Urutan planet dari Matahari: Merkurius, Venus, Bumi, Mars, Jupiter, Saturnus, Uranus, Neptunus.", difficulty: "mudah" },
  { id: -6, materi: "Sistem Tata Surya", pertanyaan: "Pergantian siang dan malam disebabkan oleh…", optionA: "Revolusi Bumi mengelilingi Matahari", optionB: "Rotasi Bumi pada porosnya", optionC: "Rotasi Bulan", optionD: "Kecondongan orbit Bumi", kunci: "B", pembahasan: "Rotasi Bumi (±24 jam) menyebabkan sisi yang menghadap Matahari mengalami siang dan sisi sebaliknya malam.", difficulty: "mudah" },
  { id: -7, materi: "Jejak Sang Pahlawan", pertanyaan: "Teks Proklamasi Kemerdekaan Indonesia dibacakan oleh…", optionA: "Mohammad Hatta", optionB: "Sutan Syahrir", optionC: "Ir. Soekarno", optionD: "Ahmad Soebardjo", kunci: "C", pembahasan: "Ir. Soekarno membacakan teks Proklamasi pada 17 Agustus 1945 di Jalan Pegangsaan Timur 56, Jakarta.", difficulty: "mudah" },
  { id: -8, materi: "Jejak Sang Pahlawan", pertanyaan: "Tanggal lahirnya Pancasila diperingati setiap…", optionA: "17 Agustus 1945", optionB: "1 Juni 1945", optionC: "28 Oktober 1928", optionD: "22 Desember 1928", kunci: "B", pembahasan: "Pada 1 Juni 1945, Ir. Soekarno menyampaikan pidato tentang dasar negara yang kemudian dikenal sebagai Pancasila.", difficulty: "sedang" },
];

export const MATERI_LIST = [
  "Sistem Pencernaan Manusia",
  "Sistem Pernapasan Manusia",
  "Sistem Tata Surya",
  "Jejak Sang Pahlawan",
] as const;

export const difficultyLabel: Record<string, string> = {
  easy: "Easy", normal: "Normal", hard: "Hard",
};
