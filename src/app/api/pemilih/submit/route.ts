// POST /api/pemilih/submit — Kirim suara via transaksi atomik (Hukum 2)
// Rekomendasi #6: respons memuat struk suara + versi suara (re-vote Estonia).
import { NextRequest, NextResponse } from "next/server";
import { submitBallots } from "@/lib/db/ballot-service";
import { clientIp, generalLimit } from "@/lib/server/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Anti-abuse: maks 20 pengiriman suara/menit per IP (Rekomendasi #1)
    const limit = generalLimit(`pemilihsbm:${clientIp(req.headers)}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, message: `Terlalu banyak pengiriman. Coba lagi dalam ${Math.ceil(limit.retryAfterSec)} detik.` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await req.json();
    const token = String(body?.token ?? "").trim().toUpperCase();
    const { presmaCandidateId, dpmCandidateId, himaCandidateId } = body?.selections ?? {};

    // Setiap kategori wajib punya pilihan EKSPLISIT: id paslon ATAU null (SUARA KOSONG).
    if (
      !token ||
      typeof presmaCandidateId === "undefined" ||
      typeof dpmCandidateId === "undefined" ||
      typeof himaCandidateId === "undefined"
    ) {
      return NextResponse.json(
        { ok: false, message: "Payload tidak lengkap: pilih satu paslon ATAU Suara Kosong untuk setiap organisasi (DPM, BEM, HIMA)." },
        { status: 400 }
      );
    }

    const result = await submitBallots(token, {
      presmaCandidateId: presmaCandidateId ? String(presmaCandidateId) : null,
      dpmCandidateId: dpmCandidateId ? String(dpmCandidateId) : null,
      himaCandidateId: himaCandidateId ? String(himaCandidateId) : null,
    });

    if (!result.ok) {
      const status =
        result.code === "FROZEN" || result.code === "VOTING_CLOSED"
          ? 423
          : result.code === "LOCKED_TOKEN" || result.code === "REVOKED_TOKEN"
            ? 403
            : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, message: "Kesalahan internal saat mengirim suara." }, { status: 500 });
  }
}
