"use client";

// ============================================================
// POS BANTUAN PPUR — FR-02 & FR-04 (Pemira 100% Online)
// Pencarian NIM < 3 detik, pill filter status, generator token + QR
// (mahasiswa scan slip → /pemilih?token=…), penanganan kasus khusus:
// cabut token (anti-paksaan lapis 3) + pemulihan hak pilih.
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePolling } from "@/hooks/use-polling";
import type { PpurVotersResponse, VoterRow } from "@/lib/types";
import { AlertTriangle, BadgeCheck, Ban, Clock, IdCard, Printer, RefreshCw, Search, ShieldAlert, Timer, UserRoundCheck } from "lucide-react";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  BELUM_MEMILIH: { label: "Belum Memilih", cls: "bg-[#EAE6DF] text-[#4A5851] border-[#D8D3C8]" },
  DALAM_ANTREAN: { label: "Dalam Antrean", cls: "bg-[#FEF5D6] text-[#8A5200] border-[#F2B705]" },
  SUDAH_MEMILIH: { label: "Sudah Memilih", cls: "bg-[#DCFCE7] text-[#0F5132] border-[#1B7F4E]" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.BELUM_MEMILIH;
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.cls}`}>{meta.label}</span>;
}

interface IssuedToken {
  token: string;
  expiresAt: number;
  voterName: string;
  voterNim: string;
  studyProgramId: string;
  qrDataUrl: string;
}

export function PpurDesk() {
  const { data, loading, refresh } = usePolling<PpurVotersResponse>("/api/ppur/voters?filter=ALL", 6000);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<"ALL" | "BELUM_MEMILIH" | "DALAM_ANTREAN" | "SUDAH_MEMILIH">("ALL");
  const [selected, setSelected] = useState<VoterRow | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedToken | null>(null);
  const [now, setNow] = useState(Date.now());
  // Penanganan kasus khusus: cabut token lama (slip diserahkan pemilih)
  const [revokeCode, setRevokeCode] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [revokeMsg, setRevokeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (issued) {
      const t = setInterval(() => setNow(Date.now()), 500);
      return () => clearInterval(t);
    }
  }, [issued]);

  const url = useMemo(() => {
    const p = new URLSearchParams({ filter });
    if (debounced) p.set("q", debounced);
    return `/api/ppur/voters?${p.toString()}`;
  }, [filter, debounced]);

  const { data: filtered, refresh: refreshFiltered } = usePolling<PpurVotersResponse>(url, 5000);
  const rows = filtered?.voters ?? data?.voters ?? [];
  const counts = filtered?.counts ?? data?.counts ?? { all: 0, belum: 0, antrean: 0, sudah: 0 };

  const issueToken = useCallback(
    async (voter: VoterRow) => {
      setIssuing(true);
      setIssueError(null);
      try {
        const res = await fetch("/api/ppur/issue-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voterId: voter.id, note: "Terbit ulang atas permintaan petugas" }),
        });
        const json = await res.json();
        if (!json.ok) {
          setIssueError(json.message ?? "Gagal menerbitkan token.");
          return;
        }
        // QR menuju Portal Pemilih dengan token terisi — mahasiswa cukup scan
        const qrTarget = `${window.location.origin}/pemilih?token=${json.token}`;
        const qrDataUrl = await QRCode.toDataURL(qrTarget, {
          width: 320,
          margin: 1,
          color: { dark: "#141E19", light: "#FFFFFF" },
        });
        setIssued({
          token: json.token,
          expiresAt: new Date(json.expiresAt).getTime(),
          voterName: voter.name,
          voterNim: voter.nim,
          studyProgramId: voter.studyProgramId,
          qrDataUrl,
        });
        setNow(Date.now());
        refresh();
        refreshFiltered();
      } catch {
        setIssueError("Koneksi gagal saat menerbitkan token.");
      } finally {
        setIssuing(false);
      }
    },
    [refresh, refreshFiltered]
  );

  const remainingMs = issued ? Math.max(0, issued.expiresAt - now) : 0;
  const mm = String(Math.floor(remainingMs / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0");
  const pctLeft = issued ? (remainingMs / (10 * 60_000)) * 100 : 0;
  const expired = issued && remainingMs <= 0;

  const revokeToken = useCallback(async () => {
    if (revokeCode.trim().length !== 6) {
      setRevokeMsg({ ok: false, text: "Kode token lama harus 6 karakter (sesuai slip yang diserahkan pemilih)." });
      return;
    }
    setRevoking(true);
    setRevokeMsg(null);
    try {
      const res = await fetch("/api/ppur/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: revokeCode.trim().toUpperCase(),
          voterId: selected?.id ?? null,
          resetRights: selected?.status === "SUDAH_MEMILIH",
          note: "Pencabutan di pos bantuan (kasus khusus)",
        }),
      });
      const json = await res.json();
      setRevokeMsg({ ok: Boolean(json.ok), text: json.message ?? json.detail ?? "Selesai." });
      if (json.ok) {
        setRevokeCode("");
        refresh();
        refreshFiltered();
      }
    } catch {
      setRevokeMsg({ ok: false, text: "Koneksi gagal saat mencabut token." });
    } finally {
      setRevoking(false);
    }
  }, [revokeCode, selected, refresh, refreshFiltered]);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* ================= PANEL KIRI (60%) — Pencarian & Tabel DPT ================= */}
      <section className="lg:col-span-3 space-y-4">
        <div className="bento-card p-5">
          <h2 className="font-display text-xl font-bold tracking-[-0.02em]">DPT Online — Pencarian Pemilih</h2>
          <p className="mt-1 text-[13px] text-[#4A5851]">
            Ketik NIM/nama mahasiswa (coba juga scan barcode KTM). Pencarian real-time terhadap Daftar Pemilih Tetap terkunci.
          </p>
          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7A8881]" aria-hidden />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="NIM atau nama mahasiswa…"
              autoFocus
              className="h-[52px] rounded-[10px] border-[#D8D3C8] bg-white pl-12 text-base shadow-none focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
              aria-label="Pencarian DPT"
            />
          </div>

          {/* Pill Tabs */}
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter status pemilih">
            {(
              [
                { key: "ALL", label: `Semua DPT (${counts.all})` },
                { key: "BELUM_MEMILIH", label: `Belum Memilih (${counts.belum})` },
                { key: "DALAM_ANTREAN", label: `Dalam Antrean (${counts.antrean})` },
                { key: "SUDAH_MEMILIH", label: `Sudah Memilih (${counts.sudah})` },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={filter === t.key}
                onClick={() => setFilter(t.key)}
                className={`rounded-full border px-4 py-1.5 text-[12px] font-bold transition-colors ${
                  filter === t.key
                    ? "border-[#141E19] bg-[#141E19] text-white"
                    : "border-[#D8D3C8] bg-white text-[#4A5851] hover:border-[#141E19]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabel DPT */}
        <div className="bento-card overflow-hidden">
          <div className="nice-scroll max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#EAE6DF] text-[11px] uppercase tracking-wider text-[#4A5851]">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">NIM</th>
                  <th className="px-4 py-3 text-left font-bold">Nama</th>
                  <th className="px-4 py-3 text-left font-bold">Program Studi</th>
                  <th className="px-4 py-3 text-center font-bold">Status</th>
                  <th className="px-4 py-3 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8D3C8]">
                {loading && !data && (
                  <tr><td colSpan={5} className="p-4"><Skeleton className="h-8 w-full" /></td></tr>
                )}
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[#7A8881]">Tidak ada pemilih yang cocok.</td></tr>
                )}
                {rows.map((v) => (
                  <tr
                    key={v.id}
                    className={`transition-colors ${selected?.id === v.id ? "bg-[#E6F4EC]" : "hover:bg-[#F6F4EE]"}`}
                  >
                    <td className="px-4 py-2.5 font-mono-tabular text-[13px] font-semibold">{v.nim}</td>
                    <td className="px-4 py-2.5 font-semibold text-[#141E19]">{v.name}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ background: v.studyProgramColor }}
                      >
                        {v.studyProgramId}
                      </span>
                      <span className="ml-1.5 text-[12px] text-[#4A5851]">{v.studyProgramName.replace(/^(D3|D4) /, "")}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => { setSelected(v); setIssueError(null); }}
                        className="rounded-[8px] border border-[#D8D3C8] bg-white px-3 py-1.5 text-[12px] font-bold text-[#141E19] transition-colors hover:border-[#141E19]"
                      >
                        Pilih
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ================= PANEL KANAN (40%) — Verifikasi & Generator Token ================= */}
      <aside className="lg:col-span-2">
        <div className="bento-card sticky top-6 p-5">
          <h2 className="font-display text-xl font-bold tracking-[-0.02em]">Kartu Verifikasi &amp; Token</h2>

          {!selected ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-[10px] border border-dashed border-[#D8D3C8] bg-[#F6F4EE] px-6 py-12 text-center">
              <IdCard className="mb-3 h-10 w-10 text-[#C9C3B6]" />
              <p className="text-sm font-semibold text-[#4A5851]">Pilih seorang pemilih dari tabel</p>
              <p className="mt-1 text-xs text-[#7A8881]">Verifikasi identitas fisik KTM/KRS sebelum menerbitkan token.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-[10px] border border-[#D8D3C8] bg-[#F6F4EE] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold leading-snug">{selected.name}</p>
                    <p className="font-mono-tabular text-sm text-[#4A5851]">{selected.nim}</p>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white" style={{ background: selected.studyProgramColor }}>
                    {selected.studyProgramId}
                  </span>
                  <span className="text-xs text-[#4A5851]">{selected.studyProgramName}</span>
                  <span className="text-xs text-[#7A8881]">• Angkatan {selected.angkatan}</span>
                </div>
              </div>

              {selected.status === "SUDAH_MEMILIH" ? (
                <>
                  <div className="flex items-start gap-2 rounded-[10px] border border-[#D8D3C8] bg-[#EAE6DF] px-4 py-3">
                    <UserRoundCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0F5132]" />
                    <p className="text-[13px] font-semibold text-[#4A5851]">
                      Pemilih telah menggunakan hak pilihnya. Untuk kasus khusus (HP hilang / dipaksa), minta slip token lamanya lalu cabut di bawah.
                    </p>
                  </div>
                  {/* Kasus khusus: cabut token + pulihkan hak pilih (anti-paksaan lapis 3) */}
                  <div className="rounded-[10px] border-2 border-dashed border-[#D9822B] bg-[#FDF2E4] p-4">
                    <p className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-[#8A5200]">
                      <ShieldAlert className="h-4 w-4" /> Kasus Khusus — Cabut Token Lama
                    </p>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-[#8A5200]">
                      Pemilih menyerahkan slip token lama → token dicabut (semua suaranya dikeluarkan dari rekap) → hak pilih dipulihkan → terbitkan token baru.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Input
                        value={revokeCode}
                        onChange={(e) => setRevokeCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        placeholder="KODE TOKEN LAMA"
                        className="h-11 flex-1 border-[#D9822B] bg-white font-mono text-sm font-bold uppercase tracking-[0.2em]"
                        aria-label="Kode token lama yang dicabut"
                      />
                      <button
                        type="button"
                        disabled={revoking || revokeCode.length !== 6}
                        onClick={revokeToken}
                        className="flex h-11 items-center gap-1.5 rounded-[10px] border-2 border-[#141E19] bg-[#E05A47] px-4 text-[12px] font-extrabold text-white shadow-[3px_3px_0px_#141E19] transition-all enabled:hover:-translate-y-0.5 disabled:opacity-50"
                      >
                        {revoking ? "MEMPROSES…" : "CABUT & PULIHKAN"}
                      </button>
                    </div>
                    {revokeMsg && (
                      <p className={`mt-2 text-[12px] font-semibold ${revokeMsg.ok ? "text-[#0F5132]" : "text-[#842029]"}`} role="status">
                        {revokeMsg.ok ? "✓ " : "✗ "}{revokeMsg.text}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {issueError && (
                    <div className="flex items-start gap-2 rounded-[10px] border-2 border-[#E05A47] bg-[#FDE8E5] px-4 py-3" role="alert">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#842029]" />
                      <p className="text-[13px] font-semibold text-[#842029]">{issueError}</p>
                    </div>
                  )}
                  {selected.status === "DALAM_ANTREAN" && (
                    <p className="flex items-start gap-2 text-[12px] font-semibold text-[#8A5200]">
                      <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Pemilih sudah memiliki token aktif. Menerbitkan token baru akan MENGHANGUSKAN token lama (tercatat di audit log).
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={issuing}
                    onClick={() => issueToken(selected)}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] text-sm font-extrabold tracking-wide text-white shadow-[4px_4px_0px_#141E19] transition-all enabled:hover:-translate-y-0.5 enabled:hover:bg-[#13613B] enabled:hover:shadow-[6px_6px_0px_#141E19] enabled:active:translate-y-0.5 enabled:active:shadow-[2px_2px_0px_#141E19] disabled:opacity-60"
                  >
                    {issuing ? "MENERBITKAN TOKEN…" : "TERBITKAN TOKEN + QR"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ---------- Kartu Token Terbit (slip + QR Portal Pemilih) ---------- */}
          {issued && (
            <div className={`print-area mt-5 rounded-[12px] border-2 p-5 ${expired ? "border-[#E05A47] bg-[#FDE8E5]" : "border-[#141E19] bg-[#FEF5D6]"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#8A5200]">
                  Slip Token — Rantai {issued.studyProgramId}
                </span>
                {expired ? (
                  <Badge className="border border-[#842029] bg-transparent text-[#842029]">KEDALUWARSA</Badge>
                ) : (
                  <span className={`flex items-center gap-1 font-mono-tabular text-sm font-extrabold ${remainingMs < 120_000 ? "text-[#842029]" : "text-[#8A5200]"}`}>
                    <Timer className="h-4 w-4" /> {mm}:{ss}
                  </span>
                )}
              </div>
              <p className="mt-3 text-center font-mono text-[48px] font-bold leading-none tracking-[0.18em] text-[#141E19]" aria-label="Token bilik suara">
                {issued.token}
              </p>
              <p className="mt-2 text-center text-[12px] font-semibold text-[#8A5200]">
                {issued.voterName} • <span className="font-mono-tabular">{issued.voterNim}</span>
              </p>
              {/* QR → /pemilih?token=… — mahasiswa scan langsung dari HP sendiri */}
              <div className="mt-3 flex flex-col items-center gap-1.5">
                <img
                  src={issued.qrDataUrl}
                  alt={`QR Portal Pemilih untuk token ${issued.token}`}
                  className="h-[132px] w-[132px] rounded-[8px] border-2 border-[#141E19] bg-white p-1"
                />
                <p className="text-center text-[11px] font-bold text-[#8A5200]">
                  Scan QR ini → langsung masuk bilik suara online
                </p>
              </div>
              <div className="no-print mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAE6DF]">
                  <div
                    className={`h-full transition-all duration-500 ${remainingMs < 120_000 ? "bg-[#E05A47]" : "bg-[#F2B705]"}`}
                    style={{ width: `${expired ? 0 : pctLeft}%` }}
                  />
                </div>
                <p className="mt-2 text-center text-[11px] text-[#8A5200]">
                  Berikan slip ini kepada mahasiswa. TTL 10 menit hanya untuk vote PERTAMA; setelah itu token tetap bisa dipakai ganti suara sampai pemungutan ditutup.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-white text-[13px] font-bold shadow-[3px_3px_0px_#141E19] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    <Printer className="h-4 w-4" /> Cetak Slip Token
                  </button>
                  <button
                    type="button"
                    onClick={() => setIssued(null)}
                    className="flex h-11 items-center justify-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-[#141E19] px-4 text-[13px] font-bold text-white shadow-[3px_3px_0px_#4A5851] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    <Ban className="h-4 w-4" /> Selesai
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info antrean */}
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#D8D3C8] pt-4">
            <div className="rounded-[8px] bg-[#EAE6DF] px-3 py-2.5 text-center">
              <p className="font-display text-xl font-extrabold tabular-nums">{counts.belum}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#4A5851]">Belum</p>
            </div>
            <div className="rounded-[8px] bg-[#FEF5D6] px-3 py-2.5 text-center">
              <p className="font-display text-xl font-extrabold tabular-nums text-[#8A5200]">{counts.antrean}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A5200]">Antrean</p>
            </div>
            <div className="rounded-[8px] bg-[#DCFCE7] px-3 py-2.5 text-center">
              <p className="font-display text-xl font-extrabold tabular-nums text-[#0F5132]">{counts.sudah}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#0F5132]">Selesai</p>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#7A8881]">
            <BadgeCheck className="h-3.5 w-3.5" /> Terverifikasi sesuai Ketetapan DPM No. 005/DPM-CWE/KEP/VII/2024
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#7A8881]">
            <Clock className="h-3.5 w-3.5" /> Sinkron otomatis tiap 5 detik.
          </p>
        </div>
      </aside>
    </div>
  );
}
