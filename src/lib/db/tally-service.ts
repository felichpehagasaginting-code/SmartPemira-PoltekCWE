// ============================================================
// TALLY SERVICE — Rekapitulasi latest-ballot-wins & Hukum 3
// Re-vote model Estonia (keputusan diskusi 2026-10-20):
//  - Dari seluruh versi suara satu token, HANYA blok dengan voteVersion
//    tertinggi yang dihitung. Versi lama tetap ada di rantai (append-only)
//    tapi tidak masuk rekap.
//  - Token REVOKED (dicabut petugas): seluruh bloknya dikecualikan.
// HUKUM 5: hasil hanya boleh diakses setelah Pleno Unlocking.
// Integritas diverifikasi per rantai prodi (5 rantai virtual).
// ============================================================
import { db } from "@/lib/db";
import { SINGLE_CANDIDATE_THRESHOLD, type ElectionCategory } from "@/lib/constants/election";

export interface CandidateResult {
  candidateId: string | null;
  number: number;
  name: string;
  viceName: string | null;
  secondViceName: string | null; // khusus DPM: Ketua 2
  isEmptyBox: boolean;
  votes: number;
  percentage: number; // dari total suara sah kategori
}

export interface CategoryResult {
  category: ElectionCategory;
  studyProgramId: string | null;
  studyProgramName: string | null;
  totalValidVotes: number;
  results: CandidateResult[];
  /** Status penetapan hasil sesuai regulasi */
  outcome:
    | "TERPILIH"
    | "MANDAT_KEMBALI_KE_MUSYAWARAH_MAHASISWA"
    | "PEMENANG_SEMENTARA"
    | "STATUS_SERI_PENDING_PLENO";
  outcomeDetail: string;
}

export interface ChainIntegrity {
  tpsId: string;
  name: string;
  valid: boolean;
  checkedCount: number;
  headHash: string;
  brokenAtIndex: number | null;
}

export interface TallyReport {
  unlocked: boolean;
  unlockedAt: string | null;
  categories: CategoryResult[];
  integrity: { allValid: boolean; chains: ChainIntegrity[]; totalChecked: number };
  /** Statistik re-vote (Estonia) */
  revoteStats: {
    tokensVoted: number; // token dengan minimal satu suara
    tokensRevoted: number; // token yang pernah mengganti suara
    supersededBallots: number; // jumlah blok versi lama yang tidak dihitung
    lockedTokens: number; // token yang dikunci pemilih (final)
  };
  generatedAt: string;
}

