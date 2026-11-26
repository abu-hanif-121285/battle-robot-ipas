import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";

// POST /api/teacher/import — upload .xlsx/.csv bank soal (teacher only)
// Expected columns: No, Materi, Pertanyaan, A, B, C, D, Kunci, Pembahasan (heading row, any order/case)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Hanya guru" }, { status: 403 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "File terlalu besar (maks 4MB)" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return NextResponse.json({ error: "Sheet kosong" }, { status: 400 });
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const norm = (s: unknown) => String(s ?? "").trim();
    const col = (row: Record<string, unknown>, names: string[]): string => {
      for (const k of Object.keys(row)) {
        if (names.includes(k.trim().toLowerCase())) return norm(row[k]);
      }
      return "";
    };

    const valid: (typeof questions.$inferInsert)[] = [];
    const errors: string[] = [];
    rawRows.forEach((row, i) => {
      const line = i + 2; // +1 for header, +1 for 1-based
      const materi = col(row, ["materi", "mata pelajaran", "bab", "topik", "category"]);
      const pertanyaan = col(row, ["pertanyaan", "soal", "question"]);
      const optionA = col(row, ["a", "optiona", "pilihan a", "jawaban a"]);
      const optionB = col(row, ["b", "optionb", "pilihan b", "jawaban b"]);
      const optionC = col(row, ["c", "optionc", "pilihan c", "jawaban c"]);
      const optionD = col(row, ["d", "optiond", "pilihan d", "jawaban d"]);
      const kunciRaw = col(row, ["kunci", "kunci jawaban", "jawaban", "answer", "kunci_jawaban"]).toUpperCase();
      const pembahasan = col(row, ["pembahasan", "penjelasan", "bahas", "explanation"]);
      const difficultyRaw = col(row, ["tingkat kesulitan", "kesulitan", "difficulty"]).toLowerCase();
      const difficulty = difficultyRaw.includes("mudah") || difficultyRaw.includes("easy") ? "mudah"
        : difficultyRaw.includes("sulit") || difficultyRaw.includes("hard") ? "sulit" : "sedang";

      // skip fully-empty rows
      if (!materi && !pertanyaan && !optionA && !optionB) return;
      if (!pertanyaan || !optionA || !optionB || !optionC || !optionD) {
        errors.push(`Baris ${line}: pertanyaan/opsi A–D belum lengkap`);
        return;
      }
      if (!["A", "B", "C", "D"].includes(kunciRaw)) {
        errors.push(`Baris ${line}: Kunci "${kunciRaw || "(kosong)"}" harus A, B, C, atau D`);
        return;
      }
      valid.push({
        materi: materi || "Umum",
        pertanyaan, optionA, optionB, optionC, optionD,
        kunci: kunciRaw,
        pembahasan: pembahasan || "Pembahasan belum diisi.",
        difficulty,
        demo: false,
      });
    });

    if (valid.length > 0) {
      // batch insert in chunks of 100
      for (let i = 0; i < valid.length; i += 100) {
        await db.insert(questions).values(valid.slice(i, i + 100));
      }
    }
    return NextResponse.json({
      ok: true,
      imported: valid.length,
      skipped: errors.length,
      errors: errors.slice(0, 12),
      total: rawRows.length,
    });
  } catch (err) {
    console.error("import error", err);
    return NextResponse.json({ error: "Gagal membaca file. Pastikan format kolom: No | Materi | Pertanyaan | A | B | C | D | Kunci | Pembahasan" }, { status: 400 });
  }
}
