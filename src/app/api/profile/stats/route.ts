import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

// GET /api/profile/stats?playerName=X — aggregate lifetime stats for one player
export async function GET(req: NextRequest) {
  const playerName = (req.nextUrl.searchParams.get("playerName") || "RoboLearner").slice(0, 60);
  try {
    const rows = await db.execute(sql`
      SELECT
        count(*)::int AS "matches",
        sum(CASE WHEN result = 'victory' THEN 1 ELSE 0 END)::int AS "wins",
        coalesce(sum(kills), 0)::int AS "kills",
        coalesce(sum(assists), 0)::int AS "assists",
        coalesce(sum(knowledge_xp), 0)::int AS "knowledgeXp",
        coalesce(sum(gold_earned), 0)::int AS "goldEarned",
        coalesce(sum(questions_correct), 0)::int AS "correct",
        coalesce(sum(questions_correct + questions_wrong), 0)::int AS "answered",
        sum(CASE WHEN mvp THEN 1 ELSE 0 END)::int AS "mvpCount",
        coalesce(sum(damage_dealt), 0)::int AS "damageDealt",
        coalesce(round(avg(duration_sec)), 0)::int AS "avgDuration"
      FROM matches WHERE player_name = ${playerName}
    `);
    const r = (((rows as unknown as { rows: Record<string, number>[] }).rows ?? [])[0] ?? {}) as Record<string, number>;
    return NextResponse.json({
      playerName,
      matches: r.matches ?? 0,
      wins: r.wins ?? 0,
      kills: r.kills ?? 0,
      assists: r.assists ?? 0,
      knowledgeXp: r.knowledgeXp ?? 0,
      goldEarned: r.goldEarned ?? 0,
      correct: r.correct ?? 0,
      answered: r.answered ?? 0,
      mvpCount: r.mvpCount ?? 0,
      damageDealt: r.damageDealt ?? 0,
      avgDuration: r.avgDuration ?? 0,
    });
  } catch (err) {
    console.error("profile/stats error", err);
    return NextResponse.json({ matches: 0, wins: 0, kills: 0, assists: 0, knowledgeXp: 0, goldEarned: 0, correct: 0, answered: 0, mvpCount: 0, damageDealt: 0, avgDuration: 0 });
  }
}
