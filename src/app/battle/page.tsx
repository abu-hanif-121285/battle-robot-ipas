"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Coins, Pause, Play, ShoppingBag, Store, X, Swords, Shield, Gem, Volume2, VolumeX,
  CheckCircle2, XCircle, Timer, Crown, Home, RotateCcw, ChevronRight, Sparkles, Wind,
  Heart, Zap, Snowflake, Circle, Hammer, Magnet, Castle, RefreshCw, Crosshair, Gauge,
  LocateFixed, Rocket, HeartPulse, Link2, Umbrella, CircleDot, Sun, Orbit, Bomb,
  Grab, Activity, Truck, Mountain, Boxes, Waves, ThermometerSnowflake, Ghost, Tornado,
  MoveRight, Skull, ShieldCheck, Reply, HeartHandshake, ShieldHalf, FastForward, Share2,
  CloudLightning, Flag, BookOpenCheck, Trash2,
} from "lucide-react";
import { heroById, ITEMS, ITEM_CATEGORIES, type ItemCategory } from "@/game/data";
import { audio } from "@/game/audio";
import { portrait } from "@/game/visuals";
import type { GameEngine, HudSnapshot, MatchResult, QuizSource, Difficulty } from "@/game/engine";
import { FALLBACK_QUESTIONS } from "@/game/data";

const SKILL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield, Hammer, Magnet, Castle, Wind, Zap, RefreshCw, Crosshair, Gauge, LocateFixed, Rocket,
  HeartPulse, Link: Link2, Umbrella, Sparkles, CircleDot, Sun, Orbit, Bomb, Grab, Activity,
  Truck, Mountain, Snowflake, Boxes, Waves, ThermometerSnowflake, Ghost, Tornado, MoveRight,
  Skull, ShieldCheck, Reply, HeartHandshake, ShieldHalf, FastForward, Share2, CloudLightning,
};
const ITEM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sword: Swords, Crosshair, Target: Crosshair, Zap, Shield, ShieldCheck, ShieldHalf, BrickWall: Shield,
  Footprints: Wind, Rocket, Gauge, Gem, Orbit, HeartPulse, Package: ShoppingBag, Cpu: Zap,
};

interface FloatText { id: number; x: number; y: number; text: string; color: string }
interface Announce { id: number; text: string; kind: "info" | "good" | "bad" | "omega" }
interface QuizState { source: QuizSource }
interface QuizQuestion { id: number; materi: string; pertanyaan: string; options: string[]; difficulty: string }

const MAX_FLOATS = 18;

function BattleInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const heroId = searchParams.get("hero") ?? "blaze";
  const difficulty = (["easy", "normal", "hard"].includes(searchParams.get("diff") ?? "") ? searchParams.get("diff") : "normal") as Difficulty;
  const hero = heroById(heroId);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const submittedRef = useRef(false);
  const floatId = useRef(0);
  const announceId = useRef(0);
  const feedId = useRef(0);

  const [snap, setSnap] = useState<HudSnapshot | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopTab, setShopTab] = useState<ItemCategory>("attack");
  const [shopMsg, setShopMsg] = useState<string | null>(null);
  const [scoreboard, setScoreboard] = useState(false);
  const [escOpen, setEscOpen] = useState(false);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [announce, setAnnounce] = useState<Announce | null>(null);
  const [killfeed, setKillfeed] = useState<{ id: number; text: string }[]>([]);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [shopGold, setShopGold] = useState(0);

  // quiz state
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [reveal, setReveal] = useState<{ correct: boolean; correctAnswer: string; pembahasan: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [quizLoading, setQuizLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  // settings
  const [volume, setVolume] = useState({ master: 0.8, music: 0.55, sfx: 0.9 });
  const [muted, setMuted] = useState(false);
  const [autoAttack, setAutoAttack] = useState(true);

  // touch joystick
  const [joy, setJoy] = useState<{ active: boolean; baseX: number; baseY: number; dx: number; dy: number }>({ active: false, baseX: 0, baseY: 0, dx: 0, dy: 0 });
  const joyTouchId = useRef<number | null>(null);
  const joyOrigin = useRef({ x: 0, y: 0 });
  const [isTouch, setIsTouch] = useState(false);

  const addFloat = useCallback((x: number, y: number, text: string, color: string) => {
    const id = ++floatId.current;
    setFloats((f) => [...f.slice(-(MAX_FLOATS - 1)), { id, x, y, text, color }]);
    window.setTimeout(() => setFloats((f) => f.filter((fl) => fl.id !== id)), 1250);
  }, []);

  const pushAnnounce = useCallback((text: string, kind: Announce["kind"]) => {
    const id = ++announceId.current;
    setAnnounce({ id, text, kind });
    window.setTimeout(() => setAnnounce((a) => (a?.id === id ? null : a)), 2600);
  }, []);

  const pushFeed = useCallback((text: string) => {
    const id = ++feedId.current;
    setKillfeed((f) => [...f.slice(-3), { id, text }]);
    window.setTimeout(() => setKillfeed((f) => f.filter((x) => x.id !== id)), 4200);
  }, []);

  const openQuiz = useCallback((source: QuizSource) => {
    setQuiz({ source });
    setQuestion(null);
    setPicked(null);
    setReveal(null);
    setTimeLeft(15);
    setQuizLoading(true);
    fetch("/api/quiz/question")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setQuestion({ id: d.id, materi: d.materi, pertanyaan: d.pertanyaan, options: d.options, difficulty: d.difficulty });
        setUsingFallback(false);
        setQuizLoading(false);
      })
      .catch(() => {
        const fb = FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
        const opts = [fb.optionA, fb.optionB, fb.optionC, fb.optionD];
        for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
        setQuestion({ id: fb.id, materi: fb.materi, pertanyaan: fb.pertanyaan, options: opts, difficulty: fb.difficulty });
        setUsingFallback(true);
        setQuizLoading(false);
      });
  }, []);

  // ─── Engine boot ───
  useEffect(() => {
    if (!canvasRef.current) return;
    let disposed = false;
    let engine: GameEngine | null = null;
    const quality = (localStorage.getItem("rl_quality") as "low" | "medium" | "high") || "medium";
    const aa = localStorage.getItem("rl_auto_attack") !== "0";
    setAutoAttack(aa);
    setVolume({
      master: Number(localStorage.getItem("rl_vol_master") ?? 0.8),
      music: Number(localStorage.getItem("rl_vol_music") ?? 0.55),
      sfx: Number(localStorage.getItem("rl_vol_sfx") ?? 0.9),
    });
    setMuted(localStorage.getItem("rl_muted") === "1");
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);

    import("@/game/engine").then(({ GameEngine }) => {
      if (disposed || !canvasRef.current) return;
      engine = new GameEngine(canvasRef.current, { heroId, difficulty, quality, playerName: localStorage.getItem("rl_player_name") || "RoboLearner", autoAttack: aa }, {
        onSnapshot: (s) => setSnap(s),
        onQuiz: (source) => openQuiz(source),
        onFloat: (x, y, text, color) => addFloat(x, y, text, color),
        onAnnounce: (text, kind) => pushAnnounce(text, kind),
        onKillFeed: (text) => pushFeed(text),
        onMatchEnd: (r) => {
          setResult(r);
          if (!submittedRef.current) {
            submittedRef.current = true;
            fetch("/api/matches", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...r, result: r.victory ? "victory" : "defeat", playerName: localStorage.getItem("rl_player_name") || "RoboLearner" }),
            })
              .then((res) => res.ok ? setSavedNote("Hasil pertandingan tersimpan ke laporan guru ✓") : setSavedNote("Gagal menyimpan hasil (offline?)"))
              .catch(() => setSavedNote("Gagal menyimpan hasil (offline?)"));
          }
        },
      });
      engineRef.current = engine;
    });

    return () => {
      disposed = true;
      engine?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroId, difficulty]);

  // minimap refresh
  useEffect(() => {
    const t = window.setInterval(() => {
      if (minimapRef.current && engineRef.current) engineRef.current.renderMinimap(minimapRef.current);
    }, 400);
    return () => window.clearInterval(t);
  }, []);

  // quiz countdown
  useEffect(() => {
    if (!quiz || reveal || quizLoading) return;
    if (timeLeft <= 0) {
      // timeout
      setReveal({ correct: false, correctAnswer: "—", pembahasan: "Waktu habis! Pertanyaan tidak terjawab dan tidak memberikan bonus." });
      engineRef.current?.resolveQuiz("timeout");
      return;
    }
    const t = window.setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(t);
  }, [quiz, reveal, quizLoading, timeLeft]);

  // keyboard: Tab scoreboard, Esc menu
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Tab") { e.preventDefault(); setScoreboard(true); }
      else if (e.key === "Escape") {
        setEscOpen((v) => {
          const next = !v;
          engineRef.current?.setPaused(next || !!quiz);
          return next;
        });
      } else if (e.key.toLowerCase() === "b") setShopOpen((v) => v); // handled by engine
    };
    const up = (e: KeyboardEvent) => { if (e.key === "Tab") setScoreboard(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [quiz]);

  const answerQuiz = (choiceIdx: number) => {
    if (!question || picked !== null || reveal) return;
    const chosen = question.options[choiceIdx];
    setPicked(choiceIdx);
    const fb = FALLBACK_QUESTIONS.find((f) => f.id === question.id);
    if (usingFallback && fb) {
      const correctText = [fb.optionA, fb.optionB, fb.optionC, fb.optionD][["A", "B", "C", "D"].indexOf(fb.kunci)];
      const correct = chosen === correctText;
      if (correct) audio.correct(); else audio.wrong();
      setReveal({ correct, correctAnswer: correctText, pembahasan: fb.pembahasan });
      engineRef.current?.resolveQuiz(correct ? "correct" : "wrong");
      return;
    }
    fetch("/api/quiz/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, chosen }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.correct) audio.correct(); else audio.wrong();
        setReveal({ correct: !!d.correct, correctAnswer: d.correctAnswer ?? "", pembahasan: d.pembahasan ?? "" });
        engineRef.current?.resolveQuiz(d.correct ? "correct" : "wrong");
      })
      .catch(() => {
        setReveal({ correct: false, correctAnswer: "", pembahasan: "Gagal memvalidasi jawaban (offline). Tidak ada bonus." });
        engineRef.current?.resolveQuiz("wrong");
      });
  };

  const buyItem = (id: string) => {
    const r = engineRef.current?.buyItem(id);
    if (r) { setShopMsg(r.msg); window.setTimeout(() => setShopMsg(null), 1800); }
  };
  const sellItem = (idx: number) => {
    const r = engineRef.current?.sellItem(idx);
    if (r) { setShopMsg(r.msg); window.setTimeout(() => setShopMsg(null), 1800); }
  };

  // ─── touch joystick handlers ───
  const joyStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    joyTouchId.current = t.identifier;
    joyOrigin.current = { x: t.clientX, y: t.clientY };
    setJoy({ active: true, baseX: t.clientX, baseY: t.clientY, dx: 0, dy: 0 });
  };
  const joyMove = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier !== joyTouchId.current) continue;
      let dx = (t.clientX - joyOrigin.current.x) / 52;
      let dy = (t.clientY - joyOrigin.current.y) / 52;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      setJoy((j) => ({ ...j, dx, dy }));
      engineRef.current?.setMoveVector(dx, dy);
    }
  };
  const joyEnd = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === joyTouchId.current) {
        joyTouchId.current = null;
        setJoy((j) => ({ ...j, active: false, dx: 0, dy: 0 }));
        engineRef.current?.clearMoveVector();
      }
    }
  };

  const time = snap ? `${String(Math.floor(snap.time / 60)).padStart(2, "0")}:${String(Math.floor(snap.time % 60)).padStart(2, "0")}` : "00:00";
  const formatK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.floor(n)}`);
  const accuracy = snap && snap.questionsCorrect + snap.questionsWrong > 0 ? Math.round((snap.questionsCorrect / (snap.questionsCorrect + snap.questionsWrong)) * 100) : 0;

  const announceColor = announce ? { info: "text-cyan-200 border-cyan-400/40", good: "text-emerald-200 border-emerald-400/40", bad: "text-rose-200 border-rose-400/40", omega: "text-orange-200 border-orange-400/50" }[announce.kind] : "";

  return (
    <main className="relative h-screen w-full overflow-hidden bg-black select-none">
      <canvas ref={canvasRef} className="game-canvas absolute inset-0" />

      <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-[2] overflow-hidden">{snap?.labels.map(label=><div key={label.uid} className="absolute -translate-x-1/2 -translate-y-full" style={{left:`${label.x}%`,top:`${label.y}%`,minWidth:label.player?74:58,opacity:label.player?1:.88,transition:'left .12s linear, top .12s linear'}}>
        <div className="flex items-center gap-1 justify-center text-[10px] leading-tight tracking-widest text-white" style={{fontFamily:'Barlow Condensed',textShadow:'0 1px 3px #000,0 0 5px #000'}}>{label.player?'◆ ':''}{label.name} <span className="text-[8px] opacity-80">LV.{label.level}</span></div>
        <div className="h-[4px] bg-black/75 rounded-sm border border-white/25 overflow-hidden"><div style={{width:`${Math.max(0,Math.min(100,label.hp*100))}%`,height:'100%',background:label.team==='titan'?'#ff6a72':label.player?'#9ce7a5':'#68d2fa'}}/></div>
      </div>)}</div>
      {/* floating damage text */}
      {floats.map((f) => (
        <div key={f.id} className="float-text absolute z-10 pointer-events-none font-display text-sm font-bold" style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, color: f.color, textShadow: "0 0 6px #000" }}>{f.text}</div>
      ))}

      {/* ─── TOP HUD ─── */}
      <div className="absolute top-2 left-2 z-20 flex flex-col gap-1.5">
        <canvas ref={minimapRef} width={176} height={116} className="hud-chip border" style={{ width: 148, height: 98, imageRendering: "pixelated" }} />
        <div className="hud-chip px-2 py-1 text-[9px] font-display text-slate-400 tracking-widest">MAP // SECTOR-7</div>
      </div>

      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-3">
        <div className="hud-chip px-3 sm:px-5 py-1.5 text-center">
          <div className="text-[8px] font-display text-cyan-400 tracking-[0.3em]">CYBER</div>
          <div className="font-display text-xl sm:text-2xl font-bold text-cyan-300">{snap?.teamCyber ?? 0}</div>
        </div>
        <div className="panel px-3 sm:px-6 py-1.5 text-center">
          <div className="font-display text-lg sm:text-2xl font-bold text-white tabular-nums">{time}</div>
          <div className="text-[8px] font-display text-slate-500 tracking-widest -mt-0.5">FIRST TO DESTROY THE CORE</div>
        </div>
        <div className="hud-chip px-3 sm:px-5 py-1.5 text-center" style={{ borderColor: "rgba(255,81,64,.4)" }}>
          <div className="text-[8px] font-display text-rose-400 tracking-[0.3em]">TITAN</div>
          <div className="font-display text-xl sm:text-2xl font-bold text-rose-400">{snap?.teamTitan ?? 0}</div>
        </div>
      </div>

      <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <div className="hud-chip flex items-center gap-2 px-3 py-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-display text-sm text-amber-200">{snap?.gold ?? 0}</span>
          </div>
          <button className="hud-chip p-2 text-cyan-300 hover:text-white" onClick={() => { const m = !muted; setMuted(m); localStorage.setItem("rl_muted", m ? "1" : "0"); audio.setVolumes({ muted: m }); }} aria-label="mute">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button className="hud-chip p-2 text-cyan-300 hover:text-white" onClick={() => { setEscOpen(true); engineRef.current?.setPaused(true); }} aria-label="pause">
            <Pause className="w-4 h-4" />
          </button>
        </div>
        <div className="hud-chip px-2 py-1 text-[9px] font-display text-slate-400">TURRET <span className="text-cyan-300">{snap?.turretsCyber ?? 0}</span> : <span className="text-rose-400">{snap?.turretsTitan ?? 0}</span></div>
        {/* kill feed */}
        {killfeed.map((k) => (
          <div key={k.id} className="hud-chip px-2 py-1 text-[10px] text-amber-100/90">{k.text}</div>
        ))}
        {snap?.omegaBuff && <div className="hud-chip px-2 py-1 text-[10px] font-display text-orange-300 border-orange-400/50">⚡ OMEGA PROTOCOL</div>}
      </div>

      {/* announce banner */}
      {announce && (
        <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-20">
          <div key={announce.id} className={`announce font-display text-xs sm:text-sm tracking-[0.2em] border px-5 py-1.5 bg-black/60 backdrop-blur-sm ${announceColor}`}>{announce.text}</div>
        </div>
      )}

      {/* ─── BOTTOM HUD ─── */}
      {/* portrait cluster */}
      <div className="absolute bottom-3 left-2 sm:left-4 z-20 flex items-end gap-2">
        <div className="relative">
          <div className="w-16 h-16 sm:w-[74px] sm:h-[74px] border border-cyan-400/50 bg-gradient-to-br from-[#17294d] to-[#090f24] flex items-center justify-center" style={{ clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)" }}>
            <img src={portrait(hero.id)} alt={hero.name} className="w-full h-full object-cover" style={{ objectPosition: "50% 15%" }} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#0a1128] border border-amber-400 flex items-center justify-center font-display text-[11px] text-amber-300">{snap?.level ?? 1}</div>
        </div>
        <div className="flex flex-col gap-1 w-40 sm:w-56">
          <div className="text-[9px] font-display tracking-widest text-slate-400">{hero.name} · <span className="text-cyan-400">{hero.role.toUpperCase()}</span></div>
          <div className="relative h-3.5 bar-shell w-full">
            <div className="bar-fill bar-hp" style={{ width: `${snap ? (snap.hp / snap.maxHp) * 100 : 100}%` }} />
            {snap && snap.shield > 0 && <div className="absolute inset-y-0 left-0 bar-fill bar-shield opacity-70" style={{ width: `${Math.min(100, (snap.shield / snap.maxHp) * 100)}%` }} />}
            <div className="absolute inset-0 flex items-center justify-center text-[8px] font-display text-white/90">{snap?.hp}{snap && snap.shield > 0 ? ` +${snap.shield}` : ""}</div>
          </div>
          <div className="relative h-2 bar-shell w-full">
            <div className="bar-fill bar-energy" style={{ width: `${snap ? (snap.energy / snap.maxEnergy) * 100 : 100}%` }} />
          </div>
          <div className="relative h-1.5 bar-shell w-full">
            <div className="bar-fill bar-xp" style={{ width: `${snap ? Math.min(100, (snap.xp / snap.xpNext) * 100) : 0}%` }} />
          </div>
          <div className="text-[9px] text-slate-500 font-display">KDA <span className="text-slate-200">{snap?.kills}/{snap?.deaths}/{snap?.assists}</span> · DMG <span className="text-slate-200">{formatK(snap?.damageDealt ?? 0)}</span></div>
        </div>
      </div>

      {/* skill cluster */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-end gap-2 sm:gap-3">
        {/* recall / flicker */}
        <div className="flex flex-col gap-1.5">
          <button className="skill-btn !w-11 !h-11" onClick={() => engineRef.current?.recall()} title="Recall (B)">
            <RotateCcw className="w-5 h-5" /><span className="keyhint">B</span>
            {snap && snap.recall > 0 && <div className="cd-veil" style={{ ['--cd' as string]: `${(1 - snap.recall) * 100}%` }}></div>}
          </button>
          <button className="skill-btn !w-11 !h-11" onClick={() => engineRef.current?.flicker()} title="Flicker (V)">
            <Wind className="w-5 h-5" /><span className="keyhint">V</span>
            {snap && snap.flickerCd > 0 && <div className="cd-veil" style={{ ['--cd' as string]: `${(snap.flickerCd / 26) * 100}%` }}>{Math.ceil(snap.flickerCd)}</div>}
          </button>
        </div>
        {/* Q E R F */}
        {snap?.skills.map((s) => {
          const Icon = SKILL_ICONS[s.icon] ?? Zap;
          const cdPct = s.cd > 0 ? (s.remain / s.cd) * 100 : 0;
          const canUpgrade = (snap?.skillPoints ?? 0) > 0 && (s.key === "F" ? (snap?.level ?? 1) >= 4 && s.rank < 1 : s.rank < s.maxRank);
          return (
            <div key={s.key} className="relative">
              <button
                className={`skill-btn ${s.key === "F" ? "ult" : ""} ${s.locked ? "locked" : ""} ${s.key === "F" && snap.ultimateReady ? "ready-glow" : ""}`}
                onClick={() => engineRef.current?.castSkill(s.key as "Q" | "E" | "R" | "F")}
                title={s.name}
              >
                <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                <span className="keyhint">{s.key}</span>
                {s.remain > 0 && !s.locked && <div className="cd-veil" style={{ ['--cd' as string]: `${cdPct}%` }}>{s.remain.toFixed(s.remain < 2 ? 1 : 0)}</div>}
                {s.locked && <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050a16cc]"><span className="font-display text-[9px] text-slate-500">LV4</span></div>}
                <div className="rank-pips">{Array.from({ length: s.maxRank }).map((_, i) => <i key={i} className={i < s.rank ? "on" : ""} />)}</div>
              </button>
              {canUpgrade && <button className="upgrade-dot" onClick={() => engineRef.current?.upgradeSkill(s.key as "Q" | "E" | "R" | "F")}>+</button>}
            </div>
          );
        })}
        {/* basic attack */}
        <button className="skill-btn !w-[72px] !h-[72px] sm:!w-20 sm:!h-20 !border-amber-400/60" style={{ background: "radial-gradient(circle at 50% 40%, #3a2b07, #1a1204 78%)" }} onClick={() => engineRef.current?.basicAttack()} title="Basic Attack (Space)">
          <Swords className="w-8 h-8 sm:w-9 sm:h-9 text-amber-300" />
          <span className="keyhint">SPACE</span>
        </button>
      </div>

      {/* gold + shop + items */}
      <div className="absolute bottom-3 right-2 sm:right-4 z-20 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <button className="hud-chip p-2 text-amber-300 hover:text-white" onClick={() => setShopOpen(true)} title="Item Shop (B)">
            <Store className="w-5 h-5" />
          </button>
          <div className="hud-chip px-3 py-1.5 text-right">
            <div className="text-[8px] font-display text-slate-500 tracking-widest">GOLD</div>
            <div className="font-display text-base text-amber-300 leading-none">{snap?.gold ?? 0}</div>
          </div>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 6 }).map((_, i) => {
            const item = snap?.items[i];
            const Icon = item ? ITEM_ICONS[item.icon] ?? ShoppingBag : null;
            return (
              <button key={i} className="w-10 h-10 sm:w-11 sm:h-11 hud-chip flex items-center justify-center text-cyan-200" onClick={() => item && sellItem(i)} title={item ? `${item.name} — klik untuk jual (70%)` : "Slot kosong"}>
                {Icon ? <Icon className="w-5 h-5" /> : <span className="text-[10px] text-slate-600 font-display">{i + 1}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* respawn overlay */}
      {snap && !snap.alive && !result && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#20040866] backdrop-blur-[1px]">
          <div className="text-center">
            <div className="font-display text-rose-400 text-sm tracking-[0.4em]">ROBOT HANCUR</div>
            <div className="font-display text-6xl font-black text-white mt-2">{Math.ceil(snap.respawnIn)}</div>
            <div className="text-slate-400 text-sm">Respawn di base CYBER…</div>
          </div>
        </div>
      )}

      {/* recall progress */}
      {snap && snap.recall > 0 && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 w-56">
          <div className="text-center text-[10px] font-display text-fuchsia-300 tracking-widest mb-1">RECALL…</div>
          <div className="h-2 bar-shell"><div className="bar-fill" style={{ width: `${snap.recall * 100}%`, background: "linear-gradient(90deg,#a21caf,#e879f9)" }} /></div>
        </div>
      )}

      {/* ─── touch joystick ─── */}
      {isTouch && (
        <div className="absolute left-0 bottom-0 top-1/3 w-1/2 z-10 touch-none" onTouchStart={joyStart} onTouchMove={joyMove} onTouchEnd={joyEnd} onTouchCancel={joyEnd}>
          {joy.active && (
            <>
              <div className="absolute w-24 h-24 rounded-full border-2 border-cyan-400/50 bg-cyan-400/10" style={{ left: joy.baseX - 48, top: joy.baseY - 48 }} />
              <div className="absolute w-11 h-11 rounded-full bg-cyan-400/70 border border-cyan-200" style={{ left: joy.baseX + joy.dx * 34 - 22, top: joy.baseY + joy.dy * 34 - 22 }} />
            </>
          )}
        </div>
      )}

      {/* ─── SHOP PANEL ─── */}
      {shopOpen && (
        <div className="absolute right-0 top-0 bottom-0 z-30 w-full sm:w-[440px] panel flex flex-col border-l">
          <div className="flex items-center justify-between p-4 border-b border-cyan-400/20">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-400" />
              <span className="font-display text-amber-300 tracking-[0.25em]">ITEM SHOP</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hud-chip px-3 py-1 flex items-center gap-2"><Coins className="w-4 h-4 text-amber-400" /><span className="font-display text-amber-200">{snap?.gold ?? 0}</span></div>
              <button onClick={() => setShopOpen(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
          </div>
          {shopMsg && <div className="mx-4 mt-2 text-center text-[11px] font-display text-cyan-300 border border-cyan-400/30 bg-cyan-400/5 py-1">{shopMsg}</div>}
          <div className="flex gap-1 px-4 pt-3">
            {ITEM_CATEGORIES.map((c) => {
              const Icon = ITEM_ICONS[c.icon] ?? ShoppingBag;
              return (
                <button key={c.id} onClick={() => setShopTab(c.id)} className={`flex-1 flex flex-col items-center py-2 border font-display text-[9px] tracking-widest transition-colors ${shopTab === c.id ? "border-amber-400/60 text-amber-300 bg-amber-400/10" : "border-cyan-400/20 text-slate-400 hover:text-white"}`}>
                  <Icon className="w-4 h-4 mb-1" />{c.label}
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto nice-scroll p-4 flex flex-col gap-2">
            {ITEMS.filter((i) => i.cat === shopTab).map((item) => {
              const owned = snap?.items.some((i) => i.id === item.id);
              const Icon = ITEM_ICONS[item.icon] ?? ShoppingBag;
              const afford = (snap?.gold ?? 0) >= item.price;
              return (
                <div key={item.id} className="panel-soft flex items-center gap-3 p-3">
                  <div className="w-12 h-12 shrink-0 flex items-center justify-center border border-cyan-400/40 bg-cyan-400/5 text-cyan-300" style={{ clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[12px] text-white">{item.name}</div>
                    <div className="text-[10px] text-slate-400 leading-tight">{item.desc}</div>
                  </div>
                  <button onClick={() => buyItem(item.id)} disabled={owned || !afford}
                    className={`shrink-0 px-3 py-2 font-display text-[11px] border ${owned ? "border-emerald-400/50 text-emerald-400 cursor-default" : afford ? "border-amber-400/60 text-amber-300 hover:bg-amber-400/10" : "border-slate-700 text-slate-600 cursor-not-allowed"}`}>
                    {owned ? "OWNED" : `${item.price}g`}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="p-3 text-[10px] text-slate-500 border-t border-cyan-400/10">Klik item di slot inventory (kanan bawah) untuk menjual kembali dengan refund 70%. Item unik — tidak bisa duplikat.</div>
        </div>
      )}

      {/* ─── SCOREBOARD (Tab) ─── */}
      {scoreboard && snap && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setScoreboard(false)}>
          <div className="panel p-5 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="font-display text-center text-cyan-300 tracking-[0.4em] text-sm mb-3">SCOREBOARD — TIM CYBER vs TITAN</div>
            <div className="grid grid-cols-2 gap-4">
              {snap.scoreboard.map((team) => (
                <div key={team.team}>
                  <div className={`font-display text-[11px] tracking-widest mb-1.5 ${team.team === "cyber" ? "text-cyan-400" : "text-rose-400"}`}>{team.team === "cyber" ? "▍ TIM CYBER (KAMU)" : "▍ TIM TITAN"}</div>
                  <div className="flex flex-col gap-1">
                    {team.members.map((m, i) => (
                      <div key={i} className={`flex items-center gap-2 text-[11px] px-2 py-1 ${m.isPlayer ? "bg-cyan-400/10 border border-cyan-400/30" : ""} ${!m.alive ? "opacity-45" : ""}`}>
                        <span className={`w-2 h-2 rounded-full ${m.alive ? "bg-emerald-400" : "bg-rose-500"}`} />
                        <span className="text-slate-200 w-20 truncate">{m.name}</span>
                        <span className="text-slate-500 font-display text-[9px] w-6">Lv{m.level}</span>
                        <span className="ml-auto font-display text-slate-300">{m.k}/{m.d}/{m.a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center text-[9px] text-slate-500 font-display mt-3">LEPAS TAB UNTUK MENUTUP</div>
          </div>
        </div>
      )}

      {/* ─── ESC / PAUSE MENU ─── */}
      {escOpen && !result && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="panel p-6 w-full max-w-md">
            <div className="font-display text-white text-xl font-bold tracking-widest mb-4 flex items-center gap-3"><Pause className="text-cyan-400" /> PAUSED</div>
            <div className="flex flex-col gap-3">
              {([
                ["Master Volume", "master", volume.master],
                ["Musik", "music", volume.music],
                ["Efek Suara", "sfx", volume.sfx],
              ] as const).map(([label, key, val]) => (
                <label key={key} className="text-[11px] font-display text-slate-300 tracking-wider">
                  <div className="flex justify-between mb-1"><span>{label}</span><span className="text-cyan-400">{Math.round(val * 100)}%</span></div>
                  <input type="range" min={0} max={100} value={Math.round(val * 100)} className="w-full accent-cyan-400" onChange={(e) => {
                    const v = Number(e.target.value) / 100;
                    const nv = { ...volume, [key]: v };
                    setVolume(nv);
                    audio.setVolumes({ master: nv.master, music: nv.music, sfx: nv.sfx });
                  }} />
                </label>
              ))}
              <label className="flex items-center justify-between text-[11px] font-display text-slate-300 tracking-wider border border-cyan-400/20 px-3 py-2">
                AUTO ATTACK
                <button onClick={() => { const v = !autoAttack; setAutoAttack(v); localStorage.setItem("rl_auto_attack", v ? "1" : "0"); engineRef.current?.setAutoAttack(v); }} className={`w-12 h-6 border transition-colors ${autoAttack ? "border-emerald-400 bg-emerald-500/30" : "border-slate-600"}`}>
                  <div className={`w-5 h-5 mt-[1px] transition-all ${autoAttack ? "ml-6 bg-emerald-400" : "ml-0.5 bg-slate-500"}`} />
                </button>
              </label>
              <div className="text-[9px] text-slate-500">Kualitas grafis diatur di Settings (berlaku saat battle dimulai).</div>
              <div className="flex gap-2 mt-1">
                <button className="btn btn-cyber flex-1 py-2.5 text-xs" onClick={() => { setEscOpen(false); engineRef.current?.setPaused(!!quiz); }}><Play className="inline w-4 h-4 mr-1" />LANJUT</button>
                <Link href="/" className="btn btn-ghost flex-1 py-2.5 text-xs text-center"><Home className="inline w-4 h-4 mr-1" />MENU UTAMA</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── KNOWLEDGE BATTLE QUIZ ─── */}
      {quiz && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#02061755]">
          <div className="quiz-in panel holo-frame w-[min(680px,94vw)] p-5 sm:p-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="w-5 h-5 text-cyan-300" />
                <span className="font-display text-cyan-300 tracking-[0.3em] text-xs sm:text-sm">{quiz.source === "ultimate" ? "OVERDRIVE CHALLENGE — ULTIMATE" : quiz.source === "levelup" ? "KNOWLEDGE BATTLE — LEVEL UP" : "KNOWLEDGE BATTLE"}</span>
              </div>
              {!reveal && (
                <div className="flex items-center gap-2 hud-chip px-3 py-1">
                  <Timer className="w-4 h-4 text-amber-300" />
                  <span className={`font-display text-lg tabular-nums ${timeLeft <= 5 ? "text-rose-400" : "text-amber-200"}`}>{timeLeft}s</span>
                </div>
              )}
            </div>
            {/* timer bar */}
            {!reveal && <div className="h-1.5 w-full bg-slate-800 mb-3 overflow-hidden"><div className="h-full transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 15) * 100}%`, background: timeLeft <= 5 ? "#fb7185" : "linear-gradient(90deg,#f59e0b,#fde047)" }} /></div>}

            {quizLoading || !question ? (
              <div className="py-10 text-center text-cyan-400 font-display tracking-widest animate-pulse">MEMUAT SOAL IPAS…</div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-display tracking-widest text-fuchsia-300 border border-fuchsia-400/40 bg-fuchsia-500/10 px-2 py-0.5">{question.materi.toUpperCase()}</span>
                  <span className="text-[9px] font-display tracking-widest text-slate-500 uppercase">{question.difficulty}</span>
                  {usingFallback && <span className="text-[8px] font-display text-slate-600">BANK LOKAL</span>}
                </div>
                <p className="text-white text-base sm:text-lg font-semibold leading-snug mb-4">{question.pertanyaan}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {question.options.map((opt, i) => {
                    const letter = ["A", "B", "C", "D"][i];
                    const isPicked = picked === i;
                    const isCorrect = reveal?.correctAnswer === opt;
                    let cls = "border-cyan-400/30 hover:border-cyan-300 hover:bg-cyan-400/10 text-slate-100";
                    if (reveal) {
                      if (isCorrect) cls = "border-emerald-400 bg-emerald-500/15 text-emerald-200";
                      else if (isPicked) cls = "border-rose-400 bg-rose-500/15 text-rose-200";
                      else cls = "border-slate-700 text-slate-500";
                    }
                    return (
                      <button key={i} disabled={!!reveal} onClick={() => answerQuiz(i)}
                        className={`flex items-center gap-3 border px-3 py-3 text-left transition-all ${cls}`}>
                        <span className="w-8 h-8 shrink-0 flex items-center justify-center font-display border border-current/40 text-sm">{letter}</span>
                        <span className="text-sm leading-snug">{opt}</span>
                        {reveal && isCorrect && <CheckCircle2 className="w-5 h-5 ml-auto text-emerald-400" />}
                        {reveal && isPicked && !isCorrect && <XCircle className="w-5 h-5 ml-auto text-rose-400" />}
                      </button>
                    );
                  })}
                </div>
                {reveal && (
                  <div className="mt-3 border border-cyan-400/25 bg-cyan-400/5 p-3">
                    <div className={`font-display text-[11px] tracking-widest mb-1 ${reveal.correct ? "text-emerald-400" : "text-rose-400"}`}>
                      {reveal.correct ? "BENAR! +100 KNOWLEDGE XP · +150 GOLD · SHIELD & BUFF" : "BELUM TEPAT — PEMBAHASAN:"}
                    </div>
                    <p className="text-[12px] text-slate-300 leading-snug">{reveal.pembahasan}</p>
                    {reveal.correct && quiz.source === "ultimate" && <p className="text-[11px] text-amber-300 font-display mt-1">⚡ ULTIMATE DIPERKUAT +45%!</p>}
                    <button className="btn btn-cyber w-full mt-3 py-2.5 text-xs" onClick={() => { engineRef.current?.closeQuiz(); setQuiz(null); }}>LANJUTKAN PERTARUNGAN <ChevronRight className="inline w-4 h-4" /></button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── MATCH END ─── */}
      {result && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="panel max-w-2xl w-full p-6 sm:p-8 text-center max-h-full overflow-y-auto nice-scroll">
            <div className={`font-display font-black text-5xl sm:text-7xl tracking-wider ${result.victory ? "text-amber-300 victory-glow" : "text-rose-500 text-glow-red"}`}>{result.victory ? "VICTORY" : "DEFEAT"}</div>
            <div className="text-slate-400 font-display text-[10px] tracking-[0.4em] mt-1">{result.victory ? "INTI TITAN TELAH DIHANCURKAN" : "BASE CYBER TELAH JATUH"}</div>
            {result.mvp && (
              <div className="inline-flex items-center gap-2 mt-3 border border-amber-400/60 bg-amber-400/10 px-4 py-1.5 text-amber-300 font-display text-sm"><Crown className="w-5 h-5" /> MVP — KONTRIBUSI TERTINGGI <Crown className="w-5 h-5" /></div>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-5">
              {[
                ["KILL", result.kills, "text-rose-300"], ["DEATH", result.deaths, "text-slate-300"], ["ASSIST", result.assists, "text-cyan-300"],
                ["GOLD", result.goldEarned, "text-amber-300"], ["TURRET", result.turretsDestroyed, "text-orange-300"], ["DAMAGE", formatK(result.damageDealt), "text-fuchsia-300"],
              ].map(([label, value, cls]) => (
                <div key={label as string} className="panel-soft p-2.5">
                  <div className={`font-display text-xl sm:text-2xl font-bold ${cls}`}>{value as React.ReactNode}</div>
                  <div className="text-[8px] font-display text-slate-500 tracking-widest">{label as string}</div>
                </div>
              ))}
            </div>
            <div className="panel-soft p-3 mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-[12px]">
              <span className="text-slate-400">SOAL BENAR <span className="text-emerald-400 font-display">{result.questionsCorrect}</span></span>
              <span className="text-slate-400">SALAH <span className="text-rose-400 font-display">{result.questionsWrong}</span></span>
              <span className="text-slate-400">AKURASI <span className="text-cyan-300 font-display">{result.questionsCorrect + result.questionsWrong > 0 ? Math.round((result.questionsCorrect / (result.questionsCorrect + result.questionsWrong)) * 100) : 0}%</span></span>
              <span className="text-slate-400">KNOWLEDGE XP <span className="text-fuchsia-300 font-display">+{result.knowledgeXp}</span></span>
            </div>
            {savedNote && <div className="mt-2 text-[10px] font-display text-emerald-400/80">{savedNote}</div>}
            <div className="flex flex-wrap gap-2 justify-center mt-5">
              <button className="btn btn-gold px-6 py-3 text-sm" onClick={() => window.location.reload()}>MAIN LAGI</button>
              <Link href="/heroes" className="btn btn-cyber px-6 py-3 text-sm">GANTI HERO</Link>
              <Link href="/" className="btn btn-ghost px-6 py-3 text-sm">MENU UTAMA</Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function BattlePage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#050a16] flex items-center justify-center font-display text-cyan-400 tracking-widest">MEMUAT ARENA…</div>}>
      <BattleInner />
    </Suspense>
  );
}
