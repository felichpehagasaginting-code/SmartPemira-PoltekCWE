// ============================================================
// BALLOT SUBMISSION SERVICE — Transaksi Atomik (PROMPT.md Hukum 2)
// Satu transaksi DB atomik: validasi token → validasi prodi →
// simpan 3 surat suara berantai → hanguskan token → tandai DPT → audit log.
// ============================================================
import { db } from "@/lib/db";
import { hashToken, generateVotingToken } from "@/lib/crypto/token-generator";
import { computeBallotHash } from "@/lib/crypto/ballot-hash-chain";
import { formatReceiptCode } from "@/lib/crypto/receipt";
import { jitteredTimestamp } from "@/lib/crypto/time-jitter";
import { TOKEN_TTL_MINUTES } from "@/lib/constants/election";

export interface BallotSelections {
  presmaCandidateId: string;
  dpmCandidateId: string;
  /** null = memilih KOTAK KOSONG di kategori Hima (calon tunggal) */
  himaCandidateId: string | null;
}

export type SubmitResult =
  | { ok: true; message: string; receiptCode: string; tpsName: string }
  | { ok: false; code: "INVALID_TOKEN" | "EXPIRED_TOKEN" | "USED_TOKEN" | "FROZEN" | "VOTING_CLOSED" | "PRODI_MISMATCH" | "INTERNAL"; message: string };

/**
 * Submit seluruh surat suara seorang pemilih secara ATOMIK.
 * HUKUM 2 — urutan wajib:
 *  1. Validasi token ACTIVE & belum melewati expires_at
 *  2. Server-side assertion prodi (Hukum 4)
 *  3. Simpan 3 ballot + hash chaining per TPS
 *  4. Token → USED
 *  5. Voter → SUDAH_MEMILIH (via pendingTokenHash, tanpa menyentuh ballot)
 *  6. Audit log append-only
 */
