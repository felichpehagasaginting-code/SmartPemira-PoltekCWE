// GET /api/health — Health check & metrics ringkas (Rekomendasi #10)
// Publik (tanpa data sensitif) — dipakai monitoring/uptime check & CI.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

let startedAt = Date.now();

export async function GET() {
  const started = Date.now();
  try {
    const [operatorCount, voterCount, ballotCount, activeTokens] = await Promise.all([
      db.operator.count({ where: { isActive: true } }),
      db.voter.count(),
      db.ballotBox.count(),
      db.votingToken.count({ where: { status: "ACTIVE" } }),
    ]);
    return NextResponse.json({
      ok: true,
      service: "smart-pemira",
      version: "1.1.0",
      uptimeSec: Math.round((Date.now() - startedAt) / 1000),
      latencyMs: Date.now() - started,
      memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      timestamp: new Date().toISOString(),
      db: { connected: true, activeOperators: operatorCount, voters: voterCount, ballots: ballotCount, activeTokens },
    });
  } catch {
    return NextResponse.json(
      { ok: false, service: "smart-pemira", db: { connected: false }, timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

