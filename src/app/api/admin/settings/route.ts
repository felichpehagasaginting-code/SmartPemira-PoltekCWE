// POST /api/admin/settings — Toggle tahapan eleksi (FR-01.1, FR-01.2, Hukum 5)
// RBAC (PRD Bab 3): TOGGLE_VOTING & TOGGLE_FREEZE → KPUM / ITPO.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  const gate = await requireRole(["KPUM", "ITPO"]);
  if ("error" in gate) return gate.error;
  try {
    const body = await req.json();
    const { action } = body as { action?: string };

    const setting = await db.electionSetting.findUnique({ where: { id: "main" } });
    if (!setting) {
      return NextResponse.json({ ok: false, message: "Konfigurasi eleksi belum siap." }, { status: 400 });
    }

    let message = "";
    switch (action) {
      case "TOGGLE_FREEZE": {
        // FR-01.2: Emergency Freeze adalah kewenangan Super Admin (ITPO),
        // atas instruksi Panwaslu/KPUM — KPUM tetap dapat mengeksekusi.
        const next = !setting.emergencyFreeze;
        await db.electionSetting.update({ where: { id: "main" }, data: { emergencyFreeze: next } });
        await db.auditLog.create({
          data: {
            event: next ? "EMERGENCY_FREEZE_ON" : "EMERGENCY_FREEZE_OFF",
            detail: next
              ? "EMERGENCY FREEZE diaktifkan oleh Super Admin atas instruksi Panwaslu/KPUM. Penerbitan token & pengiriman suara dihentikan sementara (FR-01.2)."
              : "EMERGENCY FREEZE dicabut. Operasional pemungutan suara dilanjutkan.",
          },
        });
        message = next ? "EMERGENCY FREEZE diaktifkan." : "EMERGENCY FREEZE dicabut.";
        break;
      }
      case "TOGGLE_VOTING": {
        if (setting.plenoUnlocked) {
          return NextResponse.json(
            { ok: false, message: "Pleno telah dibuka — status pemungutan tidak dapat diubah lagi." },
            { status: 409 }
          );
        }
        const next = !setting.votingOpen;
        await db.electionSetting.update({ where: { id: "main" }, data: { votingOpen: next } });
        await db.auditLog.create({
          data: {
            event: next ? "VOTING_OPENED" : "VOTING_CLOSED",
            detail: next
              ? "Pemungutan suara dibuka oleh KPUM. Penerbitan token di meja PPUR diaktifkan."
              : "Pemungutan suara ditutup oleh KPUM. Penerbitan token otomatis terkunci (PRD 5.3.1).",
          },
        });
        message = next ? "Pemungutan suara dibuka." : "Pemungutan suara ditutup.";
        break;
      }
      default:
        return NextResponse.json({ ok: false, message: "Aksi tidak dikenal." }, { status: 400 });
    }

    const updated = await db.electionSetting.findUnique({ where: { id: "main" } });
    return NextResponse.json({ ok: true, message, settings: updated });
  } catch {
    return NextResponse.json({ ok: false, message: "Gagal mengubah pengaturan." }, { status: 500 });
  }
}
