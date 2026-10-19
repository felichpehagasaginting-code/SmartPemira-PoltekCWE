// POST /api/admin/operators/[id]/reset-password — Reset sandi oleh ITPO (Rekomendasi #2)
// Sandi sementara dibuat acak (tanpa karakter ambigu), TAMPIL SEKALI di respons,
// operator wajib menggantinya saat login berikutnya (mustChangePassword=true).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, requireRole } from "@/lib/server/auth";
import { generalLimit } from "@/lib/server/rate-limit";
import { publishAuthEvent } from "@/lib/server/bus";

// Alfabet tanpa karakter ambigu (0O1lI|`'";.)
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generateTempPassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  // format: Kmp-xxxx-xxxx-xx (grup mudah dibaca)
  return `Kmp-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["ITPO"]);
  if ("error" in gate) return gate.error;
  const { id } = await params;

  // Anti-abuse: maks 15 reset sandi per 10 menit
  const limit = generalLimit(`opreset:${gate.session.operatorId}`, 15, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, message: "Terlalu sering reset sandi. Tunggu sejenak." }, { status: 429 });
  }

  try {
    const target = await db.operator.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ ok: false, message: "Akun operator tidak ditemukan." }, { status: 404 });
    }

    const tempPassword = generateTempPassword();
    await db.operator.update({
      where: { id },
      data: { passwordHash: hashPassword(tempPassword), mustChangePassword: true },
    });
    await db.auditLog.create({
      data: {
        event: "OPERATOR_PASSWORD_RESET",
        detail: `ITPO (${gate.session.username}) mereset password akun ${target.username} (${target.role}). Sandi sementara aktif — wajib diganti saat login berikutnya.`,
      },
    });
    publishAuthEvent({
      type: "OPERATOR_PASSWORD_RESET",
      detail: `Password akun ${target.username} direset oleh ITPO — sandi sementara aktif.`,
      at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      message: `Sandi ${target.username} direset. Tampilkan sandi sementara SEKALI ini dan sampaikan ke petugas.`,
      tempPassword,
    });
  } catch (e) {
    console.error("operator reset error", e);
    return NextResponse.json({ ok: false, message: "Kesalahan server saat reset sandi." }, { status: 500 });
  }
}
