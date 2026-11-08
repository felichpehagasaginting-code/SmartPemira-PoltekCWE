// ============================================================
// BALLOT SUBMISSION SERVICE — Transaksi Atomik (PROMPT.md Hukum 2)
// Pemira 100% Online + Re-vote model Estonia (keputusan diskusi 2026-10-20):
//  - Token ACTIVE (dalam TTL) → vote pertama (voteVersion 1)
//  - Token USED → masih boleh membuka bilik ulang & MENGGANTI suara
//    sampai pemungutan ditutup; suara TERAKHIR yang dihitung
//    (latest-ballot-wins via voteVersion per token).
//  - lockedAt = finalisasi sukarela ("Kunci Suaraku") → re-vote ditutup.
//  - status REVOKED = dicabut petugas → seluruh bloknya dikecualikan rekap.
// Satu transaksi DB atomik: validasi token → validasi prodi → simpan 3
// surat suara berantai → update token → tandai DPT (vote pertama) → audit.
// ============================================================
import { db } from "@/lib/db";
import { hashToken, generateVotingToken } from "@/lib/crypto/token-generator";
import { computeBallotHash } from "@/lib/crypto/ballot-hash-chain";
import { formatReceiptCode } from "@/lib/crypto/receipt";
import { jitteredTimestamp } from "@/lib/crypto/time-jitter";
import { TOKEN_TTL_MINUTES } from "@/lib/constants/election";

export interface BallotSelections {
  /** null = SUARA KOSONG — pemilih tidak mendukung paslon manapun di kategori ini.
   *  Setiap kategori (PRESMA/BEM, DPM, HIMA) wajib punya pilihan eksplisit:
   *  id paslon ATAU null (opsi Suara Kosong di posisi terakhir bilik). */
  presmaCandidateId: string | null;
  dpmCandidateId: string | null;
  himaCandidateId: string | null;
}

export type SubmitResult =
  | {
      ok: true;
      message: string;
      receiptCode: string;
      tpsName: string;
      voteVersion: number;
      isRevote: boolean;
    }
  | {
      ok: false;
      code:
        | "INVALID_TOKEN"
        | "EXPIRED_TOKEN"
        | "REVOKED_TOKEN"
        | "LOCKED_TOKEN"
        | "FROZEN"
        | "VOTING_CLOSED"
        | "PRODI_MISMATCH"
        | "INTERNAL";
      message: string;
    };

