// GET /api/auth/login-log — Log aktivitas otentikasi operator (append-only dari AuditLog)
// RBAC: hanya PANWASLU / ITPO / KPUM yang berhak melihat (SAKSI ditolak 403 —
// pengamat eksternal tidak berwenang atas log akun internal).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/auth";

const AUTH_EVENTS = [
  "OPERATOR_LOGIN",
  "OPERATOR_LOGIN_FAILED",
  "OPERATOR_LOGOUT",
  "OPERATOR_PASSWORD_CHANGED",
  "OPERATOR_PASSWORD_CHANGE_FAILED",
];

export async function GET() {
  const gate = await requireRole(["PANWASLU", "ITPO", "KPUM"]);
  if ("error" in gate) return gate.error;

  const events = await db.auditLog.findMany({
    where: { event: { in: AUTH_EVENTS } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return NextResponse.json({ ok: true, events });
}
