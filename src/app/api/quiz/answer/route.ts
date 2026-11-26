import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST /api/quiz/answer — server-authoritative validation of a quiz answer.
// Body: { questionId: number, chosen: string }  (chosen = full option text)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const questionId = Number(body.questionId);
    const chosen = String(body.chosen ?? "");
    if (!Number.isFinite(questionId) || !chosen) {
      return NextResponse.json({ error: "questionId dan chosen wajib diisi" }, { status: 400 });
    }
    const rows = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
    const q = rows[0];
    if (!q) return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 });
    const correctAnswer = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD }[q.kunci] ?? "";
    const correct = chosen === correctAnswer;
    return NextResponse.json({
      correct,
      correctAnswer,
      pembahasan: q.pembahasan,
      knowledgeXp: correct ? 100 : 0,
    });
  } catch (err) {
    console.error("quiz/answer error", err);
    return NextResponse.json({ error: "Gagal memvalidasi jawaban" }, { status: 500 });
  }
}
