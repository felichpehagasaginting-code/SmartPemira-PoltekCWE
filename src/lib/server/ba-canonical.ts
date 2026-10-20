// ============================================================
// BERITA ACARA C-KWE — Kanonikal & Tanda Tangan Bersama (Rekomendasi #9)
// Dipakai kedua sisi: pembuatan (KPUM) dan verifikasi publik (/verify).
// Sama saja datanya, sama pula tandanya — tanpa rahasia.
// Pemira 100% online: kanonikal memuat KELIMA head rantai prodi + statistik
// re-vote, sehingga pemalsuan dokumen atau perubahan hasil apapun terdeteksi.
// ============================================================
import { createHash } from "crypto";
import { db } from "@/lib/db";
import type { TallyReport } from "@/lib/db/tally-service";

export interface BaCanonicalInput {
  dptTotal: number;
  voted: number;
  ballots: number;
  tokenUsed: number;
  tally: TallyReport;
  plenoUnlockedAt: Date | null;
}

export async function collectBaTotals() {
  const [dptTotal, voted, ballots, tokenUsed] = await Promise.all([
    db.voter.count(),
    db.voter.count({ where: { hasVoted: true } }),
    db.ballotBox.count(),
    db.votingToken.count({ where: { status: "USED" } }),
  ]);
  return { dptTotal, voted, ballots, tokenUsed };
}

/** Representasi deterministik dari seluruh angka hasil — sumber tanda tangan. */
export function buildBaCanonical(input: BaCanonicalInput): string {
  const flat = input.tally.categories
    .flatMap((cat) =>
      cat.results.map((r) => `${cat.category}|${r.number ?? 0}|${r.votes}|${r.percentage.toFixed(2)}`)
    )
    .sort();
  const chains = input.tally.integrity.chains
    .map((c) => `${c.tpsId}|${c.headHash.toLowerCase()}|${c.checkedCount}`)
    .sort();
  return JSON.stringify({
    dptTotal: input.dptTotal,
    voted: input.voted,
    ballots: input.ballots,
    tokenUsed: input.tokenUsed,
    chainHeads: chains,
    chainValid: input.tally.integrity.allValid,
    totalChecked: input.tally.integrity.totalChecked,
    revote: input.tally.revoteStats,
    plenoUnlockedAt: input.plenoUnlockedAt?.toISOString() ?? null,
    results: flat,
  });
}

export function computeBaSignature(canonical: string): string {
  return createHash("sha256").update(canonical).digest("hex");
}
