// POST /api/auth/change-password — Ganti password operator (semua peran, wajib sesi aktif)
// Alur: verifikasi password lama (scrypt timing-safe) → hash password baru →
// catat OPERATOR_PASSWORD_CHANGED di AuditLog append-only → akhiri sesi (wajib login ulang).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, requireRole, SESSION_COOKIE, verifyPassword } from "@/lib/server/auth";
import { generalLimit } from "@/lib/server/rate-limit";

const MIN_LENGTH = 8;

export async function POST(req: NextRequest) {
  const gate = await requireRole(["KPUM", "PPUR", "PANWASLU", "SAKSI", "ITPO"]);
  if ("error" in gate) return gate.error;
  const { session } = gate;

  // Anti-abuse: maks 5 pergantian password per 10 menit per operator
  const limit = generalLimit(`pwchange:${session.operatorId}`, 5, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu sering mengganti password. Coba lagi dalam ${Math.ceil(limit.retryAfterSec / 60)} menit.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  try {
    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ ok: false, message: "Semua kolom password wajib diisi." }, { status: 400 });
    }
    if (newPassword.length < MIN_LENGTH) {
      return NextResponse.json(
        { ok: false, message: `Password baru minimal ${MIN_LENGTH} karakter.` },
        { status: 400 }
      );
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ ok: false, message: "Konfirmasi password baru tidak cocok." }, { status: 400 });
    }

    const operator = await db.operator.findUnique({ where: { id: session.operatorId } });
    if (!operator || !operator.isActive) {
      return NextResponse.json({ ok: false, message: "Akun operator tidak ditemukan/nonaktif." }, { status: 404 });
    }
    if (!verifyPassword(currentPassword, operator.passwordHash)) {
      await db.auditLog.create({
        data: {
          event: "OPERATOR_PASSWORD_CHANGE_FAILED",
          detail: `Percobaan ganti password ditolak — password lama tidak sesuai (petugas ${operator.username}/${operator.role}).`,
          tpsId: operator.tpsId,
        },
      });
      return NextResponse.json({ ok: false, message: "Password lama tidak sesuai." }, { status: 400 });
    }
    if (verifyPassword(newPassword, operator.passwordHash)) {
      return NextResponse.json(
        { ok: false, message: "Password baru tidak boleh sama dengan password lama." },
        { status: 400 }
      );
    }

    await db.operator.update({
      where: { id: operator.id },
      data: { passwordHash: hashPassword(newPassword), mustChangePassword: false },
    });
    await db.auditLog.create({
      data: {
        event: "OPERATOR_PASSWORD_CHANGED",
        detail: `Petugas ${operator.fullName} (${operator.role}) mengganti password melalui menu profil. Sesi diakhiri — wajib login ulang.`,
        tpsId: operator.tpsId,
      },
    });

    // Sesi diakhiri demi keamanan: cookie dibersihkan, operator diminta login ulang.
    const res = NextResponse.json({ ok: true, message: "Password berhasil diganti. Silakan login kembali dengan password baru." });
    res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    console.error("change-password error", e);
    return NextResponse.json({ ok: false, message: "Kesalahan server saat mengganti password." }, { status: 500 });
  }
}
