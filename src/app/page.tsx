"use client";

// ============================================================
// SHELL UTAMA SMART PEMIRA — LOGIN-FIRST + ROUTING RBAC (PRD Bab 3)
// Alur: / → Login page (gerbang tunggal) → login sukses →
// diarahkan ke terminal sesuai peran → navigasi hanya menampilkan
// modul yang diizinkan peran tersebut. Endpoint tetap divalidasi
// server-side (requireRole → 401/403) sebagai lapisan kedua.
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { KioskTerminal } from "@/components/kiosk/kiosk-terminal";
import { KpumDashboard } from "@/components/kpum/kpum-dashboard";
import { LoginScreen, type DemoAccount } from "@/components/auth/login-screen";
import { PanwasluMonitor } from "@/components/pleno/panwaslu-monitor";
import { PublicPortal } from "@/components/public-portal/public-portal";
import { PpurDesk } from "@/components/ppur/ppur-desk";
import { APP_CONSTANTS } from "@/lib/constants/election";
import { Ban, Landmark, LogOut, MonitorCheck, ScanBarcode, ShieldHalf, Vote } from "lucide-react";

type ModuleKey = "public" | "ppur" | "kiosk" | "kpum" | "panwaslu";

interface SessionInfo {
  username: string;
  role: string;
  fullName: string;
  tpsId: string | null;
}

// ---- Matriks RBAC (PRD Bab 3) ----
// Terminal publik/token (public, kiosk) terbuka bagi semua sesi login.
const MODULE_ROLES: Partial<Record<ModuleKey, string[]>> = {
  ppur: ["PPUR", "ITPO"],
  kpum: ["KPUM", "ITPO"],
  panwaslu: ["PANWASLU", "SAKSI", "KPUM", "ITPO"],
};

// Terminal awal (landing) setelah login, sesuai peran.
const ROLE_HOME: Record<string, ModuleKey> = {
  ITPO: "public",
  KPUM: "kpum",
  PPUR: "ppur",
  PANWASLU: "panwaslu",
  SAKSI: "panwaslu",
};

const DEMO_ACCOUNTS: (DemoAccount & { landing: string })[] = [
  { username: "itpo", password: "itpo123", role: "ITPO", fullName: "Rizky Ananda — Koordinator Tim ITPO", landing: "Portal Publik (semua modul)" },
  { username: "kpum", password: "kpum123", role: "KPUM", fullName: "Alifia Rahmadani — Ketua KPUM", landing: "Dashboard KPUM" },
  { username: "ppur", password: "ppur123", role: "PPUR", fullName: "Bagas Setiawan — Petugas Meja PPUR TPS 01", landing: "Meja Registrasi PPUR" },
  { username: "panwaslu", password: "panwaslu123", role: "PANWASLU", fullName: "Citra Amelia — Ketua Panwaslu", landing: "Monitor Panwaslu & Pleno" },
  { username: "saksi01", password: "saksi123", role: "SAKSI", fullName: "Dimas Prakoso — Saksi Paslon Presma 01", landing: "Monitor Panwaslu (baca)" },
];

const MODULES: Array<{ key: ModuleKey; label: string; short: string; icon: React.ReactNode; dark: boolean }> = [
  { key: "public", label: "Portal Publik", short: "PUBLIK", icon: <Landmark className="h-4 w-4" />, dark: false },
  { key: "ppur", label: "Meja Registrasi PPUR", short: "PPUR", icon: <ScanBarcode className="h-4 w-4" />, dark: false },
  { key: "kiosk", label: "Kiosk Bilik Suara", short: "KIOSK", icon: <Vote className="h-4 w-4" />, dark: false },
  { key: "kpum", label: "Dashboard KPUM", short: "KPUM", icon: <MonitorCheck className="h-4 w-4" />, dark: false },
  { key: "panwaslu", label: "Monitor Panwaslu & Pleno", short: "PANWASLU", icon: <ShieldHalf className="h-4 w-4" />, dark: true },
];

