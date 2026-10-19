// GET /api/public/receipt?code=XXXX-XXXX-XXXX — Verifikasi struk suara (Rekomendasi #6)
// Membuktikan sebuah balok suara ADA di hash chain TPS tanpa membocorkan
// pilihan maupun identitas: hanya posisi blok, TPS, dan waktu tercatat.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeReceiptCode } from "@/lib/crypto/receipt";
import { clientIp, generalLimit } from "@/lib/server/rate-limit";

export async function GET(req: NextRequest) {
  // Anti-enumeration: maks 40 pengecekan/menit per IP
  const limit = generalLimit(`receipt:${clientIp(req.headers)}`, 40, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, found: false, message: `Terlalu banyak pengecekan. Coba lagi dalam ${Math.ceil(limit.retryAfterSec)} detik.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const code = normalizeReceiptCode(req.nextUrl.searchParams.get("code") ?? "");
  if (code.length !== 12) {
    return NextResponse.json(
      { ok: false, found: false, message: "Format kode struk salah — harus 12 karakter (contoh: 7A3F-9C2B-01DE)." },
      { status: 400 }
    );
  }

  const ballot = await db.ballotBox.findFirst({
    where: { ballotHash: { startsWith: code.toLowerCase() } },
    select: { tpsId: true, createdAt: true },
  });
  if (!ballot) {
    return NextResponse.json({
      ok: true,
      found: false,
      message: "Kode struk tidak ditemukan dalam kotak suara digital. Periksa kembali kode Anda atau laporkan ke Panwaslu.",
    });
  }

  // Posisi blok = peringkat waktu balok dalam TPS (urutan rantai)
  const [tps, earlierCount] = await Promise.all([
    db.tps.findUnique({ where: { id: ballot.tpsId }, select: { name: true } }),
    db.ballotBox.count({ where: { tpsId: ballot.tpsId, createdAt: { lte: ballot.createdAt } } }),
  ]);

  return NextResponse.json({
    ok: true,
    found: true,
    tpsName: tps?.name ?? ballot.tpsId,
    blockSeq: earlierCount,
    recordedAt: ballot.createdAt.toISOString(),
    message: "Struk terverifikasi — suara ini TERCATAT dalam hash chain kotak suara digital.",
  });
}
