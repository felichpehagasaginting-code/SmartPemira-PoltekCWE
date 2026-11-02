// GET /api/ppur/turnout — Dasbor Turnout & Antrean (Rekomendasi #9)
// Senjata mobilisasi meja PPUR/KPUM saat hari-H: turnout per prodi/angkatan,
// momentum suara per menit, prediksi mencapai 80% partisipasi, dan antrean
// per TPS virtual — semuanya dari agregat DB yang sudah ada, tanpa tabel baru.
// RBAC: PPUR, KPUM, PANWASLU, ITPO (SAKSI tidak — data turnout berdimensi politik).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/auth";
import type { TurnoutAngkatanRow, TurnoutBucket, TurnoutProdiRow, TurnoutResponse, TurnoutTpsRow } from "@/lib/types";

function pct(voted: number, dpt: number): number {
  return dpt > 0 ? Math.round((voted / dpt) * 1000) / 10 : 0;
}

export async function GET() {
  const gate = await requireRole(["PPUR", "KPUM", "PANWASLU", "ITPO"]);
  if ("error" in gate) return gate.error;

  try {
    const [
      prodis,
      tpsRows,
      allByProdi,
      votedByProdi,
      antreByProdi,
      allByAngkatan,
      votedByAngkatan,
      allByTps,
      votedByTps,
      antreByTps,
      votedAtRows,
    ] = await Promise.all([
      db.studyProgram.findMany({ orderBy: { id: "asc" } }),
      db.tps.findMany({ orderBy: { id: "asc" } }),
      db.voter.groupBy({ by: ["studyProgramId"], _count: { _all: true } }),
      db.voter.groupBy({ by: ["studyProgramId"], _count: { _all: true }, where: { hasVoted: true } }),
      db.voter.groupBy({ by: ["studyProgramId"], _count: { _all: true }, where: { status: "DALAM_ANTREAN" } }),
      db.voter.groupBy({ by: ["angkatan"], _count: { _all: true } }),
      db.voter.groupBy({ by: ["angkatan"], _count: { _all: true }, where: { hasVoted: true } }),
      db.voter.groupBy({ by: ["tpsId"], _count: { _all: true } }),
      db.voter.groupBy({ by: ["tpsId"], _count: { _all: true }, where: { hasVoted: true } }),
      db.voter.groupBy({ by: ["tpsId"], _count: { _all: true }, where: { status: "DALAM_ANTREAN" } }),
      db.voter.findMany({ where: { hasVoted: true, votedAt: { not: null } }, select: { votedAt: true } }),
    ]);

    const countMap = <K extends string | number>(rows: Array<{ _count: { _all: number } } & Record<string, unknown>>, key: string): Map<K, number> =>
      new Map(rows.map((r) => [r[key] as K, r._count._all]));

    const allP = countMap<string>(allByProdi, "studyProgramId");
    const votedP = countMap<string>(votedByProdi, "studyProgramId");
    const antreP = countMap<string>(antreByProdi, "studyProgramId");

    const perProdi: TurnoutProdiRow[] = prodis.map((p) => {
      const dpt = allP.get(p.id) ?? 0;
      const voted = votedP.get(p.id) ?? 0;
      return {
        id: p.id,
        name: p.name,
        facultyName: p.facultyName,
        dpt,
        voted,
        antrean: antreP.get(p.id) ?? 0,
        pct: pct(voted, dpt),
      };
    });

    const allA = countMap<number>(allByAngkatan, "angkatan");
    const votedA = countMap<number>(votedByAngkatan, "angkatan");
    const perAngkatan: TurnoutAngkatanRow[] = [...allA.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([angkatan, dpt]) => {
        const voted = votedA.get(angkatan) ?? 0;
        return { angkatan, dpt, voted, pct: pct(voted, dpt) };
      });

    const allT = countMap<string>(allByTps, "tpsId");
    const votedT = countMap<string>(votedByTps, "tpsId");
    const antreT = countMap<string>(antreByTps, "tpsId");
    const perTps: TurnoutTpsRow[] = tpsRows.map((t) => {
      const dpt = allT.get(t.id) ?? 0;
      const voted = votedT.get(t.id) ?? 0;
      return {
        id: t.id,
        name: t.name,
        dpt,
        voted,
        antrean: antreT.get(t.id) ?? 0,
        pct: pct(voted, dpt),
      };
    });

    // ---------- Timeline 15 menit (6 jam terakhir) + momentum ----------
    const BUCKET_MS = 15 * 60_000;
    const WINDOW_MS = 6 * 60 * 60_000;
    const now = Date.now();
    const windowStart = Math.floor((now - WINDOW_MS) / BUCKET_MS) * BUCKET_MS;
    const bucketCount = Math.ceil(WINDOW_MS / BUCKET_MS);
    const buckets = new Map<number, number>();
    for (const row of votedAtRows) {
      const t = row.votedAt?.getTime() ?? 0;
      if (t >= windowStart && t <= now) {
        const idx = Math.floor((t - windowStart) / BUCKET_MS);
        buckets.set(idx, (buckets.get(idx) ?? 0) + 1);
      }
    }
    const timeline: TurnoutBucket[] = Array.from({ length: bucketCount }, (_, i) => {
      const ts = new Date(windowStart + i * BUCKET_MS);
      return {
        label: `${String(ts.getHours()).padStart(2, "0")}:${String(ts.getMinutes()).padStart(2, "0")}`,
        voted: buckets.get(i) ?? 0,
      };
    });

    const totalDpt = [...allP.values()].reduce((s, v) => s + v, 0);
    const totalVoted = [...votedP.values()].reduce((s, v) => s + v, 0);
    const totalAntre = [...antreP.values()].reduce((s, v) => s + v, 0);

    const last30Min = votedAtRows.filter((r) => (r.votedAt?.getTime() ?? 0) > now - 30 * 60_000).length;
    const ratePerMin = Math.round((last30Min / 30) * 10) / 10;
    const target80 = Math.ceil(totalDpt * 0.8);
    const remainingTo80 = Math.max(0, target80 - totalVoted);
    const eta80PctMinutes = ratePerMin > 0 && remainingTo80 > 0 ? Math.ceil(remainingTo80 / ratePerMin) : null;
    const etaLabel =
      remainingTo80 === 0
        ? "Target 80% TERCAPAI"
        : eta80PctMinutes === null
          ? "Belum terprediksi (belum ada suara dalam 30 menit terakhir)"
          : `≈ ${eta80PctMinutes < 60 ? `${eta80PctMinutes} menit` : `${Math.floor(eta80PctMinutes / 60)} jam ${eta80PctMinutes % 60} mnt`} ke target 80%`;

    const body: TurnoutResponse = {
      ok: true,
      updatedAt: new Date().toISOString(),
      total: { dpt: totalDpt, voted: totalVoted, antrean: totalAntre, belum: totalDpt - totalVoted - totalAntre, pct: pct(totalVoted, totalDpt) },
      momentum: { last30Min, ratePerMin, eta80PctMinutes, etaLabel },
      perProdi,
      perAngkatan,
      perTps,
      timeline,
    };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ ok: false, message: "Gagal menyusun dasbor turnout." }, { status: 500 });
  }
}
