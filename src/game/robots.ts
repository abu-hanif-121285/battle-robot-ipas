// ─── ROBOT LEGENDS — Procedural mecha factory ────────────────────────────────
// Every character/structure is assembled from dozens of mechanical parts
// (armor plates, thrusters, glowing cores, optics) so the roster does not
// depend on external model files.

import * as THREE from "three";

export type Team = "cyber" | "titan";
export const TEAM_GLOW: Record<Team, number> = { cyber: 0x2dd4ff, titan: 0xff5040 };
export const TEAM_BODY: Record<Team, number> = { cyber: 0x39496b, titan: 0x59332c };

// Shared geometries (created once)
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  cylLow: new THREE.CylinderGeometry(1, 1, 1, 10),
  sphere: new THREE.SphereGeometry(1, 14, 10),
  oct: new THREE.OctahedronGeometry(1),
  cone: new THREE.ConeGeometry(1, 1, 10),
  torus: new THREE.TorusGeometry(1, 0.16, 8, 24),
};

function metal(color: number, rough = 0.42, metalness = 0.85): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness });
}
function glow(color: number, intensity = 2.2): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x0b0f1a, emissive: color, emissiveIntensity: intensity, roughness: 0.4, metalness: 0.1,
  });
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}
function part(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material,
  sx: number, sy: number, sz: number, x: number, y: number, z: number): THREE.Mesh {
  const m = mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

export interface RobotRefs {
  group: THREE.Group;
  legL: THREE.Group; legR: THREE.Group;
  armL: THREE.Group; armR: THREE.Group;
  torso: THREE.Group; head: THREE.Group;
  mats: THREE.MeshStandardMaterial[];
  flashMats: THREE.MeshStandardMaterial[];
  walkPhase: number;
  attackAnim: number;
  height: number;
}

// The same articulated Mk.II chassis is used for the hangar and every match.
import { createArticulatedHero } from './mecha';
export const buildHeroRobot = createArticulatedHero;

// ─── Minions ─────────────────────────────────────────────────────────────────
export function buildMinion(kind: "melee" | "ranged" | "siege", team: Team): RobotRefs {
  const accent = TEAM_GLOW[team];
  const body = metal(TEAM_BODY[team], 0.45, 0.8);
  const dark = metal(0x141926, 0.55, 0.6);
  const eyeM = glow(accent, 2.6);
  const scale = kind === "siege" ? 1.45 : 0.72;
  const g = new THREE.Group();
  const torso = new THREE.Group();
  torso.position.y = 0.78 * scale;
  g.add(torso);
  part(g, G.box, dark, 0.4 * scale, 0.16 * scale, 0.3 * scale, 0, 0.72 * scale, 0);
  part(torso, G.box, body, 0.66 * scale, 0.6 * scale, 0.44 * scale, 0, 0.3 * scale, 0);
  part(torso, G.cylLow, dark, 0.12 * scale, 0.08 * scale, 0.12 * scale, 0, 0.3 * scale, 0.24 * scale).rotation.x = Math.PI / 2;
  part(torso, G.box, eyeM, 0.2 * scale, 0.045 * scale, 0.02, 0, 0.72 * scale, 0.16 * scale);
  const head = new THREE.Group();
  head.position.set(0, 0.68 * scale, 0);
  torso.add(head);
  part(head, G.box, body, 0.3 * scale, 0.22 * scale, 0.3 * scale, 0, 0.05 * scale, 0);

  const buildArm = (side: 1 | -1) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.42 * scale, 0.5 * scale, 0);
    torso.add(arm);
    part(arm, G.box, dark, 0.16 * scale, 0.42 * scale, 0.16 * scale, 0, -0.2 * scale, 0);
    return arm;
  };
  const armL = buildArm(-1), armR = buildArm(1);
  if (kind === "melee") {
    const blade = part(armR, G.box, glow(accent, 2.2), 0.05, 0.7 * scale, 0.1, 0, -0.55 * scale, 0.05);
    blade.rotation.x = 0.2;
  } else if (kind === "ranged") {
    part(armR, G.cylLow, metal(0x2b3348, 0.35, 0.9), 0.09 * scale, 0.6 * scale, 0.09 * scale, 0, -0.4 * scale, 0.2).rotation.x = Math.PI / 2;
  } else {
    part(torso, G.cyl, metal(0x2b3348, 0.35, 0.9), 0.16 * scale, 0.7 * scale, 0.16 * scale, 0, 0.35 * scale, 0.32 * scale).rotation.x = Math.PI / 2;
    part(torso, G.box, glow(accent, 2.0), 0.3 * scale, 0.1 * scale, 0.06, 0, 0.35 * scale, 0.68 * scale);
  }
  const buildLeg = (side: 1 | -1) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.22 * scale, 0.68 * scale, 0);
    g.add(leg);
    part(leg, G.box, body, 0.18 * scale, 0.34 * scale, 0.2 * scale, 0, -0.16 * scale, 0);
    part(leg, G.box, dark, 0.2 * scale, 0.1 * scale, 0.28 * scale, 0, -0.4 * scale, 0.02);
    return leg;
  };
  const legL = buildLeg(-1), legR = buildLeg(1);

  return {
    group: g, legL, legR, armL, armR, torso, head,
    mats: [body, dark], flashMats: [body],
    walkPhase: Math.random() * 6.28, attackAnim: 0, height: 1.45 * scale,
  };
}

