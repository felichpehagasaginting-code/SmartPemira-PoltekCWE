// ============================================================
// RATE LIMITER & ANTI-BRUTE FORCE — Smart Pemira (Rekomendasi #1)
// Sliding-window in-memory (satu instansi). Untuk multi-instansi
// produksi, pindahkan state ke Redis — API fungsi tetap sama.
//
// Login: 5 kegagalan dalam 15 menit → lockout 15 menit dengan
// eskalasi eksponensial (×2 per lockout berikutnya, maks 24 jam).
// Endpoint publik sensitif: fixed-window limit per IP.
// ============================================================
import { db } from "@/lib/db";

interface LoginBucket {
  fails: number;
  windowStart: number;
  lockedUntil: number;
  lockCount: number;
}

interface FixedBucket {
  count: number;
  windowStart: number;
}

const g = globalThis as unknown as {
  __pemiraLoginBuckets?: Map<string, LoginBucket>;
  __pemiraFixedBuckets?: Map<string, FixedBucket>;
};
const loginBuckets: Map<string, LoginBucket> = (g.__pemiraLoginBuckets ??= new Map());
const fixedBuckets: Map<string, FixedBucket> = (g.__pemiraFixedBuckets ??= new Map());

export const LOGIN_FAIL_WINDOW_MS = 15 * 60_000; // 15 menit
export const LOGIN_MAX_FAILS = 5;
export const LOGIN_BASE_LOCK_MS = 15 * 60_000; // 15 menit
export const LOGIN_MAX_LOCK_MS = 24 * 60 * 60_000; // 24 jam

function lockDurationMs(lockCount: number): number {
  return Math.min(LOGIN_BASE_LOCK_MS * Math.pow(2, lockCount - 1), LOGIN_MAX_LOCK_MS);
}

export interface ThrottleState {
  locked: boolean;
  retryAfterSec: number;
  failsRemaining: number;
}

/** Cek status throttle sebelum memverifikasi kredensial. */
export function loginThrottle(username: string, ip: string): ThrottleState {
  const now = Date.now();
  for (const key of [`u:${username}`, `ip:${ip}`]) {
    const b = loginBuckets.get(key);
    if (b?.lockedUntil && b.lockedUntil > now) {
      return { locked: true, retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000), failsRemaining: 0 };
    }
  }
  const bucket = loginBuckets.get(`u:${username}`);
  const failsInWindow =
    bucket && now - bucket.windowStart < LOGIN_FAIL_WINDOW_MS
      ? LOGIN_MAX_FAILS - bucket.fails
      : LOGIN_MAX_FAILS;
  return { locked: false, retryAfterSec: 0, failsRemaining: Math.max(0, failsInWindow) };
}

/** Catat kegagalan login; kembalikan lock bila ambilur terlampaui. */
export async function recordLoginFailure(username: string, ip: string): Promise<{ justLocked: boolean; lockedUntil: number; fails: number }> {
  const now = Date.now();
  const bucket = loginBuckets.get(`u:${username}`) ?? { fails: 0, windowStart: now, lockedUntil: 0, lockCount: 0 };
  if (now - bucket.windowStart >= LOGIN_FAIL_WINDOW_MS) {
    bucket.fails = 0;
    bucket.windowStart = now;
  }
  bucket.fails += 1;

  let justLocked = false;
  if (bucket.fails >= LOGIN_MAX_FAILS && bucket.lockedUntil <= now) {
    bucket.lockCount += 1;
    bucket.lockedUntil = now + lockDurationMs(bucket.lockCount);
    justLocked = true;
  }
  loginBuckets.set(`u:${username}`, bucket);

  // IP juga dihitung (penyerang yang mencoba banyak username dari satu IP)
  const ipBucket = loginBuckets.get(`ip:${ip}`) ?? { fails: 0, windowStart: now, lockedUntil: 0, lockCount: 0 };
  if (now - ipBucket.windowStart >= LOGIN_FAIL_WINDOW_MS) {
    ipBucket.fails = 0;
    ipBucket.windowStart = now;
  }
  ipBucket.fails += 1;
  if (ipBucket.fails >= LOGIN_MAX_FAILS * 3 && ipBucket.lockedUntil <= now) {
    ipBucket.lockCount += 1;
    ipBucket.lockedUntil = now + lockDurationMs(ipBucket.lockCount);
    loginBuckets.set(`ip:${ip}`, ipBucket);
    justLocked = true;
  } else {
    loginBuckets.set(`ip:${ip}`, ipBucket);
  }

  if (justLocked) {
    try {
      await db.auditLog.create({
        data: {
          event: "OPERATOR_ACCOUNT_LOCKED",
          detail: `Anti-brute force: kredensial "${username}" dari ${ip} dikunci sementara setelah ${LOGIN_MAX_FAILS} kegagalan. Coba lagi dalam ${Math.round(lockDurationMs(bucket.lockCount) / 60_000)} menit.`,
        },
      });
    } catch {
      // audit gagal tidak boleh memblokir mekanisme keamanan
    }
  }
  return { justLocked, lockedUntil: bucket.lockedUntil, fails: bucket.fails };
}

/** Hapus penalti setelah login sukses. */
export function recordLoginSuccess(username: string, ip: string): void {
  loginBuckets.delete(`u:${username}`);
  loginBuckets.delete(`ip:${ip}`);
}

/** Fixed-window limiter umum untuk endpoint sensitif per kunci. */
export function generalLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSec: number; remaining: number } {
  const now = Date.now();
  const b = fixedBuckets.get(key);
  if (!b || now - b.windowStart >= windowMs) {
    fixedBuckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSec: 0, remaining: limit - 1 };
  }
  if (b.count >= limit) {
    return { allowed: false, retryAfterSec: Math.ceil((b.windowStart + windowMs - now) / 1000), remaining: 0 };
  }
  b.count += 1;
  return { allowed: true, retryAfterSec: 0, remaining: limit - b.count };
}

/** Ekstrak IP klien dari request (proxy-aware). */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "lokal";
}
