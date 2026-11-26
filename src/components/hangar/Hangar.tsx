"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowDownRight, ArrowRight, AudioLines, Box, Boxes, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Crosshair, Grid2X2, GraduationCap, Layers3, LayoutDashboard, ListFilter, LoaderCircle, Maximize, Play, Search, Settings2, Shield, Signal, SlidersHorizontal, Swords, Trophy, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { HEROES, type HeroDef } from '@/game/data';
import { VISUALS, portrait } from '@/game/visuals';
import { audio } from '@/game/audio';
import Brand from './Brand';
import RoleIcon from './RoleIcon';
import './hangar.css';

const ModelViewer = dynamic(() => import('./ModelViewer'), { ssr: false, loading: () => <div className="viewer-loading"><LoaderCircle className="spin"/> Memuat model 3D…</div> });
const roles = ['Semua Hero', 'Tank', 'Fighter', 'Assassin', 'Marksman', 'Mage', 'Support', 'Control', 'Defender'];
const nav = [{ label: 'Lobby', href: '/lobby', icon: LayoutDashboard }, { label: 'Hero Hangar', href: '/heroes', icon: Layers3 }, { label: 'Inventory', href: '/inventory', icon: Box }, { label: 'Leaderboard', href: '/leaderboard', icon: Trophy }];
type Dialog = 'details' | 'model' | 'launch' | null;

function DialogFrame({ children, onClose, label, kind }: {children: ReactNode; onClose: () => void; label: string; kind: string}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusables = () => [...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, [tabindex="0"]') || [])];
    focusables()[0]?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'Tab') { const items = focusables(); const first = items[0]; const last = items[items.length-1]; if (e.shiftKey && document.activeElement === first) {e.preventDefault(); last?.focus();} else if (!e.shiftKey && document.activeElement === last) {e.preventDefault(); first?.focus();} } };
    window.addEventListener('keydown',key);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown',key); before?.focus({preventScroll:true}); };
  },[onClose]);
  return <div className="rl-dialog-backdrop" onMouseDown={e => {if(e.target === e.currentTarget) onClose();}}><div ref={ref} className={`rl-dialog rl-dialog-${kind}`} role="dialog" aria-modal="true" aria-label={label}>{children}<button onClick={onClose} className="rl-dialog-close" aria-label="Tutup panel"><X size={18}/></button></div></div>;
}

function StatBars({ h }: {h: HeroDef}) {
  const rows = [['Durability', h.stats.hp,1250], ['Attack',h.stats.ad,105], ['Defense',h.stats.def,45], ['Mobility',h.stats.ms,14]] as const;
  return <div className="rl-stat-bars">{rows.map(([name,val,max])=><div key={name}><span>{name}</span><i><b style={{width:`${val/max*100}%`}}/></i><em>{val}</em></div>)}</div>;
}

