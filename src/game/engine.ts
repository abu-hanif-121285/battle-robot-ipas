// ─── ROBOT LEGENDS — Real-time MOBA engine (client-side simulation) ─────────
// Battle simulation runs locally for zero-latency action; Knowledge answers are
// validated server-side and match results persisted via /api/matches. Quiz
// pauses the match so Knowledge Battles are always fair.

import * as THREE from "three";
import { ARENA, HEROES, ITEMS, heroById, type HeroDef, type SkillDef } from "./data";
import {
  buildHeroRobot, buildMinion, buildTurret, buildCore, buildBoss, buildMonster,
  TEAM_GLOW, type Team, type RobotRefs,
} from "./robots";
import { audio } from "./audio";

export type TeamId = Team;
export type Difficulty = "easy" | "normal" | "hard";
export type QuizSource = "start" | "levelup" | "ultimate";
export type Quality = "low" | "medium" | "high";

export interface EngineEvents {
  onSnapshot: (s: HudSnapshot) => void;
  onQuiz: (source: QuizSource) => void;
  onFloat: (x: number, y: number, text: string, color: string) => void;
  onAnnounce: (text: string, kind: "info" | "good" | "bad" | "omega") => void;
  onKillFeed: (text: string) => void;
  onMatchEnd: (r: MatchResult) => void;
}

export interface EngineOptions {
  heroId: string;
  difficulty: Difficulty;
  quality: Quality;
  playerName: string;
  autoAttack: boolean;
}

export interface HudSnapshot {
  time: number; hp: number; maxHp: number; shield: number; energy: number; maxEnergy: number;
  level: number; xp: number; xpNext: number; skillPoints: number; gold: number;
  kills: number; deaths: number; assists: number; damageDealt: number;
  teamCyber: number; teamTitan: number; turretsCyber: number; turretsTitan: number;
  alive: boolean; respawnIn: number; flickerCd: number; ultimateReady: boolean;
  skills: { key: string; name: string; cd: number; remain: number; rank: number; maxRank: number; locked: boolean; icon: string }[];
  items: { id: string; name: string; icon: string }[];
  recall: number; paused: boolean; over: boolean; omegaBuff: boolean;
  scoreboard: { team: TeamId; members: { name: string; hero: string; level: number; k: number; d: number; a: number; alive: boolean; isPlayer: boolean }[] }[];
  questionsCorrect: number; questionsWrong: number;
  labels: { uid:number; name:string; level:number; x:number; y:number; hp:number; team:TeamId; player:boolean }[];
}

export interface MatchResult {
  victory: boolean; heroId: string; heroName: string; kills: number; deaths: number; assists: number;
  goldEarned: number; damageDealt: number; turretsDestroyed: number;
  questionsCorrect: number; questionsWrong: number; knowledgeXp: number;
  mvp: boolean; durationSec: number; difficulty: Difficulty;
}

// ─── Entity models ───────────────────────────────────────────────────────────
interface DamageLogEntry { uid: number; t: number }
interface HeroEnt {
  kind: "hero"; uid: number; heroId: string; def: HeroDef; team: TeamId; isPlayer: boolean;
  rec: RobotRefs; x: number; z: number; angle: number;
  hp: number; maxHp: number; shield: number; energy: number; maxEnergy: number;
  ad: number; armor: number; ms: number; as: number; range: number;
  level: number; xp: number; skillPoints: number;
  skillLevels: Record<string, number>; cds: Record<string, number>;
  kills: number; deaths: number; assists: number; gold: number; goldEarned: number;
  damageDealt: number; turretsDestroyed: number;
  alive: boolean; respawnAt: number; deadT: number; attackCd: number;
  items: string[];
  buffDamageUntil: number; omegaUntil: number; monsterBuffUntil: number;
  stealthUntil: number; reflectUntil: number; asBuffUntil: number; asBuffPct: number;
  slowUntil: number; slowPct: number; markUntil: number; markPct: number;
  lane: number; aiJungle: boolean; aiThinkAt: number; aiBuyAt: number;
  recallT: number; damagers: DamageLogEntry[]; flash: number; flickerCd: number;
}
interface MinionEnt {
  kind: "minion"; uid: number; team: TeamId; mkind: "melee" | "ranged" | "siege"; lane: number;
  rec: RobotRefs; x: number; z: number; angle: number; hp: number; maxHp: number; ad: number;
  range: number; ms: number; attackCd: number; alive: boolean; deadT: number; flash: number;
}
interface TurretEnt {
  kind: "turret"; uid: number; team: TeamId; lane: number; tier: number; refs: TurretRefs;
  x: number; z: number; hp: number; maxHp: number; attackCd: number; alive: boolean;
}
interface CoreEnt {
  kind: "core"; uid: number; team: TeamId; refs: CoreRefs; x: number; z: number;
  hp: number; maxHp: number; shield: number; attackCd: number; alive: boolean;
}
interface BossEnt {
  kind: "boss"; uid: number; team: "neutral"; rec: RobotRefs & { slamRing: THREE.Mesh };
  x: number; z: number; angle: number; hp: number; maxHp: number; attackCd: number; slamCd: number;
  alive: boolean; deadT: number; respawnAt: number;
}
interface MonsterEnt {
  kind: "monster"; uid: number; mtype: "scorpion" | "spider" | "dragon"; rec: RobotRefs;
  x: number; z: number; angle: number; cx: number; cz: number; hp: number; maxHp: number; ad: number;
  team: "neutral"; attackCd: number; alive: boolean; respawnAt: number; deadT: number;
}
type AnyEnt = HeroEnt | MinionEnt | TurretEnt | CoreEnt | BossEnt | MonsterEnt;
interface TurretRefs { group: THREE.Group; head: THREE.Group; ring: THREE.Mesh; core: THREE.Mesh }
interface CoreRefs { group: THREE.Group; crystal: THREE.Mesh; shield: THREE.Mesh }
interface Projectile {
  uid: number; team: TeamId; x: number; y: number; z: number; vx: number; vz: number;
  speed: number; dmg: number; life: number; color: number; radius: number;
  fromUid: number; fromTurret: boolean; crit: boolean; mesh: THREE.Mesh;
}
interface Zone { uid: number; team: TeamId; x: number; z: number; radius: number; slow: number; dps: number; until: number; mesh: THREE.Mesh }