/**
 * Submit seluruh surat suara seorang pemilih secara ATOMIK.
 * HUKUM 2 — urutan wajib:
 *  1. Validasi token (ACTIVE dalam TTL utk vote pertama, atau USED utk re-vote)
 *  2. Server-side assertion prodi (Hukum 4)
 *  3. Simpan 3 ballot + hash chaining per rantai prodi (voteVersion Naik)
 *  4. Token → USED (vote pertama) / revoteCount+1 (re-vote)
 *  5. Voter → SUDAH_MEMILIH (hanya vote pertama, via pendingTokenHash)
 *  6. Audit log append-only (tanpa pilihan kandidat)
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
    let voteVersionOut = 1;
    let isRevoteOut = false;

    const maxRetries = 8;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await db.$transaction(async (tx) => {
      // 1. Validasi token + kebijakan re-vote
      const token = await tx.votingToken.findUnique({ where: { tokenHash } });
      if (!token) throw new Error("INVALID_TOKEN");
      if (token.status === "REVOKED") throw new Error("REVOKED_TOKEN");
      if (token.lockedAt) throw new Error("LOCKED_TOKEN");
      if (token.status === "EXPIRED") throw new Error("EXPIRED_TOKEN");

      const isRevote = token.status === "USED";
      if (!isRevote) {
        // Vote PERTAMA: wajib ACTIVE dan masih dalam TTL
        if (token.status !== "ACTIVE" || token.expiresAt.getTime() < Date.now())
          throw new Error("EXPIRED_TOKEN");
      }
      const voteVersion = token.revoteCount + (isRevote ? 2 : 1);
      voteVersionOut = voteVersion;
      isRevoteOut = isRevote;

      // 2. Server-side assertion prodi (Hukum 4) — kandidat Hima milik prodi token.
      //     Suara Kosong (null) lolos tanpa lookup — tidak terikat kandidat apapun.
      const himaCandidate = selections.himaCandidateId
        ? await tx.candidate.findUnique({ where: { id: selections.himaCandidateId } })
        : null;
      if (himaCandidate) {
        if (himaCandidate.category !== "HIMA") throw new Error("PRODI_MISMATCH");
        if (himaCandidate.studyProgramId !== token.studyProgramId) throw new Error("PRODI_MISMATCH");
      }

      // Kandidat PRESMA (BEM) & DPM divalidasi HANYA bila bukan Suara Kosong
      const [presma, dpm] = await Promise.all([
        selections.presmaCandidateId
          ? tx.candidate.findUnique({ where: { id: selections.presmaCandidateId } })
          : Promise.resolve(null),
        selections.dpmCandidateId
          ? tx.candidate.findUnique({ where: { id: selections.dpmCandidateId } })
          : Promise.resolve(null),
      ]);
      if (selections.presmaCandidateId && (!presma || presma.category !== "PRESMA"))
        throw new Error("PRODI_MISMATCH");
      if (selections.dpmCandidateId && (!dpm || dpm.category !== "DPM"))
        throw new Error("PRODI_MISMATCH");

      // 3. Simpan 3 surat suara dengan jitter + hash chaining per rantai prodi
      const tps = await tx.tps.findUnique({ where: { id: token.tpsId } });
      if (!tps) throw new Error("INTERNAL");
      tpsNameOut = tps.name;

      // Jaminan integritas rantai: timestamp jitter TIDAK BOLEH mundur dari
      // suara terakhir di rantai agar urutan createdAt == urutan rantai hash
      // (verifyChain memutar ulang rantai berdasarkan urutan createdAt).
      const lastBallot = await tx.ballotBox.findFirst({
        where: { tpsId: tps.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      const floorTs = lastBallot ? lastBallot.createdAt.getTime() + 1 : 0;

      const entries: Array<{ category: string; candidateId: string | null; isEmptyBox: boolean }> = [
        { category: "PRESMA", candidateId: presma?.id ?? null, isEmptyBox: !selections.presmaCandidateId },
        { category: "DPM", candidateId: dpm?.id ?? null, isEmptyBox: !selections.dpmCandidateId },
        { category: "HIMA", candidateId: himaCandidate?.id ?? null, isEmptyBox: !selections.himaCandidateId },
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
            tokenId: token.id,
            voteVersion,
            createdAt: ts,
            ballotHash,
          },
        });
        prevChain = ballotHash;
      }

      // Perbarui head rantai hash TPS virtual prodi ini
      await tx.tps.update({ where: { id: tps.id }, data: { lastChainHash: prevChain } });
      finalChainHash = prevChain;

      // 4. Update token: USED + (re-vote → revoteCount naik)
      await tx.votingToken.update({
        where: { id: token.id },
        data: {
          status: "USED",
          usedAt: isRevote ? token.usedAt ?? new Date() : new Date(),
          revoteCount: isRevote ? { increment: 1 } : token.revoteCount,
        },
      });

      // 5. Vote PERTAMA saja: tandai pemilih SUDAH_MEMILIH via sesi token aktifnya
      //    (ballot tetap anonim mutlak — identitas tidak pernah menyentuh ballot_boxes;
      //     pada re-vote pemilih tidak disentuh sama sekali — token murni anonim)
      if (!isRevote) {
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
      }

      // 6. Audit log (tanpa pilihan kandidat)
      await tx.auditLog.create({
        data: {
          event: isRevote ? "BALLOT_REVOTED" : "BALLOT_SUBMITTED",
          detail: isRevote
            ? `Suara diganti (versi ${voteVersion}) di ${tps.name}. Versi sebelumnya otomatis tidak dihitung — suara terakhir yang sah. Identitas terpisah mutlak.`
            : `Surat suara terenkripsi masuk ke rantai ${tps.name} (3 kategori, versi 1). Identitas terpisah mutlak.`,
          tpsId: tps.id,
        },
      });
    }, { maxWait: 15_000, timeout: 30_000 });
        break; // Transaksi sukses
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isTransient =
          msg.includes("timed out") ||
          msg.includes("timeout") ||
          msg.includes("P2028") ||
          msg.includes("P2034") ||
          msg.includes("database is locked") ||
          msg.includes("SQLITE_BUSY");

        if (isTransient && attempt < maxRetries) {
          const jitterMs = Math.floor(Math.random() * 80) + attempt * 70;
          await new Promise((r) => setTimeout(r, jitterMs));
          continue;
        }
        throw err;
      }
    }

    return {
      ok: true,
      message: isRevoteOut
        ? `Suara berhasil DIGANTI (versi ${voteVersionOut}) — suara terakhir inilah yang dihitung.`
        : "Suara berhasil tersimpan secara rahasia.",
      // Rekomendasi #6: struk suara = 12 hex pertama balok HIMA (terakhir) versi ini.
      receiptCode: formatReceiptCode(finalChainHash),
      tpsName: tpsNameOut,
      voteVersion: voteVersionOut,
      isRevote: isRevoteOut,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "INVALID_TOKEN")
      return { ok: false, code: "INVALID_TOKEN", message: "Token tidak ditemukan atau tidak sah." };
    if (msg === "REVOKED_TOKEN")
      return { ok: false, code: "REVOKED_TOKEN", message: "Token telah dicabut petugas PPUR. Seluruh suara token ini dibatalkan." };
    if (msg === "LOCKED_TOKEN")
      return { ok: false, code: "LOCKED_TOKEN", message: "Suara sudah DIKUNCI (final). Token ini tidak dapat digunakan lagi." };
    if (msg === "EXPIRED_TOKEN")
      return { ok: false, code: "EXPIRED_TOKEN", message: "Token kedaluwarsa. Silakan minta token ulang di pos bantuan PPUR." };
    if (msg === "PRODI_MISMATCH")
      return { ok: false, code: "PRODI_MISMATCH", message: "Pelanggaran integritas: surat suara prodi tidak sesuai profil token." };
    return { ok: false, code: "INTERNAL", message: "Kesalahan internal server saat menyimpan suara." };
  }
}

/**
 * KUNCI SUARA (finalisasi sukarela — anti-paksaan lapis 1).
 * Pemilih yang sudah yakin mengunci tokennya: re-vote ditutup permanen.
 * Hanya token yang sudah pernah memilih (USED) yang bisa dikunci.
 */
