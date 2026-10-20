// GET /api/kpum/berita-acara — Dokumen Berita Acara C-KWE bertanda tangan kriptografis (Rekomendasi #9)
// Signature deterministik: SHA-256 atas kanonikal hasil rekap + chain head + total.
// Sama saja datanya, sama pula tandanya — publik dapat memverifikasi ulang tanpa rahasia.
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/auth";
import { getTallyReport } from "@/lib/db/tally-service";

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
  const [dptTotal, voted, ballots, tokenUsed, tps, kpumChair, panwasluChair] = await Promise.all([
    db.voter.count(),
    db.voter.count({ where: { hasVoted: true } }),
    db.ballotBox.count(),
    db.votingToken.count({ where: { status: "USED" } }),
    db.tps.findFirst(),
    db.operator.findFirst({ where: { role: "KPUM", isActive: true } }),
    db.operator.findFirst({ where: { role: "PANWASLU", isActive: true } }),
  ]);

  // Kanonikal: representasi deterministik dari seluruh angka hasil
  const flat = tally.categories.flatMap((cat) =>
    cat.results
      .map((r) => `${cat.category}|${r.number ?? 0}|${r.votes}|${r.percentage.toFixed(2)}`)
      .sort()
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
  const signature = createHash("sha256").update(canonical).digest("hex");

  return NextResponse.json({
    ok: true,
    locked: false,
    document: {
      tpsName: tps?.name ?? "",
      tpsLocation: tps?.location ?? "",
      plenoUnlockedAt: setting.plenoUnlockedAt?.toISOString() ?? null,
      generatedAt: new Date().toISOString(),
      totals: { dptTotal, voted, absent: dptTotal - voted, ballots, tokenUsed, turnoutPct: dptTotal > 0 ? (voted / dptTotal) * 100 : 0 },
      categories: tally.categories.map((cat) => ({
        category: cat.category,
        outcome: cat.outcome,
        results: cat.results.map((r) => ({ number: r.number, name: r.name, votes: r.votes, percentage: r.percentage, isEmptyBox: r.isEmptyBox })),
      })),
      integrity: tally.integrity,
      signatories: {
        kpum: kpumChair?.fullName ?? "Ketua KPUM",
        panwaslu: panwasluChair?.fullName ?? "Ketua Panwaslu",
      },
      signature,
      algorithm: "SHA-256 (kanonikal rekap + chain head)",
    },
  });
}
