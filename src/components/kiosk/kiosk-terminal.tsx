"use client";

// ============================================================
// KIOSK BILIK SUARA — FR-05 (Multi-Ballot Wizard, Tactile UI)
// Alur: Gate Token → 3 Surat Suara → Review → Sukses (auto reset 3s)
// DESIGN.md 8.2: Tactile Neo-Brutalism, banner warna per tahap,
// keypad virtual, countdown TTL terracotta < 2 menit.
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { BallotPayload, KioskSession } from "@/lib/types";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  Delete,
  Droplets,
  Lock,
  ReceiptText,
  ShieldCheck,
  Timer,
} from "lucide-react";

type Phase = "gate" | "ballot" | "review" | "submitting" | "success";
type Selections = Record<string, string | "EMPTY">;

const EMPTY_BOX_COLOR = "#3F4743";
const EMPTY_BOX_TINT = "#ECEAE4";

function CandidateAvatar({ name, accent, size = 72 }: { name: string; accent: string; size?: number }) {
  const initials = name === "KOTAK KOSONG" ? "□" : name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[10px] border-2 border-[#141E19] font-display font-extrabold text-white select-none"
      style={{ width: size, height: size, background: accent, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

/** Kartu kandidat Tactile — terpilih: border & shadow warna kategori + lencana ✓ */
function BallotCandidateCard({
  candidate,
  color,
  tint,
  selected,
  onClick,
  disabled,
}: {
  candidate: BallotPayload["candidates"][number];
  color: string;
  tint: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`relative flex w-full flex-col gap-3 p-5 text-left transition-all duration-150 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
      style={{
        background: "#FFFFFF",
        borderRadius: 14,
        border: selected ? `3px solid ${color}` : "2px solid #141E19",
        boxShadow: selected ? `6px 6px 0px ${color}` : "4px 4px 0px #141E19",
        transform: selected ? "translate(-2px,-2px)" : undefined,
      }}
    >
      {selected && (
        <span
          className="absolute -top-3 right-3 rounded-full border-2 border-[#141E19] px-3 py-0.5 text-[11px] font-extrabold tracking-wide text-white"
          style={{ background: color }}
        >
          ✓ PILIHAN ANDA
        </span>
      )}
      <div className="flex items-center justify-between">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#141E19] font-display text-xl font-extrabold text-white"
          style={{ background: candidate.isEmptyBox ? EMPTY_BOX_COLOR : color }}
        >
          {candidate.isEmptyBox ? "—" : String(candidate.number).padStart(2, "0")}
        </span>
        <span
          className="rounded-full border border-[#141E19]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: tint }}
        >
          Nomor Urut
        </span>
      </div>
      <div className="flex items-center gap-3">
        <CandidateAvatar name={candidate.presidentName} accent={candidate.isEmptyBox ? EMPTY_BOX_COLOR : color} size={56} />
        <div>
          <h3 className="font-display text-base font-bold leading-snug">{candidate.presidentName}</h3>
          {candidate.viceName && <p className="text-xs text-[#4A5851] font-medium">& {candidate.viceName}</p>}
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-[#4A5851] line-clamp-3">{candidate.vision}</p>
      {candidate.isEmptyBox && (
        <p className="text-[12px] leading-relaxed text-[#4A5851] italic">
          Pilih kotak ini apabila Anda tidak menyetujui pasangan calon tunggal.
        </p>
      )}
    </button>
  );
}

export function KioskTerminal() {
  const [phase, setPhase] = useState<Phase>("gate");
  const [tokenChars, setTokenChars] = useState<string[]>(Array(6).fill(""));
  const [gateError, setGateError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [session, setSession] = useState<KioskSession | null>(null);
  const [ballots, setBallots] = useState<BallotPayload[]>([]);
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Selections>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [submittingMsg, setSubmittingMsg] = useState("Mengenkripsi & Mengacak Suara...");
  const [successCountdown, setSuccessCountdown] = useState(3);
  const [receiptCode, setReceiptCode] = useState<string | null>(null); // Rekomendasi #6
  const activeTokenRef = useRef<string>("");

  const current = ballots[step];

  /** Hitung mundur TTL token */
  useEffect(() => {
    if (!session || (phase !== "ballot" && phase !== "review")) return;
    const tick = () => {
      // expiresAt null = sesi re-vote tanpa TTL — tidak pernah kedaluwarsa di bilik.
      const left = session.expiresAt ? new Date(session.expiresAt).getTime() - Date.now() : Number.POSITIVE_INFINITY;
      setRemainingMs(left === Number.POSITIVE_INFINITY ? Number.MAX_SAFE_INTEGER : Math.max(0, left));
      if (left <= 0) {
        setPhase("gate");
        setSession(null);
        setBallots([]);
        setSelections({});
        setTokenChars(Array(6).fill(""));
        setGateError("Token kedaluwarsa saat berada di bilik. Minta token baru di meja PPUR.");
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [session, phase]);

  const resetAll = useCallback(() => {
    setPhase("gate");
    setTokenChars(Array(6).fill(""));
    setGateError(null);
    setSession(null);
    setBallots([]);
    setStep(0);
    setSelections({});
    setSubmitError(null);
    setReceiptCode(null);
    activeTokenRef.current = "";
  }, []);

  const validateToken = useCallback(async (token: string) => {
    setValidating(true);
    setGateError(null);
    try {
      const res = await fetch("/api/kiosk/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!json.ok) {
        setGateError(json.message ?? "Token tidak sah.");
        return;
      }
      setSession(json.session);
      setBallots(json.ballots);
      setSelections({});
      setStep(0);
      setPhase("ballot");
    } catch {
      setGateError("Koneksi ke server bilik suara gagal.");
    } finally {
      setValidating(false);
    }
  }, []);

  /** Suara terkirim → layar sukses 3 detik → auto reset */
  useEffect(() => {
    if (phase !== "success") return;
    setSuccessCountdown(3);
    const t = setInterval(() => {
      setSuccessCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          resetAll();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, resetAll]);

  const submitVote = useCallback(async () => {
    if (!session) return;
    setPhase("submitting");
    setSubmittingMsg("Mengenkripsi & Mengacak Suara...");
    try {
      const res = await fetch("/api/kiosk/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: activeTokenRef.current,
          selections: {
            presmaCandidateId: selections["PRESMA"],
            dpmCandidateId: selections["DPM"],
            himaCandidateId: selections["HIMA"] === "EMPTY" ? null : selections["HIMA"],
          },
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setSubmitError(json.message ?? "Gagal mengirim suara.");
        setPhase("review");
        return;
      }
      setReceiptCode(json.receiptCode ?? null); // Rekomendasi #6: struk suara
      setPhase("success");
    } catch {
      setSubmitError("Koneksi gagal saat mengirim suara. Suara tidak terkirim — hubungi petugas.");
      setPhase("review");
    }
  }, [session, selections]);

  const pressKey = useCallback(
    (key: string) => {
      setTokenChars((prev) => {
        const idx = prev.findIndex((c) => c === "");
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = key;
        return next;
      });
      setGateError(null);
    },
    []
  );

  const backspace = useCallback(() => {
    setTokenChars((prev) => {
      const next = [...prev];
      const idx = next.findIndex((c) => c === "");
      const target = idx === -1 ? 5 : idx - 1;
      if (target >= 0) next[target] = "";
      return next;
    });
  }, []);

  /** Keyboard fisik juga didukung (bilik desktop) */
  useEffect(() => {
    if (phase !== "gate") return;
    const handler = (e: KeyboardEvent) => {
      if (/^[a-zA-Z0-9]$/.test(e.key)) pressKey(e.key.toUpperCase());
      else if (e.key === "Backspace") backspace();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, pressKey, backspace]);

  const fullToken = tokenChars.join("");
  // Sesi re-vote (expiresAt null) tidak punya TTL — timer disembunyikan.
  const noTtl = Boolean(session && !session.expiresAt);
  const minutes = noTtl ? 0 : Math.floor(remainingMs / 60000);
  const seconds = noTtl ? 0 : Math.floor((remainingMs % 60000) / 1000);
  const timeCritical = !noTtl && remainingMs > 0 && remainingMs < 120_000;

  const keypadKeys = useMemo(() => {
    const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    return [...digits, ...letters];
  }, []);

  // ============================ GATE ============================
  if (phase === "gate") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[14px] border-2 border-[#141E19] bg-[#1B7F4E] shadow-[4px_4px_0px_#141E19]">
              <Lock className="h-7 w-7 text-white" />
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">
              BILIK SUARA DIGITAL <span className="text-[#1B7F4E]">SMART PEMIRA</span>
            </h1>
            <p className="mt-2 text-sm font-medium text-[#4A5851]">
              Ikatan Keluarga Mahasiswa Poltek CWE — Masukkan 6 karakter token dari meja PPUR
            </p>
          </div>

          {/* 6 Kotak Token */}
          <div className="mb-6 flex justify-center gap-2.5" role="group" aria-label="Kotak input token">
            {tokenChars.map((c, i) => (
              <div
                key={i}
                className={`flex h-[76px] w-[64px] items-center justify-center rounded-[10px] border-2 bg-white font-mono text-3xl font-bold transition-shadow ${
                  c ? "border-[#141E19] shadow-[3px_3px_0px_#141E19]" : "border-[#141E19]/40"
                }`}
                aria-label={`Karakter ${i + 1}: ${c || "kosong"}`}
              >
                {c}
              </div>
            ))}
          </div>

          {gateError && (
            <div className="mx-auto mb-5 flex max-w-lg items-start gap-2 rounded-[10px] border-2 border-[#E05A47] bg-[#FDE8E5] px-4 py-3" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#842029]" />
              <p className="text-sm font-semibold text-[#842029]">{gateError}</p>
            </div>
          )}

          {/* Keypad virtual */}
          <div className="tactile-card mx-auto max-w-xl p-4">
            <div className="grid grid-cols-6 gap-2">
              {keypadKeys.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => pressKey(k)}
                  className="h-11 rounded-lg border-2 border-[#141E19] bg-white font-mono text-sm font-bold shadow-[2px_2px_0px_#141E19] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#141E19] active:translate-y-0.5 active:shadow-none"
                >
                  {k}
                </button>
              ))}
              <button
                type="button"
                onClick={backspace}
                className="col-span-2 flex h-11 items-center justify-center gap-1.5 rounded-lg border-2 border-[#141E19] bg-[#F2B705] text-sm font-bold shadow-[2px_2px_0px_#141E19] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
                aria-label="Hapus karakter terakhir"
              >
                <Delete className="h-4 w-4" /> HAPUS
              </button>
            </div>

            <button
              type="button"
              disabled={fullToken.length !== 6 || validating}
              onClick={() => {
                activeTokenRef.current = fullToken;
                validateToken(fullToken);
              }}
              className="tactile-btn mt-4 flex h-14 w-full items-center justify-center gap-2 text-base font-extrabold tracking-wide"
            >
              {validating ? "MEMVERIFIKASI TOKEN..." : "MASUK BILIK SUARA"}
              {!validating && <ArrowRight className="h-5 w-5" />}
            </button>
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-[#7A8881]">
            🔒 Zero-Knowledge Ballot — token sekali pakai (TTL 10 menit). Pilihan Anda dipisahkan
            mutlak dari identitas NIM.
          </p>
        </div>
      </div>
    );
  }

  // ============================ SUCCESS ============================
  if (phase === "success") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-8 text-center">
        <div className="anim-check mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-[#141E19] bg-[#1B7F4E] shadow-[6px_6px_0px_#141E19]">
          <Check className="h-12 w-12 text-white" strokeWidth={3.5} />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">
          Suara Anda Telah Tersimpan Rahasia
        </h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-[#4A5851]">
          Terima kasih telah berpartisipasi dalam Pemira Poltek CWE. Token Anda kini dihanguskan
          dan tidak dapat digunakan lagi.
        </p>

        {/* ====== STRUK SUARA — Rekomendasi #6 (E2E Verifiability) ====== */}
        {receiptCode && (
          <div className="mt-7 w-full max-w-md rounded-[14px] border-2 border-[#141E19] bg-white p-5 text-left shadow-[6px_6px_0px_#141E19]">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-wide">
                <ReceiptText className="h-4 w-4 text-[#1B7F4E]" /> Struk Suara Digital
              </p>
              <span className="rounded-full border border-[#1B7F4E] bg-[#E6F4EC] px-2.5 py-0.5 text-[9.5px] font-extrabold text-[#0F5132]">TERCATAT ✓</span>
            </div>
            <p className="mt-3 font-mono text-[26px] font-extrabold tracking-[0.12em] text-[#141E19]">{receiptCode}</p>
            <p className="mt-2 text-[12px] leading-relaxed text-[#4A5851]">
              <strong className="text-[#141E19]">Foto atau catat kode ini.</strong> Kode membuktikan suara Anda masuk ke kotak suara digital
              (hash chain) — tanpa membocorkan pilihan Anda kepada siapa pun. Cek kapan pun di Portal Publik → “Cek Struk Suara”.
            </p>
          </div>
        )}

        <div className="tactile-card mt-6 flex items-center gap-3 px-5 py-4">
          <Droplets className="h-6 w-6 text-[#E05A47]" />
          <p className="text-sm font-bold">
            Jangan lupa <span className="text-[#E05A47]">mencelupkan jari ke tinta</span> di meja keluar TPS
          </p>
        </div>
        <div className="mt-8 w-full max-w-sm">
          <div className="mb-2 flex justify-between text-xs font-semibold text-[#4A5851]">
            <span>Kembali ke layar awal otomatis</span>
            <span className="font-mono-tabular">{successCountdown}s</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full border-2 border-[#141E19] bg-white">
            <div
              className="h-full bg-[#1B7F4E] transition-all duration-1000 ease-linear"
              style={{ width: `${(successCountdown / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ============================ SUBMITTING ============================
  if (phase === "submitting") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-[#D8D3C8] border-t-[#1B7F4E]" />
        <h2 className="font-display text-2xl font-bold">{submittingMsg}</h2>
        <p className="mt-2 text-sm text-[#4A5851]">
          Jangan tutup atau sentuh layar. Proses ini berjalan dalam satu transaksi atomik.
        </p>
      </div>
    );
  }

  // ============================ REVIEW ============================
  if (phase === "review") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em]">Tinjau Pilihan Anda</h1>
          <p className="mt-2 text-sm font-medium text-[#4A5851]">
            Pastikan ketiga pilihan sudah benar — suara yang terkirim tidak dapat diubah.
          </p>
        </div>

        {submitError && (
          <div className="mb-5 flex items-start gap-2 rounded-[10px] border-2 border-[#E05A47] bg-[#FDE8E5] px-4 py-3" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#842029]" />
            <p className="text-sm font-semibold text-[#842029]">{submitError}</p>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-3">
          {ballots.map((b, i) => {
            const sel = selections[b.category];
            const cand = b.candidates.find((c) => (sel === "EMPTY" ? c.isEmptyBox : c.id === sel));
            return (
              <div key={b.category} className="tactile-card flex flex-col p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className="rounded-full border-2 border-[#141E19] px-3 py-1 text-[11px] font-extrabold text-white"
                    style={{ background: b.color }}
                  >
                    {i + 1}. {b.category === "HIMA" ? "HIMA PRODI" : b.category}
                  </span>
                  <span className="font-mono-tabular text-[11px] text-[#7A8881]">{b.stepTitle}</span>
                </div>
                {cand ? (
                  <div className="flex items-center gap-3">
                    <CandidateAvatar name={cand.presidentName} accent={cand.isEmptyBox ? EMPTY_BOX_COLOR : b.color} size={52} />
                    <div>
                      <p className="font-display text-base font-bold leading-snug">{cand.presidentName}</p>
                      {cand.viceName && <p className="text-xs text-[#4A5851]">& {cand.viceName}</p>}
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: b.color }}>
                        {cand.isEmptyBox ? "Kotak Kosong — Tidak Setuju" : `Nomor Urut ${String(cand.number).padStart(2, "0")}`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-[#842029]">Belum memilih</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setStep(i);
                    setSubmitError(null);
                    setPhase("ballot");
                  }}
                  className="mt-4 w-full rounded-[10px] border-2 border-[#141E19] bg-white py-2.5 text-sm font-bold shadow-[3px_3px_0px_#141E19] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#141E19] active:translate-y-0.5 active:shadow-none"
                >
                  Ubah Pilihan
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-[10px] border border-[#D8D3C8] bg-[#FFFFFF] px-4 py-3.5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#1B7F4E]" />
          <p className="text-[13px] leading-relaxed text-[#4A5851]">
            <strong className="text-[#141E19]">Zero-Knowledge Ballot:</strong> Pilihan Anda dienkripsi
            secara acak dan dipisahkan sepenuhnya dari identitas NIM Anda.
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={submitVote}
            className="tactile-btn flex h-16 w-full max-w-2xl items-center justify-center text-lg font-extrabold tracking-wide"
          >
            KIRIM SUARA SEKARANG
          </button>
          {!noTtl && (
            <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono-tabular text-sm font-bold ${timeCritical ? "border-[#E05A47] bg-[#FDE8E5] text-[#842029] pulse-terra" : "border-[#141E19] bg-white"}`}>
              <Timer className="h-4 w-4" />
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================ BALLOT WIZARD ============================
  if (!session || !current) return <div className="p-10"><Skeleton className="h-64 w-full" /></div>;

  const selectionForCurrent = selections[current.category];
  const canProceed = selectionForCurrent !== undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Stepper */}
      <nav aria-label="Tahapan surat suara" className="mb-5">
        <ol className="flex items-center justify-center gap-0">
          {ballots.map((b, i) => (
            <li key={b.category} className="flex items-center">
              <span
                className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-xs font-extrabold tracking-wide transition-colors ${
                  i === step ? "text-white" : i < step ? "text-[#0F5132]" : "text-[#7A8881]"
                }`}
                style={{
                  background: i === step ? b.color : i < step ? "#DCFCE7" : "#FFFFFF",
                  borderColor: "#141E19",
                }}
              >
                {i < step && <Check className="h-3.5 w-3.5" />}
                {i + 1}. {b.category === "HIMA" ? `HIMA ${session.studyProgramId}` : b.category}
              </span>
              {i < ballots.length - 1 && <span className="mx-1 hidden h-0.5 w-8 bg-[#141E19] sm:block" aria-hidden />}
            </li>
          ))}
        </ol>
      </nav>

      {/* Header banner dinamis per surat suara */}
      <header
        className="anim-slide mb-6 overflow-hidden rounded-[14px] border-2 border-[#141E19] px-6 py-5 text-white"
        style={{ background: current.color, boxShadow: "4px 4px 0px #141E19" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-90">
              Surat Suara {step + 1} dari 3 — {current.institutionLabel}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-[-0.02em] md:text-3xl">
              Pemilihan {current.stepTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {current.singleCandidateScenario && (
              <span className="rounded-full border-2 border-white/60 bg-white/15 px-3 py-1 text-[11px] font-bold">
                SKENARIO CALON TUNGGAL — KOTAK KOSONG AKTIF
              </span>
            )}
            {!noTtl && (
              <span
                className={`flex items-center gap-1.5 rounded-full border-2 border-[#141E19] px-3 py-1.5 font-mono-tabular text-sm font-bold ${
                  timeCritical ? "bg-[#FDE8E5] text-[#842029] pulse-terra" : "bg-[#FEF5D6] text-[#8A5200]"
                }`}
              >
                <Timer className="h-4 w-4" />
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Grid kandidat — HUKUM 3: calon tunggal membagi 50:50 dengan Kotak Kosong */}
      {current.singleCandidateScenario ? (
        <div className="grid gap-5 md:grid-cols-2" aria-label="Calon tunggal dan kotak kosong">
          <BallotCandidateCard
            candidate={current.candidates.find((c) => !c.isEmptyBox)!}
            color={current.color}
            tint={current.tint}
            selected={selectionForCurrent === current.candidates.find((c) => !c.isEmptyBox)?.id}
            onClick={() => setSelections((s) => ({ ...s, [current.category]: current.candidates.find((c) => !c.isEmptyBox)!.id }))}
          />
          <BallotCandidateCard
            candidate={current.candidates.find((c) => c.isEmptyBox)!}
            color={EMPTY_BOX_COLOR}
            tint={EMPTY_BOX_TINT}
            selected={selectionForCurrent === "EMPTY" || selections[current.category] === current.candidates.find((c) => c.isEmptyBox)?.id}
            onClick={() => setSelections((s) => ({ ...s, [current.category]: "EMPTY" }))}
          />
        </div>
      ) : (
        <div className={`grid gap-5 ${current.candidates.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {current.candidates.map((c) => (
            <BallotCandidateCard
              key={c.id}
              candidate={c}
              color={current.color}
              tint={current.tint}
              selected={selectionForCurrent === c.id}
              onClick={() => setSelections((s) => ({ ...s, [current.category]: c.id }))}
            />
          ))}
        </div>
      )}

      {/* Navigasi wizard */}
      <div className="mt-7 flex items-center justify-between gap-4">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="flex h-14 items-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-white px-6 font-bold shadow-[3px_3px_0px_#141E19] transition-all enabled:hover:-translate-y-0.5 enabled:hover:shadow-[4px_4px_0px_#141E19] enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:opacity-40"
        >
          <ChevronLeft className="h-5 w-5" /> KEMBALI
        </button>

        <p className="hidden text-xs font-semibold text-[#7A8881] sm:block">
          {canProceed ? "Pilihan tersimpan — lanjut ke surat suara berikutnya" : "Pilih salah satu kartu di atas"}
        </p>

        {step < ballots.length - 1 ? (
          <button
            type="button"
            disabled={!canProceed}
            onClick={() => setStep((s) => s + 1)}
            className="tactile-btn flex h-14 items-center gap-2 px-7 font-extrabold"
          >
            SURAT SUARA {step + 2} <ArrowRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!canProceed}
            onClick={() => {
              setSubmitError(null);
              setPhase("review");
            }}
            className="tactile-btn flex h-14 items-center gap-2 px-7 font-extrabold"
          >
            TINJAU PILIHAN <ArrowRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
