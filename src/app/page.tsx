"use client";

// ============================================================
// SHELL UTAMA SMART PEMIRA — Simulator Terminal Terpadu (RBAC-aware)
// Satu aplikasi, 5 terminal sesuai arsitektur PRD:
// Portal Publik | Meja PPUR | Kiosk Bilik Suara | Dashboard KPUM | Monitor Panwaslu
// RBAC (PRD Bab 3): terminal sensitif digerbangi sesi operator (cookie httpOnly HMAC).
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { LoginGate, type DemoAccount } from "@/components/auth/login-gate";
import { KioskTerminal } from "@/components/kiosk/kiosk-terminal";
import { KpumDashboard } from "@/components/kpum/kpum-dashboard";
import { PanwasluMonitor } from "@/components/pleno/panwaslu-monitor";
import { PublicPortal } from "@/components/public-portal/public-portal";
import { PpurDesk } from "@/components/ppur/ppur-desk";
import { APP_CONSTANTS } from "@/lib/constants/election";
import { Landmark, LogOut, MonitorCheck, ScanBarcode, ShieldHalf, Vote } from "lucide-react";

type ModuleKey = "public" | "ppur" | "kiosk" | "kpum" | "panwaslu";

interface SessionInfo {
  username: string;
  role: string;
  fullName: string;
  tpsId: string | null;
}

// Matriks akses terminal (PRD Bab 3). null = publik / token pemilih.
const MODULE_ROLES: Partial<Record<ModuleKey, string[]>> = {
  ppur: ["PPUR", "ITPO"],
  kpum: ["KPUM", "ITPO"],
  panwaslu: ["PANWASLU", "SAKSI", "KPUM", "ITPO"],
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: "itpo", password: "itpo123", role: "ITPO", fullName: "Rizky Ananda — Koordinator Tim ITPO" },
  { username: "kpum", password: "kpum123", role: "KPUM", fullName: "Alifia Rahmadani — Ketua KPUM" },
  { username: "ppur", password: "ppur123", role: "PPUR", fullName: "Bagas Setiawan — Petugas Meja PPUR TPS 01" },
  { username: "panwaslu", password: "panwaslu123", role: "PANWASLU", fullName: "Citra Amelia — Ketua Panwaslu" },
  { username: "saksi01", password: "saksi123", role: "SAKSI", fullName: "Dimas Prakoso — Saksi Paslon Presma 01" },
];

const MODULES: Array<{ key: ModuleKey; label: string; short: string; icon: React.ReactNode; dark: boolean; locked: boolean }> = [
  { key: "public", label: "Portal Publik", short: "PUBLIK", icon: <Landmark className="h-4 w-4" />, dark: false, locked: false },
  { key: "ppur", label: "Meja Registrasi PPUR", short: "PPUR", icon: <ScanBarcode className="h-4 w-4" />, dark: false, locked: true },
  { key: "kiosk", label: "Kiosk Bilik Suara", short: "KIOSK", icon: <Vote className="h-4 w-4" />, dark: false, locked: false },
  { key: "kpum", label: "Dashboard KPUM", short: "KPUM", icon: <MonitorCheck className="h-4 w-4" />, dark: false, locked: true },
  { key: "panwaslu", label: "Monitor Panwaslu & Pleno", short: "PANWASLU", icon: <ShieldHalf className="h-4 w-4" />, dark: true, locked: true },
];

