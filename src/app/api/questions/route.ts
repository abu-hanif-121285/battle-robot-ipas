import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { desc, ilike, and, eq } from "drizzle-orm";

// GET /api/questions — full bank for the teacher dashboard (teacher only)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Hanya guru" }, { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const materi = sp.get("materi") || "";
  const search = sp.get("search") || "";
  try {
    const conditions = [];
    if (materi) conditions.push(eq(questions.materi, materi));
    if (search) conditions.push(ilike(questions.pertanyaan, `%${search}%`));
    const rows = await db.select().from(questions)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(questions.createdAt))
      .limit(400);
    return NextResponse.json({ questions: rows });
  } catch (err) {
    console.error("questions GET error", err);
    return NextResponse.json({ error: "Gagal memuat bank soal" }, { status: 500 });
  }
}

// POST /api/questions — create a question (teacher only)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Hanya guru" }, { status: 403 });
  }
  try {
    const b = await req.json();
    const err = validateQuestion(b);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    const [inserted] = await db.insert(questions).values({
      materi: String(b.materi).trim(),
      pertanyaan: String(b.pertanyaan).trim(),
      optionA: String(b.optionA).trim(),
      optionB: String(b.optionB).trim(),
      optionC: String(b.optionC).trim(),
      optionD: String(b.optionD).trim(),
      kunci: String(b.kunci).trim().toUpperCase(),
      pembahasan: String(b.pembahasan ?? "").trim(),
      difficulty: ["mudah", "sedang", "sulit"].includes(b.difficulty) ? b.difficulty : "sedang",
      demo: false,
    }).returning();
    return NextResponse.json({ ok: true, id: inserted.id });
  } catch (err) {
    console.error("questions POST error", err);
    return NextResponse.json({ error: "Gagal menambah soal" }, { status: 500 });
  }
}

export function validateQuestion(b: Record<string, unknown>): string | null {
  const required = ["materi", "pertanyaan", "optionA", "optionB", "optionC", "optionD", "kunci"];
  for (const k of required) {
    if (!b[k] || !String(b[k]).trim()) return `Field ${k} wajib diisi`;
  }
  const kunci = String(b.kunci).trim().toUpperCase();
  if (!["A", "B", "C", "D"].includes(kunci)) return "Kunci harus A, B, C, atau D";
  return null;
}
