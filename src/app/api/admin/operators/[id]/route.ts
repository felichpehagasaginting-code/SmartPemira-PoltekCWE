// PATCH /api/admin/operators/[id] — Aktif/nonaktifkan, ubah peran/nama/TPS (ITPO)
// Guard anti-lockout: ITPO tidak boleh menonaktifkan akunnya sendiri.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, type Role } from "@/lib/server/auth";

const VALID_ROLES: Role[] = ["KPUM", "PPUR", "PANWASLU", "SAKSI", "ITPO"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["ITPO"]);
  if ("error" in gate) return gate.error;
  const { id } = await params;

  try {
    const body = await req.json();
    const target = await db.operator.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ ok: false, message: "Akun operator tidak ditemukan." }, { status: 404 });
    }

    const data: { isActive?: boolean; role?: Role; fullName?: string; tpsId?: string | null } = {};
    const changes: string[] = [];

    if (typeof body?.isActive === "boolean") {
      if (target.id === gate.session.operatorId && body.isActive === false) {
        return NextResponse.json(
          { ok: false, message: "Anda tidak dapat menonaktifkan akun sendiri (anti-lockout)." },
          { status: 400 }
        );
      }
      if (body.isActive !== target.isActive) {
        data.isActive = body.isActive;
        changes.push(body.isActive ? "diaktifkan" : "dinonaktifkan");
      }
    }

    if (typeof body?.role === "string" && body.role !== target.role) {
      if (target.id === gate.session.operatorId) {
        return NextResponse.json(
          { ok: false, message: "Anda tidak dapat mengubah peran akun sendiri (anti-lockout)." },
          { status: 400 }
        );
      }
      if (!VALID_ROLES.includes(body.role as Role)) {
        return NextResponse.json({ ok: false, message: "Peran tidak valid." }, { status: 400 });
      }
      data.role = body.role as Role;
      changes.push(`peran ${target.role} → ${body.role}`);
    }

    if (typeof body?.fullName === "string" && body.fullName.trim() && body.fullName.trim() !== target.fullName) {
      data.fullName = body.fullName.trim().slice(0, 80);
      changes.push("nama diperbarui");
    }

    if ("tpsId" in (body ?? {})) {
      const tpsId = body.tpsId ? String(body.tpsId) : null;
      if (tpsId !== target.tpsId) {
        data.tpsId = tpsId;
        changes.push(`TPS ${target.tpsId ?? "-"} → ${tpsId ?? "-"}`);
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, message: "Tidak ada perubahan yang dikirim." }, { status: 400 });
    }

    const updated = await db.operator.update({ where: { id }, data });
    await db.auditLog.create({
      data: {
        event: "OPERATOR_UPDATED",
        detail: `ITPO (${gate.session.username}) mengubah akun ${updated.username}: ${changes.join(", ")}.`,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Akun ${updated.username} diperbarui: ${changes.join(", ")}.`,
    });
  } catch (e) {
    console.error("operator patch error", e);
    return NextResponse.json({ ok: false, message: "Kesalahan server saat memperbarui akun." }, { status: 500 });
  }
}
