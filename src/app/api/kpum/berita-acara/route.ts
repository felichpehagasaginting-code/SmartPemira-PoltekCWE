// GET /api/kpum/berita-acara — Dokumen Berita Acara C-KWE bertanda tangan kriptografis (Rekomendasi #9)
// Signature deterministik atas kanonikal bersama (lib/server/ba-canonical.ts):
// rekap latest-wins + kelima head rantai prodi + statistik re-vote.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/auth";
import { getTallyReport } from "@/lib/db/tally-service";
import { buildBaCanonical, collectBaTotals, computeBaSignature } from "@/lib/server/ba-canonical";
import { getBaPublicKeyPem, signBaCanonical, verifyBaSignature } from "@/lib/server/ba-signing";

export async function GET() {
  const gate = await requireRole(["KPUM", "ITPO"]);
  if ("error" in gate) return gate.error;

  const setting = await db.electionSetting.findUnique({ where: { id: "main" } });
  if (!setting?.plenoUnlocked) {
    return NextResponse.json(
      { ok: false, locked: true, message: "Berita Acara final hanya tersedia setelah Pleno Unlocking (FR-06.3)." },
      { status: 423 }
    );
  }

  const tally = await getTallyReport();
  const totals = await collectBaTotals();
  const [chains, kpumChair, panwasluChair] = await Promise.all([
    db.tps.findMany({ orderBy: { id: "asc" } }),
    db.operator.findFirst({ where: { role: "KPUM", isActive: true } }),
    db.operator.findFirst({ where: { role: "PANWASLU", isActive: true } }),
  ]);

  const canonical = buildBaCanonical({
    ...totals,
    tally,
    plenoUnlockedAt: setting.plenoUnlockedAt ?? null,
  });
  const signature = computeBaSignature(canonical);
  // Rekomendasi #2: tanda tangan Ed25519 DIFIKSASI saat Pleno Unlock (attestation
  // resmi tersimpan); BA yang dihasilkan sebelum upgrade ini ditandatangani
  // sekarang sekali saja. Verifikasi ulang terhadap kanonikal terkini membuat
  // pergeseran kondisi kotak suara setelah penandatanganan langsung terlihat.
  let storedEdSig = setting.baSignatureEd25519;
  if (!storedEdSig) {
    storedEdSig = signBaCanonical(canonical);
    await db.electionSetting.update({
      where: { id: "main" },
      data: { baSignatureEd25519: storedEdSig, baSignedAt: setting.baSignedAt ?? new Date() },
    });
  }
  const ed25519Consistent = verifyBaSignature(canonical, storedEdSig);

  return NextResponse.json({
    ok: true,
    locked: false,
    document: {
      electionName: "Pemira Poltek CWE — Pemungutan Suara Online",
      plenoUnlockedAt: setting.plenoUnlockedAt?.toISOString() ?? null,
      generatedAt: new Date().toISOString(),
      totals: {
        ...totals,
        absent: totals.dptTotal - totals.voted,
        turnoutPct: totals.dptTotal > 0 ? (totals.voted / totals.dptTotal) * 100 : 0,
      },
      revoteStats: tally.revoteStats,
      categories: tally.categories.map((cat) => ({
        category: cat.category,
        outcome: cat.outcome,
        results: cat.results.map((r) => ({ number: r.number, name: r.name, votes: r.votes, percentage: r.percentage, isEmptyBox: r.isEmptyBox })),
      })),
      integrity: tally.integrity,
      chains: chains.map((t) => ({ id: t.id, name: t.name, location: t.location, headHash: t.lastChainHash })),
      signatories: {
        kpum: kpumChair?.fullName ?? "Ketua KPUM",
        panwaslu: panwasluChair?.fullName ?? "Ketua Panwaslu",
      },
      signature,
      signatureEd25519: storedEdSig,
      baSignedAt: setting.baSignedAt?.toISOString() ?? null,
      ed25519Consistent,
      publicKeyPem: getBaPublicKeyPem(),
      algorithm: "SHA-256 kanonikal + Ed25519 (kunci publik dipublikasikan — rekap latest-wins + 5 head rantai prodi + statistik re-vote)",
    },
  });
}
