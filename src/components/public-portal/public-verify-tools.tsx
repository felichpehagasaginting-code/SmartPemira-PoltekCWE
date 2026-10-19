"use client";

// ============================================================
// ALAT VERIFIKASI PUBLIK — Rekomendasi #6 & #9
// 1) Cek Struk Suara    : bukti kehadiran balok di hash chain
// 2) Verifikasi BA C-KWE: cocokkan tanda tangan dokumen dengan
//    perhitungan ulang dari kotak suara saat ini.
// Tanpa identitas, tanpa isi suara — murni bukti integritas.
// ============================================================
import { useState } from "react";
import { CheckCircle2, FileSearch, Loader2, ReceiptText, ShieldQuestion, XCircle } from "lucide-react";

interface ReceiptResult {
  ok: boolean;
  found: boolean;
  message?: string;
  tpsName?: string;
  blockSeq?: number;
  recordedAt?: string;
}

interface VerifyBarResult {
  ok: boolean;
  valid: boolean;
  locked?: boolean;
  message?: string;
  summary?: {
    tpsName: string;
    chainHead: string;
    chainValid: boolean;
    checkedBlocks: number;
    totals: { dptTotal: number; voted: number; ballots: number; tokenUsed: number };
    plenoUnlockedAt: string | null;
  };
}