// ─── Turrets ─────────────────────────────────────────────────────────────────
export interface TurretRefs { group: THREE.Group; head: THREE.Group; ring: THREE.Mesh; core: THREE.Mesh; }

export function buildTurret(team: Team): TurretRefs {
  const accent = TEAM_GLOW[team];
  const g = new THREE.Group();
  const base = metal(0x2a3142, 0.4, 0.9);
  const dark = metal(0x141926, 0.5, 0.7);
  const plate = metal(0x3a4560, 0.35, 0.9);
  // Hex pad + base
  part(g, G.cyl6, dark, 2.6, 0.5, 2.6, 0, 0.25, 0);
  part(g, G.cyl6, base, 1.9, 1.1, 1.9, 0, 1.0, 0);
  part(g, G.cyl6, plate, 1.25, 1.5, 1.25, 0, 2.15, 0);
  // Team glow ring
  const ring = part(g, G.torus, glow(accent, 2.6), 1.7, 1.7, 1.7, 0, 1.62, 0);
  ring.rotation.x = Math.PI / 2;
  // Rotating head
  const head = new THREE.Group();
  head.position.y = 3.15;
  g.add(head);
  part(head, G.cyl6, plate, 1.05, 0.6, 1.05, 0, 0, 0);
  part(head, G.box, dark, 0.9, 0.5, 1.5, 0, 0.15, 0.45);
  const barrelL = part(head, G.cylLow, metal(0x1c2333, 0.3, 0.95), 0.14, 1.0, 0.14, -0.28, 0.2, 1.15);
  const barrelR = barrelL.clone(); barrelR.position.x = 0.28; head.add(barrelR);
  barrelL.rotation.x = Math.PI / 2; barrelR.rotation.x = Math.PI / 2;
  const core = part(head, G.sphere, glow(accent, 3.2), 0.34, 0.34, 0.34, 0, 0.42, 0);
  return { group: g, head, ring, core };
}

// ─── Core (base crystal) ─────────────────────────────────────────────────────
export interface CoreRefs { group: THREE.Group; crystal: THREE.Mesh; shield: THREE.Mesh; }

export function buildCore(team: Team): CoreRefs {
  const accent = TEAM_GLOW[team];
  const g = new THREE.Group();
  const dark = metal(0x141926, 0.5, 0.7);
  const plate = metal(0x2a3142, 0.4, 0.9);
  part(g, G.cyl6, dark, 5.2, 0.7, 5.2, 0, 0.35, 0);
  part(g, G.cyl6, plate, 3.6, 0.8, 3.6, 0, 1.0, 0);
  // Corner spires
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(a) * 3.4, z = Math.sin(a) * 3.4;
    part(g, G.box, plate, 0.7, 2.6, 0.7, x, 2.2, z);
    part(g, G.cone, glow(accent, 1.6), 0.45, 0.8, 0.45, x, 3.9, z);
  }
  // Floating crystal
  const crystal = part(g, G.oct, glow(accent, 2.8), 1.5, 2.3, 1.5, 0, 4.6, 0);
  // Energy shield bubble (visible while core shielded)
  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(4.6, 18, 12),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  shield.position.y = 3.4;
  g.add(shield);
  return { group: g, crystal, shield };
}

