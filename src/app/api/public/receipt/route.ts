// GET /api/public/receipt?code=XXXX-XXXX-XXXX — Verifikasi struk suara (Rekomendasi #6)
// Membuktikan sebuah balok suara ADA di rantai hash prodi tanpa membocorkan
// pilihan maupun identitas: posisi blok, rantai, waktu, dan STATUS versi suara
// (AKTIF = suara terakhir yang dihitung / DIGANTI = ada re-vote lebih baru /
// DICABUT = token dicabut petugas — blok tidak dihitung).
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
    select: { tpsId: true, createdAt: true, tokenId: true, voteVersion: true },
  });
  if (!ballot) {
    return NextResponse.json({
      ok: true,
      found: false,
      message: "Kode struk tidak ditemukan dalam kotak suara digital. Periksa kembali kode Anda atau laporkan ke Panwaslu.",
    });
  }

  // Posisi blok = peringkat waktu balok dalam rantai prodi (urutan rantai)
  const [tps, earlierCount] = await Promise.all([
    db.tps.findUnique({ where: { id: ballot.tpsId }, select: { name: true } }),
    db.ballotBox.count({ where: { tpsId: ballot.tpsId, createdAt: { lte: ballot.createdAt } } }),
  ]);

  // Status versi suara (latest-ballot-wins) — tanpa identitas:
  // bandingkan versi balok ini vs versi terakhir token yang sama.
  let voteStatus: "AKTIF" | "DIGANTI" | "DICABUT" = "AKTIF";
  let voteVersion = ballot.voteVersion;
  if (ballot.tokenId) {
    const token = await db.votingToken.findUnique({
      where: { id: ballot.tokenId },
      select: { status: true, revoteCount: true },
    });
    if (token?.status === "REVOKED") {
      voteStatus = "DICABUT";
    } else {
      const latestVersion = token ? token.revoteCount + 1 : ballot.voteVersion;
      if (ballot.voteVersion < latestVersion) voteStatus = "DIGANTI";
      voteVersion = ballot.voteVersion;
    }
  }

  const statusDetail: Record<typeof voteStatus, string> = {
    AKTIF: "Suara ini adalah versi TERAKHIR pemilik token — SAH dan dihitung dalam rekapitulasi.",
    DIGANTI: `Suara ini sudah DIGANTI versi lebih baru (re-vote model Estonia). Hanya versi terakhir yang dihitung.`,
    DICABUT: "Token pemilik struk ini telah DICABUT petugas PPUR — seluruh blok suaranya dikecualikan dari rekapitulasi.",
  };

  return NextResponse.json({
    ok: true,
    found: true,
    tpsName: tps?.name ?? ballot.tpsId,
    blockSeq: earlierCount,
    voteVersion,
    voteStatus,
    statusDetail: statusDetail[voteStatus],
    recordedAt: ballot.createdAt.toISOString(),
    message:
      voteStatus === "AKTIF"
        ? "Struk terverifikasi — suara ini TERCATAT dan AKTIF dalam rantai hash."
        : `Struk terverifikasi dalam rantai hash, namun status suara: ${voteStatus}.`,
  });
}
