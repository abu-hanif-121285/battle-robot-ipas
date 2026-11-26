"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Settings, Volume2, Monitor, Gamepad2, Trash2, Keyboard, Check } from "lucide-react";
import { audio } from "@/game/audio";

export default function SettingsPage() {
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [autoAttack, setAutoAttack] = useState(true);
  const [volume, setVolume] = useState({ master: 0.8, music: 0.55, sfx: 0.9 });
  const [muted, setMuted] = useState(false);
  const [wiped, setWiped] = useState(false);

  useEffect(() => {
    setQuality((localStorage.getItem("rl_quality") as "low" | "medium" | "high") || "medium");
    setAutoAttack(localStorage.getItem("rl_auto_attack") !== "0");
    setMuted(localStorage.getItem("rl_muted") === "1");
    setVolume({
      master: Number(localStorage.getItem("rl_vol_master") ?? 0.8),
      music: Number(localStorage.getItem("rl_vol_music") ?? 0.55),
      sfx: Number(localStorage.getItem("rl_vol_sfx") ?? 0.9),
    });
  }, []);

  const setQ = (q: "low" | "medium" | "high") => { setQuality(q); localStorage.setItem("rl_quality", q); audio.uiClick(); };

  const wipe = () => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("rl_")) localStorage.removeItem(k);
    }
    setWiped(true);
    window.setTimeout(() => setWiped(false), 1800);
  };

  return (
    <main className="min-h-screen bg-[#050a16] relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 85% 10%, #132a52 0%, transparent 55%), #050a16" }} />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="btn btn-ghost flex items-center gap-2 px-4 py-2 text-[11px]"><ArrowLeft className="w-4 h-4" /> MENU</Link>
          <h1 className="font-display text-2xl font-extrabold text-white flex items-center gap-3"><Settings className="text-cyan-400" /> SETTINGS</h1>
          <div className="w-24" />
        </div>

        {/* Graphics */}
        <div className="panel-soft p-5 mb-4">
          <div className="font-display text-[10px] tracking-[0.3em] text-slate-400 mb-3 flex items-center gap-2"><Monitor className="w-4 h-4" /> KUALITAS GRAFIS 3D</div>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["low", "LOW", "30+ FPS di Chromebook"],
              ["medium", "MEDIUM", "Seimbang (default)"],
              ["high", "HIGH", "Shadow & pixel ratio penuh"],
            ] as const).map(([id, label, desc]) => (
              <button key={id} onClick={() => setQ(id)} className={`border p-3 text-center transition-all ${quality === id ? "border-cyan-400 bg-cyan-400/10 text-cyan-300" : "border-slate-800 text-slate-400 hover:border-slate-600"}`}>
                <div className="font-display text-sm">{label}</div>
                <div className="text-[9px] leading-tight mt-1 text-slate-500">{desc}</div>
              </button>
            ))}
          </div>
          <div className="text-[9px] text-slate-600 mt-2">Berlaku saat pertandingan dimulai. Target 30–60 FPS sesuai perangkat.</div>
        </div>

        {/* Audio */}
        <div className="panel-soft p-5 mb-4">
          <div className="font-display text-[10px] tracking-[0.3em] text-slate-400 mb-3 flex items-center gap-2"><Volume2 className="w-4 h-4" /> AUDIO</div>
          {([
            ["Master Volume", "master"], ["Musik", "music"], ["Efek Suara (Laser, Ledakan, Koin)", "sfx"],
          ] as const).map(([label, key]) => (
            <label key={key} className="block mb-3">
              <div className="flex justify-between text-[11px] font-display text-slate-300 mb-1"><span>{label}</span><span className="text-cyan-400">{Math.round(volume[key] * 100)}%</span></div>
              <input type="range" min={0} max={100} value={Math.round(volume[key] * 100)} className="w-full accent-cyan-400"
                onChange={(e) => { const v = Number(e.target.value) / 100; const nv = { ...volume, [key]: v }; setVolume(nv); audio.setVolumes({ [key]: v }); }} />
            </label>
          ))}
          <label className="flex items-center justify-between text-[11px] font-display text-slate-300 border border-cyan-400/20 px-3 py-2">
            MUTE SEMUA
            <button onClick={() => { const m = !muted; setMuted(m); localStorage.setItem("rl_muted", m ? "1" : "0"); audio.setVolumes({ muted: m }); }} className={`w-12 h-6 border transition-colors ${muted ? "border-rose-400 bg-rose-500/30" : "border-slate-700"}`}>
              <div className={`w-5 h-5 mt-[1px] transition-all ${muted ? "ml-6 bg-rose-400" : "ml-0.5 bg-slate-500"}`} />
            </button>
          </label>
        </div>

        {/* Gameplay */}
        <div className="panel-soft p-5 mb-4">
          <div className="font-display text-[10px] tracking-[0.3em] text-slate-400 mb-3 flex items-center gap-2"><Gamepad2 className="w-4 h-4" /> GAMEPLAY</div>
          <label className="flex items-center justify-between text-[11px] font-display text-slate-300 mb-3">
            AUTO ATTACK (serang otomatis saat musuh dalam jangkauan)
            <button onClick={() => { const v = !autoAttack; setAutoAttack(v); localStorage.setItem("rl_auto_attack", v ? "1" : "0"); audio.uiClick(); }} className={`w-12 h-6 border transition-colors ${autoAttack ? "border-emerald-400 bg-emerald-500/30" : "border-slate-700"}`}>
              <div className={`w-5 h-5 mt-[1px] transition-all ${autoAttack ? "ml-6 bg-emerald-400" : "ml-0.5 bg-slate-500"}`} />
            </button>
          </label>
          <div className="border border-cyan-400/20 p-3">
            <div className="flex items-center gap-2 text-[10px] font-display text-cyan-400 tracking-widest mb-2"><Keyboard className="w-4 h-4" /> KONTROL PC</div>
            <div className="grid grid-cols-2 gap-y-1 text-[11px] text-slate-300">
              {[["WASD / Panah", "Bergerak"], ["Seret mouse", "Putar kamera"], ["Scroll", "Zoom kamera"], ["Klik kiri / SPASI", "Basic Attack"], ["Q · E · R", "Skill 1 · 2 · 3"], ["F", "Ultimate (level 4)"], ["B", "Recall ke base"], ["V", "Flicker (blink)"], ["TAB", "Scoreboard (tahan)"], ["ESC", "Pause menu"]].map(([k, v]) => (
                <div key={k} className="flex items-center gap-2"><span className="font-display text-[9px] text-amber-300 border border-amber-400/40 px-1.5 py-0.5 min-w-20 text-center">{k}</span><span className="text-slate-400">{v}</span></div>
              ))}
            </div>
            <div className="text-[9px] text-slate-500 mt-2">HP/Touchscreen: joystick analog di kiri bawah, tombol skill di kanan bawah (mendukung multitouch).</div>
          </div>
        </div>

        {/* Data */}
        <div className="panel-soft p-5">
          <div className="font-display text-[10px] tracking-[0.3em] text-slate-400 mb-2">DATA LOKAL</div>
          <button onClick={wipe} className="btn btn-danger text-[11px] px-4 py-2.5 flex items-center gap-2">
            {wiped ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />} {wiped ? "PENGATURAN DIRESET" : "RESET PENGATURAN LOKAL"}
          </button>
          <p className="text-[9px] text-slate-600 mt-2">Menghapus seluruh rl_* di localStorage (kualitas, volume, nama pemain, dll). Statistik pertandingan di server tidak terpengaruh.</p>
        </div>
      </div>
    </main>
  );
}
