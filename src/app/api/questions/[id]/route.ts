import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

// PUT /api/questions/:id — edit a question (teacher only)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Hanya guru" }, { status: 403 });
  }
  const { id } = await params;
  const qid = Number(id);
  if (!Number.isFinite(qid)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  try {
    const b = await req.json();
    for (const k of ["materi", "pertanyaan", "optionA", "optionB", "optionC", "optionD", "kunci"]) {
      if (!b[k] || !String(b[k]).trim()) return NextResponse.json({ error: `Field ${k} wajib diisi` }, { status: 400 });
    }
    const kunci = String(b.kunci).trim().toUpperCase();
    if (!["A", "B", "C", "D"].includes(kunci)) return NextResponse.json({ error: "Kunci harus A–D" }, { status: 400 });
    await db.update(questions).set({
      materi: String(b.materi).trim(),
      pertanyaan: String(b.pertanyaan).trim(),
      optionA: String(b.optionA).trim(),
      optionB: String(b.optionB).trim(),
      optionC: String(b.optionC).trim(),
      optionD: String(b.optionD).trim(),
      kunci,
      pembahasan: String(b.pembahasan ?? "").trim(),
      difficulty: ["mudah", "sedang", "sulit"].includes(b.difficulty) ? b.difficulty : "sedang",
      demo: false,
    }).where(eq(questions.id, qid));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("questions PUT error", err);
    return NextResponse.json({ error: "Gagal mengubah soal" }, { status: 500 });
  }
}

// DELETE /api/questions/:id (teacher only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Hanya guru" }, { status: 403 });
  }
  const { id } = await params;
  const qid = Number(id);
  if (!Number.isFinite(qid)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  try {
    await db.delete(questions).where(eq(questions.id, qid));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("questions DELETE error", err);
    return NextResponse.json({ error: "Gagal menghapus soal" }, { status: 500 });
  }
}
