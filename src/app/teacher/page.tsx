"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  GraduationCap, ArrowLeft, LogOut, LayoutDashboard, BookOpenCheck, Users, FileBarChart,
  Plus, Pencil, Trash2, Upload, Download, Search, Loader2, Bot, X, CheckCircle2, AlertCircle, FileSpreadsheet,
} from "lucide-react";
import { MATERI_LIST } from "@/game/data";

interface SessionUser { username: string; role: string; displayName: string }
interface QRow {
  id: number; materi: string; pertanyaan: string; optionA: string; optionB: string; optionC: string; optionD: string;
  kunci: string; pembahasan: string; difficulty: string; demo: boolean;
}
interface Summary {
  totals: { matches: number; players: number; accuracy: number; knowledgeXp: number; victories: number; questions: number; classes: number; students: number };
  materi: { materi: string; count: number }[];
  recent: MatchRow[];
  topPlayers: { playerName: string; knowledgeXp: number; matches: number; wins: number; correct: number; answered: number }[];
}
interface MatchRow {
  id: number; playerName: string; heroName: string; result: string; kills: number; deaths: number; assists: number;
  questionsCorrect: number; questionsWrong: number; knowledgeXp: number; mvp: boolean; createdAt: string; difficulty: string;
}
interface ClassRow { id: number; name: string; createdAt: string; students: { id: number; nis: string; name: string }[] }

const EMPTY_FORM = { id: 0, materi: MATERI_LIST[0] as string, pertanyaan: "", optionA: "", optionB: "", optionC: "", optionD: "", kunci: "A", pembahasan: "", difficulty: "sedang" };

