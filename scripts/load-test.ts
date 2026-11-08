// ============================================================
// SYNTHETIC LOAD TESTING & LATENCY BENCHMARK — Smart Pemira
// Paket 2: Uji beban konkurensi voting & integritas rantai hash
// Mendukung:
//   - Mode HTTP API (via /api/pemilih/submit) & Direct Service Engine
//   - Pengaturan konkurensi fleksibel (--concurrency 10, 50, 100, 300)
//   - Simulasi multi-prodi (TPTP, TPHP, MANLOG, BD, TRPL)
//   - Pengukuran latensi: Min, P50 (median), P90, P95, P99, Max, Avg, StdDev
//   - Verifikasi kriptografis rantai hash pasca pengujian
// ============================================================
import { db } from "../src/lib/db";
import { generateVotingToken, hashToken } from "../src/lib/crypto/token-generator";
import { submitBallots, type BallotSelections } from "../src/lib/db/ballot-service";
import { verifyChain } from "../src/lib/crypto/ballot-hash-chain";
import { checkChainIntegrity } from "../src/lib/server/alerts";
import { execSync } from "child_process";

interface CliOptions {
  concurrency: number;
  total: number;
  url: string;
  mode: "auto" | "http" | "direct";
  resetDb: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let concurrency = 50;
  let total = 0;
  let url = process.env.APP_URL || "http://localhost:3000";
  let mode: "auto" | "http" | "direct" = "auto";
  let resetDb = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--concurrency" || arg === "-c") {
      concurrency = parseInt(args[++i], 10) || 50;
    } else if (arg === "--total" || arg === "-t" || arg === "-n") {
      total = parseInt(args[++i], 10) || 0;
    } else if (arg === "--url" || arg === "-u") {
      url = args[++i];
    } else if (arg === "--mode" || arg === "-m") {
      mode = args[++i] as any;
    } else if (arg === "--reset") {
      resetDb = true;
    }
  }

  if (!total) total = concurrency;
  return { concurrency, total, url, mode, resetDb };
}

async function probeHttpServer(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${url}/api/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

interface TestResult {
  idx: number;
  success: boolean;
  statusCode: number;
  durationMs: number;
  receiptCode?: string;
  prodiId: string;
  error?: string;
}

async function runWorkerPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function runner(): Promise<void> {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      results[idx] = await worker(items[idx], idx);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runner()
  );
  await Promise.all(workers);
  return results;
}

function calculatePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(Math.floor(sorted.length * p), sorted.length - 1);
  return sorted[index];
}

