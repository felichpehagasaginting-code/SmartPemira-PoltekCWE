// POST /api/auth/logout — Hapus sesi operator + audit log keluar (append-only, FR-08.4)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SESSION_COOKIE, getSession } from "@/lib/server/auth";

export async function POST() {
  try {
    const session = await getSession();
    if (session) {
      await db.auditLog.create({
        data: {
          event: "OPERATOR_LOGOUT",
          detail: `Petugas ${session.fullName} (${session.role}) keluar dari sesi.`,
          tpsId: session.tpsId,
        },
      });
    }
  } catch (e) {
    // Logout tetap berhasil walau audit gagal — jangan biarkan petugas terjebak di sesi.
    console.error("logout audit error", e);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
