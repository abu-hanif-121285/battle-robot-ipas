import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, students, classes } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

// GET /api/teacher/report?format=csv — download match report (teacher only)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Hanya guru" }, { status: 403 });
  }
  try {
    const rows = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(2000);
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["No", "Tanggal", "Nama Pemain", "Hero", "Kesulitan", "Hasil", "Kill", "Death", "Assist", "Gold", "Damage", "Turret", "Soal Benar", "Soal Salah", "Akurasi %", "Knowledge XP", "MVP", "Durasi (detik)"];
    const lines = [header.join(",")];
    rows.forEach((m, i) => {
      const answered = m.questionsCorrect + m.questionsWrong;
      const acc = answered > 0 ? Math.round((m.questionsCorrect / answered) * 100) : 0;
      lines.push([
        i + 1,
        new Date(m.createdAt).toLocaleString("id-ID"),
        esc(m.playerName), esc(m.heroName), esc(m.difficulty), m.result === "victory" ? "Victory" : "Defeat",
        m.kills, m.deaths, m.assists, m.goldEarned, m.damageDealt, m.turretsDestroyed,
        m.questionsCorrect, m.questionsWrong, acc, m.knowledgeXp, m.mvp ? "Ya" : "Tidak", m.durationSec,
      ].join(","));
    });
    const csv = "﻿" + lines.join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="robot-legends-laporan-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error("report error", err);
    return NextResponse.json({ error: "Gagal membuat laporan" }, { status: 500 });
  }
}

// Suppress unused import warnings for future class-report joins
void students; void classes; void eq;
