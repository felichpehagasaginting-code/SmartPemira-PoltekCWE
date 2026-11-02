// POST /api/auth/login — Otentikasi operator (RBAC PRD Bab 3)
// Rekomendasi #1: anti-brute force (throttle + lockout eskalatif)
// Rekomendasi #3: faktor kedua TOTP — akun dengan 2FA aktif wajib memasukkan
//   kode 6 digit (atau kode cadangan sekali pakai) SETELAH password sah.
//   Kegagalan TOTP dihitung sebagai kegagalan login (ikut lockout).
// Rekomendasi #8: push realtime ke monitor Panwaslu via event bus
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSessionCookiePayload, SESSION_COOKIE, SESSION_COOKIE_OPTIONS, verifyPassword, type Role } from "@/lib/server/auth";
import { clientIp, loginThrottle, recordLoginFailure, recordLoginSuccess } from "@/lib/server/rate-limit";
import { publishAuthEvent } from "@/lib/server/bus";
import { decryptTotpSecret, verifyTotp, verifyBackupCode, getMasterSecret } from "@/lib/server/totp";

const VALID_ROLES: Role[] = ["KPUM", "PPUR", "PANWASLU", "SAKSI", "ITPO"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body as { username?: string; password?: string };
    const totpCode = typeof body.totpCode === "string" ? body.totpCode.trim() : "";
    if (!username || !password) {
      return NextResponse.json({ ok: false, message: "Username dan password wajib diisi." }, { status: 400 });
    }

    const ip = clientIp(req.headers);
    const uname = username.trim().toLowerCase();

    // ---------- Anti-brute force: cek lock sebelum verifikasi ----------
    const throttle = loginThrottle(uname, ip);
    if (throttle.locked) {
      const min = Math.ceil(throttle.retryAfterSec / 60);
      await db.auditLog.create({
        data: {
          event: "OPERATOR_LOGIN_BLOCKED",
          detail: `Percobaan login "${uname}" dari ${ip} DITOLAK sistem — akun/IP sedang terkunci anti-brute force (${min} menit lagi).`,
        },
      });
      publishAuthEvent({ type: "OPERATOR_LOGIN_BLOCKED", detail: `Percobaan login ditolak — "${uname}" terkunci anti-brute force (${min} menit).`, at: new Date().toISOString() });
      return NextResponse.json(
        { ok: false, message: `Terlalu banyak percobaan gagal. Akun/IP terkunci sementara — coba lagi dalam ±${min} menit.` },
        { status: 429, headers: { "Retry-After": String(throttle.retryAfterSec) } }
      );
    }

    const operator = await db.operator.findUnique({ where: { username: uname } });
    if (!operator || !operator.isActive || !verifyPassword(password, operator.passwordHash)) {
      const { justLocked } = await recordLoginFailure(uname, ip);
      // Audit keamanan: percobaan login gagal tercatat append-only (FR-08.4)
      await db.auditLog.create({
        data: {
          event: "OPERATOR_LOGIN_FAILED",
          detail: `Percobaan login GAGAL untuk username "${username.trim()}" dari ${ip} — kredensial tidak valid / akun nonaktif.`,
        },
      });
      publishAuthEvent({
        type: "OPERATOR_LOGIN_FAILED",
        detail: justLocked
          ? `Login gagal untuk "${username.trim()}" — akun/IP terkunci anti-brute force.`
          : `Login gagal untuk "${username.trim()}" dari ${ip}.`,
        at: new Date().toISOString(),
      });
      if (justLocked) {
        return NextResponse.json(
          { ok: false, message: "Terlalu banyak percobaan gagal. Akun/IP terkunci 15 menit demi keamanan pemilu." },
          { status: 429, headers: { "Retry-After": "900" } }
        );
      }
      const remaining = throttle.failsRemaining - 1;
      return NextResponse.json(
        {
          ok: false,
          message:
            remaining > 0
              ? `Kredensial tidak valid. Sisa percobaan sebelum terkunci: ${remaining}.`
              : "Kredensial tidak valid. Percobaan berikutnya akan mengunci akun sementara.",
        },
        { status: 401 }
      );
    }

    recordLoginSuccess(uname, ip);

    // ---------- Faktor kedua (Rekomendasi #3) ----------
    // HUKUM: password sah ≠ sesi. Akun dgn 2FA aktif hanya masuk bila kode sah.
    let twoFactorNotice: string | null = null;
    if (operator.totpEnabledAt && operator.totpSecret) {
      if (!totpCode) {
        await db.auditLog.create({
          data: { event: "OPERATOR_2FA_REQUIRED", detail: `Login "${operator.username}" dari ${ip} tertahan — kode 2FA wajib tetapi tidak disertakan.`, tpsId: operator.tpsId },
        });
        return NextResponse.json(
          { ok: false, needs2fa: true, message: "Akun ini mengaktifkan 2FA. Masukkan kode 6 digit dari aplikasi autentikator (atau kode cadangan)." },
          { status: 401 }
        );
      }
      const masterSecret = await getMasterSecret();
      const secret = decryptTotpSecret(operator.totpSecret, masterSecret);
      let ok2fa = false;
      let usedBackup = false;
      if (secret && verifyTotp(secret, totpCode)) {
        ok2fa = true;
      } else if (operator.backupCodesJson) {
        const hashes = JSON.parse(operator.backupCodesJson) as string[];
        const idx = hashes.findIndex((h) => verifyBackupCode(totpCode.toUpperCase(), h));
        if (idx !== -1) {
          ok2fa = true;
          usedBackup = true;
          // Kode cadangan SEKALI PAKAI: hapus hash-nya dari daftar.
          hashes.splice(idx, 1);
          await db.operator.update({ where: { id: operator.id }, data: { backupCodesJson: JSON.stringify(hashes) } });
        }
      }
      if (!ok2fa) {
        const { justLocked } = await recordLoginFailure(uname, ip);
        await db.auditLog.create({
          data: { event: "OPERATOR_LOGIN_FAILED", detail: `Login "${operator.username}" dari ${ip} GAGAL pada faktor kedua — kode 2FA tidak sah.`, tpsId: operator.tpsId },
        });
        publishAuthEvent({ type: "OPERATOR_LOGIN_FAILED", detail: `Login "${operator.username}" — kode 2FA salah.`, at: new Date().toISOString() });
        if (justLocked) {
          return NextResponse.json({ ok: false, needs2fa: true, message: "Terlalu banyak percobaan. Akun/IP terkunci 15 menit demi keamanan pemilu." }, { status: 429, headers: { "Retry-After": "900" } });
        }
        return NextResponse.json({ ok: false, needs2fa: true, message: "Kode 2FA tidak sah. Periksa jam perangkat atau gunakan kode cadangan." }, { status: 401 });
      }
      if (usedBackup) {
        twoFactorNotice = "Login memakai KODE CADANGAN — kode itu kini hangus. Sisa kode cadangan aktif tercatat di riwayat akun.";
        await db.auditLog.create({
          data: { event: "OPERATOR_2FA_BACKUP_USED", detail: `Login "${operator.username}" dari ${ip} menggunakan kode cadangan sekali pakai (kini hangus).`, tpsId: operator.tpsId },
        });
      }
    } else if ((operator.role === "KPUM" || operator.role === "ITPO") && !operator.totpEnabledAt) {
      // Penegakan peran: pengelola inti belum mengaktifkan 2FA → diberi tanda
      // kepatuhan (tanpa memblokir login pertama, agar tidak terkunci sendiri).
      twoFactorNotice = "WAJIB KEPATUHAN: akun KPUM/ITPO diwajibkan mengaktifkan 2FA. Buka menu Keamanan Akun segera.";
      await db.auditLog.create({
        data: { event: "OPERATOR_2FA_MISSING", detail: `Login "${operator.username}" (${operator.role}) tanpa 2FA aktif — kepatuhan 2FA belum terpenuhi.`, tpsId: operator.tpsId },
      });
    }

    const sessionPayload = await createSessionCookiePayload({
      operatorId: operator.id,
      username: operator.username,
      role: (VALID_ROLES.includes(operator.role as Role) ? operator.role : "ITPO") as Role,
      fullName: operator.fullName,
      tpsId: operator.tpsId,
      mustChangePassword: operator.mustChangePassword,
    });

    await db.operator.update({ where: { id: operator.id }, data: { lastLoginAt: new Date() } });
    await db.auditLog.create({
      data: {
        event: "OPERATOR_LOGIN",
        detail: `Petugas ${operator.fullName} (${operator.role}) login dari ${ip} — diarahkan ke terminal sesuai peran (RBAC PRD Bab 3).${operator.mustChangePassword ? " SANDI SEMENTARA AKTIF — wajib diganti." : ""}`,
        tpsId: operator.tpsId,
      },
    });
    publishAuthEvent({
      type: "OPERATOR_LOGIN",
      detail: `Petugas ${operator.fullName} (${operator.role}) login dari ${ip}.`,
      at: new Date().toISOString(),
    });

    const res = NextResponse.json({
      ok: true,
      notice: twoFactorNotice,
      operator: {
        username: operator.username,
        role: operator.role,
        fullName: operator.fullName,
        tpsId: operator.tpsId,
        mustChangePassword: operator.mustChangePassword,
        twoFactorEnabled: Boolean(operator.totpEnabledAt),
      },
    });
    res.cookies.set(SESSION_COOKIE, sessionPayload, SESSION_COOKIE_OPTIONS);
    return res;
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ ok: false, message: "Kesalahan server saat login." }, { status: 500 });
  }
}
