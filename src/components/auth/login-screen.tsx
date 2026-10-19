"use client";

// ============================================================
// LOGIN SCREEN — GERBANG UTAMA SMART PEMIRA (Login-First RBAC)
// Layar penuh: identitas sistem + form otentikasi petugas.
// Setelah login sukses, pengguna diarahkan ke terminal sesuai peran
// (matriks RBAC PRD Bab 3). Ditegakkan server-side via requireRole.
// ============================================================
import { useState } from "react";
import { Fingerprint, KeyRound, Landmark, LogIn, MonitorCheck, ScanBarcode, ShieldCheck, ShieldHalf, Vote } from "lucide-react";

export interface DemoAccount {
  username: string;
  password: string;
  role: string;
  fullName: string;
  landing: string;
}

const ROLE_BADGE: Record<string, string> = {
  ITPO: "bg-[#E05A47]",
  KPUM: "bg-[#0F766E]",
  PPUR: "bg-[#1B7F4E]",
  PANWASLU: "bg-[#3F4743]",
  SAKSI: "bg-[#2B50AA]",
};

const TERMINALS = [
  { icon: <Landmark className="h-3.5 w-3.5" />, label: "Portal Informasi Publik", access: "Semua pengguna" },
  { icon: <ScanBarcode className="h-3.5 w-3.5" />, label: "Meja Registrasi PPUR", access: "PPUR • ITPO" },
  { icon: <Vote className="h-3.5 w-3.5" />, label: "Kiosk Bilik Suara", access: "Token pemilih" },
  { icon: <MonitorCheck className="h-3.5 w-3.5" />, label: "Dashboard KPUM", access: "KPUM • ITPO" },
  { icon: <ShieldHalf className="h-3.5 w-3.5" />, label: "Monitor Panwaslu & Pleno", access: "PANWASLU • SAKSI • KPUM • ITPO" },
];

