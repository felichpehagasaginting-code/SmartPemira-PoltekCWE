// POST /api/auth/login — Otentikasi operator (RBAC PRD Bab 3)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSessionCookiePayload, SESSION_COOKIE, SESSION_COOKIE_OPTIONS, verifyPassword, type Role } from "@/lib/server/auth";

const VALID_ROLES: Role[] = ["KPUM", "PPUR", "PANWASLU", "SAKSI", "ITPO"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body as { username?: string; password?: string };
    if (!username || !password) {
      return NextResponse.json({ ok: false, message: "Username dan password wajib diisi." }, { status: 400 });
    }

    const operator = await db.operator.findUnique({ where: { username: username.trim().toLowerCase() } });
    if (!operator || !operator.isActive || !verifyPassword(password, operator.passwordHash)) {
      return NextResponse.json(
        { ok: false, message: "Kredensial tidak valid. Periksa username/password petugas." },
        { status: 401 }
      );
    }

    const sessionPayload = await createSessionCookiePayload({
      operatorId: operator.id,
      username: operator.username,
      role: (VALID_ROLES.includes(operator.role as Role) ? operator.role : "ITPO") as Role,
      fullName: operator.fullName,
      tpsId: operator.tpsId,
    });

    await db.operator.update({ where: { id: operator.id }, data: { lastLoginAt: new Date() } });
    await db.auditLog.create({
      data: {
        event: "OPERATOR_LOGIN",
        detail: `Petugas ${operator.fullName} (${operator.role}) login melalui portal modul.`,
        tpsId: operator.tpsId,
      },
    });

    const res = NextResponse.json({
      ok: true,
      operator: { username: operator.username, role: operator.role, fullName: operator.fullName, tpsId: operator.tpsId },
    });
    res.cookies.set(SESSION_COOKIE, sessionPayload, SESSION_COOKIE_OPTIONS);
    return res;
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ ok: false, message: "Kesalahan server saat login." }, { status: 500 });
  }
}
