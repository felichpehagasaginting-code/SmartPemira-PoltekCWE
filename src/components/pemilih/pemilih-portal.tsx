"use client";

// ============================================================
// PORTAL PEMILIH — Pemira 100% Online (BYOD) + Re-vote model Estonia
// Keputusan diskusi 2026-10-20:
//  - Pintu suara tunggal dari device sendiri (HP/laptop), mobile-first
//  - Token dari pos bantuan PPUR (scan QR slip / ketik manual)
//  - Urutan resmi: DPM → BEM → HIMA
//  - Setelah submit: suara tercatat (struk + versi) → pemilih dapat
//    MENGGANTI SUARA sampai pemungutan ditutup, atau KUNCI SUARAKU (final)
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import type { BallotPayload, KioskSession } from "@/lib/types";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  Delete,
  Lock,
  RefreshCcw,
  ReceiptText,
  ShieldCheck,
  Timer,
  ScanLine,
} from "lucide-react";

type Phase = "gate" | "ballot" | "review" | "submitting" | "success" | "locked";
type Selections = Record<string, string | "EMPTY">;

const EMPTY_BOX_COLOR = "#3F4743";
const EMPTY_BOX_TINT = "#ECEAE4";

/** Label stepper mengikuti nomenklatur resmi: DPM → BEM → HIMA */
function stepLabel(category: string, prodiId: string): string {
  if (category === "PRESMA") return "BEM";
  if (category === "DPM") return "DPM";
  return `HIMA ${prodiId}`;
}

