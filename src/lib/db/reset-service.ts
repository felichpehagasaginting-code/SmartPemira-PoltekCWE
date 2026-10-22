// ============================================================
// RESET SERVICE — "Segel & Reset Pemira" (Siklus Hidup Periode)
// Masalah yang dijawab: setelah Pleno Unlocking, kotak suara PERMANEN
// (append-only, Hukum 2) sehingga pemira tidak bisa diulang.
// Solusi tanpa melanggar append-only: pemira TIDAK "dibuka balik" —
// seluruh lembar periode lama DISEGEL ke Arsip resmi (rekap BA +
// kanonikal + tanda tangan + snapshot audit log & sengketa), lalu
// sistem membuka LEMBAR BARU dengan rantai hash genesis segar.
//
// Dua mode:
//  - DEMO       : "Gelombang Ulang" — DPT & kandidat dipakai ulang,
//                 status pemilih dikembalikan ke BELUM_MEMILIH.
//  - NEW_PERIOD : "Periode Baru Total" — DPT, kandidat, insiden
//                 dikosongkan (tetap tersimpan di arsip); DPT baru
//                 masuk via Import DPT, kandidat di-input ulang.
//
// Proteksi berlapis (dipanggil dari API):
//  ITPO saja → wajib pleno terbuka → arsip ATOMIK bersama wipe
//  (arsip & penghapusan hidup-mati bersama dalam satu transaksi)
//  → rotasi chainSalt + sessionSecret (semua sesi lama hangus).
// ============================================================
import { createHash, randomBytes, randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getTallyReport } from "@/lib/db/tally-service";
import { buildBaCanonical, collectBaTotals, computeBaSignature } from "@/lib/server/ba-canonical";

export type ResetMode = "DEMO" | "NEW_PERIOD";

export interface ArchiveListItem {
  id: string;
  archiveCode: string;
  periodLabel: string;
  mode: string;
  sealedAt: string;
  sealedBy: string;
  dptCount: number;
  votedCount: number;
  ballotCount: number;
}

export interface ResetStatus {
  periodLabel: string;
  periodStartedAt: string | null;
  votingOpen: boolean;
  emergencyFreeze: boolean;
  plenoUnlocked: boolean;
  plenoUnlockedAt: string | null;
  counts: {
    dpt: number;
    voted: number;
    ballots: number;
    tokens: number;
    candidates: number;
    incidents: number;
    auditLogs: number;
  };
  chains: Array<{ id: string; name: string; headHash: string; blocks: number }>;
  archives: ArchiveListItem[];
}

/** Status siklus hidup saat ini — untuk kartu administrasi ITPO. */
export async function getResetStatus(): Promise<ResetStatus> {
  const [setting, dpt, voted, ballots, tokens, candidates, incidents, auditLogs, tps, archives] =
    await Promise.all([
      db.electionSetting.findUnique({ where: { id: "main" } }),
      db.voter.count(),
      db.voter.count({ where: { hasVoted: true } }),
      db.ballotBox.count(),
      db.votingToken.count(),
      db.candidate.count(),
      db.electionIncident.count(),
      db.auditLog.count(),
      db.tps.findMany({ orderBy: { id: "asc" } }),
      db.electionArchive.findMany({ orderBy: { sealedAt: "desc" } }),
    ]);

  const blockCounts = await db.ballotBox.groupBy({ by: ["tpsId"], _count: { _all: true } });
  const blocksByTps = new Map(blockCounts.map((b) => [b.tpsId, b._count._all]));

  return {
    periodLabel: setting?.periodLabel ?? "(belum diatur)",
    periodStartedAt: setting?.periodStartedAt?.toISOString() ?? null,
    votingOpen: setting?.votingOpen ?? false,
    emergencyFreeze: setting?.emergencyFreeze ?? false,
    plenoUnlocked: setting?.plenoUnlocked ?? false,
    plenoUnlockedAt: setting?.plenoUnlockedAt?.toISOString() ?? null,
    counts: { dpt, voted, ballots, tokens, candidates, incidents, auditLogs },
    chains: tps.map((t) => ({
      id: t.id,
      name: t.name,
      headHash: t.lastChainHash,
      blocks: blocksByTps.get(t.id) ?? 0,
    })),
    archives: archives.map((a) => ({
      id: a.id,
      archiveCode: a.archiveCode,
      periodLabel: a.periodLabel,
      mode: a.mode,
      sealedAt: a.sealedAt.toISOString(),
      sealedBy: a.sealedBy,
      dptCount: a.dptCount,
      votedCount: a.votedCount,
      ballotCount: a.ballotCount,
    })),
  };
}

