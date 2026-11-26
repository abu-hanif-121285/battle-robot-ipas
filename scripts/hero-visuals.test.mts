// Run from the project root with: npx tsx scripts/hero-visuals.test.mts
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const THREE = require('three') as typeof import('three');
const { HEROES } = require('../src/game/data.ts') as typeof import('../src/game/data');
const { VISUALS } = require('../src/game/visuals.ts') as typeof import('../src/game/visuals');
const { buildHeroRobot } = require('../src/game/robots.ts') as typeof import('../src/game/robots');

assert.equal(Object.keys(VISUALS).length,HEROES.length);
assert.equal(new Set(Object.values(VISUALS).map(a=>a.gear)).size,10);
for(const h of HEROES){
  assert.ok(existsSync(`public/images/heroes/${h.id}.webp`));
  for(const team of ['cyber','titan'] as const){
    const r=buildHeroRobot(h.id,team);
    assert.equal(r.group.userData.team,team);
    assert.equal(r.group.userData.heroId,h.id);
    assert.ok(r.group.userData.authoredParts>100);
    assert.equal(r.head.parent,r.torso);
    assert.equal(r.legL.parent,r.group);
    assert.equal(r.armR.parent,r.torso);
    r.armR.rotation.x=-.73;r.legL.rotation.x=.25;r.group.rotation.y=.4;
    const b=new THREE.Box3().setFromObject(r.group);
    assert.ok([b.min,b.max].every(v=>v.toArray().every(Number.isFinite)));
    assert.ok(b.max.y-b.min.y>2);
    let batches=0;
    r.group.traverse(mesh=>{if(mesh instanceof THREE.Mesh){batches++;mesh.geometry.dispose();}});
    assert.ok(batches<=24,`${h.name}: draw-call budget exceeded`);
    r.mats.forEach(m=>m.dispose());
    if(team==='cyber')console.log(`${h.name}: ${r.group.userData.authoredParts} detail mekanis / ${batches} batch`);
  }
}
console.log('PASS: ten portraits, independent palettes, twenty articulated team models.');
