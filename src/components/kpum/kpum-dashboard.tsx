"use client";

// ============================================================
// DASHBOARD KOMISIONER KPUM — FR-01, FR-02, FR-03, FR-06.3, FR-07
// Bento Editorial: DPT import, manajemen kandidat, kontrol tahapan,
// Pleno Unlocking & Berita Acara Model C-KWE (Swiss Legal Document).
// ============================================================
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { usePolling } from "@/hooks/use-polling";
import type { AdminOverviewResponse } from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Database,
  FileText,
  Loader2,
  Lock,
  LockOpen,
  PauseCircle,
  PlayCircle,
  Plus,
  ScrollText,
  ShieldAlert,
  Users,
} from "lucide-react";

type TabKey = "dpt" | "kandidat" | "tahapan" | "berita";

/** QR asli (Rekomendasi #9): encode URL verifikasi publik dokumen */
function RealQr({ text, size = 132 }: { text: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(text, { width: size * 2, margin: 1, color: { dark: "#141E19", light: "#FFFFFF" } })
      .then((url) => alive && setDataUrl(url))
      .catch(() => alive && setDataUrl(null));
    return () => {
      alive = false;
    };
  }, [text, size]);
  if (!dataUrl) {
    return <Loader2 className="h-8 w-8 animate-spin text-[#7A8881]" />;
  }
  return <img src={dataUrl} width={size} height={size} alt="QR verifikasi Berita Acara" className="rounded-[4px]" />;
}

interface BaDocument {
  electionName: string;
  plenoUnlockedAt: string | null;
  generatedAt: string;
  totals: { dptTotal: number; voted: number; absent: number; ballots: number; tokenUsed: number; turnoutPct: number };
  revoteStats: { tokensVoted: number; tokensRevoted: number; supersededBallots: number; lockedTokens: number };
  integrity: { allValid: boolean; chains: Array<{ tpsId: string; name: string; valid: boolean; checkedCount: number; headHash: string }>; totalChecked: number };
  chains: Array<{ id: string; name: string; location: string; headHash: string }>;
  signatories: { kpum: string; panwaslu: string };
  signature: string;
  algorithm: string;
}

