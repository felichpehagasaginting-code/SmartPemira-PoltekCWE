// ============================================================
// RBAC AUTH SERVICE — Smart Pemira (PRD Bab 3: Matriks Hak Akses)
// - Password: scrypt (N=16384) + salt acak, compare timing-safe
// - Sesi: cookie httpOnly berisi payload base64url + HMAC-SHA256
// - Secret sesi disimpan di ElectionSetting.sessionSecret (persisten)
// - Hukum 1 tetap terjaga: sesi operator TIDAK menyentuh domain suara
// ============================================================
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "pemira_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 jam shift petugas

export type Role = "KPUM" | "PPUR" | "PANWASLU" | "SAKSI" | "ITPO";

export interface OperatorSession {
  operatorId: string;
  username: string;
  role: Role;
  fullName: string;
  tpsId: string | null;
  mustChangePassword: boolean; // sandi sementara dari reset ITPO — wajib diganti
  exp: number; // epoch ms
}

// ---------- Password hashing (scrypt) ----------
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(plain, salt, 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// ---------- HMAC signing ----------
async function getSecret(): Promise<string> {
  const setting = await db.electionSetting.findUnique({ where: { id: "main" }, select: { sessionSecret: true } });
  return setting?.sessionSecret ?? "";
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

// ---------- Session read (dari cookie) ----------
export async function getSession(): Promise<OperatorSession | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const secret = await getSecret();
  if (!secret) return null;
  const expected = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OperatorSession;
    if (!session.exp || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function createSessionCookiePayload(session: Omit<OperatorSession, "exp">): Promise<string> {
  const secret = await getSecret();
  const full: OperatorSession = { ...session, exp: Date.now() + SESSION_TTL_MS };
  const payload = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
};

// ---------- Guard untuk Route Handlers ----------
// Kembalikan NextResponse error bila akses ditolak, atau null bila lolos.
export async function requireRole(
  allowed: Role[]
): Promise<{ session: OperatorSession } | { error: NextResponse }> {
  const session = await getSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { ok: false, code: "UNAUTHENTICATED", message: "Akses ditolak — sesi operator tidak ditemukan. Silakan login." },
        { status: 401 }
      ),
    };
  }
  if (!allowed.includes(session.role)) {
    return {
      error: NextResponse.json(
        {
          ok: false,
          code: "FORBIDDEN",
          message: `Peran ${session.role} tidak memiliki kewenangan di modul ini (matriks RBAC PRD Bab 3). Dibutuhkan: ${allowed.join(" / ")}.`,
        },
        { status: 403 }
      ),
    };
  }
  return { session };
}

// ---------- Matriks kewenangan (dokumentasi hidup) ----------
// Portal Publik : semua (tanpa sesi)
// Kiosk         : token pemilih (tanpa sesi operator — Hukum 1)
// PPUR          : PPUR, ITPO
// KPUM          : KPUM, ITPO (Pleno Unlock & Stage: KPUM saja — FR-06.3)
// Panwaslu      : PANWASLU, SAKSI, KPUM, ITPO (kelola insiden: PANWASLU/ITPO)
// Tally unlock  : KPUM
