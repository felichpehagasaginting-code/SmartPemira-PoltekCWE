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
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { Skeleton } from "@/components/ui/skeleton";
import type { BallotPayload, CandidateView, KioskSession } from "@/lib/types";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  CircleSlash,
  Copy,
  Delete,
  GraduationCap,
  History,
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

/** Getar halus (mobile) — konfirmasi fisik saat memilih & mengirim. Aman dipanggil di mana saja. */
function buzz(pattern: number | number[] = 10) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* perangkat tanpa vibrator — abaikan */
    }
  }
}

// ---------- Draf pilihan tahan-refresh (localStorage per-token) ----------
// Simpan pilihan yang belum dikirim agar refresh/back-swipe tidak mengulang
// pengisian dari nol. Draf terhapus otomatis setelah suara terkirim/dikunci.
const DRAFT_PREFIX = "pemira-draft-v1-";

type DraftValue = string;

function draftKey(token: string): string {
  return `${DRAFT_PREFIX}${token.toUpperCase()}`;
}

function loadDraft(token: string): Record<string, DraftValue> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(draftKey(token));
    const parsed = raw ? (JSON.parse(raw) as Record<string, DraftValue>) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveDraft(token: string, s: Record<string, DraftValue>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(draftKey(token), JSON.stringify(s));
  } catch {
    /* penyimpanan penuh/diblokir — draf bersifat opsional */
  }
}

function clearDraft(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(token));
  } catch {
    /* noop */
  }
}

/** Label stepper mengikuti nomenklatur resmi: DPM → BEM → HIMA */
function stepLabel(category: string, prodiId: string): string {
  if (category === "PRESMA") return "BEM";
  if (category === "DPM") return "DPM";
  return `HIMA ${prodiId}`;
}

