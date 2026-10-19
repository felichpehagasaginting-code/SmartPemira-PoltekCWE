"use client";

// ============================================================
// SHELL UTAMA SMART PEMIRA — Simulator Terminal Terpadu
// Satu aplikasi, 5 terminal sesuai arsitektur PRD:
// Portal Publik | Meja PPUR | Kiosk Bilik Suara | Dashboard KPUM | Monitor Panwaslu
// ============================================================
import { useState } from "react";
import { KioskTerminal } from "@/components/kiosk/kiosk-terminal";
import { KpumDashboard } from "@/components/kpum/kpum-dashboard";
import { PanwasluMonitor } from "@/components/pleno/panwaslu-monitor";
import { PublicPortal } from "@/components/public-portal/public-portal";
import { PpurDesk } from "@/components/ppur/ppur-desk";
import { APP_CONSTANTS } from "@/lib/constants/election";
import { Landmark, MonitorCheck, ScanBarcode, ShieldHalf, Vote } from "lucide-react";

type ModuleKey = "public" | "ppur" | "kiosk" | "kpum" | "panwaslu";

const MODULES: Array<{ key: ModuleKey; label: string; short: string; icon: React.ReactNode; dark: boolean }> = [
  { key: "public", label: "Portal Publik", short: "PUBLIK", icon: <Landmark className="h-4 w-4" />, dark: false },
  { key: "ppur", label: "Meja Registrasi PPUR", short: "PPUR", icon: <ScanBarcode className="h-4 w-4" />, dark: false },
  { key: "kiosk", label: "Kiosk Bilik Suara", short: "KIOSK", icon: <Vote className="h-4 w-4" />, dark: false },
  { key: "kpum", label: "Dashboard KPUM", short: "KPUM", icon: <MonitorCheck className="h-4 w-4" />, dark: false },
  { key: "panwaslu", label: "Monitor Panwaslu & Pleno", short: "PANWASLU", icon: <ShieldHalf className="h-4 w-4" />, dark: true },
];

export default function Home() {
  const [active, setActive] = useState<ModuleKey>("public");
  const current = MODULES.find((m) => m.key === active)!;

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
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setActive(m.key)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-full border-2 px-4 py-2 text-[12px] font-extrabold tracking-wide transition-all ${
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
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-6 md:py-8">
        {active === "public" && (
          <>
            <div className="mb-6 no-print flex items-start gap-2.5 rounded-[10px] border border-[#D8D3C8] bg-white px-4 py-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F2B705] text-[11px] font-extrabold text-[#141E19]">i</span>
              <p className="text-[13px] leading-relaxed text-[#4A5851]">
                Simulator terpadu 5 terminal Smart Pemira — ganti terminal lewat navigasi di atas.
                Demo end-to-end: terbitkan token di <strong className="text-[#141E19]">Meja PPUR</strong> → pilih di{" "}
                <strong className="text-[#141E19]">Kiosk</strong> → buka hasil di <strong className="text-[#141E19]">Dashboard KPUM (Pleno Unlock)</strong> → pantau di <strong className="text-[#141E19]">Panwaslu</strong>.
              </p>
            </div>
            <PublicPortal />
          </>
        )}
        {active === "ppur" && (
          <>
            <div className="mb-6 no-print">
              <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Meja Registrasi PPUR</h1>
              <p className="mt-1 text-sm text-[#4A5851]">
                Verifikasi identitas mahasiswa (KTM/KRS), lalu terbitkan token bilik suara sekali pakai — TTL 10 menit.
              </p>
            </div>
            <PpurDesk />
          </>
        )}
        {active === "kiosk" && <KioskTerminal />}
        {active === "kpum" && (
          <>
            <div className="mb-6 no-print">
              <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Dashboard Komisioner KPUM</h1>
              <p className="mt-1 text-sm text-[#4A5851]">
                Manajemen DPT &amp; kandidat, kontrol tahapan, Pleno Unlocking, dan Berita Acara Model C-KWE.
              </p>
            </div>
            <KpumDashboard />
          </>
        )}
        {active === "panwaslu" && <PanwasluMonitor />}
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
            Zero-Knowledge Ballot Architecture
          </p>
        </div>
      </footer>
    </div>
  );
}
