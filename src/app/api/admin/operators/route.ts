// ============================================================
// API MANAJEMEN OPERATOR — Rekomendasi #2 (khusus ITPO)
// GET  : daftar akun + statistik
// POST : buat akun baru (RBAC provisioning)
// PATCH via /operators/[id]  : aktif/nonaktif, ubah peran/nama
// Reset sandi via /operators/[id]/reset-password
// Semua aksi tercatat di AuditLog append-only.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, requireRole, type Role } from "@/lib/server/auth";
import { generalLimit } from "@/lib/server/rate-limit";

const VALID_ROLES: Role[] = ["KPUM", "PPUR", "PANWASLU", "SAKSI", "ITPO"];

export async function GET() {
  const gate = await requireRole(["ITPO"]);
  if ("error" in gate) return gate.error;

  const [operators, tps] = await Promise.all([
    db.operator.findMany({
      orderBy: [{ role: "asc" }, { username: "asc" }],
      select: {
        id: true,
        username: true,
        role: true,
        fullName: true,
        tpsId: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    db.tps.findMany({ select: { id: true, name: true } }),
  ]);

  return NextResponse.json({ ok: true, operators, tpsOptions: tps });
}

export async function POST(req: NextRequest) {
  const gate = await requireRole(["ITPO"]);
  if ("error" in gate) return gate.error;

  // Anti-abuse: maks 10 pembuatan akun per menit
  const limit = generalLimit(`opcreate:${gate.session.operatorId}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, message: "Terlalu sering membuat akun. Tunggu sejenak." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const username = String(body?.username ?? "").trim().toLowerCase();
    const fullName = String(body?.fullName ?? "").trim();
    const role = String(body?.role ?? "") as Role;
    const password = String(body?.password ?? "");
    const tpsId = body?.tpsId ? String(body.tpsId) : null;

    if (!/^[a-z0-9_.-]{3,24}$/.test(username)) {
      return NextResponse.json(
        { ok: false, message: "Username 3-24 karakter, hanya huruf kecil/angka/._-." },
        { status: 400 }
      );
    }
    if (!fullName || fullName.length > 80) {
      return NextResponse.json({ ok: false, message: "Nama lengkap wajib diisi (maks 80 karakter)." }, { status: 400 });
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ ok: false, message: `Peran tidak valid. Pilihan: ${VALID_ROLES.join(", ")}.` }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, message: "Password awal minimal 8 karakter." }, { status: 400 });
    }
    if (role === "PPUR" && tpsId) {
      const tps = await db.tps.findUnique({ where: { id: tpsId } });
      if (!tps) return NextResponse.json({ ok: false, message: "TPS tidak ditemukan." }, { status: 400 });
    }

    const exists = await db.operator.findUnique({ where: { username } });
    if (exists) {
      return NextResponse.json({ ok: false, message: `Username "${username}" sudah digunakan.` }, { status: 409 });
    }

    const created = await db.operator.create({
      data: { username, fullName, role, tpsId, passwordHash: hashPassword(password), isActive: true },
    });
    await db.auditLog.create({
      data: {
        event: "OPERATOR_CREATED",
        detail: `ITPO (${gate.session.username}) membuat akun operator baru: ${created.fullName} — ${created.username}/${created.role}${created.tpsId ? ` @${created.tpsId}` : ""}.`,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Akun ${created.username} berhasil dibuat dengan peran ${created.role}.`,
      operator: { id: created.id, username: created.username, role: created.role, fullName: created.fullName },
    });
  } catch (e) {
    console.error("operator create error", e);
    return NextResponse.json({ ok: false, message: "Kesalahan server saat membuat akun." }, { status: 500 });
  }
}
