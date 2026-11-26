// Articulated original combat models. Armor is lofted from contoured sections,
// not represented by a single primitive. Rigid parts are batched per joint.
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { VISUALS } from './visuals';
import type { RobotRefs, Team } from './robots';

type P2 = [number,number];
type Ring = [number,number,number,number?]; // y, x radius, z radius, forward offset
const V = (x:number,y:number,z:number) => new T.Vector3(x,y,z);
const bone = (parent:T.Object3D,name:string,x=0,y=0,z=0) => {const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;};

function loft(rings: Ring[],n=8) {
  const vertices:number[]=[],indices:number[]=[];
  for(const [y,w,d,offset=0] of rings) for(let i=0;i<n;i++){const a=(i+.5)*2*Math.PI/n;vertices.push(Math.sin(a)*w,y,Math.cos(a)*d+offset);}
  for(let row=0;row<rings.length-1;row++)for(let i=0;i<n;i++){const a=row*n+i,b=row*n+(i+1)%n,c=a+n,d=b+n;indices.push(a,b,c,b,d,c);}
  for(let i=1;i<n-1;i++){indices.push(0,i+1,i);const top=(rings.length-1)*n;indices.push(top,top+i,top+i+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function cutPlate(points:P2[],depth:number,bevel=.012) {
  const shape=new T.Shape(points.map(p=>new T.Vector2(...p)));shape.closePath();
  return new T.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel*.75,bevelSegments:1,steps:1,curveSegments:2}).translate(0,0,-depth/2);
}
const kite:P2[]=[[-.5,.28],[-.30,.5],[.31,.5],[.5,.25],[.34,-.23],[0,-.52],[-.35,-.23]];
const shard:P2[]=[[-.15,-.5],[-.44,.14],[.34,.54],[.24,-.29]];
const chev:P2[]=[[-.5,.32],[0,-.02],[.5,.32],[.36,-.05],[0,-.38],[-.36,-.05]];
const diamond:P2[]=[[0,.5],[.47,0],[0,-.5],[-.47,0]];
const SPAWN_IFF={cyber:0x38cfff,titan:0xff525a};

export function createArticulatedHero(id:string,team:Team):RobotRefs {
  const a=VISUALS[id] || VISUALS.titan;
  const heavy=a.chassis==='heavy', agile=a.chassis==='agile', v=a.gear;
  const primary=a.primary,white=a.ceramic,gold=a.trim,light=a.light,steel=0x646c76,black=0x222936,deep=0x10151f;
  const bulk=(heavy?1.19:agile?.86:1)*(v==='gauntlets'?1.08:1);
  const group=new T.Group();group.name=`RL-${a.serial} ${id.toUpperCase()}`;
  const bodyMat=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.58,roughness:.3});
  const frameMat=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.69,roughness:.47});
  const energyMat=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,emissive:light,emissiveIntensity:1.7,metalness:.12,roughness:.24});
  const iffMat=new T.MeshBasicMaterial({color:SPAWN_IFF[team],transparent:true,opacity:.69,depthWrite:false});
  const mats=[bodyMat,frameMat,energyMat];
  const cache=new Map<T.Object3D, Map<T.Material,T.BufferGeometry[]>>();
  // Each authored detail is transformed straight into its parent's batch. Three
  // materials per moving joint keep a fully articulated unit inexpensive.
  const add=(parent:T.Object3D,g:T.BufferGeometry,color:number,x:number,y:number,z:number,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,kind:'paint'|'frame'|'energy'='paint')=>{
    const m=kind==='energy'?energyMat:kind==='frame'?frameMat:bodyMat;
    const geo=g.index?g.toNonIndexed():g;if(geo!==g)g.dispose();
    geo.deleteAttribute('uv');geo.deleteAttribute('uv1');geo.clearGroups();
    const matrix=new T.Matrix4().compose(V(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),V(sx,sy,sz));geo.applyMatrix4(matrix);
    const c=new T.Color(color),array=new Float32Array(geo.getAttribute('position').count*3);
    for(let k=0;k<array.length;k+=3){array[k]=c.r;array[k+1]=c.g;array[k+2]=c.b;}geo.setAttribute('color',new T.BufferAttribute(array,3));
    let bucket=cache.get(parent);if(!bucket){bucket=new Map();cache.set(parent,bucket);}const groupGeos=bucket.get(m)||[];groupGeos.push(geo);bucket.set(m,groupGeos);
  };
  const shell=(p:T.Object3D,r:Ring[],col:number,x=0,y=0,z=0,n=8,rz=0)=>add(p,loft(r,n),col,x,y,z,1,1,1,0,0,rz);
  const plate=(p:T.Object3D,points:P2[],col:number,x:number,y:number,z:number,w:number,h:number,d:number,rz=0,rx=0,ry=0,lit=false)=>add(p,cutPlate(points,d/Math.max(w,h)),col,x,y,z,w,h,Math.max(w,h),rx,ry,rz,lit?'energy':'paint');
  const pin=(p:T.Object3D,x:number,y:number,z:number,r:number,d:number,col:number,axis='x')=>add(p,new T.CylinderGeometry(r,r,d,12),col,x,y,z,1,1,1,axis==='z'?Math.PI/2:0,0,axis==='x'?Math.PI/2:0,'frame');
  const strut=(p:T.Object3D,from:T.Vector3,to:T.Vector3,r:number,col:number,tip=r)=>{const delta=to.clone().sub(from),pos=from.clone().lerp(to,.5);const geom=new T.CylinderGeometry(tip,r,delta.length(),8);geom.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0,1,0),delta.normalize()));add(p,geom,col,pos.x,pos.y,pos.z,1,1,1,0,0,0,'frame');};
  const band=(p:T.Object3D,x:number,y:number,z:number,r:number,tube:number,col:number,rx=0,ry=0,lit=false)=>add(p,new T.TorusGeometry(r,tube,5,20),col,x,y,z,1,1,1,rx,ry,0,lit?'energy':'paint');
  const gem=(p:T.Object3D,x:number,y:number,z:number,sx:number,sy:number,sz:number,col=light,rz=0,lit=true)=>add(p,new T.OctahedronGeometry(1),col,x,y,z,sx,sy,sz,0,0,rz,lit?'energy':'paint');
  const core=(p:T.Object3D,x:number,y:number,z:number,size:number)=>{if(v==='gauntlets'||v==='aegis'||v==='orb'){pin(p,x,y,z,size,.045,deep,'z');band(p,x,y,z+.03,size*.86,.018,gold);add(p,new T.SphereGeometry(1,12,8),light,x,y,z+.045,size*.67,size*.67,.035,0,0,0,'energy');}else{plate(p,diamond,gold,x,y,z,size*1.9,size*2.3,.04);plate(p,diamond,deep,x,y,z+.027,size*1.66,size*1.98,.035);gem(p,x,y,z+.055,size*.67,size*.83,.055);}};

  const torso=bone(group,'Thoracic power frame',0,1.02,0);
  shell(torso,[[-.05,.24*bulk,.18],[.04,.32*bulk,.22],[.17,.28*bulk,.18]],black);
  shell(torso,[[.08,.21*bulk,.15],[.22,.19*bulk,.16],[.42,.32*bulk,.21],[.62,.45*bulk,.255],[.76,.46*bulk,.22],[.87,.29*bulk,.17]],deep);
  for(let i=0;i<3;i++) {const y=.17+i*.095;plate(torso,chev,i%2?primary:steel,0,y,.165+i*.014,.43*bulk+i*.035,.19,.10);}
  for(const s of [-1,1]) {
    const breast:P2[]=[[.025,.70],[.13,.82],[.43*bulk,.83],[.51*bulk,.69],[.39*bulk,.49],[.15,.43],[.06,.54]].map(([x,y])=>[s*x,y]);
    plate(torso,breast,primary,0,0,.095,1,1,.29,0,-.075,s*.06);
    const collar:P2[]=[[.06,.76],[.18,.875],[.43*bulk,.85],[.47*bulk,.785],[.24,.72]].map(([x,y])=>[s*x,y]);
    plate(torso,collar,white,0,0,.152,1,1,.19);
    plate(torso,[[s*.12,.46],[s*.36*bulk,.52],[s*.43*bulk,.64],[s*.4*bulk,.50],[s*.17,.403]],gold,0,0,.219,1,1,.033);
    strut(torso,V(s*.23,.19,-.12),V(s*.36*bulk,.62,-.1),.042,steel);strut(torso,V(s*.215,.22,.10),V(s*.31*bulk,.48,.12),.026,gold);
    shell(torso,[[-.2,.085,.085],[-.12,.12,.125],[.13,.13,.13],[.2,.1,.11]],black,s*.22,.53,-.26);band(torso,s*.22,.37,-.26,.087,.017,light,Math.PI/2,0,true);
    plate(torso,shard,primary,s*.3*bulk,.04,.065,.27*bulk,.42,.17,-s*.26);
    plate(torso,shard,white,s*.32*bulk,.035,.155,.19*bulk,.34,.055,-s*.26);
    for(let j=0;j<3;j++)plate(torso,chev,black,s*.28*bulk,.65-j*.042,.287,.14,.06,.015,s*.18);
  }
  plate(torso,kite,black,0,.56,.234,.32,.40,.06);core(torso,0,.59,.273,v==='gauntlets'?.133:.122);
  shell(torso,[[0,.13,.13],[.13,.115,.11]],steel,0,.83,0);band(torso,0,.91,0,.127,.014,gold,Math.PI/2);

  // Back-facing combat camera: overlapping dorsal plates and twin thrusters make
  // each paint scheme just as readable from behind as it is in the hangar.
  for(const side of [-1,1]){
    plate(torso,kite,primary,side*.21*bulk,.610,-.245,.43*bulk,.44,.13,side*.19,.06,Math.PI);
    plate(torso,shard,white,side*.27*bulk,.716,-.318,.238*bulk,.254,.057,-side*.13,0,Math.PI);
    plate(torso,chev,gold,side*.199*bulk,.57,-.319,.222,.138,.025,side*.18,0,Math.PI);
    for(let j=0;j<3;j++)plate(torso,chev,steel,side*.20*bulk,.6+j*.056,-.33,.146,.069,.023,side*.1,0,Math.PI);
    plate(torso,kite,primary,side*.196,.391,-.221,.175,.27,.075,side*.18,0,Math.PI);
    band(torso,side*.19,.31,-.24,.074,.016,gold,Math.PI/2);
    gem(torso,side*.19,.31,-.24,.052,.034,.052);
    for(const k of [-1,1])pin(torso,side*.384*bulk,.71+k*.051,.283,.018,.013,steel,'z');
  }
  for(let j=0;j<3;j++)plate(torso,chev,j===1?gold:steel,0,.27+j*.099,-.195,.185,.145,.042,0,0,Math.PI);
  gem(torso,0,.724,-.245,.049,.082,.031);

  const head=bone(torso,'Helmet / twin optics',0,.945,0);
  shell(head,[[0,.089,.109,.015],[.074,.15,.144,.01],[.21,.165,.153],[.31,.121,.13,-.012],[.36,.045,.055,-.024]],primary,0,0,0,10);
  plate(head,[[0,.025],[-.114,.09],[-.13,.198],[-.087,.268],[0,.21],[.087,.268],[.13,.198],[.114,.09]],black,0,0,.113,1,1,.077);
  for(const s of [-1,1]){
    plate(head,[[s*.018,.155],[s*.151,.219],[s*.127,.159],[s*.028,.118]],light,0,0,.182,1,1,.018,0,0,0,true);
    plate(head,[[s*.015,.181],[s*.105,.25],[s*.157,.269],[s*.146,.223],[s*.027,.162]],white,0,0,.163,1,1,.018);
    plate(head,[[s*.048,.107],[s*.135,.151],[s*.143,.085],[s*.071,.016]],steel,0,0,.142,1,1,.045);
    const finHeight=v==='twins'||v==='ninja'?.37:v==='medic'?.24:.29;
    plate(head,[[s*.115,.16],[s*.157,.26],[s*.195,.17+finHeight],[s*.081,.28]],v==='rail'||v==='tesla'||v==='aegis'?gold:primary,0,0,-.016,1,1,.073,0,-.21);
    if(heavy||v==='crystal')plate(head,[[s*.12,.18],[s*.195,.262],[s*.158,.087],[s*.123,.052]],white,0,0,.024,1,1,.082);
  }
  plate(head,kite,v==='medic'?white:steel,0,.075,.175,.145,.15,.06);
  plate(head,diamond,gold,0,.25,.14,.096,.265,.041);gem(head,0,.262,.17,.025,.05,.018);

  const makeLeg=(s:number)=>{
    const leg=bone(group,s<0?'Left leg / hip pivot':'Right leg / hip pivot',s*(heavy?.262:.216),1.035,s<0?.025:-.014);
    leg.rotation.z=s*(agile?.06:.04);
    shell(leg,[[-.422,.093,.112],[-.312,.142*bulk,.165],[-.103,.171*bulk,.179],[.005,.116,.12]],black);
    shell(leg,[[-.41,.094,.121],[-.276,.151*bulk,.185],[-.123,.168*bulk,.18],[-.064,.124*bulk,.15]],primary);
    plate(leg,kite,white,s*.024,-.233,.123,.244*bulk,.345,.098,-s*.14);
    plate(leg,shard,primary,s*.131,-.176,.035,.17,.34,.095,-s*.19);
    pin(leg,0,-.452,.014,.107,.22,deep);pin(leg,s*.12,-.452,.014,.072,.025,gold);
    plate(leg,kite,primary,0,-.457,.133,.23,.235,.082);plate(leg,chev,light,0,-.427,.182,.106,.06,.014,0,0,0,true);
    strut(leg,V(s*.075,-.503,-.06),V(s*.076,-.857,-.092),.038,steel);strut(leg,V(-s*.055,-.502,-.06),V(-s*.054,-.832,-.075),.037,black);
    shell(leg,[[-.904,.083,.112],[-.84,.115,.122],[-.647,.146*bulk,.144],[-.529,.104,.119]],primary);
    plate(leg,[[0,.5],[-.44,.27],[-.34,-.225],[-.08,-.51],[.32,-.31],[.46,.27]],white,0,-.695,.103,.26*bulk,.41,.10,0,-.06);
    plate(leg,shard,gold,s*.075,-.68,.157,.065,.274,.02,-s*.055);
    pin(leg,0,-.902,0,.085,.18,black);
    shell(leg,[[-1.03,.145*bulk,.213,.054],[-.978,.158*bulk,.223,.065],[-.888,.115*bulk,.175,.042],[-.85,.082,.112]],black);
    shell(leg,[[-.998,.156*bulk,.175,.12],[-.961,.158*bulk,.18,.12],[-.896,.119*bulk,.13,.078]],primary);
    plate(leg,chev,gold,0,-.963,.282,.179,.061,.015);
    return leg;
  };
  const legL=makeLeg(-1),legR=makeLeg(1);
  const makeArm=(s:number)=>{
    const arm=bone(torso,s<0?'Left arm / shoulder pivot':'Right arm / shoulder pivot',s*.5*bulk,.745,0);
    const w=heavy?.26:agile?.181:.22;const start=V(0,-.04,0),elbow=V(s*.065,-.36,.035);
    strut(arm,start,elbow,.09,steel);pin(arm,0,-.013,0,.135,.21,black);
    shell(arm,[[-.34,.087,.104],[-.257,.13,.14],[-.103,.111,.129],[-.07,.093,.11]],primary,s*.03,-.005,0);
    const shoulder:P2[]=[[-.92,.22],[-.53,.59],[.35,.67],[1.03,.20],[.82,-.50],[.14,-.38],[-.58,-.11]].map(([x,y])=>[x*s,y]);
    plate(arm,shoulder,primary,s*.065,.02,-.005,w*1.35,w*1.52,.38);
    plate(arm,shoulder,white,s*.065,.083,-.003,w*1.34,w*1.08,.393,0,.12);
    plate(arm,[[s*-.68,.04],[s*.46,.2],[s*.81,-.02],[s*.66,-.18],[s*.03,-.02]],gold,s*.065,.033,.205,w*1.36,w*.85,.012);
    plate(arm,kite,primary,s*.02,-.09,.159,w*.96,w*.68,.093,-s*.17);
    if(v==='bulwark'||v==='aegis')plate(arm,kite,white,s*.16,-.133,.03,.26,.31,.195,-s*.27);
    pin(arm,s*.06,-.378,.026,.092,.197,deep);pin(arm,s*.17,-.378,.026,.059,.025,gold);
    const fw=(v==='gauntlets'?1.5:v==='tesla'?1.24:1)*Math.sqrt(bulk);
    strut(arm,V(s*.07,-.393,.04),V(s*.106,-.666,.102),.069,steel);
    shell(arm,[[-.697,.084*fw,.108],[-.63,.122*fw,.156],[-.493,.147*fw,.154],[-.411,.11*fw,.118]],primary,s*.08,0,.044);
    plate(arm,kite,white,s*.08,-.537,.165,.22*fw,.28,.083,-s*.11);
    plate(arm,chev,light,s*.08,-.529,.221,.105*fw,.063,.012,0,0,0,true);
    const palm=bone(arm,'Articulated gauntlet',s*.088,-.730,.093);
    shell(palm,[[-.098,.081*fw,.074],[-.063,.095*fw,.094],[.022,.099*fw,.088],[.068,.069,.064]],black);
    for(let i=0;i<4;i++){const x=(i-1.5)*.039*fw;pin(palm,x,-.10,.044,.024,.065,steel,'y');pin(palm,x,-.15,.05,.022,.038,black,'y');}
    strut(palm,V(-s*.075,-.015,.074),V(-s*.105,-.087,.105),.027,steel);
    return arm;
  };
  const armL=makeArm(-1),armR=makeArm(1);

  const shield=(p:T.Object3D)=>{
    const gear=bone(p,'Reactor kite shield',.167,-.46,.24);gear.rotation.y=.26;gear.rotation.z=-.09;
    const profile:P2[]=[[-.415,.398],[-.244,.584],[0,.522],[.259,.573],[.413,.376],[.318,-.154],[.181,-.438],[0,-.65],[-.183,-.44],[-.337,-.146]];
    plate(gear,profile,gold,0,0,0,1.03,1.04,.137);plate(gear,profile,black,0,0,.049,.98,.977,.09);
    plate(gear,profile,v==='aegis'?0x365890:primary,0,-.005,.087,.93,.94,.077);
    for(const s of [-1,1]){plate(gear,[[s*.20,.486],[s*.38,.365],[s*.286,-.124],[s*.215,-.318],[s*.232,.26]],white,0,0,.136,1,1,.05);
      plate(gear,[[s*.27,.451],[s*.352,.364],[s*.303,.14],[s*.288,.305]],gold,0,0,.166,1,1,.021);}
    plate(gear,chev,light,0,.09,.159,.456,.381,.016,0,0,0,true);
    plate(gear,diamond,light,0,-.063,.159,.115,.399,.016,0,0,0,true);
    gem(gear,0,.225,.166,.04,.06,.013);
  };
  const sword=(p:T.Object3D,s:number,long=1)=>{
    const hand=bone(p,'Plasma blade',s*.105,-.78,.104);hand.rotation.x=-1.00;hand.rotation.z=s*.39;
    pin(hand,0,-.009,0,.038,.22,deep,'y');band(hand,0,-.093,0,.065,.015,gold,Math.PI/2);
    plate(hand,chev,steel,0,-.12,0,.28,.11,.085);
    const blade:P2[]=[[-.052,-.145],[.064,-.137],[.060,-.565*long],[.16,-1.1*long],[-.045,-.778*long]];
    plate(hand,blade,v==='bulwark'||v==='aegis'?steel:light,0,0,0,1,1,.045,0,0,0,v!=='bulwark'&&v!=='aegis');
    plate(hand,[[.035,-.169],[.064,-.16],[.064,-.56*long],[.154,-1.075*long],[.011,-.70*long]],light,0,0,.028,1,1,.008,0,0,0,true);
  };
  const gauntlet=(p:T.Object3D,s:number,elec:boolean)=>{
    const fist=bone(p,elec?'Tesla capacitor gauntlet':'Impact piston gauntlet',s*.085,-.685,.08);
    const scale=elec?.83:1;fist.scale.setScalar(scale);
    shell(fist,[[-.19,.119,.139],[-.128,.19,.169],[.069,.19,.202],[.208,.14,.15]],primary);
    plate(fist,kite,white,0,.004,.145,.292,.352,.102);
    for(let i=0;i<4;i++){const x=(i-1.5)*.083;add(fist,new T.DodecahedronGeometry(.061,0),gold,x,-.105,.17,1,.94,1);}
    for(let j=0;j<3;j++)band(fist,0,.06+j*.057,0,.168-j*.012,.017,elec?gold:steel,Math.PI/2);
    if(elec){plate(fist,[[.06,.22],[-.085,.026],[-.018,.018],[-.071,-.154],[.105,.064],[.038,.072]],light,0,0,.211,1,1,.018,0,0,0,true);}
  };
  const crystal=(p:T.Object3D,s:number,x:number,y:number,z:number,height:number,width:number,angle:number)=>{const c=bone(p,'Cryogenic shard',x,y,z);c.rotation.z=s*-angle;c.rotation.x=-.22;shell(c,[[0,width*.7,width*.6],[height*.20,width,width*.85],[height*.7,width*.5,width*.43],[height,0.002,.002]],0x9adcf9,0,0,0,5);gem(c,0,height*.27,.025,width*.58,height*.31,width*.54,0x75deff);};
  const wing=(s:number,col:number,h:number)=>{const wing=bone(torso,'Segmented mantle',s*.36,.67,-.235);wing.rotation.z=s*.25;wing.rotation.x=.39;
    for(let i=0;i<3;i++){const profile:P2[]=[[0,.06],[s*(.22+i*.046),.14],[s*(.36+i*.095),-.34],[s*(.32+i*.1),-h+i*.07],[s*.057,-.5]];plate(wing,profile,i%2?primary:col,s*i*.072,-i*.06,-i*.035,1,1,.056);}};
  if(v==='bulwark'||v==='aegis'){shield(armR);sword(armL,-1,.73);if(v==='aegis'){wing(-1,white,.64);wing(1,white,.64);}}
  if(v==='twins'||v==='ninja'){sword(armL,-1,1);sword(armR,1,v==='ninja'?1.15:1);for(const s of [-1,1]){plate(s<0?armL:armR,shard,primary,s*.13,.144,-.012,.32,.40,.164,s*-.24);wing(s,v==='ninja'?0x302d46:primary,v==='ninja'?1.09:.52);}}
  if(v==='rail'){
    const gun=bone(armR,'Quantum rail emitter',.038,-.58,.209);gun.rotation.y=-1.13;gun.rotation.x=-.15;
    const barrel=bone(gun,'Forward assembly');barrel.rotation.x=Math.PI/2;
    shell(barrel,[[-.27,.097,.127],[-.18,.126,.151],[.16,.133,.15],[.30,.097,.113],[.67,.059,.077],[.96,.055,.062],[1.01,.074,.074]],primary,0,0,0,6);
    shell(barrel,[[-.24,.065,.077],[1.09,.045,.047]],black,0,.012,.007,8);
    for(const s of [-1,1])strut(gun,V(s*.11,.003,.06),V(s*.06,.003,.859),.026,steel,.021);
    for(let j=0;j<3;j++)band(gun,0,0,.48+j*.14,.065,.014,steel);
    strut(gun,V(0,.137,-.04),V(0,.152,.296),.044,black);gem(gun,0,.15,.30,.035,.035,.008);
    plate(gun,kite,light,0,.02,.19,.08,.067,.01,0,0,0,true);armL.rotation.x=-.33;wing(-1,gold,.47);wing(1,gold,.47);
  }
  if(v==='gauntlets'||v==='tesla')for(const s of [-1,1])gauntlet(s<0?armL:armR,s,v==='tesla');
  if(v==='crystal')for(const s of [-1,1]){const arm=s<0?armL:armR;for(let i=0;i<3;i++)crystal(arm,s,s*(.03+i*.085),.09-i*.036,-.035-i*.073,.504-i*.055,.09-i*.009,.4+i*.21);crystal(arm,s,s*.13,-.55,.06,.37,.077,.72);crystal(torso,s,s*.2,.59,-.3,.47,.079,.3);}
  if(v==='orb'||v==='medic'){
    for(const s of [-1,1]){wing(s,white,v==='orb'?.75:1.03);plate(torso,shard,white,s*.299,-.058,.044,.201,v==='medic'?.74:.53,.128,-s*.16);}
    const emitter=bone(armL,'Holographic projector',-.23,-.541,.268);
    if(v==='orb'){add(emitter,new T.IcosahedronGeometry(.123,1),light,0,0,0,1,1,1,0,0,0,'energy');for(let i=0;i<2;i++)band(emitter,0,0,0,.168+i*.027,.008,light,.88+i*.72,.4+i*1.2,true);}
    else{const cross:P2[]=[[-.032,.111],[.032,.111],[.032,.032],[.111,.032],[.111,-.032],[.032,-.032],[.032,-.111],[-.032,-.111],[-.032,-.032],[-.111,-.032],[-.111,.032],[-.032,.032]];plate(emitter,cross,light,0,0,0,1,1,.025,0,0,0,true);band(emitter,0,0,0,.15,.008,light,-.16,.07,true);}
  }
  if(v==='tesla')for(const s of [-1,1]){const p=s<0?armL:armR;plate(p,[[0,.2],[s*.135,.061],[s*.068,.045],[s*.195,-.14],[s*-.008,.007],[s*.049,.059]],gold,s*.02,.02,.218,1,1,.025);}
  // Static attachment holders do not need their own draw calls: collapse into
  // animateable skeleton nodes while keeping their local transforms intact.
  const animated=new Set<T.Object3D>([group,torso,head,legL,legR,armL,armR]);group.updateMatrixWorld(true);
  for(const [part,batches] of [...cache]){if(animated.has(part))continue;let root=part.parent;while(root&&!animated.has(root))root=root.parent;if(!root)continue;
    const mat=new T.Matrix4().copy(root.matrixWorld).invert().multiply(part.matrixWorld);const dest=cache.get(root)||new Map<T.Material,T.BufferGeometry[]>();
    for(const [material,geos] of batches){const out=dest.get(material)||[];for(const geo of geos){geo.applyMatrix4(mat);out.push(geo);}dest.set(material,out);}cache.set(root,dest);cache.delete(part);}
  let authored=0;for(const [parent,batches] of cache)for(const [material,geos] of batches){authored+=geos.length;const merged=mergeGeometries(geos,false);if(!merged)continue;merged.computeBoundingSphere();const m=new T.Mesh(merged,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);geos.forEach(g=>g.dispose());}
  const ring=new T.Mesh(new T.RingGeometry(.61,.632,32),iffMat);ring.rotation.x=-Math.PI/2;ring.position.y=.013;ring.name='Team identification ring';group.add(ring);
  group.userData={heroId:id,team,authoredParts:authored,artDirection:'hangar-mk2'};
  return {group,torso,head,armL,armR,legL,legR,mats,flashMats:[bodyMat],walkPhase:Math.random()*Math.PI*2,attackAnim:0,height:2.52};
}
