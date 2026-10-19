// ============================================================
// MONITOR SERVICE — Payload builder bersama (REST & SSE realtime)
// Rekomendasi #8: satu sumber data untuk /api/monitor/live dan
// stream /api/realtime/monitor (SSE) agar tidak ada duplikasi logika.
// ============================================================
import { db } from "@/lib/db";
import { expireStaleTokens } from "@/lib/db/ballot-service";
import { verifyChain } from "@/lib/crypto/ballot-hash-chain";
import { getTallyReport } from "@/lib/db/tally-service";

const AUTH_EVENTS = [
  "OPERATOR_LOGIN",
  "OPERATOR_LOGIN_FAILED",
  "OPERATOR_LOGIN_BLOCKED",
  "OPERATOR_ACCOUNT_LOCKED",
  "OPERATOR_LOGOUT",
  "OPERATOR_PASSWORD_CHANGED",
  "OPERATOR_PASSWORD_CHANGE_FAILED",
  "OPERATOR_PASSWORD_RESET",
];

export async function buildMonitorPayload() {
  await expireStaleTokens();
  const [setting, tps] = await Promise.all([
    db.electionSetting.findUnique({ where: { id: "main" } }),
    db.tps.findFirst(),
  ]);

  const [dptTotal, sudah, antrean, belum, tokenAktif, tokenUsed, tokenExpired, ballots] = await Promise.all([
    db.voter.count(),
    db.voter.count({ where: { status: "SUDAH_MEMILIH" } }),
    db.voter.count({ where: { status: "DALAM_ANTREAN" } }),
    db.voter.count({ where: { status: "BELUM_MEMILIH" } }),
    db.votingToken.count({ where: { status: "ACTIVE", expiresAt: { gt: new Date() } } }),
    db.votingToken.count({ where: { status: "USED" } }),
    db.votingToken.count({ where: { status: "EXPIRED" } }),
    db.ballotBox.findMany({
      where: { tpsId: tps?.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, category: true, candidateId: true, isEmptyBox: true, createdAt: true, ballotHash: true },
    }),
  ]);

  const integrity = verifyChain(ballots, tps?.chainSalt ?? "", tps?.lastChainHash ?? "");

  const votersVoted = await db.voter.findMany({ where: { hasVoted: true }, select: { votedAt: true } });
  const hourly = new Map<number, number>();
  for (const v of votersVoted) {
    if (!v.votedAt) continue;
    const h = v.votedAt.getHours();
    hourly.set(h, (hourly.get(h) ?? 0) + 1);
  }
  const attendanceByHour = Array.from(hourly.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour - b.hour);

  const [logs, failedLogins5m] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    db.auditLog.count({
      where: {
        event: { in: ["OPERATOR_LOGIN_FAILED", "OPERATOR_ACCOUNT_LOCKED", "OPERATOR_LOGIN_BLOCKED"] },
        createdAt: { gte: new Date(Date.now() - 5 * 60_000) },
      },
    }),
  ]);

  return {
    kpis: {
      dptTotal,
      sudahMemilih: sudah,
      dalamAntrean: antrean,
      belumMemilih: belum,
      turnoutPct: dptTotal > 0 ? (sudah / dptTotal) * 100 : 0,
      tokenAktif,
      tokenUsed,
      tokenExpired,
      ballotsCount: ballots.length,
    },
    votingOpen: setting?.votingOpen ?? false,
    emergencyFreeze: setting?.emergencyFreeze ?? false,
    plenoUnlocked: setting?.plenoUnlocked ?? false,
    integrity: {
      valid: integrity.valid,
      checkedCount: integrity.checkedCount,
      brokenAtIndex: integrity.brokenAtIndex,
      headHash: tps?.lastChainHash ?? "",
    },
    attendanceByHour,
    logs,
    // Rekomendasi #8: alarm keamanan realtime
    failedLogins5m,
  };
}

/** Snapshot lengkap untuk stream SSE monitor Panwaslu. */
export async function buildRealtimeSnapshot() {
  const [monitor, report, authEvents] = await Promise.all([
    buildMonitorPayload(),
    getTallyReport(),
    db.auditLog.findMany({
      where: { event: { in: AUTH_EVENTS } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ]);
  // Bentuk sama persis dengan respons REST /api/tally (TallyResponse)
  const tally = report.unlocked
    ? { locked: false, ...report }
    : {
        locked: true,
        message:
          "Kotak suara digital terkunci (Pleno Vault). Hasil hanya dapat didekripsi setelah aksi Pleno Unlocking oleh Ketua KPUM (FR-06.3).",
        integrity: report.integrity,
      };
  return {
    ts: new Date().toISOString(),
    monitor,
    tally,
    loginLog: { events: authEvents },
  };
}

export type RealtimeSnapshot = Awaited<ReturnType<typeof buildRealtimeSnapshot>>;
