"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, Swords, Shield, Footprints, Gem, HeartPulse, Coins } from "lucide-react";
import { ITEMS, ITEM_CATEGORIES, type ItemCategory } from "@/game/data";

const CAT_ICONS = { attack: Swords, defense: Shield, movement: Footprints, magic: Gem, support: HeartPulse } as const;

export default function InventoryPage() {
  const [tab, setTab] = useState<ItemCategory | "all">("all");
  const [selected, setSelected] = useState(ITEMS[0]);

  const filtered = tab === "all" ? ITEMS : ITEMS.filter((i) => i.cat === tab);

  return (
    <main className="min-h-screen bg-[#050a16] relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 20% 20%, #132a52 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, #241031 0%, transparent 55%), #050a16" }} />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <Link href="/" className="btn btn-ghost flex items-center gap-2 px-4 py-2 text-[11px]"><ArrowLeft className="w-4 h-4" /> MENU</Link>
          <h1 className="font-display text-2xl font-extrabold text-white flex items-center gap-3"><Package className="text-cyan-400" /> INVENTORY / ARMORY</h1>
          <div className="hud-chip px-3 py-1.5 text-[10px] font-display text-slate-400">17 ITEM · 5 KATEGORI</div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setTab("all")} className={`px-4 py-2 font-display text-[10px] tracking-widest border ${tab === "all" ? "border-amber-400/60 text-amber-300 bg-amber-400/10" : "border-cyan-400/20 text-slate-400"}`}>SEMUA</button>
          {ITEM_CATEGORIES.map((c) => {
            const Icon = CAT_ICONS[c.id];
            return (
              <button key={c.id} onClick={() => setTab(c.id)} className={`flex items-center gap-2 px-4 py-2 font-display text-[10px] tracking-widest border ${tab === c.id ? "border-amber-400/60 text-amber-300 bg-amber-400/10" : "border-cyan-400/20 text-slate-400 hover:text-white"}`}>
                <Icon className="w-4 h-4" />{c.label}
              </button>
            );
          })}
        </div>

        <div className="grid md:grid-cols-[1fr_340px] gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filtered.map((item) => (
              <button key={item.id} onMouseEnter={() => setSelected(item)} onClick={() => setSelected(item)}
                className={`hero-card p-3 flex flex-col items-center text-center gap-1.5 ${selected.id === item.id ? "selected" : ""}`}>
                <div className="w-12 h-12 flex items-center justify-center border border-cyan-400/30 bg-cyan-400/5 text-cyan-300" style={{ clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}>
                  {(() => { const Icon = CAT_ICONS[item.cat]; return <Icon className="w-6 h-6" />; })()}
                </div>
                <div className="font-display text-[10px] text-white leading-tight">{item.name}</div>
                <div className="flex items-center gap-1 text-[10px] text-amber-300 font-display"><Coins className="w-3 h-3" />{item.price}</div>
              </button>
            ))}
          </div>

          {/* detail panel */}
          <div className="panel p-6 flex flex-col">
            <div className="font-display text-[9px] tracking-[0.35em] text-cyan-500">DETAIL ITEM</div>
            <div className="mt-3 w-20 h-20 flex items-center justify-center border border-amber-400/50 bg-amber-400/10 text-amber-300" style={{ clipPath: "polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)" }}>
              {(() => { const Icon = CAT_ICONS[selected.cat]; return <Icon className="w-10 h-10" />; })()}
            </div>
            <h2 className="font-display text-2xl text-white mt-3">{selected.name}</h2>
            <div className="font-display text-[10px] tracking-widest text-fuchsia-300 uppercase">{selected.cat}</div>
            <div className="flex items-center gap-2 mt-2 text-amber-300 font-display text-lg"><Coins className="w-5 h-5" />{selected.price.toLocaleString("id-ID")} GOLD</div>
            <p className="text-slate-300 text-sm mt-3 leading-snug">{selected.desc}</p>
            <div className="mt-4 border border-cyan-400/15 bg-cyan-400/5 p-3 text-[10px] text-slate-400 leading-snug">
              <span className="font-display text-cyan-400 tracking-widest block mb-1">CARA MENDAPATKAN</span>
              Beli di dalam battle melalui tombol <span className="text-amber-300">SHOP</span> (kanan bawah) dengan gold hasil farming, last-hit, dan jawaban Knowledge Battle yang benar.
            </div>
            <div className="mt-auto pt-4 text-[9px] text-slate-600">Semua item unik — tidak dapat duplikat. Slot inventory: 6. Jual kembali dengan refund 70%.</div>
          </div>
        </div>
      </div>
    </main>
  );
}