function CandidateAvatar({ name, photo, accent, size = 72 }: { name: string; photo?: string | null; accent: string; size?: number }) {
  const initials = name === "KOTAK KOSONG" ? "□" : name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  if (photo) {
    return (
      <div className="shrink-0 overflow-hidden rounded-[10px] border-2 border-[#141E19]" style={{ width: size, height: size }}>
        { }
        <img src={photo} alt={`Foto ${name}`} className="h-full w-full object-cover" />
      </div>
    );
  }
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

/** Label peran resmi per kategori — DPM punya struktur 3 peran (Ketua Umum, Ketua 1, Ketua 2) */
function memberRoles(category: string): { leader: string; vice: string; second?: string } {
  if (category === "DPM") return { leader: "Ketua Umum", vice: "Ketua 1", second: "Ketua 2" };
  if (category === "PRESMA") return { leader: "Presma", vice: "Wakil Presma" };
  return { leader: "Ketua", vice: "Wakil Ketua" };
}

/** Foto anggota kandidat: potret 3:4 + lencana peran + nama */
function MemberPhoto({ name, role, photo, accent }: { name: string; role: string; photo?: string | null; accent: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div
        className="relative w-full overflow-hidden rounded-[10px] border-2 border-[#141E19] shadow-[2px_2px_0px_#141E19]"
        style={{ aspectRatio: "3 / 4", background: accent }}
      >
        {photo ? (
           
          <img src={photo} alt={`Foto ${name} — ${role}`} className="h-full w-full object-cover object-top" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-xl font-extrabold text-white" aria-hidden>
            {name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-[6px] border border-[#141E19]/50 bg-white/95 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide text-[#141E19]">
          {role}
        </span>
      </div>
      <p className="truncate text-[12px] font-bold leading-tight text-[#141E19]" title={name}>
        {name}
      </p>
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
      {/* Foto per peran — DPM: Ketua Umum/Ketua 1/Ketua 2; lainnya: Ketua + Wakil */}
      {candidate.isEmptyBox ? (
        <div className="flex items-center gap-3">
          <CandidateAvatar name={candidate.presidentName} accent={EMPTY_BOX_COLOR} size={56} />
          <div>
            <h3 className="font-display text-base font-bold leading-snug">{candidate.presidentName}</h3>
            {candidate.viceName && <p className="text-xs text-[#4A5851] font-medium">& {candidate.viceName}</p>}
          </div>
        </div>
      ) : (
        <>
          {(() => {
            const roles = memberRoles(candidate.category);
            const members = [
              { role: roles.leader, name: candidate.presidentName, photo: candidate.photoLeaderUrl },
              ...(candidate.viceName ? [{ role: roles.vice, name: candidate.viceName, photo: candidate.photoViceUrl }] : []),
              ...(candidate.secondViceName && roles.second
                ? [{ role: roles.second, name: candidate.secondViceName, photo: candidate.photoSecondViceUrl }]
                : []),
            ];
            return (
              <div className={`grid gap-2.5 ${members.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {members.map((m) => (
                  <MemberPhoto key={m.role} name={m.name} role={m.role} photo={m.photo} accent={color} />
                ))}
              </div>
            );
          })()}
        </>
      )}
      <p className="text-[13px] leading-relaxed text-[#4A5851] line-clamp-2">{candidate.vision}</p>
      {candidate.isEmptyBox && (
        <p className="text-[12px] leading-relaxed text-[#4A5851] italic">
          Pilih kotak ini apabila Anda tidak menyetujui pasangan calon tunggal.
        </p>
      )}
    </button>
  );
}

export function PemilihPortal() {
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("gate");
  const [tokenChars, setTokenChars] = useState<string[]>(Array(6).fill(""));
  const [gateError, setGateError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [session, setSession] = useState<KioskSession | null>(null);
  const [isRevote, setIsRevote] = useState(false);
  const [ballots, setBallots] = useState<BallotPayload[]>([]);
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Selections>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [submittingMsg, setSubmittingMsg] = useState("Mengenkripsi & Mengacak Suara...");
  const [receiptCode, setReceiptCode] = useState<string | null>(null);
  const [voteVersion, setVoteVersion] = useState(1);
  const [lockBusy, setLockBusy] = useState(false);
  const activeTokenRef = useRef<string>("");
  const autoTriedRef = useRef<string>("");

  const current = ballots[step];

  const fillToken = useCallback((token: string) => {
    setTokenChars(token.slice(0, 6).padEnd(6, " ").split("").map((c) => (c === " " ? "" : c)));
  }, []);

  const validateToken = useCallback(async (token: string) => {
    setValidating(true);
    setGateError(null);
    try {
      const res = await fetch("/api/pemilih/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!json.ok) {
        setGateError(json.message ?? "Token tidak sah.");
        return false;
      }
      setSession(json.session);
      setBallots(json.ballots);
      setIsRevote(Boolean(json.isRevote));
      setVoteVersion(json.voteVersion ?? 1);
      setSelections({});
      setStep(0);
      setPhase("ballot");
      return true;
    } catch {
      setGateError("Koneksi ke server bilik suara gagal.");
      return false;
    } finally {
      setValidating(false);
    }
  }, []);

  // Auto-isi & auto-validasi token dari QR (?token=XXXXXX pada slip PPUR)
  useEffect(() => {
    const q = (searchParams.get("token") ?? "").trim().toUpperCase();
    if (q.length === 6 && /^[A-Z0-9]{6}$/.test(q) && autoTriedRef.current !== q) {
      autoTriedRef.current = q;
      fillToken(q);
      activeTokenRef.current = q;
      void validateToken(q);
    }
  }, [searchParams, fillToken, validateToken]);

  /** Hitung mundur TTL token — hanya vote PERTAMA (re-vote tanpa TTL) */
  useEffect(() => {
    if (!session || !session.expiresAt || (phase !== "ballot" && phase !== "review")) return;
    const tick = () => {
      const left = new Date(session.expiresAt!).getTime() - Date.now();
      setRemainingMs(Math.max(0, left));
      if (left <= 0) {
        setPhase("gate");
        setSession(null);
        setBallots([]);
        setSelections({});
        setTokenChars(Array(6).fill(""));
        setGateError("Token kedaluwarsa saat berada di bilik. Minta token baru di pos bantuan PPUR.");
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
    setIsRevote(false);
    activeTokenRef.current = "";
  }, []);

  const submitVote = useCallback(async () => {
    if (!session) return;
    setPhase("submitting");
    setSubmittingMsg(isRevote ? "Mengganti Suara Anda..." : "Mengenkripsi & Mengacak Suara...");
    try {
      const res = await fetch("/api/pemilih/submit", {
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
      setReceiptCode(json.receiptCode ?? null);
      setVoteVersion(json.voteVersion ?? 1);
      setIsRevote(Boolean(json.isRevote));
      setPhase("success");
    } catch {
      setSubmitError("Koneksi gagal saat mengirim suara. Suara tidak terkirim — coba lagi atau hubungi pos bantuan.");
      setPhase("review");
    }
  }, [session, selections, isRevote]);

  const lockVote = useCallback(async () => {
    setLockBusy(true);
    try {
      const res = await fetch("/api/pemilih/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: activeTokenRef.current }),
      });
      const json = await res.json();
      if (json.ok) {
        setPhase("locked");
      } else {
        setGateError(json.message ?? "Gagal mengunci suara.");
      }
    } catch {
      setGateError("Koneksi gagal saat mengunci suara.");
    } finally {
      setLockBusy(false);
    }
  }, []);

  const revoteAgain = useCallback(async () => {
    // Buka bilik ulang dengan token yang sama — suara baru akan MENGGANTI yang lama
    await validateToken(activeTokenRef.current);
  }, [validateToken]);

  /** Keyboard fisik juga didukung (desktop) */
  const pressKey = useCallback((key: string) => {
    setTokenChars((prev) => {
      const idx = prev.findIndex((c) => c === "");
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = key;
      return next;
    });
    setGateError(null);
  }, []);

  const backspace = useCallback(() => {
    setTokenChars((prev) => {
      const next = [...prev];
      const idx = next.findIndex((c) => c === "");
      const target = idx === -1 ? 5 : idx - 1;
      if (target >= 0) next[target] = "";
      return next;
    });
  }, []);

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
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const timeCritical = remainingMs > 0 && remainingMs < 120_000;
  const hasTtl = Boolean(session?.expiresAt);

  const keypadKeys = useMemo(() => {
    const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    return [...digits, ...letters];
  }, []);

  // ============================ GATE ============================
  if (phase === "gate") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[14px] border-2 border-[#141E19] bg-[#1B7F4E] shadow-[4px_4px_0px_#141E19]">
              <Lock className="h-7 w-7 text-white" />
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">
              PORTAL PEMILIH <span className="text-[#1B7F4E]">PEMIRA ONLINE</span>
            </h1>
            <p className="mt-2 text-sm font-medium text-[#4A5851]">
              Pemira Poltek CWE 100% Online — pilih dari perangkatmu sendiri
            </p>
          </div>

          <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-[#D8D3C8] bg-white px-4 py-3">
            <ScanLine className="h-5 w-5 shrink-0 text-[#1B7F4E]" />
            <p className="text-[12.5px] leading-relaxed text-[#4A5851]">
              <strong className="text-[#141E19]">Cara masuk:</strong> scan <strong>QR code</strong> pada slip token dari pos
              bantuan PPUR, atau ketik 6 karakter token di bawah.
            </p>
          </div>

          {/* 6 Kotak Token */}
          <div className="mb-5 flex justify-center gap-2" role="group" aria-label="Kotak input token">
            {tokenChars.map((c, i) => (
              <div
                key={i}
                className={`flex h-[68px] w-[52px] items-center justify-center rounded-[10px] border-2 bg-white font-mono text-2xl font-bold transition-shadow sm:h-[76px] sm:w-[58px] sm:text-3xl ${
                  c ? "border-[#141E19] shadow-[3px_3px_0px_#141E19]" : "border-[#141E19]/40"
                }`}
                aria-label={`Karakter ${i + 1}: ${c || "kosong"}`}
              >
                {c}
              </div>
            ))}
          </div>

          {gateError && (
            <div className="mx-auto mb-4 flex items-start gap-2 rounded-[10px] border-2 border-[#E05A47] bg-[#FDE8E5] px-4 py-3" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#842029]" />
              <p className="text-sm font-semibold text-[#842029]">{gateError}</p>
            </div>
          )}

          {/* Keypad virtual (mobile-first) */}
          <div className="tactile-card mx-auto p-4">
            <div className="grid grid-cols-6 gap-1.5">
              {keypadKeys.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => pressKey(k)}
                  className="h-10 rounded-lg border-2 border-[#141E19] bg-white font-mono text-sm font-bold shadow-[2px_2px_0px_#141E19] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#141E19] active:translate-y-0.5 active:shadow-none sm:h-11"
                >
                  {k}
                </button>
              ))}
              <button
                type="button"
                onClick={backspace}
                className="col-span-2 flex h-10 items-center justify-center gap-1.5 rounded-lg border-2 border-[#141E19] bg-[#F2B705] text-sm font-bold shadow-[2px_2px_0px_#141E19] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none sm:h-11"
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
            🔒 Zero-Knowledge Ballot — token anonim tanpa identitas. Pilihan Anda dipisahkan mutlak dari NIM.
            Bisa ganti suara sampai pemungutan ditutup — suara terakhir yang dihitung.
          </p>
        </div>
      </div>
    );
  }

  // ============================ LOCKED (FINAL) ============================
  if (phase === "locked") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10 text-center">
        <div className="anim-check mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-[#141E19] bg-[#141E19] shadow-[6px_6px_0px_#1B7F4E]">
          <Lock className="h-11 w-11 text-[#FEF5D6]" strokeWidth={3} />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">Suara Anda Terkunci Final</h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-[#4A5851]">
          Terima kasih! Pilihan Anda sudah <strong className="text-[#141E19]">DIKUNCI</strong> dan tidak dapat diganti lagi
          oleh siapa pun. Ini melindungi suara Anda dari tekanan pihak lain.
        </p>

        {receiptCode && (
          <div className="mt-7 w-full max-w-md rounded-[14px] border-2 border-[#141E19] bg-white p-5 text-left shadow-[6px_6px_0px_#141E19]">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-wide">
                <ReceiptText className="h-4 w-4 text-[#1B7F4E]" /> Struk Suara Digital — Versi {voteVersion}
              </p>
              <span className="rounded-full border border-[#141E19] bg-[#FEF5D6] px-2.5 py-0.5 text-[9.5px] font-extrabold text-[#8A5200]">
                TERKUNCI FINAL
              </span>
            </div>
            <p className="mt-3 font-mono text-[26px] font-extrabold tracking-[0.12em] text-[#141E19]">{receiptCode}</p>
            <p className="mt-2 text-[12px] leading-relaxed text-[#4A5851]">
              Simpan kode ini sebagai bukti suara tercatat di rantai hash. Cek kapan pun di Portal Publik → “Cek Struk Suara”.
            </p>
          </div>
        )}

        <button type="button" onClick={resetAll} className="mt-8 rounded-full border-2 border-[#141E19] bg-white px-6 py-2.5 text-sm font-bold shadow-[3px_3px_0px_#141E19] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none">
          Selesai
        </button>
      </div>
    );
  }

  // ============================ SUCCESS ============================
  if (phase === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10 text-center">
        <div className="anim-check mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-[#141E19] bg-[#1B7F4E] shadow-[6px_6px_0px_#141E19]">
          <Check className="h-12 w-12 text-white" strokeWidth={3.5} />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">
          {isRevote ? "Suara Anda Berhasil Diganti" : "Suara Anda Telah Tersimpan Rahasia"}
        </h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-[#4A5851]">
          {isRevote
            ? `Ini versi ke-${voteVersion} dari suaramu. Versi sebelumnya otomatis tidak dihitung — suara TERAKHIR inilah yang sah.`
            : "Terima kasih telah berpartisipasi. Bila berubah pikiran, Anda masih bisa mengganti suara sampai pemungutan ditutup."}
        </p>

        {/* ====== STRUK SUARA + AKSI RE-VOTE / KUNCI ====== */}
        {receiptCode && (
          <div className="mt-7 w-full max-w-md rounded-[14px] border-2 border-[#141E19] bg-white p-5 text-left shadow-[6px_6px_0px_#141E19]">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-wide">
                <ReceiptText className="h-4 w-4 text-[#1B7F4E]" /> Struk Suara Digital
              </p>
              <span className="rounded-full border border-[#1B7F4E] bg-[#E6F4EC] px-2.5 py-0.5 text-[9.5px] font-extrabold text-[#0F5132]">
                VERSI {voteVersion} • TERCATAT ✓
              </span>
            </div>
            <p className="mt-3 font-mono text-[26px] font-extrabold tracking-[0.12em] text-[#141E19]">{receiptCode}</p>
            <p className="mt-2 text-[12px] leading-relaxed text-[#4A5851]">
              <strong className="text-[#141E19]">Foto atau catat kode ini.</strong> Kode membuktikan suara masuk ke rantai
              hash — tanpa membocorkan pilihan. Cek kapan pun di Portal Publik → “Cek Struk Suara”.
            </p>
          </div>
        )}

        <div className="mt-6 grid w-full max-w-md gap-3">
          <button
            type="button"
            onClick={lockVote}
            disabled={lockBusy}
            className="tactile-btn flex h-14 items-center justify-center gap-2 text-base font-extrabold disabled:opacity-70"
          >
            <Lock className="h-5 w-5" />
            {lockBusy ? "MENGUNCI..." : "KUNCI SUARAKU (FINAL)"}
          </button>
          <button
            type="button"
            onClick={revoteAgain}
            disabled={lockBusy}
            className="flex items-center justify-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-white py-3.5 text-sm font-bold shadow-[3px_3px_0px_#141E19] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#141E19] active:translate-y-0.5 active:shadow-none"
          >
            <RefreshCcw className="h-4 w-4" />
            Ganti Suara Saya (Re-vote)
          </button>
        </div>
        <p className="mt-4 max-w-md text-xs leading-relaxed text-[#7A8881]">
          <strong className="text-[#141E19]">Kunci Suaraku</strong> menutup kemampuan ganti suara permanen — cocok bila Anda
          yakin dan ingin melindungi suara dari tekanan pihak lain. Tanpa dikunci, token tetap bisa dipakai ganti suara
          sampai pemungutan ditutup.
        </p>
      </div>
    );
  }

  // ============================ SUBMITTING ============================
  if (phase === "submitting") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-[#D8D3C8] border-t-[#1B7F4E]" />
        <h2 className="font-display text-2xl font-bold">{submittingMsg}</h2>
        <p className="mt-2 text-sm text-[#4A5851]">
          Jangan tutup halaman. Proses ini berjalan dalam satu transaksi atomik.
        </p>
      </div>
    );
  }

  // ============================ REVIEW ============================
  if (phase === "review") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        {isRevote && (
          <div className="mb-5 flex items-center gap-2 rounded-[10px] border-2 border-[#D9822B] bg-[#FDF2E4] px-4 py-3">
            <RefreshCcw className="h-4 w-4 shrink-0 text-[#8A5200]" />
            <p className="text-sm font-bold text-[#8A5200]">
              MODE GANTI SUARA — suara baru akan MENGGANTI suara sebelumnya (tercatat sebagai versi {voteVersion}).
            </p>
          </div>
        )}
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em]">Tinjau Pilihan Anda</h1>
          <p className="mt-2 text-sm font-medium text-[#4A5851]">
            Pastikan ketiga pilihan sudah benar. Setelah terkirim, Anda masih bisa menggantinya nanti.
          </p>
        </div>

        {submitError && (
          <div className="mb-5 flex items-start gap-2 rounded-[10px] border-2 border-[#E05A47] bg-[#FDE8E5] px-4 py-3" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#842029]" />
            <p className="text-sm font-semibold text-[#842029]">{submitError}</p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-3">
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
                    {i + 1}. {b.category === "HIMA" ? `HIMA ${session?.studyProgramId}` : stepLabel(b.category, session?.studyProgramId ?? "")}
                  </span>
                  <span className="font-mono-tabular text-[11px] text-[#7A8881]">{b.stepTitle}</span>
                </div>
                {cand ? (
                  <div className="flex items-center gap-3">
                    <CandidateAvatar name={cand.presidentName} photo={cand.photoLeaderUrl} accent={cand.isEmptyBox ? EMPTY_BOX_COLOR : b.color} size={52} />
                    <div>
                      <p className="font-display text-base font-bold leading-snug">{cand.presidentName}</p>
                      {cand.viceName && <p className="text-xs text-[#4A5851]">& {cand.viceName}</p>}
                      {cand.secondViceName && <p className="text-xs text-[#4A5851]">& {cand.secondViceName}</p>}
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
            <strong className="text-[#141E19]">Zero-Knowledge Ballot:</strong> Pilihan Anda dipisahkan sepenuhnya dari
            identitas NIM Anda — bahkan saat ganti suara sekalipun.
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={submitVote}
            className="tactile-btn flex h-16 w-full max-w-2xl items-center justify-center text-lg font-extrabold tracking-wide"
          >
            {isRevote ? "KIRIM ULANG & GANTI SUARA" : "KIRIM SUARA SEKARANG"}
          </button>
          {hasTtl && (
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
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Banner mode re-vote */}
      {isRevote && (
        <div className="mb-4 flex items-center gap-2 rounded-[10px] border-2 border-[#D9822B] bg-[#FDF2E4] px-4 py-2.5">
          <RefreshCcw className="h-4 w-4 shrink-0 text-[#8A5200]" />
          <p className="text-[13px] font-bold text-[#8A5200]">
            GANTI SUARA — pilihan baru akan menggantikan suara sebelumnya (suara terakhir yang dihitung).
          </p>
        </div>
      )}

      {/* Stepper */}
      <nav aria-label="Tahapan surat suara" className="mb-5">
        <ol className="flex flex-wrap items-center justify-center gap-1.5">
          {ballots.map((b, i) => (
            <li key={b.category} className="flex items-center">
              <span
                className={`flex items-center gap-2 rounded-full border-2 px-3.5 py-2 text-xs font-extrabold tracking-wide transition-colors ${
                  i === step ? "text-white" : i < step ? "text-[#0F5132]" : "text-[#7A8881]"
                }`}
                style={{
                  background: i === step ? b.color : i < step ? "#DCFCE7" : "#FFFFFF",
                  borderColor: "#141E19",
                }}
              >
                {i < step && <Check className="h-3.5 w-3.5" />}
                {i + 1}. {b.category === "HIMA" ? `HIMA ${session.studyProgramId}` : stepLabel(b.category, session.studyProgramId)}
              </span>
              {i < ballots.length - 1 && <span className="mx-1 hidden h-0.5 w-6 bg-[#141E19] sm:block" aria-hidden />}
            </li>
          ))}
        </ol>
      </nav>

      {/* Header banner dinamis per surat suara */}
      <header
        className="anim-slide mb-6 overflow-hidden rounded-[14px] border-2 border-[#141E19] px-5 py-4 text-white sm:px-6 sm:py-5"
        style={{ background: current.color, boxShadow: "4px 4px 0px #141E19" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-90">
              {current.institutionLabel}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-[-0.02em] md:text-3xl">
              Pemilihan {current.stepTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {current.singleCandidateScenario && (
              <span className="rounded-full border-2 border-white/60 bg-white/15 px-3 py-1 text-[11px] font-bold">
                CALON TUNGGAL — KOTAK KOSONG AKTIF
              </span>
            )}
            {hasTtl && (
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
        <div className="grid gap-5 sm:grid-cols-2" aria-label="Calon tunggal dan kotak kosong">
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
        <div className={`grid gap-5 ${current.candidates.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
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
      <div className="mt-7 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="flex h-14 items-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-white px-5 font-bold shadow-[3px_3px_0px_#141E19] transition-all enabled:hover:-translate-y-0.5 enabled:hover:shadow-[4px_4px_0px_#141E19] enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:opacity-40"
        >
          <ChevronLeft className="h-5 w-5" /> <span className="hidden sm:inline">KEMBALI</span>
        </button>

        <p className="hidden text-xs font-semibold text-[#7A8881] sm:block">
          {canProceed ? "Pilihan tersimpan — lanjut" : "Pilih salah satu kartu di atas"}
        </p>

        {step < ballots.length - 1 ? (
          <button
            type="button"
            disabled={!canProceed}
            onClick={() => setStep((s) => s + 1)}
            className="tactile-btn flex h-14 items-center gap-2 px-6 font-extrabold"
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
            className="tactile-btn flex h-14 items-center gap-2 px-6 font-extrabold"
          >
            TINJAU <ArrowRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
