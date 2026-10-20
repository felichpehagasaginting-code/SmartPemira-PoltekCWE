// GET /api/admin/overview — Dashboard KPUM: DPT, kandidat, log, berita acara (FR-01..FR-03, FR-07)
// RBAC: hanya KPUM & ITPO (PRD Bab 3).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expireStaleTokens } from "@/lib/db/ballot-service";
import { requireRole } from "@/lib/server/auth";

export async function GET() {
  const gate = await requireRole(["KPUM", "ITPO"]);
  if ("error" in gate) return gate.error;
  try {
    await expireStaleTokens();
    const [setting, candidates, prodis, chains] = await Promise.all([
      db.electionSetting.findUnique({ where: { id: "main" } }),
      db.candidate.findMany({ orderBy: [{ category: "asc" }, { number: "asc" }] }),
      db.studyProgram.findMany({ orderBy: { id: "asc" } }),
      db.tps.findMany({ orderBy: { id: "asc" } }),
    ]);

    const [dptTotal, sudah, antrean, belum, tokenUsed, ballots, logs] = await Promise.all([
      db.voter.count(),
      db.voter.count({ where: { status: "SUDAH_MEMILIH" } }),
      db.voter.count({ where: { status: "DALAM_ANTREAN" } }),
      db.voter.count({ where: { status: "BELUM_MEMILIH" } }),
      db.votingToken.count({ where: { status: "USED" } }),
      db.ballotBox.count(),
      db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    ]);

    const voters = await db.voter.findMany({
      include: { studyProgram: true },
      orderBy: { nim: "asc" },
      take: 200,
    });

    return NextResponse.json({
      settings: {
        votingOpen: setting?.votingOpen ?? false,
        emergencyFreeze: setting?.emergencyFreeze ?? false,
        plenoUnlocked: setting?.plenoUnlocked ?? false,
        plenoUnlockedAt: setting?.plenoUnlockedAt?.toISOString() ?? null,
      },
      chains: chains.map((t) => ({ id: t.id, name: t.name, location: t.location, lastChainHash: t.lastChainHash })),
      stats: { dptTotal, sudah, antrean, belum, tokenUsed, ballots },
      candidates: candidates.map((c) => ({
        id: c.id,
        category: c.category,
        studyProgramId: c.studyProgramId,
        number: c.number,
        presidentName: c.presidentName,
        viceName: c.viceName,
        vision: c.vision,
        missions: JSON.parse(c.missionJson || "[]") as string[],
        photoAccent: c.photoAccent,
        isEmptyBox: c.isEmptyBox,
      })),
      prodis,
      voters: voters.map((v) => ({
        id: v.id,
        nim: v.nim,
        name: v.name,
        angkatan: v.angkatan,
        status: v.status,
        studyProgramId: v.studyProgramId,
        studyProgramName: v.studyProgram.name,
      })),
      logs,
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat overview admin" }, { status: 500 });
  }
}
