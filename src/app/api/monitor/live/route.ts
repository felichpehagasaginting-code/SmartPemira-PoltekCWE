// GET /api/monitor/live — Live Audit Panwaslu (FR-08.1)
// Metrik operasional TPS TANPA membocorkan isi suara.
// RBAC (PRD Bab 3): PANWASLU / SAKSI / KPUM / ITPO.
// Payload dibangun lewat monitor-service bersama (dipakai juga stream SSE).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { buildMonitorPayload } from "@/lib/db/monitor-service";

export async function GET() {
  const gate = await requireRole(["PANWASLU", "SAKSI", "KPUM", "ITPO"]);
  if ("error" in gate) return gate.error;
  try {
    const payload = await buildMonitorPayload();
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Gagal memuat monitor live" }, { status: 500 });
  }
}
