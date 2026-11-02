"use client";

// ============================================================
// DASBOR TURNOUT & ANTREAN (Rekomendasi #9 — Task 19)
// Senjata mobilisasi meja PPUR/KPUM: turnout per prodi & angkatan,
// momentum suara per menit + prediksi target 80%, dan antrean per
// TPS virtual. Auto-refresh 10 detik — konsisten tema terang bento.
// ============================================================
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, GraduationCap, TrendingUp, Users, UsersRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePolling } from "@/hooks/use-polling";
import type { TurnoutResponse, TurnoutProdiRow } from "@/lib/types";

const GREEN = "#1B7F4E";
const INK = "#141E19";
const MUTED = "#4A5851";

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub?: string }) {
  return (
    <div className="bento-card flex flex-col gap-1 p-4" role="group" aria-label={label}>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#7A8881]">
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </div>
      <div className="font-display text-2xl font-bold tracking-[-0.02em] text-[#141E19]">{value}</div>
      {sub ? <div className="text-[12px] text-[#4A5851]">{sub}</div> : null}
    </div>
  );
}

function pctBar(pct: number): string {
  if (pct >= 80) return "bg-[#1B7F4E]";
  if (pct >= 50) return "bg-[#7CB342]";
  if (pct >= 25) return "bg-[#F2B705]";
  return "bg-[#D97706]";
}

function ProdiRow({ p, rank }: { p: TurnoutProdiRow; rank: number }) {
  return (
    <div className="flex items-center gap-3 py-2" aria-label={`${p.name}: ${p.pct}%`}>
      <span className="w-6 text-center text-[12px] font-bold text-[#7A8881]">{rank}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-bold text-[#141E19]">{p.name}</span>
          <span className="shrink-0 text-[12px] font-bold text-[#4A5851]">
            {p.voted}/{p.dpt} · {p.pct}%
          </span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#EAE6DF]" role="presentation">
          <div className={`h-full rounded-full ${pctBar(p.pct)}`} style={{ width: `${Math.min(100, p.pct)}%` }} />
        </div>
      </div>
    </div>
  );
}

export function TurnoutPanel() {
  const { data, loading } = usePolling<TurnoutResponse>("/api/ppur/turnout", 10_000);

  const tertinggal = useMemo(() => {
    if (!data) return [];
    return [...data.perProdi].filter((p) => p.dpt > 0).sort((a, b) => a.pct - b.pct).slice(0, 3);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="bento-card space-y-3 p-5" aria-busy="true" aria-label="Memuat dasbor turnout">
        <Skeleton className="h-5 w-56" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-[12px]" />
          ))}
        </div>
      </div>
    );
  }
  if (!data?.ok) return null;

  return (
    <div className="bento-card space-y-4 p-5" aria-label="Dasbor Turnout dan Antrean">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-bold tracking-[-0.02em]">Turnout &amp; Antrean — Senjata Mobilisasi</h2>
          <p className="mt-1 text-[13px] text-[#4A5851]">
            Peta partisipasi real-time: fokuskan blitz ke prodi tertinggal. Diperbarui tiap 10 detik.
          </p>
        </div>
        <div className="rounded-full border border-[#D8D3C8] bg-white px-3 py-1 text-[11px] font-bold text-[#4A5851]">
          <Activity className="mr-1 inline h-3.5 w-3.5 text-[#1B7F4E]" aria-hidden />
          {new Date(data.updatedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      </div>

      {/* Kartu statistik utama */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={UsersRound} label="Partisipasi" value={`${data.total.pct}%`} sub={`${data.total.voted} dari ${data.total.dpt} DPT`} />
        <StatCard icon={TrendingUp} label="Momentum" value={`${data.momentum.ratePerMin}/mnt`} sub={`${data.momentum.last30Min} suara dalam 30 menit terakhir`} />
        <StatCard icon={Activity} label="Prediksi 80%" value={data.momentum.eta80PctMinutes === null ? "—" : `±${data.momentum.eta80PctMinutes} mnt`} sub={data.momentum.etaLabel} />
        <StatCard icon={Users} label="Antrean Aktif" value={String(data.total.antrean)} sub={`${data.total.belum} belum memilih`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Leaderboard prodi */}
        <div>
          <h3 className="mb-1 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-[#4A5851]">
            <GraduationCap className="h-4 w-4" aria-hidden /> Turnout per Program Studi
          </h3>
          <div className="nice-scroll max-h-[240px] overflow-y-auto pr-1">
            {[...data.perProdi].sort((a, b) => b.pct - a.pct).map((p, i) => (
              <ProdiRow key={p.id} p={p} rank={i + 1} />
            ))}
          </div>
        </div>

        {/* Timeline 15 menit */}
        <div>
          <h3 className="mb-1 text-[12px] font-bold uppercase tracking-wider text-[#4A5851]">
            Gelombang Suara (per 15 menit, 6 jam terakhir)
          </h3>
          <div className="h-[240px] rounded-[12px] border border-[#D8D3C8] bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.timeline} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: MUTED }} interval="preserveStartEnd" minTickGap={28} />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #D8D3C8", fontSize: 12 }}
                  labelStyle={{ fontWeight: 700 }}
                  formatter={(v: number) => [`${v} suara`, "Jatuh tempo"]}
                />
                <Line type="monotone" dataKey="voted" stroke={GREEN} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Prodi tertinggal — target blitz */}
        <div>
          <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[#4A5851]">Prioritas Blitz — Prodi Tertinggal</h3>
          <div className="space-y-2">
            {tertinggal.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-[10px] border border-[#F2B705]/40 bg-[#FEF5D6] px-3 py-2">
                <span className="text-[13px] font-bold text-[#8A5200]">{p.name}</span>
                <span className="text-[12px] font-bold text-[#8A5200]">{p.pct}% · {p.dpt - p.voted} suara tertunda</span>
              </div>
            ))}
            {tertinggal.length === 0 ? <p className="text-[13px] text-[#4A5851]">Semua prodi sudah memilih. Luar biasa! 🎉</p> : null}
          </div>
        </div>

        {/* Antrean per TPS virtual */}
        <div>
          <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[#4A5851]">Beban TPS Virtual</h3>
          <div className="h-[132px] rounded-[12px] border border-[#D8D3C8] bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.perTps} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
                <XAxis dataKey="id" tick={{ fontSize: 10, fill: MUTED }} />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #D8D3C8", fontSize: 12 }}
                  formatter={(v: number, name: string) => [v, name === "voted" ? "Sudah memilih" : "DPT"]}
                />
                <Bar dataKey="dpt" fill="#EAE6DF" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="voted" fill={GREEN} radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  {data.perTps.map((t) => (
                    <Cell key={t.id} fill={GREEN} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[11px] text-[#7A8881]">Hijau = sudah memilih, abu = DPT per rantai prodi. Antrean aktif: {data.perTps.reduce((s, t) => s + t.antrean, 0)} token.</p>
        </div>
      </div>
    </div>
  );
}