export async function submitBallots(
  rawToken: string,
  selections: BallotSelections
): Promise<SubmitResult> {
  const tokenHash = hashToken(rawToken);

  // ---------- Preliminary checks (di luar transaksi, cepat gagal) ----------
  const setting = await db.electionSetting.findUnique({ where: { id: "main" } });
  if (!setting) return { ok: false, code: "INTERNAL", message: "Konfigurasi eleksi belum diinisialisasi." };
  if (setting.emergencyFreeze)
    return { ok: false, code: "FROZEN", message: "EMERGENCY FREEZE aktif. Pemungutan suara dihentikan sementara oleh Panwaslu/KPUM." };
  if (!setting.votingOpen)
    return { ok: false, code: "VOTING_CLOSED", message: "Pemungutan suara telah ditutup oleh KPUM." };

  try {
    let finalChainHash = "";
    let tpsNameOut = "TPS";
    await db.$transaction(async (tx) => {
      // 1. Validasi token
      const token = await tx.votingToken.findUnique({ where: { tokenHash } });
      if (!token) throw new Error("INVALID_TOKEN");
      if (token.status === "USED") throw new Error("USED_TOKEN");
      if (token.status !== "ACTIVE" || token.expiresAt.getTime() < Date.now())
        throw new Error("EXPIRED_TOKEN");

      // 2. Server-side assertion prodi (Hukum 4) — kandidat Hima milik prodi token
      const himaCandidate = selections.himaCandidateId
        ? await tx.candidate.findUnique({ where: { id: selections.himaCandidateId } })
        : null;
      if (himaCandidate) {
        if (himaCandidate.category !== "HIMA") throw new Error("PRODI_MISMATCH");
        if (himaCandidate.studyProgramId !== token.studyProgramId) throw new Error("PRODI_MISMATCH");
      }

      // Kandidat PRESMA & DPM harus ada
      const [presma, dpm] = await Promise.all([
        tx.candidate.findUnique({ where: { id: selections.presmaCandidateId } }),
        tx.candidate.findUnique({ where: { id: selections.dpmCandidateId } }),
      ]);
      if (!presma || presma.category !== "PRESMA") throw new Error("PRODI_MISMATCH");
      if (!dpm || dpm.category !== "DPM") throw new Error("PRODI_MISMATCH");

      // 3. Simpan 3 surat suara dengan jitter + hash chaining
      const tps = await tx.tps.findUnique({ where: { id: token.tpsId } });
      if (!tps) throw new Error("INTERNAL");
      tpsNameOut = tps.name;

      // Jaminan integritas rantai: timestamp jitter TIDAK BOLEH mundur dari
      // suara terakhir di TPS agar urutan createdAt == urutan rantai hash
      // (verifyChain memutar ulang rantai berdasarkan urutan createdAt).
      const lastBallot = await tx.ballotBox.findFirst({
        where: { tpsId: tps.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      const floorTs = lastBallot ? lastBallot.createdAt.getTime() + 1 : 0;

      const entries: Array<{ category: string; candidateId: string | null; isEmptyBox: boolean }> = [
        { category: "PRESMA", candidateId: presma.id, isEmptyBox: false },
        { category: "DPM", candidateId: dpm.id, isEmptyBox: false },
        selections.himaCandidateId
          ? { category: "HIMA", candidateId: himaCandidate!.id, isEmptyBox: false }
          : { category: "HIMA", candidateId: null, isEmptyBox: true },
      ];

      let prevChain = tps.lastChainHash;
      let prevTs = floorTs;
      for (const entry of entries) {
        const newId = crypto.randomUUID();
        const jittered = jitteredTimestamp(new Date());
        const ts = new Date(Math.max(jittered.getTime(), prevTs));
        prevTs = ts.getTime() + 1;
        const ballotHash = computeBallotHash({
          prevChainHash: prevChain,
          ballotId: newId,
          category: entry.category,
          candidateId: entry.candidateId,
          isEmptyBox: entry.isEmptyBox,
          timestamp: ts,
          tpsSalt: tps.chainSalt,
        });
        await tx.ballotBox.create({
          data: {
            id: newId,
            category: entry.category,
            candidateId: entry.candidateId,
            isEmptyBox: entry.isEmptyBox,
            tpsId: tps.id,
            createdAt: ts,
            ballotHash,
          },
        });
        prevChain = ballotHash;
      }

      // Perbarui head rantai hash TPS
      await tx.tps.update({ where: { id: tps.id }, data: { lastChainHash: prevChain } });
      finalChainHash = prevChain;

      // 4. Hanguskan token
      await tx.votingToken.update({
        where: { id: token.id },
        data: { status: "USED", usedAt: new Date() },
      });

      // 5. Tandai pemilih SUDAH_MEMILIH via sesi token aktifnya
      //    (ballot tetap anonim mutlak — tidak ada identitas di ballot_boxes)
      const voter = await tx.voter.findFirst({ where: { pendingTokenHash: tokenHash } });
      if (voter) {
        await tx.voter.update({
          where: { id: voter.id },
          data: {
            hasVoted: true,
            status: "SUDAH_MEMILIH",
            votedAt: new Date(),
            pendingTokenHash: null,
          },
        });
      }

      // 6. Audit log (tanpa pilihan kandidat)
      await tx.auditLog.create({
        data: {
          event: "BALLOT_SUBMITTED",
          detail: `Surat suara terenkripsi masuk ke kotak suara TPS ${tps.name} (3 kategori). Token dihanguskan. Identitas terpisah mutlak.`,
          tpsId: tps.id,
        },
      });
    });

    return {
      ok: true,
      message: "Suara berhasil tersimpan secara rahasia.",
      // Rekomendasi #6: struk suara = 12 hex pertama balok terakhir pemilih ini.
      receiptCode: formatReceiptCode(finalChainHash),
      tpsName: tpsNameOut,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "INVALID_TOKEN")
      return { ok: false, code: "INVALID_TOKEN", message: "Token tidak ditemukan atau tidak sah." };
    if (msg === "USED_TOKEN")
      return { ok: false, code: "USED_TOKEN", message: "Token telah digunakan. Satu token hanya untuk satu kali memilih." };
    if (msg === "EXPIRED_TOKEN")
      return { ok: false, code: "EXPIRED_TOKEN", message: "Token kedaluwarsa. Silakan minta token ulang di meja PPUR." };
    if (msg === "PRODI_MISMATCH")
      return { ok: false, code: "PRODI_MISMATCH", message: "Pelanggaran integritas: surat suara prodi tidak sesuai profil token." };
    return { ok: false, code: "INTERNAL", message: "Kesalahan internal server saat menyimpan suara." };
  }
}

/**
 * Menerbitkan token baru untuk pemilih di meja PPUR (FR-04).
 * Mengembalikan plaintext token sekali ini saja (hanya hash yang tersimpan).
 */
export async function issueToken(
  voterId: string,
  operatorNote: string = ""
): Promise<
  | { ok: true; token: string; expiresAt: Date; tpsId: string; studyProgramId: string }
  | { ok: false; code: string; message: string }
> {
  const setting = await db.electionSetting.findUnique({ where: { id: "main" } });
  if (!setting) return { ok: false, code: "INTERNAL", message: "Konfigurasi eleksi belum siap." };
  if (setting.emergencyFreeze)
    return { ok: false, code: "FROZEN", message: "EMERGENCY FREEZE aktif — penerbitan token dihentikan sementara." };
  if (!setting.votingOpen)
    return { ok: false, code: "VOTING_CLOSED", message: "Pemungutan suara telah ditutup. Penerbitan token terkunci." };

  const voter = await db.voter.findUnique({
    where: { id: voterId },
    include: { studyProgram: true, tps: true },
  });
  if (!voter) return { ok: false, code: "NOT_FOUND", message: "Pemilih tidak ditemukan dalam DPT." };
  if (voter.hasVoted || voter.status === "SUDAH_MEMILIH")
    return { ok: false, code: "ALREADY_VOTED", message: "Pemilih telah menggunakan hak pilihnya (SUDAH_MEMILIH)." };

  // FR-04.3: token lama yang masih ACTIVE dihanguskan (pembatalan tercatat)
  if (voter.pendingTokenHash) {
    const old = await db.votingToken.findUnique({ where: { tokenHash: voter.pendingTokenHash } });
    if (old && old.status === "ACTIVE") {
      await db.votingToken.update({
        where: { id: old.id },
        data: { status: "EXPIRED" },
      });
      await db.auditLog.create({
        data: {
          event: "TOKEN_REVOKED",
          detail: `Token lama dibatalkan & terbit ulang untuk pemilih di ${voter.tps.name}. Alasan: ${operatorNote || "permintaan petugas PPUR"}.`,
          tpsId: voter.tpsId,
        },
      });
    }
  }

  const plaintext = generateVotingToken();
  const tokenHash = hashToken(plaintext);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MINUTES * 60_000);

  await db.$transaction([
    db.votingToken.create({
      data: {
        tokenHash,
        tpsId: voter.tpsId,
        studyProgramId: voter.studyProgramId,
        status: "ACTIVE",
        issuedAt: now,
        expiresAt,
      },
    }),
    db.voter.update({
      where: { id: voter.id },
      data: { status: "DALAM_ANTREAN", pendingTokenHash: tokenHash },
    }),
    db.auditLog.create({
      data: {
        event: "TOKEN_ISSUED",
        detail: `Token bilik suara diterbitkan (TTL ${TOKEN_TTL_MINUTES} menit) di ${voter.tps.name}. Pemilih masuk antrean bilik.`,
        tpsId: voter.tpsId,
      },
    }),
  ]);

  return { ok: true, token: plaintext, expiresAt, tpsId: voter.tpsId, studyProgramId: voter.studyProgramId };
}

/** Menandai token yang lewat TTL sebagai EXPIRED + reset status pemilih terkait. */
export async function expireStaleTokens(): Promise<number> {
  const now = new Date();
  const stale = await db.votingToken.findMany({
    where: { status: "ACTIVE", expiresAt: { lt: now } },
  });
  for (const t of stale) {
    await db.$transaction(async (tx) => {
      await tx.votingToken.update({ where: { id: t.id }, data: { status: "EXPIRED" } });
      const voter = await tx.voter.findFirst({ where: { pendingTokenHash: t.tokenHash } });
      if (voter) {
        await tx.voter.update({
          where: { id: voter.id },
          data: { status: "BELUM_MEMILIH", pendingTokenHash: null },
        });
      }
      await tx.auditLog.create({
        data: {
          event: "TOKEN_EXPIRED",
          detail: `Token kedaluwarsa tanpa digunakan. Hak pilih dikembalikan ke status BELUM_MEMILIH (FR-04.3).`,
          tpsId: t.tpsId,
        },
      });
    });
  }
  return stale.length;
}