export default function Hangar() {
  const [id,setId] = useState('titan');
  const [role,setRole] = useState('Semua Hero');
  const [search,setSearch] = useState('');
  const [dialog,setDialog] = useState<Dialog>(null);
  const [skill,setSkill] = useState(0);
  const [diff,setDiff] = useState('normal');
  const [name,setName] = useState('RoboLearner');
  const [level,setLevel] = useState(1);
  const [muted,setMuted] = useState(false);
  const [online,setOnline] = useState(true);
  const [menu,setMenu] = useState(false);
  const find = useRef<HTMLInputElement>(null);
  const feature = useRef<HTMLElement>(null);
  const profileMenu = useRef<HTMLDivElement>(null);
  const closeDialog = useCallback(()=>setDialog(null),[]);
  const hero = HEROES.find(h=>h.id===id) || HEROES[0];
  const visual = VISUALS[hero.id];
  const index = HEROES.indexOf(hero);
  const filtered = HEROES.filter(h=>(role === 'Semua Hero' || role === h.role) && `${h.name} ${h.role} ${VISUALS[h.id].title}`.toLowerCase().includes(search.trim().toLowerCase()));
  const select = (next: string, scroll=false) => { setId(next); setSkill(0); localStorage.setItem('rl_selected_hero',next); if(scroll && feature.current && feature.current.getBoundingClientRect().bottom < 80) feature.current.scrollIntoView({behavior:'smooth',block:'center'}); };
  const cycle = (n: number) => select(HEROES[(index+n+10)%10].id);
  useEffect(()=>{
    const n=localStorage.getItem('rl_player_name') || 'RoboLearner'; setName(n);
    const url = new URLSearchParams(location.search); const preferred=url.get('hero') || localStorage.getItem('rl_selected_hero');
    if(preferred && VISUALS[preferred]) setId(preferred);
    const d=url.get('diff')||localStorage.getItem('rl_difficulty');if(d && ['easy','normal','hard'].includes(d))setDiff(d);
    setMuted(localStorage.getItem('rl_muted')==='1');
    let active=true;fetch(`/api/profile/stats?playerName=${encodeURIComponent(n)}`).then(r=>r.ok?r.json():null).then(s=>{if(active&&s)setLevel(1+Math.floor((s.knowledgeXp || 0)/500));}).catch(()=>{});
    const checkOnline=()=>setOnline(navigator.onLine); checkOnline();window.addEventListener('online',checkOnline);window.addEventListener('offline',checkOnline);
    return ()=>{active=false;window.removeEventListener('online',checkOnline);window.removeEventListener('offline',checkOnline);};
  },[]);
  useEffect(()=>{const key=(e: KeyboardEvent)=>{if(e.key==='/'&&!dialog&&!(e.target instanceof HTMLInputElement)){e.preventDefault();find.current?.focus();}if(e.key==='Escape')setMenu(false);}; const outside=(e:PointerEvent)=>{if(!profileMenu.current?.contains(e.target as Node))setMenu(false);};window.addEventListener('keydown',key);window.addEventListener('pointerdown',outside);return()=>{window.removeEventListener('keydown',key);window.removeEventListener('pointerdown',outside);};},[dialog]);

  return <div className="rl-hangar" style={{'--unit-accent':visual.accent} as CSSProperties}>
    <header className="rl-topbar"><div className="rl-topbar-inner">
      <Brand/>
      <nav className="rl-navigation" aria-label="Navigasi utama">{nav.map(n=><Link key={n.href} href={n.href} className={n.label==='Hero Hangar'?'current':''} aria-current={n.label==='Hero Hangar'?'page':undefined}><n.icon size={16}/><span>{n.label}</span></Link>)}</nav>
      <div className="rl-pilot-tools">
        <button className="rl-icon-button rl-sound" aria-label={muted?'Aktifkan suara':'Matikan suara'} title={muted?'Aktifkan suara':'Matikan suara'} onClick={()=>{audio.setVolumes({muted:!muted});setMuted(!muted);}}>{muted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button>
        <Link href="/settings" className="rl-icon-button rl-settings" aria-label="Pengaturan"><Settings2 size={17}/></Link>
        <div className="rl-profile-wrap" ref={profileMenu}><button className="rl-pilot" onClick={()=>setMenu(v=>!v)} aria-expanded={menu} aria-label="Menu pilot"><span className="rl-avatar"><img src={portrait('titan')} alt=""/></span><span className="rl-pilot-name"><strong>{name}</strong><small><i/> PILOT LV. {String(level).padStart(2,'0')}</small></span><ChevronDown size={13}/></button>
          {menu&&<div className="rl-pilot-menu"><span className="rl-micro">PILOT CONSOLE</span><Link href="/profile"><Shield size={16}/> Profil pilot</Link><Link href="/settings"><SlidersHorizontal size={16}/> Pengaturan</Link><Link href="/teacher"><GraduationCap size={16}/> Dashboard guru</Link></div>}
        </div>
      </div>
    </div></header>

    <main className="rl-container">
      <div className="rl-page-heading"><div><div className="rl-eyebrow"><span className="rl-ticks"><i/><i/><i/></span> COMMAND CENTER <span className="rl-slash">/</span> ARMORY</div><h1>HERO HANGAR<span className="rl-heading-point">.</span></h1><p>Pilih hero, kenali kekuatannya, dan bersiaplah untuk bertempur.</p></div>
        <div className="rl-system"><span className={online?'ready-led':'offline-led'}/>{online?'SYSTEM ONLINE':'LOCAL MODE'}<b/><Signal size={14}/></div>
      </div>

      <section ref={feature} className={`rl-spotlight ${id==='titan'?'rl-titan':'rl-other'}`} aria-label={`Hero pilihan ${hero.name}`}>
        <div className="rl-stage-art" key={'art-'+id}><img className="rl-stage-image" src={id==='titan'?'/images/heroes/titan-wide.webp':portrait(id)} alt={`Artwork ${hero.name} — ${visual.title}`} fetchPriority="high"/></div>
        <div className="rl-stage-tint"/><div className="rl-stage-texture"/>
        <div className="rl-spot-content" key={'info-'+id}>
          <div className="rl-spot-label"><span className="rl-feature-tag"><i/> HERO SPOTLIGHT</span><span className="rl-unit-id">RL–{visual.serial}</span></div>
          <h2>{hero.name}</h2><div className="rl-unit-title">{visual.title}</div>
          <div className="rl-traits"><span className="rl-role-tag"><RoleIcon role={hero.role} size={14}/>{hero.role}</span><i/><span>{visual.specialty}</span><b/> <span>{hero.ranged?'Ranged':'Melee'}</span></div>
          <p>{visual.intro}</p>
          <div className="rl-feature-actions"><button className="rl-deploy" onClick={()=>setDialog('launch')}><Play size={15} fill="currentColor"/>Mainkan Hero<ArrowRight size={16}/></button><button className="rl-details" onClick={()=>setDialog('details')}>Detail Hero<ArrowDownRight size={15}/></button></div>
        </div>
        <button className="rl-model-btn" onClick={()=>setDialog('model')}><Box size={13}/> Preview 3D</button>
        <div className="rl-stage-id" aria-hidden="true"><i/>UNIT DISPLAY <b>//</b> {visual.serial}</div>
        <div className="rl-carousel"><button onClick={()=>cycle(-1)} aria-label="Hero sebelumnya"><ChevronLeft size={17}/></button><span><b>{String(index+1).padStart(2,'0')}</b><i>/</i>10</span><button onClick={()=>cycle(1)} aria-label="Hero berikutnya"><ChevronRight size={17}/></button></div>
      </section>

      <section className="rl-roster" aria-labelledby="collection-heading">
        <div className="rl-roster-head"><div className="rl-collection-title"><span className="rl-section-marker"/><h2 id="collection-heading">KOLEKSI HERO</h2><span className="rl-count">{String(filtered.length).padStart(2,'0')} UNIT</span></div>
          <label className="rl-search"><Search size={15}/><input ref={find} placeholder="Cari hero..." value={search} onChange={e=>setSearch(e.target.value)} aria-label="Cari hero"/>{search?<button onClick={()=>setSearch('')} aria-label="Hapus pencarian"><X size={13}/></button>:<kbd>/</kbd>}</label>
        </div>
        <div className="rl-filter-row" aria-label="Filter role hero">{roles.map(r=><button key={r} className={r===role?'active':''} onClick={()=>setRole(r)} aria-pressed={r===role}>{r==='Semua Hero'?<Grid2X2 size={14}/>:<RoleIcon role={r} size={15}/>}<span>{r}</span></button>)}</div>
        <div className="rl-card-grid">{filtered.map(h=>{const v=VISUALS[h.id];return <button key={h.id} onClick={()=>select(h.id,true)} className={`rl-unit-card ${h.id===id?'selected':''}`} aria-label={`Pilih ${h.name}, ${h.role}`} aria-pressed={h.id===id} style={{'--card-accent':v.accent} as CSSProperties}>
          <div className="rl-card-art"><img src={portrait(h.id)} alt={`${h.name}, ${v.title}`} loading={Number(v.serial)>5?'lazy':'eager'}/><div className="rl-card-vignette"/><span className="rl-card-index">UNIT {v.serial}</span>{id===h.id&&<span className="rl-card-check"><Check size={12} strokeWidth={3}/></span>}</div>
          <div className="rl-card-caption"><div><h3>{h.name}</h3><span><RoleIcon role={h.role} size={13}/>{h.role}</span></div><ChevronRight className="rl-card-arrow" size={18}/></div>
        </button>})}</div>
        {!filtered.length&&<div className="rl-empty"><Search size={25}/><h3>Hero tidak ditemukan</h3><p>Coba nama hero atau role yang berbeda.</p><button className="rl-details" onClick={()=>{setRole('Semua Hero');setSearch('');}}>Tampilkan semua hero</button></div>}
      </section>
      <footer className="rl-footer"><div><span className="rl-ticks"><i/><i/><i/></span>ROBOT LEGENDS <b>/</b> <span>Created by Wiyanto Abu Hanif</span></div><Link href="/teacher"><GraduationCap size={14}/> Teacher Dashboard <ChevronRight size={12}/></Link></footer>
    </main>

    {dialog&&<DialogFrame onClose={closeDialog} label={dialog==='launch'?'Persiapan pertandingan':`Detail ${hero.name}`} kind={dialog}>
      {dialog==='launch'?<>
        <div className="rl-launch-header"><span className="rl-eyebrow"><Swords size={14}/> BATTLE PROTOCOL</span><h2>PERSIAPAN TEMPUR</h2><p>Atur latihanmu sebelum masuk ke arena.</p></div>
        <div className="rl-launch-unit"><img src={portrait(id)} alt={hero.name}/><div><small>UNIT PILIHAN</small><strong>{hero.name}</strong><span><RoleIcon role={hero.role}/>{hero.role} <i>·</i> Team Cyber</span></div><span className="rl-launch-ready"><i/>READY</span></div>
        <div className="rl-mode-description"><Swords size={21}/><div><b>Practice vs AI</b><span>5 vs 5 · 3 lane · Knowledge Battle</span></div></div>
        <h3 className="rl-micro">TINGKAT KESULITAN</h3><div className="rl-difficulty">{[['easy','Easy','Belajar kontrol'],['normal','Normal','Seimbang'],['hard','Hard','AI agresif']].map(([d,label,desc])=><button key={d} onClick={()=>setDiff(d)} className={d===diff?'selected':''} aria-pressed={d===diff}><b>{label}</b><span>{desc}</span></button>)}</div>
        <Link className="rl-deploy rl-launch-go" href={`/battle?hero=${id}&diff=${diff}`} onClick={()=>localStorage.setItem('rl_difficulty',diff)}><Play size={16} fill="currentColor"/>Masuk Arena<ArrowRight size={17}/></Link>
        <p className="rl-launch-note"><Shield size={12}/> 1 pilot + 4 AI sekutu melawan 5 AI lawan.</p>
      </>:<>
        <div className="rl-dossier-bar"><div className="rl-eyebrow"><Crosshair size={13}/> UNIT DOSSIER <span>/</span> RL–{visual.serial}</div><div className="rl-dossier-tabs"><button className={dialog==='details'?'on':''} onClick={()=>setDialog('details')}><Layers3 size={14}/> Detail Hero</button><button className={dialog==='model'?'on':''} onClick={()=>setDialog('model')}><Box size={14}/> Model 3D</button></div></div>
        <div className="rl-dossier-grid"><div className="rl-dossier-visual">{dialog==='model'?<ModelViewer id={id}/>:<img src={portrait(id)} alt={`Artwork ${hero.name}`}/>}<span className="rl-dossier-serial">RL / {visual.serial}</span></div>
          <div className="rl-dossier-info"><span className="rl-role-tag"><RoleIcon role={hero.role}/>{hero.role}</span><h2>{hero.name}</h2><span className="rl-unit-title">{visual.title}</span><p>{visual.intro}</p><h3 className="rl-micro">STATISTIK DASAR</h3><StatBars h={hero}/><h3 className="rl-micro">SKILL LOADOUT</h3><div className="rl-ability-tabs">{hero.skills.map((s,i)=><button key={s.key} onClick={()=>setSkill(i)} className={skill===i?'chosen':''} aria-pressed={skill===i} aria-label={s.name}>{s.key}</button>)}</div><div className="rl-ability-info"><div><strong>{hero.skills[skill].name}</strong><small>CD {hero.skills[skill].cd}s</small></div><p>{hero.skills[skill].desc}</p></div><button onClick={()=>setDialog('launch')} className="rl-deploy"><Play size={14} fill="currentColor"/> Mainkan Hero <ArrowRight size={15}/></button></div>
        </div>
      </>}
    </DialogFrame>}
  </div>;
}