async function main() {
  const opts = parseArgs();

  console.log("\n" + "=".repeat(64));
  console.log("⚡ SMART PEMIRA SYNTHETIC LOAD TESTING & LATENCY BENCHMARK");
  console.log("=".repeat(64));

  if (opts.resetDb) {
    console.log("🔄 Resetting and re-seeding initial database state...");
    execSync("npx tsx scripts/seed.ts", { stdio: "inherit" });
  }

  // 1. Periksa ketersediaan tabel & data awal
  let candidates = await db.candidate.findMany();
  let tpsList = await db.tps.findMany();
  let prodiList = await db.studyProgram.findMany();

  if (candidates.length === 0 || tpsList.length === 0 || prodiList.length === 0) {
    console.log("⚠️ Data kandidat/TPS belum tersedia. Menjalankan seed otomatis...");
    execSync("npx tsx scripts/seed.ts", { stdio: "inherit" });
    candidates = await db.candidate.findMany();
    tpsList = await db.tps.findMany();
    prodiList = await db.studyProgram.findMany();
  }

  // Pastikan eleksi dibuka dan tidak beku
  await db.electionSetting.upsert({
    where: { id: "main" },
    update: { votingOpen: true, emergencyFreeze: false },
    create: { id: "main", votingOpen: true, emergencyFreeze: false, sessionSecret: "loadtest-secret" },
  });

  // Tentukan mode eksekusi (HTTP vs Direct Engine)
  let activeMode: "http" | "direct" = "direct";
  if (opts.mode === "http") {
    activeMode = "http";
  } else if (opts.mode === "direct") {
    activeMode = "direct";
  } else {
    const isUp = await probeHttpServer(opts.url);
    activeMode = isUp ? "http" : "direct";
  }

  console.log(`Execution Mode : ${activeMode === "http" ? `HTTP API (${opts.url})` : "Direct Service Engine (In-Memory/LibSQL)"}`);
  console.log(`Target Votes   : ${opts.total} pemilih (${opts.total * 3} surat suara kategori)`);
  console.log(`Concurrency    : ${opts.concurrency} worker paralel`);
  console.log(`Prodi Covered  : ${prodiList.map((p) => p.id).join(", ")}`);
  console.log("-".repeat(64));

  // 2. Persiapkan token untuk pengujian beban
  const presmaCandidates = candidates.filter((c) => c.category === "PRESMA");
  const dpmCandidates = candidates.filter((c) => c.category === "DPM");
  const himaByProdi: Record<string, string[]> = {};
  for (const p of prodiList) {
    himaByProdi[p.id] = candidates
      .filter((c) => c.category === "HIMA" && c.studyProgramId === p.id)
      .map((c) => c.id);
  }

  console.log(`📦 Menyiapkan ${opts.total} token pemilih aktif...`);
  const tokenPairs: Array<{
    rawToken: string;
    tokenHash: string;
    prodiId: string;
    tpsId: string;
    selections: BallotSelections;
  }> = [];

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60_000); // 1 jam TTL

  for (let i = 0; i < opts.total; i++) {
    const prodi = prodiList[i % prodiList.length];
    const tps = tpsList.find((t) => t.id === prodi.id) ?? tpsList[0];
    const rawToken = generateVotingToken();
    const tokenHash = hashToken(rawToken);

    // Variasikan pilihan (Paslon 1, Paslon 2, atau Suara Kosong / null)
    const presmaPick = presmaCandidates.length > 0 && Math.random() > 0.1
      ? presmaCandidates[i % presmaCandidates.length].id
      : null;
    const dpmPick = dpmCandidates.length > 0 && Math.random() > 0.1
      ? dpmCandidates[i % dpmCandidates.length].id
      : null;
    const prodiHimas = himaByProdi[prodi.id] || [];
    const himaPick = prodiHimas.length > 0 && Math.random() > 0.1
      ? prodiHimas[i % prodiHimas.length]
      : null;

    tokenPairs.push({
      rawToken,
      tokenHash,
      prodiId: prodi.id,
      tpsId: tps.id,
      selections: {
        presmaCandidateId: presmaPick,
        dpmCandidateId: dpmPick,
        himaCandidateId: himaPick,
      },
    });
  }

  // Simpan token ke database secara batch (chunking per 100 item untuk batas parameter SQLite)
  const BATCH_SIZE = 100;
  for (let i = 0; i < tokenPairs.length; i += BATCH_SIZE) {
    const chunk = tokenPairs.slice(i, i + BATCH_SIZE);
    await db.votingToken.createMany({
      data: chunk.map((t) => ({
        tokenHash: t.tokenHash,
        tpsId: t.tpsId,
        studyProgramId: t.prodiId,
        status: "ACTIVE",
        issuedAt: now,
        expiresAt: expiresAt,
      })),
    });
  }

  console.log(`🚀 Memulai simulasi ${opts.total} vote dengan konkurensi ${opts.concurrency}...`);
  const benchStart = performance.now();

  const results = await runWorkerPool(
    tokenPairs,
    opts.concurrency,
    async (item, idx): Promise<TestResult> => {
      const t0 = performance.now();
      let success = false;
      let statusCode = 200;
      let receiptCode = "";
      let error = "";

      try {
        if (activeMode === "http") {
          const res = await fetch(`${opts.url}/api/pemilih/submit`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Forwarded-For": `10.0.${Math.floor(idx / 250)}.${(idx % 250) + 1}`,
            },
            body: JSON.stringify({
              token: item.rawToken,
              selections: item.selections,
            }),
          });
          statusCode = res.status;
          const json = (await res.json()) as any;
          success = res.ok && json.ok === true;
          if (success) {
            receiptCode = json.receiptCode || "";
          } else {
            error = json.message || `HTTP ${res.status}`;
          }
        } else {
          const res = await submitBallots(item.rawToken, item.selections);
          success = res.ok;
          if (res.ok) {
            receiptCode = res.receiptCode;
            statusCode = 200;
          } else {
            statusCode = 400;
            error = res.message || res.code;
          }
        }
      } catch (err: any) {
        success = false;
        statusCode = 500;
        error = err?.message || String(err);
      }

      const durationMs = performance.now() - t0;
      return {
        idx,
        success,
        statusCode,
        durationMs,
        receiptCode,
        prodiId: item.prodiId,
        error,
      };
    }
  );

  const totalElapsedMs = performance.now() - benchStart;
  const totalElapsedSec = totalElapsedMs / 1000;
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const successRate = (successful.length / results.length) * 100;
  const throughputRps = results.length / totalElapsedSec;

  const latencies = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const minLat = latencies[0] || 0;
  const maxLat = latencies[latencies.length - 1] || 0;
  const avgLat = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const p50 = calculatePercentile(latencies, 0.5);
  const p90 = calculatePercentile(latencies, 0.9);
  const p95 = calculatePercentile(latencies, 0.95);
  const p99 = calculatePercentile(latencies, 0.99);

  const variance = latencies.reduce((acc, val) => acc + Math.pow(val - avgLat, 2), 0) / (latencies.length || 1);
  const stdDev = Math.sqrt(variance);

  console.log("\n" + "=".repeat(64));
  console.log("📊 HASIL PENGUJIAN BEBAN SINTETIS (BENCHMARK SUMMARY)");
  console.log("=".repeat(64));
  console.log(`Total Permintaan  : ${results.length}`);
  console.log(`Berhasil (200 OK) : ${successful.length} (${successRate.toFixed(2)}%)`);
  console.log(`Gagal             : ${failed.length}`);
  console.log(`Waktu Eksekusi    : ${totalElapsedSec.toFixed(3)} detik (${totalElapsedMs.toFixed(0)} ms)`);
  console.log(`Throughput (RPS)  : ${throughputRps.toFixed(2)} req/detik`);
  console.log("-".repeat(64));
  console.log("⏱️  LATENCY BENCHMARKS (MILLISECONDS)");
  console.log("-".repeat(64));
  console.log(`Min Latency       : ${minLat.toFixed(2)} ms`);
  console.log(`P50 (Median)      : ${p50.toFixed(2)} ms`);
  console.log(`P90 Latency       : ${p90.toFixed(2)} ms`);
  console.log(`P95 Latency       : ${p95.toFixed(2)} ms`);
  console.log(`P99 Latency       : ${p99.toFixed(2)} ms`);
  console.log(`Max Latency       : ${maxLat.toFixed(2)} ms`);
  console.log(`Average (Mean)    : ${avgLat.toFixed(2)} ms`);
  console.log(`Std Deviation     : ±${stdDev.toFixed(2)} ms`);
  console.log("-".repeat(64));

  if (failed.length > 0) {
    console.log("⚠️ CONTOH KESALAHAN:");
    failed.slice(0, 5).forEach((f) => {
      console.log(`  [Worker ${f.idx}] Prodi: ${f.prodiId} -> Status: ${f.statusCode}, Error: ${f.error}`);
    });
    console.log("-".repeat(64));
  }

  // 3. Verifikasi integritas kriptografis rantai hash pasca pengujian
  console.log("🔒 MEMERIKSA INTEGRITAS RANTAI HASH PASCA PENGUJIAN...");
  const [freshTpsList, allBallots] = await Promise.all([
    db.tps.findMany({ orderBy: { id: "asc" } }),
    db.ballotBox.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  let allChainsValid = true;
  let totalBlocksChecked = 0;

  for (const tps of freshTpsList) {
    const chain = allBallots
      .filter((b) => b.tpsId === tps.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const ver = verifyChain(
      chain.map((b) => ({
        id: b.id,
        category: b.category,
        candidateId: b.candidateId,
        isEmptyBox: b.isEmptyBox,
        createdAt: b.createdAt,
        ballotHash: b.ballotHash,
      })),
      tps.chainSalt,
      tps.lastChainHash
    );

    totalBlocksChecked += ver.checkedCount;
    const statusLabel = ver.valid ? "✅ VALID" : "❌ BROKEN";
    if (!ver.valid) allChainsValid = false;

    console.log(
      `  TPS: ${tps.name.padEnd(28)} | Blok: ${String(chain.length).padStart(4)} | Status: ${statusLabel} | Head: ${tps.lastChainHash ? tps.lastChainHash.slice(0, 12) + "..." : "EMPTY"}`
    );
  }

  const alertCheck = await checkChainIntegrity(true);
  console.log("-".repeat(64));
  console.log(`Total Blok Rantai Terverifikasi : ${totalBlocksChecked}`);
  console.log(`Status Integritas Menyeluruh    : ${allChainsValid && alertCheck.ok ? "✅ 100% INTACT & VERIFIED" : "❌ CORRUPT"}`);
  console.log("=".repeat(64) + "\n");

  if (!allChainsValid || successful.length === 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("FATAL LOAD TEST ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
