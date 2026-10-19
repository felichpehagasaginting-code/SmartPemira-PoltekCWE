// GET /api/monitor/live — Live Audit Panwaslu (FR-08.1)
// Metrik operasional TPS TANPA membocorkan isi suara.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expireStaleTokens } from "@/lib/db/ballot-service";
import { verifyChain } from "@/lib/crypto/ballot-hash-chain";

export async function GET() {
  try {
    await expireStaleTokens();
    const [setting, tps] = await Promise.all([
      db.electionSetting.findUnique({ where: { id: "main" } }),
      db.tps.findFirst(),
    ]);

    const [dptTotal, sudah, antrean, belum, tokenAktif, tokenUsed, tokenExpired, ballots] =
      await Promise.all([
        db.voter.count(),
        db.voter.count({ where: { status: "SUDAH_MEMILIH" } }),
        db.voter.count({ where: { status: "DALAM_ANTREAN" } }),
        db.voter.count({ where: { status: "BELUM_MEMILIH" } }),
        db.votingToken.count({ where: { status: "ACTIVE", expiresAt: { gt: new Date() } } }),
        db.votingToken.count({ where: { status: "USED" } }),
        db.votingToken.count({ where: { status: "EXPIRED" } }),
        db.ballotBox.findMany({
          where: { tpsId: tps?.id },
          orderBy: { createdAt: "asc" },
          select: {
            id: true, category: true, candidateId: true, isEmptyBox: true,
            createdAt: true, ballotHash: true,
          },
        }),
      ]);

    const integrity = verifyChain(
      ballots,
      tps?.chainSalt ?? "",
      tps?.lastChainHash ?? ""
    );

    // Laju kedatangan per jam (berdasarkan voted_at pemilih, bukan isi suara)
    const votersVoted = await db.voter.findMany({
      where: { hasVoted: true },
      select: { votedAt: true },
    });
    const hourly = new Map<number, number>();
    for (const v of votersVoted) {
      if (!v.votedAt) continue;
      const h = v.votedAt.getHours();
      hourly.set(h, (hourly.get(h) ?? 0) + 1);
    }
    const attendanceByHour = Array.from(hourly.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({
      kpis: {
        dptTotal,
        sudahMemilih: sudah,
        dalamAntrean: antrean,
        belumMemilih: belum,
        turnoutPct: dptTotal > 0 ? (sudah / dptTotal) * 100 : 0,
        tokenAktif,
        tokenUsed,
        tokenExpired,
        ballotsCount: ballots.length,
      },
      votingOpen: setting?.votingOpen ?? false,
      emergencyFreeze: setting?.emergencyFreeze ?? false,
      plenoUnlocked: setting?.plenoUnlocked ?? false,
      integrity: {
        valid: integrity.valid,
        checkedCount: integrity.checkedCount,
        brokenAtIndex: integrity.brokenAtIndex,
        headHash: tps?.lastChainHash ?? "",
      },
      attendanceByHour,
      logs,
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat monitor live" }, { status: 500 });
  }
}
