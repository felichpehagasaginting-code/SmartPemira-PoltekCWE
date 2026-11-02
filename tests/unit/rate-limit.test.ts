// ============================================================
// INVARIANT 4 — ANTI-BRUTE FORCE: 5 gagal → lockout; sukses menghapus penalti.
// ============================================================
import { describe, it, expect, beforeEach } from "vitest";
import {
  loginThrottle,
  recordLoginFailure,
  recordLoginSuccess,
  generalLimit,
  LOGIN_MAX_FAILS,
  LOGIN_FAIL_WINDOW_MS,
} from "@/lib/server/rate-limit";

const U = "panitia-uji";
const IP = "10.10.10.99";

describe("Invariant: login throttle", () => {
  beforeEach(() => {
    recordLoginSuccess(U, IP);
  });

  it("awal: tidak terkunci, sisa percobaan = maksimum", () => {
    const s = loginThrottle(U, IP);
    expect(s.locked).toBe(false);
    expect(s.failsRemaining).toBe(LOGIN_MAX_FAILS);
  });

  it(`tepat ${LOGIN_MAX_FAILS} kegagalan → terkunci ±${LOGIN_FAIL_WINDOW_MS / 60_000} menit`, async () => {
    let justLocked = false;
    for (let i = 0; i < LOGIN_MAX_FAILS; i++) {
      justLocked = (await recordLoginFailure(U, IP)).justLocked;
    }
    expect(justLocked).toBe(true);
    const s = loginThrottle(U, IP);
    expect(s.locked).toBe(true);
    expect(s.retryAfterSec).toBeGreaterThan(14 * 60);
    expect(s.retryAfterSec).toBeLessThanOrEqual(15 * 60);
  });

  it("kegagalan di bawah ambang tidak mengunci", async () => {
    for (let i = 0; i < LOGIN_MAX_FAILS - 1; i++) {
      await recordLoginFailure(U, IP);
    }
    expect(loginThrottle(U, IP).locked).toBe(false);
  });

  it("login sukses menghapus seluruh penalti username & IP", async () => {
    for (let i = 0; i < LOGIN_MAX_FAILS - 1; i++) {
      await recordLoginFailure(U, IP);
    }
    recordLoginSuccess(U, IP);
    const s = loginThrottle(U, IP);
    expect(s.locked).toBe(false);
    expect(s.failsRemaining).toBe(LOGIN_MAX_FAILS);
  });
});

describe("Invariant: fixed-window limiter", () => {
  it("memotong tepat pada limit lalu menolak sisa jendela", () => {
    const key = `uji:${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(generalLimit(key, 5, 60_000).allowed).toBe(true);
    }
    const blocked = generalLimit(key, 5, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("jendela berbeda per kunci — pengguna lain tidak ikut terkena", () => {
    const a = `ujiA:${Math.random()}`;
    const b = `ujiB:${Math.random()}`;
    for (let i = 0; i < 5; i++) generalLimit(a, 5, 60_000);
    expect(generalLimit(a, 5, 60_000).allowed).toBe(false);
    expect(generalLimit(b, 5, 60_000).allowed).toBe(true);
  });
});
