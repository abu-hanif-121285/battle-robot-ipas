"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Gem, Swords, Trophy, Target, Crown, Coins, Check, Pencil, Bot } from "lucide-react";

interface Stats {
  matches: number; wins: number; kills: number; assists: number; knowledgeXp: number;
  goldEarned: number; correct: number; answered: number; mvpCount: number; damageDealt: number; avgDuration: number;
}
const EMPTY: Stats = { matches: 0, wins: 0, kills: 0, assists: 0, knowledgeXp: 0, goldEarned: 0, correct: 0, answered: 0, mvpCount: 0, damageDealt: 0, avgDuration: 0 };

export default function ProfilePage() {
  const [name, setName] = useState("RoboLearner");
  const [draft, setDraft] = useState("RoboLearner");
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [loading, setLoading] = useState(true);

  const loadStats = (n: string) => {
    setLoading(true);
    fetch(`/api/profile/stats?playerName=${encodeURIComponent(n)}`)
      .then((r) => r.json())
      .then((d) => setStats({ ...EMPTY, ...d }))
      .catch(() => setStats(EMPTY))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const n = localStorage.getItem("rl_player_name") || "RoboLearner";
    setName(n); setDraft(n);
    loadStats(n);
  }, []);

  const saveName = () => {
    const clean = draft.trim().slice(0, 24) || "RoboLearner";
    localStorage.setItem("rl_player_name", clean);
    setName(clean);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
    loadStats(clean);
  };

  const winRate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;
  const accuracy = stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : 0;
  const kxLevel = Math.floor(stats.knowledgeXp / 500) + 1;
  const kxProgress = (stats.knowledgeXp % 500) / 500;

  const achievements = [
    { name: "RONDE PERTAMA", desc: "Main 1 match", ok: stats.matches >= 1, icon: "🤖" },
    { name: "SOLDIER CYBER", desc: "5 kemenangan", ok: stats.wins >= 5, icon: "🛡️" },
    { name: "KNOWLEDGE SEEKER", desc: "500 Knowledge XP", ok: stats.knowledgeXp >= 500, icon: "📚" },
    { name: "MAESTRO IPAS", desc: "Akurasi ≥ 80% (min 10 soal)", ok: stats.answered >= 10 && accuracy >= 80, icon: "🎓" },
    { name: "MVP MATERIAL", desc: "2× MVP", ok: stats.mvpCount >= 2, icon: "👑" },
    { name: "ROBOT LEGEND", desc: "1500 Knowledge XP", ok: stats.knowledgeXp >= 1500, icon: "🏆" },
  ];

  return (
    <main className="min-h-screen bg-[#050a16] relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 15% 15%, #132a52 0%, transparent 55%), radial-gradient(ellipse at 85% 85%, #241031 0%, transparent 55%), #050a16" }} />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="btn btn-ghost flex items-center gap-2 px-4 py-2 text-[11px]"><ArrowLeft className="w-4 h-4" /> MENU</Link>
          <h1 className="font-display text-2xl font-extrabold text-white flex items-center gap-3"><User className="text-cyan-400" /> PROFILE</h1>
          <div className="w-24" />
        </div>

        {/* Identity card */}
        <div className="panel p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-28 h-28 flex items-center justify-center border border-cyan-400/50 bg-gradient-to-br from-[#17294d] to-[#090f24]" style={{ clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)" }}>
            <Bot className="w-14 h-14 text-cyan-300" strokeWidth={1.4} />
          </div>
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={24}
                className="bg-transparent border-b border-cyan-400/30 focus:border-cyan-400 outline-none font-display text-2xl text-white w-full py-1" />
              <button onClick={saveName} className="text-cyan-400 hover:text-white shrink-0" aria-label="save name">
                {saved ? <Check className="w-6 h-6 text-emerald-400" /> : <Pencil className="w-5 h-5" />}
              </button>
            </div>
            <div className="text-[10px] font-display tracking-[0.3em] text-cyan-500 mt-1">UNIT TEMPUR — TEAM CYBER</div>
            <div className="flex items-center justify-between mt-3 mb-1">
              <span className="text-[10px] font-display text-fuchsia-300 flex items-center gap-1"><Gem className="w-3.5 h-3.5" /> KNOWLEDGE LV {kxLevel}</span>
              <span className="text-[10px] font-display text-slate-500">{stats.knowledgeXp} / {kxLevel * 500} XP</span>
            </div>
            <div className="h-2.5 bar-shell"><div className="bar-fill" style={{ width: `${kxProgress * 100}%`, background: "linear-gradient(90deg,#a21caf,#e879f9)" }} /></div>
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4">
          {[
            { icon: <Swords className="w-4 h-4" />, label: "MATCH", value: stats.matches },
            { icon: <Trophy className="w-4 h-4" />, label: "MENANG", value: `${winRate}%` },
            { icon: <Target className="w-4 h-4" />, label: "AKURASI", value: `${accuracy}%` },
            { icon: <Crown className="w-4 h-4" />, label: "MVP", value: stats.mvpCount },
            { icon: <Coins className="w-4 h-4" />, label: "GOLD", value: stats.goldEarned.toLocaleString("id-ID") },
            { icon: <Gem className="w-4 h-4" />, label: "K-XP", value: stats.knowledgeXp.toLocaleString("id-ID") },
          ].map((s, i) => (
            <div key={i} className="panel-soft p-3 flex flex-col items-center text-center">
              <div className="text-cyan-400">{s.icon}</div>
              <div className="font-display text-lg text-white mt-1">{loading ? "…" : s.value}</div>
              <div className="text-[8px] font-display text-slate-500 tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Achievements */}
        <div className="panel-soft p-4 mt-4">
          <div className="font-display text-[10px] tracking-[0.3em] text-slate-400 mb-2">MEDALI PENCAPAIAN</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {achievements.map((a) => (
              <div key={a.name} className={`border p-3 flex items-center gap-3 ${a.ok ? "border-amber-400/40 bg-amber-400/5" : "border-slate-800 opacity-40 grayscale"}`}>
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <div className="font-display text-[10px] text-white">{a.name}</div>
                  <div className="text-[9px] text-slate-400 leading-tight">{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-[9px] text-slate-600 text-center mt-3 font-display tracking-widest">PROFIL TERHUBUNG DENGAN LAPORAN BELAJAR GURU VIA NAMA PEMAIN</div>
      </div>
    </main>
  );
}
