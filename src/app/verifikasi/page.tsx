"use client";

// ============================================================
// PORTAL VERIFIKASI PUBLIK TERPADU (Paket #4)
// Desain: Neo-Editorial Botanical / Tactile Neo-Brutalist
// Tab 1: Verifikasi Struk Suara Pemilih (Voter Receipt)
// Tab 2: Verifikasi Berita Acara & Konsensus Multisig Ed25519
// Akses publik 100% tanpa login, kepatuhan WCAG AA, full keyboard nav.
// ============================================================
import { Suspense, useCallback, useEffect, useId, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileCheck2,
  Hash,
  HelpCircle,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";

type TabMode = "receipt" | "pleno";

interface ReceiptVerifyData {
  ok: boolean;
  found: boolean;
  tpsName?: string;
  blockSeq?: number;
  voteVersion?: number;
  voteStatus?: "AKTIF" | "DIGANTI" | "DICABUT";
  statusDetail?: string;
  recordedAt?: string;
  message?: string;
}

interface MultisigSignerInfo {
  role: string;
  signerName: string;
  signerNim: string;
  signedAt: string;
  valid: boolean;
  publicKeyFingerprint: string;
}

interface BaVerifyData {
  ok: boolean;
  valid: boolean;
  locked?: boolean;
  message?: string;
  checks?: { sha256: boolean; ed25519: boolean | null };
  signatureSha256?: string;
  signatureEd25519?: string | null;
  multisig?: {
    valid: boolean;
    totalSigners: number;
    verifiedRoles: string[];
    quorumMet: boolean;
    missingRequiredRoles: string[];
    invalidSignatures?: Array<{ role: string; signerName: string; reason: string }>;
    signers: MultisigSignerInfo[];
  };
  summary?: {
    chainValid: boolean;
    chains: Array<{ id: string; name: string; headHash: string; checked: number }>;
    checkedBlocks: number;
    revoteStats: {
      tokensVoted: number;
      tokensRevoted: number;
      supersededBallots: number;
      lockedTokens: number;
    };
    totals: { dptTotal: number; voted: number; ballots: number; tokenUsed: number };
    plenoUnlockedAt: string | null;
  };
}

const ROLE_LABELS: Record<string, { label: string; org: string }> = {
  KPUM_CHAIR: { label: "Ketua KPUM", org: "Penyelenggara Pemira" },
  PANWASLU_CHAIR: { label: "Ketua Panwaslu", org: "Pengawas Pemilu" },
  WITNESS_PASLON_01: { label: "Saksi Paslon 01", org: "Presma & Wapresma No. 01" },
  WITNESS_PASLON_02: { label: "Saksi Paslon 02", org: "Presma & Wapresma No. 02" },
  DPM_REPRESENTATIVE: { label: "Perwakilan DPM", org: "Dewan Perwakilan Mahasiswa" },
};

function formatReceiptInput(value: string): string {
  const clean = value.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.slice(i, i + 4));
  }
  return parts.join("-");
}

