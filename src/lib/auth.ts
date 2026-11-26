import crypto from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.SESSION_SECRET || "rl-battle-of-knowledge-dev-secret";

export interface SessionUser {
  username: string;
  role: "teacher" | "student";
  displayName: string;
}

// ─── Password hashing (scrypt) ───────────────────────────────────────────────
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const attempt = crypto.scryptSync(password, salt, 64);
    const original = Buffer.from(hash, "hex");
    return original.length === attempt.length && crypto.timingSafeEqual(original, attempt);
  } catch {
    return false;
  }
}

// ─── Signed session tokens (HMAC-SHA256) ─────────────────────────────────────
function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signSession(user: SessionUser): string {
  const payload = base64url(JSON.stringify({ ...user, iat: Date.now() }));
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.username || !data.role) return null;
    // 30-day expiry
    if (Date.now() - (data.iat ?? 0) > 30 * 24 * 3600 * 1000) return null;
    return { username: data.username, role: data.role, displayName: data.displayName ?? data.username };
  } catch {
    return null;
  }
}

// ─── Helpers for server components / route handlers ───────────────────────────
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return verifySessionToken(store.get("rl_session")?.value);
}

export const SESSION_COOKIE = "rl_session";