export function KpumDashboard({ operatorRole }: { operatorRole?: string | null }) {
  const { data, loading, refresh } = usePolling<AdminOverviewResponse>("/api/admin/overview", 6000);
  const [tab, setTab] = useState<TabKey>("tahapan");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [csv, setCsv] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);
  const [dptQuery, setDptQuery] = useState("");
  const [baDoc, setBaDoc] = useState<BaDocument | null>(null);
  const [baLoading, setBaLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const plenoUnlocked = data?.settings.plenoUnlocked ?? false;

  // Muat dokumen Berita Acara saat tab dibuka / pleno berubah (Rekomendasi #9)
  useEffect(() => {
    if (tab !== "berita" || !plenoUnlocked) return;
    let alive = true;
    setBaLoading(true);
    fetch("/api/kpum/berita-acara", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => alive && j.ok && setBaDoc(j.document))
      .catch(() => {})
      .finally(() => alive && setBaLoading(false));
    return () => {
      alive = false;
    };
  }, [tab, plenoUnlocked]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (!data) return <p className="text-sm text-[#4A5851]">Dashboard gagal dimuat.</p>;

  const doAction = async (action: "TOGGLE_FREEZE" | "TOGGLE_VOTING" | "UNLOCK_PLENO") => {
    if (action === "UNLOCK_PLENO") {
      const sure = window.confirm(
        "PEMBUKAAN RESMI: Buka kotak suara digital (Pleno Unlocking)?\n\nAksi ini menutup pemungutan suara, mendekripsi distribusi suara, dan tidak dapat dibatalkan. Harus dilakukan Ketua KPUM disaksikan Panwaslu & Saksi."
      );
      if (!sure) return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(action === "UNLOCK_PLENO" ? "/api/tally/unlock" : "/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "UNLOCK_PLENO" ? {} : { action }),
      });
      const json = await res.json();
      setNotice({ ok: json.ok, text: json.message ?? "Aksi selesai." });
      refresh();
    } catch {
      setNotice({ ok: false, text: "Koneksi gagal." });
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    setBusy(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/dpt-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const json = await res.json();
      if (json.ok) {
        setImportResult(`✅ ${json.added} ditambahkan, ${json.duplicates} duplikat ditolak, ${json.invalid} invalid. Total DPT: ${json.total}.`);
        setCsv("");
        refresh();
      } else {
        setImportResult(`❌ ${json.message}`);
      }
    } catch {
      setImportResult("❌ Koneksi gagal saat import.");
    } finally {
      setBusy(false);
    }
  };

  const { settings, stats, candidates, voters, chains } = data;
  const filteredVoters = dptQuery
    ? voters.filter((v) => v.nim.includes(dptQuery) || v.name.toLowerCase().includes(dptQuery.toLowerCase()))
    : voters;

  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: "tahapan", label: "Tahapan & Pleno", icon: <Lock className="h-4 w-4" /> },
    { key: "dpt", label: "Manajemen DPT", icon: <Database className="h-4 w-4" /> },
    { key: "kandidat", label: "Kandidat", icon: <Users className="h-4 w-4" /> },
    { key: "berita", label: "Berita Acara", icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* ---------- Bento Row: KPI ---------- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total DPT", value: stats.dptTotal, cls: "text-[#141E19]" },
          { label: "Sudah Memilih", value: stats.sudah, cls: "text-[#1B7F4E]" },
          { label: "Token Digunakan", value: stats.tokenUsed, cls: "text-[#8A5200]" },
          { label: "Surat Suara Masuk", value: stats.ballots, cls: "text-[#0F766E]" },
        ].map((k) => (
          <div key={k.label} className="bento-card p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A8881]">{k.label}</p>
            <p className={`mt-1 font-display text-4xl font-extrabold tabular-nums ${k.cls}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ---------- Status strip ---------- */}
      <div className="bento-card flex flex-wrap items-center gap-2.5 p-4">
        <Badge variant="outline" className={`gap-1.5 border ${settings.emergencyFreeze ? "border-[#E05A47] bg-[#FDE8E5] text-[#842029]" : settings.votingOpen ? "border-[#1B7F4E] bg-[#DCFCE7] text-[#0F5132]" : "border-[#D8D3C8] bg-[#EAE6DF] text-[#4A5851]"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${settings.votingOpen && !settings.emergencyFreeze ? "bg-[#1B7F4E] live-dot" : "bg-current"}`} />
          {settings.emergencyFreeze ? "EMERGENCY FREEZE" : settings.votingOpen ? "PEMUNGUTAN AKTIF" : "PEMUNGUTAN DITUTUP"}
        </Badge>
        {settings.plenoUnlocked ? (
          <Badge variant="outline" className="gap-1.5 border-[#F2B705] bg-[#FEF5D6] text-[#8A5200]">
            <LockOpen className="h-3 w-3" /> PLENO TERBUKA
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1.5 border-[#141E19] bg-white text-[#141E19]">
            <Lock className="h-3 w-3" /> PLENO VAULT TERKUNCI
          </Badge>
        )}
        {chains && chains.length > 0 && (
          <span className="text-xs text-[#7A8881]">
            {chains.length} rantai online ({chains.map((c) => c.id).join(", ")}) • Total blok: <span className="font-mono-tabular">{stats.ballots}</span>
          </span>
        )}
      </div>

      {/* ---------- Tabs ---------- */}
      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-[10px] border-2 px-4 py-2 text-[13px] font-bold transition-all ${
              tab === t.key
                ? "border-[#141E19] bg-[#141E19] text-white shadow-[3px_3px_0px_#1B7F4E]"
                : "border-[#D8D3C8] bg-white text-[#4A5851] hover:border-[#141E19]"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {notice && (
        <div className={`flex items-start gap-2 rounded-[10px] border-2 px-4 py-3 ${notice.ok ? "border-[#1B7F4E] bg-[#DCFCE7]" : "border-[#E05A47] bg-[#FDE8E5]"}`} role="status">
          {notice.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0F5132]" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#842029]" />}
          <p className={`text-sm font-semibold ${notice.ok ? "text-[#0F5132]" : "text-[#842029]"}`}>{notice.text}</p>
        </div>
      )}

      {/* ================= TAB: TAHAPAN & PLENO ================= */}
      {tab === "tahapan" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bento-card p-6">
            <h3 className="font-display text-lg font-bold">Kontrol Tahapan (FR-01)</h3>
            <p className="mt-1 text-[13px] text-[#4A5851]">
              Kelola waktu aktif tahapan pemilihan. Penutupan pemungutan otomatis mengunci penerbitan token di meja PPUR.
            </p>
            <div className="mt-5 space-y-3">
              <button
                type="button"
                disabled={busy || settings.plenoUnlocked}
                onClick={() => doAction("TOGGLE_VOTING")}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-white py-3.5 text-sm font-extrabold shadow-[4px_4px_0px_#141E19] transition-all enabled:hover:-translate-y-0.5 enabled:hover:shadow-[5px_5px_0px_#141E19] enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:opacity-40"
              >
                {settings.votingOpen ? <PauseCircle className="h-5 w-5 text-[#E05A47]" /> : <PlayCircle className="h-5 w-5 text-[#1B7F4E]" />}
                {settings.votingOpen ? "TUTUP PEMUNGUTAN SUARA" : "BUKA PEMUNGUTAN SUARA"}
              </button>

              <button
                type="button"
                disabled={busy || settings.plenoUnlocked}
                onClick={() => doAction("TOGGLE_FREEZE")}
                className="flex w-full items-center justify-center gap-2 rounded-[10px] border-2 border-[#E05A47] bg-[#FDE8E5] py-3.5 text-sm font-extrabold text-[#842029] shadow-[4px_4px_0px_#E05A47] transition-all enabled:hover:-translate-y-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:opacity-40"
              >
                <ShieldAlert className="h-5 w-5" />
                {settings.emergencyFreeze ? "CABUT EMERGENCY FREEZE" : "AKTIFKAN EMERGENCY FREEZE (FR-01.2)"}
              </button>
            </div>
          </div>

          <div className="bento-card p-6">
            <h3 className="font-display text-lg font-bold">Pleno Vault Unlocking (FR-06.3)</h3>
            <p className="mt-1 text-[13px] text-[#4A5851]">
              Hukum 5: endpoint tally mengembalikan <span className="font-mono-tabular">423 Locked</span> selama pemungutan.
              Pembukaan dilakukan serentak oleh Ketua KPUM disaksikan Panwaslu &amp; Saksi.
            </p>
            {settings.plenoUnlocked ? (
              <div className="mt-5 flex items-start gap-3 rounded-[10px] border-2 border-[#F2B705] bg-[#FEF5D6] p-4">
                <LockOpen className="mt-0.5 h-5 w-5 shrink-0 text-[#8A5200]" />
                <div>
                  <p className="text-sm font-extrabold text-[#8A5200]">Kotak suara telah dibuka</p>
                  <p className="mt-0.5 text-[12px] text-[#8A5200]">
                    {settings.plenoUnlockedAt ? `Dibuka pada ${new Date(settings.plenoUnlockedAt).toLocaleString("id-ID")}. ` : ""}
                    Hasil tampil di Monitor Panwaslu &amp; layar publik.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy || operatorRole !== "KPUM"}
                  onClick={() => doAction("UNLOCK_PLENO")}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-[#F2B705] py-4 text-sm font-extrabold tracking-wide text-[#141E19] shadow-[5px_5px_0px_#141E19] transition-all enabled:hover:-translate-y-0.5 enabled:hover:shadow-[6px_6px_0px_#141E19] enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LockOpen className="h-5 w-5" />
                  BUKA KOTAK SUARA DIGITAL (PLENO UNLOCK)
                </button>
                {operatorRole && operatorRole !== "KPUM" && (
                  <p className="mt-2 rounded-[8px] border border-[#E05A47] bg-[#FDE8E5] px-3 py-2 text-[12px] font-semibold text-[#842029]">
                    Sesi Anda {operatorRole} — Pleno Unlocking hanya kewenangan Ketua KPUM (FR-06.3). Login sebagai <span className="font-mono">kpum</span> untuk mengeksekusi.
                  </p>
                )}
              </>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-[#7A8881]">
              ⚠️ Aksi ini menutup pemungutan suara secara permanen dan mendekripsi distribusi suara untuk rekapitulasi sidang pleno.
            </p>
          </div>
        </div>
      )}

      {/* ================= TAB: DPT ================= */}
      {tab === "dpt" && (
        <div className="space-y-4">
          <div className="bento-card p-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold">
              <Plus className="h-5 w-5 text-[#1B7F4E]" /> Import DPT dari BAAK (FR-02.1)
            </h3>
            <p className="mt-1 text-[13px] text-[#4A5851]">
              Tempel data CSV — format per baris: <span className="font-mono-tabular">NIM,Nama,ProdiID,Angkatan</span>. Kode prodi: BKS, TPHP, LOGISTIK, TRPL.
            </p>
            <Textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder={"22111005,Ahmad Saputra,BKS,2022\n22121033,Dewi Lestari,TPHP,2022"}
              className="mt-3 min-h-24 rounded-[10px] border-[#D8D3C8] font-mono-tabular text-[13px] focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
            />
            <button
              type="button"
              disabled={busy || !csv.trim()}
              onClick={doImport}
              className="mt-3 rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] px-5 py-2.5 text-[13px] font-extrabold text-white shadow-[3px_3px_0px_#141E19] transition-all enabled:hover:-translate-y-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:opacity-40"
            >
              {busy ? "MENGIMPOR…" : "IMPORT & VALIDASI"}
            </button>
            {importResult && <p className="mt-3 rounded-[8px] bg-[#F6F4EE] px-3 py-2 text-[13px] font-semibold text-[#141E19]">{importResult}</p>}
          </div>

          <div className="bento-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8D3C8] px-5 py-4">
              <h3 className="font-display text-lg font-bold">DPT Terkunci — {stats.dptTotal} Pemilih (FR-02.4)</h3>
              <input
                value={dptQuery}
                onChange={(e) => setDptQuery(e.target.value)}
                placeholder="Cari NIM/nama…"
                className="h-10 w-64 rounded-[8px] border border-[#D8D3C8] bg-white px-3 text-sm outline-none focus:border-[#1B7F4E]"
              />
            </div>
            <div className="nice-scroll max-h-[440px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#EAE6DF] text-[11px] uppercase tracking-wider text-[#4A5851]">
                  <tr>
                    <th className="px-5 py-3 text-left font-bold">NIM</th>
                    <th className="px-5 py-3 text-left font-bold">Nama</th>
                    <th className="px-5 py-3 text-left font-bold">Prodi</th>
                    <th className="px-5 py-3 text-center font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D3C8]">
                  {filteredVoters.map((v) => (
                    <tr key={v.id} className="hover:bg-[#F6F4EE]">
                      <td className="px-5 py-2 font-mono-tabular text-[13px]">{v.nim}</td>
                      <td className="px-5 py-2 font-semibold">{v.name}</td>
                      <td className="px-5 py-2 text-[12px] text-[#4A5851]">{v.studyProgramId}</td>
                      <td className="px-5 py-2 text-center">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${v.status === "SUDAH_MEMILIH" ? "border-[#1B7F4E] bg-[#DCFCE7] text-[#0F5132]" : v.status === "DALAM_ANTREAN" ? "border-[#F2B705] bg-[#FEF5D6] text-[#8A5200]" : "border-[#D8D3C8] bg-[#EAE6DF] text-[#4A5851]"}`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB: KANDIDAT ================= */}
      {tab === "kandidat" && (
        <div className="space-y-5">
          {(["PRESMA", "DPM", "HIMA"] as const).map((cat) => {
            const list = candidates.filter((c) => c.category === cat && !c.isEmptyBox);
            if (list.length === 0) return null;
            return (
              <div key={cat} className="bento-card p-5">
                <h3 className="font-display text-lg font-bold">
                  {cat === "PRESMA" ? "Presma & Wapresma (BEM)" : cat === "DPM" ? "Pimpinan DPM" : "Ketua Hima Prodi"}
                </h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {list.map((c) => (
                    <div key={c.id} className="rounded-[10px] border border-[#D8D3C8] bg-[#F6F4EE] p-4">
                      <div className="flex items-center justify-between">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#141E19] font-display text-sm font-extrabold text-white" style={{ background: c.photoAccent }}>
                          {String(c.number).padStart(2, "0")}
                        </span>
                        {cat === "HIMA" && <span className="text-[10px] font-bold uppercase tracking-wide text-[#7A8881]">{c.studyProgramId}</span>}
                      </div>
                      <p className="mt-2 font-bold leading-snug">{c.presidentName}</p>
                      {c.viceName && <p className="text-[12px] text-[#4A5851]">& {c.viceName}</p>}
                      {c.secondViceName && <p className="text-[12px] text-[#4A5851]">& {c.secondViceName}</p>}
                      <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-[#4A5851]">{c.vision}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <p className="text-[12px] text-[#7A8881]">
            Nomor urut ditetapkan melalui sidang penetapan KPUM. Skenario calon tunggal otomatis mengaktifkan KOTAK KOSONG (FR-03.3).
          </p>
        </div>
      )}

      {/* ================= TAB: BERITA ACARA ================= */}
      {tab === "berita" && (
        <div className="print-area bento-card p-8 md:p-10">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7A8881]">
                Ikatan Keluarga Mahasiswa Politeknik Kelapa Sawit Citra Widya Edukasi
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.02em]">
                BERITA ACARA REKAPITULASI HASIL PEMIRA — MODEL C-KWE
              </h2>
              <p className="mt-1 text-[12px] text-[#4A5851]">
                Sesuai RUU Pemira Pasal 64 — Pemungutan Online ({chains.map((c) => c.id).join(", ")})
              </p>
            </div>

            {settings.plenoUnlocked ? (
              <p className="mt-6 rounded-[8px] border border-[#1B7F4E] bg-[#DCFCE7] px-4 py-2.5 text-center text-[13px] font-bold text-[#0F5132]">
                Dokumen sah — Pleno dibuka pada {settings.plenoUnlockedAt ? new Date(settings.plenoUnlockedAt).toLocaleString("id-ID") : "-"}
              </p>
            ) : (
              <p className="mt-6 flex items-center justify-center gap-2 rounded-[8px] border border-[#D8D3C8] bg-[#EAE6DF] px-4 py-2.5 text-center text-[13px] font-bold text-[#4A5851]">
                <Lock className="h-4 w-4" /> DRAF — dokumen final terbit setelah Pleno Unlocking
              </p>
            )}

            <table className="mt-6 w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#EAE6DF] text-[11px] uppercase tracking-wider">
                  <th className="border border-[#D8D3C8] px-3 py-2 text-left">Komponen</th>
                  <th className="border border-[#D8D3C8] px-3 py-2 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8D3C8]">
                {[
                  ["Total Daftar Pemilih Tetap (DPT)", stats.dptTotal],
                  ["Pemilih yang menggunakan hak pilih", stats.sudah],
                  ["Pemilih tidak hadir / absen", stats.dptTotal - stats.sudah],
                  ["Tingkat partisipasi", `${stats.dptTotal > 0 ? ((stats.sudah / stats.dptTotal) * 100).toFixed(2) : "0.00"} %`],
                  ["Total surat suara tercatat", stats.ballots],
                  ["Token digunakan & dihanguskan", stats.tokenUsed],
                ].map(([k, v]) => (
                  <tr key={String(k)}>
                    <td className="border border-[#D8D3C8] px-3 py-2">{k}</td>
                    <td className="border border-[#D8D3C8] px-3 py-2 text-right font-mono-tabular font-bold">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Panel tanda tangan + seal QR asli (Rekomendasi #9) */}
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A8881]">Panel Status Tanda Tangan Digital</p>
                {baDoc && (
                  <>
                    <div className="flex items-center justify-between rounded-[8px] border border-[#1B7F4E] bg-[#F0FAF4] px-4 py-3">
                      <div>
                        <p className="text-[13px] font-bold">Ketua KPUM</p>
                        <p className="text-[11px] text-[#7A8881]">{baDoc.signatories.kpum}</p>
                      </div>
                      <span className="rounded-full border border-[#1B7F4E] bg-[#DCFCE7] px-2.5 py-1 text-[10px] font-bold text-[#0F5132]">TTD ELEKTRONIK ✓</span>
                    </div>
                    <div className="flex items-center justify-between rounded-[8px] border border-[#1B7F4E] bg-[#F0FAF4] px-4 py-3">
                      <div>
                        <p className="text-[13px] font-bold">Ketua Panwaslu</p>
                        <p className="text-[11px] text-[#7A8881]">{baDoc.signatories.panwaslu}</p>
                      </div>
                      <span className="rounded-full border border-[#1B7F4E] bg-[#DCFCE7] px-2.5 py-1 text-[10px] font-bold text-[#0F5132]">TTD ELEKTRONIK ✓</span>
                    </div>
                  </>
                )}
                {["Ketua PPUR TPS 01", "Saksi Paslon"].map((role) => (
                  <div key={role} className="flex items-center justify-between rounded-[8px] border border-[#D8D3C8] bg-white px-4 py-3">
                    <p className="text-[13px] font-bold">{role}</p>
                    <span className="rounded-full border border-[#D8D3C8] bg-[#EAE6DF] px-2.5 py-1 text-[10px] font-bold text-[#4A5851]">TERCATAT</span>
                  </div>
                ))}
                {baDoc && (
                  <div className="rounded-[8px] border border-[#141E19] bg-[#F6F4EE] px-4 py-3">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#7A8881]">Tanda Tangan SHA-256 ({baDoc.algorithm})</p>
                    <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-[#141E19]">{baDoc.signature}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed border-[#D8D3C8] bg-[#F6F4EE] p-6">
                {baLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-[#7A8881]" />
                ) : baDoc ? (
                  <>
                    <div className="rounded-[8px] border-2 border-[#141E19] bg-white p-2 shadow-[3px_3px_0px_#141E19]">
                      <RealQr text={`${typeof window !== "undefined" ? window.location.origin : ""}/verify?sig=${baDoc.signature}`} />
                    </div>
                    <p className="text-center text-[11px] font-semibold text-[#4A5851]">
                      QR Verifikasi Publik — pindai untuk memeriksa keaslian dokumen
                      <br />
                      <span className="font-mono-tabular text-[10px] text-[#7A8881]">
                        {baDoc.integrity.chains.filter((c) => c.valid).length}/{baDoc.integrity.chains.length} rantai sah • {baDoc.integrity.totalChecked} blok ✓ • Re-vote: {baDoc.revoteStats.tokensRevoted} token
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(`${window.location.origin}/verify?sig=${baDoc.signature}`);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="no-print flex h-9 items-center gap-1.5 rounded-full border-2 border-[#141E19] bg-white px-4 text-[11px] font-extrabold shadow-[2px_2px_0px_#141E19] transition-all hover:-translate-y-0.5"
                    >
                      {copiedLink ? <CheckCircle2 className="h-3.5 w-3.5 text-[#1B7F4E]" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedLink ? "TAUTAN TERSALIN" : "SALIN TAUTAN VERIFIKASI"}
                    </button>
                  </>
                ) : (
                  <p className="text-center text-[12px] text-[#7A8881]">Dokumen final & QR verifikasi terbit setelah Pleno Unlocking.</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="no-print mx-auto mt-8 flex items-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-white px-6 py-3 text-sm font-extrabold shadow-[4px_4px_0px_#141E19] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <ScrollText className="h-4 w-4" /> Ekspor / Cetak PDF Berita Acara
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
