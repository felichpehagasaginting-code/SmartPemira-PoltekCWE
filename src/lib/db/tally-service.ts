// ============================================================
// TALLY SERVICE — Rekapitulasi & Hukum 3 (Calon Tunggal / Seri)
// HUKUM 5: hasil hanya boleh diakses setelah Pleno Unlocking.
// ============================================================
import { db } from "@/lib/db";
import { SINGLE_CANDIDATE_THRESHOLD, type ElectionCategory } from "@/lib/constants/election";

export interface CandidateResult {
  candidateId: string | null;
  number: number;
  name: string;
  viceName: string | null;
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

export interface TallyReport {
  unlocked: boolean;
  unlockedAt: string | null;
  categories: CategoryResult[];
  integrity: { valid: boolean; checkedCount: number; headHash: string };
  generatedAt: string;
}

export async function getTallyReport(): Promise<TallyReport> {
  const setting = await db.electionSetting.findUnique({ where: { id: "main" } });
  const tps = await db.tps.findFirst();

  const integrityBallots = await db.ballotBox.findMany({
    where: { tpsId: tps?.id },
    orderBy: { createdAt: "asc" },
  });

  // Verifikasi hash chain (dilakukan selalu — bagian audit)
  const { verifyChain } = await import("@/lib/crypto/ballot-hash-chain");
  const integrity = verifyChain(
    integrityBallots.map((b) => ({
      id: b.id,
      category: b.category,
      candidateId: b.candidateId,
      isEmptyBox: b.isEmptyBox,
      createdAt: b.createdAt,
      ballotHash: b.ballotHash,
    })),
    tps?.chainSalt ?? "",
    tps?.lastChainHash ?? ""
  );

  const unlocked = setting?.plenoUnlocked ?? false;
  const generatedAt = new Date().toISOString();

  if (!unlocked) {
    // HUKUM 5: sebelum pleno, jangan pernah bocorkan distribusi suara.
    return {
      unlocked: false,
      unlockedAt: setting?.plenoUnlockedAt?.toISOString() ?? null,
      categories: [],
      integrity: {
        valid: integrity.valid,
        checkedCount: integrity.checkedCount,
        headHash: tps?.lastChainHash ?? "",
      },
      generatedAt,
    };
  }

  const [presmaCandidates, dpmCandidates, himaCandidates] = await Promise.all([
    db.candidate.findMany({ where: { category: "PRESMA" }, orderBy: { number: "asc" } }),
    db.candidate.findMany({ where: { category: "DPM" }, orderBy: { number: "asc" } }),
    db.candidate.findMany({ where: { category: "HIMA" }, orderBy: { number: "asc" } }),
  ]);

  const himaVotes = await db.ballotBox.groupBy({
    by: ["candidateId"],
    where: { category: "HIMA" },
    _count: { _all: true },
  });

  const categories: CategoryResult[] = [];

  // ---------- PRESMA ----------
  categories.push(await buildCategoryResult("PRESMA", null, null, presmaCandidates));

  // ---------- DPM ----------
  categories.push(await buildCategoryResult("DPM", null, null, dpmCandidates));

  // ---------- HIMA per prodi ----------
  const prodiIds = Array.from(
    new Set(himaCandidates.map((c) => c.studyProgramId).filter(Boolean) as string[])
  );
  // Total suara kotak kosong kategori HIMA. Atribusi ke prodi bersangkutan:
  // karena suara anonim tidak membawa prodi, kotak kosong dialokasikan ke
  // prodi dengan kandidat tunggal (satu-satunya skenario yang memunculkan
  // kotak kosong). Pada seed ini hanya BKS yang calon tunggal.
  const himaEmptyTotal =
    himaVotes.find((v) => v.candidateId === null && v.isEmptyBox === true)?._count._all ?? 0;
  for (const prodiId of prodiIds) {
    const prodi = await db.studyProgram.findUnique({ where: { id: prodiId } });
    const cands = himaCandidates.filter((c) => c.studyProgramId === prodiId);
    const isSingleCandidateProdi = cands.filter((c) => !c.isEmptyBox).length === 1;
    categories.push(
      await buildCategoryResult(
        "HIMA",
        prodiId,
        prodi?.name ?? prodiId,
        cands,
        isSingleCandidateProdi ? himaEmptyTotal : 0
      )
    );
  }

  return {
    unlocked: true,
    unlockedAt: setting?.plenoUnlockedAt?.toISOString() ?? null,
    categories,
    integrity: {
      valid: integrity.valid,
      checkedCount: integrity.checkedCount,
      headHash: tps?.lastChainHash ?? "",
    },
    generatedAt,
  };
}

async function buildCategoryResult(
  category: ElectionCategory,
  studyProgramId: string | null,
  studyProgramName: string | null,
  candidates: Array<{
    id: string;
    number: number;
    presidentName: string;
    viceName: string | null;
    isEmptyBox: boolean;
  }>,
  forcedEmptyBoxVotes: number = 0
): Promise<CategoryResult> {
  // Untuk HIMA: suara kotak kosong perlu dipetakan ke prodi mana pun karena
  // kotak kosong tidak membawa prodi; total per prodi dihitung dari kandidat + share kotak kosong.
  const voteCounts = await db.ballotBox.groupBy({
    by: ["candidateId", "isEmptyBox"],
    where: { category },
    _count: { _all: true },
  });

  const countFor = (candidateId: string | null) =>
    voteCounts.find((v) => v.candidateId === candidateId && v.isEmptyBox === (candidateId === null))
      ?._count._all ?? 0;

  const results: CandidateResult[] = candidates.map((c) => {
    const isEmptyRow = c.isEmptyBox;
    // Kotak kosong: gunakan atribusi paksa (prodi kandidat tunggal) bila tersedia
    const votes = isEmptyRow
      ? Math.max(countFor(null), forcedEmptyBoxVotes)
      : countFor(c.id);
    return {
      candidateId: c.isEmptyBox ? null : c.id,
      number: c.number,
      name: c.presidentName,
      viceName: c.viceName,
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
  const emptyBox = results.find((r) => r.isEmptyBox);
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
