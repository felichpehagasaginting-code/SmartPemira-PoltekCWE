// GET /api/auth/me — Sesi operator aktif (untuk shell & gate RBAC)
import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: true, authenticated: false });
  return NextResponse.json({
    ok: true,
    authenticated: true,
    operator: {
      username: session.username,
      role: session.role,
      fullName: session.fullName,
      tpsId: session.tpsId,
      exp: session.exp,
    },
  });
}
