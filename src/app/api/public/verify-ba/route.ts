// GET /api/public/verify-ba?sig=<hex> — Verifikasi publik tanda tangan Berita Acara (Rekomendasi #9)
// Publik membandingkan signature pada dokumen dengan perhitungan ulang
// dari kondisi kotak suara saat ini via kanonikal bersama. Tanpa sesi, tanpa rahasia.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTallyReport } from "@/lib/db/tally-service";
import { buildBaCanonical, collectBaTotals, computeBaSignature } from "@/lib/server/ba-canonical";
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
  const totals = await collectBaTotals();
  const canonical = buildBaCanonical({
    ...totals,
    tally,
    plenoUnlockedAt: setting.plenoUnlockedAt ?? null,
  });
  const recomputed = computeBaSignature(canonical);

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
      chainValid: tally.integrity.allValid,
      chains: tally.integrity.chains.map((c) => ({ id: c.tpsId, name: c.name, headHash: c.headHash, checked: c.checkedCount })),
      checkedBlocks: tally.integrity.totalChecked,
      revoteStats: tally.revoteStats,
      totals,
      plenoUnlockedAt: setting.plenoUnlockedAt?.toISOString() ?? null,
    },
    message: "TANDA TANGAN TERVERIFIKASI — dokumen Berita Acara sah dan sesuai kondisi kotak suara digital.",
  });
}
