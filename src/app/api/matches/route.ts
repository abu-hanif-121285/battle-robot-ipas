import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

const clampInt = (v: unknown, min: number, max: number, fallback = 0) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
};

// POST /api/matches — persist a finished match (public; called by game client)
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const heroName = String(b.heroName ?? "UNKNOWN").slice(0, 40);
    const heroId = String(b.heroId ?? "unknown").slice(0, 40);
    const result = b.result === "victory" || b.victory === true ? "victory" : "defeat";
    const playerName = String(b.playerName ?? "RoboLearner").slice(0, 60) || "RoboLearner";
    const difficulty = ["easy", "normal", "hard"].includes(b.difficulty) ? b.difficulty : "normal";
    const questionsCorrect = clampInt(b.questionsCorrect, 0, 500);
    const questionsWrong = clampInt(b.questionsWrong, 0, 500);
    const [inserted] = await db.insert(matches).values({
      playerName,
      heroId,
      heroName,
      difficulty,
      result,
      kills: clampInt(b.kills, 0, 99),
      deaths: clampInt(b.deaths, 0, 99),
      assists: clampInt(b.assists, 0, 99),
      goldEarned: clampInt(b.goldEarned, 0, 100000),
      damageDealt: clampInt(b.damageDealt, 0, 1000000),
      turretsDestroyed: clampInt(b.turretsDestroyed, 0, 19),
      questionsCorrect,
      questionsWrong,
      knowledgeXp: questionsCorrect * 100,
      mvp: b.mvp === true,
      durationSec: clampInt(b.durationSec, 0, 4 * 3600),
    }).returning();
    return NextResponse.json({ ok: true, id: inserted.id });
  } catch (err) {
    console.error("matches POST error", err);
    return NextResponse.json({ error: "Gagal menyimpan hasil" }, { status: 500 });
  }
}

// GET /api/matches — recent matches (teacher only)
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Hanya guru yang dapat melihat laporan" }, { status: 403 });
  }
  try {
    const rows = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(150);
    return NextResponse.json({ matches: rows });
  } catch (err) {
    console.error("matches GET error", err);
    return NextResponse.json({ error: "Gagal memuat laporan" }, { status: 500 });
  }
}