function PortalContent() {
  const params = useSearchParams();
  const initialTab = params.get("tab") === "ba" || params.get("sig") ? "pleno" : "receipt";
  const [activeTab, setActiveTab] = useState<TabMode>(initialTab);

  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setActiveTab((prev) => (prev === "receipt" ? "pleno" : "receipt"));
    }
  };

  // Tab 1 state
  const [receiptInput, setReceiptInput] = useState(params.get("code") ? formatReceiptInput(params.get("code")!) : "");
  const [receiptResult, setReceiptResult] = useState<ReceiptVerifyData | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Tab 2 state
  const [baSigInput, setBaSigInput] = useState(params.get("sig") ?? "");
  const [baResult, setBaResult] = useState<BaVerifyData | null>(null);
  const [baLoading, setBaLoading] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const receiptInputId = useId();
  const baInputId = useId();

  // Verifikasi Struk Suara
  const handleVerifyReceipt = useCallback(async (codeToVerify: string) => {
    const raw = codeToVerify.replace(/-/g, "").trim();
    if (raw.length !== 12) return;
    setReceiptLoading(true);
    try {
      const res = await fetch(`/api/public/receipt?code=${encodeURIComponent(codeToVerify)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as ReceiptVerifyData;
      setReceiptResult(data);
    } catch {
      setReceiptResult({
        ok: false,
        found: false,
        message: "Gagal terhubung ke simpul verifikasi. Periksa koneksi internet Anda.",
      });
    } finally {
      setReceiptLoading(false);
    }
  }, []);

  // Verifikasi Berita Acara
  const handleVerifyBa = useCallback(async (sigToVerify?: string) => {
    setBaLoading(true);
    try {
      const query = sigToVerify && sigToVerify.trim().length === 64
        ? `sig=${encodeURIComponent(sigToVerify.trim())}`
        : "current=true";
      const res = await fetch(`/api/public/verify-ba?${query}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as BaVerifyData;
      setBaResult(data);
    } catch {
      setBaResult({
        ok: false,
        valid: false,
        message: "Gagal memverifikasi Berita Acara. Pastikan server pleno aktif.",
      });
    } finally {
      setBaLoading(false);
    }
  }, []);

  // Auto-run dari URL search params
  useEffect(() => {
    const codeParam = params.get("code");
    if (codeParam && codeParam.replace(/-/g, "").length === 12) {
      void handleVerifyReceipt(formatReceiptInput(codeParam));
    }
  }, [params, handleVerifyReceipt]);

  useEffect(() => {
    if (activeTab === "pleno" && !baResult && !baLoading) {
      void handleVerifyBa(params.get("sig") ?? undefined);
    }
  }, [activeTab, baResult, baLoading, params, handleVerifyBa]);

  const copyToClipboard = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      if (id === "receipt") {
        setCopiedReceipt(true);
        setTimeout(() => setCopiedReceipt(false), 2000);
      } else {
        setCopiedHash(id);
        setTimeout(() => setCopiedHash(null), 2000);
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F4EE] text-[#141E19]">
      {/* Top Banner Navigation */}
      <header className="border-b-2 border-[#141E19] bg-[#EFECE4]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] text-white shadow-[3px_3px_0px_#141E19]">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="font-display text-lg font-black tracking-[-0.02em] text-[#141E19]">
                SMART PEMIRA POLTEK CWE
              </p>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#556960]">
                Portal Verifikasi Publik Terbuka & Kriptografis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/pemilih"
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border-2 border-[#141E19] bg-white px-3 text-xs font-black shadow-[2px_2px_0px_#141E19] transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
            >
              Bilik Suara <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Explainer Section */}
      <section className="border-b border-[#D8D3C8] bg-white py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="inline-block rounded-full border border-[#1B7F4E]/30 bg-[#DCFCE7] px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-[#0F5132]">
            Transparansi Pemilu Tanpa Rahasia
          </div>
          <h1 className="mt-3 font-display text-2xl font-black tracking-[-0.03em] sm:text-3xl text-[#141E19]">
            Verifikasi Mandiri Suara & Berita Acara Pleno
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4A5851]">
            Setiap suara di Pemira Poltek CWE dilindungi rantai blok kriptografis SHA-256 per program studi dan
            ditandatangani secara asimetris dengan Ed25519 multi-signature. Periksa struk voting Anda atau audit Berita
            Acara resmi di bawah ini.
          </p>

          {/* Tab Controls (Accessible Tablist) */}
          <div
            role="tablist"
            aria-label="Pilihan Verifikasi"
            className="mt-6 flex flex-wrap gap-2 border-b border-[#D8D3C8] pb-px"
          >
            <button
              role="tab"
              id="tab-receipt"
              aria-selected={activeTab === "receipt"}
              aria-controls="panel-receipt"
              tabIndex={activeTab === "receipt" ? 0 : -1}
              onClick={() => setActiveTab("receipt")}
              onKeyDown={handleTabKeyDown}
              className={`flex items-center gap-2 rounded-t-[10px] border-2 border-b-0 px-5 py-3 text-sm font-black transition-all focus-visible:ring-2 focus-visible:ring-[#1B7F4E] ${
                activeTab === "receipt"
                  ? "border-[#141E19] bg-[#F6F4EE] text-[#141E19] shadow-[2px_-2px_0px_#141E19]"
                  : "border-transparent bg-transparent text-[#7A8881] hover:text-[#141E19]"
              }`}
            >
              <FileCheck2 className="h-4 w-4" aria-hidden="true" />
              <span>Verifikasi Struk Suara (Receipt)</span>
            </button>

            <button
              role="tab"
              id="tab-pleno"
              aria-selected={activeTab === "pleno"}
              aria-controls="panel-pleno"
              tabIndex={activeTab === "pleno" ? 0 : -1}
              onClick={() => setActiveTab("pleno")}
              onKeyDown={handleTabKeyDown}
              className={`flex items-center gap-2 rounded-t-[10px] border-2 border-b-0 px-5 py-3 text-sm font-black transition-all focus-visible:ring-2 focus-visible:ring-[#1B7F4E] ${
                activeTab === "pleno"
                  ? "border-[#141E19] bg-[#F6F4EE] text-[#141E19] shadow-[2px_-2px_0px_#141E19]"
                  : "border-transparent bg-transparent text-[#7A8881] hover:text-[#141E19]"
              }`}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>Verifikasi Berita Acara & Multisig</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {/* ==================== TAB 1: STRUK SUARA ==================== */}
        {activeTab === "receipt" && (
          <div role="tabpanel" id="panel-receipt" aria-labelledby="tab-receipt" className="space-y-6">
            <div className="rounded-[14px] border-2 border-[#141E19] bg-white p-6 shadow-[5px_5px_0px_#141E19]">
              <div className="max-w-xl">
                <label
                  htmlFor={receiptInputId}
                  className="block text-xs font-black uppercase tracking-wider text-[#141E19]"
                >
                  Masukkan Kode Struk Suara Anda
                </label>
                <p className="mt-1 text-xs text-[#556960]">
                  Format 12 karakter alfanumerik (contoh: <span className="font-mono font-bold">7A3F-9C2B-01DE</span>)
                  yang didapatkan setelah mencoblos di bilik suara.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleVerifyReceipt(receiptInput);
                  }}
                  className="mt-4 flex flex-col gap-3 sm:flex-row"
                >
                  <div className="relative flex-1">
                    <input
                      id={receiptInputId}
                      name="receiptCode"
                      type="text"
                      maxLength={14}
                      autoComplete="off"
                      spellCheck="false"
                      value={receiptInput}
                      onChange={(e) => setReceiptInput(formatReceiptInput(e.target.value))}
                      placeholder="XXXX-XXXX-XXXX"
                      className="h-12 w-full rounded-[10px] border-2 border-[#141E19] bg-[#FDFCF7] px-4 font-mono text-base font-bold tracking-widest text-[#141E19] uppercase transition-all placeholder:text-[#9AA6A0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={receiptLoading || receiptInput.replace(/-/g, "").length !== 12}
                    className="flex h-12 items-center justify-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] px-6 text-sm font-black text-white shadow-[3px_3px_0px_#141E19] transition-all hover:-translate-y-0.5 hover:bg-[#16663E] active:translate-y-0 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
                  >
                    {receiptLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Search className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>CEK STRUK</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Hasil Verifikasi Struk */}
            {receiptResult && (
              <div
                className={`rounded-[14px] border-2 p-6 shadow-[5px_5px_0px_#141E19] transition-all ${
                  !receiptResult.ok
                    ? "border-[#D97706] bg-[#FEF9EE]"
                    : receiptResult.found
                    ? receiptResult.voteStatus === "AKTIF"
                      ? "border-[#1B7F4E] bg-[#F0FAF4]"
                      : receiptResult.voteStatus === "DIGANTI"
                      ? "border-[#D97706] bg-[#FEF9EE]"
                      : "border-[#DC2626] bg-[#FEF2F2]"
                    : "border-[#DC2626] bg-[#FEF2F2]"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${
                        !receiptResult.ok
                          ? "border-[#D97706] bg-[#FEF3C7] text-[#92400E]"
                          : receiptResult.found
                          ? receiptResult.voteStatus === "AKTIF"
                            ? "border-[#1B7F4E] bg-[#DCFCE7] text-[#0F5132]"
                            : receiptResult.voteStatus === "DIGANTI"
                            ? "border-[#D97706] bg-[#FEF3C7] text-[#92400E]"
                            : "border-[#DC2626] bg-[#FEE2E2] text-[#991B1B]"
                          : "border-[#DC2626] bg-[#FEE2E2] text-[#991B1B]"
                      }`}
                    >
                      {!receiptResult.ok ? (
                        <AlertCircle className="h-6 w-6" aria-hidden="true" />
                      ) : receiptResult.found ? (
                        receiptResult.voteStatus === "AKTIF" ? (
                          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                        ) : receiptResult.voteStatus === "DIGANTI" ? (
                          <Clock className="h-6 w-6" aria-hidden="true" />
                        ) : (
                          <XCircle className="h-6 w-6" aria-hidden="true" />
                        )
                      ) : (
                        <XCircle className="h-6 w-6" aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-black text-[#141E19]">
                          {receiptInput || "KODE STRUK"}
                        </span>
                        <span
                          className={`rounded-[6px] border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            !receiptResult.ok
                              ? "border-[#D97706] bg-[#FEF3C7] text-[#92400E]"
                              : receiptResult.found
                              ? receiptResult.voteStatus === "AKTIF"
                                ? "border-[#1B7F4E] bg-[#DCFCE7] text-[#0F5132]"
                                : receiptResult.voteStatus === "DIGANTI"
                                ? "border-[#D97706] bg-[#FEF3C7] text-[#92400E]"
                                : "border-[#DC2626] bg-[#FEE2E2] text-[#991B1B]"
                              : "border-[#DC2626] bg-[#FEE2E2] text-[#991B1B]"
                          }`}
                        >
                          {!receiptResult.ok
                            ? "STATUS: GAGAL DIPERIKSA"
                            : receiptResult.found
                            ? `STATUS: ${receiptResult.voteStatus}`
                            : "STATUS: TIDAK DITEMUKAN"}
                        </span>
                      </div>
                      <h2 className="mt-1 font-display text-xl font-black text-[#141E19]">
                        {!receiptResult.ok
                          ? "Pengecekan Struk Terkendala"
                          : receiptResult.found
                          ? receiptResult.voteStatus === "AKTIF"
                            ? "Struk Terverifikasi — Suara Sah & Aktif"
                            : receiptResult.voteStatus === "DIGANTI"
                            ? "Struk Tercatat — Telah Diganti Versi Lebih Baru"
                            : "Struk Dibatalkan — Token Dicabut Petugas"
                          : "Kode Struk Tidak Ditemukan"}
                      </h2>
                      <p className="mt-1 text-xs leading-relaxed text-[#4A5851]">
                        {receiptResult.statusDetail ?? receiptResult.message}
                      </p>
                    </div>
                  </div>

                  {receiptResult.found && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(receiptInput, "receipt")}
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] border-2 border-[#141E19] bg-white px-3 text-xs font-black shadow-[2px_2px_0px_#141E19] hover:bg-[#F6F4EE] focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
                    >
                      {copiedReceipt ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#1B7F4E]" aria-hidden="true" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Salin Kode</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Metadata Cards */}
                {receiptResult.found && (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-[10px] border border-[#141E19]/20 bg-white p-3.5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#7A8881]">TPS Virtual / Prodi</p>
                      <p className="mt-0.5 font-mono text-sm font-black text-[#141E19]">
                        {receiptResult.tpsName ?? "-"}
                      </p>
                    </div>

                    <div className="rounded-[10px] border border-[#141E19]/20 bg-white p-3.5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#7A8881]">Urutan Blok Hash</p>
                      <p className="mt-0.5 font-mono text-sm font-black text-[#141E19]">
                        Blok #{receiptResult.blockSeq ?? "-"}
                      </p>
                    </div>

                    <div className="rounded-[10px] border border-[#141E19]/20 bg-white p-3.5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#7A8881]">Versi Coblosan</p>
                      <p className="mt-0.5 font-mono text-sm font-black text-[#141E19]">
                        Versi {receiptResult.voteVersion ?? 1}{" "}
                        {receiptResult.voteVersion && receiptResult.voteVersion > 1 ? "(Re-vote)" : "(Pertama)"}
                      </p>
                    </div>

                    <div className="rounded-[10px] border border-[#141E19]/20 bg-white p-3.5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#7A8881]">Waktu Tercatat (Jittered)</p>
                      <p className="mt-0.5 font-mono text-xs font-bold text-[#141E19]">
                        {receiptResult.recordedAt
                          ? new Date(receiptResult.recordedAt).toLocaleString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Zero-Knowledge Privacy Guarantee */}
                <div className="mt-5 rounded-[10px] border border-[#D8D3C8] bg-white/70 p-3.5 text-xs text-[#556960]">
                  <p className="font-black text-[#141E19]">Jaminan Privasi Penuh (Zero-Knowledge):</p>
                  <p className="mt-0.5 leading-relaxed">
                    Kode struk ini membuktikan suara Anda telah masuk dan tersegel dalam rantai hash blok prodi tanpa
                    pernah membocorkan pilihan kandidat maupun menghubungkan kembali ke NIM/identitas Anda.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: BERITA ACARA & MULTISIG ==================== */}
        {activeTab === "pleno" && (
          <div role="tabpanel" id="panel-pleno" aria-labelledby="tab-pleno" className="space-y-6">
            {/* Input Verifikasi Manual Opsional */}
            <div className="rounded-[14px] border-2 border-[#141E19] bg-white p-6 shadow-[5px_5px_0px_#141E19]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <label htmlFor={baInputId} className="block text-xs font-black uppercase tracking-wider text-[#141E19]">
                    Verifikasi Tanda Tangan Berita Acara (Model C-KWE)
                  </label>
                  <p className="mt-1 text-xs text-[#556960]">
                    Pemeriksaan otomatis memverifikasi dokumen resmi terhadap kondisi kotak suara digital saat ini.
                    Atau tempel tanda tangan SHA-256 64-karakter untuk audit manual.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleVerifyBa(baSigInput || undefined)}
                  disabled={baLoading}
                  className="flex h-11 items-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-[#141E19] px-5 text-xs font-black text-white shadow-[3px_3px_0px_#1B7F4E] transition-all hover:-translate-y-0.5 hover:bg-[#25332B] disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
                >
                  {baLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>REFRESH AUDIT</span>
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  id={baInputId}
                  name="baSignature"
                  type="text"
                  value={baSigInput}
                  onChange={(e) => setBaSigInput(e.target.value.trim())}
                  placeholder="Opsional: Tempel tanda tangan SHA-256 (64 hex) dari lembar cetak..."
                  className="h-11 flex-1 rounded-[8px] border-2 border-[#141E19] bg-[#FDFCF7] px-3.5 font-mono text-xs text-[#141E19] placeholder:text-[#9AA6A0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
                />
                <button
                  type="button"
                  onClick={() => baSigInput.length === 64 && void handleVerifyBa(baSigInput)}
                  disabled={baLoading || baSigInput.length !== 64}
                  className="h-11 rounded-[8px] border-2 border-[#141E19] bg-white px-5 text-xs font-black shadow-[2px_2px_0px_#141E19] hover:bg-[#F6F4EE] disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
                >
                  AUDIT TANDA TANGAN
                </button>
              </div>
            </div>

            {/* Status Pleno Loading */}
            {baLoading && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-[#141E19] bg-white p-12 text-center shadow-[5px_5px_0px_#141E19]">
                <Loader2 className="h-8 w-8 animate-spin text-[#1B7F4E]" aria-hidden="true" />
                <p className="text-sm font-black text-[#141E19]">Menghitung ulang kanonikal & memverifikasi tanda tangan Ed25519...</p>
              </div>
            )}

            {/* Hasil Audit Berita Acara */}
            {!baLoading && baResult && (
              <div
                className={`rounded-[14px] border-2 p-6 shadow-[5px_5px_0px_#141E19] ${
                  !baResult.ok
                    ? "border-[#D97706] bg-[#FEF9EE]"
                    : baResult.valid
                    ? "border-[#1B7F4E] bg-[#F0FAF4]"
                    : baResult.locked
                    ? "border-[#7A8881] bg-[#F5F2EA]"
                    : "border-[#DC2626] bg-[#FEF2F2]"
                }`}
              >
                {/* Header Status */}
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 ${
                      !baResult.ok
                        ? "border-[#D97706] bg-[#FEF3C7] text-[#92400E]"
                        : baResult.valid
                        ? "border-[#1B7F4E] bg-[#DCFCE7] text-[#0F5132]"
                        : baResult.locked
                        ? "border-[#7A8881] bg-[#E5E0D4] text-[#4A5851]"
                        : "border-[#DC2626] bg-[#FEE2E2] text-[#991B1B]"
                    }`}
                  >
                    {!baResult.ok ? (
                      <AlertCircle className="h-8 w-8" aria-hidden="true" />
                    ) : baResult.valid ? (
                      <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                    ) : baResult.locked ? (
                      <Lock className="h-8 w-8" aria-hidden="true" />
                    ) : (
                      <ShieldAlert className="h-8 w-8" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-[6px] border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          !baResult.ok
                            ? "border-[#D97706] bg-[#FEF3C7] text-[#92400E]"
                            : baResult.valid
                            ? "border-[#1B7F4E] bg-[#DCFCE7] text-[#0F5132]"
                            : baResult.locked
                            ? "border-[#7A8881] bg-[#EAE6DF] text-[#4A5851]"
                            : "border-[#DC2626] bg-[#FEE2E2] text-[#991B1B]"
                        }`}
                      >
                        {!baResult.ok
                          ? "STATUS: SERVER TERKENDALA"
                          : baResult.valid
                          ? "STATUS: DOKUMEN SAH"
                          : baResult.locked
                          ? "STATUS: PLENO TERKUNCI"
                          : "STATUS: TIDAK SAH"}
                      </span>
                      {baResult.multisig && (
                        <span
                          className={`rounded-[6px] border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            baResult.multisig.quorumMet
                              ? "border-[#1B7F4E] bg-[#DCFCE7] text-[#0F5132]"
                              : "border-[#D97706] bg-[#FEF3C7] text-[#92400E]"
                          }`}
                        >
                          KUORUM MULTISIG: {baResult.multisig.totalSigners}/5 PENANDATANGAN
                        </span>
                      )}
                    </div>
                    <h2 className="mt-1 font-display text-2xl font-black text-[#141E19]">
                      {!baResult.ok
                        ? "GAGAL MENGHUBUNGI SERVER PLENO"
                        : baResult.valid
                        ? "BERITA ACARA MODEL C-KWE TERVERIFIKASI SAH"
                        : baResult.locked
                        ? "KOTAK SUARA DIGITAL MASIH TERKUNCI (PLENO VAULT)"
                        : "DOKUMEN TIDAK COCOK ATAU TIDAK SAH"}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-[#4A5851]">
                      {baResult.message}
                    </p>
                  </div>
                </div>

                {/* Section Multisig Signatories */}
                {baResult.multisig && (
                  <div className="mt-8 rounded-[12px] border-2 border-[#141E19] bg-white p-5 shadow-[3px_3px_0px_#141E19]">
                    <div className="flex items-center justify-between border-b border-[#D8D3C8] pb-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-[#1B7F4E]" aria-hidden="true" />
                        <h3 className="font-display text-base font-black text-[#141E19]">
                          Konsensus Tanda Tangan Ed25519 (Multi-Signature)
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold text-[#556960]">
                        Standar Kriptografi RFC 8032
                      </span>
                    </div>

                    {/* Banner Peringatan jika ada tanda tangan tidak valid / dipalsukan */}
                    {(baResult.multisig.invalidSignatures?.length ?? 0) > 0 && (
                      <div className="mt-4 rounded-[10px] border-2 border-[#DC2626] bg-[#FEF2F2] p-4 text-xs text-[#991B1B]">
                        <div className="flex items-center gap-2 font-black">
                          <ShieldAlert className="h-4 w-4 shrink-0 text-[#DC2626]" aria-hidden="true" />
                          <span>
                            PERINGATAN KRIPTOGRAFIS: Ditemukan {baResult.multisig.invalidSignatures?.length} tanda tangan tidak sah / cacat pada dokumen ini!
                          </span>
                        </div>
                        <ul className="mt-2 list-disc list-inside space-y-1 text-[11px]">
                          {baResult.multisig.invalidSignatures?.map((inv, idx) => (
                            <li key={idx}>
                              <span className="font-bold">{inv.role}</span> ({inv.signerName}): {inv.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        "KPUM_CHAIR",
                        "PANWASLU_CHAIR",
                        "WITNESS_PASLON_01",
                        "WITNESS_PASLON_02",
                        "DPM_REPRESENTATIVE",
                      ].map((role) => {
                        const meta = ROLE_LABELS[role];
                        const signedEntry = baResult.multisig?.signers.find((s) => s.role === role);
                        const hasSigned = Boolean(signedEntry);
                        const isVerified = signedEntry?.valid ?? false;

                        return (
                          <div
                            key={role}
                            className={`rounded-[10px] border-2 p-3.5 transition-all ${
                              hasSigned
                                ? isVerified
                                  ? "border-[#1B7F4E] bg-[#F0FAF4]"
                                  : "border-[#DC2626] bg-[#FEF2F2]"
                                : "border-[#D8D3C8] bg-[#FDFCF7] opacity-80"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#7A8881]">
                                {meta.org}
                              </span>
                              {hasSigned ? (
                                isVerified ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[9.5px] font-black text-[#0F5132]">
                                    <Check className="h-3 w-3" aria-hidden="true" /> SAH
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[9.5px] font-black text-[#991B1B]">
                                    <XCircle className="h-3 w-3" aria-hidden="true" /> CACAT
                                  </span>
                                )
                              ) : (
                                <span className="rounded-full bg-[#EAE6DF] px-2 py-0.5 text-[9.5px] font-bold text-[#7A8881]">
                                  BELUM
                                </span>
                              )}
                            </div>

                            <p className="mt-1 font-display text-sm font-black text-[#141E19]">
                              {meta.label}
                            </p>

                            {signedEntry ? (
                              <div className="mt-2 space-y-1 text-[11px] text-[#4A5851]">
                                <p className="font-semibold text-[#141E19]">
                                  {signedEntry.signerName}{" "}
                                  <span className="font-mono text-[10px] text-[#7A8881]">({signedEntry.signerNim})</span>
                                </p>
                                <p className="font-mono text-[10px] text-[#556960]">
                                  Key ID: <span className="font-bold">{signedEntry.publicKeyFingerprint}</span>
                                </p>
                                <p className="text-[10px] text-[#7A8881]">
                                  {new Date(signedEntry.signedAt).toLocaleString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                                {!isVerified && (
                                  <p className="mt-1 text-[10px] font-black text-[#DC2626]">
                                    Tanda tangan tidak cocok dengan kanonikal dokumen!
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="mt-2 text-[11px] text-[#9AA6A0] italic">
                                Menunggu tanda tangan digital di sidang pleno
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section Ringkasan Hasil & 5 Rantai Prodi */}
                {baResult.summary && (
                  <>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-[10px] border border-[#141E19]/20 bg-white p-3.5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#7A8881]">Total Pemilih (DPT)</p>
                        <p className="mt-0.5 font-mono text-base font-black text-[#141E19]">
                          {baResult.summary.totals.dptTotal.toLocaleString("id-ID")}
                        </p>
                      </div>

                      <div className="rounded-[10px] border border-[#141E19]/20 bg-white p-3.5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#7A8881]">Suara Digunakan</p>
                        <p className="mt-0.5 font-mono text-base font-black text-[#141E19]">
                          {baResult.summary.totals.voted.toLocaleString("id-ID")}{" "}
                          <span className="text-xs font-bold text-[#1B7F4E]">
                            (
                            {baResult.summary.totals.dptTotal > 0
                              ? ((baResult.summary.totals.voted / baResult.summary.totals.dptTotal) * 100).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </p>
                      </div>

                      <div className="rounded-[10px] border border-[#141E19]/20 bg-white p-3.5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#7A8881]">Balok Tersegel</p>
                        <p className="mt-0.5 font-mono text-base font-black text-[#141E19]">
                          {baResult.summary.totals.ballots.toLocaleString("id-ID")} Blok
                        </p>
                      </div>

                      <div className="rounded-[10px] border border-[#141E19]/20 bg-white p-3.5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#7A8881]">Integritas Rantai</p>
                        <p className="mt-0.5 font-mono text-base font-black text-[#0F5132]">
                          {baResult.summary.chainValid ? "100% UTUH" : "RUSAK"}
                        </p>
                      </div>
                    </div>

                    {/* 5-Prodi Hash Chain Heads */}
                    <div className="mt-6 rounded-[12px] border-2 border-[#141E19] bg-white p-5 shadow-[3px_3px_0px_#141E19]">
                      <div className="flex items-center justify-between border-b border-[#D8D3C8] pb-3">
                        <div className="flex items-center gap-2">
                          <Layers className="h-5 w-5 text-[#1B7F4E]" aria-hidden="true" />
                          <h3 className="font-display text-base font-black text-[#141E19]">
                            Status 5 Head Rantai Hash Program Studi
                          </h3>
                        </div>
                        <span className="text-[11px] font-bold text-[#556960]">
                          SHA-256 Chained Merkle Head
                        </span>
                      </div>

                      <div className="mt-4 space-y-2.5">
                        {baResult.summary.chains.map((chain) => (
                          <div
                            key={chain.id}
                            className="flex flex-col gap-2 rounded-[8px] border border-[#D8D3C8] bg-[#FDFCF7] p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="rounded-[6px] border border-[#141E19] bg-[#141E19] px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                                {chain.id}
                              </span>
                              <div>
                                <p className="font-bold text-[#141E19]">{chain.name}</p>
                                <p className="text-[11px] text-[#7A8881]">{chain.checked} blok terverifikasi</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] text-[#4A5851] break-all sm:max-w-md">
                                {chain.headHash}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(chain.headHash, chain.id)}
                                aria-label={`Salin head hash rantai ${chain.id}`}
                                className="rounded-[6px] border border-[#141E19] bg-white p-1 hover:bg-[#F6F4EE] focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
                              >
                                {copiedHash === chain.id ? (
                                  <Check className="h-3.5 w-3.5 text-[#1B7F4E]" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-[#4A5851]" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="mt-auto border-t-2 border-[#141E19] bg-[#EFECE4] py-6 px-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-[#556960]">
            © 2026 Smart Pemira Poltek CWE • Berlandaskan UUD IKM & Peraturan KPUM No. 01/2026.
          </p>
          <div className="flex items-center gap-4 text-xs font-bold text-[#141E19]">
            <Link href="/verify" className="underline hover:text-[#1B7F4E]">
              Verifikasi Legasi
            </Link>
            <span>•</span>
            <Link href="/pemilih" className="underline hover:text-[#1B7F4E]">
              Masuk Bilik Suara
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function VerifikasiPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F6F4EE]">
          <Loader2 className="h-8 w-8 animate-spin text-[#1B7F4E]" />
        </div>
      }
    >
      <PortalContent />
    </Suspense>
  );
}