export default function Home() {
  const [active, setActive] = useState<ModuleKey>("public");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const landedFor = useRef<string | null>(null); // agar auto-landing hanya sekali per login
  const current = MODULES.find((m) => m.key === active)!;

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const body = await res.json();
      setSession(body.authenticated ? (body.operator as SessionInfo) : null);
    } catch {
      setSession(null);
    } finally {
      setSessionLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  // ---- Routing RBAC: setelah login, arahkan ke terminal sesuai peran ----
  useEffect(() => {
    if (!session) {
      landedFor.current = null;
      return;
    }
    if (landedFor.current === session.username) return;
    landedFor.current = session.username;
    const allowed = (k: ModuleKey): boolean => {
      const req = MODULE_ROLES[k];
      return !req || req.includes(session.role);
    };
    const home = ROLE_HOME[session.role] ?? "public";
    setActive(allowed(home) ? home : "public");
  }, [session]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await refreshSession();
    setActive("public");
  }

  // ============ BELUM LOGIN → LOGIN PAGE (GERBANG UTAMA) ============
  if (!sessionLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141E19]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-[14px] border-2 border-[#F4F1EA] bg-[#1B7F4E]">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 21c4.97 0 9-4.03 9-9V4.5c0-.83-.67-1.5-1.5-1.5H12c-4.97 0-9 4.03-9 9s4.03 9 9 9Z" />
              <path d="m9 11.5 2 2 4-4" />
            </svg>
          </div>
          <p className="font-display text-lg font-extrabold tracking-[-0.02em] text-[#F4F1EA]">SMART PEMIRA</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9EB0A7]">Memuat sesi…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen accounts={DEMO_ACCOUNTS} onLogin={refreshSession} />;
  }

  // ============ SUDAH LOGIN → TERMINAL SESUAI PERAN ============
  const visibleModules = MODULES.filter((m) => {
    const req = MODULE_ROLES[m.key];
    return !req || req.includes(session.role);
  });
  const hasAccess = !MODULE_ROLES[active] || MODULE_ROLES[active]!.includes(session.role);

  const roleBadgeColor =
    session.role === "KPUM"
      ? "bg-[#0F766E]"
      : session.role === "PPUR"
        ? "bg-[#1B7F4E]"
        : session.role === "PANWASLU"
          ? "bg-[#3F4743]"
          : session.role === "SAKSI"
            ? "bg-[#2B50AA]"
            : "bg-[#E05A47]";

  return (
    <div className={`flex min-h-screen flex-col ${current.dark ? "bg-[#0D1512]" : "bg-[#F6F4EE]"}`}>
      {/* ================= NAVBAR ================= */}
      <header
        className={`sticky top-0 z-40 border-b ${current.dark ? "border-[#263B33] bg-[#0D1512]/95" : "border-[#D8D3C8] bg-[#F6F4EE]/95"} backdrop-blur`}
      >
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 md:px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] shadow-[3px_3px_0px_#141E19]">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 21c4.97 0 9-4.03 9-9V4.5c0-.83-.67-1.5-1.5-1.5H12c-4.97 0-9 4.03-9 9s4.03 9 9 9Z" />
                <path d="m9 11.5 2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className={`font-display text-lg font-extrabold leading-none tracking-[-0.02em] ${current.dark ? "text-[#F4F1EA]" : "text-[#141E19]"}`}>
                SMART PEMIRA
              </p>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${current.dark ? "text-[#9EB0A7]" : "text-[#7A8881]"}`}>
                Poltek CWE • IKM
              </p>
            </div>
          </div>

          {/* Module tabs — hanya modul yang diizinkan peran */}
          <nav className="nice-scroll flex flex-1 items-center gap-2 overflow-x-auto" aria-label="Terminal modul sesuai kewenangan peran">
            {visibleModules.map((m) => {
              const isActive = m.key === active;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setActive(m.key)}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex shrink-0 items-center gap-2 rounded-full border-2 px-4 py-2 text-[12px] font-extrabold tracking-wide transition-all ${
                    isActive
                      ? "border-[#141E19] bg-[#141E19] text-white shadow-[3px_3px_0px_#1B7F4E]"
                      : current.dark
                        ? "border-[#263B33] bg-[#15221D] text-[#9EB0A7] hover:border-[#39564A] hover:text-[#F4F1EA]"
                        : "border-[#D8D3C8] bg-white text-[#4A5851] hover:border-[#141E19] hover:text-[#141E19]"
                  }`}
                >
                  {m.icon}
                  <span className="hidden sm:inline">{m.label}</span>
                  <span className="sm:hidden">{m.short}</span>
                </button>
              );
            })}
          </nav>

          {/* Session badge */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 rounded-full border-2 border-[#141E19] px-3 py-1.5 ${current.dark ? "bg-[#15221D]" : "bg-white"}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full font-display text-[10px] font-extrabold text-white ${roleBadgeColor}`} aria-hidden>
                {session.fullName.slice(0, 1).toUpperCase()}
              </span>
              <div className="leading-tight">
                <p className={`text-[11px] font-extrabold ${current.dark ? "text-[#F4F1EA]" : "text-[#141E19]"}`}>{session.fullName.split(" — ")[0]}</p>
                <p className="font-mono text-[9.5px] font-bold tracking-[0.08em] text-[#1B7F4E]">{session.role}{session.tpsId ? ` • ${session.tpsId}` : ""}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className={`flex h-9 items-center gap-1.5 rounded-full border-2 border-[#141E19] px-3 text-[11px] font-extrabold transition-all hover:-translate-y-0.5 ${
                current.dark ? "bg-[#15221D] text-[#F4F1EA] shadow-[2px_2px_0px_#39564A]" : "bg-white text-[#141E19] shadow-[2px_2px_0px_#141E19]"
              } active:translate-y-0`}
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              KELUAR
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-6 md:py-8">
        {active === "public" && (
          <>
            <div className="mb-6 flex items-start gap-2.5 rounded-[10px] border border-[#D8D3C8] bg-white px-4 py-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F2B705] text-[11px] font-extrabold text-[#141E19]">i</span>
              <p className="text-[13px] leading-relaxed text-[#4A5851]">
                Anda masuk sebagai <strong className="text-[#141E19]">{session.role}</strong> — navigasi di atas hanya menampilkan terminal sesuai kewenangan Anda.
                Demo end-to-end: login <strong className="text-[#141E19]">PPUR</strong> → terbitkan token → pilih di <strong className="text-[#141E19]">Kiosk</strong> (token pemilih) →
                login <strong className="text-[#141E19]">KPUM</strong> (Pleno Unlock) → login <strong className="text-[#141E19]">PANWASLU</strong> untuk audit live.
              </p>
            </div>
            <PublicPortal />
          </>
        )}

        {active === "ppur" &&
          (hasAccess ? (
            <>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Meja Registrasi PPUR</h1>
                  <p className="mt-1 text-sm text-[#4A5851]">
                    Verifikasi identitas mahasiswa (KTM/KRS), lalu terbitkan token bilik suara sekali pakai — TTL 10 menit.
                  </p>
                </div>
                <span className="rounded-full border border-[#141E19] bg-[#E6F4EC] px-3 py-1 font-mono text-[11px] font-bold text-[#0F5132]">
                  SESI AKTIF: {session.fullName.split(" — ")[0]} ({session.role})
                </span>
              </div>
              <PpurDesk />
            </>
          ) : (
            <AccessDenied role={session.role} />
          ))}

        {active === "kiosk" && <KioskTerminal />}

        {active === "kpum" &&
          (hasAccess ? (
            <>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Dashboard Komisioner KPUM</h1>
                  <p className="mt-1 text-sm text-[#4A5851]">
                    Manajemen DPT &amp; kandidat, kontrol tahapan, Pleno Unlocking, dan Berita Acara Model C-KWE.
                  </p>
                </div>
                <span className="rounded-full border border-[#141E19] bg-[#E6F4EC] px-3 py-1 font-mono text-[11px] font-bold text-[#0F5132]">
                  SESI AKTIF: {session.fullName.split(" — ")[0]} ({session.role})
                  {session.role !== "KPUM" && " • Pleno Unlock: khusus KPUM"}
                </span>
              </div>
              <KpumDashboard operatorRole={session.role} />
            </>
          ) : (
            <AccessDenied role={session.role} />
          ))}

        {active === "panwaslu" &&
          (hasAccess ? (
            <PanwasluMonitor operatorRole={session.role} />
          ) : (
            <AccessDenied role={session.role} dark />
          ))}
      </main>

      {/* ================= FOOTER (sticky) ================= */}
      <footer className={`mt-auto border-t ${current.dark ? "border-[#263B33] bg-[#0D1512]" : "border-[#D8D3C8] bg-[#F6F4EE]"}`}>
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
          <p className={`text-[12px] font-semibold ${current.dark ? "text-[#9EB0A7]" : "text-[#7A8881]"}`}>
            {APP_CONSTANTS.appName} — {APP_CONSTANTS.institute} • {APP_CONSTANTS.legalBasis}
          </p>
          <p className={`flex items-center gap-2 text-[12px] ${current.dark ? "text-[#64786F]" : "text-[#C9C3B6]"}`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${current.dark ? "bg-[#28A769]" : "bg-[#1B7F4E]"}`} />
            Zero-Knowledge Ballot Architecture • Login-First RBAC
          </p>
        </div>
      </footer>
    </div>
  );
}

// Kartu akses ditolak (lapisan UI; server tetap menolak 403 di API)
function AccessDenied({ role, dark = false }: { role: string; dark?: boolean }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 ${dark ? "border-[#39564A] bg-[#15221D] text-[#E05A47]" : "border-[#141E19] bg-[#FDE8E5] text-[#E05A47]"}`}>
        <Ban className="h-7 w-7" aria-hidden />
      </div>
      <h2 className={`mt-4 font-display text-xl font-extrabold ${dark ? "text-[#F4F1EA]" : "text-[#141E19]"}`}>Akses Ditolak (403)</h2>
      <p className={`mt-2 text-sm leading-relaxed ${dark ? "text-[#9EB0A7]" : "text-[#4A5851]"}`}>
        Peran <span className="font-mono font-bold">{role}</span> tidak memiliki kewenangan pada modul ini sesuai matriks RBAC PRD Bab 3.
        Silakan keluar dan login dengan akun petugas yang berwenang.
      </p>
    </div>
  );
}
