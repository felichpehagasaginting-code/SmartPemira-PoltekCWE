// GET/POST /api/monitor/incidents — Laporan Sengketa (FR-08.2)
// RBAC (PRD Bab 3): GET → PANWASLU/SAKSI/KPUM/ITPO; POST (bikin laporan) → PANWASLU/ITPO.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/auth";

export async function GET() {
  const gate = await requireRole(["PANWASLU", "SAKSI", "KPUM", "ITPO"]);
  if ("error" in gate) return gate.error;
  try {
    const incidents = await db.electionIncident.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ incidents });
  } catch {
    return NextResponse.json({ error: "Gagal memuat laporan" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireRole(["PANWASLU", "ITPO"]);
  if ("error" in gate) return gate.error;
  try {
    const body = await req.json();
    const { reporterName, reporterNim, incidentType, location, description } = body ?? {};
    if (!reporterName || !incidentType || !location || !description) {
      return NextResponse.json({ ok: false, message: "Field wajib belum lengkap." }, { status: 400 });
    }
    const ticketNumber = `SPR-2026-${String(Date.now()).slice(-6)}`;
    const incident = await db.electionIncident.create({
      data: {
        ticketNumber,
        reporterName,
        reporterNim: reporterNim ?? "-",
        incidentType,
        location,
        description,
        status: "SUBMITTED",
      },
    });
    await db.auditLog.create({
      data: {
        event: "INCIDENT_REPORTED",
        detail: `Laporan sengketa baru ${ticketNumber} (${incidentType}) dilaporkan oleh ${reporterName}.`,
      },
    });
    return NextResponse.json({ ok: true, incident });
  } catch {
    return NextResponse.json({ ok: false, message: "Gagal menyimpan laporan." }, { status: 500 });
  }
}
