// ============================================================
// INVARIANT 4 — ANTI-BRUTE FORCE: 5 gagal → lockout; sukses menghapus penalti.
// ============================================================
import { describe, it, expect, beforeEach } from "vitest";
import {
  loginThrottle,
  recordLoginFailure,
  recordLoginSuccess,
  generalLimit,
  campusNatLimit,
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

describe("Invariant: campusNatLimit (anti-false-429 pada shared campus Wi-Fi)", () => {
  it("mengizinkan banyak token berbeda dari satu IP NAT yang sama", () => {
    const ip = `nat-${Math.random()}`;
    // 25 pemilih berbeda dari 1 Wi-Fi kampus yang sama
    for (let i = 0; i < 25; i++) {
      const token = `TOK${i}`;
      const res = campusNatLimit("nat-test", ip, token, { ipLimit: 50, tokenLimit: 3 });
      expect(res.allowed).toBe(true);
    }
  });

  it("memblokir token tunggal jika dibombardir melebihi tokenLimit", () => {
    const ip = `nat2-${Math.random()}`;
    const token = `HAMMER${Math.random().toString().slice(2, 6)}`;
    for (let i = 0; i < 3; i++) {
      const res = campusNatLimit("nat-test2", ip, token, { ipLimit: 100, tokenLimit: 3 });
      expect(res.allowed).toBe(true);
    }
    const blocked = campusNatLimit("nat-test2", ip, token, { ipLimit: 100, tokenLimit: 3 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe("TOKEN");
  });
});