export function LoginScreen({ accounts, onLogin }: { accounts: DemoAccount[]; onLogin: () => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successName, setSuccessName] = useState<string | null>(null);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!username.trim() || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.message ?? "Login gagal.");
        return;
      }
      setSuccessName(body.operator?.fullName ?? username);
      await onLogin();
    } catch {
      setError("Kesalahan jaringan — coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#F6F4EE] lg:grid-cols-[1.05fr_1fr]">
      {/* ============ PANEL BRAND (kiri, espresso) ============ */}
      <aside className="relative flex flex-col justify-between overflow-hidden bg-[#141E19] px-6 py-8 text-[#F4F1EA] md:px-10 lg:py-10">
        {/* ornamen botanikal */}
        <svg className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] opacity-[0.07]" viewBox="0 0 200 200" fill="none" aria-hidden>
          <circle cx="100" cy="100" r="86" stroke="#F4F1EA" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="60" stroke="#F4F1EA" strokeWidth="1" />
          <circle cx="100" cy="100" r="34" stroke="#28A769" strokeWidth="1.5" />
          <path d="M100 14v172M14 100h172M39 39l122 122M161 39 39 161" stroke="#F4F1EA" strokeWidth="0.75" />
        </svg>
        <svg className="pointer-events-none absolute -bottom-28 -left-20 h-[380px] w-[380px] opacity-[0.06]" viewBox="0 0 200 200" fill="none" aria-hidden>
          <path d="M100 10c30 40 60 60 60 95a60 60 0 1 1-120 0c0-35 30-55 60-95Z" stroke="#28A769" strokeWidth="1.5" />
          <path d="M100 40v130M100 90c-14-8-26-8-38-4M100 120c14-8 26-8 38-4" stroke="#28A769" strokeWidth="1" />
        </svg>

        {/* Brand */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] border-2 border-[#F4F1EA] bg-[#1B7F4E] shadow-[3px_3px_0px_rgba(244,241,234,0.35)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 21c4.97 0 9-4.03 9-9V4.5c0-.83-.67-1.5-1.5-1.5H12c-4.97 0-9 4.03-9 9s4.03 9 9 9Z" />
                <path d="m9 11.5 2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="font-display text-[22px] font-extrabold leading-none tracking-[-0.02em]">SMART PEMIRA</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#9EB0A7]">Poltek CWE • Sistem E-Voting IKM</p>
            </div>
          </div>

          <h1 className="mt-10 max-w-[520px] font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[52px]">
            Pemilu Raya <span className="text-[#28A769]">Mahasiswa</span> yang{" "}
            <span className="relative inline-block">
              Amanah
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 120 8" fill="none" aria-hidden>
                <path d="M2 6c20-5 40-5 58-3 18 2 38 2 58-1" stroke="#F2B705" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-5 max-w-[480px] text-[14px] leading-relaxed text-[#B9C7BF]">
            Satu pintu, lima terminal. Masuk dengan akun petugas — sistem mengarahkan Anda ke modul sesuai kewenangan peran pada matriks RBAC PRD Bab 3.
          </p>
        </div>

        {/* Daftar terminal */}
        <div className="relative mt-10 lg:mt-0">
          <p className="mb-3 flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[#9EB0A7]">
            <Fingerprint className="h-3.5 w-3.5" aria-hidden /> Peta Terminal & Kewenangan
          </p>
          <ul className="space-y-2">
            {TERMINALS.map((t) => (
              <li key={t.label} className="flex items-center gap-3 rounded-[10px] border border-[#263B33] bg-[#0D1512]/80 px-3.5 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#39564A] bg-[#15221D] text-[#28A769]">{t.icon}</span>
                <span className="flex-1 text-[13px] font-bold">{t.label}</span>
                <span className="hidden font-mono text-[10px] font-bold tracking-wide text-[#64786F] sm:inline">{t.access}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer keamanan */}
        <div className="relative mt-10 flex flex-wrap items-center gap-2 lg:mt-0">
          {["RBAC 5 Peran", "Zero-Knowledge Ballot", "Sesi HMAC-SHA256", "Password scrypt"].map((chip) => (
            <span key={chip} className="rounded-full border border-[#39564A] bg-[#15221D] px-3 py-1 text-[10.5px] font-bold tracking-wide text-[#9EB0A7]">
              {chip}
            </span>
          ))}
        </div>
      </aside>

      {/* ============ PANEL FORM (kanan, oat milk) ============ */}
      <main className="flex items-center justify-center px-4 py-10 md:px-8">
        <div className="w-full max-w-[520px]">
          {/* Kartu login */}
          <form
            onSubmit={submit}
            className="rounded-[16px] border-2 border-[#141E19] bg-white p-6 shadow-[8px_8px_0px_#141E19] md:p-8"
            aria-label="Login petugas Smart Pemira"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border-2 border-[#141E19] bg-[#F2B705] shadow-[3px_3px_0px_#141E19]">
                <KeyRound className="h-5 w-5 text-[#141E19]" aria-hidden />
              </div>
              <div>
                <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-[#141E19]">Masuk Sistem</h2>
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#7A8881]">Otentikasi Petugas / Operator</p>
              </div>
            </div>

            <div className="mt-5 space-y-3.5">
              <label className="block">
                <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A5851]">Username Petugas</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  className="mt-1 h-12 w-full rounded-[8px] border-2 border-[#141E19] bg-white px-3 font-mono text-[15px] text-[#141E19] focus:outline-none focus:ring-2 focus:ring-[#1B7F4E]"
                  placeholder="mis. kpum"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A5851]">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="mt-1 h-12 w-full rounded-[8px] border-2 border-[#141E19] bg-white px-3 font-mono text-[15px] text-[#141E19] focus:outline-none focus:ring-2 focus:ring-[#1B7F4E]"
                  placeholder="••••••••"
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-[8px] border border-[#E05A47] bg-[#FDE8E5] px-3 py-2.5 text-[13px] font-semibold text-[#842029]">
                {error}
              </p>
            )}
            {successName && !error && (
              <p role="status" className="mt-4 rounded-[8px] border border-[#1B7F4E] bg-[#E6F4EC] px-3 py-2.5 text-[13px] font-semibold text-[#0F5132]">
                Selamat datang, {successName.split(" — ")[0]} — membuka terminal Anda...
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-5 flex h-[56px] w-full items-center justify-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] text-[15px] font-extrabold tracking-wide text-white shadow-[4px_4px_0px_#141E19] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#141E19] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#141E19] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn className="h-5 w-5" aria-hidden />
              {busy ? "MEMVERIFIKASI..." : "MASUK KE SISTEM"}
            </button>

            <p className="mt-3.5 flex items-start gap-2 text-[11.5px] leading-relaxed text-[#7A8881]">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1B7F4E]" aria-hidden />
              Sesi berlaku 8 jam (shift petugas) • cookie httpOnly bertanda tangan HMAC • seluruh endpoint modul divalidasi ulang server-side (401/403) sesuai matriks RBAC.
            </p>
          </form>

          {/* Matriks akun demo */}
          <div className="mt-5 rounded-[14px] border border-[#D8D3C8] bg-white/70 p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-[15px] font-extrabold text-[#141E19]">Matriks Akun Demo</h3>
              <span className="rounded-full border border-[#141E19] bg-[#F2B705] px-2.5 py-0.5 font-mono text-[10px] font-extrabold text-[#141E19]">KLIK UNTUK ISI OTOMATIS</span>
            </div>
            <div className="mt-3 overflow-hidden rounded-[10px] border border-[#D8D3C8]">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="bg-[#EAE6DF] text-[#4A5851]">
                    <th className="px-3 py-2 font-bold uppercase tracking-[0.06em]">Peran</th>
                    <th className="px-3 py-2 font-bold uppercase tracking-[0.06em]">Akun</th>
                    <th className="hidden px-3 py-2 font-bold uppercase tracking-[0.06em] sm:table-cell">Diarahkan ke</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr
                      key={a.username}
                      onClick={() => {
                        setUsername(a.username);
                        setPassword(a.password);
                        setError(null);
                      }}
                      className="cursor-pointer border-t border-[#D8D3C8] transition-colors hover:bg-[#F6F4EE]"
                    >
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border border-[#141E19] px-2 py-0.5 font-mono text-[10.5px] font-extrabold text-white ${ROLE_BADGE[a.role] ?? "bg-[#3F4743]"}`}>
                          {a.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-[#141E19]">
                        {a.username} / {a.password}
                      </td>
                      <td className="hidden px-3 py-2 text-[12px] text-[#4A5851] sm:table-cell">{a.landing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 rounded-[10px] border border-dashed border-[#D8D3C8] px-3 py-2.5 text-[12px] leading-relaxed text-[#4A5851]">
              <strong className="text-[#141E19]">Pemisahan kewenangan tetap dijaga:</strong> Pleno Unlock (FR-06.3) hanya dapat dieksekusi{" "}
              <span className="font-mono font-bold text-[#0F5132]">KPUM</span> — meski ITPO super admin, server menolak dengan 403 demi integritas penyelenggara.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