/** Pratinjau arsip (belum disegel) — agar ITPO dapat mengunduh salinan SEBELUM eksekusi. */
export async function buildArchivePreview(sealedBy: string, mode: ResetMode, newPeriodLabel: string, note: string) {
  const { payload } = await collectSealPayload(sealedBy, mode, note);
  return {
    ok: true,
    preview: true,
    newPeriodLabel,
    payload,
  };
}

/** Mengumpulkan seluruh isi arsip periode lama (rekap, kanonikal, tanda tangan, snapshot). */
async function collectSealPayload(sealedBy: string, mode: ResetMode, note: string) {
  const setting = await db.electionSetting.findUnique({ where: { id: "main" } });
  if (!setting) throw new Error("SETTING_MISSING");

  // Pleno wajib sudah terbuka: rekap resmi hanya boleh dibuat setelah kotak
  // dibuka (Hukum 5) — arsip tanpa rekap bukan arsip pemira yang sah.
  if (!setting.plenoUnlocked) throw new Error("PLENO_LOCKED");

  const [tally, totals, tps, auditLogs, incidents, candidates, archiveCount] = await Promise.all([
    getTallyReport(), // pleno terbuka → rekap lengkap
    collectBaTotals(),
    db.tps.findMany({ orderBy: { id: "asc" } }),
    db.auditLog.findMany({ orderBy: { createdAt: "asc" } }),
    db.electionIncident.findMany({ orderBy: { createdAt: "asc" } }),
    db.candidate.findMany({
      orderBy: [{ category: "asc" }, { number: "asc" }],
      include: { studyProgram: { select: { id: true, name: true } } },
    }),
    db.electionArchive.count(),
  ]);

  const canonical = buildBaCanonical({
    ...totals,
    tally,
    plenoUnlockedAt: setting.plenoUnlockedAt ?? null,
  });
  const signature = computeBaSignature(canonical);

  const year = new Date().getFullYear();
  const archiveCode = `ARS-${year}-${String(archiveCount + 1).padStart(4, "0")}`;

  const payload = {
    document: "ARSIP PENUTUPAN PERIODE PEMIRA — SMART PEMIRA POLTEK CWE",
    archiveCode,
    periodLabel: setting.periodLabel,
    mode,
    note: note || "Penutupan periode melalui fitur Segel & Reset (ITPO).",
    sealedBy,
    sealedAt: new Date().toISOString(),
    plenoUnlockedAt: setting.plenoUnlockedAt?.toISOString() ?? null,
    totals: {
      ...totals,
      absent: totals.dptTotal - totals.voted,
      turnoutPct: totals.dptTotal > 0 ? (totals.voted / totals.dptTotal) * 100 : 0,
    },
    tally,
    chainHeads: tps.map((t) => ({ tpsId: t.id, name: t.name, headHash: t.lastChainHash })),
    canonical,
    signature,
    algorithm: "SHA-256 (kanonikal rekap latest-wins + 5 head rantai prodi + statistik re-vote)",
    auditLogSnapshot: auditLogs.map((a) => ({
      event: a.event,
      detail: a.detail,
      tpsId: a.tpsId,
      createdAt: a.createdAt.toISOString(),
    })),
    incidentsSnapshot: incidents.map((i) => ({
      ticketNumber: i.ticketNumber,
      reporterName: i.reporterName,
      incidentType: i.incidentType,
      status: i.status,
      verdict: i.verdict,
      createdAt: i.createdAt.toISOString(),
    })),
    candidatesSnapshot: candidates.map((c) => ({
      category: c.category,
      studyProgramId: c.studyProgramId,
      studyProgramName: c.studyProgram?.name ?? null,
      number: c.number,
      presidentName: c.presidentName,
      viceName: c.viceName,
      isEmptyBox: c.isEmptyBox,
    })),
  };

  return { payload, archiveCode, setting, totals };
}

