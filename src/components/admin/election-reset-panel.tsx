"use client";

// ============================================================
// PANEL SEGEL & RESET PEMIRA — khusus ITPO (Siklus Hidup Periode)
// Masalah: setelah Pleno Unlocking kotak suara permanen — pemira
// tak bisa diulang. Solusi tanpa melanggar append-only: segel arsip
// resmi periode lama (rekap BA + tanda tangan + snapshot audit),
// lalu lembar baru dengan rantai hash genesis segar.
// Wizard 3 langkah: (1) mode + arsip pratinjau, (2) frasa konfirmasi,
// (3) sandi ITPO → eksekusi atomik di server.
// ============================================================
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePolling } from "@/hooks/use-polling";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowRight,
  Check,
  CircleDot,
  Download,
  Loader2,
  Lock,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

interface StatusData {
  ok: boolean;
  status: {
    periodLabel: string;
    periodStartedAt: string | null;
    votingOpen: boolean;
    emergencyFreeze: boolean;
    plenoUnlocked: boolean;
    plenoUnlockedAt: string | null;
    counts: { dpt: number; voted: number; ballots: number; tokens: number; candidates: number; incidents: number; auditLogs: number };
    chains: Array<{ id: string; name: string; headHash: string; blocks: number }>;
    archives: Array<{
      id: string;
      archiveCode: string;
      periodLabel: string;
      mode: string;
      sealedAt: string;
      sealedBy: string;
      dptCount: number;
      votedCount: number;
      ballotCount: number;
    }>;
  };
}

interface ResetSuccess {
  archiveCode: string;
  archiveDownloadUrl: string | null;
  closedPeriodLabel: string;
  newPeriodLabel: string;
  message: string;
  postCounts: { ballots: number; tokens: number; dpt: number; candidates: number };
}

type Mode = "DEMO" | "NEW_PERIOD";

