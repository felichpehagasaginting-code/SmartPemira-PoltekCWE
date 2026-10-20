"use client";

// ============================================================
// PANEL MANAJEMEN OPERATOR — khusus ITPO (Rekomendasi #2)
// CRUD akun petugas: buat akun, aktif/nonaktifkan, reset sandi
// (sandi sementara tampil sekali + wajib diganti saat login).
// Semua aksi terekam di audit log append-only.
// ============================================================
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePolling } from "@/hooks/use-polling";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  PowerOff,
  ShieldPlus,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";

const ROLE_BADGE: Record<string, string> = {
  ITPO: "bg-[#E05A47]",
  KPUM: "bg-[#0F766E]",
  PPUR: "bg-[#1B7F4E]",
  PANWASLU: "bg-[#3F4743]",
  SAKSI: "bg-[#2B50AA]",
};

const ROLES = ["KPUM", "PPUR", "PANWASLU", "SAKSI", "ITPO"];

interface OperatorRow {
  id: string;
  username: string;
  role: string;
  fullName: string;
  tpsId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function generatePassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `Kmp-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

export function OperatorManager({ currentUsername }: { currentUsername: string }) {
  const { data, loading, refresh } = usePolling<{ ok: boolean; operators: OperatorRow[]; tpsOptions: Array<{ id: string; name: string }> }>(
    "/api/admin/operators",
    15000
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // dialog buat akun
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ username: "", fullName: "", role: "PPUR", tpsId: "", password: generatePassword() });
  const [createError, setCreateError] = useState<string | null>(null);

  // dialog reset sandi
  const [resetTarget, setResetTarget] = useState<OperatorRow | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const operators = data?.operators ?? [];

  async function createOperator() {
    setBusy("create");
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tpsId: form.tpsId || null }),
      });
      const body = await res.json();
      if (!body.ok) {
        setCreateError(body.message ?? "Gagal membuat akun.");
        return;
      }
      setCreateOpen(false);
      setForm({ username: "", fullName: "", role: "PPUR", tpsId: "", password: generatePassword() });
      setNotice({ ok: true, text: body.message });
      refresh();
    } catch {
      setCreateError("Kesalahan jaringan.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleActive(op: OperatorRow) {
    setBusy(op.id);
    try {
      const res = await fetch(`/api/admin/operators/${op.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !op.isActive }),
      });
      const body = await res.json();
      setNotice(body.ok ? { ok: true, text: body.message } : { ok: false, text: body.message });
      if (body.ok) refresh();
    } catch {
      setNotice({ ok: false, text: "Kesalahan jaringan." });
    } finally {
      setBusy(null);
    }
  }

  async function resetPassword(op: OperatorRow) {
    setBusy(op.id);
    setCopied(false);
    try {
      const res = await fetch(`/api/admin/operators/${op.id}/reset-password`, { method: "POST" });
      const body = await res.json();
      if (body.ok) {
        setTempPassword(body.tempPassword);
        setResetTarget(op);
        refresh();
      } else {
        setNotice({ ok: false, text: body.message });
      }
    } catch {
      setNotice({ ok: false, text: "Kesalahan jaringan." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header aksi */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border-2 border-[#141E19] bg-[#E05A47] shadow-[3px_3px_0px_#141E19]">
            <Users className="h-5 w-5 text-white" aria-hidden />
          </div>
          <div>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Manajemen Akun Operator</h2>
            <p className="text-[12.5px] text-[#4A5851]">
              Provisioning RBAC — buat, nonaktifkan, dan reset sandi petugas. Semua aksi tercatat di audit log.
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          className="h-11 rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] px-5 text-[13px] font-extrabold text-white shadow-[3px_3px_0px_#141E19] hover:bg-[#176D42]"
        >
          <ShieldPlus className="h-4 w-4" aria-hidden /> BUAT AKUN BARU
        </Button>
      </div>

      {notice && (
        <p className={`rounded-[10px] border px-4 py-2.5 text-[13px] font-semibold ${notice.ok ? "border-[#1B7F4E] bg-[#E6F4EC] text-[#0F5132]" : "border-[#E05A47] bg-[#FDE8E5] text-[#842029]"}`}>
          {notice.text}
        </p>
      )}

      {/* Tabel operator */}
      <div className="overflow-hidden rounded-[12px] border-2 border-[#141E19] bg-white shadow-[4px_4px_0px_#141E19]">
        <div className="nice-scroll max-h-[560px] overflow-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-[#EAE6DF] text-[11px] uppercase tracking-wider text-[#4A5851]">
              <tr>
                <th className="px-4 py-3 font-bold">Peran</th>
                <th className="px-4 py-3 font-bold">Akun</th>
                <th className="px-4 py-3 font-bold">Nama</th>
                <th className="hidden px-4 py-3 font-bold md:table-cell">Login Terakhir</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 text-right font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6">
                    <div className="flex items-center gap-2 text-[#7A8881]">
                      <Loader2 className="h-4 w-4 animate-spin" /> Memuat akun…
                    </div>
                  </td>
                </tr>
              ) : (
                operators.map((op) => (
                  <tr key={op.id} className="border-t border-[#D8D3C8] transition-colors hover:bg-[#F6F4EE]">
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border border-[#141E19] px-2.5 py-0.5 font-mono text-[10.5px] font-extrabold text-white ${ROLE_BADGE[op.role] ?? "bg-[#3F4743]"}`}>
                        {op.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#141E19]">
                      {op.username}
                      {op.username === currentUsername && <span className="ml-2 rounded-full bg-[#F2B705] px-2 py-0.5 text-[9px] font-extrabold text-[#141E19]">ANDA</span>}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3">{op.fullName}</td>
                    <td className="hidden px-4 py-3 font-mono-tabular text-[12px] text-[#7A8881] md:table-cell">
                      {op.lastLoginAt ? new Date(op.lastLoginAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {op.isActive ? (
                          <Badge className="gap-1 rounded-full border border-[#1B7F4E] bg-[#E6F4EC] text-[10px] font-extrabold text-[#0F5132]">
                            <UserCheck className="h-3 w-3" /> AKTIF
                          </Badge>
                        ) : (
                          <Badge className="gap-1 rounded-full border border-[#E05A47] bg-[#FDE8E5] text-[10px] font-extrabold text-[#842029]">
                            <UserX className="h-3 w-3" /> NONAKTIF
                          </Badge>
                        )}
                        {op.mustChangePassword && (
                          <Badge className="rounded-full border border-[#F2B705] bg-[#FEF5D6] text-[9.5px] font-extrabold text-[#8A5200]">
                            SANDI SEMENTARA
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          title="Reset sandi — terbitkan sandi sementara"
                          disabled={busy === op.id}
                          onClick={() => resetPassword(op)}
                          className="flex h-8 items-center gap-1 rounded-full border-2 border-[#141E19] bg-[#F2B705] px-3 text-[10.5px] font-extrabold text-[#141E19] transition-all hover:-translate-y-0.5 disabled:opacity-50"
                        >
                          <KeyRound className="h-3 w-3" /> RESET SANDI
                        </button>
                        <button
                          type="button"
                          title={op.isActive ? "Nonaktifkan akun" : "Aktifkan akun"}
                          disabled={busy === op.id || op.username === currentUsername}
                          onClick={() => toggleActive(op)}
                          className={`flex h-8 items-center gap-1 rounded-full border-2 border-[#141E19] px-3 text-[10.5px] font-extrabold transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-30 ${
                            op.isActive ? "bg-white text-[#E05A47]" : "bg-[#1B7F4E] text-white"
                          }`}
                        >
                          {op.isActive ? <PowerOff className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                          {op.isActive ? "NONAKTIFKAN" : "AKTIFKAN"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="rounded-[10px] border border-dashed border-[#D8D3C8] px-4 py-3 text-[12.5px] leading-relaxed text-[#4A5851]">
        <strong className="text-[#141E19]">Catatan RBAC:</strong> akun nonaktif langsung ditolak 401 saat login. Reset sandi menghasilkan sandi sementara yang
        wajib diganti petugas saat login berikutnya (dialog ganti sandi terbuka otomatis). ITPO tidak dapat menonaktifkan akunnya sendiri (anti-lockout).
      </p>

      {/* ============ Dialog: buat akun ============ */}
      <Dialog open={createOpen} onOpenChange={(o) => !busy && setCreateOpen(o)}>
        <DialogContent className="rounded-[14px] border-2 border-[#141E19] bg-white p-0 shadow-[8px_8px_0px_#141E19] sm:max-w-[480px]">
          <div className="p-6">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] shadow-[3px_3px_0px_#141E19]">
                  <ShieldPlus className="h-5 w-5 text-white" aria-hidden />
                </div>
                <div className="text-left">
                  <DialogTitle className="font-display text-xl font-extrabold text-[#141E19]">Buat Akun Operator</DialogTitle>
                  <DialogDescription className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7A8881]">
                    Provisioning RBAC — PRD Bab 3
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="mt-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A5851]">Username</span>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))}
                    placeholder="mis. ppur02"
                    className="mt-1 h-11 rounded-[8px] border-2 border-[#141E19] font-mono shadow-none focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A5851]">Peran (RBAC)</span>
                  <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                    <SelectTrigger className="mt-1 h-11 rounded-[8px] border-2 border-[#141E19] font-mono text-[13px] font-bold shadow-none focus-visible:ring-2 focus-visible:ring-[#1B7F4E]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="font-mono font-bold">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
              <label className="block">
                <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A5851]">Nama Lengkap</span>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="mis. Eka Putri — Petugas PPUR TPS 01"
                  className="mt-1 h-11 rounded-[8px] border-2 border-[#141E19] shadow-none focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
                />
              </label>
              {form.role === "PPUR" && (
                <label className="block">
                  <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A5851]">TPS (opsional, spesifik PPUR)</span>
                  <Select value={form.tpsId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, tpsId: v === "none" ? "" : v }))}>
                    <SelectTrigger className="mt-1 h-11 rounded-[8px] border-2 border-[#141E19] font-mono text-[13px] font-bold shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Tanpa ikatan TPS —</SelectItem>
                      {(data?.tpsOptions ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id} className="font-mono font-bold">
                          {t.id} — {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              )}
              <label className="block">
                <span className="flex items-center justify-between text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A5851]">
                  Password Awal
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}
                    className="rounded-full border border-[#141E19] bg-[#F2B705] px-2.5 py-0.5 text-[10px] font-extrabold normal-case tracking-normal text-[#141E19] hover:brightness-105"
                  >
                    ACAK ULANG
                  </button>
                </span>
                <Input
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="mt-1 h-11 rounded-[8px] border-2 border-[#141E19] font-mono shadow-none focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
                />
              </label>
              {createError && (
                <p role="alert" className="rounded-[8px] border border-[#E05A47] bg-[#FDE8E5] px-3 py-2 text-[13px] font-semibold text-[#842029]">
                  {createError}
                </p>
              )}
              <div className="flex gap-2.5 pt-1">
                <Button
                  variant="outline"
                  disabled={busy === "create"}
                  onClick={() => setCreateOpen(false)}
                  className="h-12 flex-1 rounded-[10px] border-2 border-[#141E19] bg-white text-[13px] font-extrabold text-[#141E19] shadow-[3px_3px_0px_#141E19] hover:bg-[#F6F4EE]"
                >
                  BATAL
                </Button>
                <Button
                  disabled={busy === "create" || !form.username || !form.fullName || form.password.length < 8}
                  onClick={createOperator}
                  className="h-12 flex-1 rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] text-[13px] font-extrabold text-white shadow-[3px_3px_0px_#141E19] hover:bg-[#176D42] disabled:opacity-50"
                >
                  {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldPlus className="h-4 w-4" />}
                  {busy === "create" ? "MEMBUAT..." : "BUAT AKUN"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ Dialog: sandi sementara hasil reset ============ */}
      <Dialog open={!!resetTarget && !!tempPassword} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="rounded-[14px] border-2 border-[#141E19] bg-white p-0 shadow-[8px_8px_0px_#141E19] sm:max-w-[460px]">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="font-display text-xl font-extrabold text-[#141E19]">Sandi Sementara Diterbitkan</DialogTitle>
              <DialogDescription className="text-[12.5px] text-[#4A5851]">
                Akun <span className="font-mono font-bold">{resetTarget?.username}</span> ({resetTarget?.role}). Sandi ini{" "}
                <strong className="text-[#842029]">hanya tampil sekali</strong> — salin dan sampaikan ke petugas melalui kanal aman.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-[10px] border-2 border-[#141E19] bg-[#F6F4EE] px-4 py-3.5">
              <span className="font-mono text-[16px] font-extrabold tracking-wide text-[#141E19]">{tempPassword}</span>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(tempPassword ?? "");
                  setCopied(true);
                }}
                className="flex h-9 items-center gap-1.5 rounded-full border-2 border-[#141E19] bg-white px-3 text-[11px] font-extrabold text-[#141E19] shadow-[2px_2px_0px_#141E19] hover:-translate-y-0.5"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#1B7F4E]" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "TERSALIN" : "SALIN"}
              </button>
            </div>
            <p className="mt-3 rounded-[10px] border border-dashed border-[#D8D3C8] px-3 py-2.5 text-[12px] leading-relaxed text-[#4A5851]">
              Saat petugas login dengan sandi ini, dialog <strong>ganti sandi</strong> terbuka otomatis dan wajib diisi sebelum sistem dapat dipakai.
              Aksi reset ini tercatat di audit log Panwaslu.
            </p>
            <Button
              onClick={() => {
                setResetTarget(null);
                setTempPassword(null);
              }}
              className="mt-4 h-12 w-full rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] text-[13px] font-extrabold text-white shadow-[3px_3px_0px_#141E19] hover:bg-[#176D42]"
            >
              SAYA SUDAH MENYIMPAN SANDI
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
