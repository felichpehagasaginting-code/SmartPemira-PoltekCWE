// GET pratinjau arsip (tanpa menyegel) — /api/itpo/reset/preview (ITPO)
// Mengembalikan payload arsip lengkap periode lama untuk diunduh SEBELUM
// eksekusi reset, sebagai salinan pribadi penyegel. Pleno wajib terbuka
// (rekap resmi belum ada → pratinjau tidak sah).
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { clientIp, generalLimit } from "@/lib/server/rate-limit";
import { buildArchivePreview, type ResetMode } from "@/lib/db/reset-service";

export async function POST(req: NextRequest) {
  const gate = await requireRole(["ITPO"]);
  if ("error" in gate) return gate.error;
  const session = gate.session;

  const limit = generalLimit(`reset-preview:${session.username}`, 10, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu sering. Coba lagi dalam ${limit.retryAfterSec} detik.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let body: { mode?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body tidak valid." }, { status: 400 });
  }

  const mode: ResetMode = body.mode === "NEW_PERIOD" ? "NEW_PERIOD" : "DEMO";
  const note = (body.note ?? "").trim().slice(0, 300);

  try {
    return NextResponse.json(await buildArchivePreview(session.username, mode, "", note));
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "PLENO_LOCKED") {
      return NextResponse.json(
        { ok: false, code: "PLENO_LOCKED", message: "Pleno masih terkunci — arsip hanya sah setelah kotak suara dibuka." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, message: `Gagal menyusun pratinjau arsip (IP ${clientIp(req.headers)}).` },
      { status: 500 }
    );
  }
}
