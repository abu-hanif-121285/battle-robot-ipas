import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, signSession, getSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!username || !password) {
      return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
    }
    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
    let user = rows[0];
    // Auto-provision a student account on first login so students can play & appear in reports
    if (!user) {
      if (username.length < 3 || password.length < 6) {
        return NextResponse.json({ error: "Akun tidak ditemukan. Username min 3 karakter, password min 6." }, { status: 401 });
      }
      const [created] = await db.insert(users).values({
        username,
        passwordHash: hashPassword(password),
        role: "student",
        displayName: username.charAt(0).toUpperCase() + username.slice(1),
      }).returning();
      user = created;
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Password salah" }, { status: 401 });
    }
    const session = { username: user.username, role: user.role as "teacher" | "student", displayName: user.displayName };
    const token = signSession(session);
    const res = NextResponse.json({ ok: true, user: session });
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 24 * 3600 });
    return res;
  } catch (err) {
    console.error("auth POST error", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ user: session });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
