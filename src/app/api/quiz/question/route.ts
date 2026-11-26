import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions } from "@/db/schema";

// GET /api/quiz/question — one random IPAS question, options shuffled server-side.
// The answer key is NEVER sent to the client.
export async function GET() {
  try {
    const rows = await db.select({
      id: questions.id,
      materi: questions.materi,
      pertanyaan: questions.pertanyaan,
      optionA: questions.optionA,
      optionB: questions.optionB,
      optionC: questions.optionC,
      optionD: questions.optionD,
      difficulty: questions.difficulty,
    }).from(questions);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Bank soal kosong — minta guru mengisi soal." }, { status: 404 });
    }
    const q = rows[Math.floor(Math.random() * rows.length)];
    const options = [q.optionA, q.optionB, q.optionC, q.optionD];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return NextResponse.json({ id: q.id, materi: q.materi, pertanyaan: q.pertanyaan, difficulty: q.difficulty, options });
  } catch (err) {
    console.error("quiz/question error", err);
    return NextResponse.json({ error: "Gagal memuat soal" }, { status: 500 });
  }
}