// ─── Omega Colossus boss ─────────────────────────────────────────────────────
export function buildBoss(): RobotRefs & { slamRing: THREE.Mesh } {
  const refs = buildHeroRobot("goliath", "titan");
  const g = refs.group;
  g.scale.setScalar(2.55);
  // Extra doom plating
  const dark = metal(0x1a1020, 0.45, 0.85);
  const red = glow(0xff2020, 3.4);
  part(g, G.cyl6, dark, 1.15, 0.5, 1.15, 0, 3.35, 0);
  part(g, G.sphere, red, 0.42, 0.3, 0.42, 0, 3.62, 0); // main eye
  const hornL = part(g, G.cone, dark, 0.18, 0.9, 0.18, -0.62, 3.35, 0);
  const hornR = part(g, G.cone, dark, 0.18, 0.9, 0.18, 0.62, 3.35, 0);
  hornL.rotation.z = 0.5; hornR.rotation.z = -0.5;
  const slamRing = new THREE.Mesh(
    new THREE.RingGeometry(1, 9.2, 40),
    new THREE.MeshBasicMaterial({ color: 0xff4030, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
  );
  slamRing.rotation.x = -Math.PI / 2;
  slamRing.position.y = 0.15;
  g.add(slamRing);
  return { ...refs, slamRing };
}

// ─── Jungle monsters ─────────────────────────────────────────────────────────
export function buildMonster(kind: "scorpion" | "spider" | "dragon"): RobotRefs {
  const isScorpion = kind === "scorpion";
  const isSpider = kind === "spider";
  const accent = isScorpion ? 0xffa028 : isSpider ? 0xc084fc : 0xff5a3c;
  const body = metal(0x3a2f1d, 0.45, 0.85);
  const dark = metal(0x191411, 0.55, 0.6);
  const s = isSpider ? 0.95 : isScorpion ? 1.15 : 1.5;
  const g = new THREE.Group();
  const torso = new THREE.Group();
  torso.position.y = 0.55 * s;
  g.add(torso);
  part(torso, G.oct, body, 0.85 * s, 0.55 * s, 1.15 * s, 0, 0.28 * s, 0);
  part(torso, G.sphere, dark, 0.42 * s, 0.34 * s, 0.42 * s, 0, 0.32 * s, 0.82 * s);
  part(torso, G.box, glow(accent, 3.0), 0.34 * s, 0.05 * s, 0.03, 0, 0.38 * s, 1.2 * s); // eyes
  if (isScorpion) {
    // Tail arc
    let px = 0, py = 0.42 * s, pz = -1.0 * s;
    for (let i = 0; i < 4; i++) {
      py += 0.28 * s; pz -= 0.12 * s;
      part(torso, G.sphere, i === 3 ? glow(accent, 2.8) : dark, (0.16 - i * 0.025) * s, (0.16 - i * 0.025) * s, (0.16 - i * 0.025) * s, px, py, pz);
    }
  }
  if (kind === "dragon") {
    const w1 = part(torso, G.cone, dark, 0.3 * s, 1.5 * s, 0.12, -0.7 * s, 0.85 * s, -0.2 * s);
    const w2 = part(torso, G.cone, dark, 0.3 * s, 1.5 * s, 0.12, 0.7 * s, 0.85 * s, -0.2 * s);
    w1.rotation.z = 0.9; w2.rotation.z = -0.9;
  }
  // Legs
  const legCount = isSpider ? 6 : 4;
  for (let i = 0; i < legCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const row = Math.floor(i / 2);
    const leg = part(g, G.cylLow, dark, 0.07 * s, 0.75 * s, 0.07 * s, side * 0.62 * s, 0.34 * s, (row - 1) * 0.55 * s);
    leg.rotation.z = side * 0.75;
  }
  const legL = new THREE.Group(); const legR = new THREE.Group(); // unused but refs-compatible
  const armL = new THREE.Group(); const armR = new THREE.Group();
  const head = new THREE.Group(); head.position.y = 0.8 * s; torso.add(head);
  return { group: g, legL, legR, armL, armR, torso, head, mats: [body, dark], flashMats: [body], walkPhase: 0, attackAnim: 0, height: 1.1 * s };
}