function CandidateAvatar({ name, photo, accent, size = 72 }: { name: string; photo?: string | null; accent: string; size?: number }) {
  const initials = name === "KOTAK KOSONG" || name === "SUARA KOSONG" ? "□" : name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  if (photo) {
    return (
      <div className="shrink-0 overflow-hidden rounded-[10px] border-2 border-[#141E19]" style={{ width: size, height: size }}>
        <Image src={photo} alt={`Foto ${name}`} width={size} height={size} className="h-full w-full object-cover" />
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
           
          <Image
            src={photo}
            alt={`Foto ${name} — ${role}`}
            fill
            sizes="(max-width: 640px) 33vw, 180px"
            className="h-full w-full object-cover object-top"
          />
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
          style={{ background: color }}
        >
          {String(candidate.number).padStart(2, "0")}
        </span>
        <span
          className="rounded-full border border-[#141E19]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: tint }}
        >
          Nomor Urut
        </span>
      </div>
      {/* Foto per peran — DPM: Ketua Umum/Ketua 1/Ketua 2; lainnya: Ketua + Wakil.
          Opsi Suara Kosong BUKAN lewat kartu ini — lihat SuaraKosongCard (terakhir). */}
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
      <p className="text-[13px] leading-relaxed text-[#4A5851] line-clamp-2">{candidate.vision}</p>
    </button>
  );
}

/** Kartu SUARA KOSONG — opsi TERAKHIR di setiap surat suara (semua organisasi).
 *  Gaya netral putus-putus: bukan paslon, tapi pilihan sah yang dihargai sistem. */
function SuaraKosongCard({
  selected,
  onClick,
  disabled,
}: {
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
      className={`relative flex w-full flex-col items-center justify-center gap-3 p-5 text-center transition-all duration-150 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
      style={{
        background: selected ? EMPTY_BOX_TINT : "#FFFFFF",
        borderRadius: 14,
        border: selected ? `3px dashed ${EMPTY_BOX_COLOR}` : "2px dashed #9AA5A0",
        boxShadow: selected ? `6px 6px 0px ${EMPTY_BOX_COLOR}` : "4px 4px 0px #141E19",
        transform: selected ? "translate(-2px,-2px)" : undefined,
        minHeight: 180,
      }}
    >
      {selected && (
        <span
          className="absolute -top-3 right-3 rounded-full border-2 border-[#141E19] px-3 py-0.5 text-[11px] font-extrabold tracking-wide text-white"
          style={{ background: EMPTY_BOX_COLOR }}
        >
          ✓ PILIHAN ANDA
        </span>
      )}
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#141E19]"
        style={{ background: selected ? EMPTY_BOX_COLOR : "#F2F1EC" }}
        aria-hidden
      >
        <CircleSlash className={`h-7 w-7 ${selected ? "text-white" : "text-[#3F4743]"}`} />
      </span>
      <div>
        <h3 className="font-display text-lg font-extrabold tracking-wide text-[#141E19]">SUARA KOSONG</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[#4A5851]">
          Tidak mendukung paslon manapun pada pemilihan ini? Pilih ini — suaramu tetap sah tercatat.
        </p>
      </div>
    </button>
  );
}

// ---------- MODE LATIHAN — bilik simulasi penuh, tanpa server/database ----------
function buildPracticeBallots(): BallotPayload[] {
  const mk = (category: CandidateView["category"], stepTitle: string, color: string, tint: string, orgName: string): BallotPayload => ({
    category,
    stepTitle,
    institutionLabel: "MODE LATIHAN • TIDAK DIHITUNG",
    color,
    tint,
    candidates: ([1, 2] as const).map((i) => ({
      id: `LATIHAN-${category}-${i}`,
      category,
      studyProgramId: null,
      number: i,
      presidentName: `Calon ${orgName} ${i === 1 ? "Satu" : "Dua"} (Simulasi)`,
      viceName: category === "DPM" ? `Ketua 1 Simulasi ${i}` : `Wakil Calon ${i === 1 ? "Satu" : "Dua"} (Simulasi)`,
      secondViceName: category === "DPM" ? `Ketua 2 Simulasi ${i}` : null,
      photoLeaderUrl: null,
      photoViceUrl: null,
      photoSecondViceUrl: null,
      vision:
        "Contoh visi untuk latihan — mewujudkan organisasi yang aktif, kolaboratif, dan benar-benar melayani mahasiswa.",
      missions: ["Contoh program kerja latihan pertama", "Contoh program kerja latihan kedua"],
      isEmptyBox: false,
      photoAccent: color,
    })),
  });
  return [
    mk("DPM", "Latihan — DPM", "#0F766E", "#E2F3F1", "DPM"),
    mk("PRESMA", "Latihan — BEM", "#1B7F4E", "#E6F4EC", "BEM"),
    mk("HIMA", "Latihan — HIMA", "#B45309", "#FBEFDA", "HIMA"),
  ];
}

/** Ekstra struk: tombol salin + QR berisi tautan “Cek Struk Suara” (?cek=KODE) */
function StrukExtras({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(`${window.location.origin}/cek-struk?cek=${encodeURIComponent(code)}`, {
      margin: 1,
      width: 220,
      color: { dark: "#141E19", light: "#FFFFFF" },
    })
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {
        /* QR gagal dibuat — tombol salin tetap tersedia */
      });
    return () => {
      alive = false;
    };
  }, [code]);

  async function copyCode() {
    buzz(10);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard diblokir browser — kode tetap bisa diseleksi manual */
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-dashed border-[#D8D3C8] pt-3">
      <button
        type="button"
        onClick={copyCode}
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-[8px] border-2 border-[#141E19] bg-white px-3.5 text-[12.5px] font-extrabold shadow-[2px_2px_0px_#141E19] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
      >
        {copied ? <Check className="h-4 w-4 text-[#1B7F4E]" /> : <Copy className="h-4 w-4" />}
        {copied ? "TERSALIN!" : "SALIN KODE"}
      </button>
      {qr && (
        <div className="flex items-center gap-3">
          <img
            src={qr}
            alt="QR kode struk — pindai untuk membuka halaman Cek Struk Suara"
            className="h-[74px] w-[74px] rounded-[6px] border-2 border-[#141E19]"
          />
          <p className="max-w-[180px] text-[11px] leading-snug text-[#4A5851]">
            Pindai QR untuk membuka <strong className="text-[#141E19]">Cek Struk Suara</strong> di perangkat mana pun.
          </p>
        </div>
      )}
    </div>
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [practice, setPractice] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
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
      // Pulihkan draf bila halaman sempat ter-refresh di tengah pengisian
      const restored = loadDraft(token);
      const hasDraft = Object.keys(restored).length > 0;
      setSelections(hasDraft ? restored : {});
      setDraftRestored(hasDraft);
      const firstUnfilled = (json.ballots as BallotPayload[]).findIndex((b) => restored[b.category] === undefined);
      setStep(firstUnfilled === -1 ? 0 : firstUnfilled);
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

  // Penjaga tutup/refresh tab — lindungi pilihan yang belum dikirim (di luar mode latihan)
  useEffect(() => {
    if (practice) return;
    if (phase !== "ballot" && phase !== "review") return;
    if (Object.keys(selections).length === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase, selections, practice]);

  /** Pilih kandidat / Suara Kosong — getar halus + simpan draf tahan-refresh */
  const makeSelection = useCallback(
    (category: string, value: string) => {
      buzz(10);
      setSelections((s) => {
        const next = { ...s, [category]: value };
        if (!practice && activeTokenRef.current) saveDraft(activeTokenRef.current, next);
        return next;
      });
    },
    [practice]
  );

  /** MODE LATIHAN — bilik simulasi penuh dengan kandidat contoh, tanpa menyentuh server/DB */
  const startPractice = useCallback(() => {
    buzz(12);
    setPractice(true);
    setGateError(null);
    setSession({
      expiresAt: null,
      tpsName: "Simulasi",
      studyProgramId: "SIM",
      studyProgramName: "Simulasi Latihan",
      himaName: "HIMA Simulasi",
    });
    setBallots(buildPracticeBallots());
    setIsRevote(false);
    setVoteVersion(1);
    setSelections({});
    setStep(0);
    setSubmitError(null);
    setReceiptCode(null);
    setDraftRestored(false);
    setPhase("ballot");
  }, []);

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
    setPractice(false);
    setDraftRestored(false);
    activeTokenRef.current = "";
  }, []);

  const submitVote = useCallback(async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    if (practice) {
      // MODE LATIHAN — simulasi lokal; tidak ada request jaringan sama sekali
      setPhase("submitting");
      setSubmittingMsg("Simulasi Mengenkripsi & Mengacak Suara...");
      window.setTimeout(() => {
        buzz([40, 60, 40]);
        setReceiptCode(null);
        setPhase("success");
        submitLockRef.current = false;
        setIsSubmitting(false);
      }, 700);
      return;
    }
    if (!session) {
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    setPhase("submitting");
    setSubmittingMsg(isRevote ? "Mengganti Suara Anda..." : "Mengenkripsi & Mengacak Suara...");
    try {
      const res = await fetch("/api/pemilih/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: activeTokenRef.current,
          selections: {
            // "EMPTY" = SUARA KOSONG → null (opsi terakhir di setiap surat suara)
            presmaCandidateId: selections["PRESMA"] === "EMPTY" ? null : selections["PRESMA"],
            dpmCandidateId: selections["DPM"] === "EMPTY" ? null : selections["DPM"],
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
      if (activeTokenRef.current) clearDraft(activeTokenRef.current); // suara terkirim — draf selesai
      buzz([40, 60, 40]);
      setPhase("success");
    } catch {
      setSubmitError("Koneksi gagal saat mengirim suara. Suara tidak terkirim — coba lagi atau hubungi pos bantuan.");
      setPhase("review");
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [session, selections, isRevote, practice]);

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
        if (activeTokenRef.current) clearDraft(activeTokenRef.current);
        buzz([30, 50, 30]);
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
    buzz(6);
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
                  className="h-11 rounded-lg border-2 border-[#141E19] bg-white font-mono text-sm font-bold shadow-[2px_2px_0px_#141E19] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#141E19] active:translate-y-0.5 active:shadow-none"
                >
                  {k}
                </button>
              ))}
              <button
                type="button"
                onClick={backspace}
                className="col-span-2 flex h-11 items-center justify-center gap-1.5 rounded-lg border-2 border-[#141E19] bg-[#F2B705] text-sm font-bold shadow-[2px_2px_0px_#141E19] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none sm:h-11"
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

            {/* MODE LATIHAN — bilik simulasi tanpa suara nyata */}
            <div className="mt-3 rounded-[12px] border-2 border-dashed border-[#1B7F4E] bg-[#E6F4EC] p-3">
              <button
                type="button"
                onClick={startPractice}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] border-2 border-[#141E19] bg-white text-[13.5px] font-extrabold tracking-wide text-[#0F5132] shadow-[3px_3px_0px_#141E19] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#141E19] active:translate-y-0.5 active:shadow-none"
              >
                <GraduationCap className="h-5 w-5" aria-hidden />
                MODE LATIHAN — COBA BILIK DULU
              </button>
              <p className="mt-1.5 text-center text-[11px] leading-snug text-[#3D4A43]">
                Simulasi penuh dengan kandidat contoh — <strong>tidak ada suara tercatat</strong>.
              </p>
            </div>
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
            <StrukExtras code={receiptCode} />
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
          {practice ? "Latihan Selesai!" : isRevote ? "Suara Anda Berhasil Diganti" : "Suara Anda Telah Tersimpan Rahasia"}
        </h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-[#4A5851]">
          {practice
            ? "Itulah rasanya memilih di Smart Pemira: pilih paslon di tiap surat suara (atau Suara Kosong), tinjau, kirim — dan suaramu tercatat rahasia."
            : isRevote
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
              <strong className="text-[#141E19]">Salin, foto, atau pindai kode ini.</strong> Kode membuktikan suara masuk
              ke rantai hash — tanpa membocorkan pilihan. Cek kapan pun di Portal Publik → “Cek Struk Suara”.
            </p>
            <StrukExtras code={receiptCode} />
          </div>
        )}

        {practice ? (
          <div className="mt-6 grid w-full max-w-md gap-3">
            <div className="rounded-[12px] border-2 border-dashed border-[#1B7F4E] bg-[#E6F4EC] px-4 py-3 text-[13px] font-bold leading-relaxed text-[#0F5132]">
              Ini MODE LATIHAN — tidak ada suara yang tercatat di sistem. Kembali ke gerbang, lalu masuk dengan token
              aslimu untuk memilih sungguhan.
            </div>
            <button
              type="button"
              onClick={() => {
                setSelections({});
                setStep(0);
                setReceiptCode(null);
                setPhase("ballot");
              }}
              className="flex items-center justify-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-white py-3.5 text-sm font-bold shadow-[3px_3px_0px_#141E19] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#141E19] active:translate-y-0.5 active:shadow-none"
            >
              <RefreshCcw className="h-4 w-4" />
              Latihan Lagi
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="flex items-center justify-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-[#141E19] py-3.5 text-sm font-bold text-white shadow-[3px_3px_0px_#1B7F4E] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#1B7F4E] active:translate-y-0.5 active:shadow-none"
            >
              Selesai Latihan
            </button>
          </div>
        ) : (
          <>
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
              <strong className="text-[#141E19]">Kunci Suaraku</strong> menutup kemampuan ganti suara permanen — cocok bila
              Anda yakin dan ingin melindungi suara dari tekanan pihak lain. Tanpa dikunci, token tetap bisa dipakai ganti
              suara sampai pemungutan ditutup.
            </p>
          </>
        )}
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
            const cand = sel && sel !== "EMPTY" ? b.candidates.find((c) => c.id === sel) : null;
            const isBlank = sel === "EMPTY";
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
                {isBlank ? (
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[10px] border-2 border-[#141E19]"
                      style={{ background: EMPTY_BOX_COLOR }}
                      aria-hidden
                    >
                      <CircleSlash className="h-6 w-6 text-white" />
                    </span>
                    <div>
                      <p className="font-display text-base font-bold leading-snug">SUARA KOSONG</p>
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-[#4A5851]">
                        Tidak memilih paslon manapun
                      </p>
                    </div>
                  </div>
                ) : cand ? (
                  <div className="flex items-center gap-3">
                    <CandidateAvatar name={cand.presidentName} photo={cand.photoLeaderUrl} accent={b.color} size={52} />
                    <div>
                      <p className="font-display text-base font-bold leading-snug">{cand.presidentName}</p>
                      {cand.viceName && <p className="text-xs text-[#4A5851]">& {cand.viceName}</p>}
                      {cand.secondViceName && <p className="text-xs text-[#4A5851]">& {cand.secondViceName}</p>}
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: b.color }}>
                        Nomor Urut {String(cand.number).padStart(2, "0")}
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
            disabled={isSubmitting}
            className="tactile-btn flex h-16 w-full max-w-2xl items-center justify-center text-lg font-extrabold tracking-wide disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                MEMPROSES ENKRIPSI & TRANSAKSI...
              </span>
            ) : isRevote ? (
              "KIRIM ULANG & GANTI SUARA"
            ) : practice ? (
              "KIRIM SIMULASI (LATIHAN)"
            ) : (
              "KIRIM SUARA SEKARANG"
            )}
          </button>
          {hasTtl && (
            <div
              role="timer"
              aria-label="Sisa waktu sesi bilik suara"
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono-tabular text-sm font-bold ${timeCritical ? "border-[#E05A47] bg-[#FDE8E5] text-[#842029] pulse-terra" : "border-[#141E19] bg-white"}`}
            >
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

      {/* Banner MODE LATIHAN — simulasi lokal, tidak menyentuh server */}
      {practice && (
        <div className="mb-4 flex items-center gap-2 rounded-[10px] border-2 border-[#1B7F4E] bg-[#E6F4EC] px-4 py-2.5">
          <GraduationCap className="h-4 w-4 shrink-0 text-[#0F5132]" />
          <p className="text-[13px] font-bold text-[#0F5132]">
            MODE LATIHAN — kandidat contoh; pilihanmu tidak dikirim ke mana pun. Kembali ke gerbang untuk memilih
            sungguhan.
          </p>
        </div>
      )}

      {/* Notifikasi draf dipulihkan (setelah refresh tak sengaja) */}
      {draftRestored && !practice && (
        <div className="mb-4 flex items-center gap-2 rounded-[10px] border-2 border-[#0F766E] bg-[#E2F3F1] px-4 py-2.5">
          <History className="h-4 w-4 shrink-0 text-[#0F766E]" />
          <p className="flex-1 text-[13px] font-bold text-[#0F766E]">
            Draf pilihanmu dipulihkan — lanjutkan dari tempat kamu berhenti.
          </p>
          <button
            type="button"
            onClick={() => setDraftRestored(false)}
            aria-label="Tutup pemberitahuan draf"
            className="rounded-full border border-[#0F766E] px-2 text-[13px] font-extrabold leading-6 text-[#0F766E]"
          >
            ×
          </button>
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
        key={`hdr-${current.category}`}
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
            <span className="rounded-full border-2 border-white/60 bg-white/15 px-3 py-1 text-[11px] font-bold">
              OPSI TERAKHIR: SUARA KOSONG
            </span>
            {hasTtl && (
              <span
                role="timer"
                aria-label="Sisa waktu sesi bilik suara"
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

      {hasTtl && timeCritical && (
        <p role="alert" className="sr-only">
          Sisa waktu sesi kurang dari dua menit — selesaikan pilihan Anda.
        </p>
      )}

      {/* Grid kandidat + SUARA KOSONG — opsi terakhir selalu tersedia di setiap
          surat suara (DPM/BEM/HIMA): pemilih boleh tidak mendukung siapapun. */}
      <div
        key={`grid-${current.category}`}
        className={`anim-slide grid gap-5 ${current.candidates.length + 1 >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
        aria-label="Kandidat dan opsi Suara Kosong"
      >
        {current.candidates.map((c) => (
          <BallotCandidateCard
            key={c.id}
            candidate={c}
            color={current.color}
            tint={current.tint}
            selected={selectionForCurrent === c.id}
            onClick={() => makeSelection(current.category, c.id)}
          />
        ))}
        <SuaraKosongCard
          selected={selectionForCurrent === "EMPTY"}
          onClick={() => makeSelection(current.category, "EMPTY")}
        />
      </div>

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
          {canProceed ? "Pilihan tersimpan — lanjut" : "Pilih paslon atau Suara Kosong"}
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
