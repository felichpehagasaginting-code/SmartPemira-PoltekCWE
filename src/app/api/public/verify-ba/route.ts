// GET /api/public/verify-ba?sig=<hex> — Verifikasi publik tanda tangan Berita Acara (Rekomendasi #9)
// Publik membandingkan signature pada dokumen dengan perhitungan ulang
// dari kondisi kotak suara saat ini. Tanpa sesi, tanpa rahasia.
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { getTallyReport } from "@/lib/db/tally-service";
import { clientIp, generalLimit } from "@/lib/server/rate-limit";

export async function GET(req: NextRequest) {
  const limit = generalLimit(`verifyba:${clientIp(req.headers)}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, valid: false, message: `Terlalu banyak verifikasi. Coba lagi dalam ${Math.ceil(limit.retryAfterSec)} detik.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const sig = (req.nextUrl.searchParams.get("sig") ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(sig)) {
    return NextResponse.json({ ok: false, valid: false, message: "Format tanda tangan tidak valid (harus 64 karakter hex)." }, { status: 400 });
  }

  const setting = await db.electionSetting.findUnique({ where: { id: "main" } });
  if (!setting?.plenoUnlocked) {
    return NextResponse.json({
      ok: true,
      locked: true,
      valid: false,
      message: "Kotak suara masih terkunci (Pleno Vault). Verifikasi Berita Acara dapat dilakukan setelah Pleno Unlocking.",
    });
  }

  // Hitung ulang kanonikal dari kondisi DATABASE saat ini
  const tally = await getTallyReport();
  const [dptTotal, voted, ballots, tokenUsed, tps] = await Promise.all([
    db.voter.count(),
    db.voter.count({ where: { hasVoted: true } }),
    db.ballotBox.count(),
    db.votingToken.count({ where: { status: "USED" } }),
    db.tps.findFirst(),
  ]);
  const flat = tally.categories.flatMap((cat) =>
    cat.results.map((r) => `${cat.category}|${r.number ?? 0}|${r.votes}|${r.percentage.toFixed(2)}`).sort()
  );
  const canonical = JSON.stringify({
    dptTotal,
    voted,
    ballots,
    tokenUsed,
    chainHead: tally.integrity.headHash,
    chainValid: tally.integrity.valid,
    plenoUnlockedAt: setting.plenoUnlockedAt?.toISOString() ?? null,
    tps: tps?.id ?? null,
    results: flat,
  });
  const recomputed = createHash("sha256").update(canonical).digest("hex");

  if (recomputed !== sig) {
    return NextResponse.json({
      ok: true,
      locked: false,
      valid: false,
      message: "TANDA TANGAN TIDAK COCOK dengan kondisi kotak suara saat ini. Dokumen berpotensi dipalsukan atau hasil telah berubah — laporkan ke Panwaslu.",
    });
  }

  return NextResponse.json({
    ok: true,
    locked: false,
    valid: true,
    summary: {
      tpsName: tps?.name ?? "",
      chainHead: tally.integrity.headHash,
      chainValid: tally.integrity.valid,
      checkedBlocks: tally.integrity.checkedCount,
      totals: { dptTotal, voted, ballots, tokenUsed },
      plenoUnlockedAt: setting.plenoUnlockedAt?.toISOString() ?? null,
    },
    message: "TANDA TANGAN TERVERIFIKASI — dokumen Berita Acara sah dan sesuai kondisi kotak suara digital.",
  });
}
