// ============================================================
// /api/auth/2fa — Pengelolaan 2FA TOTP milik akun sendiri (Rekomendasi #3)
// GET  → status {enabled, backupCodesRemaining}
// POST {action}
//   setup   → secret sementara + otpauth:// URI (QR dibuat di klien)
//   enable  → {code}: konfirmasi kode pertama → AKTIF; kode cadangan
//             dikembalikan SEKALI (tidak pernah bisa dilihat lagi).
//   disable → {password, code}: verifikasi ganda sebelum dimatikan.
// Semua aksi tercatat append-only + push realtime ke monitor Panwaslu.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, verifyPassword } from "@/lib/server/auth";
import { publishAuthEvent } from "@/lib/server/bus";
import {
  buildOtpauthUri,
  decryptTotpSecret,
  encryptTotpSecret,
  generateBackupCodes,
  generateTotpSecret,
  getMasterSecret,
  hashBackupCode,
  verifyBackupCode,
  verifyTotp,
} from "@/lib/server/totp";

export async function GET() {
  const gate = await requireRole(["KPUM", "PPUR", "PANWASLU", "SAKSI", "ITPO"]);
  if ("error" in gate) return gate.error;
  const operator = await db.operator.findUnique({ where: { username: gate.session.username } });
  if (!operator) return NextResponse.json({ ok: false, message: "Akun tidak ditemukan." }, { status: 404 });
  const backups = operator.backupCodesJson ? (JSON.parse(operator.backupCodesJson) as string[]) : [];
  return NextResponse.json({
    ok: true,
    twoFactor: {
      enabled: Boolean(operator.totpEnabledAt),
      enabledAt: operator.totpEnabledAt?.toISOString() ?? null,
      pendingSetup: Boolean(operator.totpPendingSecret) && !operator.totpEnabledAt,
      backupCodesRemaining: backups.length,
      mandatory: operator.role === "KPUM" || operator.role === "ITPO",
    },
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireRole(["KPUM", "PPUR", "PANWASLU", "SAKSI", "ITPO"]);
  if ("error" in gate) return gate.error;
  const username = gate.session.username;
  const operator = await db.operator.findUnique({ where: { username } });
  if (!operator) return NextResponse.json({ ok: false, message: "Akun tidak ditemukan." }, { status: 404 });

  try {
    const body = (await req.json()) as { action?: string; code?: string; password?: string };
    const masterSecret = await getMasterSecret();

    // ---------- SETUP: mulai pemasangan (boleh diulang; menimpa draft) ----------
    if (body.action === "setup") {
      if (operator.totpEnabledAt) {
        return NextResponse.json({ ok: false, message: "2FA sudah aktif. Matikan dulu (Butuh password + kode) bila ingin pasang ulang." }, { status: 409 });
      }
      const secret = generateTotpSecret();
      await db.operator.update({ where: { id: operator.id }, data: { totpPendingSecret: secret } });
      return NextResponse.json({ ok: true, secret, otpauthUri: buildOtpauthUri(secret, operator.username) });
    }

    // ---------- ENABLE: konfirmasi kode pertama → aktifkan ----------
    if (body.action === "enable") {
      const code = (body.code ?? "").trim();
      if (!operator.totpPendingSecret) {
        return NextResponse.json({ ok: false, message: "Mulai dari langkah setup dulu (generate secret)." }, { status: 400 });
      }
      if (!verifyTotp(operator.totpPendingSecret, code)) {
        return NextResponse.json({ ok: false, message: "Kode tidak sah — pastikan memindai QR terbaru dan jam perangkat akurat." }, { status: 401 });
      }
      const backupCodes = generateBackupCodes();
      await db.operator.update({
        where: { id: operator.id },
        data: {
          totpSecret: encryptTotpSecret(operator.totpPendingSecret, masterSecret),
          totpPendingSecret: null,
          totpEnabledAt: new Date(),
          backupCodesJson: JSON.stringify(backupCodes.map(hashBackupCode)),
        },
      });
      await db.auditLog.create({
        data: { event: "OPERATOR_2FA_ENABLED", detail: `Akun ${operator.fullName} (${operator.role}) mengaktifkan 2FA TOTP; 8 kode cadangan sekali pakai dibuat.`, tpsId: operator.tpsId },
      });
      publishAuthEvent({ type: "OPERATOR_2FA_ENABLED", detail: `${operator.fullName} (${operator.role}) mengaktifkan 2FA.`, at: new Date().toISOString() });
      return NextResponse.json({ ok: true, message: "2FA aktif.", backupCodes });
    }

    // ---------- DISABLE: butuh password + kode sah (jalur pemulihan) ----------
    if (body.action === "disable") {
      if (!operator.totpEnabledAt) {
        return NextResponse.json({ ok: false, message: "2FA memang belum aktif." }, { status: 409 });
      }
      if (!body.password || !verifyPassword(body.password, operator.passwordHash)) {
        return NextResponse.json({ ok: false, message: "Password tidak sah." }, { status: 401 });
      }
      const secret = operator.totpSecret ? decryptTotpSecret(operator.totpSecret, masterSecret) : null;
      const backups = operator.backupCodesJson ? (JSON.parse(operator.backupCodesJson) as string[]) : [];
      const code = (body.code ?? "").trim().toUpperCase();
      const codeOk = (secret && verifyTotp(secret, code)) || backups.some((h) => verifyBackupCode(code, h));
      if (!codeOk) {
        return NextResponse.json({ ok: false, message: "Kode 2FA/kode cadangan tidak sah — penonaktifan dibatalkan." }, { status: 401 });
      }
      await db.operator.update({
        where: { id: operator.id },
        data: { totpSecret: null, totpPendingSecret: null, totpEnabledAt: null, backupCodesJson: null },
      });
      await db.auditLog.create({
        data: { event: "OPERATOR_2FA_DISABLED", detail: `AKUN ${operator.fullName} (${operator.role}) MENONAKTIFKAN 2FA — periksa kepatuhan segera.`, tpsId: operator.tpsId },
      });
      publishAuthEvent({ type: "OPERATOR_2FA_DISABLED", detail: `${operator.fullName} (${operator.role}) mematikan 2FA — verifikasi manual disarankan.`, at: new Date().toISOString() });
      return NextResponse.json({ ok: true, message: "2FA dimatikan. Segera aktifkan kembali demi kepatuhan." });
    }

    return NextResponse.json({ ok: false, message: "Aksi tidak dikenal." }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, message: "Kesalahan server pada pengelolaan 2FA." }, { status: 500 });
  }
}