export function ElectionResetPanel({ onSessionInvalidated }: { onSessionInvalidated?: () => void }) {
  const { data, loading, refresh } = usePolling<StatusData>("/api/itpo/reset", 20000);
  const status = data?.status;

  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // form
  const [mode, setMode] = useState<Mode>("DEMO");
  const [newPeriodLabel, setNewPeriodLabel] = useState("");
  const [note, setNote] = useState("");
  const [previewSaved, setPreviewSaved] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [responsibility, setResponsibility] = useState(false);
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState<ResetSuccess | null>(null);

  const phraseOk = phrase.trim().replace(/\s+/g, " ").toUpperCase() === "RESET PEMIRA";
  const labelOk = newPeriodLabel.trim().length >= 3;

  function openWizard() {
    setStep(1);
    setError(null);
    setPreviewSaved(false);
    setPhrase("");
    setResponsibility(false);
    setPassword("");
    setMode("DEMO");
    setNewPeriodLabel(status ? `${status.periodLabel.split(/\s(?=\d{4})/)[0]} ${new Date().getFullYear() + 1}` : "");
    setSuccess(null);
    setWizardOpen(true);
  }

  async function downloadPreview() {
    setBusy("preview");
    setError(null);
    try {
      const res = await fetch("/api/itpo/reset/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, note }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.message ?? "Gagal menyusun pratinjau arsip.");
        return;
      }
      const blob = new Blob([JSON.stringify(body.payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PRATINJAU-ARSIP-${(status?.periodLabel ?? "periode").replace(/[^\w-]+/g, "_")}.json`;
      document.body.appendChild(a);
      a.click();
      // revoke ditunda — revoke sinkron setelah click() dapat membatalkan unduhan
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 1500);
      setPreviewSaved(true);
    } catch {
      setError("Kesalahan jaringan saat menyusun pratinjau.");
    } finally {
      setBusy(null);
    }
  }

  async function executeReset() {
    setBusy("execute");
    setError(null);
    try {
      const res = await fetch("/api/itpo/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, newPeriodLabel, confirmPhrase: phrase, password, note }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.message ?? "Segel & reset gagal di server.");
        return;
      }
      setSuccess({
        archiveCode: body.archiveCode,
        archiveDownloadUrl: body.archiveDownloadUrl,
        closedPeriodLabel: body.closedPeriodLabel,
        newPeriodLabel: body.newPeriodLabel,
        message: body.message,
        postCounts: body.postCounts,
      });
      setStep(4);
      refresh();
    } catch {
      setError("Kesalahan jaringan saat mengeksekusi reset.");
    } finally {
      setBusy(null);
    }
  }

  const plenoLocked = !status?.plenoUnlocked;

  return (
    <div className="overflow-hidden rounded-[12px] border-2 border-[#E05A47] bg-white shadow-[4px_4px_0px_#E05A47]">
      {/* ===== Header bahaya ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#E05A47] bg-[#FDE8E5] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border-2 border-[#141E19] bg-[#E05A47] shadow-[3px_3px_0px_#141E19]">
            <Archive className="h-5 w-5 text-white" aria-hidden />
          </div>
          <div>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-[#842029]">
              Zona Administrasi Sistem — Segel &amp; Reset Pemira
            </h2>
            <p className="text-[12.5px] text-[#842029]/80">
              Tutup periode aktif, segel arsip resminya, lalu mulai pemira ulang pada lembar baru.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openWizard}
          disabled={plenoLocked || loading}
          title={plenoLocked ? "Hanya bisa dijalankan setelah Pleno Unlocking oleh KPUM" : "Mulai wizard segel & reset"}
          className="flex h-11 items-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-[#E05A47] px-5 text-[13px] font-extrabold text-white shadow-[3px_3px_0px_#141E19] transition-all hover:-translate-y-0.5 hover:bg-[#C94B3B] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
        >
          <ShieldAlert className="h-4 w-4" aria-hidden />
          SEGEL &amp; RESET PEMIRA
        </button>
      </div>

      <div className="space-y-4 p-5">
        {plenoLocked && (
          <p className="flex items-start gap-2 rounded-[10px] border border-[#E05A47] bg-[#FDE8E5] px-4 py-3 text-[13px] leading-relaxed text-[#842029]">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Kotak suara masih <strong>TERKUNCI</strong>. Segel &amp; reset hanya sah setelah Pleno Unlocking dilakukan
            KPUM (FR-06.3) — suara yang belum direkap tidak boleh dilenyuhkan. Setelah pleno terbuka dan berita acara
            final terbit, tombol di atas aktif.
          </p>
        )}

        {status && (
          <>
            {/* ===== Status periode aktif ===== */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[10px] border-2 border-[#141E19] bg-[#F6F4EE] px-4 py-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7A8881]">Periode Aktif</p>
                <p className="mt-1 font-display text-[15px] font-extrabold leading-tight text-[#141E19]">{status.periodLabel}</p>
                <p className="mt-0.5 font-mono text-[10.5px] text-[#7A8881]">
                  dibuka {status.periodStartedAt ? new Date(status.periodStartedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </p>
              </div>
              <div className="rounded-[10px] border-2 border-[#141E19] bg-[#F6F4EE] px-4 py-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7A8881]">Tahapan</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <StagePill on={status.votingOpen} onText="PEMUNGUTAN DIBUKA" offText="PEMUNGUTAN TERTUTUP" onColor="#1B7F4E" />
                  <StagePill on={status.plenoUnlocked} onText="PLENO TERBUKA" offText="PLENO TERKUNCI" onColor="#B45309" />
                  {status.emergencyFreeze && <StagePill on onText="EMERGENCY FREEZE" offText="" onColor="#E05A47" />}
                </div>
              </div>
              <div className="rounded-[10px] border-2 border-[#141E19] bg-[#F6F4EE] px-4 py-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7A8881]">Isi Lembar Ini</p>
                <div className="mt-1 grid grid-cols-3 gap-x-3 gap-y-1 font-mono text-[11.5px] font-bold text-[#141E19]">
                  <span>DPT <b>{status.counts.dpt}</b></span>
                  <span>Suara <b>{status.counts.ballots}</b></span>
                  <span>Token <b>{status.counts.tokens}</b></span>
                  <span>Kandidat <b>{status.counts.candidates}</b></span>
                  <span>Sengketa <b>{status.counts.incidents}</b></span>
                  <span>Audit <b>{status.counts.auditLogs}</b></span>
                </div>
              </div>
            </div>

            {/* ===== 5 rantai ===== */}
            <div className="rounded-[10px] border-2 border-[#141E19] bg-[#F6F4EE] px-4 py-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7A8881]">
                Lima Rantai Hash Prodi (akan di-re-genesis saat reset)
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {status.chains.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#141E19] bg-white px-3 py-1 font-mono text-[10.5px] font-bold text-[#141E19]"
                    title={`Head: ${c.headHash || "(genesis)"}`}
                  >
                    <CircleDot className={`h-3 w-3 ${c.blocks > 0 ? "text-[#1B7F4E]" : "text-[#C9C3B6]"}`} aria-hidden />
                    {c.id} • {c.blocks} blok
                  </span>
                ))}
              </div>
            </div>

            {/* ===== Arsip tersimpan ===== */}
            <div className="rounded-[10px] border-2 border-dashed border-[#D8D3C8] bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7A8881]">
                  Arsip Penutupan Tersimpan ({status.archives.length})
                </p>
                <button
                  type="button"
                  onClick={() => refresh()}
                  className="flex items-center gap-1 text-[10.5px] font-extrabold text-[#4A5851] hover:text-[#141E19]"
                >
                  <RefreshCcw className="h-3 w-3" aria-hidden /> SEGARKAN
                </button>
              </div>
              {status.archives.length === 0 ? (
                <p className="mt-2 text-[12.5px] text-[#7A8881]">
                  Belum ada arsip — periode aktif masih lembar pertama sejak inisialisasi.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {status.archives.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#D8D3C8] bg-[#F6F4EE] px-3 py-2">
                      <div className="min-w-0">
                        <p className="font-mono text-[11.5px] font-extrabold text-[#141E19]">
                          {a.archiveCode}
                          <span className={`ml-2 rounded-full px-2 py-0.5 text-[9px] font-extrabold ${a.mode === "DEMO" ? "bg-[#FEF5D6] text-[#8A5200]" : "bg-[#E4F2EF] text-[#0F766E]"}`}>
                            {a.mode === "DEMO" ? "GELOMBANG ULANG" : "PERIODE BARU"}
                          </span>
                        </p>
                        <p className="truncate text-[11.5px] text-[#4A5851]">
                          {a.periodLabel} • {a.ballotCount} blok suara • {a.votedCount}/{a.dptCount} DPT • disegel {new Date(a.sealedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })} oleh {a.sealedBy}
                        </p>
                      </div>
                      <a
                        href={`/api/itpo/reset/archives/${a.id}`}
                        className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border-2 border-[#141E19] bg-white px-3 text-[10.5px] font-extrabold text-[#141E19] shadow-[2px_2px_0px_#141E19] transition-all hover:-translate-y-0.5"
                      >
                        <Download className="h-3 w-3" aria-hidden /> UNDUH
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        <p className="rounded-[10px] border border-dashed border-[#D8D3C8] px-4 py-3 text-[12.5px] leading-relaxed text-[#4A5851]">
          <strong className="text-[#141E19]">Cara kerja aman:</strong> append-only <em>tidak dilanggar</em> — sebelum
          rantai di-re-genesis, seluruh lembar periode (rekap resmi + kanonikal Berita Acara + tanda tangan kriptografis
          + snapshot audit log &amp; sengketa) disegel permanen ke arsip yang dapat diunduh. Pengarsipan dan pembersihan
          berjalan dalam <strong>satu transaksi atomik</strong>: tidak mungkin data terhapus tanpa arsip. Seluruh sesi
          operator lama otomatis hangus (rotasi secret), dan setiap percobaan — berhasil maupun ditolak — tercatat di
          audit log Panwaslu.
        </p>
      </div>

      {/* ================= WIZARD 3 LANGKAH ================= */}
      <Dialog open={wizardOpen} onOpenChange={(o) => !busy && setWizardOpen(o)}>
        <DialogContent className="rounded-[14px] border-2 border-[#141E19] bg-white p-0 shadow-[8px_8px_0px_#141E19] sm:max-w-[560px]">
          <div className="p-6">
            {step < 4 && (
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border-2 border-[#141E19] bg-[#E05A47] shadow-[3px_3px_0px_#141E19]">
                    <ShieldAlert className="h-5 w-5 text-white" aria-hidden />
                  </div>
                  <div className="text-left">
                    <DialogTitle className="font-display text-xl font-extrabold text-[#141E19]">
                      Segel &amp; Reset Pemira — Langkah {step}/3
                    </DialogTitle>
                    <DialogDescription className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7A8881]">
                      {step === 1 && "Pilih mode & simpan arsip pratinjau"}
                      {step === 2 && "Konfirmasi frasa penutupan"}
                      {step === 3 && "Verifikasi identitas penyegel"}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            )}

            {error && (
              <p role="alert" className="mt-4 rounded-[8px] border border-[#E05A47] bg-[#FDE8E5] px-3 py-2 text-[13px] font-semibold text-[#842029]">
                {error}
              </p>
            )}

            {/* ===== LANGKAH 1: mode + arsip ===== */}
            {step === 1 && status && (
              <div className="mt-5 space-y-4">
                <div className="grid gap-2.5">
                  <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A5851]">Mode Reset</p>
                  <ModeOption
                    active={mode === "DEMO"}
                    onClick={() => setMode("DEMO")}
                    icon={<ArchiveRestore className="h-4 w-4" />}
                    title="Gelombang Ulang (Demo / Simulasi)"
                    desc="Suara, token, dan rantai hash direset. DPT & kandidat DIPERTAHANKAN — status pemilih kembali ke BELUM_MEMILIH. Cocok untuk mengulang pemira dengan data yang sama."
                  />
                  <ModeOption
                    active={mode === "NEW_PERIOD"}
                    onClick={() => setMode("NEW_PERIOD")}
                    icon={<Sparkles className="h-4 w-4" />}
                    title="Periode Baru Total (Pemira Tahun Berikutnya)"
                    desc="Semua direset Termasuk DPT, kandidat, dan sengketa (tetap tersimpan di arsip). DPT baru masuk via Import DPT; kandidat diinput ulang. Untuk siklus pemira yang sungguhan."
                  />
                </div>

                <label className="block">
                  <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A5851]">
                    Label Periode Baru
                  </span>
                  <Input
                    value={newPeriodLabel}
                    onChange={(e) => setNewPeriodLabel(e.target.value)}
                    placeholder="mis. Pemira Poltek CWE 2027"
                    className="mt-1 h-11 rounded-[8px] border-2 border-[#141E19] font-display font-extrabold shadow-none focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
                  />
                </label>

                <label className="block">
                  <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A5851]">
                    Catatan Berita Acara Penutupan (opsional)
                  </span>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="mis. Pleno tahap II selesai, hasil disahkan dan diarsipkan."
                    className="mt-1 h-11 rounded-[8px] border-2 border-[#141E19] shadow-none focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
                  />
                </label>

                <div className="rounded-[10px] border-2 border-[#141E19] bg-[#F6F4EE] p-4">
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#141E19]">Arsip Otomatis</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#4A5851]">
                    Saat reset dieksekusi, sistem menyusun arsip resmi isi: rekap lengkap semua kategori, kanonikal BA
                    C-KWE + tanda tangan SHA-256, {status.counts.auditLogs} entri audit log, {status.counts.incidents}{" "}
                    laporan sengketa, {status.counts.candidates} kandidat, dan head kelima rantai. Arsip tersimpan di
                    sistem dan dapat diunduh kapan saja.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={downloadPreview}
                      disabled={busy === "preview"}
                      className="flex h-10 items-center gap-2 rounded-full border-2 border-[#141E19] bg-[#F2B705] px-4 text-[12px] font-extrabold text-[#141E19] shadow-[2px_2px_0px_#141E19] transition-all hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" aria-hidden />}
                      UNDUH PRATINJAU ARSIP (.json)
                    </button>
                    {previewSaved && (
                      <span className="flex items-center gap-1 text-[12px] font-extrabold text-[#0F5132]">
                        <Check className="h-4 w-4" aria-hidden /> Pratinjau tersimpan di perangkat Anda
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2.5 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setWizardOpen(false)}
                    className="h-12 flex-1 rounded-[10px] border-2 border-[#141E19] bg-white text-[13px] font-extrabold text-[#141E19] shadow-[3px_3px_0px_#141E19] hover:bg-[#F6F4EE]"
                  >
                    BATAL
                  </Button>
                  <Button
                    disabled={!labelOk}
                    onClick={() => {
                      setError(null);
                      setStep(2);
                    }}
                    className="h-12 flex-1 rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] text-[13px] font-extrabold text-white shadow-[3px_3px_0px_#141E19] hover:bg-[#176D42] disabled:opacity-50"
                  >
                    LANJUT <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            )}

            {/* ===== LANGKAH 2: frasa konfirmasi ===== */}
            {step === 2 && (
              <div className="mt-5 space-y-4">
                <div className="rounded-[10px] border-2 border-[#E05A47] bg-[#FDE8E5] p-4">
                  <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#842029]">
                    <AlertTriangle className="h-4 w-4" aria-hidden /> Konsekuensi Permanen
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-[#842029]">
                    <li>• <strong>{mode === "DEMO" ? "Seluruh suara & token" : "Seluruh suara, token, DPT, kandidat, sengketa"}</strong> periode aktif dilenyuhkan dari basis data kerja.</li>
                    <li>• Kelima rantai hash prodi di-re-genesis (salt baru) — riwayat lama hanya hidup di arsip.</li>
                    <li>• Pemungutan ditutup: KPUM harus membuka kembali secara sadar untuk memulai pemungutan baru.</li>
                    <li>• Seluruh sesi operator (termasuk Anda) hangus otomatis — wajib login ulang.</li>
                    <li>• Arsip penutupan dibuat otomatis dan <strong>tidak dapat dihapus atau diedit</strong>.</li>
                  </ul>
                </div>

                <label className="block">
                  <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A5851]">
                    Ketik frasa berikut untuk melanjutkan:{" "}
                    <span className="rounded-md border border-[#141E19] bg-[#F2B705] px-2 py-0.5 font-mono text-[12.5px] text-[#141E19]">
                      RESET PEMIRA
                    </span>
                  </span>
                  <Input
                    value={phrase}
                    onChange={(e) => setPhrase(e.target.value)}
                    placeholder="Ketik di sini…"
                    autoComplete="off"
                    className="mt-1.5 h-11 rounded-[8px] border-2 border-[#141E19] font-mono font-bold tracking-wide shadow-none focus-visible:ring-2 focus-visible:ring-[#E05A47]"
                  />
                </label>

                <label className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-[#D8D3C8] px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={responsibility}
                    onChange={(e) => setResponsibility(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#E05A47]"
                  />
                  <span className="text-[12.5px] leading-relaxed text-[#4A5851]">
                    Saya memahami konsekuensi di atas dan bertanggung jawab atas penutupan periode ini sebagai penyegel
                    yang tercatat di audit log.
                  </span>
                </label>

                <div className="flex gap-2.5 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-12 flex-1 rounded-[10px] border-2 border-[#141E19] bg-white text-[13px] font-extrabold text-[#141E19] shadow-[3px_3px_0px_#141E19] hover:bg-[#F6F4EE]"
                  >
                    KEMBALI
                  </Button>
                  <Button
                    disabled={!phraseOk || !responsibility}
                    onClick={() => {
                      setError(null);
                      setStep(3);
                    }}
                    className="h-12 flex-1 rounded-[10px] border-2 border-[#141E19] bg-[#E05A47] text-[13px] font-extrabold text-white shadow-[3px_3px_0px_#141E19] hover:bg-[#C94B3B] disabled:opacity-50"
                  >
                    LANJUT <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            )}

            {/* ===== LANGKAH 3: sandi ITPO ===== */}
            {step === 3 && (
              <div className="mt-5 space-y-4">
                <div className="rounded-[10px] border-2 border-[#141E19] bg-[#F6F4EE] px-4 py-3 text-[12.5px] leading-relaxed text-[#4A5851]">
                  Periode <strong className="text-[#141E19]">{status?.periodLabel}</strong> → arsip baru → periode{" "}
                  <strong className="text-[#141E19]">{newPeriodLabel}</strong> (mode{" "}
                  {mode === "DEMO" ? "Gelombang Ulang" : "Periode Baru Total"}).
                </div>
                <label className="block">
                  <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A5851]">
                    Sandi Akun ITPO Anda
                  </span>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="mt-1 h-11 rounded-[8px] border-2 border-[#141E19] font-mono shadow-none focus-visible:ring-2 focus-visible:ring-[#E05A47]"
                  />
                </label>
                <div className="flex gap-2.5 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="h-12 flex-1 rounded-[10px] border-2 border-[#141E19] bg-white text-[13px] font-extrabold text-[#141E19] shadow-[3px_3px_0px_#141E19] hover:bg-[#F6F4EE]"
                  >
                    KEMBALI
                  </Button>
                  <Button
                    disabled={busy === "execute" || password.length === 0}
                    onClick={executeReset}
                    className="h-12 flex-1 rounded-[10px] border-2 border-[#141E19] bg-[#B3261E] text-[13px] font-extrabold text-white shadow-[3px_3px_0px_#141E19] hover:bg-[#9A201A] disabled:opacity-50"
                  >
                    {busy === "execute" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> MENSEGEL…
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4" aria-hidden /> SEGEL &amp; RESET PERMANEN
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* ===== LANGKAH 4 (sukses) ===== */}
            {step === 4 && success && (
              <div className="mt-5 space-y-4">
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#141E19] bg-[#E6F4EC] shadow-[3px_3px_0px_#141E19]">
                    <Check className="h-7 w-7 text-[#1B7F4E]" aria-hidden />
                  </div>
                  <h3 className="mt-3 font-display text-xl font-extrabold text-[#141E19]">
                    Periode Lama Tersegel — Lembar Baru Terbuka
                  </h3>
                  <p className="mx-auto mt-1 max-w-[420px] text-[13px] leading-relaxed text-[#4A5851]">{success.message}</p>
                </div>

                <div className="rounded-[10px] border-2 border-[#141E19] bg-[#F6F4EE] px-4 py-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#7A8881]">Arsip Resmi</p>
                  <p className="mt-1 font-mono text-[15px] font-extrabold text-[#141E19]">{success.archiveCode}</p>
                  <p className="mt-0.5 text-[12px] text-[#4A5851]">
                    {success.closedPeriodLabel} → periode aktif kini: <strong>{success.newPeriodLabel}</strong>
                    <br />
                    Kondisi lembar baru: {success.postCounts.ballots} suara • {success.postCounts.tokens} token •{" "}
                    {success.postCounts.dpt} DPT • {success.postCounts.candidates} kandidat • 5 rantai genesis kosong.
                  </p>
                </div>

                <p className="rounded-[10px] border border-dashed border-[#E05A47] bg-[#FDE8E5] px-3 py-2.5 text-[12.5px] leading-relaxed text-[#842029]">
                  <strong>Penting:</strong> sesi Anda juga telah hangus (rotasi secret). Unduh arsip final di bawah,
                  lalu login ulang untuk melanjutkan administrasi periode baru.
                </p>

                <div className="flex flex-col gap-2.5">
                  {success.archiveDownloadUrl && (
                    <a
                      href={success.archiveDownloadUrl}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-[#F2B705] text-[13px] font-extrabold text-[#141E19] shadow-[3px_3px_0px_#141E19] transition-all hover:-translate-y-0.5"
                    >
                      <Download className="h-4 w-4" aria-hidden /> UNDUH ARSIP FINAL ({success.archiveCode}.json)
                    </a>
                  )}
                  <Button
                    onClick={() => {
                      setWizardOpen(false);
                      onSessionInvalidated?.();
                    }}
                    className="h-12 w-full rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] text-[13px] font-extrabold text-white shadow-[3px_3px_0px_#141E19] hover:bg-[#176D42]"
                  >
                    SELESAI — LOGIN ULANG
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- sub-komponen kecil ----------
function StagePill({ on, onText, offText, onColor }: { on: boolean; onText: string; offText: string; onColor: string }) {
  return (
    <span
      className="rounded-full border border-[#141E19] px-2.5 py-0.5 font-mono text-[10px] font-extrabold text-white"
      style={{ background: on ? onColor : "#7A8881" }}
    >
      {on ? onText : offText}
    </span>
  );
}

function ModeOption({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-[10px] border-2 px-4 py-3 text-left transition-all ${
        active
          ? "border-[#141E19] bg-[#E6F4EC] shadow-[3px_3px_0px_#141E19]"
          : "border-[#D8D3C8] bg-white hover:border-[#141E19]"
      }`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#141E19] ${
          active ? "bg-[#1B7F4E] text-white" : "bg-[#F6F4EE] text-[#4A5851]"
        }`}
      >
        {icon}
      </span>
      <span>
        <span className="block text-[13.5px] font-extrabold text-[#141E19]">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-[#4A5851]">{desc}</span>
      </span>
    </button>
  );
}
