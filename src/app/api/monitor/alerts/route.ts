// ============================================================
// /api/monitor/alerts — Pusat Peringatan operasional (Rekomendasi #7)
// GET  → daftar peringatan aktif hasil evaluator ambang (lib/server/alerts).
// POST {alertId} → ACK prosedural: tercatat append-only di AuditLog
//                  (Panwaslu yang menandai "sedang ditangani").
// RBAC: PANWASLU • KPUM • ITPO (SAKSI melihat monitor, bukan operasional).
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/auth";
import { evaluateAlerts } from "@/lib/server/alerts";

export async function GET() {
  const gate = await requireRole(["PANWASLU", "KPUM", "ITPO"]);
  if ("error" in gate) return gate.error;
  const evaluation = await evaluateAlerts();
  return NextResponse.json({ ok: true, ...evaluation });
}

export async function POST(req: NextRequest) {
  const gate = await requireRole(["PANWASLU", "KPUM", "ITPO"]);
  if ("error" in gate) return gate.error;
  try {
    const body = (await req.json()) as { alertId?: string };
    const alertId = (body.alertId ?? "").trim();
    if (!alertId) return NextResponse.json({ ok: false, message: "alertId wajib." }, { status: 400 });
    const evaluation = await evaluateAlerts();
    const alert = evaluation.alerts.find((a) => a.id === alertId);
    if (!alert) return NextResponse.json({ ok: false, message: "Peringatan tidak ada / sudah reda." }, { status: 404 });
    await db.auditLog.create({
      data: {
        event: "ALERT_ACKNOWLEDGED",
        detail: `ACK peringatan ${alert.id} (${alert.severity}) oleh ${gate.session.fullName} (${gate.session.role}): "${alert.title}".`,
        tpsId: gate.session.tpsId ?? undefined,
      },
    });
    return NextResponse.json({ ok: true, message: `Peringatan ${alert.id} di-ACK — tercatat di audit log.` });
  } catch {
    return NextResponse.json({ ok: false, message: "Gagal meng-ACK peringatan." }, { status: 500 });
  }
}
