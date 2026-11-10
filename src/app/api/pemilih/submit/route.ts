// POST /api/pemilih/submit — Kirim suara via transaksi atomik (Hukum 2)
// Rekomendasi #6: respons memuat struk suara + versi suara (re-vote Estonia).
import { NextRequest, NextResponse } from "next/server";
import { submitBallots } from "@/lib/db/ballot-service";
import { clientIp, campusNatLimit } from "@/lib/server/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? "").trim().toUpperCase();

    // Anti-abuse sadar-NAT kampus:
    // Toleran hingga 300 pengiriman/menit per IP publik kampus, namun maksimal 6 pengiriman/menit per token.
    const limit = campusNatLimit("pemilihsbm", clientIp(req.headers), token, {
      ipLimit: 300,
      tokenLimit: 6,
    });
    if (!limit.allowed) {
      const pesan =
        limit.reason === "TOKEN"
          ? `Pengiriman untuk token ini terlalu cepat. Tunggu ${Math.ceil(limit.retryAfterSec)} detik.`
          : `Trafik pengiriman bilik suara sedang sangat padat. Tunggu ${Math.ceil(limit.retryAfterSec)} detik.`;
      return NextResponse.json(
        { ok: false, message: pesan },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

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
