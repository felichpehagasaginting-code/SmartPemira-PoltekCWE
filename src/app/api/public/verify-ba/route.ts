// GET /api/public/verify-ba?sig=<hex>[&edsig=<base64>] — Verifikasi publik Berita Acara (Rekomendasi #9 + #2)
// Dua lapis:
//  - sig  : SHA-256 kanonikal — integritas dokumen terhadap kondisi DB saat ini.
//  - edsig: tanda tangan Ed25519 — AUTHENTIKASI PENGARANG (kunci publik
//    dipublikasikan; tanpa rahasia). Tanpa kunci privat panitia, dokumen palsu
//    mustahil menghasilkan edsig yang valid atas kanonikalnya.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTallyReport } from "@/lib/db/tally-service";
import { buildBaCanonical, collectBaTotals, computeBaSignature } from "@/lib/server/ba-canonical";
import { verifyBaSignature } from "@/lib/server/ba-signing";
import { parseSignaturesJson, verifyMultiSignatures } from "@/lib/crypto/multisig";
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
  const edsig = (req.nextUrl.searchParams.get("edsig") ?? "").trim();
  const isCurrentMode = req.nextUrl.searchParams.get("current") === "true" || (!sig && !edsig);
  const hasEdsig = edsig.length > 0;
  if (!isCurrentMode && !/^[0-9a-f]{64}$/.test(sig) && !hasEdsig) {
    return NextResponse.json(
      { ok: false, valid: false, message: "Sertakan tanda tangan: ?sig=<64 hex> dan/atau ?edsig=<base64>." },
      { status: 400 }
    );
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
  const sha256Valid = !/^[0-9a-f]{64}$/.test(sig) || recomputed === sig;
  const ed25519Valid = hasEdsig ? verifyBaSignature(canonical, edsig) : null;
  const valid = sha256Valid && ed25519Valid !== false;

  if (!valid) {
    return NextResponse.json({
      ok: true,
      locked: false,
      valid: false,
      checks: { sha256: sha256Valid, ed25519: ed25519Valid },
      message: !sha256Valid
        ? "TANDA TANGAN SHA-256 TIDAK COCOK dengan kondisi kotak suara saat ini — dokumen berpotensi dipalsukan atau hasil telah berubah. Laporkan ke Panwaslu."
        : "TANDA TANGAN ED25519 TIDAK SAH — dokumen tidak berasal dari kunci privat panitia pemilihan. DOKUMEN PALSU.",
    });
  }

  const multisigEntries = parseSignaturesJson(setting.baSignaturesJson);
  const multisigVerification = verifyMultiSignatures(canonical, multisigEntries);

  return NextResponse.json({
    ok: true,
    locked: false,
    valid: true,
    checks: { sha256: sha256Valid, ed25519: ed25519Valid },
    signatureSha256: recomputed,
    signatureEd25519: setting.baSignatureEd25519,
    multisig: multisigVerification,
    signatures: multisigEntries,
    summary: {
      chainValid: tally.integrity.allValid,
      chains: tally.integrity.chains.map((c) => ({ id: c.tpsId, name: c.name, headHash: c.headHash, checked: c.checkedCount })),
      checkedBlocks: tally.integrity.totalChecked,
      revoteStats: tally.revoteStats,
      totals,
      plenoUnlockedAt: setting.plenoUnlockedAt?.toISOString() ?? null,
    },
    message: ed25519Valid
      ? "TANDA TANGAN TERVERIFIKASI — sah (SHA-256 cocok + Ed25519 sahih dari kunci panitia)."
      : "TANDA TANGAN TERVERIFIKASI — SHA-256 cocok dengan kondisi kotak suara digital.",
  });
}
