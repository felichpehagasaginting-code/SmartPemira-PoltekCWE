// ============================================================
// HELPER VALIDASI BODY (Rekomendasi #4) — Zod di boundary API
// Semua endpoint POST memakai readJson():
//  1. Tolak payload > MAX_BODY_BYTES (DoS via body raksasa)
//  2. JSON harus valid
//  3. safeParse schema — error dipetakan per-field dengan kode VALIDATION
// Respons gagal selalu: { ok:false, code:"VALIDATION", message, fields }
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import type { ZodType } from "zod";

export const MAX_BODY_BYTES = 256 * 1024; // 256 KB — import DPT 1000-an baris pun muat

export type ReadJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

function validationResponse(message: string, fields: Record<string, string>): NextResponse {
  return NextResponse.json(
    { ok: false, code: "VALIDATION", message, fields },
    { status: 400 }
  );
}

export async function readJson<T>(req: NextRequest, schema: ZodType<T>): Promise<ReadJsonResult<T>> {
  const declared = req.headers.get("content-length");
  if (declared && Number(declared) > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: validationResponse("Payload terlalu besar.", { _: `Maksimal ${Math.floor(MAX_BODY_BYTES / 1024)} KB.` }),
    };
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: validationResponse("Body bukan JSON yang valid.", { _: "JSON tidak valid." }) };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.length ? issue.path.join(".") : "_";
      if (!fields[key]) fields[key] = issue.message;
    }
    return {
      ok: false,
      response: validationResponse("Payload tidak valid — periksa kolom yang ditandai.", fields),
    };
  }
  return { ok: true, data: parsed.data };
}

/** Versi ringkas untuk dipakai di awal handler: kembalikan data atau error response. */
export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const result = await readJson(req, schema);
  if (!result.ok) throw new BodyValidationError(result.response);
  return result.data;
}

export class BodyValidationError extends Error {
  constructor(public readonly response: NextResponse) {
    super("Body validation failed");
  }
}