export type SealAndResetResult =
  | {
      ok: true;
      archiveId: string;
      archiveCode: string;
      closedPeriodLabel: string;
      newPeriodLabel: string;
      message: string;
      postCounts: { ballots: number; tokens: number; dpt: number; candidates: number };
    }
  | { ok: false; code: "SETTING_MISSING" | "PLENO_LOCKED"; message: string };

/**
 * SEGEL & RESET — satu transaksi atomik:
 * arsip dibuat ⇔ lembar lama dibersihkan ⇔ genesis baru dimulai.
 * Gagal di titik mana pun → seluruh operasi batal (data tidak mungkin
 * terhapus tanpa arsip, dan arsip tidak mungkin ada tanpa penghapusan).
 */
export async function sealAndReset(opts: {
  mode: ResetMode;
  newPeriodLabel: string;
  note: string;
  sealedBy: string;
}): Promise<SealAndResetResult> {
  let payload: Record<string, unknown>;
  let archiveCode = "";
  let oldPeriodLabel = "";
  let totalsOut = { dptTotal: 0, voted: 0, ballots: 0, tokenUsed: 0 };

  try {
    const collected = await collectSealPayload(opts.sealedBy, opts.mode, opts.note);
    payload = collected.payload as unknown as Record<string, unknown>;
    archiveCode = collected.archiveCode;
    oldPeriodLabel = collected.setting.periodLabel;
    totalsOut = collected.totals;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "PLENO_LOCKED")
      return {
        ok: false,
        code: "PLENO_LOCKED",
        message:
          "Kotak suara masih TERKUNCI (Pleno belum dibuka). Segel & Reset hanya sah setelah Pleno Unlocking oleh KPUM — suara yang belum direkap tidak boleh dilenyuhkan.",
      };
    return { ok: false, code: "SETTING_MISSING", message: "Konfigurasi eleksi belum diinisialisasi." };
  }

  const now = new Date();
  const newSaltPerTps = await db.tps.findMany({ select: { id: true } });
  const saltMap = new Map(
    newSaltPerTps.map((t) => [t.id, createHash("sha256").update(randomUUID()).digest("hex")])
  );

  // Nomor urut arsip dihitung sebelum transaksi (SQLite count race tidak
  // relevan — operasi ini hanya boleh dijalankan ITPO, satu pelaksana).
  await db.$transaction(async (tx) => {
    // 1. SEGEL: arsip periode lama (append-only — tidak pernah diedit)
    await tx.electionArchive.create({
      data: {
        archiveCode,
        periodLabel: oldPeriodLabel,
        mode: opts.mode,
        sealedBy: opts.sealedBy,
        note: opts.note || "Penutupan periode melalui fitur Segel & Reset (ITPO).",
        summaryJson: JSON.stringify({
          document: payload.document,
          totals: payload.totals,
          tally: payload.tally,
          chainHeads: payload.chainHeads,
        }),
        canonical: String(payload.canonical),
        signature: String(payload.signature),
        auditLogJson: JSON.stringify(payload.auditLogSnapshot),
        incidentsJson: JSON.stringify(payload.incidentsSnapshot),
        candidatesJson: JSON.stringify(payload.candidatesSnapshot),
        chainHeadsJson: JSON.stringify(payload.chainHeads),
        dptCount: totalsOut.dptTotal,
        votedCount: totalsOut.voted,
        ballotCount: totalsOut.ballots,
        sealedAt: now,
      },
    });

    // 2. LEMBAR BARU: bersihkan domain pemungutan periode lama
    await tx.ballotBox.deleteMany();
    await tx.votingToken.deleteMany();

    if (opts.mode === "DEMO") {
      // Gelombang ulang: DPT & kandidat DIPERTAHANKAN, status pemilih di-reset
      await tx.voter.updateMany({
        data: { hasVoted: false, status: "BELUM_MEMILIH", pendingTokenHash: null, votedAt: null },
      });
    } else {
      // Periode baru total: DPT & kandidat dikosongkan (tersimpan di arsip)
      await tx.voter.deleteMany();
      await tx.candidate.deleteMany();
    }
    await tx.electionIncident.deleteMany();
    await tx.auditLog.deleteMany();

    // 3. RE-GENESIS rantai hash: salt baru per prodi, head dikosongkan —
    //    rantai lama TETAP terdokumentasi di arsip (append-only terjaga).
    for (const [tpsId, salt] of saltMap) {
      await tx.tps.update({ where: { id: tpsId }, data: { chainSalt: salt, lastChainHash: "" } });
    }

    // 4. Pengaturan lembar baru: pemungutan tertutup (KPUM membuka secara
    //    sadar), pleno terkunci kembali, secret sesi DIROTASI sehingga
    //    seluruh sesi operator lama hangus otomatis.
    await tx.electionSetting.update({
      where: { id: "main" },
      data: {
        votingOpen: false,
        emergencyFreeze: false,
        plenoUnlocked: false,
        plenoUnlockedAt: null,
        sessionSecret: randomBytes(32).toString("hex"),
        periodLabel: opts.newPeriodLabel,
        periodStartedAt: now,
      },
    });

    // 5. Audit log lembar baru — entri pertama periode
    await tx.auditLog.create({
      data: {
        event: "PERIOD_RESET",
        detail:
          `SEGEL & RESET oleh ITPO (${opts.sealedBy}). Periode "${oldPeriodLabel}" ditutup & disegel sebagai ` +
          `${archiveCode} (mode ${opts.mode === "DEMO" ? "GELOMBANG ULANG" : "PERIODE BARU TOTAL"}): ` +
          `${totalsOut.ballots} blok suara, ${totalsOut.voted}/${totalsOut.dptTotal} DPT memilih, ` +
          `tanda tangan BA ${String(payload.signature).slice(0, 12)}… Kelima rantai hash prodi di-re-genesis ` +
          `(salt baru), penerbitan token tertutup menunggu KPUM membuka pemungutan, seluruh sesi operator lama hangus. ` +
          `Periode aktif kini: "${opts.newPeriodLabel}".`,
      },
    });
  });

  const sealed = await db.electionArchive.findUnique({ where: { archiveCode }, select: { id: true } });
  const [postBallots, postTokens, postDpt, postCandidates] = await Promise.all([
    db.ballotBox.count(),
    db.votingToken.count(),
    db.voter.count(),
    db.candidate.count(),
  ]);

  return {
    ok: true,
    archiveId: sealed?.id ?? "",
    archiveCode,
    closedPeriodLabel: oldPeriodLabel,
    newPeriodLabel: opts.newPeriodLabel,
    message:
      `Periode "${oldPeriodLabel}" telah DISEGEL sebagai ${archiveCode} dan lembar baru ` +
      `"${opts.newPeriodLabel}" dibuka. Kelima rantai hash genesis segar, pemungutan tertutup, ` +
      `semua sesi operator lama otomatis keluar.`,
    postCounts: { ballots: postBallots, tokens: postTokens, dpt: postDpt, candidates: postCandidates },
  };
}
