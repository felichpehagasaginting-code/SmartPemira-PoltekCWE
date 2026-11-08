// ============================================================
// PUSAT PERINGATAN OPERASIONAL (Rekomendasi #7)
// Evaluator ambang batas — hasil dipakai /api/monitor/alerts (GET) dan
// panel Alert Center Panwaslu/KPUM. Pemeriksaan berat (integritas rantai)
// di-cache 120 detik agar polling 15 s tetap murah.
// Kanal keluar opsional: PEMIRA_ALERT_WEBHOOK (HTTP POST fire-and-forget,
// 3 s timeout) — dikirim hanya saat ADA peringatan BARU (dedup per state).
// ============================================================
import { db } from "@/lib/db";

export type AlertSeverity = "CRITICAL" | "HIGH" | "WARNING" | "INFO";

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  evidence: string;
  observedAt: string;
}

export interface AlertEvaluation {
  alerts: AlertItem[];
  evaluatedAt: string;
}

const CHAIN_CHECK_INTERVAL_MS = 120_000;
const STALL_WINDOW_MIN = 20; // tidak ada suara baru selama 20 menit saat voting terbuka
const LOCKOUT_STORM_THRESHOLD = 5; // kegagalan login ≥ 5 dalam 15 menit
const TURNOUT_SOFT_FLOOR = 60; // % — stall di bawah ini dianggap gangguan, bukan jam sepi

const g = globalThis as unknown as {
  __pemiraAlertCache?: { chainOk: boolean; checkedAt: number; checkedCount: number; chainFailures: string[] };
  __pemiraAlertWebhookSeen?: string;
};