export function ReceiptChecker() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReceiptResult | null>(null);

  async function check() {
    if (!code.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/public/receipt?code=${encodeURIComponent(code.trim())}`, { cache: "no-store" });
      setResult((await res.json()) as ReceiptResult);
    } catch {
      setResult({ ok: false, found: false, message: "Kesalahan jaringan — coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tactile-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] shadow-[3px_3px_0px_#141E19]">
          <ReceiptText className="h-5 w-5 text-white" aria-hidden />
        </div>
        <div>
          <h3 className="font-display text-lg font-extrabold">Cek Struk Suara</h3>
          <p className="text-[12.5px] text-[#4A5851]">
            Masukkan 12 karakter kode struk dari bilik suara untuk memastikan suara Anda tercatat — tanpa membuka isinya.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="XXXX-XXXX-XXXX"
          maxLength={16}
          aria-label="Kode struk suara"
          className="h-12 flex-1 rounded-[8px] border-2 border-[#141E19] bg-white px-4 font-mono text-[16px] font-bold tracking-[0.1em] text-[#141E19] focus:outline-none focus:ring-2 focus:ring-[#1B7F4E]"
        />
        <button
          type="button"
          onClick={check}
          disabled={busy || code.trim().length < 12}
          className="flex h-12 items-center justify-center gap-2 rounded-[8px] border-2 border-[#141E19] bg-[#141E19] px-6 text-[13px] font-extrabold text-white shadow-[3px_3px_0px_#1B7F4E] transition-all hover:-translate-y-0.5 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
          {busy ? "MEMERIKSA…" : "PERIKSA"}
        </button>
      </div>

      {result && (
        <div
          role="status"
          className={`mt-4 flex items-start gap-3 rounded-[10px] border-2 px-4 py-3 ${
            result.found ? "border-[#1B7F4E] bg-[#E6F4EC]" : "border-[#E05A47] bg-[#FDE8E5]"
          }`}
        >
          {result.found ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1B7F4E]" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#E05A47]" />}
          <div className="text-[13px] leading-relaxed">
            <p className={`font-extrabold ${result.found ? "text-[#0F5132]" : "text-[#842029]"}`}>
              {result.found ? "SUARA TERVERIFIKASI TERCATAT" : "TIDAK DITEMUKAN"}
            </p>
            <p className="mt-0.5 text-[#4A5851]">{result.message}</p>
            {result.found && (
              <p className="mt-1.5 font-mono-tabular text-[12px] font-bold text-[#0F5132]">
                {result.tpsName} • Blok #{result.blockSeq} • Tercatat{" "}
                {result.recordedAt ? new Date(result.recordedAt).toLocaleString("id-ID") : "-"} WIB
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BeritaAcaraVerifier({ plenoUnlocked }: { plenoUnlocked: boolean }) {
  const [sig, setSig] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyBarResult | null>(null);

  async function check() {
    if (!sig.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/public/verify-ba?sig=${encodeURIComponent(sig.trim())}`, { cache: "no-store" });
      setResult((await res.json()) as VerifyBarResult);
    } catch {
      setResult({ ok: false, valid: false, message: "Kesalahan jaringan — coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tactile-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border-2 border-[#141E19] bg-[#0F766E] shadow-[3px_3px_0px_#141E19]">
          <ShieldQuestion className="h-5 w-5 text-white" aria-hidden />
        </div>
        <div>
          <h3 className="font-display text-lg font-extrabold">Verifikasi Berita Acara (C-KWE)</h3>
          <p className="text-[12.5px] text-[#4A5851]">
            Tempel tanda tangan SHA-256 pada dokumen Berita Acara — sistem menghitung ulang dari kotak suara digital dan mencocokkannya.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <input
          value={sig}
          onChange={(e) => setSig(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="Tempel 64 karakter tanda tangan SHA-256…"
          aria-label="Tanda tangan Berita Acara"
          className="h-12 flex-1 rounded-[8px] border-2 border-[#141E19] bg-white px-4 font-mono text-[13px] text-[#141E19] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
        />
        <button
          type="button"
          onClick={check}
          disabled={busy || sig.trim().length < 64}
          className="flex h-12 items-center justify-center gap-2 rounded-[8px] border-2 border-[#141E19] bg-[#0F766E] px-6 text-[13px] font-extrabold text-white shadow-[3px_3px_0px_#141E19] transition-all hover:-translate-y-0.5 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
          {busy ? "MEMVERIFIKASI…" : "VERIFIKASI"}
        </button>
      </div>

      {!plenoUnlocked && !result && (
        <p className="mt-3 rounded-[10px] border border-dashed border-[#D8D3C8] px-3 py-2 text-[12px] text-[#7A8881]">
          Berita Acara final terbit setelah Sidang Pleno (FR-06.3). Verifikasi dapat dilakukan setelah kotak suara dibuka.
        </p>
      )}

      {result && (
        <div
          role="status"
          className={`mt-4 rounded-[10px] border-2 px-4 py-3 ${
            result.valid ? "border-[#1B7F4E] bg-[#E6F4EC]" : result.locked ? "border-[#D8D3C8] bg-[#F6F4EE]" : "border-[#E05A47] bg-[#FDE8E5]"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.valid ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1B7F4E]" />
            ) : result.locked ? (
              <ShieldQuestion className="mt-0.5 h-5 w-5 shrink-0 text-[#7A8881]" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#E05A47]" />
            )}
            <div className="text-[13px] leading-relaxed">
              <p className={`font-extrabold ${result.valid ? "text-[#0F5132]" : result.locked ? "text-[#4A5851]" : "text-[#842029]"}`}>
                {result.valid ? "TANDA TANGAN TERVERIFIKASI — DOKUMEN SAH" : result.locked ? "KOTAK SUARA MASIH TERKUNCI" : "TANDA TANGAN TIDAK COCOK"}
              </p>
              <p className="mt-0.5 text-[#4A5851]">{result.message}</p>
              {result.valid && result.summary && (
                <div className="mt-2 grid gap-1 font-mono-tabular text-[12px] font-bold text-[#0F5132] sm:grid-cols-2">
                  <span>{result.summary.tpsName}</span>
                  <span>DPT {result.summary.totals.dptTotal} • Hadir {result.summary.totals.voted} • Balok {result.summary.totals.ballots}</span>
                  <span className="sm:col-span-2">
                    Chain head: {result.summary.chainHead.slice(0, 24)}… ({result.summary.checkedBlocks} blok ✓)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
