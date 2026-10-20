// GET /api/public/portal — Portal Publik: profil paslon & status tahapan (tanpa data suara)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expireStaleTokens } from "@/lib/db/ballot-service";

export async function GET() {
  try {
    await expireStaleTokens();
    const [setting, candidates, prodis, chains] = await Promise.all([
      db.electionSetting.findUnique({ where: { id: "main" } }),
      db.candidate.findMany({ orderBy: [{ category: "asc" }, { number: "asc" }] }),
      db.studyProgram.findMany({ orderBy: { id: "asc" } }),
      db.tps.findMany({ orderBy: { id: "asc" } }),
    ]);

    const dptTotal = await db.voter.count();
    const voted = await db.voter.count({ where: { hasVoted: true } });

    const portal = candidates
      .filter((c) => !c.isEmptyBox)
      .map((c) => ({
        id: c.id,
        category: c.category,
        studyProgramId: c.studyProgramId,
        number: c.number,
        presidentName: c.presidentName,
        viceName: c.viceName,
        vision: c.vision,
        missions: JSON.parse(c.missionJson || "[]") as string[],
        photoAccent: c.photoAccent,
      }));

    return NextResponse.json({
      appName: "Smart Pemira",
      legalBasis: "Ketetapan DPM No. 005/DPM-CWE/KEP/VII/2024",
      votingOpen: setting?.votingOpen ?? false,
      emergencyFreeze: setting?.emergencyFreeze ?? false,
      plenoUnlocked: setting?.plenoUnlocked ?? false,
      chains: chains.map((t) => ({ id: t.id, name: t.name, location: t.location })),
      stats: { dptTotal, voted, turnoutPct: dptTotal > 0 ? (voted / dptTotal) * 100 : 0 },
      prodis,
      candidates: portal,
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat portal publik" }, { status: 500 });
  }
}
