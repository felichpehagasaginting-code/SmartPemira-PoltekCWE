// POST /api/ppur/revoke — Pencabutan token & pemulihan hak pilih (anti-paksaan lapis 3)
// Kasus khusus di pos bantuan: HP hilang / pemilih dipaksa / token terkontaminasi.
// Alur: petugas meminta slip token lama yang diserahkan pemilih (setelah cek KTM),
// mencabut token (→ REVOKED, seluruh bloknya dikecualikan rekap), lalu opsional
// memulihkan hak pilih agar token baru dapat diterbitkan.
// Sistem sengaja TIDAK menyimpan jembatan identitas→token (Hukum 1) —
// karena itu slip fisik adalah satu-satunya cara menemukan token lama.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/auth";
import { revokeTokenByCode, resetVoterRights } from "@/lib/db/ballot-service";

export async function POST(req: NextRequest) {
  const gate = await requireRole(["PPUR", "ITPO"]);
  if ("error" in gate) return gate.error;

  try {
    const body = await req.json();
    const token = String(body?.token ?? "").trim().toUpperCase();
    const voterId = body?.voterId ? String(body.voterId) : null;
    const note = String(body?.note ?? "").slice(0, 200);
    const resetRights = Boolean(body?.resetRights);

    if (token.length !== 6) {
      return NextResponse.json({ ok: false, message: "Kode token lama harus 6 karakter." }, { status: 400 });
    }

    const revoke = await revokeTokenByCode(token, note);
    if (!revoke.ok) {
      const status = revoke.code === "INVALID_TOKEN" ? 401 : 409;
      return NextResponse.json(revoke, { status });
    }

    let reset: { ok: boolean; message: string } | null = null;
    if (resetRights && voterId) {
      reset = await resetVoterRights(voterId);
    }

    return NextResponse.json({
      ok: true,
      message: reset
        ? `Token dicabut & hak pilih dipulihkan. ${reset.message}`
        : "Token berhasil dicabut. Seluruh suara token ini dibatalkan dari rekapitulasi.",
      reset,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Kesalahan internal saat mencabut token." }, { status: 500 });
  }
}

// GET — daftar token terakhir yang dicabut (untuk kartu audit PPUR)
export async function GET() {
  const gate = await requireRole(["PPUR", "ITPO"]);
  if ("error" in gate) return gate.error;
  const revoked = await db.auditLog.findMany({
    where: { event: { in: ["TOKEN_REVOKED", "HAK_PILIH_DIPULIHKAN", "BALLOT_SELF_LOCKED"] } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ ok: true, events: revoked });
}
