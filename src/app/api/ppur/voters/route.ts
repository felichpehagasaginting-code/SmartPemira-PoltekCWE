// GET /api/ppur/voters?q=&filter= — Pencarian DPT meja PPUR (FR-02.3)
// RBAC: hanya PPUR & ITPO (PRD Bab 3).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expireStaleTokens } from "@/lib/db/ballot-service";
import { requireRole } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  const gate = await requireRole(["PPUR", "ITPO"]);
  if ("error" in gate) return gate.error;
  try {
    await expireStaleTokens();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const filter = searchParams.get("filter") ?? "ALL";

    const where: Record<string, unknown> = {};
    if (filter !== "ALL") where.status = filter;

    const allVoters = await db.voter.findMany({
      where,
      include: { studyProgram: true },
      orderBy: [{ nim: "asc" }],
      take: q ? 500 : 60,
    });

    const qLower = q.replace(/\s+/g, " ").toLowerCase();
    const voters = qLower
      ? allVoters
          .filter(
            (v) =>
              v.nim.toLowerCase().includes(qLower) ||
              v.name.toLowerCase().includes(qLower)
          )
          .slice(0, 60)
      : allVoters;

    const counts = {
      all: await db.voter.count(),
      belum: await db.voter.count({ where: { status: "BELUM_MEMILIH" } }),
      antrean: await db.voter.count({ where: { status: "DALAM_ANTREAN" } }),
      sudah: await db.voter.count({ where: { status: "SUDAH_MEMILIH" } }),
    };

    return NextResponse.json({
      counts,
      voters: voters.map((v) => ({
        id: v.id,
        nim: v.nim,
        name: v.name,
        angkatan: v.angkatan,
        status: v.status,
        hasVoted: v.hasVoted,
        votedAt: v.votedAt,
        studyProgramId: v.studyProgramId,
        studyProgramName: v.studyProgram.name,
        studyProgramColor: v.studyProgram.colorPrimary,
        studyProgramTint: v.studyProgram.colorTint,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat DPT" }, { status: 500 });
  }
}
