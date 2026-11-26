import { NextResponse } from "next/server";
import { db } from "@/db";
import { matches, questions, students, classes } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { desc, sql } from "drizzle-orm";

// GET /api/teacher/summary — dashboard overview aggregates (teacher only)
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Hanya guru" }, { status: 403 });
  }
  try {
    const [matchAgg] = await db.execute(sql`
      SELECT
        count(*)::int AS "totalMatches",
        count(DISTINCT player_name)::int AS "uniquePlayers",
        coalesce(sum(questions_correct), 0)::int AS "totalCorrect",
        coalesce(sum(questions_correct + questions_wrong), 0)::int AS "totalAnswered",
        coalesce(sum(knowledge_xp), 0)::int AS "totalKnowledgeXp",
        coalesce(sum(CASE WHEN result = 'victory' THEN 1 ELSE 0 END), 0)::int AS "totalVictory"
      FROM matches
    `).then((r) => (r as unknown as { rows: Record<string, number>[] }).rows);

    const materiAgg = await db.execute(sql`
      SELECT materi, count(*)::int AS "count" FROM questions GROUP BY materi ORDER BY materi
    `);
    const classCount = await db.select({ c: sql<number>`count(*)::int` }).from(classes);
    const studentCount = await db.select({ c: sql<number>`count(*)::int` }).from(students);
    const questionCount = await db.select({ c: sql<number>`count(*)::int` }).from(questions);
    const recent = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(8);
    const topPlayers = await db.execute(sql`
      SELECT player_name AS "playerName",
             sum(knowledge_xp)::int AS "knowledgeXp",
             count(*)::int AS "matches",
             sum(CASE WHEN result = 'victory' THEN 1 ELSE 0 END)::int AS "wins",
             sum(questions_correct)::int AS "correct",
             sum(questions_correct + questions_wrong)::int AS "answered"
      FROM matches GROUP BY player_name ORDER BY sum(knowledge_xp) DESC LIMIT 5
    `);

    const m = matchAgg ?? { totalMatches: 0, uniquePlayers: 0, totalCorrect: 0, totalAnswered: 0, totalKnowledgeXp: 0, totalVictory: 0 };
    const accuracy = m.totalAnswered > 0 ? Math.round((m.totalCorrect / m.totalAnswered) * 100) : 0;
    return NextResponse.json({
      totals: {
        matches: m.totalMatches,
        players: m.uniquePlayers,
        accuracy,
        knowledgeXp: m.totalKnowledgeXp,
        victories: m.totalVictory,
        questions: questionCount[0]?.c ?? 0,
        classes: classCount[0]?.c ?? 0,
        students: studentCount[0]?.c ?? 0,
      },
      materi: (materiAgg as unknown as { rows: { materi: string; count: number }[] }).rows ?? [],
      recent,
      topPlayers: (topPlayers as unknown as { rows: Record<string, unknown>[] }).rows ?? [],
    });
  } catch (err) {
    console.error("teacher/summary error", err);
    return NextResponse.json({ error: "Gagal memuat ringkasan" }, { status: 500 });
  }
}
