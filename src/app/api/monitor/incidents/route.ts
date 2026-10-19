// GET/POST /api/monitor/incidents — Laporan Sengketa (FR-08.2)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
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
