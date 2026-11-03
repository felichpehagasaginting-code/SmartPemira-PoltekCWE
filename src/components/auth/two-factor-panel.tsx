"use client";

// ============================================================
// PANEL 2FA — Bagian "Keamanan Akun" (Rekomendasi #3)
// Tiga keadaan: nonaktif (provisioning QR) / aktif (status + matikan) /
// kode cadangan (ditampilkan SEKALI saat aktivasi). Aksi:
//   setup → enable (kode TOTP) → tampilkan 8 kode cadangan sekali pakai
//   disable → verifikasi password + kode TOTP/cadangan
// ============================================================
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

interface Status {
  twoFactor: {
    enabled: boolean;
    enabledAt: string | null;
    pendingSetup: boolean;
    backupCodesRemaining: number;
    mandatory: boolean;
  };
}

type Stage = "loading" | "status" | "enroll" | "backup-codes" | "disabling";

export function TwoFactorPanel() {
  const [stage, setStage] = useState<Stage>("loading");
  const [status, setStatus] = useState<Status["twoFactor"] | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function load() {
    setStage("loading");
    try {
      const res = await fetch("/api/auth/2fa", { cache: "no-store" });
      const body = await res.json();
      setStatus(body.twoFactor ?? null);
      setStage("status");
    } catch {
      setError("Gagal memuat status 2FA.");
      setStage("status");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function startEnroll() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.message ?? "Gagal memulai pemasangan.");
        return;
      }
      setSecret(body.secret);
      setQrDataUrl(await QRCode.toDataURL(body.otpauthUri, { width: 190, margin: 1, color: { dark: "#141E19", light: "#FFFFFF" } }));
      setCode("");
      setStage("enroll");
    } catch {
      setError("Kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable", code: code.trim() }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.message ?? "Kode tidak sah.");
        return;
      }
      setBackupCodes(body.backupCodes ?? []);
      setStage("backup-codes");
      void load();
    } catch {
      setError("Kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", password, code: code.trim() }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.message ?? "Gagal menonaktifkan.");
        return;
      }
      setInfo(body.message);
      setPassword("");
      setCode("");
      await load();
    } catch {
      setError("Kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  }

  if (stage === "loading") {
    return (
      <p className="flex items-center gap-2 text-[12.5px] font-semibold text-[#4A5851]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Memuat status 2FA…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-[8px] border border-[#D8D3C8] bg-[#F6F4EE] px-3 py-2.5">
        <div className="flex items-center gap-2 text-[13px] font-bold text-[#141E19]">
          {status?.enabled ? <ShieldCheck className="h-4 w-4 text-[#1B7F4E]" aria-hidden /> : <ShieldAlert className="h-4 w-4 text-[#E05A47]" aria-hidden />}
          2FA (TOTP): {status?.enabled ? "AKTIF" : "BELUM AKTIF"}
          {status?.mandatory && !status?.enabled && <span className="text-[11px] font-extrabold uppercase text-[#8A5200]">— wajib untuk {""}peran Anda</span>}
        </div>
        {status?.enabled && <span className="font-mono text-[10.5px] text-[#7A8881]">sisa kode cadangan: {status.backupCodesRemaining}</span>}
      </div>

      {error && <p className="rounded-[8px] border border-[#E05A47] bg-[#FDE8E5] px-3 py-2 text-[12.5px] font-semibold text-[#842029]">{error}</p>}
      {info && <p className="rounded-[8px] border border-[#1B7F4E] bg-[#E6F4EC] px-3 py-2 text-[12.5px] font-semibold text-[#0F5132]">{info}</p>}

      {/* ---- Keadaan nonaktif: tombol mulai ---- */}
      {stage === "status" && !status?.enabled && (
        <div className="space-y-2">
          <Button
            type="button"
            disabled={busy}
            onClick={startEnroll}
            className="h-11 w-full rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] text-[12.5px] font-extrabold text-white shadow-[3px_3px_0px_#141E19] hover:bg-[#176D42]"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden /> AKTIFKAN 2FA (APLIKASI AUTENTIKATOR)
          </Button>
          <p className="text-[11.5px] leading-relaxed text-[#4A5851]">
            Pindai QR dengan Google Authenticator / Aegis / Authy, lalu masukkan kode 6 digit. Delapan kode cadangan sekali pakai akan diberikan untuk
            keadaan darurat (HP hilang).
          </p>
        </div>
      )}

      {/* ---- Pemasangan: QR + konfirmasi kode (form agar tombol Enter pada input ikut mengonfirmasi) ---- */}
      {stage === "enroll" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void confirmEnroll();
          }}
          className="space-y-2.5 rounded-[10px] border-2 border-[#141E19] bg-white p-3.5"
        >
          <div className="flex flex-col items-center gap-2">
            {qrDataUrl && <img src={qrDataUrl} alt="QR provisioning TOTP" className="h-[190px] w-[190px] rounded-[8px] border-2 border-[#141E19]" />}
            <p className="break-all rounded-[6px] bg-[#F6F4EE] px-2 py-1 font-mono text-[10.5px] text-[#4A5851]">{secret}</p>
          </div>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="kode 6 digit dari aplikasi"
            className="h-11 rounded-[8px] border-2 border-[#141E19] text-center font-mono tracking-[0.4em]"
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setStage("status")} className="h-11 flex-1 rounded-[10px] border-2 border-[#141E19] bg-white text-[12px] font-extrabold text-[#141E19] shadow-[3px_3px_0px_#141E19]">
              BATAL
            </Button>
            <Button type="submit" disabled={busy || code.length !== 6} className="h-11 flex-1 rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] text-[12px] font-extrabold text-white shadow-[3px_3px_0px_#141E19] hover:bg-[#176D42] disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />} KONFIRMASI
            </Button>
          </div>
        </form>
      )}

      {/* ---- Kode cadangan ditampilkan SEKALI ---- */}
      {stage === "backup-codes" && (
        <div className="space-y-2 rounded-[10px] border-2 border-[#F2B705] bg-[#FEF5D6] p-3.5">
          <p className="text-[12.5px] font-extrabold text-[#8A5200]">2FA AKTIF — SIMPAN 8 KODE CADANGAN INI SEKARANG. TIDAK AKAN DITAMPILKAN LAGI.</p>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[12.5px] font-bold text-[#141E19]">
            {backupCodes.map((c) => (
              <span key={c} className="rounded-[6px] border border-[#D8D3C8] bg-white px-2 py-1">{c}</span>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void navigator.clipboard?.writeText(backupCodes.join("\n"))}
            className="h-10 w-full rounded-[8px] border-2 border-[#141E19] bg-white text-[11.5px] font-extrabold text-[#141E19] shadow-[2px_2px_0px_#141E19]"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden /> SALIN SEMUA KODE
          </Button>
          <Button type="button" onClick={() => setStage("status")} className="h-10 w-full rounded-[8px] border-2 border-[#141E19] bg-[#141E19] text-[11.5px] font-extrabold text-white shadow-[2px_2px_0px_#141E19]">
            SELESAI — SAYA SUDAH SIMPAN
          </Button>
        </div>
      )}

      {/* ---- Aktif: opsi matikan (verifikasi ganda) ---- */}
      {stage === "status" && status?.enabled && (
        <details className="rounded-[8px] border border-[#D8D3C8] bg-white px-3 py-2.5">
          <summary className="cursor-pointer text-[12px] font-bold uppercase tracking-[0.06em] text-[#7A8881]">Matikan 2FA (darurat)</summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void disable();
            }}
            className="mt-2.5 space-y-2"
          >
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password Anda" autoComplete="current-password" className="h-10 rounded-[8px] border-2 border-[#141E19] font-mono" />
            <Input value={code} onChange={(e) => setCode(e.target.value.trim())} placeholder="kode TOTP / kode cadangan" className="h-10 rounded-[8px] border-2 border-[#141E19] font-mono" />
            <Button type="submit" disabled={busy || !password || !code} className="h-10 w-full rounded-[8px] border-2 border-[#141E19] bg-[#E05A47] text-[11.5px] font-extrabold text-white shadow-[2px_2px_0px_#141E19] disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldAlert className="h-4 w-4" aria-hidden />} MATIKAN 2FA
            </Button>
          </form>
        </details>
      )}

      {stage === "status" && status?.enabled && (
        <p className="text-[11.5px] leading-relaxed text-[#4A5851]">
          Saat login berikutnya, masukkan kode 6 digit dari aplikasi autentikator setelah password. Setiap penggunaan kode cadangan tercatat di audit log.
        </p>
      )}
    </div>
  );
}
