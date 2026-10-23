"use client";

// ============================================================
// LIVE AUDIT MONITOR PANWASLU & LAYAR PLENO — FR-06, FR-08
// Tema terang Neo-Editorial Botanical — konsisten dengan seluruh
// modul lain (kanvas Warm Oat Milk, kartu bento putih).
// Menampilkan metrik operasional TANPA membocorkan isi suara.
// Hukum 5: grafik perolehan suara tertutup Cryptographic Vault
// hingga Pleno Unlocking.
// ============================================================
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { usePolling } from "@/hooks/use-polling";
import { useSSE } from "@/hooks/use-sse";
import type { RealtimeSnapshot } from "@/lib/db/monitor-service";
import type { IncidentRow, MonitorLiveResponse, TallyResponse } from "@/lib/types";
import {
  Activity,
  CheckCircle2,
  FileWarning,
  Hash,
  Hourglass,
  Lock,
  LockOpen,
  LogIn,
  Send,
  ShieldAlert,
  ShieldCheck,
  Users,
  Vote,
  Wifi,
  WifiOff,
} from "lucide-react";

const EVENT_META: Record<string, { label: string; cls: string }> = {
  TOKEN_ISSUED: { label: "TOKEN TERBIT", cls: "bg-[#FEF5D6] text-[#8A5200]" },
  TOKEN_REVOKED: { label: "TOKEN DICABUT", cls: "bg-[#FEF5D6] text-[#8A5200]" },
  TOKEN_EXPIRED: { label: "TOKEN KEDALUWARSA", cls: "bg-[#FDE8E5] text-[#842029]" },
  BALLOT_SUBMITTED: { label: "SUARA MASUK", cls: "bg-[#DCFCE7] text-[#0F5132]" },
  PLENO_UNLOCK: { label: "PLENO UNLOCK", cls: "bg-[#FEF5D6] text-[#8A5200]" },
  SYSTEM_INIT: { label: "SISTEM", cls: "bg-[#EAE6DF] text-[#4A5851]" },
  DPT_LOCKED: { label: "DPT DIKUNCI", cls: "bg-[#EAE6DF] text-[#4A5851]" },
  TPS_OPENED: { label: "TPS DIBUKA", cls: "bg-[#DCFCE7] text-[#0F5132]" },
  INCIDENT_REPORTED: { label: "SENGKETA", cls: "bg-[#FDE8E5] text-[#842029]" },
  OPERATOR_LOGIN: { label: "LOGIN OK", cls: "bg-[#DCFCE7] text-[#0F5132]" },
  OPERATOR_LOGIN_FAILED: { label: "LOGIN GAGAL", cls: "bg-[#FDE8E5] text-[#842029]" },
  OPERATOR_LOGOUT: { label: "LOGOUT", cls: "bg-[#EAE6DF] text-[#4A5851]" },
  OPERATOR_PASSWORD_CHANGED: { label: "SANDI DIGANTI", cls: "bg-[#FEF5D6] text-[#8A5200]" },
  OPERATOR_PASSWORD_CHANGE_FAILED: { label: "SANDI DITOLAK", cls: "bg-[#FDE8E5] text-[#842029]" },
};

interface LoginLogEvent {
  id: string;
  event: string;
  detail: string;
  createdAt: string;
}