export async function lockBallot(
  rawToken: string
): Promise<{ ok: boolean; code?: string; message: string }> {
  const tokenHash = hashToken(rawToken);
  const token = await db.votingToken.findUnique({ where: { tokenHash } });
  if (!token) return { ok: false, code: "INVALID_TOKEN", message: "Token tidak ditemukan." };
  if (token.status === "REVOKED")
    return { ok: false, code: "REVOKED_TOKEN", message: "Token sudah dicabut petugas." };
  if (token.status !== "USED")
    return { ok: false, code: "NOT_VOTED", message: "Belum ada suara untuk dikunci. Selesaikan memilih terlebih dahulu." };
  if (token.lockedAt)
    return { ok: true, message: "Suara sudah terkunci sebelumnya. Terima kasih." };

  await db.$transaction([
    db.votingToken.update({ where: { id: token.id }, data: { lockedAt: new Date() } }),
    db.auditLog.create({
      data: {
        event: "BALLOT_SELF_LOCKED",
        detail: `Pemilih mengunci suaranya (final). Re-vote ditutup untuk token ini di ${token.tpsId}.`,
        tpsId: token.tpsId,
      },
    }),
  ]);
  return { ok: true, message: "Suara berhasil DIKUNCI. Pilihanmu final dan tidak dapat diganti lagi." };
}

/**
 * CABUT TOKEN (anti-paksaan lapis 3 — kasus HP hilang/dipaksa, dari pos bantuan).
 * Token → REVOKED: seluruh blok suaranya dikecualikan dari rekap (latest-wins
 * hanya menjilat token yang tidak dicabut). Petugas meminta slip token lama
 * yang diserahkan pemilih — sistem TIDAK menyimpan jembatan identitas→token.
 */
export async function revokeTokenByCode(
  rawToken: string,
  operatorNote: string
): Promise<{ ok: boolean; code?: string; message: string }> {
  const tokenHash = hashToken(rawToken);
  const token = await db.votingToken.findUnique({ where: { tokenHash } });
  if (!token) return { ok: false, code: "INVALID_TOKEN", message: "Token tidak ditemukan." };
  if (token.status === "REVOKED")
    return { ok: false, code: "ALREADY_REVOKED", message: "Token sudah pernah dicabut." };

  await db.$transaction([
    db.votingToken.update({
      where: { id: token.id },
      data: { status: "REVOKED", lockedAt: new Date() },
    }),
    db.auditLog.create({
      data: {
        event: "TOKEN_REVOKED",
        detail: `Token dicabut petugas PPUR (${operatorNote || "kasus khusus di pos bantuan"}). Seluruh blok suara token ini dikecualikan dari rekapitulasi.`,
        tpsId: token.tpsId,
      },
    }),
  ]);
  return { ok: true, message: "Token berhasil dicabut. Seluruh suara token ini dibatalkan dari rekap." };
}

/** Pulihkan hak pilih seorang pemilih (setelah token lamanya dicabut). */
export async function resetVoterRights(voterId: string): Promise<{ ok: boolean; message: string }> {
  const voter = await db.voter.findUnique({ where: { id: voterId } });
  if (!voter) return { ok: false, message: "Pemilih tidak ditemukan dalam DPT." };

  await db.$transaction([
    db.voter.update({
      where: { id: voterId },
      data: { hasVoted: false, status: "BELUM_MEMILIH", pendingTokenHash: null, votedAt: null },
    }),
    db.auditLog.create({
      data: {
        event: "HAK_PILIH_DIPULIHKAN",
        detail: `Hak pilih dipulihkan petugas PPUR untuk pemilih ${voter.nim} (kasus khusus). Bisa diterbitkan token baru.`,
        tpsId: voter.tpsId,
      },
    }),
  ]);
  return { ok: true, message: `Hak pilih ${voter.name} dipulihkan (BELUM_MEMILIH). Token baru bisa diterbitkan.` };
}

/**
 * Menerbitkan token baru untuk pemilih di pos bantuan PPUR (FR-04).
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
    return { ok: false, code: "ALREADY_VOTED", message: "Pemilih telah menggunakan hak pilihnya (SUDAH_MEMILIH). Untuk kasus khusus, cabut token lama lalu pulihkan hak pilih." };

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
        detail: `Token bilik suara online diterbitkan (TTL ${TOKEN_TTL_MINUTES} menit utk vote pertama) untuk rantai ${voter.tps.name}.`,
        tpsId: voter.tpsId,
      },
    }),
  ]);

  return { ok: true, token: plaintext, expiresAt, tpsId: voter.tpsId, studyProgramId: voter.studyProgramId };
}

/** Menandai token yang lewat TTL (belum terpakai) sebagai EXPIRED + reset status pemilih. */
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
