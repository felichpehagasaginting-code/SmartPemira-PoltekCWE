"use client";

// ============================================================
// HALAMAN VERIFIKASI PUBLIK — Rekomendasi #9
// Target QR pada Berita Acara C-KWE: /verify?sig=<sha256>
// Publik memeriksa keaslian dokumen tanpa login. Halaman ini
// terpisah dari gerbang login (path khusus, tanpa data sensitif).
// ============================================================
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Lock, ShieldCheck, XCircle } from "lucide-react";

interface VerifyResult {
  ok: boolean;
  valid: boolean;
  locked?: boolean;
  message?: string;
  summary?: {
    chainValid: boolean;
    chains: Array<{ id: string; name: string; headHash: string; checked: number }>;
    checkedBlocks: number;
    revoteStats: { tokensVoted: number; tokensRevoted: number; supersededBallots: number; lockedTokens: number };
    totals: { dptTotal: number; voted: number; ballots: number; tokenUsed: number };
    plenoUnlockedAt: string | null;
  };
}

function VerifyContent() {
  const params = useSearchParams();
  const sig = params.get("sig") ?? "";
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(true);

  const verify = useCallback(async (signature: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/public/verify-ba?sig=${encodeURIComponent(signature)}`, { cache: "no-store" });
      setResult((await res.json()) as VerifyResult);
    } catch {
      setResult({ ok: false, valid: false, message: "Kesalahan jaringan — coba lagi." });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (sig) void verify(sig);
    else setBusy(false);
  }, [sig, verify]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F4EE]">
      <header className="border-b border-[#D8D3C8] bg-[#F6F4EE]">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] shadow-[3px_3px_0px_#141E19]">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 21c4.97 0 9-4.03 9-9V4.5c0-.83-.67-1.5-1.5-1.5H12c-4.97 0-9 4.03-9 9s4.03 9 9 9Z" />
              <path d="m9 11.5 2 2 4-4" />
            </svg>
          </div>
          <div>
            <p className="font-display text-lg font-extrabold leading-none tracking-[-0.02em] text-[#141E19]">SMART PEMIRA — Verifikasi Publik</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7A8881]">Keaslian Berita Acara Model C-KWE</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        {busy ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1B7F4E]" />
            <p className="text-sm font-semibold text-[#4A5851]">Memverifikasi tanda tangan dokumen…</p>
          </div>
        ) : !sig ? (
          <div className="tactile-card p-8 text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-[#1B7F4E]" />
            <h1 className="mt-3 font-display text-2xl font-extrabold">Verifikasi Berita Acara</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#4A5851]">
              Halaman ini memeriksa keaslian dokumen Berita Acara Rekapitulasi Hasil Pemira melalui tanda tangan kriptografisnya.
              Pindai QR pada dokumen, atau tempel tanda tangan 64 karakter di bawah.
            </p>
            <ManualInput onSubmit={(s) => void verify(s)} />
          </div>
        ) : result ? (
          <div
            className={`tactile-card border-2 p-8 ${
              result.valid ? "border-[#1B7F4E] bg-[#F0FAF4]" : result.locked ? "border-[#D8D3C8]" : "border-[#E05A47] bg-[#FDF3F2]"
            }`}
          >
            <div className="flex items-start gap-4">
              {result.valid ? (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] border-[#1B7F4E] bg-[#DCFCE7]">
                  <CheckCircle2 className="h-8 w-8 text-[#1B7F4E]" />
                </div>
              ) : result.locked ? (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] border-[#7A8881] bg-[#EAE6DF]">
                  <Lock className="h-8 w-8 text-[#4A5851]" />
                </div>
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] border-[#E05A47] bg-[#FDE8E5]">
                  <XCircle className="h-8 w-8 text-[#E05A47]" />
                </div>
              )}
              <div className="flex-1">
                <h1 className={`font-display text-2xl font-extrabold tracking-[-0.02em] ${result.valid ? "text-[#0F5132]" : result.locked ? "text-[#4A5851]" : "text-[#842029]"}`}>
                  {result.valid ? "DOKUMEN SAH — TANDA TANGAN COCOK" : result.locked ? "KOTAK SUARA MASIH TERKUNCI" : "DOKUMEN TIDAK SAH"}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[#4A5851]">{result.message}</p>

                {result.valid && result.summary && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {[
                      ["Mode pemungutan", `100% Online — ${result.summary.chains.length} rantai prodi`],
                      ["Pleno dibuka", result.summary.plenoUnlockedAt ? new Date(result.summary.plenoUnlockedAt).toLocaleString("id-ID") : "-"],
                      ["Total DPT", String(result.summary.totals.dptTotal)],
                      ["Hadir memilih", String(result.summary.totals.voted)],
                      ["Balok tersegel", String(result.summary.totals.ballots)],
                      ["Integritas rantai", `${result.summary.chainValid ? "VALID" : "BROKEN"} (${result.summary.checkedBlocks} blok, ${result.summary.chains.filter((c) => true).length} rantai)`],
                      ["Re-vote (Estonia)", `${result.summary.revoteStats.tokensRevoted} token mengganti suara • ${result.summary.revoteStats.supersededBallots} blok usang tak dihitung`],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-[8px] border border-[#D8D3C8] bg-white px-4 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A8881]">{k}</p>
                        <p className="font-mono-tabular text-[13px] font-extrabold text-[#141E19]">{v}</p>
                      </div>
                    ))}
                    {result.summary.chains.map((c) => (
                      <div key={c.id} className="rounded-[8px] border border-[#D8D3C8] bg-white px-4 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A8881]">Rantai {c.id} — head SHA-256</p>
                        <p className="break-all font-mono text-[10.5px] text-[#141E19]">{c.headHash}</p>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void verify(sig)}
                  className="no-print mt-5 flex h-11 items-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-white px-5 text-[12.5px] font-extrabold shadow-[3px_3px_0px_#141E19] transition-all hover:-translate-y-0.5"
                >
                  <ShieldCheck className="h-4 w-4" /> VERIFIKASI ULANG
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="mt-auto border-t border-[#D8D3C8] bg-[#F6F4EE]">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <p className="text-[11.5px] leading-relaxed text-[#7A8881]">
            Verifikasi bekerja dengan menghitung ulang tanda tangan SHA-256 dari kondisi kotak suara digital saat ini dan membandingkannya
            dengan tanda tangan pada dokumen. Tanda tangan identik = dokumen sah & hasil belum berubah.
          </p>
        </div>
      </footer>
    </div>
  );
}

function ManualInput({ onSubmit }: { onSubmit: (sig: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="mx-auto mt-5 flex max-w-md flex-col gap-2.5 sm:flex-row">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tempel tanda tangan SHA-256…"
        className="h-12 flex-1 rounded-[8px] border-2 border-[#141E19] bg-white px-4 font-mono text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1B7F4E]"
      />
      <button
        type="button"
        onClick={() => value.trim().length === 64 && onSubmit(value.trim())}
        disabled={value.trim().length !== 64}
        className="h-12 rounded-[8px] border-2 border-[#141E19] bg-[#141E19] px-6 text-[13px] font-extrabold text-white shadow-[3px_3px_0px_#1B7F4E] disabled:opacity-40"
      >
        VERIFIKASI
      </button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F6F4EE]">
          <Loader2 className="h-8 w-8 animate-spin text-[#1B7F4E]" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
