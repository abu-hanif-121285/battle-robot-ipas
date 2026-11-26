"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Play, Users, Package, Swords, Trophy, User, Settings, GraduationCap,
  Coins, Gem, ChevronRight, X, Bot, Wifi, ShieldCheck, Sparkles, BookOpenCheck,
} from "lucide-react";

interface ProfileStats { matches: number; wins: number; knowledgeXp: number; goldEarned: number }

export default function MainMenu() {
  const [battleOpen, setBattleOpen] = useState(false);
  const [stats, setStats] = useState<ProfileStats>({ matches: 0, wins: 0, knowledgeXp: 0, goldEarned: 0 });
  const [playerName, setPlayerName] = useState("RoboLearner");

  useEffect(() => {
    const n = localStorage.getItem("rl_player_name") || "RoboLearner";
    setPlayerName(n);
    fetch(`/api/profile/stats?playerName=${encodeURIComponent(n)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && typeof d.matches === "number") setStats(d); })
      .catch(() => {});
  }, []);

  const embers = useMemo(
    () => Array.from({ length: 26 }, (_, i) => ({
      id: i,
      left: ((i * 47 + 13) % 100),
      size: 2 + ((i * 7) % 5),
      delay: ((i * 5) % 9),
      dur: 7 + ((i * 5) % 9),
      cyan: i % 3 === 0,
    })),
    []
  );

  const winRate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#050a16] select-none">
      {/* ─── Backdrop ─── */}
      <div className="absolute inset-0">
        <Image src="/images/heroes/titan-wide.webp" alt="Robot Legends key art" fill priority className="object-cover object-[68%_center] opacity-95" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050a16] via-[#050a16cc] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050a16] via-transparent to-[#050a1699]" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 72% 38%, transparent 30%, rgba(5,10,22,.55) 78%, #050a16 100%)" }} />
      </div>
      {/* embers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {embers.map((e) => (
          <span key={e.id} className={`ember ${e.cyan ? "cyan" : ""}`} style={{ left: `${e.left}%`, width: e.size, height: e.size, animationDelay: `${e.delay}s`, animationDuration: `${e.dur}s` }} />
        ))}
      </div>

      {/* ─── Top bar ─── */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 flex items-center justify-center border border-cyan-400/40 bg-cyan-400/10" style={{ clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)" }}>
            <Bot className="w-6 h-6 text-cyan-300" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-[10px] tracking-[0.35em] text-cyan-400/90">CYBER ACADEMY PRESENTS</div>
            <div className="font-display text-xs sm:text-sm text-slate-200 tracking-widest">{playerName} <span className="text-cyan-500">· Lv.{Math.max(1, Math.floor(stats.knowledgeXp / 500) + 1)}</span></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hud-chip flex items-center gap-2 px-3 py-1.5" title="Total gold dari seluruh pertandingan">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-display text-xs sm:text-sm text-amber-200">{stats.goldEarned.toLocaleString("id-ID")}</span>
          </div>
          <div className="hud-chip flex items-center gap-2 px-3 py-1.5" title="Knowledge XP — diraih dari jawaban benar">
            <Gem className="w-4 h-4 text-fuchsia-400" />
            <span className="font-display text-xs sm:text-sm text-fuchsia-200">{stats.knowledgeXp.toLocaleString("id-ID")}</span>
          </div>
          <div className="hud-chip hidden sm:flex items-center gap-2 px-3 py-1.5" title="Win rate">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-display text-xs sm:text-sm text-emerald-200">{winRate}% WR · {stats.matches} Match</span>
          </div>
        </div>
      </header>

      {/* ─── Left content ─── */}
      <div className="absolute z-10 left-0 top-0 bottom-0 flex flex-col justify-center pl-4 sm:pl-10 lg:pl-14 pr-6 max-w-[720px]">
        {/* Logo lockup */}
        <div className="menu-float mb-5 sm:mb-7">
          <div className="font-display text-[11px] sm:text-xs tracking-[0.5em] text-cyan-400 mb-1 flex items-center gap-3">
            <span className="h-px w-10 bg-cyan-400/70 inline-block" /> THE ACADEMY’S MOBA
          </div>
          <h1 className="font-display font-black leading-[0.95]">
            <span className="block text-5xl sm:text-7xl lg:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-500 text-glow-cyan">ROBOT</span>
            <span className="block text-5xl sm:text-7xl lg:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-orange-600 text-glow-gold">LEGENDS</span>
          </h1>
          <div className="mt-2 inline-flex items-center gap-2 border border-amber-400/50 bg-amber-400/10 px-3 py-1" style={{ clipPath: "polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)" }}>
            <BookOpenCheck className="w-4 h-4 text-amber-300" />
            <span className="font-display text-[10px] sm:text-[11px] tracking-[0.3em] text-amber-200">BATTLE OF KNOWLEDGE</span>
          </div>
        </div>

        {/* PLAY button */}
        <Link href="/heroes" className="btn btn-gold inline-flex items-center gap-3 self-start text-xl sm:text-2xl font-extrabold px-10 sm:px-14 py-3.5 sm:py-4 mb-5 sm:mb-6">
          <Play className="w-7 h-7 fill-[#231400]" /> PLAY
        </Link>

        {/* Nav grid */}
        <div className="flex flex-col gap-1 w-56 sm:w-64">
          <Link href="/heroes" className="menu-item"><Users className="w-4 h-4 text-cyan-400" />Heroes <ChevronRight className="w-3 h-3 ml-auto opacity-60" /></Link>
          <Link href="/inventory" className="menu-item"><Package className="w-4 h-4 text-cyan-400" />Inventory <ChevronRight className="w-3 h-3 ml-auto opacity-60" /></Link>
          <button onClick={() => setBattleOpen(true)} className="menu-item text-left"><Swords className="w-4 h-4 text-cyan-400" />Battle Mode <ChevronRight className="w-3 h-3 ml-auto opacity-60" /></button>
          <Link href="/leaderboard" className="menu-item"><Trophy className="w-4 h-4 text-cyan-400" />Leaderboard <ChevronRight className="w-3 h-3 ml-auto opacity-60" /></Link>
          <Link href="/profile" className="menu-item"><User className="w-4 h-4 text-cyan-400" />Profile <ChevronRight className="w-3 h-3 ml-auto opacity-60" /></Link>
          <Link href="/settings" className="menu-item"><Settings className="w-4 h-4 text-cyan-400" />Settings <ChevronRight className="w-3 h-3 ml-auto opacity-60" /></Link>
          <Link href="/teacher" className="menu-item" style={{ borderLeftColor: "#ffc832" }}><GraduationCap className="w-4 h-4 text-amber-400" /><span className="text-amber-200">Teacher Dashboard</span> <ChevronRight className="w-3 h-3 ml-auto opacity-60" /></Link>
        </div>

        {/* Footer credit */}
        <div className="mt-6 sm:mt-8 text-[10px] sm:text-[11px] tracking-[0.22em] text-slate-500">
          MOBA EDUKATIF 3D · IPAS KELAS 6 · <span className="text-slate-300">CREATED BY WIYANTO ABU HANIF</span>
        </div>
      </div>

      {/* ─── Bottom-right badges ─── */}
      <div className="absolute z-10 bottom-4 right-4 sm:bottom-6 sm:right-6 hidden md:flex flex-col items-end gap-2">
        <div className="panel-soft px-4 py-2.5 flex items-center gap-3">
          <Bot className="w-5 h-5 text-cyan-300" />
          <div className="text-[11px] leading-tight">
            <div className="font-display text-cyan-300 tracking-widest">10 HERO ROBOT</div>
            <div className="text-slate-400">3 Jalur · Jungle · Omega Colossus</div>
          </div>
        </div>
        <div className="panel-soft px-4 py-2.5 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-fuchsia-300" />
          <div className="text-[11px] leading-tight">
            <div className="font-display text-fuchsia-300 tracking-widest">KNOWLEDGE BATTLE</div>
            <div className="text-slate-400">Jawab IPAS → Gold · Shield · Buff & Ultimate</div>
          </div>
        </div>
      </div>

      {/* ─── Battle Mode modal ─── */}
      {battleOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setBattleOpen(false)}>
          <div className="panel max-w-3xl w-full p-6 sm:p-8 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setBattleOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
            <div className="font-display text-cyan-400 text-[10px] tracking-[0.4em] mb-1">PILIH MODE PERTARUNGAN</div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-5">BATTLE MODE</h2>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Practice vs AI */}
              <div className="panel-soft p-5 flex flex-col border-cyan-400/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 flex items-center justify-center bg-cyan-500/15 border border-cyan-400/40" style={{ clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)" }}>
                    <Bot className="w-6 h-6 text-cyan-300" />
                  </div>
                  <div>
                    <div className="font-display text-white text-lg leading-none">5v5 PRACTICE</div>
                    <div className="text-cyan-400 text-[11px] font-display tracking-widest">vs AI — SIAP MAIN</div>
                  </div>
                </div>
                <p className="text-slate-300 text-sm mb-4">Satu tim penuh melawan 5 AI TITAN. AI mampu farming, push lane, defend turret, war, dan menyerang Omega Colossus. Pilih tingkat kesulitan:</p>
                <div className="flex flex-col gap-2 mt-auto">
                  <Link href="/heroes?diff=easy" className="btn btn-ghost text-center text-xs py-2.5">EASY — AI ramah untuk belajar</Link>
                  <Link href="/heroes?diff=normal" className="btn btn-cyber text-center text-xs py-2.5">NORMAL — Tantangan seimbang</Link>
                  <Link href="/heroes?diff=hard" className="btn btn-danger text-center text-xs py-2.5">HARD — AI agresif & mematikan</Link>
                </div>
              </div>

              {/* Online multiplayer — jujur: tidak aktif di deployment ini */}
              <div className="panel-soft p-5 flex flex-col opacity-80">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 flex items-center justify-center bg-fuchsia-500/10 border border-fuchsia-400/30" style={{ clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)" }}>
                    <Wifi className="w-6 h-6 text-fuchsia-300" />
                  </div>
                  <div>
                    <div className="font-display text-white text-lg leading-none">5v5 ONLINE</div>
                    <div className="text-fuchsia-300 text-[11px] font-display tracking-widest">ROOM · MATCHMAKING · 10 SLOT</div>
                  </div>
                </div>
                <p className="text-slate-300 text-sm mb-3">Room code, matchmaking, sinkronisasi posisi/skill/HP real-time via Socket.IO (server-authoritative), dan reconnect otomatis.</p>
                <div className="mt-auto border border-fuchsia-400/30 bg-fuchsia-500/5 p-3 text-[12px] leading-snug text-fuchsia-200/90">
                  <span className="font-display text-[10px] tracking-widest text-fuchsia-300 block mb-1">STATUS JUJUR</span>
                  Online multiplayer membutuhkan dedicated Socket.IO server yang tidak tersedia pada deployment web ini. Tombol ini sengaja dinonaktifkan — bukan tombol palsu. Gunakan <span className="text-cyan-300">Practice vs AI</span> untuk bermain melawan tim robot.
                </div>
                <button disabled className="btn btn-disabled text-xs py-2.5 mt-2">ONLINE — MEMBUTUHKAN SERVER DEDICATED</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
