"use client";

// ============================================================
// LOGIN GATE RBAC — Smart Pemira (PRD Bab 3: Matriks Hak Akses)
// Kartu otentikasi petugas dengan gaya Tactile Neo-Brutalism.
// Menampilkan matriks akun demo sesuai peran yang dibutuhkan modul.
// ============================================================
import { useState } from "react";
import { KeyRound, LogIn, ShieldCheck } from "lucide-react";

export interface DemoAccount {
  username: string;
  password: string;
  role: string;
  fullName: string;
}

export function LoginGate({
  moduleTitle,
  requiredRoles,
  accounts,
  onLogin,
  dark = false,
}: {
  moduleTitle: string;
  requiredRoles: string[];
  accounts: DemoAccount[];
  onLogin: () => Promise<void>;
  dark?: boolean;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const surface = dark ? "bg-[#15221D] border-[#263B33]" : "bg-white border-[#D8D3C8]";
  const text = dark ? "text-[#F4F1EA]" : "text-[#141E19]";
  const sub = dark ? "text-[#9EB0A7]" : "text-[#4A5851]";

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
      await onLogin();
    } catch {
      setError("Kesalahan jaringan — coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-6 py-6 lg:flex-row lg:items-stretch lg:justify-center">
      {/* ===== Kartu Login ===== */}
      <form
        onSubmit={submit}
        className={`w-full max-w-md rounded-[14px] border-2 border-[#141E19] ${dark ? "bg-[#15221D]" : "bg-white"} p-6 shadow-[6px_6px_0px_#141E19]`}
        aria-label={`Otentikasi ${moduleTitle}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border-2 border-[#141E19] bg-[#F2B705] shadow-[3px_3px_0px_#141E19]">
            <KeyRound className="h-5 w-5 text-[#141E19]" aria-hidden />
          </div>
          <div>
            <h2 className={`font-display text-xl font-extrabold tracking-[-0.02em] ${text}`}>Otentikasi Petugas</h2>
            <p className={`text-[12px] font-semibold uppercase tracking-[0.1em] ${sub}`}>{moduleTitle}</p>
          </div>
        </div>

        <div className={`mt-4 flex flex-wrap items-center gap-2 rounded-[10px] border px-3 py-2 ${dark ? "border-[#263B33] bg-[#0D1512]" : "border-[#D8D3C8] bg-[#F6F4EE]"}`}>
          <ShieldCheck className="h-4 w-4 text-[#1B7F4E]" aria-hidden />
          <span className={`text-[12px] font-semibold ${sub}`}>Peran yang diizinkan:</span>
          {requiredRoles.map((r) => (
            <span key={r} className="rounded-full border border-[#141E19] bg-[#E6F4EC] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#0F5132]">
              {r}
            </span>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className={`text-[12px] font-bold uppercase tracking-[0.08em] ${sub}`}>Username Petugas</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className={`mt-1 h-12 w-full rounded-[8px] border-2 border-[#141E19] px-3 font-mono text-[15px] ${dark ? "bg-[#0D1512] text-[#F4F1EA]" : "bg-white text-[#141E19]"} focus:outline-none focus:ring-2 focus:ring-[#1B7F4E]`}
              placeholder="mis. kpum"
            />
          </label>
          <label className="block">
            <span className={`text-[12px] font-bold uppercase tracking-[0.08em] ${sub}`}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={`mt-1 h-12 w-full rounded-[8px] border-2 border-[#141E19] px-3 font-mono text-[15px] ${dark ? "bg-[#0D1512] text-[#F4F1EA]" : "bg-white text-[#141E19]"} focus:outline-none focus:ring-2 focus:ring-[#1B7F4E]`}
              placeholder="••••••••"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-[8px] border border-[#E05A47] bg-[#FDE8E5] px-3 py-2 text-[13px] font-semibold text-[#842029]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 flex h-[56px] w-full items-center justify-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] text-[15px] font-extrabold tracking-wide text-white shadow-[4px_4px_0px_#141E19] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#141E19] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#141E19] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogIn className="h-5 w-5" aria-hidden />
          {busy ? "MEMVERIFIKASI..." : "MASUK SEBAGAI PETUGAS"}
        </button>

        <p className={`mt-3 text-center text-[11px] leading-relaxed ${dark ? "text-[#64786F]" : "text-[#7A8881]"}`}>
          Sesi operator berlaku 8 jam • cookie httpOnly bertanda tangan HMAC-SHA256 • password di-hash scrypt.
        </p>
      </form>

      {/* ===== Matriks Akun Demo ===== */}
      <div className={`w-full max-w-md rounded-[14px] border border-[#D8D3C8] ${surface} p-6 ${dark ? "" : "shadow-[0_1px_3px_rgba(20,30,25,0.04)]"}`}>
        <h3 className={`font-display text-base font-extrabold ${text}`}>Matriks Akun (Mode Demo)</h3>
        <p className={`mt-1 text-[12px] leading-relaxed ${sub}`}>
          Akun di bawah diprovisioning oleh ITPO sesuai RBAC PRD Bab 3. Klik baris untuk mengisi otomatis.
        </p>
        <div className={`mt-3 overflow-hidden rounded-[10px] border ${dark ? "border-[#263B33]" : "border-[#D8D3C8]"}`}>
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className={dark ? "bg-[#1D2E27] text-[#9EB0A7]" : "bg-[#EAE6DF] text-[#4A5851]"}>
                <th className="px-3 py-2 font-bold uppercase tracking-[0.06em]">Peran</th>
                <th className="px-3 py-2 font-bold uppercase tracking-[0.06em]">Akun</th>
                <th className="px-3 py-2 font-bold uppercase tracking-[0.06em]">Nama</th>
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
                  className={`cursor-pointer border-t ${dark ? "border-[#263B33] hover:bg-[#1D2E27]" : "border-[#D8D3C8] hover:bg-[#F6F4EE]"} transition-colors`}
                >
                  <td className="px-3 py-2">
                    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10.5px] font-bold ${dark ? "border-[#39564A] text-[#28A769]" : "border-[#141E19] bg-[#E6F4EC] text-[#0F5132]"}`}>
                      {a.role}
                    </span>
                  </td>
                  <td className={`px-3 py-2 font-mono ${text}`}>
                    {a.username} / {a.password}
                  </td>
                  <td className={`px-3 py-2 ${sub}`}>{a.fullName.split(" — ")[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={`mt-3 rounded-[10px] border border-dashed px-3 py-2.5 text-[12px] leading-relaxed ${dark ? "border-[#39564A] text-[#9EB0A7]" : "border-[#D8D3C8] text-[#4A5851]"}`}>
          <strong className={text}>Catatan pemisahan kewenangan:</strong> Pleno Unlock (FR-06.3) hanya dapat dieksekusi{" "}
          <span className="font-mono font-bold text-[#0F5132]">KPUM</span> — Super Admin ITPO pun ditolak 403 demi integritas penyelenggara.
        </div>
      </div>
    </div>
  );
}