function KpiCard({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="bento-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A8881]">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#EAE6DF]" style={{ color: accent }}>
          {icon}
        </div>
      </div>
      <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-[#141E19]">{value}</p>
      {sub && <p className="mt-1 text-[11px] font-semibold text-[#4A5851]">{sub}</p>}
    </div>
  );
}

export function PanwasluMonitor({ operatorRole }: { operatorRole?: string | null }) {
  const canManageIncidents = operatorRole === "PANWASLU" || operatorRole === "ITPO";
  // Log aktivitas login: khusus PANWASLU / ITPO / KPUM (SAKSI ditolak 403 oleh server)
  const canViewLoginLog = operatorRole === "PANWASLU" || operatorRole === "ITPO" || operatorRole === "KPUM";

  // ---------- REALTIME SSE (Rekomendasi #8) — polling hanya fallback ----------
  const sse = useSSE<RealtimeSnapshot>("/api/realtime/monitor");
  const sseActive = sse.connected && !!sse.data;
  const monitor = usePolling<MonitorLiveResponse>("/api/monitor/live", 8000, { enabled: !sseActive });
  const tally = usePolling<TallyResponse>("/api/tally", 10000, { enabled: !sseActive });
  const incidents = usePolling<{ incidents: IncidentRow[] }>("/api/monitor/incidents", 10000);
  const loginLog = usePolling<{ ok: boolean; events: LoginLogEvent[] }>("/api/auth/login-log", 8000, {
    enabled: canViewLoginLog && !sseActive,
  });

  // Sumber data: SSE dulu, fallback polling
  const monData = (sseActive ? sse.data?.monitor : null) ?? monitor.data;
  const talData: TallyResponse | null = (sseActive ? sse.data?.tally : null) ?? tally.data;
  const logData = (sseActive && canViewLoginLog ? sse.data?.loginLog : null) ?? loginLog.data;
  const failedLogins5m = monData?.failedLogins5m ?? 0;

  const [form, setForm] = useState({ reporterName: "", reporterNim: "", incidentType: "KECURANGAN_TPS", location: "", description: "" });
  const [sendState, setSendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submitIncident = async () => {
    if (!form.reporterName || !form.location || !form.description) return;
    setSendState("sending");
    try {
      const res = await fetch("/api/monitor/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.ok) {
        setSendState("sent");
        setForm({ reporterName: "", reporterNim: "", incidentType: "KECURANGAN_TPS", location: "", description: "" });
        incidents.refresh();
      } else setSendState("error");
    } catch {
      setSendState("error");
    }
  };

  if (monitor.loading && !monData) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }
  if (!monData) return <p className="text-sm text-[#4A5851]">Monitor gagal terhubung.</p>;

  const data = monData;

  const turnout = Math.round(data.kpis.turnoutPct * 10) / 10;
  const maxHour = Math.max(1, ...data.attendanceByHour.map((h) => h.count));

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-[#141E19]">
            LIVE AUDIT MONITOR <span className="text-[#1B7F4E]">PANWASLU</span>
          </h2>
          <p className="mt-1 text-[13px] text-[#4A5851]">
            Pemantauan pemungutan online 100% — audit trail append-only tanpa akses isi suara (FR-08.1, FR-08.4)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Indikator koneksi realtime (Rekomendasi #8) */}
          <Badge variant="outline" className={`gap-1.5 rounded-full border ${sseActive ? "border-[#1B7F4E] bg-[#DCFCE7] text-[#0F5132]" : "border-[#D8D3C8] bg-[#EAE6DF] text-[#4A5851]"}`}>
            {sseActive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {sseActive ? "REALTIME SSE" : "MODE POLLING"}
          </Badge>
          <Badge variant="outline" className={`gap-1.5 rounded-full border ${data.emergencyFreeze ? "border-[#E05A47] bg-[#FDE8E5] text-[#842029]" : data.votingOpen ? "border-[#1B7F4E] bg-[#DCFCE7] text-[#0F5132]" : "border-[#D8D3C8] bg-[#EAE6DF] text-[#4A5851]"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${data.votingOpen && !data.emergencyFreeze ? "bg-[#1B7F4E] live-dot" : "bg-current"}`} />
            {data.emergencyFreeze ? "EMERGENCY FREEZE" : data.votingOpen ? "PEMUNGUTAN AKTIF" : "PEMUNGUTAN DITUTUP"}
          </Badge>
          <Badge variant="outline" className={`gap-1.5 rounded-full border font-mono-tabular ${data.integrity.allValid ? "border-[#1B7F4E] bg-[#DCFCE7] text-[#0F5132]" : "border-[#E05A47] bg-[#FDE8E5] text-[#842029]"}`}>
            <ShieldCheck className="h-3 w-3" />
            {data.integrity.allValid
              ? `✓ SHA-256 VERIFIED — ${data.integrity.chains.filter((c) => c.valid).length}/${data.integrity.chains.length} RANTAI`
              : "✗ CHAIN BROKEN"}
          </Badge>
        </div>
      </div>

      {/* Alarm keamanan realtime (Rekomendasi #8) */}
      {(failedLogins5m > 0 || sse.lastAuth) && (
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] border-2 border-[#E05A47] bg-[#FDE8E5] px-4 py-3">
          <span className="flex items-center gap-2 text-[13px] font-extrabold text-[#842029]">
            <ShieldAlert className="h-4 w-4" />
            {failedLogins5m > 0
              ? `${failedLogins5m} percobaan login gagal/terblokir dalam 5 menit terakhir`
              : "Aktivitas otentikasi baru terdeteksi"}
          </span>
          {sse.lastAuth && (
            <span className="flex-1 text-[12px] font-semibold text-[#842029]">
              {new Date(sse.lastAuth.at).toLocaleTimeString("id-ID")} — {sse.lastAuth.detail}
            </span>
          )}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total DPT Terdaftar" value={String(data.kpis.dptTotal)} sub={`${data.kpis.belumMemilih} belum memilih`} icon={<Users className="h-4 w-4" />} accent="#B45309" />
        <div className="bento-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A8881]">Turnout</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#EAE6DF] text-[#1B7F4E]"><Vote className="h-4 w-4" /></div>
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-[#141E19]">{turnout}%</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#EAE6DF]">
            <div className="h-full rounded-full bg-[#1B7F4E] transition-all duration-700" style={{ width: `${Math.min(100, turnout)}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] font-semibold text-[#4A5851]">{data.kpis.sudahMemilih} dari {data.kpis.dptTotal} pemilih</p>
        </div>
        <KpiCard label="Token Aktif Online" value={String(data.kpis.tokenAktif)} sub={`${data.kpis.dalamAntrean} pemilih dalam antrean • ${data.kpis.tokenExpired} kedaluwarsa`} icon={<Hourglass className="h-4 w-4" />} accent="#B45309" />
        <KpiCard
          label="Integritas 5 Rantai Prodi"
          value={data.integrity.allValid ? "VALID" : "BROKEN"}
          sub={`${data.integrity.totalChecked} blok diverifikasi • ${data.integrity.chains.filter((c) => c.valid).length}/${data.integrity.chains.length} rantai sah`}
          icon={<Hash className="h-4 w-4" />}
          accent={data.integrity.allValid ? "#1B7F4E" : "#E05A47"}
        />
      </div>

      {/* Strip 5 rantai prodi + statistik re-vote (Pemira 100% online + Estonia) */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="bento-card p-4 lg:col-span-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A8881]">Rantai Hash per Prodi — Head & Integritas</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {data.integrity.chains.map((c) => (
              <div
                key={c.tpsId}
                className={`rounded-[8px] border-2 px-3 py-2 ${c.valid ? "border-[#1B7F4E]/50 bg-[#F6F4EE]" : "border-[#E05A47] bg-[#FDE8E5]"}`}
                title={`${c.name} — head ${c.headHash.slice(0, 16)}…`}
              >
                <p className={`font-mono text-[11px] font-extrabold tracking-wide ${c.valid ? "text-[#13613B]" : "text-[#842029]"}`}>
                  {c.tpsId} {c.valid ? "✓" : "✗"}
                </p>
                <p className="font-mono-tabular text-[10px] text-[#4A5851]">{c.checkedCount} blok</p>
                <p className="font-mono-tabular text-[9px] text-[#7A8881]">{c.headHash.slice(0, 10)}…</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bento-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A8881]">Re-vote (Model Estonia)</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-[8px] border border-[#D8D3C8] bg-[#F6F4EE] px-3 py-2">
              <p className="font-display text-xl font-extrabold tabular-nums text-[#141E19]">{data.revoteStats?.tokensRevoted ?? 0}</p>
              <p className="text-[10px] font-semibold text-[#4A5851]">token ganti suara</p>
            </div>
            <div className="rounded-[8px] border border-[#D8D3C8] bg-[#F6F4EE] px-3 py-2">
              <p className="font-display text-xl font-extrabold tabular-nums text-[#141E19]">{data.revoteStats?.supersededBallots ?? 0}</p>
              <p className="text-[10px] font-semibold text-[#4A5851]">blok usang (tak dihitung)</p>
            </div>
            <div className="rounded-[8px] border border-[#D8D3C8] bg-[#F6F4EE] px-3 py-2">
              <p className="font-display text-xl font-extrabold tabular-nums text-[#141E19]">{data.revoteStats?.lockedTokens ?? 0}</p>
              <p className="text-[10px] font-semibold text-[#4A5851]">suara dikunci final</p>
            </div>
            <div className="rounded-[8px] border border-[#D8D3C8] bg-[#F6F4EE] px-3 py-2">
              <p className="font-display text-xl font-extrabold tabular-nums text-[#141E19]">{data.kpis.revokedTokens ?? 0}</p>
              <p className="text-[10px] font-semibold text-[#4A5851]">token dicabut petugas</p>
            </div>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-[#7A8881]">
            Suara terakhir per token yang dihitung; token REVOKED dikecualikan seluruhnya.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        {/* ---------- Kolom kiri: attendance + logs ---------- */}
        <div className="space-y-5 xl:col-span-2">
          {/* Laju kedatangan per jam */}
          <div className="bento-card p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-[#141E19]">
              <Activity className="h-4 w-4 text-[#1B7F4E]" /> Laju Kedatangan Pemilih per Jam
            </h3>
            {data.attendanceByHour.length === 0 ? (
              <p className="mt-4 text-[13px] text-[#4A5851]">Belum ada pemilih yang hadir.</p>
            ) : (
              <div className="mt-4 flex items-end gap-3" style={{ height: 120 }}>
                {data.attendanceByHour.map((h) => (
                  <div key={h.hour} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="font-mono-tabular text-[11px] font-bold text-[#4A5851]">{h.count}</span>
                    <div
                      className="w-full max-w-14 rounded-t-[4px] bg-[#1B7F4E] transition-all duration-700"
                      style={{ height: `${(h.count / maxHour) * 88}px` }}
                    />
                    <span className="font-mono-tabular text-[10px] text-[#7A8881]">{String(h.hour).padStart(2, "0")}:00</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit log feed */}
          <div className="bento-card p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-[#141E19]">
              <FileWarning className="h-4 w-4 text-[#B45309]" /> Audit Log — Append Only (FR-08.4)
            </h3>
            <div className="nice-scroll mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {data.logs.map((log) => {
                const meta = EVENT_META[log.event] ?? { label: log.event, cls: "bg-[#EAE6DF] text-[#4A5851]" };
                return (
                  <div key={log.id} className="flex items-start gap-3 rounded-[8px] bg-[#F6F4EE] px-3.5 py-2.5">
                    <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-wide ${meta.cls}`}>{meta.label}</span>
                    <p className="flex-1 text-[12px] leading-relaxed text-[#4A5851]">{log.detail}</p>
                    <span className="shrink-0 font-mono-tabular text-[10px] text-[#7A8881]">
                      {new Date(log.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Log aktivitas login operator — khusus PANWASLU / ITPO / KPUM */}
          {canViewLoginLog && (
            <div className="bento-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-display text-base font-bold text-[#141E19]">
                  <LogIn className="h-4 w-4 text-[#1B7F4E]" /> Log Aktivitas Login — Operator
                </h3>
                <span className="rounded-full border border-[#D8D3C8] bg-[#EAE6DF] px-2.5 py-0.5 font-mono-tabular text-[9.5px] font-bold tracking-wide text-[#4A5851]">
                  RBAC: PANWASLU • ITPO • KPUM — SAKSI 403
                </span>
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[#4A5851]">
                Jejak otentikasi append-only: login sukses, percobaan gagal, logout, dan pergantian password (menu SANDI di navbar).
              </p>
              <div className="nice-scroll mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {!logData ? (
                  <p className="px-1 py-2 text-[12px] text-[#7A8881]">Memuat log otentikasi…</p>
                ) : (logData.events.length ?? 0) === 0 ? (
                  <p className="px-1 py-2 text-[12px] text-[#7A8881]">Belum ada aktivitas login tercatat.</p>
                ) : (
                  logData.events.map((ev) => {
                    const meta = EVENT_META[ev.event] ?? { label: ev.event, cls: "bg-[#EAE6DF] text-[#4A5851]" };
                    const d = new Date(ev.createdAt);
                    return (
                      <div key={ev.id} className="flex items-start gap-3 rounded-[8px] bg-[#F6F4EE] px-3.5 py-2.5">
                        <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-wide ${meta.cls}`}>{meta.label}</span>
                        <p className="flex-1 text-[12px] leading-relaxed text-[#4A5851]">{ev.detail}</p>
                        <span className="shrink-0 font-mono-tabular text-[10px] text-[#7A8881]">
                          {d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} {d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* ---------- Kolom kanan: vault + sengketa ---------- */}
        <div className="space-y-5">
          {/* Pleno Vault (FR-06.3) */}
          <div className="bento-card relative overflow-hidden p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-[#141E19]">
              {talData?.locked ? <Lock className="h-4 w-4 text-[#B45309]" /> : <LockOpen className="h-4 w-4 text-[#1B7F4E]" />}
              Kotak Suara Digital
            </h3>

            {talData?.locked ? (
              <div className="mt-4 flex flex-col items-center rounded-[10px] border-2 border-dashed border-[#C9C3B6] bg-[#F6F4EE] px-4 py-10 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#141E19] bg-[#FEF5D6] shadow-[3px_3px_0px_#141E19]">
                  <Lock className="h-6 w-6 text-[#B45309]" />
                </div>
                <p className="font-display text-sm font-extrabold tracking-wide text-[#141E19]">CRYPTOGRAPHIC VAULT LOCKED</p>
                <p className="mt-2 max-w-xs text-[12px] leading-relaxed text-[#4A5851]">
                  Distribusi perolehan suara tidak dapat diakses sebelum Ketua KPUM mengeksekusi Pleno Unlocking
                  (endpoint mengembalikan 423 Locked).
                </p>
                <p className="mt-3 font-mono-tabular text-[10px] text-[#7A8881]">STATUS: 423 LOCKED — {data.kpis.ballotsCount} blok suara tersegel</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {talData?.categories
                  ?.filter((cat) => cat.category !== "HIMA")
                  .map((cat) => (
                    <div key={cat.category} className="rounded-[10px] border border-[#D8D3C8] bg-[#F6F4EE] p-3.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A5851]">{cat.category}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${cat.outcome === "TERPILIH" ? "bg-[#DCFCE7] text-[#0F5132]" : cat.outcome === "STATUS_SERI_PENDING_PLENO" ? "bg-[#FEF5D6] text-[#8A5200]" : "bg-[#EAE6DF] text-[#4A5851]"}`}>
                          {cat.outcome}
                        </span>
                      </div>
                      <div className="mt-2.5 space-y-2">
                        {cat.results.map((r) => (
                          <div key={r.candidateId ?? "suara-kosong"}>
                            <div className="flex items-center justify-between text-[12px]">
                              <span className={`truncate font-semibold ${r.isEmptyBox ? "italic text-[#4A5851]" : "text-[#141E19]"}`}>
                                {r.isEmptyBox ? "Suara Kosong" : `${String(r.number).padStart(2, "0")} — ${r.name}`}
                              </span>
                              <span className="ml-2 shrink-0 font-mono-tabular text-[#4A5851]">{r.votes} • {r.percentage.toFixed(1)}%</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#EAE6DF]">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${r.percentage}%`, background: r.isEmptyBox ? "#7A8881" : "#1B7F4E" }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                {talData?.categories
                  ?.filter((c) => c.category === "HIMA")
                  .map((cat) => (
                    <div key={cat.studyProgramId} className="rounded-[10px] border border-[#D8D3C8] bg-[#F6F4EE] p-3.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A5851]">HIMA {cat.studyProgramId}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${cat.outcome === "TERPILIH" ? "bg-[#DCFCE7] text-[#0F5132]" : cat.outcome === "MANDAT_KEMBALI_KE_MUSYAWARAH_MAHASISWA" ? "bg-[#FDE8E5] text-[#842029]" : "bg-[#EAE6DF] text-[#4A5851]"}`}>
                          {cat.outcome === "MANDAT_KEMBALI_KE_MUSYAWARAH_MAHASISWA" ? "MANDAT → MUSMAH" : cat.outcome}
                        </span>
                      </div>
                      <div className="mt-2.5 space-y-2">
                        {cat.results.map((r) => (
                          <div key={r.candidateId ?? "suara-kosong"}>
                            <div className="flex items-center justify-between text-[12px]">
                              <span className={`truncate font-semibold ${r.isEmptyBox ? "italic text-[#4A5851]" : "text-[#141E19]"}`}>
                                {r.isEmptyBox ? "Suara Kosong" : `${String(r.number).padStart(2, "0")} — ${r.name}`}
                              </span>
                              <span className="ml-2 shrink-0 font-mono-tabular text-[#4A5851]">{r.votes} • {r.percentage.toFixed(1)}%</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#EAE6DF]">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${r.percentage}%`, background: r.isEmptyBox ? "#7A8881" : "#1B7F4E" }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] leading-relaxed text-[#7A8881]">{cat.outcomeDetail}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Formulir Sengketa (FR-08.2) — RBAC: PANWASLU/ITPO */}
          <div className="bento-card p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-[#141E19]">
              <FileWarning className="h-4 w-4 text-[#E05A47]" /> Laporan Sengketa &amp; Pelanggaran
            </h3>
            {operatorRole && !canManageIncidents && (
              <p className="mt-3 rounded-[8px] border border-[#D8D3C8] bg-[#F6F4EE] px-3 py-2 text-[12px] leading-relaxed text-[#4A5851]">
                Sesi Anda <span className="font-mono font-bold text-[#8A5200]">{operatorRole}</span> bersifat pemantau — pencatatan sengketa hanya kewenangan Panwaslu (PRD Bab 3 / FR-08.2).
              </p>
            )}
            <div className={`mt-3 space-y-2.5 ${canManageIncidents ? "" : "pointer-events-none opacity-40"}`} aria-hidden={!canManageIncidents}>
              <Input
                value={form.reporterName}
                onChange={(e) => setForm((f) => ({ ...f, reporterName: e.target.value }))}
                placeholder="Nama pelapor"
                className="h-10 rounded-[8px] border-[#D8D3C8] bg-white text-[13px] focus-visible:ring-[#1B7F4E]"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  value={form.reporterNim}
                  onChange={(e) => setForm((f) => ({ ...f, reporterNim: e.target.value }))}
                  placeholder="NIM (opsional)"
                  className="h-10 rounded-[8px] border-[#D8D3C8] bg-white font-mono-tabular text-[13px] focus-visible:ring-[#1B7F4E]"
                />
                <select
                  value={form.incidentType}
                  onChange={(e) => setForm((f) => ({ ...f, incidentType: e.target.value }))}
                  aria-label="Jenis pelanggaran"
                  className="h-10 rounded-[8px] border border-[#D8D3C8] bg-white px-2 text-[13px] text-[#141E19] outline-none focus:border-[#1B7F4E]"
                >
                  <option value="PELANGGARAN_KAMPANYE">Pelanggaran Kampanye</option>
                  <option value="KECURANGAN_TPS">Kecurangan TPS</option>
                  <option value="MALFUNGSI_SISTEM">Malfungsi Sistem</option>
                  <option value="LAINNYA">Lainnya</option>
                </select>
              </div>
              <Input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Lokasi kejadian"
                className="h-10 rounded-[8px] border-[#D8D3C8] bg-white text-[13px] focus-visible:ring-[#1B7F4E]"
              />
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Deskripsi peristiwa…"
                className="min-h-20 rounded-[8px] border-[#D8D3C8] bg-white text-[13px] focus-visible:ring-[#1B7F4E]"
              />
              <button
                type="button"
                disabled={sendState === "sending" || !form.reporterName || !form.location || !form.description}
                onClick={submitIncident}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border-2 border-[#141E19] bg-[#1B7F4E] text-[13px] font-extrabold text-white shadow-[3px_3px_0px_#141E19] transition-all enabled:hover:-translate-y-0.5 enabled:hover:bg-[#13613B] enabled:active:translate-y-0 enabled:active:shadow-[1px_1px_0px_#141E19] disabled:opacity-40"
              >
                <Send className="h-4 w-4" /> {sendState === "sending" ? "MENGIRIM…" : "KIRIM LAPORAN SENGKETA"}
              </button>
              {sendState === "sent" && (
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0F5132]">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Laporan tersimpan dengan nomor tiket.
                </p>
              )}
            </div>

            {/* Daftar sengketa */}
            <div className="nice-scroll mt-4 max-h-44 space-y-2 overflow-y-auto pr-1">
              {(incidents.data?.incidents ?? []).map((inc) => (
                <div key={inc.id} className="rounded-[8px] border border-[#D8D3C8] bg-white px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular text-[11px] font-bold text-[#8A5200]">{inc.ticketNumber}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${inc.status === "RESOLVED" ? "bg-[#DCFCE7] text-[#0F5132]" : inc.status === "IN_REVIEW" ? "bg-[#FEF5D6] text-[#8A5200]" : "bg-[#EAE6DF] text-[#4A5851]"}`}>
                      {inc.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-[#4A5851]">{inc.incidentType.replaceAll("_", " ")} — {inc.location}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