const LANE_Z = [ARENA.laneZ[0], ARENA.laneZ[1], ARENA.laneZ[2]];
const xpNext = (level: number) => 110 + (level - 1) * 78;
const teamOf = (e: AnyEnt): TeamId | "neutral" => e.team;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private opts: EngineOptions;
  private events: EngineEvents;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private raf = 0;
  private disposed = false;

  private matchTime = 0;
  private over = false;
  private paused = false;
  private heroes: HeroEnt[] = [];
  private minions: MinionEnt[] = [];
  private turrets: TurretEnt[] = [];
  private cores: CoreEnt[] = [];
  private boss!: BossEnt;
  private monsters: MonsterEnt[] = [];
  private projectiles: Projectile[] = [];
  private zones: Zone[] = [];
  private player!: HeroEnt;
  private uid = 1;
  private waveTimer = 4;
  private waveCount = 0;
  private goals = new Map<number, { x:number; z:number }>();
  private probe?: THREE.DataTexture;
  private overtimeAnnounced = false;
  private decayAnnounced = false;
  private teamKills = { cyber: 0, titan: 0 };
  private turretsDown = { cyber: 0, titan: 0 };
  private quizBlocked = false;
  private pendingUltimate = false;
  private questionsCorrect = 0;
  private questionsWrong = 0;

  private camYaw = Math.PI / 2;
  private camPitch = 0.46;
  private camDist = 24;
  private dragging = false;
  private lastPX = 0; private lastPY = 0;
  private shakeT = 0;

  private keys = new Set<string>();
  private joyMove: { x: number; y: number } | null = null;
  private autoAttack: boolean;

  private pPos!: Float32Array; private pVel!: Float32Array; private pLife!: Float32Array; private pCol!: Float32Array;
  private pGeo!: THREE.BufferGeometry;
  private particleCount = 0;
  private maxParticles = 650;

  private torsoBaseY = new Map<number, number>();
  private timeAccum = 0;
  private snapshotTimer = 0;

  constructor(canvas: HTMLCanvasElement, opts: EngineOptions, events: EngineEvents) {
    this.canvas = canvas;
    this.opts = opts;
    this.events = events;
    this.autoAttack = opts.autoAttack;
    this.initThree();
    this.buildMap();
    this.spawnEntities();
    this.bindInput();
    this.clock.start();
    this.loop();
    window.setTimeout(() => { if (!this.disposed && !this.over) this.openQuiz("start"); }, 900);
  }

  // ════════════════════════ SCENE SETUP ════════════════════════
  private initThree() {
    const q = this.opts.quality;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: q !== "low", powerPreference: "high-performance" });
    this.renderer.setPixelRatio(q === "high" ? Math.min(window.devicePixelRatio, 2) : q === "medium" ? Math.min(window.devicePixelRatio, 1.5) : 1);
    this.renderer.setSize(this.canvas.clientWidth || window.innerWidth, this.canvas.clientHeight || window.innerHeight, false);
    this.renderer.shadowMap.enabled = q !== "low";
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.13;
    this.scene = new THREE.Scene();
    // Small, local studio-sky reflection probe: bright overhead strips and a
    // cool horizon light the metal armor even when shadow maps are disabled.
    const pw=128, ph=64, pixels=new Float32Array(pw*ph*4);
    for(let y=0;y<ph;y++)for(let x=0;x<pw;x++){
      const i=(y*pw+x)*4,u=x/pw,v=y/ph;
      const ceiling=Math.max(0,v-.4)*1.2;
      const softbox=(v>.48&&v<.85&&((u>.12&&u<.225)||(u>.63&&u<.76)))?2.7:0;
      const horizon=Math.max(0,1-Math.abs(v-.5)*8)*.34;
      pixels[i]=.12+ceiling*.57+softbox+horizon*.45;
      pixels[i+1]=.16+ceiling*.74+softbox*.94+horizon*.69;
      pixels[i+2]=.23+ceiling+softbox*.86+horizon; pixels[i+3]=1;
    }
    const probe=new THREE.DataTexture(pixels,pw,ph,THREE.RGBAFormat,THREE.FloatType);
    probe.mapping=THREE.EquirectangularReflectionMapping;probe.needsUpdate=true;
    this.scene.environment=probe;this.scene.environmentIntensity=.78;this.probe=probe;
    this.scene.background = new THREE.Color(0x070b18);
    this.scene.fog = new THREE.Fog(0x070b18, 70, 175);

    this.camera = new THREE.PerspectiveCamera(52, this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight), 0.5, 400);
    this.camera.position.set(-82, 30, 0);

    const hemi = new THREE.HemisphereLight(0xb4d6ff, 0x60748d, 1.2);
    this.scene.add(hemi);
    const dirLight = new THREE.DirectionalLight(0xfff0d5, 2.4);
    dirLight.position.set(38, 55, 24);
    dirLight.castShadow = q !== "low";
    dirLight.shadow.mapSize.set(q === "high" ? 2048 : 1024, q === "high" ? 2048 : 1024);
    const sc = dirLight.shadow.camera;
    sc.left = -95; sc.right = 95; sc.top = 75; sc.bottom = -75; sc.far = 140;
    this.scene.add(dirLight);
    this.scene.add(new THREE.AmbientLight(0x334466, 0.75));

    this.maxParticles = q === "low" ? 300 : 650;
    this.pPos = new Float32Array(this.maxParticles * 3);
    this.pVel = new Float32Array(this.maxParticles * 3);
    this.pLife = new Float32Array(this.maxParticles);
    this.pCol = new Float32Array(this.maxParticles * 3);
    this.pGeo = new THREE.BufferGeometry();
    this.pGeo.setAttribute("position", new THREE.BufferAttribute(this.pPos, 3));
    this.pGeo.setAttribute("color", new THREE.BufferAttribute(this.pCol, 3));
    const pMat = new THREE.PointsMaterial({ size: 0.42, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const points = new THREE.Points(this.pGeo, pMat);
    points.frustumCulled = false;
    this.scene.add(points);

    window.addEventListener("resize", this.onResize);
  }

  private onResize = () => {
    if (this.disposed) return;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  // ════════════════════════ MAP BUILDING ════════════════════════
  private makeGroundTexture(): THREE.CanvasTexture {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 680;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#121826";
    ctx.fillRect(0, 0, 1024, 680);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = `rgba(${20 + Math.random() * 30},${28 + Math.random() * 34},${44 + Math.random() * 44},${0.25 + Math.random() * 0.3})`;
      const s = 2 + Math.random() * 8;
      ctx.fillRect(Math.random() * 1024, Math.random() * 680, s, s);
    }
    ctx.strokeStyle = "rgba(56,189,248,0.10)";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 90; i++) {
      ctx.beginPath();
      let x = Math.random() * 1024, y = Math.random() * 680;
      ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) {
        if (Math.random() < 0.5) x += (Math.random() - 0.5) * 160; else y += (Math.random() - 0.5) * 120;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const W = ARENA.width, D = ARENA.depth;
    const u = (x: number) => ((x + W / 2) / W) * 1024;
    const v = (z: number) => ((z + D / 2) / D) * 680;
    for (const lz of LANE_Z) {
      ctx.fillStyle = "#1c2436";
      ctx.fillRect(0, v(lz - 7), 1024, (14 / D) * 680);
      ctx.strokeStyle = "rgba(103,232,249,0.5)";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(0, v(lz - 7)); ctx.lineTo(1024, v(lz - 7)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, v(lz + 7)); ctx.lineTo(1024, v(lz + 7)); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(148,197,255,0.35)";
      ctx.setLineDash([14, 12]);
      ctx.beginPath(); ctx.moveTo(0, v(lz)); ctx.lineTo(1024, v(lz)); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = "rgba(255,64,48,0.55)";
    ctx.lineWidth = 6;
    ctx.shadowColor = "#ff3020"; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.ellipse(u(0), v(-14), 52, 40, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    for (const [bx, col] of [[-ARENA.baseX, "#155e75"], [ARENA.baseX, "#7f1d1d"]] as const) {
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.ellipse(u(bx), v(0), 62, 230, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "rgba(6,24,18,0.5)";
    for (const [jx, jz] of [[-27, -13], [27, -13], [-27, 13], [27, 13]] as const) {
      ctx.beginPath(); ctx.ellipse(u(jx), v(jz), 62, 46, 0, 0, Math.PI * 2); ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  private box(w: number, h: number, d: number, color: number, emissive = 0x000000, ei = 0): THREE.Mesh {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.55, emissive, emissiveIntensity: ei })
    );
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  private buildMap() {
    const W = ARENA.width, D = ARENA.depth;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      new THREE.MeshStandardMaterial({ map: this.makeGroundTexture(), roughness: 0.95, metalness: 0.08 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0e2a3a, roughness: 0.4, metalness: 0.6, emissive: 0x0ea5e9, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 });
    const mkWall = (w: number, d: number, x: number, z: number) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, d), wallMat);
      wall.position.set(x, 1.3, z);
      this.scene.add(wall);
    };
    mkWall(W + 8, 1.2, 0, -D / 2 - 0.6);
    mkWall(W + 8, 1.2, 0, D / 2 + 0.6);
    mkWall(1.2, D + 8, -W / 2 - 0.6, 0);
    mkWall(1.2, D + 8, W / 2 + 0.6, 0);

    // Ruined futuristic buildings
    const ruinSpots: [number, number, number, number][] = [
      [-52, -15, 4, 9], [-47, 17, 3, 6], [-34, 25, 5, 12], [-12, -23, 6, 14], [-8, 23, 4, 7],
      [12, 23, 5, 11], [16, -24, 3, 6], [34, -25, 6, 13], [40, 15, 4, 8], [52, -14, 3, 6.5],
      [58, 9, 2.5, 4], [-58, -7, 3, 5], [0, -30, 2.5, 5], [0, 30, 3, 6.5],
    ];
    for (const [x, z, w, h] of ruinSpots) {
      const ruin = this.box(w, h, w * 0.8, 0x1a2233);
      ruin.position.set(x, h / 2, z);
      ruin.rotation.y = (x * 13.37 + z * 7.7) % Math.PI;
      this.scene.add(ruin);
      const strip = this.box(w * 0.7, 0.18, 0.08, 0x000000, 0x22d3ee, 1.6);
      strip.position.set(x, h * 0.62, z + w * 0.4 + 0.06);
      strip.rotation.y = ruin.rotation.y;
      this.scene.add(strip);
      const cap = this.box(w * 0.8, 0.4, w * 0.66, 0x232c42);
      cap.position.set(x, h + 0.2, z);
      cap.rotation.y = ruin.rotation.y;
      this.scene.add(cap);
    }

    // Energy crystals
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0x0b2027, emissive: 0x2dd4ff, emissiveIntensity: 2.4, roughness: 0.2, metalness: 0.2 });
    const crystalMatP = new THREE.MeshStandardMaterial({ color: 0x230b27, emissive: 0xc084fc, emissiveIntensity: 2.4, roughness: 0.2 });
    const crystalSpots: [number, number][] = [[-38, -8], [-16, 9], [20, -9], [44, 22], [-44, -25], [30, 6], [-6, -17], [8, 17]];
    crystalSpots.forEach(([x, z], i) => {
      const rock = this.box(1.6, 0.9, 1.6, 0x232c42);
      rock.position.set(x, 0.45, z);
      rock.rotation.y = i * 1.7;
      this.scene.add(rock);
      const crys = new THREE.Mesh(new THREE.OctahedronGeometry(0.75 + (i % 3) * 0.28), i % 2 ? crystalMatP : crystalMat);
      crys.position.set(x, 1.6 + (i % 2) * 0.4, z);
      crys.scale.y = 1.6;
      this.scene.add(crys);
    });

    // Holo-pines
    const holoMat = new THREE.MeshStandardMaterial({ color: 0x06231c, emissive: 0x10b981, emissiveIntensity: 1.5, roughness: 0.5, transparent: true, opacity: 0.92 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x1c2436, roughness: 0.6, metalness: 0.7 });
    const treeSpots: [number, number][] = [[-60, -23], [-50, -30], [-30, -28], [-14, 28], [14, -29], [30, 28], [46, -28], [58, 23], [60, -25], [-58, 27], [-22, 15], [22, -15], [0, 23], [0, -25]];
    for (const [x, z] of treeSpots) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.6, 6), trunkMat);
      trunk.position.set(x, 0.8, z);
      trunk.castShadow = true;
      this.scene.add(trunk);
      for (let j = 0; j < 3; j++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.15 - j * 0.36, 1.5, 6), holoMat);
        cone.position.set(x, 1.75 + j * 1.05, z);
        this.scene.add(cone);
      }
    }

    // Wrecked robot husks
    const huskMat = new THREE.MeshStandardMaterial({ color: 0x2b3348, roughness: 0.5, metalness: 0.9 });
    const huskSpots: [number, number, number][] = [[-33, 5, 0.6], [17, -4, -0.8], [-9, -8, 1.9], [12, 8, 2.8], [-46, 8, -1.4], [38, -9, 0.9]];
    for (const [x, z, rot] of huskSpots) {
      const torsoH = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1), huskMat);
      torsoH.position.set(x, 0.55, z);
      torsoH.rotation.set(0.4, rot, 0.35);
      torsoH.castShadow = true;
      this.scene.add(torsoH);
      const limb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.5, 0.35), huskMat);
      limb.position.set(x + 1.2, 0.2, z + 0.5);
      limb.rotation.set(1.2, rot, 0.4);
      this.scene.add(limb);
    }

    // Base pads + spawn portals
    for (const team of ["cyber", "titan"] as TeamId[]) {
      const bx = team === "cyber" ? -ARENA.baseX : ARENA.baseX;
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(6.4, 7, 0.5, 24),
        new THREE.MeshStandardMaterial({ color: 0x131c2e, roughness: 0.4, metalness: 0.7, emissive: TEAM_GLOW[team], emissiveIntensity: 0.35 })
      );
      pad.position.set(bx, 0.25, 0);
      pad.receiveShadow = true;
      this.scene.add(pad);
      const portal = new THREE.Mesh(
        new THREE.TorusGeometry(3.1, 0.18, 8, 32),
        new THREE.MeshStandardMaterial({ color: 0x000000, emissive: TEAM_GLOW[team], emissiveIntensity: 2.6 })
      );
      portal.position.set(bx, 2.2, 0);
      portal.rotation.x = Math.PI / 2;
      this.scene.add(portal);
    }

    // Lane edge glow strips
    const stripMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x38bdf8, emissiveIntensity: 1.1, transparent: true, opacity: 0.8 });
    for (const lz of LANE_Z) {
      for (const s of [-1, 1]) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, 0.12, 0.22), stripMat);
        strip.position.set(0, 0.06, lz + s * 7);
        this.scene.add(strip);
      }
    }
  }

  // ════════════════════════ SPAWN ENTITIES ════════════════════════
  private spawnPos(team: TeamId, lane: number, spread: number): { x: number; z: number } {
    const x = team === "cyber" ? -ARENA.baseX + 6 : ARENA.baseX - 6;
    return { x, z: LANE_Z[Math.max(0, Math.min(2, lane))] + (Math.random() - 0.5) * spread };
  }

  private spawnEntities() {
    const playerHeroId = this.opts.heroId;
    const others = HEROES.filter((h) => h.id !== playerHeroId).map((h) => h.id);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const allyIds = others.slice(0, 4);
    const enemyIds = others.slice(4, 9);
    const lanes = [0, 1, 2, -1, 1]; // -1 = jungle roam

    const mkHero = (heroId: string, team: TeamId, isPlayer: boolean, lane: number) => {
      const def = heroById(heroId);
      const rec = buildHeroRobot(heroId, team);
      rec.group.scale.setScalar(1.23);
      const pos = this.spawnPos(team, lane === -1 ? 1 : lane, lane === -1 ? 26 : 4);
      rec.group.position.set(pos.x, 0, pos.z);
      rec.group.rotation.y = team === "cyber" ? Math.PI / 2 : -Math.PI / 2;
      this.scene.add(rec.group);
      this.torsoBaseY.set(rec.group.id, rec.torso.position.y);
      const uid = this.uid++;
      const ent: HeroEnt = {
        kind: "hero", uid, heroId, def, team, isPlayer, rec,
        x: pos.x, z: pos.z, angle: team === "cyber" ? Math.PI / 2 : -Math.PI / 2,
        hp: def.stats.hp, maxHp: def.stats.hp, shield: 0, energy: 100, maxEnergy: 100,
        ad: def.stats.ad, armor: def.stats.def, ms: def.stats.ms, as: def.stats.as, range: def.stats.range,
        level: 1, xp: 0, skillPoints: 0,
        skillLevels: { Q: 1, E: 1, R: 1, F: 0 },
        cds: { Q: 0, E: 0, R: 0, F: 0 },
        kills: 0, deaths: 0, assists: 0, gold: 500, goldEarned: 0,
        damageDealt: 0, turretsDestroyed: 0,
        alive: true, respawnAt: 0, deadT: 0, attackCd: 0,
        items: [], buffDamageUntil: 0, omegaUntil: 0, monsterBuffUntil: 0,
        stealthUntil: 0, reflectUntil: 0, asBuffUntil: 0, asBuffPct: 0,
        slowUntil: 0, slowPct: 0, markUntil: 0, markPct: 0,
        lane: lane === -1 ? 1 : lane, aiJungle: lane === -1, aiThinkAt: Math.random(), aiBuyAt: 6 + Math.random() * 9,
        recallT: 0, damagers: [], flash: 0, flickerCd: 0,
      };
      this.heroes.push(ent);
      if (isPlayer) this.player = ent;
      return ent;
    };

    mkHero(playerHeroId, "cyber", true, 1); // player mid lane
    allyIds.forEach((id, i) => mkHero(id, "cyber", false, lanes[i]));
    enemyIds.forEach((id, i) => mkHero(id, "titan", false, lanes[i]));

    for (const lane of [0, 1, 2]) {
      for (const team of ["cyber", "titan"] as TeamId[]) {
        for (let t = 0; t < 3; t++) {
          const offset = [26, 44, 59][t];
          const x = team === "cyber" ? -offset : offset;
          const z = LANE_Z[lane];
          const refs = buildTurret(team);
          refs.group.position.set(x, 0, z);
          this.scene.add(refs.group);
          this.turrets.push({ kind: "turret", uid: this.uid++, team, lane, tier: t, refs, x, z, hp: 820, maxHp: 820, attackCd: Math.random(), alive: true });
        }
      }
    }

    for (const team of ["cyber", "titan"] as TeamId[]) {
      const refs = buildCore(team);
      const x = team === "cyber" ? -ARENA.baseX : ARENA.baseX;
      refs.group.position.set(x, 0, 0);
      this.scene.add(refs.group);
      this.cores.push({ kind: "core", uid: this.uid++, team, refs, x, z: 0, hp: 2000, maxHp: 2000, shield: 550, attackCd: 0, alive: true });
    }

    const bossRec = buildBoss();
    bossRec.group.position.set(0, 0, -14);
    this.scene.add(bossRec.group);
    this.torsoBaseY.set(bossRec.group.id, bossRec.torso.position.y);
    this.boss = { kind: "boss", uid: this.uid++, team: "neutral", rec: bossRec, x: 0, z: -14, angle: 0, hp: 4200, maxHp: 4200, attackCd: 0, slamCd: 4, alive: true, deadT: 0, respawnAt: 0 };

    const campSpots: [MonsterEnt["mtype"], number, number][] = [
      ["scorpion", -27, -13], ["dragon", 27, -13], ["spider", -27, 13], ["spider", 27, 13],
    ];
    for (const [mtype, x, z] of campSpots) {
      const rec = buildMonster(mtype);
      rec.group.position.set(x, 0, z);
      this.scene.add(rec.group);
      this.torsoBaseY.set(rec.group.id, rec.torso.position.y);
      this.monsters.push({ kind: "monster", uid: this.uid++, mtype, rec, x, z, angle: 0, cx: x, cz: z, hp: 560, maxHp: 560, ad: 42, team: "neutral", attackCd: 0, alive: true, respawnAt: 0, deadT: 0 });
    }

    this.camYaw = this.player.team === "cyber" ? -Math.PI * .66 : Math.PI * .34;
    this.camPitch = .72;
    audio.startMusic();
  }

  // ════════════════════════ INPUT ════════════════════════
  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === "tab") e.preventDefault();
    this.keys.add(k);
    if (this.over) return;
    if (k === "q") this.castSkill("Q");
    else if (k === "e") this.castSkill("E");
    else if (k === "r") this.castSkill("R");
    else if (k === "f") this.castSkill("F");
    else if (k === " " || k === "j") { e.preventDefault(); this.basicAttack(); }
    else if (k === "b") this.recall();
    else if (k === "v") this.flicker();
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
  private tapX = 0; private tapY = 0;
  private onPointerDown = (e: PointerEvent) => { this.tapX=e.clientX; this.tapY=e.clientY; this.dragging = true; this.lastPX = e.clientX; this.lastPY = e.clientY; };
  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastPX, dy = e.clientY - this.lastPY;
    this.lastPX = e.clientX; this.lastPY = e.clientY;
    this.camYaw -= dx * 0.0052;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.003, 0.22, 0.95);
  };
  private onPointerUp = (e: PointerEvent) => { if(this.dragging && e.button===0 && Math.hypot(e.clientX-this.tapX,e.clientY-this.tapY)<5) this.basicAttack(); this.dragging = false; };
  private onWheel = (e: WheelEvent) => { this.camDist = THREE.MathUtils.clamp(this.camDist + Math.sign(e.deltaY) * 2.4, 14, 44); };

  private bindInput() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: true });
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  setMoveVector(x: number, y: number) { this.joyMove = { x, y }; }
  clearMoveVector() { this.joyMove = null; }
  setAutoAttack(v: boolean) { this.autoAttack = v; }
  setQuality(q: Quality) { this.opts.quality = q; }

  // ════════════════════════ COMBAT HELPERS ════════════════════════
  private effMs(h: HeroEnt): number {
    let ms = h.ms;
    if (this.matchTime < h.slowUntil) ms *= 1 - h.slowPct;
    if (this.matchTime < h.omegaUntil) ms *= 1.1;
    return ms;
  }
  private effAd(h: HeroEnt): number {
    let ad = h.ad;
    if (this.matchTime < h.buffDamageUntil) ad *= 1.18;
    if (this.matchTime < h.omegaUntil) ad *= 1.15;
    if (this.matchTime < h.monsterBuffUntil) ad *= 1.08;
    return ad;
  }
  private itemStat(h: HeroEnt, stat: string): number {
    let total = 0;
    for (const id of h.items) {
      const item = ITEMS.find((i) => i.id === id);
      const stats = item?.stats as Record<string, number> | undefined;
      const v = stats?.[stat];
      if (typeof v === "number") total += v;
    }
    return total;
  }
  private skillPower(h: HeroEnt, skill: SkillDef): number {
    const rank = Math.max(1, h.skillLevels[skill.key] ?? 1);
    const mp = this.itemStat(h, "mp");
    return (skill.base + skill.per * (rank - 1)) * (1 + mp / 150);
  }
  private maxHpOf(h: HeroEnt): number {
    return Math.round(h.def.stats.hp * (1 + 0.085 * (h.level - 1)) + this.itemStat(h, "hp"));
  }
  private recalcStats(h: HeroEnt) {
    const ratio = h.maxHp > 0 ? h.hp / h.maxHp : 1;
    h.maxHp = this.maxHpOf(h);
    h.hp = Math.min(h.maxHp, Math.max(1, Math.round(h.maxHp * ratio)));
    h.ad = Math.round(h.def.stats.ad * (1 + 0.08 * (h.level - 1)) + this.itemStat(h, "ad"));
    h.armor = Math.round(h.def.stats.def + 2.1 * (h.level - 1) + this.itemStat(h, "def"));
    h.ms = h.def.stats.ms + this.itemStat(h, "ms") / 10;
    h.as = h.def.stats.as * (1 + this.itemStat(h, "as") / 100 + (this.matchTime < h.asBuffUntil ? h.asBuffPct : 0));
  }
  private dist(ax: number, az: number, bx: number, bz: number) { return Math.hypot(ax - bx, az - bz); }
  private mitigation(armor: number) { return 1 - armor / (armor + 170); }

  private hasEnemyMinionNear(x: number, z: number, team: TeamId, radius: number): boolean {
    for (const m of this.minions) if (m.alive && m.team === team && this.dist(x, z, m.x, m.z) <= radius) return true;
    return false;
  }

  private dealDamage(src: AnyEnt | null, target: AnyEnt, raw: number, opts?: { crit?: boolean }) {
    if (!target.alive || this.over) return;
    if(target.kind==='core' && [0,1,2].every(lane=>this.turrets.some(t=>t.team===target.team && t.lane===lane && t.alive))) return;
    let dmg = raw;
    if (opts?.crit) dmg *= 1.6;
    if (target.kind === "hero") {
      dmg *= this.mitigation(target.armor);
      if (target.markUntil > this.matchTime) dmg *= 1 + target.markPct;
      if (target.shield > 0) {
        const absorbed = Math.min(target.shield, dmg);
        target.shield -= absorbed; dmg -= absorbed;
      }
    } else if (target.kind === "minion") {
      dmg *= this.mitigation(8);
    } else if (target.kind === "turret" || target.kind === "core") {
      dmg *= 0.62;
      const srcTeam = src ? teamOf(src) : null;
      if ((srcTeam === "cyber" || srcTeam === "titan") && !this.hasEnemyMinionNear(target.x, target.z, srcTeam, 15)) dmg *= 0.5;
      if (src?.kind === "minion") dmg *= src.mkind === "siege" ? 2.1 : src.mkind === "melee" ? 1.35 : 1.25;
    } else {
      dmg *= this.mitigation(30);
    }
    dmg = Math.max(0, Math.round(dmg));

    if (target.kind === "core" && target.shield > 0) {
      const absorbed = Math.min(target.shield, dmg);
      target.shield -= absorbed; dmg -= absorbed;
      if (target.shield <= 0) this.events.onAnnounce("PERISAI INTI TELAH HANCUR!", "bad");
    }
    target.hp -= dmg;

    if (src?.kind === "hero") {
      src.damageDealt += dmg;
      if (target.kind === "hero") this.logDamager(target, src.uid);
    }
    if (opts?.crit) this.worldFloat(target.x, target.z, `${dmg}!`, "#ffd166");
    if (target.kind === "hero") target.flash = 0.12;

    // Reflect damage (AEGIS)
    if (target.kind === "hero" && target.reflectUntil > this.matchTime && src?.kind === "hero") {
      this.rawHeroDamage(src, Math.round(dmg * 0.5), target);
    }

    if (target.hp <= 0) this.kill(target, src);
  }

  private rawHeroDamage(target: HeroEnt, dmg: number, from: HeroEnt) {
    if (target.shield > 0) { const a = Math.min(target.shield, dmg); target.shield -= a; dmg -= a; }
    target.hp -= dmg;
    if (target.hp <= 0) this.kill(target, from);
  }

  private logDamager(target: HeroEnt, uid: number) {
    target.damagers.push({ uid, t: this.matchTime });
    if (target.damagers.length > 12) target.damagers.shift();
  }

  private healHero(h: HeroEnt, amount: number) {
    if (!h.alive) return;
    h.hp = Math.min(h.maxHp, h.hp + Math.round(amount));
  }

  private worldFloat(x: number, z: number, text: string, color: string) {
    const v = new THREE.Vector3(x, 2.7, z).project(this.camera);
    this.events.onFloat((v.x + 1) / 2, 1 - (v.y + 1) / 2, text, color);
  }

  private kill(target: AnyEnt, src: AnyEnt | null) {
    if (target.hp > 0) return;
    target.hp = 0;
    switch (target.kind) {
      case "hero": {
        target.alive = false;
        target.deadT = 0;
        target.deaths += 1;
        target.recallT = 0;
        target.stealthUntil = 0;
        this.setStealthVisual(target, false);
        const killerTeam = src ? teamOf(src) : null;
        if (killerTeam === "cyber" || killerTeam === "titan") this.teamKills[killerTeam] += 1;
        if (src?.kind === "hero") {
          src.kills += 1;
          src.gold += 300; src.goldEarned += 300;
          this.addXp(src, 190);
          const seen = new Set<number>([src.uid]);
          for (const d of target.damagers) {
            if (seen.has(d.uid) || this.matchTime - d.t > 12) continue;
            seen.add(d.uid);
            const helper = this.heroes.find((h) => h.uid === d.uid);
            if (helper && helper.team === src.team) {
              helper.assists += 1;
              helper.gold += 150; helper.goldEarned += 150;
              this.addXp(helper, 90);
            }
          }
        }
        target.damagers = [];
        for (const h of this.heroes) {
          if (h.alive && h.team !== target.team && this.dist(h.x, h.z, target.x, target.z) < 14) this.addXp(h, 60);
        }
        const killerName = src?.kind === "hero" ? src.def.name : "Pasukan Robot";
        this.events.onKillFeed(`${killerName}  ⚔  ${target.def.name}`);
        this.spawnBurst(target.x, 1.4, target.z, TEAM_GLOW[target.team], 34, 7);
        this.shakeT = Math.max(this.shakeT, 0.35);
        audio.explosion();
        target.respawnAt = this.matchTime + 5 + target.level * 1.6;
        break;
      }
      case "minion": {
        target.alive = false;
        target.deadT = 0;
        const gold = target.mkind === "siege" ? 96 : target.mkind === "ranged" ? 30 : 42;
        const xp = target.mkind === "siege" ? 130 : target.mkind === "ranged" ? 62 : 78;
        if (src?.kind === "hero") { src.gold += gold; src.goldEarned += gold; this.addXp(src, xp); }
        for (const h of this.heroes) if (h.alive && h.team !== target.team && this.dist(h.x, h.z, target.x, target.z) < 12.5) this.addXp(h, Math.round(xp * 0.6));
        this.spawnBurst(target.x, 1, target.z, 0x9fb4ff, 12, 4.5);
        audio.hit();
        break;
      }
      case "turret": {
        target.alive = false;
        this.turretsDown[target.team] += 1;
        this.spawnBurst(target.x, 2.4, target.z, 0xffb04d, 46, 9);
        this.spawnBurst(target.x, 3.6, target.z, TEAM_GLOW[target.team], 30, 7);
        target.refs.head.visible = false;
        this.shakeT = Math.max(this.shakeT, 0.5);
        audio.turretDown();
        if (src?.kind === "hero") {
          src.turretsDestroyed += 1;
          src.gold += 250; src.goldEarned += 250;
          this.addXp(src, 150);
          for (const h of this.heroes) if (h.team === src.team) { h.gold += 120; h.goldEarned += 120; }
        }
        this.events.onAnnounce(target.team === "cyber" ? "TURRET CYBER HANCUR!" : "TURRET TITAN HANCUR!", target.team === "cyber" ? "bad" : "good");
        break;
      }
      case "core": {
        target.alive = false;
        this.spawnBurst(target.x, 4, target.z, TEAM_GLOW[target.team], 70, 11);
        this.spawnBurst(target.x, 2, target.z, 0xffffff, 40, 9);
        audio.coreDown();
        this.endMatch(target.team !== "cyber");
        break;
      }
      case "boss": {
        target.alive = false;
        target.deadT = 0;
        target.respawnAt = this.matchTime + 300;
        const sTeam: TeamId = src?.team === "titan" ? "titan" : "cyber";
        for (const h of this.heroes) {
          if (h.team === sTeam) { h.omegaUntil = this.matchTime + 60; h.gold += 400; h.goldEarned += 400; this.addXp(h, 260); }
        }
        this.events.onAnnounce(`OMEGA COLOSSUS TUMBANG! Tim ${sTeam === "cyber" ? "CYBER" : "TITAN"} mendapat OMEGA PROTOCOL!`, "omega");
        this.shakeT = 1.1;
        audio.explosion();
        this.spawnBurst(target.x, 4, target.z, 0xff4030, 60, 10);
        break;
      }
      case "monster": {
        target.alive = false;
        target.deadT = 0;
        target.respawnAt = this.matchTime + 75;
        if (src?.kind === "hero") { src.gold += 140; src.goldEarned += 140; src.monsterBuffUntil = this.matchTime + 25; this.addXp(src, 170); }
        this.spawnBurst(target.x, 1.2, target.z, 0xffa028, 18, 6);
        break;
      }
    }
  }

  private addXp(h: HeroEnt, amount: number) {
    if (!h.alive) return;
    h.xp += amount;
    while (h.level < 15 && h.xp >= xpNext(h.level)) {
      h.xp -= xpNext(h.level);
      h.level += 1;
      h.skillPoints += 1;
      if (h.level === 4 && h.skillLevels.F === 0) h.skillLevels.F = 1;
      this.recalcStats(h);
      h.hp = Math.min(h.maxHp, h.hp + Math.round(h.maxHp * 0.22));
      if (h.isPlayer) {
        audio.levelUp();
        this.events.onAnnounce(`LEVEL UP! Level ${h.level}`, "good");
        if (!this.quizBlocked) this.openQuiz("levelup");
      }
    }
  }

  private openQuiz(source: QuizSource) {
    if (this.over || this.quizBlocked) return;
    this.quizBlocked = true;
    this.paused = true;
    this.events.onQuiz(source);
  }

  resolveQuiz(result: "correct" | "wrong" | "timeout") {
    const correct = result === "correct";
    if (correct) {
      this.questionsCorrect += 1;
      this.player.gold += 150; this.player.goldEarned += 150;
      this.player.buffDamageUntil = Math.max(this.player.buffDamageUntil, this.matchTime + 20);
      this.player.shield = Math.max(this.player.shield, 120);
      this.events.onAnnounce("+100 KNOWLEDGE XP · +150 GOLD · BUFF!", "good");
    } else {
      this.questionsWrong += 1;
    }
    const wasUltimate = this.pendingUltimate;
    this.pendingUltimate = false;
    // The battle stays PAUSED while the quiz overlay shows the discussion;
    // the client must call closeQuiz() (LANJUTKAN button) to resume.
    if (wasUltimate) this.fireUltimate(correct ? 1.45 : 1);
    this.emitSnapshotSoon();
  }

  closeQuiz() {
    this.quizBlocked = false;
    this.paused = false;
  }

  // ════════════════════════ SKILLS ════════════════════════
  castSkill(key: "Q" | "E" | "R" | "F") {
    if (this.over || this.paused) return;
    const h = this.player;
    if (!h.alive) return;
    const skill = h.def.skills.find((s) => s.key === key);
    if (!skill) return;
    if (key === "F" && h.level < 4) { this.events.onAnnounce("ULTIMATE terbuka di level 4!", "bad"); audio.error(); return; }
    if ((h.cds[key] ?? 0) > 0) { audio.error(); return; }
    if (h.energy < skill.cost) { this.events.onAnnounce("Energy tidak cukup!", "bad"); audio.error(); return; }
    if (key === "F") {
      this.pendingUltimate = true;
      audio.ultimate();
      this.openQuiz("ultimate");
      return;
    }
    this.executeSkill(h, skill, 1);
  }

  private fireUltimate(empower: number) {
    const h = this.player;
    const skill = h.def.skills.find((s) => s.key === "F");
    if (!skill || !h.alive) return;
    this.executeSkill(h, skill, empower);
  }

  private enemiesNear(x: number, z: number, team: TeamId, r: number): AnyEnt[] {
    const out: AnyEnt[] = [];
    const push = (e: AnyEnt) => { if (e.alive && this.dist(x, z, e.x, e.z) <= r) out.push(e); };
    for (const e of this.heroes) if (e.team !== team) push(e);
    for (const e of this.minions) if (e.team !== team) push(e);
    for (const e of this.turrets) if (e.team !== team) push(e);
    for (const e of this.cores) if (e.team !== team) push(e);
    if (this.boss.alive) push(this.boss);
    for (const e of this.monsters) if (e.alive) push(e);
    return out;
  }

  private executeSkill(h: HeroEnt, skill: SkillDef, empower: number) {
    h.cds[skill.key] = skill.cd;
    h.energy = Math.max(0, h.energy - skill.cost);
    const pow = this.skillPower(h, skill) * empower;
    const now = this.matchTime;
    const rank = Math.max(1, h.skillLevels[skill.key] ?? 1);
    const dirX = Math.cos(h.angle), dirZ = Math.sin(h.angle);
    const glowCol = h.team === "cyber" ? 0x38bdf8 : 0xff5040;

    switch (skill.type) {
      case "shield": {
        const amount = pow;
        if (skill.radius !== undefined && skill.radius >= 50) {
          for (const ally of this.heroes) if (ally.team === h.team && ally.alive) ally.shield = Math.min(ally.maxHp * 0.75, ally.shield + amount);
          this.events.onAnnounce("TIM MENDAPAT PERISAI!", "good");
        } else if (skill.radius !== undefined && skill.radius > 0) {
          for (const ally of this.heroes) if (ally.team === h.team && ally.alive && this.dist(h.x, h.z, ally.x, ally.z) <= skill.radius) ally.shield = Math.min(ally.maxHp * 0.75, ally.shield + amount);
        } else {
          h.shield = Math.min(h.maxHp * 0.85, h.shield + amount);
          if (skill.key === "F") h.shield = Math.min(h.maxHp * 1.15, h.shield + amount * 0.35);
        }
        this.spawnBurst(h.x, 1.6, h.z, 0x67e8f9, 22, 5);
        audio.shieldUp();
        break;
      }
      case "slam": case "arc": {
        const radius = skill.radius ?? skill.range ?? 5;
        const stun = skill.key === "F" && (skill.dur ?? 0) > 0 && (skill.dur ?? 1) <= 1.3 ? skill.dur : 0;
        for (const e of this.enemiesNear(h.x, h.z, h.team, radius)) {
          this.dealDamage(h, e, pow, {});
          if (e.kind === "hero") {
            e.slowUntil = now + (skill.dur ?? 1.6);
            e.slowPct = Math.max(e.slowPct, skill.slow ?? 0.3);
            if (stun) { e.slowUntil = now + stun; e.slowPct = 0.92; }
          }
        }
        this.spawnRing(h.x, h.z, radius, glowCol);
        this.shakeT = Math.max(this.shakeT, 0.4);
        audio.explosion();
        break;
      }
      case "dash": {
        const range = skill.range ?? 8;
        const nx = THREE.MathUtils.clamp(h.x + dirX * range, -ARENA.width / 2 + 2, ARENA.width / 2 - 2);
        const nz = THREE.MathUtils.clamp(h.z + dirZ * range, -ARENA.depth / 2 + 2, ARENA.depth / 2 - 2);
        for (const e of this.enemiesNear(h.x, h.z, h.team, range + 3)) {
          if (this.distToSegment(e.x, e.z, h.x, h.z, nx, nz) < 2.3) this.dealDamage(h, e, pow, {});
        }
        h.x = nx; h.z = nz;
        h.rec.group.position.set(nx, 0, nz);
        this.spawnBurst(nx, 1.2, nz, TEAM_GLOW[h.team], 20, 6);
        audio.melee();
        break;
      }
      case "blink": {
        let best: HeroEnt | null = null, bd = skill.range ?? 12;
        for (const e of this.heroes) {
          if (e.team === h.team || !e.alive || e.stealthUntil > now) continue;
          const d = this.dist(h.x, h.z, e.x, e.z);
          if (d < bd) { bd = d; best = e; }
        }
        if (best) {
          const ang = Math.atan2(best.z - h.z, best.x - h.x);
          h.x = THREE.MathUtils.clamp(best.x - Math.cos(ang) * 2.2, -ARENA.width / 2 + 2, ARENA.width / 2 - 2);
          h.z = THREE.MathUtils.clamp(best.z - Math.sin(ang) * 2.2, -ARENA.depth / 2 + 2, ARENA.depth / 2 - 2);
          h.angle = ang;
          this.dealDamage(h, best, pow, {});
        } else {
          h.x = THREE.MathUtils.clamp(h.x + dirX * 5, -ARENA.width / 2 + 2, ARENA.width / 2 - 2);
          h.z = THREE.MathUtils.clamp(h.z + dirZ * 5, -ARENA.depth / 2 + 2, ARENA.depth / 2 - 2);
        }
        h.rec.group.position.set(h.x, 0, h.z);
        this.spawnBurst(h.x, 1.4, h.z, TEAM_GLOW[h.team], 18, 5);
        audio.laser();
        break;
      }
      case "bolt": {
        this.fireProjectile(h, pow, skill);
        audio.laser();
        break;
      }
      case "nova": {
        const r = skill.radius ?? 6;
        for (const e of this.enemiesNear(h.x, h.z, h.team, r)) {
          this.dealDamage(h, e, pow, {});
          if (e.kind === "hero" && skill.slow) { e.slowUntil = now + (skill.dur ?? 1.5); e.slowPct = Math.max(e.slowPct, skill.slow); }
        }
        this.spawnRing(h.x, h.z, r, h.team === "cyber" ? 0x67e8f9 : 0xfb7185);
        audio.explosion();
        break;
      }
      case "heal": {
        const r = skill.radius ?? 8;
        if (skill.key === "F" || r >= 50) {
          for (const ally of this.heroes) if (ally.team === h.team && ally.alive) this.healHero(ally, this.maxHpOf(ally));
          this.events.onAnnounce("TIM DIPULIHKAN PENUH!", "good");
        } else {
          for (const ally of this.heroes) if (ally.team === h.team && ally.alive && this.dist(h.x, h.z, ally.x, ally.z) <= r) this.healHero(ally, pow);
        }
        this.spawnBurst(h.x, 1.6, h.z, 0x34d399, 26, 6);
        audio.heal();
        break;
      }
      case "revive": {
        for (const ally of this.heroes) {
          if (ally.team !== h.team) continue;
          this.recalcStats(ally);
          if (!ally.alive) {
            ally.alive = true;
            ally.maxHp = this.maxHpOf(ally);
            ally.hp = Math.round(ally.maxHp * 0.5);
            ally.shield = 0;
            ally.deadT = 0;
            ally.respawnAt = 0;
            ally.rec.group.visible = true;
            ally.rec.group.rotation.x = 0;
            ally.rec.group.position.y = 0;
            const sp = this.spawnPos(ally.team, ally.lane, 4);
            ally.x = sp.x; ally.z = sp.z;
            ally.rec.group.position.set(sp.x, 0, sp.z);
          } else {
            this.healHero(ally, ally.maxHp);
          }
        }
        this.events.onAnnounce("RESURRECTION FIELD!", "good");
        this.spawnRing(h.x, h.z, 14, 0x34d399);
        audio.heal();
        break;
      }
      case "buffAS": {
        const r = skill.radius ?? 10;
        const pct = skill.base + skill.per * (rank - 1);
        for (const ally of this.heroes) if (ally.team === h.team && ally.alive && this.dist(h.x, h.z, ally.x, ally.z) <= r) {
          ally.asBuffUntil = now + (skill.dur ?? 4);
          ally.asBuffPct = Math.max(ally.asBuffPct, pct);
          this.recalcStats(ally);
        }
        this.spawnBurst(h.x, 1.6, h.z, 0xfde047, 20, 5);
        audio.shieldUp();
        break;
      }
      case "mark": {
        let best: HeroEnt | null = null, bd = skill.range ?? 15;
        for (const e of this.heroes) {
          if (e.team === h.team || !e.alive) continue;
          const d = this.dist(h.x, h.z, e.x, e.z);
          if (d < bd) { bd = d; best = e; }
        }
        if (best) {
          this.dealDamage(h, best, pow, {});
          best.markUntil = now + (skill.dur ?? 4);
          best.markPct = 0.3;
          this.worldFloat(best.x, best.z, "TARGET LOCKED", "#22d3ee");
        } else {
          this.events.onAnnounce("Tidak ada target dalam jangkauan", "bad");
        }
        audio.laser();
        break;
      }
      case "chain": {
        let fx = h.x, fz = h.z;
        const hitSet = new Set<number>();
        for (let i = 0; i < 4; i++) {
          let best: AnyEnt | null = null, bd = i === 0 ? (skill.range ?? 14) : 9;
          for (const e of this.enemiesNear(fx, fz, h.team, 40)) {
            if (hitSet.has(e.uid)) continue;
            const d = this.dist(fx, fz, e.x, e.z);
            if (d < bd) { bd = d; best = e; }
          }
          if (!best) break;
          this.dealDamage(h, best, pow, {});
          hitSet.add(best.uid);
          this.spawnBoltArc(fx, 1.6, fz, best.x, 1.6, best.z);
          fx = best.x; fz = best.z;
        }
        audio.laser();
        break;
      }
      case "storm": {
        const strikes = Math.round(skill.dur ?? 5);
        const r = skill.radius ?? 13;
        const ox = h.x, oz = h.z;
        for (let i = 0; i < strikes; i++) {
          window.setTimeout(() => {
            if (this.disposed || this.over) return;
            const targets = this.enemiesNear(ox, oz, h.team, r);
            const pick = targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)] : null;
            const tx = pick ? pick.x : ox + (Math.random() - 0.5) * r;
            const tz = pick ? pick.z : oz + (Math.random() - 0.5) * r;
            if (pick) this.dealDamage(h, pick, pow, {});
            this.spawnBurst(tx, 0.6, tz, 0xfde047, 22, 7);
            this.spawnRing(tx, tz, 3.4, 0xfde047);
            audio.explosion();
            this.shakeT = Math.max(this.shakeT, 0.25);
          }, 240 + i * 320);
        }
        break;
      }
      case "execute": {
        let best: HeroEnt | null = null, bd = skill.range ?? 11;
        for (const e of this.heroes) {
          if (e.team === h.team || !e.alive) continue;
          const d = this.dist(h.x, h.z, e.x, e.z);
          if (d < bd) { bd = d; if (!best || e.hp / e.maxHp < best.hp / best.maxHp) best = e; }
        }
        if (best) {
          this.dealDamage(h, best, pow, { crit: true });
          this.spawnBoltArc(h.x, 1.8, h.z, best.x, 1.8, best.z);
          this.worldFloat(best.x, best.z, "EXECUTE!", "#ff5040");
        } else {
          this.events.onAnnounce("Tidak ada target untuk dieksekusi", "bad");
        }
        audio.ultimate();
        break;
      }
      case "stealth": {
        h.stealthUntil = now + (skill.dur ?? 3.5);
        this.setStealthVisual(h, true);
        audio.shieldUp();
        break;
      }
      case "reflect": {
        h.reflectUntil = now + (skill.dur ?? 4);
        audio.shieldUp();
        break;
      }
      case "zone": {
        const range = 8;
        const zx = THREE.MathUtils.clamp(h.x + dirX * range, -ARENA.width / 2 + 3, ARENA.width / 2 - 3);
        const zz = THREE.MathUtils.clamp(h.z + dirZ * range, -ARENA.depth / 2 + 3, ARENA.depth / 2 - 3);
        this.addZone(h.team, zx, zz, skill.radius ?? 6, skill.slow ?? 0.5, pow, skill.dur ?? 4, h.team === "cyber" ? 0x67e8f9 : 0xc084fc);
        audio.laser();
        break;
      }
      default:
        break;
    }
    if (h.isPlayer) this.emitSnapshotSoon();
  }

  private distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
    const dx = bx - ax, dz = bz - az;
    const len2 = dx * dx + dz * dz;
    if (len2 === 0) return Math.hypot(px - ax, pz - az);
    let t = ((px - ax) * dx + (pz - az) * dz) / len2;
    t = THREE.MathUtils.clamp(t, 0, 1);
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
  }

  private setStealthVisual(h: HeroEnt, on: boolean) {
    for (const m of h.rec.mats) { m.transparent = on; m.opacity = on ? 0.32 : 1; m.needsUpdate = true; }
  }

  private fireProjectile(h: HeroEnt, dmg: number, skill?: SkillDef) {
    const range = skill?.range ?? 26;
    let tx = h.x + Math.cos(h.angle) * 10, tz = h.z + Math.sin(h.angle) * 10;
    let bd = 32;
    for (const e of [...this.heroes, ...this.minions, ...this.turrets, ...this.cores] as AnyEnt[]) {
      if (e.team === h.team || !e.alive) continue;
      const d = this.dist(h.x, h.z, e.x, e.z);
      if (d < bd) { bd = d; tx = e.x; tz = e.z; }
    }
    const ang = Math.atan2(tz - h.z, tx - h.x);
    const color = skill ? 0xc084fc : TEAM_GLOW[h.team];
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(skill ? 0.34 : 0.16, 8, 6),
      new THREE.MeshBasicMaterial({ color })
    );
    mesh.position.set(h.x, 1.6, h.z);
    this.scene.add(mesh);
    this.projectiles.push({
      uid: this.uid++, team: h.team, x: h.x, y: 1.6, z: h.z,
      vx: Math.cos(ang), vz: Math.sin(ang), speed: skill ? 30 : 38,
      dmg, life: range / (skill ? 30 : 38), color, radius: skill ? 1.5 : 0.9,
      fromUid: h.uid, fromTurret: false, crit: false, mesh,
    });
  }

  private turretFire(t: TurretEnt | CoreEnt, target: AnyEnt, dmg: number) {
    const color = 0xff8a5c;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color }));
    mesh.position.set(t.x, 3.2, t.z);
    this.scene.add(mesh);
    const ang = Math.atan2(target.z - t.z, target.x - t.x);
    this.projectiles.push({
      uid: this.uid++, team: t.team, x: t.x, y: 3.2, z: t.z,
      vx: Math.cos(ang), vz: Math.sin(ang), speed: 26, dmg, life: 1.5,
      color, radius: 1.35, fromUid: t.uid, fromTurret: true, crit: false, mesh,
    });
    audio.turretFire();
  }

  basicAttack() {
    if (this.over || this.paused) return;
    const h = this.player;
    if (!h.alive || h.attackCd > 0) return;
    this.heroAttack(h, true);
  }

  private heroAttack(h: HeroEnt, byPlayer: boolean): boolean {
    const candidates: AnyEnt[] = [
      ...this.heroes, ...this.minions, ...this.turrets, ...this.cores,
      ...(this.boss.alive ? [this.boss as AnyEnt] : []),
      ...this.monsters.filter((m) => m.alive),
    ];
    let best: AnyEnt | null = null, bd = h.range;
    for (const e of candidates) {
      if (!e.alive || e.team === h.team) continue;
      if (e.kind === "hero" && (e.stealthUntil ?? 0) > this.matchTime) continue;
      const bias = e.kind === "hero" ? 2.2 : 0;
      const size = e.kind === "turret" ? 2.2 : e.kind === "core" ? 4.8 : e.kind === "boss" ? 1.2 : 0;
      const d = this.dist(h.x, h.z, e.x, e.z) - bias - size;
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) {
      if (byPlayer) this.events.onFloat(0.5, 0.72, "Tidak ada musuh dalam jangkauan", "#94a3b8");
      return false;
    }
    const target: AnyEnt = best;
    h.angle = Math.atan2(target.z - h.z, target.x - h.x);
    h.attackCd = 1 / Math.max(0.2, h.as);
    h.rec.attackAnim = 0.32;
    if (this.matchTime < h.stealthUntil) { h.stealthUntil = 0; this.setStealthVisual(h, false); }
    const crit = Math.random() * 100 < 5 + this.itemStat(h, "crit");
    if (h.def.ranged) {
      const ang = h.angle;
      const color = TEAM_GLOW[h.team];
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshBasicMaterial({ color }));
      mesh.position.set(h.x, 1.6, h.z);
      this.scene.add(mesh);
      this.projectiles.push({
        uid: this.uid++, team: h.team, x: h.x, y: 1.6, z: h.z,
        vx: Math.cos(ang), vz: Math.sin(ang), speed: 38,
        dmg: this.effAd(h), life: 1.1, color, radius: 0.9,
        fromUid: h.uid, fromTurret: false, crit, mesh,
      });
      if (byPlayer || this.dist(h.x, h.z, this.player.x, this.player.z) < 34) audio.shoot();
    } else {
      this.dealDamage(h, target, this.effAd(h), { crit });
      this.spawnBurst(target.x, 1.3, target.z, TEAM_GLOW[h.team], 6, 3.5);
      if (byPlayer || this.dist(h.x, h.z, this.player.x, this.player.z) < 20) audio.melee();
    }
    return true;
  }

  recall() {
    if (this.over || this.paused) return;
    const h = this.player;
    if (!h.alive || h.recallT > 0) return;
    h.recallT = 0.0001;
    audio.recall();
  }

  flicker() {
    if (this.over || this.paused) return;
    const h = this.player;
    if (!h.alive) return;
    if (h.flickerCd > 0) { audio.error(); return; }
    const dirX = this.joyMove ? this.joyMove.x : Math.cos(h.angle);
    const dirZ = this.joyMove ? this.joyMove.y : Math.sin(h.angle);
    const len = Math.hypot(dirX, dirZ) || 1;
    h.x = THREE.MathUtils.clamp(h.x + (dirX / len) * 9, -ARENA.width / 2 + 2, ARENA.width / 2 - 2);
    h.z = THREE.MathUtils.clamp(h.z + (dirZ / len) * 9, -ARENA.depth / 2 + 2, ARENA.depth / 2 - 2);
    h.rec.group.position.set(h.x, 0, h.z);
    h.flickerCd = 26;
    this.spawnBurst(h.x, 1.3, h.z, 0xa78bfa, 18, 6);
    audio.laser();
  }

  // ════════════════════════ SHOP ════════════════════════
  buyItem(id: string): { ok: boolean; msg: string } {
    const h = this.player;
    const item = ITEMS.find((i) => i.id === id);
    if (!item) return { ok: false, msg: "Item tidak ditemukan" };
    if (h.items.length >= 6) return { ok: false, msg: "Inventory penuh (6 slot)" };
    if (h.items.includes(id)) return { ok: false, msg: "Item unik — tidak bisa duplikat" };
    if (h.gold < item.price) { audio.error(); return { ok: false, msg: "Gold tidak cukup" }; }
    h.gold -= item.price;
    h.items.push(id);
    this.recalcStats(h);
    audio.buy();
    this.emitSnapshotSoon();
    return { ok: true, msg: `${item.name} dibeli!` };
  }
  sellItem(index: number): { ok: boolean; msg: string } {
    const h = this.player;
    const id = h.items[index];
    if (!id) return { ok: false, msg: "Slot kosong" };
    const item = ITEMS.find((i) => i.id === id)!;
    const refund = Math.floor(item.price * 0.7);
    h.gold += refund;
    h.items.splice(index, 1);
    this.recalcStats(h);
    audio.coin();
    this.emitSnapshotSoon();
    return { ok: true, msg: `${item.name} terjual (+${refund}g)` };
  }
  upgradeSkill(key: "Q" | "E" | "R" | "F") {
    const h = this.player;
    if (h.skillPoints <= 0) return;
    if (key === "F") {
      if (h.level < 4 || h.skillLevels.F >= 1) return;
      h.skillLevels.F = 1; h.skillPoints -= 1;
    } else {
      const cur = h.skillLevels[key] ?? 1;
      if (cur >= 3) return;
      h.skillLevels[key] = cur + 1; h.skillPoints -= 1;
    }
    audio.buy();
    this.emitSnapshotSoon();
  }

  // ════════════════════════ AI ════════════════════════
  private aiBuildOrder(h: HeroEnt): string[] {
    const id = h.heroId;
    if (id === "titan" || id === "aegis") return ["guardian_plate", "titanium_armor", "quantum_shield", "turbo_boots", "energy_barrier", "regen_chip"];
    if (id === "nexa" || id === "photon") return ["regen_chip", "plasma_crystal", "healing_core", "energy_amplifier", "jet_engine", "cosmic_orb"];
    if (id === "frost") return ["titanium_armor", "plasma_crystal", "guardian_plate", "jet_engine", "cosmic_orb", "energy_barrier"];
    return ["plasma_sword", "turbo_boots", "laser_cannon", "quantum_rifle", "critical_core", "hyper_drive"];
  }

  private aiThink(h: HeroEnt, dt: number) {
    // Decision rate depends on difficulty; locomotion runs every simulation tick.
    if (this.matchTime < h.aiThinkAt) { const g=this.goals.get(h.uid); if(g)this.moveToward(h,g.x,g.z,dt,this.effMs(h)); return; }
    this.goals.delete(h.uid);
    const advance=(x:number,z:number)=>{this.goals.set(h.uid,{x,z});this.moveToward(h,x,z,dt,this.effMs(h));};
    h.aiThinkAt = this.matchTime + (this.opts.difficulty === "hard" ? 0.32 : this.opts.difficulty === "easy" ? 0.8 : 0.5);

    const hpRatio = h.hp / h.maxHp;
    if (hpRatio < 0.26) { advance(h.team === "cyber" ? -ARENA.baseX + 6 : ARENA.baseX - 6, 0); return; }

    const aggro = this.opts.difficulty === "hard" && h.team === "titan" ? 16.5 : this.opts.difficulty === "easy" && h.team === "titan" ? 11 : 13.5;
    let target: AnyEnt | null = null, bd = Infinity;
    for (const e of this.heroes) {
      if (e.team === h.team || !e.alive) continue;
      if (e.stealthUntil > this.matchTime) continue;
      const d = this.dist(h.x, h.z, e.x, e.z);
      if (d < aggro && d < bd) { bd = d; target = e; }
    }
    if (!target) for (const e of this.minions) {
      if (e.team === h.team || !e.alive) continue;
      const d = this.dist(h.x, h.z, e.x, e.z);
      if (d < 11 && d < bd) { bd = d; target = e; }
    }
    if (!target) for (const e of this.turrets) {
      if (e.team === h.team || !e.alive) continue;
      const d = this.dist(h.x, h.z, e.x, e.z);
      if (d < 13.5 && d < bd) { bd = d; target = e; }
    }
    if (!target) for (const e of this.cores) {
      if (e.team === h.team || !e.alive) continue;
      const d = this.dist(h.x, h.z, e.x, e.z);
      if (d < 15.5 && d < bd) { bd = d; target = e; }
    }
    if (!target && h.aiJungle) {
      for (const mo of this.monsters) {
        if (mo.alive && this.dist(h.x, h.z, mo.x, mo.z) < 24) { target=mo; break; }
      }
      if (this.boss.alive && hpRatio > 0.6 && this.dist(h.x, h.z, this.boss.x, this.boss.z) < 22) target = this.boss;
    }

    if (target) {
      const d = this.dist(h.x, h.z, target.x, target.z);
      if (d > h.range * 0.85 + (target.kind === "turret" ? 2.0 : target.kind === "core" ? 4.5 : 0)) {
        advance(target.x, target.z);
      } else {
        h.angle = Math.atan2(target.z - h.z, target.x - h.x);
        if (h.attackCd <= 0) this.heroAttack(h, false);
      }
      const useSkillP = h.team === "titan"
        ? (this.opts.difficulty === "hard" ? 0.85 : this.opts.difficulty === "easy" ? 0.35 : 0.62)
        : 0.6;
      if (Math.random() < useSkillP) this.aiCastSkills(h, target);
      return;
    }

    const dir = h.team === "cyber" ? 1 : -1;
    const laneZ = LANE_Z[h.lane];
    let defend: TurretEnt | null = null;
    for (const t of this.turrets) {
      if (t.team === h.team && t.lane === h.lane && t.alive && this.enemyWithin(t.x, t.z, 14, h.team)) { defend = t; break; }
    }
    const goalX = defend ? defend.x : dir * (ARENA.baseX - 4);
    const pathOpen=!this.turrets.some(t=>t.team!==h.team && t.lane===h.lane && t.alive);
    advance(goalX, (pathOpen && !defend ? 0 : laneZ) + Math.sin(this.matchTime * 0.35 + h.uid * 2.1) * 2.2);
  }

  private enemyWithin(x: number, z: number, r: number, team: TeamId): boolean {
    for (const e of [...this.heroes, ...this.minions] as AnyEnt[]) {
      if (e.team !== team && e.alive && this.dist(x, z, e.x, e.z) < r) return true;
    }
    return false;
  }

  private aiCastSkills(h: HeroEnt, target: AnyEnt) {
    const now = this.matchTime;
    for (const skill of h.def.skills) {
      if (skill.key === "F") continue;
      if ((h.cds[skill.key] ?? 0) > 0) continue;
      if (h.energy < skill.cost) continue;
      const hpRatio = h.hp / h.maxHp;
      if (skill.type === "heal" && hpRatio > 0.6) continue;
      if (["bolt", "arc", "mark", "chain"].includes(skill.type) && this.dist(h.x, h.z, target.x, target.z) > (skill.range ?? 20)) continue;
      this.executeSkill(h, skill, 1);
      break;
    }
    if (h.level >= 4 && (h.cds.F ?? 0) <= 0) {
      const hurt = this.heroes.find((e) => e.team !== h.team && e.alive && e.hp / e.maxHp < 0.45 && this.dist(h.x, h.z, e.x, e.z) < 13);
      if (hurt && Math.random() < 0.75) {
        const skill = h.def.skills.find((s) => s.key === "F")!;
        this.executeSkill(h, skill, 1);
      }
    }
    void now;
  }

  private aiBuy(h: HeroEnt) {
    if (this.matchTime < h.aiBuyAt) return;
    h.aiBuyAt = this.matchTime + 12;
    for (const id of this.aiBuildOrder(h)) {
      const item = ITEMS.find((i) => i.id === id)!;
      if (!h.items.includes(id) && h.gold >= item.price && h.items.length < 6) {
        h.gold -= item.price;
        h.items.push(id);
        this.recalcStats(h);
        break;
      }
    }
    while (h.skillPoints > 0) {
      const r = h.skillLevels.R ?? 1;
      if (r < 3) { h.skillLevels.R = r + 1; h.skillPoints--; continue; }
      const q = h.skillLevels.Q ?? 1;
      if (q < 3) { h.skillLevels.Q = q + 1; h.skillPoints--; continue; }
      const e = h.skillLevels.E ?? 1;
      if (e < 3) { h.skillLevels.E = e + 1; h.skillPoints--; continue; }
      break;
    }
  }

  private moveToward(e: { x: number; z: number; angle: number }, tx: number, tz: number, dt: number, speed: number) {
    const dx = tx - e.x, dz = tz - e.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.3) return;
    const sp = speed;
    e.x = THREE.MathUtils.clamp(e.x + (dx / len) * sp * dt, -ARENA.width / 2 + 2, ARENA.width / 2 - 2);
    e.z = THREE.MathUtils.clamp(e.z + (dz / len) * sp * dt, -ARENA.depth / 2 + 2, ARENA.depth / 2 - 2);
    e.angle = Math.atan2(dz, dx);
  }

  // ════════════════════════ MINION WAVES ════════════════════════
  private spawnWave() {
    this.waveCount += 1;
    const siege = this.waveCount % 2 === 0;
    const otStage = this.matchTime > 720 ? 2.6 : this.matchTime > 480 ? 1.55 : 1;
    const overtime = otStage > 1;
    void overtime;
    for (const team of ["cyber", "titan"] as TeamId[]) {
      for (const lane of [0, 1, 2]) {
        const kinds: MinionEnt["mkind"][] = ["melee", "melee", "melee", "ranged", "ranged"];
        if (siege) kinds.push("siege");
        for (const mkind of kinds) {
          const alive = this.minions.reduce((acc, m) => acc + (m.team === team && m.alive ? 1 : 0), 0);
          if (alive > 34) continue;
          const rec = buildMinion(mkind, team);
          const pos = this.spawnPos(team, lane, 5);
          rec.group.position.set(pos.x, 0, pos.z);
          this.scene.add(rec.group);
          this.torsoBaseY.set(rec.group.id, rec.torso.position.y);
          const otMul = otStage;
          const stats = mkind === "melee"
            ? { hp: Math.round(340 * otMul), ad: Math.round(30 * otMul), range: 2.1, ms: 6.4 }
            : mkind === "ranged"
              ? { hp: Math.round(215 * otMul), ad: Math.round(34 * otMul), range: 9.5, ms: 6.4 }
              : { hp: Math.round(760 * otMul), ad: Math.round(68 * otMul), range: 6.5, ms: 5.2 };
          this.minions.push({
            kind: "minion", uid: this.uid++, team, mkind, lane, rec,
            x: rec.group.position.x, z: rec.group.position.z, angle: team === "cyber" ? 0 : Math.PI,
            hp: stats.hp, maxHp: stats.hp, ad: stats.ad, range: stats.range, ms: stats.ms,
            attackCd: Math.random() * 0.8, alive: true, deadT: 0, flash: 0,
          });
        }
      }
    }
  }

  // ════════════════════════ PARTICLES ════════════════════════
  private spawnBurst(x: number, y: number, z: number, color: number, count: number, speed: number) {
    const col = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      if (this.particleCount >= this.maxParticles) return;
      const idx = this.particleCount++;
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
      const sp = speed * (0.35 + Math.random() * 0.75);
      this.pPos[idx * 3] = x; this.pPos[idx * 3 + 1] = y; this.pPos[idx * 3 + 2] = z;
      this.pVel[idx * 3] = Math.cos(a) * Math.cos(b) * sp;
      this.pVel[idx * 3 + 1] = Math.abs(Math.sin(b) * sp) + 1.5;
      this.pVel[idx * 3 + 2] = Math.sin(a) * Math.cos(b) * sp;
      this.pLife[idx] = 0.5 + Math.random() * 0.6;
      this.pCol[idx * 3] = col.r; this.pCol[idx * 3 + 1] = col.g; this.pCol[idx * 3 + 2] = col.b;
    }
  }
  private spawnRing(x: number, z: number, radius: number, color: number) {
    this.spawnBurst(x, 0.5, z, color, 26, radius * 1.4);
  }
  private spawnBoltArc(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) {
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const jitter = Math.sin(t * 31 + this.matchTime * 40) * 0.35;
      this.spawnBurst(x1 + (x2 - x1) * t + jitter, y1 + (y2 - y1) * t + (Math.random() - 0.5) * 0.3, z1 + (z2 - z1) * t + jitter, 0xfde047, 2, 1.2);
    }
  }
  private updateParticles(dt: number) {
    let i = 0;
    while (i < this.particleCount) {
      this.pLife[i] -= dt;
      if (this.pLife[i] <= 0) {
        const last = --this.particleCount;
        for (let k = 0; k < 3; k++) {
          this.pPos[i * 3 + k] = this.pPos[last * 3 + k];
          this.pVel[i * 3 + k] = this.pVel[last * 3 + k];
          this.pCol[i * 3 + k] = this.pCol[last * 3 + k];
        }
        this.pLife[i] = this.pLife[last];
        continue;
      }
      this.pVel[i * 3 + 1] -= 11 * dt;
      this.pPos[i * 3] += this.pVel[i * 3] * dt;
      this.pPos[i * 3 + 1] = Math.max(0.08, this.pPos[i * 3 + 1] + this.pVel[i * 3 + 1] * dt);
      this.pPos[i * 3 + 2] += this.pVel[i * 3 + 2] * dt;
      i++;
    }
    this.pGeo.attributes.position.needsUpdate = true;
    this.pGeo.attributes.color.needsUpdate = true;
    this.pGeo.setDrawRange(0, this.particleCount);
  }

  // ════════════════════════ MAIN LOOP ════════════════════════
  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    if (!this.paused && !this.over) this.update(dt);
    this.timeAccum += dt;
    this.updateCamera(dt);
    this.updateParticles(dt);
    this.updateAnim(dt);
    this.renderer.render(this.scene, this.camera);
    this.snapshotTimer -= dt;
    if (this.snapshotTimer <= 0) { this.snapshotTimer = 0.12; this.events.onSnapshot(this.buildSnapshot()); }
  };

  private update(dt: number) {
    this.matchTime += dt;

    this.waveTimer -= dt;
    if (this.waveTimer <= 0) { this.waveTimer = this.matchTime > 720 ? 17 : this.matchTime > 480 ? 20 : 24; this.spawnWave(); }
    if (this.matchTime > 480 && !this.overtimeAnnounced) {
      this.overtimeAnnounced = true;
      this.events.onAnnounce("OVERTIME PROTOCOL — MINION DIPERKUAT!", "omega");
    }
    if (this.matchTime > 600 && !this.decayAnnounced) {
      this.decayAnnounced = true;
      this.events.onAnnounce("STRUCTURE DECAY — TURRET MELEMAH!", "omega");
    }
    // Structure Decay: after 10 minutes, turrets and cores rapidly decay
    if (this.matchTime > 600) {
      const decay = 0.014 * dt;
      for (const t of this.turrets) if (t.alive) {
        t.hp -= t.maxHp * decay;
        if (t.hp <= 0) { t.hp = 0; this.kill(t, null); }
      }
      // Cores are never destroyed by a timer: a real attack must finish the match.
    }

    const h = this.player;
    h.gold += 1.35 * dt;
    h.goldEarned += 1.35 * dt;

    // ── Player movement (camera-relative) ──
    let ix = 0, iz = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) iz -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) iz += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) ix -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) ix += 1;
    if (this.joyMove) { ix = this.joyMove.x; iz = this.joyMove.y; }
    if ((ix !== 0 || iz !== 0) && h.alive) {
      const len = Math.hypot(ix, iz);
      const nx = ix / len, nz = iz / len;
      const sin = Math.sin(this.camYaw), cos = Math.cos(this.camYaw);
      const fx = -sin, fz = -cos;
      const rx = cos, rz = -sin;
      let mx = fx * -nz + rx * nx;
      let mz = fz * -nz + rz * nx;
      const mlen = Math.hypot(mx, mz) || 1;
      mx /= mlen; mz /= mlen;
      const slowMul = this.matchTime < h.slowUntil ? 1 - h.slowPct : 1;
      const sp = this.effMs(h) * slowMul;
      h.x = THREE.MathUtils.clamp(h.x + mx * sp * dt, -ARENA.width / 2 + 2, ARENA.width / 2 - 2);
      h.z = THREE.MathUtils.clamp(h.z + mz * sp * dt, -ARENA.depth / 2 + 2, ARENA.depth / 2 - 2);
      h.angle = Math.atan2(mz, mx);
      h.recallT = 0;
    }

    // recall channel
    if (h.recallT > 0) {
      h.recallT += dt / 3.6;
      if (h.recallT >= 1) {
        const sp = this.spawnPos(h.team, 1, 6);
        h.x = sp.x; h.z = sp.z;
        h.rec.group.position.set(sp.x, 0, sp.z);
        this.spawnBurst(sp.x, 1.5, sp.z, 0xa78bfa, 26, 6);
        audio.recall();
        h.recallT = 0;
      }
    }

    // ── Heroes upkeep ──
    for (const hero of this.heroes) {
      hero.attackCd = Math.max(0, hero.attackCd - dt);
      for (const k of Object.keys(hero.cds)) hero.cds[k] = Math.max(0, hero.cds[k] - dt);
      hero.flickerCd = Math.max(0, hero.flickerCd - dt);
      hero.energy = Math.min(hero.maxEnergy, hero.energy + 9.5 * dt);
      const regen = hero.maxHp * 0.0035 + this.itemStat(hero, "regen");
      if(hero.alive)hero.hp = Math.min(hero.maxHp, hero.hp + (regen + (this.dist(hero.x,hero.z,hero.team==='cyber'?-ARENA.baseX:ARENA.baseX,0)<12?hero.maxHp*.055:0)) * dt);
      hero.flash = Math.max(0, hero.flash - dt);
      hero.rec.attackAnim = Math.max(0, hero.rec.attackAnim - dt);
      if (!hero.alive) {
        hero.deadT += dt;
        hero.rec.group.rotation.x = -Math.min(Math.PI / 2.15, hero.deadT * 2.4);
        hero.rec.group.position.y = -Math.max(0, hero.deadT - 1.15) * 1.1;
        if (this.matchTime >= hero.respawnAt && hero.respawnAt > 0) {
          hero.alive = true;
          hero.respawnAt = 0;
          this.recalcStats(hero);
          hero.hp = hero.maxHp;
          hero.shield = 0;
          hero.energy = hero.maxEnergy;
          hero.rec.group.rotation.x = 0;
          hero.rec.group.position.y = 0;
          const sp = this.spawnPos(hero.team, hero.lane, 5);
          hero.x = sp.x; hero.z = sp.z;
          hero.rec.group.position.set(sp.x, 0, sp.z);
          this.spawnBurst(sp.x, 1.5, sp.z, TEAM_GLOW[hero.team], 22, 6);
        }
        continue;
      }
      if (hero.stealthUntil > 0 && this.matchTime > hero.stealthUntil) { hero.stealthUntil = 0; this.setStealthVisual(hero, false); }
      if (hero.asBuffUntil > 0 && this.matchTime > hero.asBuffUntil) { hero.asBuffPct = 0; hero.asBuffUntil = 0; this.recalcStats(hero); }
      if (!hero.isPlayer) {
        this.aiThink(hero, dt);
        this.aiBuy(hero);
      }
      if (hero.isPlayer && this.autoAttack && hero.attackCd <= 0 && !this.paused) {
        this.heroAttack(hero, false);
      }
      hero.rec.group.position.set(hero.x, 0, hero.z);
      hero.rec.group.rotation.y = -hero.angle + Math.PI / 2;
    }

    // hero-hero collision
    for (let i = 0; i < this.heroes.length; i++) {
      const a = this.heroes[i]; if (!a.alive) continue;
      for (let j = i + 1; j < this.heroes.length; j++) {
        const b = this.heroes[j]; if (!b.alive) continue;
        const dx = b.x - a.x, dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d < 1.9 && d > 0.01) {
          const push = (1.9 - d) / 2;
          const nx = dx / d, nz = dz / d;
          a.x -= nx * push; a.z -= nz * push;
          b.x += nx * push; b.z += nz * push;
        }
      }
    }
    for (const hero of this.heroes) {
      if (!hero.alive) continue;
      for (const t of this.turrets) if (t.alive) this.pushOut(hero, t.x, t.z, 3.4);
      for (const c of this.cores) if (c.alive) this.pushOut(hero, c.x, c.z, 6.2);
    }

    // ── Minions ──
    for (const m of this.minions) {
      if (!m.alive) {
        m.deadT += dt;
        m.rec.group.rotation.x = -Math.min(Math.PI / 2.2, m.deadT * 3);
        m.rec.group.position.y = -Math.max(0, m.deadT - 0.8) * 1.4;
        continue;
      }
      m.attackCd = Math.max(0, m.attackCd - dt);
      m.flash = Math.max(0, m.flash - dt);
      const dir = m.team === "cyber" ? 1 : -1;
      let target: AnyEnt | null = null, bd = 10;
      for (const e of [...this.heroes, ...this.minions] as AnyEnt[]) {
        if (e.team === m.team || !e.alive) continue;
        const d = this.dist(m.x, m.z, e.x, e.z);
        if (d < bd) { bd = d; target = e; }
      }
      if (!target) for (const e of this.turrets) {
        if (e.team === m.team || !e.alive) continue;
        const d = this.dist(m.x, m.z, e.x, e.z);
        if (d < bd + 3.5) { bd = d; target = e; }
      }
      if (!target) for (const e of this.cores) {
        if (e.team === m.team || !e.alive) continue;
        const d = this.dist(m.x, m.z, e.x, e.z);
        if (d < bd + 5.5) { bd = d; target = e; }
      }
      if (target) {
        const d = this.dist(m.x, m.z, target.x, target.z);
        if (d > m.range) this.moveToward(m, target.x, target.z, dt, m.ms);
        else {
          m.angle = Math.atan2(target.z - m.z, target.x - m.x);
          if (m.attackCd <= 0) {
            m.attackCd = 1.15;
            m.rec.attackAnim = 0.3;
            const dmg = this.opts.difficulty === "hard" && m.team === "titan" ? m.ad * 1.15 : m.ad;
            if (m.mkind === "ranged") this.minionShoot(m, target, dmg);
            else this.dealDamage(m, target, dmg, {});
          }
        }
      } else {
        const opened=!this.turrets.some(t=>t.team!==m.team && t.lane===m.lane && t.alive);
        this.moveToward(m, dir * ARENA.baseX, opened ? 0 : LANE_Z[m.lane], dt, m.ms);
      }
      m.rec.group.position.set(m.x, 0, m.z);
      m.rec.group.rotation.y = -m.angle + Math.PI / 2;
      for (const o of this.minions) {
        if (o === m || !o.alive) continue;
        const dx = o.x - m.x, dz = o.z - m.z, d = Math.hypot(dx, dz);
        if (d < 1.15 && d > 0.01) { m.x -= (dx / d) * (1.15 - d) * 0.5; m.z -= (dz / d) * (1.15 - d) * 0.5; }
      }
    }
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i];
      if (!m.alive && m.deadT > 2.1) { this.scene.remove(m.rec.group); this.minions.splice(i, 1); }
    }

    // ── Turrets & cores ──
    for (const t of this.turrets) {
      if (!t.alive) continue;
      t.attackCd = Math.max(0, t.attackCd - dt);
      t.refs.ring.rotation.z += dt * 1.6;
      t.refs.core.scale.setScalar(.34 * (1 + Math.sin(this.matchTime * 3.1) * 0.08));
      const RANGE = 13.5;
      let target: AnyEnt | null = null;
      // priority: hero who recently attacked allied hero
      let heroAggro: HeroEnt | null = null;
      for (const hero of this.heroes) {
        if (hero.team === t.team || !hero.alive || hero.stealthUntil > this.matchTime) continue;
        const d = this.dist(t.x, t.z, hero.x, hero.z);
        if (d > RANGE) continue;
        for (const hv of this.heroes) {
          if (hv.team !== t.team || !hv.alive) continue;
          if (hv.damagers.some((dd) => dd.uid === hero.uid && this.matchTime - dd.t < 3)) { heroAggro = hero; break; }
        }
        if (heroAggro) break;
      }
      if (heroAggro) target = heroAggro;
      else {
        let bd = RANGE;
        for (const m of this.minions) {
          if (m.team === t.team || !m.alive) continue;
          const d = this.dist(t.x, t.z, m.x, m.z);
          if (d < bd) { bd = d; target = m; }
        }
        if (!target) {
          bd = RANGE;
          for (const hero of this.heroes) {
            if (hero.team === t.team || !hero.alive || hero.stealthUntil > this.matchTime) continue;
            const d = this.dist(t.x, t.z, hero.x, hero.z);
            if (d < bd) { bd = d; target = hero; }
          }
        }
      }
      if (target) {
        t.refs.head.rotation.y = -Math.atan2(target.z - t.z, target.x - t.x) + Math.PI / 2;
        if (t.attackCd <= 0) { t.attackCd = 1.05; this.turretFire(t, target, 125); }
      }
    }
    for (const c of this.cores) {
      if (!c.alive) continue;
      c.attackCd = Math.max(0, c.attackCd - dt);
      c.refs.crystal.rotation.y += dt * 1.4;
      c.refs.crystal.position.y = 4.6 + Math.sin(this.matchTime * 1.6) * 0.35;
      c.refs.shield.visible = c.shield > 0;
      (c.refs.shield.material as THREE.MeshBasicMaterial).opacity = 0.13 + Math.sin(this.matchTime * 2.4) * 0.045;
      let target: AnyEnt | null = null, bd = 15;
      for (const m of this.minions) {
        if (m.team === c.team || !m.alive) continue;
        const d = this.dist(c.x, c.z, m.x, m.z);
        if (d < bd) { bd = d; target = m; }
      }
      if (!target) for (const hero of this.heroes) {
        if (hero.team === c.team || !hero.alive || hero.stealthUntil > this.matchTime) continue;
        const d = this.dist(c.x, c.z, hero.x, hero.z);
        if (d < bd) { bd = d; target = hero; }
      }
      if (target && c.attackCd <= 0) { c.attackCd = 1.2; this.turretFire(c, target, 230); }
    }

    // ── Projectiles ──
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.x += p.vx * p.speed * dt;
      p.z += p.vz * p.speed * dt;
      p.mesh.position.set(p.x, p.y, p.z);
      const findHit = (): AnyEnt | null => {
        for (const e of this.heroes) {
          if (e.team === p.team || !e.alive) continue;
          if (this.matchTime < e.stealthUntil) continue;
          if (this.dist(p.x, p.z, e.x, e.z) < p.radius + 0.9) return e;
        }
        for (const e of this.minions) {
          if (e.team === p.team || !e.alive) continue;
          if (this.dist(p.x, p.z, e.x, e.z) < p.radius + 0.8) return e;
        }
        for (const e of this.turrets) {
          if (e.team === p.team || !e.alive) continue;
          if (this.dist(p.x, p.z, e.x, e.z) < p.radius + 2.4) return e;
        }
        for (const e of this.cores) {
          if (e.team === p.team || !e.alive) continue;
          if (this.dist(p.x, p.z, e.x, e.z) < p.radius + 4.6) return e;
        }
        if (this.boss.alive && this.dist(p.x, p.z, this.boss.x, this.boss.z) < p.radius + 2.6) return this.boss;
        for (const e of this.monsters) {
          if (!e.alive) continue;
          if (this.dist(p.x, p.z, e.x, e.z) < p.radius + 1.1) return e;
        }
        return null;
      };
      const hit = findHit();
      if (hit) {
        const shooter = this.heroes.find(hh=>hh.uid===p.fromUid) ?? this.minions.find(m=>m.uid===p.fromUid) ?? this.turrets.find(t=>t.uid===p.fromUid) ?? this.cores.find(c=>c.uid===p.fromUid) ?? null;
        this.dealDamage(shooter, hit, p.dmg, { crit: p.crit });
        this.spawnBurst(p.x, p.y, p.z, p.color, 6, 3);
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (p.life <= 0 || Math.abs(p.x) > ARENA.width / 2 + 5 || Math.abs(p.z) > ARENA.depth / 2 + 5) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // ── Hazard zones ──
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      if (this.matchTime > z.until) {
        this.scene.remove(z.mesh);
        this.zones.splice(i, 1);
        continue;
      }
      for (const e of [...this.heroes, ...this.minions] as AnyEnt[]) {
        if (e.team === z.team || !e.alive) continue;
        if (this.dist(z.x, z.z, e.x, e.z) <= z.radius) {
          this.dealDamage(null, e, z.dps * dt, {});
          if (e.kind === "hero") { e.slowUntil = Math.max(e.slowUntil, this.matchTime + 0.35); e.slowPct = Math.max(e.slowPct, z.slow); }
        }
      }
    }

    // ── Boss AI ──
    const b = this.boss;
    if (b.alive) {
      b.attackCd = Math.max(0, b.attackCd - dt);
      b.slamCd = Math.max(0, b.slamCd - dt);
      const slamMat = b.rec.slamRing.material as THREE.MeshBasicMaterial;
      slamMat.opacity = Math.max(0, slamMat.opacity - dt * 1.4);
      let target: AnyEnt | null = null, bd = 60;
      for (const e of [...this.heroes, ...this.minions] as AnyEnt[]) {
        if (!e.alive) continue;
        const d = this.dist(b.x, b.z, e.x, e.z);
        if (d < bd) { bd = d; target = e; }
      }
      if (target) {
        if (bd > 6) this.moveToward(b, target.x, target.z, dt, 5.4);
        else if (b.attackCd <= 0) {
          b.attackCd = 1.6;
          this.dealDamage(b, target, 135, {});
          b.rec.attackAnim = 0.4;
          this.spawnBurst(target.x, 1.4, target.z, 0xff4030, 14, 5);
          audio.explosion();
        }
        if (b.slamCd <= 0) {
          const close = [...this.heroes, ...this.minions].filter((e) => e.alive && this.dist(b.x, b.z, e.x, e.z) < 8.5);
          if (close.length >= 2) {
            b.slamCd = 6;
            for (const e of close) this.dealDamage(b, e, 150, {});
            slamMat.opacity = 0.85;
            this.spawnRing(b.x, b.z, 8.5, 0xff4030);
            this.shakeT = Math.max(this.shakeT, 0.6);
            audio.explosion();
          }
        }
      } else if (this.dist(b.x, b.z, 0, -14) > 3) {
        this.moveToward(b, 0, -14, dt, 3.2);
      }
      b.rec.group.position.set(b.x, 0, b.z);
      b.rec.group.rotation.y += dt * 0.2;
    } else {
      if (b.respawnAt > 0 && this.matchTime >= b.respawnAt) {
        b.alive = true;
        b.respawnAt = 0;
        b.hp = b.maxHp;
        b.x = 0; b.z = -14;
        b.rec.group.visible = true;
        b.rec.group.rotation.set(0, 0, 0);
        b.rec.group.position.set(0, 0, -14);
        this.events.onAnnounce("OMEGA COLOSSUS TELAH BANGKIT!", "omega");
      } else {
        b.deadT += dt;
        b.rec.group.rotation.x = -Math.min(Math.PI / 2.1, b.deadT * 2);
        b.rec.group.position.y = -Math.max(0, b.deadT - 1.4) * 1.3;
      }
    }

    // ── Jungle monsters ──
    for (const mo of this.monsters) {
      if (!mo.alive) {
        mo.deadT += dt;
        mo.rec.group.rotation.x = -Math.min(Math.PI / 2.2, mo.deadT * 3);
        if (mo.respawnAt > 0 && this.matchTime >= mo.respawnAt) {
          mo.alive = true; mo.respawnAt = 0; mo.hp = mo.maxHp; mo.x = mo.cx; mo.z = mo.cz;
          mo.rec.group.rotation.x = 0;
          mo.rec.group.position.set(mo.cx, 0, mo.cz);
        }
        continue;
      }
      mo.attackCd = Math.max(0, mo.attackCd - dt);
      let target: AnyEnt | null = null, bd = 8;
      for (const hero of this.heroes) {
        if (!hero.alive) continue;
        const d = this.dist(mo.x, mo.z, hero.x, hero.z);
        if (d < bd) { bd = d; target = hero; }
      }
      if (target) {
        if (bd > 2.7) this.moveToward(mo, target.x, target.z, dt, 5.2);
        else if (mo.attackCd <= 0) { mo.attackCd = 1.35; this.dealDamage(mo, target, mo.ad, {}); mo.rec.attackAnim = 0.3; }
      } else if (this.dist(mo.x, mo.z, mo.cx, mo.cz) > 1.2) {
        this.moveToward(mo, mo.cx, mo.cz, dt, 3.4);
      } else {
        const wt = this.matchTime * 0.4 + mo.uid * 2.3;
        if (Math.sin(wt * 1.7) > 0.72) this.moveToward(mo, mo.cx + Math.cos(wt * 3.7) * 2.6, mo.cz + Math.sin(wt * 2.9) * 2.6, dt, 1.7);
      }
      mo.rec.group.position.set(mo.x, 0, mo.z);
    }
  }

  private minionShoot(m: MinionEnt, target: AnyEnt, dmg: number) {
    const color = TEAM_GLOW[m.team];
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), new THREE.MeshBasicMaterial({ color }));
    mesh.position.set(m.x, 1.1, m.z);
    this.scene.add(mesh);
    const ang = Math.atan2(target.z - m.z, target.x - m.x);
    this.projectiles.push({
      uid: this.uid++, team: m.team, x: m.x, y: 1.1, z: m.z,
      vx: Math.cos(ang), vz: Math.sin(ang), speed: 30, dmg, life: 0.9,
      color, radius: 0.8, fromUid: m.uid, fromTurret: false, crit: false, mesh,
    });
  }

  private pushOut(h: HeroEnt | MinionEnt, sx: number, sz: number, radius: number) {
    const dx = h.x - sx, dz = h.z - sz;
    const d = Math.hypot(dx, dz);
    if (d < radius && d > 0.01) { h.x = sx + (dx / d) * radius; h.z = sz + (dz / d) * radius; }
  }

  private updateCamera(dt: number) {
    const h = this.player;
    this.shakeT = Math.max(0, this.shakeT - dt);
    const shake = this.shakeT > 0 ? Math.sin(this.timeAccum * 55) * this.shakeT * 0.5 : 0;
    const target = new THREE.Vector3(h.x, 1.6, h.z);
    const off = new THREE.Vector3(
      Math.sin(this.camYaw) * Math.cos(this.camPitch),
      Math.sin(this.camPitch),
      Math.cos(this.camYaw) * Math.cos(this.camPitch)
    ).multiplyScalar(this.camDist);
    const desired = target.clone().add(off);
    desired.y = Math.max(4, desired.y);
    this.camera.position.lerp(desired, 1 - Math.pow(0.0015, dt));
    this.camera.position.x += shake;
    this.camera.position.y += shake * 0.6;
    this.camera.lookAt(target.x + shake, target.y, target.z);
  }

  private updateAnim(dt: number) {
    const animate = (rec: RobotRefs, moving: boolean, speedFactor: number) => {
      const torsoY = this.torsoBaseY.get(rec.group.id) ?? rec.torso.position.y;
      if (moving) {
        rec.walkPhase += dt * 8.2 * speedFactor;
        const s = Math.sin(rec.walkPhase);
        rec.legL.rotation.x = s * 0.78;
        rec.legR.rotation.x = -s * 0.78;
        rec.armL.rotation.x = -s * 0.55;
        if (rec.attackAnim > 0) rec.armR.rotation.x = -2.1 + (0.32 - rec.attackAnim) * 6;
        else rec.armR.rotation.x = s * 0.55;
        rec.torso.position.y = torsoY + Math.abs(Math.cos(rec.walkPhase)) * 0.06;
      } else {
        rec.legL.rotation.x *= 0.86;
        rec.legR.rotation.x *= 0.86;
        rec.armL.rotation.x *= 0.86;
        rec.armR.rotation.x = rec.attackAnim > 0 ? -2.1 + (0.32 - rec.attackAnim) * 6 : rec.armR.rotation.x * 0.86;
        rec.torso.position.y = torsoY + Math.sin(this.timeAccum * 1.9 + rec.walkPhase) * 0.028;
        if (rec.head) rec.head.rotation.y = Math.sin(this.timeAccum * 0.7 + rec.walkPhase) * 0.14;
      }
    };
    for (const hero of this.heroes) {
      if (!hero.alive) continue;
      const isMoving = hero.isPlayer
        ? (this.keys.has("w") || this.keys.has("a") || this.keys.has("s") || this.keys.has("d")
          || this.keys.has("arrowup") || this.keys.has("arrowdown") || this.keys.has("arrowleft") || this.keys.has("arrowright")
          || this.joyMove !== null)
        : true;
      animate(hero.rec, isMoving, hero.isPlayer ? 1 : 0.82);
    }
    for (const m of this.minions) if (m.alive) animate(m.rec, true, 0.85);
    for (const mo of this.monsters) if (mo.alive) animate(mo.rec, true, 0.7);
    if (this.boss.alive) animate(this.boss.rec, true, 0.55);
  }

  private emitSnapshotSoon() { this.snapshotTimer = 0; }

  private buildSnapshot(): HudSnapshot {
    const h = this.player;
    const skills = h.def.skills.map((s) => ({
      key: s.key, name: s.name, cd: s.cd, remain: h.cds[s.key] ?? 0,
      rank: h.skillLevels[s.key] ?? (s.key === "F" ? 0 : 1),
      maxRank: s.key === "F" ? 1 : 3,
      locked: s.key === "F" && h.level < 4,
      icon: s.icon,
    }));
    const mkTeam = (team: TeamId) => ({
      team,
      members: this.heroes.filter((hh) => hh.team === team).map((hh) => ({
        name: hh.isPlayer ? (this.opts.playerName || "Kamu") : hh.def.name,
        hero: hh.def.name, level: hh.level, k: hh.kills, d: hh.deaths, a: hh.assists,
        alive: hh.alive, isPlayer: hh.isPlayer,
      })),
    });
    const turretsAlive = (team: TeamId) => this.turrets.filter((t) => t.team === team && t.alive).length;
    return {
      time: this.matchTime,
      hp: Math.round(h.hp), maxHp: h.maxHp, shield: Math.round(h.shield),
      energy: Math.round(h.energy), maxEnergy: h.maxEnergy,
      level: h.level, xp: Math.round(h.xp), xpNext: xpNext(h.level),
      skillPoints: h.skillPoints, gold: Math.floor(h.gold),
      kills: h.kills, deaths: h.deaths, assists: h.assists, damageDealt: Math.round(h.damageDealt),
      teamCyber: this.teamKills.cyber, teamTitan: this.teamKills.titan,
      turretsCyber: turretsAlive("cyber"), turretsTitan: turretsAlive("titan"),
      alive: h.alive, respawnIn: h.alive ? 0 : Math.max(0, h.respawnAt - this.matchTime),
      flickerCd: h.flickerCd, ultimateReady: h.level >= 4 && (h.cds.F ?? 0) <= 0,
      skills,
      items: h.items.map((id) => {
        const it = ITEMS.find((i) => i.id === id)!;
        return { id: it.id, name: it.name, icon: it.icon };
      }),
      recall: h.recallT,
      paused: this.paused, over: this.over, omegaBuff: this.matchTime < h.omegaUntil,
      scoreboard: [mkTeam("cyber"), mkTeam("titan")],
      labels: this.heroes.filter(v=>v.alive && this.dist(v.x,v.z,h.x,h.z)<29 && (v.team===h.team || v.stealthUntil<=this.matchTime)).flatMap(v=>{
        const pt=new THREE.Vector3(v.x,3.23,v.z).project(this.camera);
        return pt.z>0 && pt.z<1 && Math.abs(pt.x)<.95 && Math.abs(pt.y)<.88 ? [{ uid:v.uid,name:v.def.name,level:v.level,x:(pt.x+1)*50,y:(1-pt.y)*50,hp:v.hp/v.maxHp,team:v.team,player:v.isPlayer }]:[];
      }),
      questionsCorrect: this.questionsCorrect, questionsWrong: this.questionsWrong,
    };
  }

  renderMinimap(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const sx = (x: number) => ((x + ARENA.width / 2) / ARENA.width) * W;
    const sz = (z: number) => ((z + ARENA.depth / 2) / ARENA.depth) * H;
    ctx.fillStyle = "#050a16";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(56,189,248,0.28)";
    ctx.lineWidth = 5;
    for (const lz of LANE_Z) { ctx.beginPath(); ctx.moveTo(0, sz(lz)); ctx.lineTo(W, sz(lz)); ctx.stroke(); }
    ctx.strokeStyle = "rgba(103,232,249,0.5)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, W - 2, H - 2);
    if (this.boss.alive) { ctx.fillStyle = "#ff4030"; ctx.beginPath(); ctx.arc(sx(this.boss.x), sz(this.boss.z), 4, 0, 7); ctx.fill(); }
    for (const t of this.turrets) {
      if (!t.alive) continue;
      ctx.fillStyle = t.team === "cyber" ? "#22d3ee" : "#ff5040";
      ctx.fillRect(sx(t.x) - 2.5, sz(t.z) - 2.5, 5, 5);
    }
    for (const c of this.cores) {
      if (!c.alive) continue;
      ctx.fillStyle = c.team === "cyber" ? "#67e8f9" : "#ff8a5c";
      ctx.beginPath(); ctx.arc(sx(c.x), sz(c.z), 5, 0, 7); ctx.fill();
    }
    for (const m of this.minions) {
      if (!m.alive) continue;
      ctx.fillStyle = m.team === "cyber" ? "rgba(103,232,249,0.75)" : "rgba(255,128,112,0.75)";
      ctx.fillRect(sx(m.x) - 1, sz(m.z) - 1, 2, 2);
    }
    for (const hero of this.heroes) {
      if (!hero.alive) continue;
      ctx.fillStyle = hero.isPlayer ? "#ffffff" : hero.team === "cyber" ? "#38bdf8" : "#fb5040";
      ctx.beginPath(); ctx.arc(sx(hero.x), sz(hero.z), hero.isPlayer ? 4 : 3, 0, 7); ctx.fill();
      if (hero.isPlayer) { ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 1.4; ctx.stroke(); }
    }
  }

  private endMatch(victory: boolean) {
    if (this.over) return;
    this.over = true;
    this.paused = false;
    const h = this.player;
    const playerScore = h.kills * 3.5 + h.assists * 2.2 + h.turretsDestroyed * 2.5 + h.damageDealt / 900 - h.deaths * 1.4 + this.questionsCorrect * 1.5 + (victory ? 4 : 0);
    let mvp = true;
    for (const hh of this.heroes) {
      if (hh.isPlayer) continue;
      const s = hh.kills * 3.5 + hh.assists * 2.2 + hh.turretsDestroyed * 2.5 + hh.damageDealt / 900 - hh.deaths * 1.4;
      if (s > playerScore) { mvp = false; break; }
    }
    if (victory) audio.victory(); else audio.defeat();
    const result: MatchResult = {
      victory,
      heroId: h.heroId,
      heroName: h.def.name,
      kills: h.kills, deaths: h.deaths, assists: h.assists,
      goldEarned: Math.floor(h.goldEarned),
      damageDealt: Math.round(h.damageDealt),
      turretsDestroyed: h.turretsDestroyed,
      questionsCorrect: this.questionsCorrect, questionsWrong: this.questionsWrong,
      knowledgeXp: this.questionsCorrect * 100,
      mvp,
      durationSec: Math.floor(this.matchTime),
      difficulty: this.opts.difficulty,
    };
    this.events.onMatchEnd(result);
  }

  addZone(team: TeamId, x: number, z: number, radius: number, slow: number, dps: number, dur: number, color: number) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 0.5, 26, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
    );
    mesh.position.set(x, 0.7, z);
    this.scene.add(mesh);
    this.zones.push({ uid: this.uid++, team, x, z, radius, slow, dps, until: this.matchTime + dur, mesh });
  }

  setPaused(v: boolean) { this.paused = v; }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    audio.stopMusic();
    this.probe?.dispose();
    this.renderer.dispose();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
  }
}
