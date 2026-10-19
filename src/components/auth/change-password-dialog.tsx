"use client";

// ============================================================
// DIALOG GANTI PASSWORD — Menu profil operator (semua peran)
// Wajib verifikasi password lama → password baru min. 8 karakter
// → sesi diakhiri otomatis (wajib login ulang dengan sandi baru).
// ============================================================
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fullName: string;
  role: string;
  /** Mode wajib: sandi sementara aktif — dialog tidak bisa ditutup sebelum diganti. */
  mustChange?: boolean;
  onPasswordChanged: () => Promise<void>; // dipanggil setelah sukses → refresh sesi (jadi null)
}

const MIN_LENGTH = 8;

export function ChangePasswordDialog({ open, onOpenChange, fullName, role, mustChange = false, onPasswordChanged }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filled = currentPassword && newPassword && confirmPassword;
  const matchOk = newPassword.length >= MIN_LENGTH && newPassword === confirmPassword;

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(null);
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!filled) {
      setError("Semua kolom wajib diisi.");
      return;
    }
    if (newPassword.length < MIN_LENGTH) {
      setError(`Password baru minimal ${MIN_LENGTH} karakter.`);
      return;
    }
    if (!matchOk) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.message ?? "Gagal mengganti password.");
        return;
      }
      setSuccess(body.message ?? "Password berhasil diganti.");
      await new Promise((r) => setTimeout(r, 1400));
      onOpenChange(false);
      reset();
      await onPasswordChanged();
    } catch {
      setError("Kesalahan jaringan — coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!busy && !mustChange) {
          onOpenChange(o);
          if (!o) reset();
        }
      }}
    >
      <DialogContent
        className="rounded-[14px] border-2 border-[#141E19] bg-white p-0 shadow-[8px_8px_0px_#141E19] sm:max-w-[440px]"
        onInteractOutside={(e) => mustChange && e.preventDefault()}
        onEscapeKeyDown={(e) => mustChange && e.preventDefault()}
      >
        <div className="p-6">
          {!success ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border-2 border-[#141E19] bg-[#F2B705] shadow-[3px_3px_0px_#141E19]">
                    <KeyRound className="h-5 w-5 text-[#141E19]" aria-hidden />
                  </div>
                  <div className="text-left">
                    <DialogTitle className="font-display text-xl font-extrabold tracking-[-0.02em] text-[#141E19]">{mustChange ? "Wajib Ganti Sandi" : "Ganti Password"}</DialogTitle>
                    <DialogDescription className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7A8881]">
                      {fullName.split(" — ")[0]} • {role}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <form onSubmit={submit} className="mt-5 space-y-3.5">
                {mustChange && (
                  <p className="rounded-[8px] border border-[#F2B705] bg-[#FEF5D6] px-3 py-2 text-[12.5px] font-semibold leading-relaxed text-[#8A5200]">
                    Anda masuk dengan <strong>sandi sementara</strong> dari reset ITPO. Ganti sandi sekarang untuk melanjutkan — dialog ini tidak dapat ditutup sebelum sandi diganti.
                  </p>
                )}
                <label className="block">
                  <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A5851]">Password Lama</span>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    className="mt-1 h-11 rounded-[8px] border-2 border-[#141E19] font-mono shadow-none focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
                    placeholder="••••••••"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A5851]">Password Baru</span>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="mt-1 h-11 rounded-[8px] border-2 border-[#141E19] font-mono shadow-none focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
                    placeholder={`minimal ${MIN_LENGTH} karakter`}
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A5851]">Konfirmasi Password Baru</span>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="mt-1 h-11 rounded-[8px] border-2 border-[#141E19] font-mono shadow-none focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
                    placeholder="ulangi password baru"
                  />
                </label>
                {confirmPassword && newPassword.length >= MIN_LENGTH && (
                  <p className={`flex items-center gap-1.5 text-[12px] font-bold ${matchOk ? "text-[#1B7F4E]" : "text-[#E05A47]"}`}>
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                    {matchOk ? "Konfirmasi cocok — siap disimpan." : "Belum cocok dengan password baru."}
                  </p>
                )}

                {error && (
                  <p role="alert" className="rounded-[8px] border border-[#E05A47] bg-[#FDE8E5] px-3 py-2 text-[13px] font-semibold text-[#842029]">
                    {error}
                  </p>
                )}

                <div className="flex gap-2.5 pt-1">
                  {!mustChange && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        onOpenChange(false);
                        reset();
                      }}
                      className="h-12 flex-1 rounded-[10px] border-2 border-[#141E19] bg-white text-[13px] font-extrabold text-[#141E19] shadow-[3px_3px_0px_#141E19] hover:bg-[#F6F4EE]"
                    >
                      BATAL
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={busy || !filled || !matchOk}
                    className="h-12 flex-1 rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] text-[13px] font-extrabold text-white shadow-[3px_3px_0px_#141E19] hover:bg-[#176D42] disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
                    {busy ? "MENYIMPAN..." : "SIMPAN SANDI BARU"}
                  </Button>
                </div>
              </form>

              <p className="mt-4 rounded-[10px] border border-dashed border-[#D8D3C8] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#4A5851]">
                <strong className="text-[#141E19]">Catatan keamanan:</strong> setelah password diganti, sesi aktif diakhiri otomatis dan aksi ini tercatat
                di audit log append-only (Panwaslu dapat mengauditnya).
              </p>
            </>
          ) : (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#1B7F4E] bg-[#E6F4EC]">
                <CheckCircle2 className="h-7 w-7 text-[#1B7F4E]" aria-hidden />
              </div>
              <h3 className="mt-3 font-display text-lg font-extrabold text-[#141E19]">Password Diganti</h3>
              <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-[#4A5851]">{success}</p>
              <Loader2 className="mx-auto mt-4 h-4 w-4 animate-spin text-[#7A8881]" aria-hidden />
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7A8881]">Kembali ke halaman login…</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
