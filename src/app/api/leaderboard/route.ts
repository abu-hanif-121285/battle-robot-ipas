import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

// GET /api/leaderboard — top players by Knowledge XP (min 1 match)
export async function GET() {
  try {
    const rows = await db.execute(sql`
      SELECT
        player_name AS "playerName",
        count(*)::int AS "matches",
        sum(CASE WHEN result = 'victory' THEN 1 ELSE 0 END)::int AS "wins",
        sum(kills)::int AS "kills",
        sum(deaths)::int AS "deaths",
        sum(assists)::int AS "assists",
        sum(knowledge_xp)::int AS "knowledgeXp",
        sum(questions_correct)::int AS "correct",
        sum(questions_correct + questions_wrong)::int AS "answered",
        sum(CASE WHEN mvp THEN 1 ELSE 0 END)::int AS "mvpCount",
        sum(gold_earned)::int AS "goldEarned"
      FROM matches
      GROUP BY player_name
      ORDER BY sum(knowledge_xp) DESC, sum(CASE WHEN result = 'victory' THEN 1 ELSE 0 END) DESC
      LIMIT 15
    `);
    const totals = await db.execute(sql`
      SELECT count(*)::int AS "totalMatches", count(DISTINCT player_name)::int AS "players" FROM matches
    `);
    const topRows = (rows as unknown as { rows: Record<string, unknown>[] }).rows ?? (rows as unknown as Record<string, unknown>[]);
    const totalRow = (totals as unknown as { rows: Record<string, unknown>[] }).rows?.[0] ?? { totalMatches: 0, players: 0 };
    return NextResponse.json({ top: topRows, totals: totalRow });
  } catch (err) {
    console.error("leaderboard error", err);
    return NextResponse.json({ error: "Gagal memuat leaderboard", top: [], totals: { totalMatches: 0, players: 0 } }, { status: 500 });
  }
}
