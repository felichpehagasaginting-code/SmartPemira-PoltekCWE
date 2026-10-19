// GET /api/tally — HUKUM 5: 423 Locked selama pemungutan suara berlangsung
import { NextResponse } from "next/server";
import { getTallyReport } from "@/lib/db/tally-service";

export async function GET() {
  const report = await getTallyReport();
  if (!report.unlocked) {
    return NextResponse.json(
      {
        locked: true,
        message:
          "Kotak suara digital terkunci (Pleno Vault). Hasil hanya dapat didekripsi setelah aksi Pleno Unlocking oleh Ketua KPUM (FR-06.3).",
        integrity: report.integrity,
      },
      { status: 423, headers: { "Retry-After": "300" } }
    );
  }
  return NextResponse.json({ locked: false, ...report });
}
