"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, Crown, Medal, Gem, Swords, Loader2 } from "lucide-react";

interface Row {
  playerName: string; matches: number; wins: number; kills: number; deaths: number; assists: number;
  knowledgeXp: number; correct: number; answered: number; mvpCount: number; goldEarned: number;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ totalMatches: 0, players: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => { setRows(d.top ?? []); setTotals(d.totals ?? { totalMatches: 0, players: 0 }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxXp = Math.max(1, ...rows.map((r) => r.knowledgeXp));
  const rankIcon = (i: number) =>
    i === 0 ? <Crown className="w-6 h-6 text-amber-400" /> :
    i === 1 ? <Medal className="w-6 h-6 text-slate-300" /> :
    i === 2 ? <Medal className="w-6 h-6 text-amber-700" /> :
    <span className="font-display text-slate-500 w-6 text-center">{i + 1}</span>;

  return (
    <main className="min-h-screen bg-[#050a16] relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% -10%, #132a52 0%, transparent 60%), radial-gradient(ellipse at 90% 110%, #241031 0%, transparent 55%), #050a16" }} />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="btn btn-ghost flex items-center gap-2 px-4 py-2 text-[11px]"><ArrowLeft className="w-4 h-4" /> MENU</Link>
          <div className="flex items-center gap-3">
            <Trophy className="w-7 h-7 text-amber-400" />
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">LEADERBOARD</h1>
          </div>
          <div className="hud-chip px-3 py-1.5 text-[10px] font-display text-slate-400">{totals.totalMatches} MATCH · {totals.players} PEMAIN</div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-24 text-cyan-400"><Loader2 className="w-10 h-10 animate-spin" /><div className="font-display text-xs tracking-widest mt-4">MEMUAT RANKING…</div></div>
        ) : rows.length === 0 ? (
          <div className="panel p-10 text-center">
            <Swords className="w-12 h-12 text-cyan-500 mx-auto mb-3" />
            <h2 className="font-display text-xl text-white">BELUM ADA PERTANDINGAN</h2>
            <p className="text-slate-400 mt-2 max-w-md mx-auto">Leaderboard diisi secara nyata dari hasil pertandingan. Mainkan satu match, jawab soal IPAS, dan jadilah yang pertama di puncak!</p>
            <Link href="/heroes" className="btn btn-gold inline-block mt-5 px-8 py-3">MAIN SEKARANG</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[44px_1fr_64px_64px_90px_110px] gap-2 px-3 text-[9px] font-display text-slate-500 tracking-widest">
              <span>RANK</span><span>PEMAIN</span><span className="text-center">MENANG</span><span className="text-center">MVP</span><span className="text-center">AKURASI</span><span className="text-right">KNOWLEDGE XP</span>
            </div>
            {rows.map((r, i) => {
              const wr = r.matches > 0 ? Math.round((r.wins / r.matches) * 100) : 0;
              const acc = r.answered > 0 ? Math.round((r.correct / r.answered) * 100) : 0;
              return (
                <div key={r.playerName} className={`panel-soft grid grid-cols-[44px_1fr_64px_64px_90px_110px] gap-2 px-3 py-3 items-center ${i === 0 ? "border-amber-400/40" : ""}`}>
                  <div className="flex justify-center">{rankIcon(i)}</div>
                  <div className="min-w-0">
                    <div className="font-display text-sm text-white truncate">{r.playerName}</div>
                    <div className="text-[9px] text-slate-500 font-display">{r.matches} MATCH · {wr}% WR · {r.kills}/{r.deaths}/{r.assists} KDA</div>
                  </div>
                  <div className="text-center font-display text-emerald-400">{r.wins}</div>
                  <div className="text-center font-display text-amber-300">{r.mvpCount}</div>
                  <div className="text-center font-display text-cyan-300">{acc}%</div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 font-display text-fuchsia-300"><Gem className="w-4 h-4" />{r.knowledgeXp.toLocaleString("id-ID")}</div>
                    <div className="w-24 h-1.5 bg-slate-800 mt-1"><div className="h-full bg-fuchsia-500/80" style={{ width: `${(r.knowledgeXp / maxXp) * 100}%` }} /></div>
                  </div>
                </div>
              );
            })}
            <div className="text-center text-[10px] text-slate-600 font-display tracking-widest mt-4">RANKING DIHITUNG DARI KNOWLEDGE XP — BELAJAR ADALAH JALAN MENUJU PUNCAK</div>
          </div>
        )}
      </div>
    </main>
  );
}
