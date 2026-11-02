"use client";

// ============================================================
// ALERT CENTER — Pusat peringatan operasional (Rekomendasi #7)
// Polling 15 s ke /api/monitor/alerts. Kartu per severity + tombol ACK
// prosedural (tercatat append-only). Dipasang di Monitor Panwaslu & Dashboard KPUM.
// ============================================================
import { useState } from "react";
import { usePolling } from "@/hooks/use-polling";
import { AlertTriangle, Bell, CircleAlert, Loader2, OctagonX, ShieldQuestion, Siren } from "lucide-react";
import type { AlertItem, AlertSeverity } from "@/lib/server/alerts";

interface AlertsResponse {
  ok: boolean;
  alerts: AlertItem[];
  evaluatedAt: string;
}

const SEVERITY_STYLE: Record<AlertSeverity, { border: string; bg: string; text: string; icon: React.ReactNode; label: string }> = {
  CRITICAL: { border: "border-[#B42318]", bg: "#FDECEA", text: "#8A1C10", icon: <Siren className="h-4 w-4" />, label: "KRITIS" },
  HIGH: { border: "border-[#E05A47]", bg: "#FDE8E5", text: "#842029", icon: <OctagonX className="h-4 w-4" />, label: "TINGGI" },
  WARNING: { border: "border-[#F2B705]", bg: "#FEF5D6", text: "#8A5200", icon: <AlertTriangle className="h-4 w-4" />, label: "WASPADA" },
  INFO: { border: "border-[#3F4743]", bg: "#F6F4EE", text: "#3F4743", icon: <ShieldQuestion className="h-4 w-4" />, label: "INFO" },
};

export function AlertCenter() {
  const { data, error, loading } = usePolling<AlertsResponse>("/api/monitor/alerts", 15000);
  const [acking, setAcking] = useState<string | null>(null);
  const [ackMsg, setAckMsg] = useState<string | null>(null);

  const alerts = data?.alerts ?? [];
  const criticalCount = alerts.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH").length;

  async function ack(alertId: string) {
    setAcking(alertId);
    setAckMsg(null);
    try {
      const res = await fetch("/api/monitor/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      const body = await res.json();
      setAckMsg(body.message ?? (res.ok ? "Ter-ACK." : "Gagal ACK."));
    } catch {
      setAckMsg("Kesalahan jaringan saat ACK.");
    } finally {
      setAcking(null);
    }
  }

  return (
    <section
      aria-label="Pusat peringatan operasional"
      className="rounded-[14px] border-2 border-[#141E19] bg-white p-4 shadow-[5px_5px_0px_#141E19] md:p-5"
      data-testid="alert-center"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-[17px] font-extrabold tracking-[-0.01em] text-[#141E19]">
          <Bell className="h-4.5 w-4.5 text-[#E05A47]" aria-hidden />
          Pusat Peringatan
          {criticalCount > 0 && (
            <span className="rounded-full border-2 border-[#B42318] bg-[#FDECEA] px-2 py-0.5 font-mono text-[10.5px] font-extrabold text-[#8A1C10]">
              {criticalCount} TINDAK LANJUTI
            </span>
          )}
        </h2>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-[#7A8881]">
          {loading && !data ? "mengevaluasi…" : `evaluasi ${data?.evaluatedAt ? new Date(data.evaluatedAt).toLocaleTimeString("id-ID") : "—"} • poll 15 s`}
        </span>
      </div>

      {error && <p className="mt-2 text-[12px] font-semibold text-[#842029]">Gagal memuat peringatan — akan dicoba ulang otomatis.</p>}

      {alerts.length === 0 && !error && (
        <p className="mt-3 flex items-center gap-2 rounded-[8px] border border-[#1B7F4E] bg-[#E6F4EC] px-3 py-2.5 text-[12.5px] font-semibold text-[#0F5132]">
          <CircleAlert className="h-4 w-4" aria-hidden />
          Aman — tidak ada peringatan aktif. Evaluator memantau: freeze, stok stasioner, badai login, integritas rantai, kegagalan backup, kepatuhan 2FA.
        </p>
      )}

      <ul className="mt-3 space-y-2.5">
        {alerts.map((a) => {
          const style = SEVERITY_STYLE[a.severity];
          return (
            <li key={a.id} className="rounded-[10px] border-2 p-3" style={{ borderColor: style.border, backgroundColor: style.bg }}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-[240px] flex-1">
                  <p className="flex items-center gap-1.5 text-[13.5px] font-extrabold" style={{ color: style.text }}>
                    {style.icon} {a.title}
                    <span className="rounded-full border px-1.5 py-px font-mono text-[9.5px] font-bold" style={{ borderColor: style.border, color: style.text }}>
                      {style.label}
                    </span>
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#3D4A43]">{a.detail}</p>
                  <p className="mt-1 font-mono text-[10.5px] text-[#64786F]">{a.evidence}</p>
                </div>
                <button
                  type="button"
                  disabled={acking === a.id}
                  onClick={() => void ack(a.id)}
                  className="h-9 shrink-0 rounded-[8px] border-2 border-[#141E19] bg-white px-3 text-[11px] font-extrabold text-[#141E19] shadow-[2px_2px_0px_#141E19] hover:bg-[#F6F4EE] disabled:opacity-60"
                >
                  {acking === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : "ACK"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {ackMsg && <p className="mt-2.5 text-[12px] font-semibold text-[#4A5851]" role="status">{ackMsg}</p>}
    </section>
  );
}
