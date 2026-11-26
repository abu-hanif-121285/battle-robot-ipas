"use client";
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Rotate3d } from 'lucide-react';
import { buildHeroRobot } from '@/game/robots';
import { portrait, VISUALS } from '@/game/visuals';

export default function ModelViewer({id}:{id:string}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [unavailable,setUnavailable] = useState(false);
  const [pose,setPose] = useState<'idle'|'action'>('idle');
  const mode = useRef(pose);mode.current=pose;
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    let renderer: THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({canvas:el,antialias:true,alpha:true,powerPreference:'high-performance'});}catch{setUnavailable(true);return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
    const scene=new THREE.Scene();const room=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer);const reflection=pmrem.fromScene(room,.04);scene.environment=reflection.texture;scene.environmentIntensity=.78;
    const camera=new THREE.PerspectiveCamera(36,1,.05,100);
    const key=new THREE.DirectionalLight(0xfff6e7,2.4);key.position.set(3,5,4);scene.add(key);
    const rim=new THREE.DirectionalLight(0x78c9ff,2.2);rim.position.set(-3,4,-2);scene.add(rim);scene.add(new THREE.HemisphereLight(0xc1e5ff,0x42566b,.9));
    const rec=buildHeroRobot(id,'cyber');scene.add(rec.group);const bb=new THREE.Box3().setFromObject(rec.group);const h=bb.max.y-bb.min.y;
    const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.42,.12,48),new THREE.MeshStandardMaterial({color:0x31485d,metalness:.75,roughness:.3}));pedestal.position.y=-.06;scene.add(pedestal);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.29,.014,6,72),new THREE.MeshBasicMaterial({color:VISUALS[id].light}));ring.rotation.x=Math.PI/2;ring.position.y=.013;scene.add(ring);
    const grid=new THREE.GridHelper(18,36,0x38536c,0x203043);grid.position.y=-.13;scene.add(grid);
    let yaw=-.3,tilt=.08,zoom=1,drag=false,px=0,py=0,lastInput=0,raf=0;
    const homeY=rec.torso.position.y;
    const resize=()=>{const w=el.clientWidth,ht=el.clientHeight;if(!w||!ht)return;renderer.setSize(w,ht,false);camera.aspect=w/ht;camera.updateProjectionMatrix();};
    const ro=new ResizeObserver(resize);ro.observe(el);resize();
    const down=(e:PointerEvent)=>{drag=true;px=e.clientX;py=e.clientY;el.setPointerCapture(e.pointerId);lastInput=performance.now();};
    const move=(e:PointerEvent)=>{if(!drag)return;yaw+=(e.clientX-px)*.011;tilt=THREE.MathUtils.clamp(tilt+(e.clientY-py)*.004,-.28,.5);px=e.clientX;py=e.clientY;lastInput=performance.now();};
    const up=()=>{drag=false;};const wheel=(e:WheelEvent)=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom+Math.sign(e.deltaY)*.09,.74,1.5);};
    const keys=(e:KeyboardEvent)=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();yaw+=(e.key==='ArrowLeft'?-1:1)*.15;lastInput=performance.now();}};
    const lost=(e:Event)=>{e.preventDefault();setUnavailable(true);cancelAnimationFrame(raf);};
    el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('lostpointercapture',up);el.addEventListener('wheel',wheel,{passive:false});el.addEventListener('keydown',keys);el.addEventListener('webglcontextlost',lost);
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;let prev=performance.now();
    const frame=(now:number)=>{raf=requestAnimationFrame(frame);const dt=Math.min(.05,(now-prev)/1000);prev=now;const t=now/1000;if(!document.hidden){if(!reduce&&!drag&&now-lastInput>3500)yaw+=dt*.18;rec.group.rotation.y=yaw;const action=mode.current==='action';const pulse=reduce?0:Math.sin(t*1.6);rec.torso.position.y=homeY+pulse*.012;rec.armL.rotation.x=action?-.65+Math.sin(t*3)*.35:-.09+pulse*.025;rec.armR.rotation.x=action?-.55-Math.sin(t*3)*.4:-.13-pulse*.02;rec.legL.rotation.x=action?Math.sin(t*3)*.29:0;rec.legR.rotation.x=action?-Math.sin(t*3)*.29:0;rec.head.rotation.y=action?-.14:.06;const d=Math.max(h*1.80,(bb.max.x-bb.min.x)*1.98/camera.aspect)*zoom;camera.position.set(0,h*.51+Math.sin(tilt)*d,Math.cos(tilt)*d);camera.lookAt(0,h*.48,0);renderer.render(scene,camera);}};raf=requestAnimationFrame(frame);
    return()=>{cancelAnimationFrame(raf);ro.disconnect();el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('lostpointercapture',up);el.removeEventListener('wheel',wheel);el.removeEventListener('keydown',keys);el.removeEventListener('webglcontextlost',lost);const geos=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>();scene.traverse(o=>{if(o instanceof THREE.Mesh){geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());room.dispose();reflection.dispose();pmrem.dispose();renderer.dispose();};
  },[id]);
  if(unavailable)return <div className="rl-model-fallback" style={{backgroundImage:`url(${portrait(id)})`}}><p>WebGL tidak tersedia di perangkat ini. Artwork hero ditampilkan sebagai pengganti model 3D.</p></div>;
  return <><canvas ref={canvas} tabIndex={0} className="rl-model-canvas" aria-label={`Model 3D ${id}. Seret atau gunakan panah kiri dan kanan untuk memutar.`}/><div className="rl-viewer-pose">{(['idle','action'] as const).map(p=><button key={p} className={p===pose?'selected':''} aria-pressed={p===pose} onClick={()=>setPose(p)}>{p==='idle'?'Pose siaga':'Pose tempur'}</button>)}</div><div className="rl-viewer-hint"><Rotate3d size={15}/>Seret untuk memutar · Scroll untuk zoom</div></>;
}