export async function getTallyReport(): Promise<TallyReport> {
  const setting = await db.electionSetting.findUnique({ where: { id: "main" } });
  const [chains, tokens, allBallots] = await Promise.all([
    db.tps.findMany({ orderBy: { id: "asc" } }),
    db.votingToken.findMany({ select: { id: true, status: true, lockedAt: true, revoteCount: true } }),
    db.ballotBox.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const { verifyChain } = await import("@/lib/crypto/ballot-hash-chain");

  // ---------- Integritas per rantai prodi ----------
  const chainResults: ChainIntegrity[] = chains.map((tps) => {
    const chainBallots = allBallots
      .filter((b) => b.tpsId === tps.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const res = verifyChain(
      chainBallots.map((b) => ({
        id: b.id,
        category: b.category,
        candidateId: b.candidateId,
        isEmptyBox: b.isEmptyBox,
        createdAt: b.createdAt,
        ballotHash: b.ballotHash,
      })),
      tps.chainSalt,
      tps.lastChainHash
    );
    return {
      tpsId: tps.id,
      name: tps.name,
      valid: res.valid,
      checkedCount: res.checkedCount,
      headHash: tps.lastChainHash,
      brokenAtIndex: res.brokenAtIndex,
    };
  });

  // ---------- Latest-ballot-wins (Estonia) ----------
  const revokedTokenIds = new Set(tokens.filter((t) => t.status === "REVOKED").map((t) => t.id));
  const validBallots = allBallots.filter((b) => !b.tokenId || !revokedTokenIds.has(b.tokenId));

  // Versi maksimum per token
  const maxVersion = new Map<string, number>();
  for (const b of validBallots) {
    if (!b.tokenId) continue;
    const cur = maxVersion.get(b.tokenId) ?? 0;
    if (b.voteVersion > cur) maxVersion.set(b.tokenId, b.voteVersion);
  }

  const effective = validBallots.filter(
    (b) => !b.tokenId || b.voteVersion === (maxVersion.get(b.tokenId) ?? b.voteVersion)
  );

  const supersededBallots = validBallots.length - effective.length;

  const revoteStats = {
    tokensVoted: tokens.filter((t) => t.status === "USED").length,
    tokensRevoted: tokens.filter((t) => t.revoteCount > 0).length,
    supersededBallots,
    lockedTokens: tokens.filter((t) => t.lockedAt !== null && t.status !== "REVOKED").length,
  };

  const unlocked = setting?.plenoUnlocked ?? false;
  const generatedAt = new Date().toISOString();
  const integrity = {
    allValid: chainResults.every((c) => c.valid),
    chains: chainResults,
    totalChecked: chainResults.reduce((s, c) => s + c.checkedCount, 0),
  };

  if (!unlocked) {
    // HUKUM 5: sebelum pleno, jangan pernah bocorkan distribusi suara.
    return {
      unlocked: false,
      unlockedAt: setting?.plenoUnlockedAt?.toISOString() ?? null,
      categories: [],
      integrity,
      revoteStats,
      generatedAt,
    };
  }

  const [presmaCandidates, dpmCandidates, himaCandidates] = await Promise.all([
    db.candidate.findMany({ where: { category: "PRESMA" }, orderBy: { number: "asc" } }),
    db.candidate.findMany({ where: { category: "DPM" }, orderBy: { number: "asc" } }),
    db.candidate.findMany({ where: { category: "HIMA" }, orderBy: { number: "asc" } }),
  ]);

  // ---------- Agregasi suara efektif (in-memory) ----------
  // Karena rantai sekarang per prodi, ballot.tpsId == prodi pemilih —
  // atribusi suara HIMA (termasuk kotak kosong) menjadi PERSIS per prodi.
  const countInstitution = (category: string) => {
    const map = new Map<string, number>(); // candidateId | "__EMPTY__" → count
    for (const b of effective) {
      if (b.category !== category) continue;
      const key = b.isEmptyBox ? "__EMPTY__" : (b.candidateId ?? "__EMPTY__");
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  };

  const countHimaPerProdi = (prodiId: string) => {
    const map = new Map<string, number>();
    for (const b of effective) {
      if (b.category !== "HIMA" || b.tpsId !== prodiId) continue;
      const key = b.isEmptyBox ? "__EMPTY__" : (b.candidateId ?? "__EMPTY__");
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  };

  const categories: CategoryResult[] = [];

  // Urutan laporan mengikuti urutan pemungutan resmi: DPM → BEM → HIMA
  categories.push(buildCategoryResult("DPM", null, null, dpmCandidates, countInstitution("DPM")));
  categories.push(buildCategoryResult("PRESMA", null, null, presmaCandidates, countInstitution("PRESMA")));

  const prodiIds = Array.from(
    new Set(himaCandidates.map((c) => c.studyProgramId).filter(Boolean) as string[])
  );
  for (const prodiId of prodiIds) {
    const prodi = await db.studyProgram.findUnique({ where: { id: prodiId } });
    const cands = himaCandidates.filter((c) => c.studyProgramId === prodiId);
    categories.push(
      buildCategoryResult("HIMA", prodiId, prodi?.name ?? prodiId, cands, countHimaPerProdi(prodiId))
    );
  }

  return {
    unlocked: true,
    unlockedAt: setting?.plenoUnlockedAt?.toISOString() ?? null,
    categories,
    integrity,
    revoteStats,
    generatedAt,
  };
}

function buildCategoryResult(
  category: ElectionCategory,
  studyProgramId: string | null,
  studyProgramName: string | null,
  candidates: Array<{
    id: string;
    number: number;
    presidentName: string;
    viceName: string | null;
    secondViceName: string | null;
    isEmptyBox: boolean;
  }>,
  voteMap: Map<string, number>
): CategoryResult {
  const results: CandidateResult[] = candidates.map((c) => {
    const key = c.isEmptyBox ? "__EMPTY__" : c.id;
    const votes = voteMap.get(key) ?? 0;
    return {
      candidateId: c.isEmptyBox ? null : c.id,
      number: c.number,
      name: c.presidentName,
      viceName: c.viceName,
      secondViceName: c.secondViceName,
      isEmptyBox: c.isEmptyBox,
      votes,
      percentage: 0, // diisi setelah total diketahui
    };
  });

  const totalValidVotes = results.reduce((s, r) => s + r.votes, 0);
  for (const r of results) {
    r.percentage = totalValidVotes > 0 ? (r.votes / totalValidVotes) * 100 : 0;
  }

  // ---------- HUKUM 3 & 7.3 ----------
  const realCandidates = results.filter((r) => !r.isEmptyBox);
  const sorted = [...results].sort((a, b) => b.votes - a.votes);

  let outcome: CategoryResult["outcome"] = "PEMENANG_SEMENTARA";
  let outcomeDetail = "";

  if (realCandidates.length === 1) {
    // Calon tunggal: terpilih HANYA JIKA > 50% dari total suara sah
    const solo = realCandidates[0];
    if (solo.percentage > SINGLE_CANDIDATE_THRESHOLD) {
      outcome = "TERPILIH";
      outcomeDetail = `Calon tunggal memperoleh ${solo.percentage.toFixed(2)}% (> 50%) — dinyatakan TERPILIH sesuai Pasal 9 ayat (3) UUD IKM.`;
    } else {
      outcome = "MANDAT_KEMBALI_KE_MUSYAWARAH_MAHASISWA";
      outcomeDetail = `Calon tunggal hanya memperoleh ${solo.percentage.toFixed(2)}% (≤ 50%) — status MANDAT KEMBALI KE MUSYAWARAH MAHASISWA sesuai Pasal 9 ayat (4) UUD IKM.`;
    }
  } else if (sorted.length >= 2 && sorted[0].votes === sorted[1].votes && sorted[0].votes > 0) {
    outcome = "STATUS_SERI_PENDING_PLENO";
    outcomeDetail = `Suara teratas seri (${sorted[0].votes} suara) — status STATUS_SERI_PENDING_PLENO, diselesaikan melalui sidang pleno (Aturan Bisnis 7.3).`;
  } else if (totalValidVotes === 0) {
    outcomeDetail = "Belum ada suara masuk untuk kategori ini.";
  } else {
    const winner = sorted[0];
    outcomeDetail = `Pemenang sementara: nomor urut ${winner.number} (${winner.name}) dengan ${winner.votes} suara (${winner.percentage.toFixed(2)}%).`;
  }

  return {
    category,
    studyProgramId,
    studyProgramName,
    totalValidVotes,
    results,
    outcome,
    outcomeDetail,
  };
}
