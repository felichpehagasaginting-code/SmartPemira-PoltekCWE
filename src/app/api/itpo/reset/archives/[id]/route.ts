// GET unduhan arsip final — /api/itpo/reset/archives/[id] (ITPO)
// File JSON utuh isi lembar periode yang disegel: rekap, kanonikal BA,
// tanda tangan, snapshot audit log, sengketa, kandidat, head rantai.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["ITPO"]);
  if ("error" in gate) return gate.error;
  const { id } = await params;

  const archive = await db.electionArchive.findUnique({ where: { id } });
  if (!archive) {
    return NextResponse.json({ ok: false, message: "Arsip tidak ditemukan." }, { status: 404 });
  }

  const full = {
    document: archive.note,
    archiveCode: archive.archiveCode,
    periodLabel: archive.periodLabel,
    mode: archive.mode,
    sealedAt: archive.sealedAt.toISOString(),
    sealedBy: archive.sealedBy,
    note: archive.note,
    signature: archive.signature,
    canonical: archive.canonical,
    chainHeads: JSON.parse(archive.chainHeadsJson || "[]"),
    summary: JSON.parse(archive.summaryJson || "{}"),
    auditLogSnapshot: JSON.parse(archive.auditLogJson || "[]"),
    incidentsSnapshot: JSON.parse(archive.incidentsJson || "[]"),
    candidatesSnapshot: JSON.parse(archive.candidatesJson || "[]"),
    dptCount: archive.dptCount,
    votedCount: archive.votedCount,
    ballotCount: archive.ballotCount,
  };

  const body = JSON.stringify(full, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${archive.archiveCode}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
