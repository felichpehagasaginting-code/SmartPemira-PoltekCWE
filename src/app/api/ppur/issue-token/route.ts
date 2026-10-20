// POST /api/ppur/issue-token — Penerbitan Token Bilik Suara (FR-04)
// RBAC: hanya PPUR & ITPO (PRD Bab 3). Operator terikat TPS (FR-04.1).
import { NextRequest, NextResponse } from "next/server";
import { issueToken } from "@/lib/db/ballot-service";
import { requireRole } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  const gate = await requireRole(["PPUR", "ITPO"]);
  if ("error" in gate) return gate.error;
  try {
    const body = await req.json();
    const { voterId, note } = body as { voterId?: string; note?: string };
    if (!voterId) {
      return NextResponse.json({ ok: false, message: "voterId wajib diisi" }, { status: 400 });
    }
    const result = await issueToken(voterId, note ?? "");
    if (!result.ok) {
      return NextResponse.json(result, { status: result.code === "FROZEN" ? 423 : 400 });
    }
    return NextResponse.json({
      ok: true,
      token: result.token,
      expiresAt: result.expiresAt.toISOString(),
      tpsId: result.tpsId,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Gagal menerbitkan token" }, { status: 500 });
  }
}