export default function TeacherDashboard() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [tab, setTab] = useState<"overview" | "soal" | "kelas" | "laporan">("overview");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [questions, setQuestions] = useState<QRow[]>([]);
  const [classList, setClassList] = useState<ClassRow[]>([]);
  const [recentMatches, setRecentMatches] = useState<MatchRow[]>([]);
  const [search, setSearch] = useState("");
  const [materiFilter, setMateriFilter] = useState("");
  const [diffFilter, setDiffFilter] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [classForm, setClassForm] = useState({ name: "", roster: "" });
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const p = useCallback((path: string, init?: RequestInit) => fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } }), []);

  const loadAll = useCallback(async () => {
    try {
      const [s, q, c, m] = await Promise.all([
        p("/api/teacher/summary").then((r) => r.json()),
        p("/api/questions").then((r) => r.json()),
        p("/api/classes").then((r) => r.json()),
        p("/api/matches").then((r) => r.json()),
      ]);
      if (s && !s.error) setSummary(s);
      if (q?.questions) setQuestions(q.questions);
      if (c?.classes) setClassList(c.classes);
      if (m?.matches) setRecentMatches(m.matches);
    } catch { /* ignore */ }
  }, [p]);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        setUser(d?.user?.role === "teacher" ? d.user : null);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  useEffect(() => { if (user) loadAll(); }, [user, loadAll]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true); setLoginError(null);
    try {
      const res = await p("/api/auth", { method: "POST", body: JSON.stringify(loginForm) });
      const d = await res.json();
      if (!res.ok) { setLoginError(d.error ?? "Login gagal"); return; }
      if (d.user?.role !== "teacher") { setLoginError("Akun ini bukan akun guru."); return; }
      setUser(d.user);
    } catch { setLoginError("Terjadi kesalahan jaringan"); } finally { setLoggingIn(false); }
  };

  const logout = async () => { await p("/api/auth", { method: "DELETE" }); setUser(null); };

  const saveQuestion = async () => {
    setSaving(true); setFormError(null);
    try {
      const isNew = form.id === 0;
      const res = await p(isNew ? "/api/questions" : `/api/questions/${form.id}`, {
        method: isNew ? "POST" : "PUT",
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { setFormError(d.error ?? "Gagal menyimpan"); return; }
      setFormOpen(false);
      setNotice(isNew ? "Soal ditambahkan ✓" : "Soal diperbarui ✓");
      window.setTimeout(() => setNotice(null), 2000);
      loadAll();
    } finally { setSaving(false); }
  };

  const deleteQuestion = async (id: number) => {
    if (!confirm("Hapus soal ini?")) return;
    await p(`/api/questions/${id}`, { method: "DELETE" });
    loadAll();
  };

  const doImport = async (file: File) => {
    setImporting(true); setImportMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/teacher/import", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) { setImportMsg(`✗ ${d.error}`); return; }
      setImportMsg(`✓ ${d.imported} soal diimpor${d.skipped ? `, ${d.skipped} baris dilewati` : ""}${d.errors?.length ? ` — contoh error: ${d.errors[0]}` : ""}`);
      loadAll();
    } catch { setImportMsg("✗ Gagal mengunggah file"); } finally { setImporting(false); }
  };

  const downloadTemplate = () => {
    const rows = [
      ["No", "Materi", "Pertanyaan", "A", "B", "C", "D", "Kunci", "Pembahasan"],
      [1, "Sistem Pencernaan Manusia", "Organ yang mengubah makanan menjadi bubur halus adalah…", "Usus halus", "Lambung", "Kerongkongan", "Hati", "B", "Lambung mencerna makanan dengan asam lambung dan enzim pepsin."],
      [2, "Sistem Tata Surya", "Planet terdekat dengan Matahari adalah…", "Venus", "Bumi", "Merkurius", "Mars", "C", "Urutan planet dari Matahari dimulai dari Merkurius."],
    ];
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-bank-soal-ipas6.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const createClass = async () => {
    const name = classForm.name.trim();
    if (!name) return;
    const students = classForm.roster.split("\n").map((line) => {
      const [nm, nis] = line.split(",");
      return { name: (nm ?? "").trim(), nis: (nis ?? "").trim() };
    }).filter((s) => s.name);
    const res = await p("/api/classes", { method: "POST", body: JSON.stringify({ name, students }) });
    if (res.ok) { setClassForm({ name: "", roster: "" }); setNotice("Kelas dibuat ✓"); window.setTimeout(() => setNotice(null), 2000); loadAll(); }
  };

  const deleteClass = async (id: number) => {
    if (!confirm("Hapus kelas beserta seluruh siswa?")) return;
    await fetch(`/api/classes?id=${id}`, { method: "DELETE" });
    loadAll();
  };

  const filtered = questions.filter((q) =>
    (!materiFilter || q.materi === materiFilter) &&
    (!diffFilter || q.difficulty === diffFilter) &&
    (!search || q.pertanyaan.toLowerCase().includes(search.toLowerCase()))
  );

  // ══════════ LOGIN SCREEN ══════════
  if (!authChecked) {
    return <main className="h-screen bg-[#050a16] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-cyan-400" /></main>;
  }
  if (!user) {
    return (
      <main className="min-h-screen bg-[#050a16] relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 20%, #132a52 0%, transparent 55%), radial-gradient(ellipse at 75% 80%, #241031 0%, transparent 55%), #050a16" }} />
        <form onSubmit={login} className="relative z-10 panel w-full max-w-md p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 flex items-center justify-center border border-amber-400/50 bg-amber-400/10" style={{ clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)" }}>
              <GraduationCap className="w-9 h-9 text-amber-300" />
            </div>
            <div>
              <div className="font-display text-[9px] tracking-[0.4em] text-amber-400">PANEL GURU</div>
              <h1 className="font-display text-2xl font-extrabold text-white leading-tight">TEACHER<br />DASHBOARD</h1>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-4">Kelola bank soal IPAS Kelas 6, kelas, siswa, dan laporan hasil belajar dari pertandingan Robot Legends.</p>
          <label className="block text-[10px] font-display tracking-widest text-slate-500 mb-1">USERNAME GURU</label>
          <input value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} autoComplete="username"
            className="w-full bg-[#0b1430] border border-cyan-400/25 focus:border-cyan-400 outline-none px-3 py-2.5 text-slate-100 mb-3" placeholder="guru@robotlegends.id" />
          <label className="block text-[10px] font-display tracking-widest text-slate-500 mb-1">PASSWORD</label>
          <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} autoComplete="current-password"
            className="w-full bg-[#0b1430] border border-cyan-400/25 focus:border-cyan-400 outline-none px-3 py-2.5 text-slate-100 mb-3" placeholder="••••••••" />
          {loginError && <div className="flex items-center gap-2 text-rose-400 text-xs mb-3 border border-rose-400/40 bg-rose-500/10 px-3 py-2"><AlertCircle className="w-4 h-4" />{loginError}</div>}
          <button type="submit" disabled={loggingIn} className="btn btn-gold w-full py-3 font-extrabold">{loggingIn ? "MEMVERIFIKASI…" : "MASUK DASHBOARD"}</button>
          <div className="mt-4 text-[10px] text-slate-500 border border-cyan-400/15 bg-cyan-400/5 p-2 leading-snug">
            <span className="font-display text-cyan-400">DEMO AKUN GURU:</span> guru@robotlegends.id · password <span className="text-amber-300">guru123</span>
          </div>
          <Link href="/" className="mt-3 flex items-center justify-center gap-2 text-[11px] font-display text-slate-500 hover:text-white"><ArrowLeft className="w-4 h-4" /> Kembali ke Menu</Link>
        </form>
      </main>
    );
  }

  // ══════════ DASHBOARD ══════════
  const TABS = [
    { id: "overview", label: "OVERVIEW", icon: LayoutDashboard },
    { id: "soal", label: "BANK SOAL", icon: BookOpenCheck },
    { id: "kelas", label: "KELAS & SISWA", icon: Users },
    { id: "laporan", label: "LAPORAN", icon: FileBarChart },
  ] as const;
  const accOf = (c: number, a: number) => (a > 0 ? Math.round((c / a) * 100) : 0);

  return (
    <main className="min-h-screen bg-[#050a16]">
      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-amber-400/20 bg-[#050a16ee] backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link href="/" className="text-slate-500 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <GraduationCap className="w-6 h-6 text-amber-400" />
          <div className="leading-tight">
            <div className="font-display text-[8px] tracking-[0.35em] text-amber-500">TEACHER DASHBOARD</div>
            <div className="font-display text-xs text-white">{user.displayName}</div>
          </div>
          <button onClick={logout} className="ml-auto flex items-center gap-2 text-[10px] font-display text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-400/40 px-3 py-1.5"><LogOut className="w-4 h-4" /> KELUAR</button>
        </div>
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 font-display text-[10px] tracking-widest border-b-2 transition-colors ${tab === t.id ? "border-amber-400 text-amber-300" : "border-transparent text-slate-500 hover:text-white"}`}>
              <t.icon className="w-4 h-4" /><span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </header>

      {notice && <div className="max-w-6xl mx-auto px-4 mt-3 flex items-center gap-2 text-emerald-400 text-xs border border-emerald-400/40 bg-emerald-500/10 px-3 py-2"><CheckCircle2 className="w-4 h-4" />{notice}</div>}

      <div className="max-w-6xl mx-auto px-4 py-5">
        {/* ══════════ OVERVIEW ══════════ */}
        {tab === "overview" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "MATCH DIMAINKAN", value: summary?.totals.matches ?? 0, cls: "text-cyan-300" },
                { label: "AKURASI RATA-RATA", value: `${summary?.totals.accuracy ?? 0}%`, cls: "text-emerald-300" },
                { label: "KNOWLEDGE XP TOTAL", value: (summary?.totals.knowledgeXp ?? 0).toLocaleString("id-ID"), cls: "text-fuchsia-300" },
                { label: "MENANG (TIM CYBER)", value: summary?.totals.victories ?? 0, cls: "text-amber-300" },
                { label: "SOAL DI BANK", value: summary?.totals.questions ?? 0, cls: "text-sky-300" },
                { label: "KELAS", value: summary?.totals.classes ?? 0, cls: "text-orange-300" },
                { label: "SISWA TERDAFTAR", value: summary?.totals.students ?? 0, cls: "text-teal-300" },
                { label: "PEMAIN UNIK", value: summary?.totals.players ?? 0, cls: "text-rose-300" },
              ].map((s) => (
                <div key={s.label} className="panel-soft p-4">
                  <div className={`font-display text-2xl ${s.cls}`}>{s.value}</div>
                  <div className="text-[8px] font-display text-slate-500 tracking-widest mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="panel-soft p-4">
                <div className="font-display text-[10px] tracking-[0.3em] text-slate-400 mb-3">DISTRIBUSI BANK SOAL PER MATERI</div>
                {(summary?.materi ?? []).map((m) => {
                  const max = Math.max(1, ...(summary?.materi ?? []).map((x) => x.count));
                  return (
                    <div key={m.materi} className="mb-2">
                      <div className="flex justify-between text-[11px] text-slate-300"><span>{m.materi}</span><span className="font-display text-cyan-400">{m.count} soal</span></div>
                      <div className="h-2 bg-slate-800 mt-0.5"><div className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500" style={{ width: `${(m.count / max) * 100}%` }} /></div>
                    </div>
                  );
                })}
                {(summary?.materi ?? []).length === 0 && <div className="text-slate-600 text-xs">Belum ada soal.</div>}
              </div>
              <div className="panel-soft p-4">
                <div className="font-display text-[10px] tracking-[0.3em] text-slate-400 mb-3">TOP KNOWLEDGE XP</div>
                {(summary?.topPlayers ?? []).map((tp, i) => (
                  <div key={tp.playerName} className="flex items-center gap-3 py-1.5 border-b border-slate-800/60 last:border-0">
                    <span className="font-display text-amber-400 w-6">#{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white truncate">{tp.playerName}</div>
                      <div className="text-[9px] text-slate-500 font-display">{tp.matches} match · {tp.wins} menang · akurasi {accOf(tp.correct, tp.answered)}%</div>
                    </div>
                    <span className="font-display text-fuchsia-300 text-sm">{tp.knowledgeXp} XP</span>
                  </div>
                ))}
                {(summary?.topPlayers ?? []).length === 0 && <div className="text-slate-600 text-xs">Belum ada pertandingan tersimpan.</div>}
              </div>
            </div>

            <div className="panel-soft p-4">
              <div className="font-display text-[10px] tracking-[0.3em] text-slate-400 mb-2">PERTANDINGAN TERBARU</div>
              <div className="overflow-x-auto nice-scroll">
                <table className="w-full text-[11px]">
                  <thead><tr className="text-slate-500 font-display text-[8px] tracking-widest"><th className="text-left py-1">PEMAIN</th><th className="text-left">HERO</th><th className="text-left">HASIL</th><th className="text-right">K/D/A</th><th className="text-right">SOAL B/S</th><th className="text-right">AKURASI</th><th className="text-right">K-XP</th><th className="text-right">MVP</th></tr></thead>
                  <tbody>
                    {(summary?.recent ?? []).map((m) => (
                      <tr key={m.id} className="border-t border-slate-800/60 text-slate-300">
                        <td className="py-1.5">{m.playerName}</td>
                        <td>{m.heroName}</td>
                        <td className={m.result === "victory" ? "text-emerald-400" : "text-rose-400"}>{m.result === "victory" ? "WIN" : "LOSE"}</td>
                        <td className="text-right font-display">{m.kills}/{m.deaths}/{m.assists}</td>
                        <td className="text-right font-display">{m.questionsCorrect}/{m.questionsWrong}</td>
                        <td className="text-right">{accOf(m.questionsCorrect, m.questionsCorrect + m.questionsWrong)}%</td>
                        <td className="text-right text-fuchsia-300 font-display">+{m.knowledgeXp}</td>
                        <td className="text-right">{m.mvp ? "👑" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(summary?.recent ?? []).length === 0 && <div className="text-slate-600 text-xs py-3 text-center">Belum ada data — mainkan 1 match untuk mengisi laporan.</div>}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ BANK SOAL ══════════ */}
        {tab === "soal" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-[#0b1430] border border-cyan-400/25 px-3 py-2 flex-1 min-w-48">
                <Search className="w-4 h-4 text-slate-500" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari pertanyaan…" className="bg-transparent outline-none w-full text-sm text-slate-100" />
              </div>
              <select value={materiFilter} onChange={(e) => setMateriFilter(e.target.value)} className="bg-[#0b1430] border border-cyan-400/25 text-sm px-3 py-2 text-slate-200 outline-none">
                <option value="">Semua Materi</option>
                {MATERI_LIST.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={diffFilter} onChange={(e) => setDiffFilter(e.target.value)} className="bg-[#0b1430] border border-cyan-400/25 text-sm px-3 py-2 text-slate-200 outline-none">
                <option value="">Semua Level</option>
                <option value="mudah">Mudah</option>
                <option value="sedang">Sedang</option>
                <option value="sulit">Sulit</option>
              </select>
              <button onClick={() => { setForm(EMPTY_FORM); setFormError(null); setFormOpen(true); }} className="btn btn-cyber text-[11px] px-4 py-2 flex items-center gap-1"><Plus className="w-4 h-4" /> TAMBAH</button>
              <button onClick={() => fileRef.current?.click()} className="btn btn-ghost text-[11px] px-4 py-2 flex items-center gap-1">{importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} IMPORT EXCEL</button>
              <button onClick={downloadTemplate} className="text-[10px] font-display text-slate-500 hover:text-cyan-300 flex items-center gap-1 underline underline-offset-2"><FileSpreadsheet className="w-4 h-4" /> Template CSV</button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ""; }} />
            </div>
            {importMsg && <div className={`text-xs border px-3 py-2 ${importMsg.startsWith("✓") ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10" : "border-rose-400/40 text-rose-300 bg-rose-500/10"}`}>{importMsg}</div>}
            <div className="text-[10px] font-display text-slate-500">{filtered.length} soal ditampilkan · Kunci jawaban TIDAK PERNAH dikirim ke client saat battle</div>
            <div className="flex flex-col gap-1 max-h-[62vh] overflow-y-auto nice-scroll">
              {filtered.map((q) => (
                <div key={q.id} className="panel-soft flex items-start gap-3 p-3">
                  <span className="font-display text-amber-400 text-xs w-8 pt-0.5">#{q.id}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <span className="text-[8px] font-display tracking-widest text-fuchsia-300 border border-fuchsia-400/30 px-1.5 py-0.5">{q.materi.toUpperCase()}</span>
                      <span className="text-[8px] font-display tracking-widest text-slate-500 border border-slate-800 px-1.5 py-0.5 uppercase">{q.difficulty}</span>
                      {q.demo && <span className="text-[8px] font-display tracking-widest text-sky-400 border border-sky-400/30 px-1.5 py-0.5">BANK DEMO</span>}
                      <span className="text-[8px] font-display tracking-widest text-emerald-400 border border-emerald-400/30 px-1.5 py-0.5">KUNCI: {q.kunci}</span>
                    </div>
                    <div className="text-sm text-slate-100 leading-snug">{q.pertanyaan}</div>
                    <div className="text-[9px] text-slate-500 mt-1">A. {q.optionA} · B. {q.optionB} · C. {q.optionC} · D. {q.optionD}</div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => { setForm({ id: q.id, materi: q.materi, pertanyaan: q.pertanyaan, optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD, kunci: q.kunci, pembahasan: q.pembahasan, difficulty: q.difficulty }); setFormError(null); setFormOpen(true); }} className="p-2 text-cyan-400 hover:text-white border border-transparent hover:border-cyan-400/40"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteQuestion(q.id)} className="p-2 text-rose-400 hover:text-white border border-transparent hover:border-rose-400/40"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div className="text-center text-slate-600 py-8">Tidak ada soal cocok.</div>}
            </div>
          </div>
        )}

        {/* ══════════ KELAS ══════════ */}
        {tab === "kelas" && (
          <div className="grid md:grid-cols-[380px_1fr] gap-4">
            <div className="panel-soft p-5 h-fit">
              <div className="font-display text-[10px] tracking-[0.3em] text-slate-400 mb-3">BUAT KELAS BARU</div>
              <input value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder="Nama kelas — mis. 6B — Anggrek"
                className="w-full bg-[#0b1430] border border-cyan-400/25 focus:border-cyan-400 outline-none px-3 py-2.5 text-slate-100 mb-2" />
              <textarea value={classForm.roster} onChange={(e) => setClassForm({ ...classForm, roster: e.target.value })} rows={8}
                placeholder={"Daftar siswa (satu per baris):\nAisyah Putri, 24001\nBima Sakti, 24002\nCitra Kirana, 24003"}
                className="w-full bg-[#0b1430] border border-cyan-400/25 focus:border-cyan-400 outline-none px-3 py-2.5 text-slate-100 text-sm font-mono mb-3" />
              <button onClick={createClass} className="btn btn-gold w-full py-2.5 text-xs font-bold"><Plus className="inline w-4 h-4 mr-1" />BUAT KELAS</button>
              <p className="text-[9px] text-slate-600 mt-2">Kelas dan roster tersimpan ke database. Nama siswa dipakai untuk laporan hasil belajar Robot Legends.</p>
            </div>
            <div className="flex flex-col gap-3">
              {classList.map((c) => (
                <div key={c.id} className="panel-soft p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-display text-white">{c.name} <span className="text-slate-500 text-xs">· {c.students.length} siswa</span></div>
                    <button onClick={() => deleteClass(c.id)} className="text-rose-400 hover:text-rose-300 p-1.5"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.students.map((s) => (
                      <span key={s.id} className="text-[10px] border border-cyan-400/20 text-slate-300 px-2 py-1">{s.name}{s.nis && <span className="text-slate-600"> · {s.nis}</span>}</span>
                    ))}
                    {c.students.length === 0 && <span className="text-[10px] text-slate-600">Belum ada siswa.</span>}
                  </div>
                </div>
              ))}
              {classList.length === 0 && <div className="text-center text-slate-600 py-10">Belum ada kelas. Buat kelas pertama di sebelah kiri.</div>}
            </div>
          </div>
        )}

        {/* ══════════ LAPORAN ══════════ */}
        {tab === "laporan" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-display text-[10px] tracking-[0.3em] text-slate-400">LAPORAN HASIL BELAJAR — {recentMatches.length} PERTANDINGAN TERAKHIR</div>
              <a href="/api/teacher/report" className="btn btn-cyber text-[11px] px-5 py-2 flex items-center gap-2"><Download className="w-4 h-4" /> DOWNLOAD CSV</a>
            </div>
            <div className="overflow-x-auto nice-scroll border border-cyan-400/15">
              <table className="w-full text-[11px] whitespace-nowrap">
                <thead className="bg-[#0b1430] text-slate-400 font-display text-[8px] tracking-widest">
                  <tr><th className="text-left px-3 py-2">TANGGAL</th><th className="text-left">PEMAIN</th><th className="text-left">HERO</th><th className="text-left">MODE</th><th className="text-left">HASIL</th><th className="text-right px-3">K/D/A</th><th className="text-right px-3">SOAL B/S</th><th className="text-right px-3">AKURASI</th><th className="text-right px-3">K-XP</th><th className="text-center px-3">MVP</th></tr>
                </thead>
                <tbody>
                  {recentMatches.map((m) => {
                    const acc = accOf(m.questionsCorrect, m.questionsCorrect + m.questionsWrong);
                    return (
                      <tr key={m.id} className="border-t border-slate-800/60 text-slate-300">
                        <td className="px-3 py-1.5 text-slate-500">{new Date(m.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</td>
                        <td>{m.playerName}</td>
                        <td>{m.heroName}</td>
                        <td className="uppercase text-slate-500">{m.difficulty}</td>
                        <td className={m.result === "victory" ? "text-emerald-400" : "text-rose-400"}>{m.result === "victory" ? "VICTORY" : "DEFEAT"}</td>
                        <td className="text-right px-3 font-display">{m.kills}/{m.deaths}/{m.assists}</td>
                        <td className="text-right px-3 font-display">{m.questionsCorrect}/{m.questionsWrong}</td>
                        <td className={`text-right px-3 font-display ${acc >= 70 ? "text-emerald-400" : acc >= 40 ? "text-amber-300" : "text-rose-400"}`}>{acc}%</td>
                        <td className="text-right px-3 font-display text-fuchsia-300">+{m.knowledgeXp}</td>
                        <td className="text-center px-3">{m.mvp ? "👑" : "—"}</td>
                      </tr>
                    );
                  })}
                  {recentMatches.length === 0 && <tr><td colSpan={10} className="text-center text-slate-600 py-8">Belum ada data pertandingan.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="text-[9px] text-slate-600">CSV dapat dibuka langsung di Microsoft Excel / Google Sheets. Kolom akurasi mencerminkan kemampuan menjawab IPAS per pertandingan.</p>
          </div>
        )}
      </div>

      {/* ══════════ FORM MODAL (Tambah/Edit Soal) ══════════ */}
      {formOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setFormOpen(false)}>
          <div className="panel w-full max-w-2xl max-h-[92vh] overflow-y-auto nice-scroll p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-display text-white">{form.id === 0 ? "TAMBAH SOAL" : `EDIT SOAL #${form.id}`}</div>
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <label className="text-[9px] font-display tracking-widest text-slate-500">MATERI / BAB</label>
            <select value={form.materi} onChange={(e) => setForm({ ...form, materi: e.target.value })} className="w-full bg-[#0b1430] border border-cyan-400/25 text-slate-100 px-3 py-2 mb-3 outline-none">
              {MATERI_LIST.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <label className="text-[9px] font-display tracking-widest text-slate-500">PERTANYAAN</label>
            <textarea value={form.pertanyaan} onChange={(e) => setForm({ ...form, pertanyaan: e.target.value })} rows={2} className="w-full bg-[#0b1430] border border-cyan-400/25 text-slate-100 px-3 py-2 mb-3 outline-none" />
            <div className="grid sm:grid-cols-2 gap-2 mb-3">
              {(["A", "B", "C", "D"] as const).map((L) => (
                <label key={L} className="block">
                  <span className="text-[9px] font-display tracking-widest text-slate-500">OPSI {L}</span>
                  <input value={form[`option${L}` as "optionA"]} onChange={(e) => setForm({ ...form, [`option${L}`]: e.target.value })} className="w-full bg-[#0b1430] border border-cyan-400/25 text-slate-100 px-3 py-2 outline-none" />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className="block">
                <span className="text-[9px] font-display tracking-widest text-slate-500">KUNCI JAWABAN</span>
                <select value={form.kunci} onChange={(e) => setForm({ ...form, kunci: e.target.value })} className="w-full bg-[#0b1430] border border-cyan-400/25 text-slate-100 px-3 py-2 outline-none">
                  {["A", "B", "C", "D"].map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[9px] font-display tracking-widest text-slate-500">TINGKAT KESULITAN</span>
                <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="w-full bg-[#0b1430] border border-cyan-400/25 text-slate-100 px-3 py-2 outline-none">
                  <option value="mudah">Mudah</option>
                  <option value="sedang">Sedang</option>
                  <option value="sulit">Sulit</option>
                </select>
              </label>
            </div>
            <label className="text-[9px] font-display tracking-widest text-slate-500">PEMBAHASAN</label>
            <textarea value={form.pembahasan} onChange={(e) => setForm({ ...form, pembahasan: e.target.value })} rows={2} className="w-full bg-[#0b1430] border border-cyan-400/25 text-slate-100 px-3 py-2 mb-4 outline-none" />
            {formError && <div className="flex items-center gap-2 text-rose-400 text-xs mb-3"><AlertCircle className="w-4 h-4" />{formError}</div>}
            <button onClick={saveQuestion} disabled={saving} className="btn btn-gold w-full py-3 font-bold text-xs">{saving ? "MENYIMPAN…" : "SIMPAN SOAL"}</button>
          </div>
        </div>
      )}
    </main>
  );
}
