// ============================================================
// API TRIASE SENGKETA PANWASLU — SMART PEMIRA POLTEK CWE
// POST /api/panwaslu/triage
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/server/auth";
import { triageIncident, IncidentTriageInput } from "@/lib/ai/panwaslu-triage";

export async function POST(req: NextRequest) {
  try {
    // Verifikasi Otorisasi: Petugas PANWASLU/ITPO/KPUM/SAKSI atau internal service secret
    const isTest = process.env.NODE_ENV === "test";
    const internalSecret = process.env.INTERNAL_API_SECRET;
    const internalHeader = req.headers.get("x-internal-triage");
    const isInternalAuth = Boolean(internalSecret && internalHeader === internalSecret);
    
    if (!isTest && !isInternalAuth) {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ ok: false, error: "Sesi tidak valid atau telah berakhir." }, { status: 401 });
      }
      const allowedRoles = ["PANWASLU", "ITPO", "KPUM", "SAKSI"];
      if (!allowedRoles.includes(session.role)) {
        return NextResponse.json({ ok: false, error: "Akses ditolak: Hanya Panwaslu/ITPO yang berhak mengakses triase." }, { status: 403 });
      }
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Format request tidak valid: JSON body diperlukan." },
        { status: 400 }
      );
    }

    const {
      incidentId,
      ticketNumber,
      title,
      description,
      location,
      reporterRole,
      reporterNim,
      saveVerdict = false,
    } = body ?? {};

    let inputData: IncidentTriageInput;
    let targetIncident: any = null;

    if (incidentId || ticketNumber) {
      targetIncident = await db.electionIncident.findFirst({
        where: incidentId ? { id: incidentId } : { ticketNumber },
      });
      if (!targetIncident) {
        return NextResponse.json(
          { ok: false, error: "Laporan insiden dengan ID atau nomor tiket tersebut tidak ditemukan." },
          { status: 404 }
        );
      }
      inputData = {
        title: title || `Tiket ${targetIncident.ticketNumber}`,
        description: description || targetIncident.description,
        location: location || targetIncident.location,
        reporterRole: reporterRole || "PELAPOR",
        reporterNim: reporterNim || targetIncident.reporterNim,
      };
    } else {
      if (!description || typeof description !== "string" || description.trim().length === 0) {
        return NextResponse.json(
          { ok: false, error: "Deskripsi insiden wajib diisi untuk melakukan triase AI." },
          { status: 400 }
        );
      }
      inputData = {
        title,
        description,
        location,
        reporterRole,
        reporterNim,
      };
    }

    // Eksekusi Triase AI (System One Primitives: Choice, Score, Noul)
    const report = await triageIncident(inputData);

    // Jika terkait tiket insiden dan diminta simpan putusan / rekomendasi
    if (targetIncident && (saveVerdict || !targetIncident.verdict)) {
      const verdictText = `[TRIASE AI: ${report.classification.value} | Skor ${report.severity.score}/5.0 (${report.severity.level})] Rekomendasi Freeze: ${report.freezeRecommendation.requiresEmergencyFreeze ? "YA" : "TIDAK"}. ${report.recommendedAction}`;
      
      await db.electionIncident.update({
        where: { id: targetIncident.id },
        data: {
          verdict: verdictText,
          status: report.freezeRecommendation.requiresEmergencyFreeze ? "IN_REVIEW" : targetIncident.status,
        },
      });

      await db.auditLog.create({
        data: {
          event: "INCIDENT_TRIAGED",
          detail: `Triase AI dijalankan untuk tiket ${targetIncident.ticketNumber}: Kategori ${report.classification.value}, Skor ${report.severity.score}, Freeze=${report.freezeRecommendation.requiresEmergencyFreeze}.`,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      triage: report,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Terjadi kesalahan internal saat memproses triase sengketa." },
      { status: 500 }
    );
  }
}