export async function checkChainIntegrity(forceFresh = false): Promise<{ ok: boolean; checked: number; failures: string[] }> {
  const cached = g.__pemiraAlertCache;
  if (!forceFresh && cached && Date.now() - cached.checkedAt < CHAIN_CHECK_INTERVAL_MS) {
    return { ok: cached.chainOk, checked: cached.checkedCount, failures: cached.chainFailures };
  }
  const [tpsList, ballots] = await Promise.all([
    db.tps.findMany({ orderBy: { id: "asc" } }),
    db.ballotBox.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const { verifyChain } = await import("@/lib/crypto/ballot-hash-chain");
  const failures: string[] = [];
  let checked = 0;
  for (const tps of tpsList) {
    const chain = ballots
      .filter((b) => b.tpsId === tps.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const res = verifyChain(
      chain.map((b) => ({ id: b.id, category: b.category, candidateId: b.candidateId, isEmptyBox: b.isEmptyBox, createdAt: b.createdAt, ballotHash: b.ballotHash })),
      tps.chainSalt,
      tps.lastChainHash
    );
    checked += res.checkedCount;
    if (!res.valid) failures.push(tps.name);
  }
  g.__pemiraAlertCache = { chainOk: failures.length === 0, checkedAt: Date.now(), checkedCount: checked, chainFailures: failures };
  return { ok: failures.length === 0, checked, failures };
}

/** Evaluasi seluruh ambang batas — murni membaca state, tidak mengubah apa pun. */
export async function evaluateAlerts(): Promise<AlertEvaluation> {
  const now = new Date();
  const alerts: AlertItem[] = [];
  const push = (a: Omit<AlertItem, "observedAt">) => alerts.push({ ...a, observedAt: now.toISOString() });

  const setting = await db.electionSetting.findUnique({ where: { id: "main" } });

  // 1. EMERGENCY FREEZE aktif — pemungutan suara ditahan pengurus.
  if (setting?.emergencyFreeze) {
    push({
      id: "FREEZE_AKTIF",
      severity: "HIGH",
      title: "EMERGENCY FREEZE aktif",
      detail: "Seluruh pemungutan suara ditahan sejak freeze diaktifkan. Pastikan keputusan pengurus dan sengketa terkait dicatat, lalu buka kembali melalui meja Panwaslu/KPUM.",
      evidence: "ElectionSetting.emergencyFreeze = true",
    });
  }

  // 2. Stok stasioner — tidak ada suara masuk 20 menit padahal voting terbuka & partisipasi < 60%.
  if (setting?.votingOpen && !setting.emergencyFreeze) {
    const [lastBallot, totals] = await Promise.all([
      db.ballotBox.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      Promise.all([db.voter.count(), db.voter.count({ where: { hasVoted: true } })]),
    ]);
    const [dptTotal, voted] = totals;
    const minutesSince = lastBallot ? Math.floor((now.getTime() - lastBallot.createdAt.getTime()) / 60_000) : Infinity;
    if (minutesSince >= STALL_WINDOW_MIN && dptTotal > 0 && voted < dptTotal * (TURNOUT_SOFT_FLOOR / 100)) {
      push({
        id: "TURNOUT_STALL",
        severity: "WARNING",
        title: "Stok stasioner: tidak ada suara baru",
        detail: `Tidak ada suara masuk selama ${minutesSince === Infinity ? ">20" : minutesSince} menit, padahal pemungutan suara terbuka dan partisipasi baru ${Math.round((voted / dptTotal) * 100)}%. Cek jalur TPS: gangguan perangkat, antrean, atau token tidak terproses.`,
        evidence: `suara terakhir ${lastBallot?.createdAt.toISOString() ?? "belum ada"} • partisipasi ${voted}/${dptTotal}`,
      });
    }
  }

  // 3. Badai percobaan login — indikasi brute force terhadap akun petugas.
  const since15 = new Date(now.getTime() - 15 * 60_000);
  const failedLogins = await db.auditLog.count({
    where: { event: { in: ["OPERATOR_LOGIN_FAILED", "OPERATOR_LOGIN_BLOCKED"] }, createdAt: { gte: since15 } },
  });
  if (failedLogins >= LOCKOUT_STORM_THRESHOLD) {
    push({
      id: "LOGIN_STORM",
      severity: "HIGH",
      title: "Badai percobaan login terdeteksi",
      detail: `${failedLogins} kegagalan/penolakan login dalam 15 menit terakhir. Sistem sudah menahan via lockout — identifikasi sumber (IP) di log dan koordinasikan dengan ITPO.`,
      evidence: `event OPERATOR_LOGIN_FAILED/BLOCKED: ${failedLogins} dalam 15 menit`,
    });
  }

  // 4. Integritas rantai hash (cache 120 detik) — bedrock keaslian suara.
  const chain = await checkChainIntegrity();
  if (!chain.ok) {
    push({
      id: "CHAIN_INTEGRITY",
      severity: "CRITICAL",
      title: "RANTAI HASH KORUP",
      detail: `Verifikasi rantai gagal pada: ${chain.failures.join(", ")}. Kemungkinan manipulasi/korupsi data — TAHAN penutupan periode, aktifkan freeze, dan jalankan forensik.`,
      evidence: `rantai rusak: ${chain.failures.join(", ")} • blok diperiksa: ${chain.checked}`,
    });
  }

  // 5. Backup gagal dalam 24 jam terakhir (Rekomendasi #1 & #7 saling mengunci).
  const since24 = new Date(now.getTime() - 24 * 60 * 60_000);
  const backupFailures = await db.auditLog.count({ where: { event: "BACKUP_FAILED", createdAt: { gte: since24 } } });
  if (backupFailures > 0) {
    push({
      id: "BACKUP_FAILED",
      severity: "HIGH",
      title: "Backup otomatis gagal",
      detail: `${backupFailures} pekerjaan backup gagal dalam 24 jam terakhir. Jalankan backup manual via dashboard ITPO dan periksa ruang disk/izin direktori sebelum data hilang tak terpulihkan.`,
      evidence: `event BACKUP_FAILED: ${backupFailures} dalam 24 jam`,
    });
  }

  // 6. Kepatuhan 2FA pengelola inti (Rekomendasi #3).
  const [kpumNo2fa, itpoNo2fa] = await Promise.all([
    db.operator.count({ where: { role: "KPUM", isActive: true, totpEnabledAt: null } }),
    db.operator.count({ where: { role: "ITPO", isActive: true, totpEnabledAt: null } }),
  ]);
  if (kpumNo2fa + itpoNo2fa > 0) {
    push({
      id: "2FA_KEPATUHAN",
      severity: "WARNING",
      title: "Kepatuhan 2FA belum penuh",
      detail: `${kpumNo2fa} akun KPUM dan ${itpoNo2fa} akun ITPO aktif belum menyalakan 2FA. Ingatkan untuk membuka Keamanan Akun — akun pengelola adalah target bernilai tinggi.`,
      evidence: `KPUM tanpa 2FA: ${kpumNo2fa} • ITPO tanpa 2FA: ${itpoNo2fa}`,
    });
  }

  void maybeFireWebhook(alerts);
  return { alerts, evaluatedAt: now.toISOString() };
}

/** Webhook opsional (PEMIRA_ALERT_WEBHOOK): kirim hanya bila ada id peringatan BARU. */
async function maybeFireWebhook(alerts: AlertItem[]): Promise<void> {
  const url = process.env.PEMIRA_ALERT_WEBHOOK;
  if (!url || alerts.length === 0) return;
  const seen = new Set((g.__pemiraAlertWebhookSeen ?? "").split(",").filter(Boolean));
  const fresh = alerts.filter((a) => !seen.has(a.id));
  if (fresh.length === 0) return; // tidak ada peringatan baru → jangan spam kanal
  g.__pemiraAlertWebhookSeen = alerts.map((a) => a.id).sort().join(",");
  try {
    await Promise.race([
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "smart-pemira", alerts: fresh }),
        signal: AbortSignal.timeout(3000),
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("webhook timeout")), 3000)),
    ]);
  } catch {
    // fire-and-forget: kegagalan webhook tidak boleh menurunkan API alerts
  }
}
