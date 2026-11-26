import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { classes, students } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

// GET /api/classes — list classes with students (teacher only)
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Hanya guru" }, { status: 403 });
  }
  try {
    const classRows = await db.select().from(classes).orderBy(desc(classes.createdAt));
    const result = await Promise.all(classRows.map(async (c) => {
      const members = await db.select().from(students).where(eq(students.classId, c.id));
      return { ...c, students: members };
    }));
    return NextResponse.json({ classes: result });
  } catch (err) {
    console.error("classes GET error", err);
    return NextResponse.json({ error: "Gagal memuat kelas" }, { status: 500 });
  }
}

// POST /api/classes — create a class with optional roster (teacher only)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Hanya guru" }, { status: 403 });
  }
  try {
    const b = await req.json();
    const name = String(b.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Nama kelas wajib diisi" }, { status: 400 });
    const roster: { name: string; nis?: string }[] = Array.isArray(b.students) ? b.students : [];
    const [cls] = await db.insert(classes).values({ name, teacherUsername: session.username }).returning();
    const clean = roster
      .map((s) => ({ name: String(s.name ?? "").trim(), nis: String(s.nis ?? "").trim() }))
      .filter((s) => s.name.length > 0)
      .slice(0, 80);
    if (clean.length > 0) {
      await db.insert(students).values(clean.map((s) => ({ classId: cls.id, name: s.name, nis: s.nis })));
    }
    return NextResponse.json({ ok: true, id: cls.id, students: clean.length });
  } catch (err) {
    console.error("classes POST error", err);
    return NextResponse.json({ error: "Gagal membuat kelas" }, { status: 500 });
  }
}

// DELETE /api/classes — delete a class and its students
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Hanya guru" }, { status: 403 });
  }
  try {
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isFinite(id)) return NextResponse.json({ error: "ID kelas tidak valid" }, { status: 400 });
    await db.delete(students).where(eq(students.classId, id));
    await db.delete(classes).where(eq(classes.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("classes DELETE error", err);
    return NextResponse.json({ error: "Gagal menghapus kelas" }, { status: 500 });
  }
}
