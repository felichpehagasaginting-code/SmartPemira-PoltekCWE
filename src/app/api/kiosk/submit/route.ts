// POST /api/kiosk/submit — Kirim suara via transaksi atomik (Hukum 2)
import { NextRequest, NextResponse } from "next/server";
import { submitBallots } from "@/lib/db/ballot-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? "").trim().toUpperCase();
    const { presmaCandidateId, dpmCandidateId, himaCandidateId } = body?.selections ?? {};

    if (!token || !presmaCandidateId || !dpmCandidateId) {
      return NextResponse.json(
        { ok: false, message: "Payload tidak lengkap: token dan seluruh pilihan institusi wajib ada." },
        { status: 400 }
      );
    }
    // himaCandidateId boleh null (KOTAK KOSONG) — Hukum 3

    const result = await submitBallots(token, {
      presmaCandidateId,
      dpmCandidateId,
      himaCandidateId: himaCandidateId ?? null,
    });

    if (!result.ok) {
      const status =
        result.code === "FROZEN" ? 423 : result.code === "VOTING_CLOSED" ? 423 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, message: "Kesalahan internal saat mengirim suara." }, { status: 500 });
  }
}
