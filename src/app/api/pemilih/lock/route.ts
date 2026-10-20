// POST /api/pemilih/lock — KUNCI SUARA (finalisasi sukarela, anti-paksaan lapis 1)
// Pemilih yang sudah yakin mengunci tokennya: re-vote ditutup permanen.
// Tanpa sesi — autentikasi = kepemilikan token (kredensial anonim).
import { NextRequest, NextResponse } from "next/server";
import { lockBallot } from "@/lib/db/ballot-service";
import { clientIp, generalLimit } from "@/lib/server/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const limit = generalLimit(`pemilihlock:${clientIp(req.headers)}`, 10, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(limit.retryAfterSec)} detik.` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await req.json();
    const token = String(body?.token ?? "").trim().toUpperCase();
    if (token.length !== 6) {
      return NextResponse.json({ ok: false, message: "Token harus 6 karakter." }, { status: 400 });
    }

    const result = await lockBallot(token);
    const status = result.ok ? 200 : result.code === "INVALID_TOKEN" ? 401 : result.code === "REVOKED_TOKEN" ? 403 : 400;
    return NextResponse.json(result, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Kesalahan internal saat mengunci suara." }, { status: 500 });
  }
}
