// ============================================================
// BALLOT HASH CHAIN — SHA-256 rantai integritas per TPS
// PRD.md 4.1: deteksi manipulasi suara pada level database.
// Hukum 2: ballot_hash = SHA256(prevHash + id + category + candidateId + ts + salt)
// ============================================================
import { createHash } from "crypto";

/**
 * Menghitung hash berantai untuk satu surat suara baru.
 * prevChainHash = "" berarti suara pertama di TPS tersebut (genesis).
 */
export function computeBallotHash(params: {
  prevChainHash: string;
  ballotId: string;
  category: string;
  candidateId: string | null;
  isEmptyBox: boolean;
  timestamp: Date;
  tpsSalt: string;
}): string {
  const payload = [
    params.prevChainHash,
    params.ballotId,
    params.category,
    params.candidateId ?? "NULL",
    params.isEmptyBox ? "EMPTY_BOX" : "CANDIDATE",
    params.timestamp.toISOString(),
    params.tpsSalt,
  ].join("||");

  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Verifikasi integritas seluruh rantai suara pada satu TPS.
 * Dipanggil oleh HashChainVerifier di Monitor Panwaslu.
 */
export function verifyChain(
  ballots: Array<{
    id: string;
    category: string;
    candidateId: string | null;
    isEmptyBox: boolean;
    createdAt: Date;
    ballotHash: string;
  }>,
  tpsSalt: string,
  expectedFinalHash: string
): { valid: boolean; checkedCount: number; brokenAtIndex: number | null } {
  let prev = "";
  for (let i = 0; i < ballots.length; i++) {
    const b = ballots[i];
    const expected = computeBallotHash({
      prevChainHash: prev,
      ballotId: b.id,
      category: b.category,
      candidateId: b.candidateId,
      isEmptyBox: b.isEmptyBox,
      timestamp: b.createdAt,
      tpsSalt,
    });
    if (expected !== b.ballotHash) {
      return { valid: false, checkedCount: i, brokenAtIndex: i };
    }
    prev = expected;
  }
  const headValid = ballots.length === 0 ? expectedFinalHash === "" : prev === expectedFinalHash;
  return { valid: headValid, checkedCount: ballots.length, brokenAtIndex: null };
}