export default function Home() {
  const [active, setActive] = useState<ModuleKey>("public");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await refreshSession();
    setActive("public");
  }

  // ---- RBAC gate evaluation ----
  const requiredRoles = MODULE_ROLES[active];
  const hasAccess =
    !requiredRoles || (sessionLoaded && !!session && requiredRoles.includes(session.role));

  const roleBadgeColor =
    session?.role === "KPUM"
      ? "bg-[#0F766E]"
      : session?.role === "PPUR"
        ? "bg-[#1B7F4E]"
        : session?.role === "PANWASLU"
          ? "bg-[#3F4743]"
          : session?.role === "SAKSI"
            ? "bg-[#2B50AA]"
            : "bg-[#E05A47]";

  return (
    <div className={`flex min-h-screen flex-col ${current.dark ? "bg-[#0D1512]" : "bg-[#F6F4EE]"}`}>
      {/* ================= NAVBAR ================= */}
      <header
        className={`sticky top-0 z-40 border-b no-print ${
          current.dark ? "border-[#263B33] bg-[#0D1512]/95" : "border-[#D8D3C8] bg-[#F6F4EE]/95"
        } backdrop-blur`}
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

          {/* Module tabs */}
          <nav className="nice-scroll flex flex-1 items-center gap-2 overflow-x-auto" aria-label="Pilih terminal modul">
            {MODULES.map((m) => {
              const isActive = m.key === active;
              const moduleAllowed = !MODULE_ROLES[m.key] || (session && MODULE_ROLES[m.key]!.includes(session.role));
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
                  {m.locked && !moduleAllowed && (
                    <span
                      title="Butuh login sesuai RBAC"
                      aria-label="Terkunci — butuh login petugas"
                      className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#141E19] bg-[#F2B705] text-[8px] leading-none text-[#141E19]"
                    >
                      ●
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Session badge / login hint */}
          <div className="flex items-center gap-2">
            {session ? (
              <>
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
              </>
            ) : (
              <span
                className={`rounded-full border-2 border-dashed px-3 py-1.5 text-[11px] font-bold ${current.dark ? "border-[#39564A] text-[#9EB0A7]" : "border-[#D8D3C8] text-[#7A8881]"}`}
              >
                MODE PUBLIK — petugas? buka terminal &amp; login
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-6 md:py-8">
        {active === "public" && (
          <>
            <div className="mb-6 no-print flex items-start gap-2.5 rounded-[10px] border border-[#D8D3C8] bg-white px-4 py-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F2B705] text-[11px] font-extrabold text-[#141E19]">i</span>
              <p className="text-[13px] leading-relaxed text-[#4A5851]">
                Simulator terpadu 5 terminal Smart Pemira — ganti terminal lewat navigasi di atas. Terminal bertanda{" "}
                <span className="mx-0.5 inline-block h-2 w-2 rounded-full bg-[#F2B705] align-middle" aria-label="terkunci" /> memerlukan login petugas sesuai{" "}
                <strong className="text-[#141E19]">RBAC PRD Bab 3</strong>. Demo end-to-end: login <strong className="text-[#141E19]">PPUR</strong> → terbitkan token → pilih di{" "}
                <strong className="text-[#141E19]">Kiosk</strong> (tanpa login, cukup token) → login <strong className="text-[#141E19]">KPUM</strong> (Pleno Unlock) → pantau di <strong className="text-[#141E19]">Panwaslu</strong>.
              </p>
            </div>
            <PublicPortal />
          </>
        )}

        {active === "ppur" &&
          (hasAccess ? (
            <>
              <div className="mb-6 no-print flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Meja Registrasi PPUR</h1>
                  <p className="mt-1 text-sm text-[#4A5851]">
                    Verifikasi identitas mahasiswa (KTM/KRS), lalu terbitkan token bilik suara sekali pakai — TTL 10 menit.
                  </p>
                </div>
                <span className="rounded-full border border-[#141E19] bg-[#E6F4EC] px-3 py-1 font-mono text-[11px] font-bold text-[#0F5132]">
                  SESI AKTIF: {session?.fullName.split(" — ")[0]} ({session?.role})
                </span>
              </div>
              <PpurDesk />
            </>
          ) : (
            <LoginGate
              moduleTitle="Meja Registrasi PPUR — Token Issuer (FR-04)"
              requiredRoles={MODULE_ROLES.ppur!}
              accounts={DEMO_ACCOUNTS}
              onLogin={refreshSession}
            />
          ))}

        {active === "kiosk" && <KioskTerminal />}

        {active === "kpum" &&
          (hasAccess ? (
            <>
              <div className="mb-6 no-print flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Dashboard Komisioner KPUM</h1>
                  <p className="mt-1 text-sm text-[#4A5851]">
                    Manajemen DPT &amp; kandidat, kontrol tahapan, Pleno Unlocking, dan Berita Acara Model C-KWE.
                  </p>
                </div>
                <span className="rounded-full border border-[#141E19] bg-[#E6F4EC] px-3 py-1 font-mono text-[11px] font-bold text-[#0F5132]">
                  SESI AKTIF: {session?.fullName.split(" — ")[0]} ({session?.role})
                  {session?.role !== "KPUM" && " • Pleno Unlock: khusus KPUM"}
                </span>
              </div>
              <KpumDashboard operatorRole={session?.role ?? null} />
            </>
          ) : (
            <LoginGate
              moduleTitle="Dashboard Komisioner KPUM"
              requiredRoles={MODULE_ROLES.kpum!}
              accounts={DEMO_ACCOUNTS}
              onLogin={refreshSession}
            />
          ))}

        {active === "panwaslu" &&
          (hasAccess ? (
            <PanwasluMonitor operatorRole={session?.role ?? null} />
          ) : (
            <LoginGate
              moduleTitle="Live Audit Panwaslu & Sidang Pleno"
              requiredRoles={MODULE_ROLES.panwaslu!}
              accounts={DEMO_ACCOUNTS}
              onLogin={refreshSession}
              dark
            />
          ))}
      </main>

      {/* ================= FOOTER (sticky) ================= */}
      <footer
        className={`mt-auto border-t no-print ${current.dark ? "border-[#263B33] bg-[#0D1512]" : "border-[#D8D3C8] bg-[#F6F4EE]"}`}
      >
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
          <p className={`text-[12px] font-semibold ${current.dark ? "text-[#9EB0A7]" : "text-[#7A8881]"}`}>
            {APP_CONSTANTS.appName} — {APP_CONSTANTS.institute} • {APP_CONSTANTS.legalBasis}
          </p>
          <p className={`flex items-center gap-2 text-[12px] ${current.dark ? "text-[#64786F]" : "text-[#C9C3B6]"}`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${current.dark ? "bg-[#28A769]" : "bg-[#1B7F4E]"}`} />
            Zero-Knowledge Ballot Architecture • RBAC 5 Peran
          </p>
        </div>
      </footer>
    </div>
  );
}
