// ============================================================
// API SEGEL & RESET PEMIRA — /api/itpo/reset (khusus ITPO)
// GET  : status siklus hidup (periode aktif, hitungan, 5 rantai, arsip)
// POST : eksekusi Segel & Reset — arsip ATOMIK bersama penghapusan,
//        re-genesis rantai, rotasi secret sesi.
// Proteksi berlapis: ITPO saja → rate limit → wajib pleno terbuka →
// frasa konfirmasi → sandi akun ITPO sendiri.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, verifyPassword } from "@/lib/server/auth";
import { clientIp, generalLimit } from "@/lib/server/rate-limit";
import { getResetStatus, sealAndReset, type ResetMode } from "@/lib/db/reset-service";

export async function GET() {
  const gate = await requireRole(["ITPO"]);
  if ("error" in gate) return gate.error;
  const status = await getResetStatus();
  return NextResponse.json({ ok: true, status });
}

export async function POST(req: NextRequest) {
  const gate = await requireRole(["ITPO"]);
  if ("error" in gate) return gate.error;
  const session = gate.session;

  let body: { mode?: string; newPeriodLabel?: string; confirmPhrase?: string; password?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "BAD_REQUEST", message: "Body tidak valid." }, { status: 400 });
  }

  const mode = body.mode as ResetMode;
  if (mode !== "DEMO" && mode !== "NEW_PERIOD") {
    return NextResponse.json(
      { ok: false, code: "BAD_MODE", message: "Mode reset tidak dikenal (DEMO / NEW_PERIOD)." },
      { status: 400 }
    );
  }

  const newPeriodLabel = (body.newPeriodLabel ?? "").trim().slice(0, 80);
  if (newPeriodLabel.length < 3) {
    return NextResponse.json(
      { ok: false, code: "BAD_LABEL", message: "Label periode baru wajib diisi (min. 3 karakter)." },
      { status: 400 }
    );
  }

  // Frasa konfirmasi: harus mengetik "RESET PEMIRA" persis (spasi tunggal,
  // tidak peka huruf besar-kecil — frasa tampil jelas di layar).
  const phrase = (body.confirmPhrase ?? "").trim().replace(/\s+/g, " ").toUpperCase();
  if (phrase !== "RESET PEMIRA") {
    await db.auditLog.create({
      data: { event: "ELECTION_RESET_FAILED", detail: `Percobaan segel & reset oleh ${session.username} DITOLAK: frasa konfirmasi salah.` },
    });
    return NextResponse.json(
      { ok: false, code: "BAD_PHRASE", message: "Frasa konfirmasi tidak sesuai. Ketik persis: RESET PEMIRA" },
      { status: 400 }
    );
  }

  // Sandi akun ITPO sendiri — verifikasi scrypt timing-safe
  const operator = await db.operator.findUnique({ where: { id: session.operatorId } });
  if (!operator || !body.password || !verifyPassword(body.password, operator.passwordHash)) {
    await db.auditLog.create({
      data: { event: "ELECTION_RESET_FAILED", detail: `Percobaan segel & reset oleh ${session.username} DITOLAK: verifikasi sandi gagal (IP ${clientIp(req.headers)}).` },
    });
    return NextResponse.json(
      { ok: false, code: "BAD_PASSWORD", message: "Sandi akun ITPO salah. Segel & reset dibatalkan." },
      { status: 403 }
    );
  }

  // Rate limit EKSEKUSI: maks 5 pengecoran segel / 10 menit per akun ITPO.
  // Slot hanya terpakai ketika seluruh validasi lolos (percobaan gagal
  // tidak menghabiskan jatah, tapi tetap tercatat di audit log di atas).
  const limit = generalLimit(`reset-exec:${session.username}`, 5, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", message: `Terlalu banyak eksekusi reset. Coba lagi dalam ${limit.retryAfterSec} detik.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const result = await sealAndReset({
    mode,
    newPeriodLabel,
    note: (body.note ?? "").trim().slice(0, 300),
    sealedBy: session.username,
  });

  if (!result.ok) {
    await db.auditLog.create({
      data: { event: "ELECTION_RESET_FAILED", detail: `Percobaan segel & reset oleh ${session.username} DITOLAK: ${result.code}.` },
    });
    const status = result.code === "PLENO_LOCKED" ? 409 : 400;
    return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status });
  }

  return NextResponse.json({
    ok: true,
    archiveId: result.archiveId,
    archiveCode: result.archiveCode,
    closedPeriodLabel: result.closedPeriodLabel,
    newPeriodLabel: result.newPeriodLabel,
    message: result.message,
    postCounts: result.postCounts,
    archiveDownloadUrl: result.archiveId ? `/api/itpo/reset/archives/${result.archiveId}` : null,
  });
}
