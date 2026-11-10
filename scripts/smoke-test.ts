// ============================================================
// PRODUCTION SMOKE TEST SUITE — Kesiapan Hari-H Smart Pemira
// Menjalankan audit menyeluruh dan dry-run otomatis terhadap server lokal
// atau domain produksi Vercel (APP_URL).
//
// Penggunaan:
//   npx tsx scripts/smoke-test.ts
//   npx tsx scripts/smoke-test.ts --url https://smart-pemira.vercel.app
// ============================================================
import { createClient } from "@libsql/client";
import { createHash } from "crypto";

const urlArg = process.argv.indexOf("--url");
const BASE_URL =
  urlArg !== -1 && process.argv[urlArg + 1]
    ? process.argv[urlArg + 1].replace(/\/$/, "")
    : (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

const tursoUrl =
  process.env.TURSO_DATABASE_URL ||
  "libsql://smartpemira-poltekcwe-felichpehagasaginting-code.aws-ap-southeast-1.turso.io";
const tursoAuthToken =
  process.env.TURSO_AUTH_TOKEN ||
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTM5MzMyMjYsImlkIjoiMDFhMWFlYzAtNTUwMS03NTBkLTlkOTYtNGM3YzFmZjc0ODFjIiwia2lkIjoiWjZWMkJRc2c4MEJfVTF5c2VSRUlJX25JMVFFNkw4c1lCSFJVLVN3dFBmcyIsInJpZCI6IjU2NWQ0ZGE1LWEzYjUtNGQ0Zi1iNzQ2LTUyMjMzOWMyMjAzZSJ9.2lpafp81QjUEZyAQS-ballAPzJ12HoOC4yYAXVvwp_VmMbQbhhKXQXC8l5paIt-AlNA25riiskk6T5VdLPVBBQ";

interface TestResult {
  step: number;
  name: string;
  passed: boolean;
  detail: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function recordTest(
  step: number,
  name: string,
  fn: () => Promise<{ passed: boolean; detail: string }>
) {
  const t0 = performance.now();
  try {
    const res = await fn();
    const durationMs = Math.round(performance.now() - t0);
    results.push({ step, name, passed: res.passed, detail: res.detail, durationMs });
    console.log(
      `[${res.passed ? " PASS " : " FAIL "}] Step ${step}: ${name} (${durationMs}ms)`
    );
    if (!res.passed) console.log(`       ⚠️  Detail: ${res.detail}`);
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - t0);
    results.push({ step, name, passed: false, detail: err?.message || String(err), durationMs });
    console.log(`[ FAIL ] Step ${step}: ${name} (${durationMs}ms) - ERROR: ${err?.message}`);
  }
}

async function runSmokeTests() {
  console.log("============================================================");
  console.log("  SMART PEMIRA POLTEK CWE — PRODUCTION SMOKE TEST");
  console.log(`  Target URL: ${BASE_URL}`);
  console.log("============================================================\n");

  let serverIsReachable = false;

  // Step 1: Health & Latency Probe
  await recordTest(1, "Health Check Endpoint & Latency Probe (/api/health)", async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/health`, { method: "GET" });
      if (!res.ok) {
        return { passed: false, detail: `Status HTTP ${res.status} (bukan 200)` };
      }
      serverIsReachable = true;
      const json = await res.json();
      if (!json.ok || !json.db?.connected) {
        return { passed: false, detail: `Health melaporkan database belum terhubung` };
      }
      return {
        passed: true,
        detail: `Database connected. Latency: ${json.latencyMs}ms, Voters: ${json.db.voters}, Ballots: ${json.db.ballots}`,
      };
    } catch (e: any) {
      return { passed: false, detail: `Gagal mengakses ${BASE_URL}: ${e?.message}` };
    }
  });

  // Step 2: Security Headers & Camera Permissions-Policy Audit
  await recordTest(2, "Security Headers & Camera Permissions-Policy Audit", async () => {
    if (!serverIsReachable) {
      return { passed: false, detail: "Server web tidak merespons (dilewati)" };
    }
    const res = await fetch(`${BASE_URL}/api/health`, { method: "HEAD" });
    const permPolicy = res.headers.get("permissions-policy") || "";
    const hasCameraSelf = permPolicy.includes("camera=(self)");
    const xContentType = res.headers.get("x-content-type-options");
    const referrerPolicy = res.headers.get("referrer-policy");

    if (!hasCameraSelf) {
      return {
        passed: false,
        detail: `Permissions-Policy belum memuat camera=(self). Nilai sekarang: "${permPolicy}"`,
      };
    }
    return {
      passed: true,
      detail: `Header aman: camera=(self), nosniff=${xContentType}, referrer=${referrerPolicy}`,
    };
  });

  // Step 3: Zero-Knowledge Protection Audit (Bilik Pemilih)
  await recordTest(3, "Zero-Knowledge Invariant (No Voter Identification in Public APIs)", async () => {
    if (!serverIsReachable) {
      return { passed: false, detail: "Server web tidak merespons (dilewati)" };
    }
    const res = await fetch(`${BASE_URL}/api/pemilih/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "INV123" }),
    });
    const json = await res.json();
    // Harus menolak token sembarang (401) tanpa membocorkan identitas pemilih
    const hasLeak = JSON.stringify(json).toLowerCase().includes("nim") || JSON.stringify(json).toLowerCase().includes("voterid");
    if (res.status === 401 && !hasLeak) {
      return { passed: true, detail: "Token sembarang ditolak (401) tanpa kebocoran data identitas pemilih." };
    }
    return { passed: false, detail: `Status respons tidak terduga: ${res.status}` };
  });

  // Step 4: Verification Portal Dual-Tab Verification Route
  await recordTest(4, "Public Verification Portal Accessibility (/verifikasi)", async () => {
    if (!serverIsReachable) {
      return { passed: false, detail: "Server web tidak merespons (dilewati)" };
    }
    const res = await fetch(`${BASE_URL}/verifikasi`);
    if (res.ok) {
      return { passed: true, detail: `Halaman verifikasi publik merespons dengan status HTTP ${res.status}` };
    }
    return { passed: false, detail: `Gagal memuat portal verifikasi: status ${res.status}` };
  });

  // Step 5: Pleno Vault Lock Protection Check
  await recordTest(5, "Pleno Vault Lock Guard (Anti-Early Count Leak)", async () => {
    if (!serverIsReachable) {
      return { passed: false, detail: "Server web tidak merespons (dilewati)" };
    }
    const res = await fetch(`${BASE_URL}/api/operator/pleno/tally`, {
      method: "GET",
    });
    // Tanpa sesi login ITPO/KPUM atau tanpa pleno unlocked, harus 401 atau 423
    if (res.status === 401 || res.status === 403 || res.status === 423) {
      return { passed: true, detail: `Tally terkunci aman sebelum sidang pleno (Status HTTP ${res.status})` };
    }
    return { passed: false, detail: `PERINGATAN: Endpoint tally dapat diakses publik tanpa izin! Status: ${res.status}` };
  });

  // Step 6: Database Integrity Check (Direct LibSQL Connection)
  await recordTest(6, "Turso Cloud PRAGMA Integrity & Schema Consistency", async () => {
    try {
      const client = createClient({ url: tursoUrl, authToken: tursoAuthToken });
      const res = await client.execute("PRAGMA integrity_check;");
      const status = res.rows[0]?.integrity_check;
      const countRes = await client.execute("SELECT count(*) as total FROM Candidate;");
      const candCount = Number(countRes.rows[0]?.total ?? 0);
      client.close();

      if (status === "ok" && candCount >= 14) {
        return { passed: true, detail: `PRAGMA: ok, Kandidat Terdaftar: ${candCount} paslon` };
      }
      return { passed: false, detail: `Integritas: ${status}, Kandidat: ${candCount}` };
    } catch (e: any) {
      return { passed: false, detail: `Gagal koneksi ke Turso: ${e?.message}` };
    }
  });

  // Step 7: Cryptographic Hash Chains Audit for All 5 Study Programs
  await recordTest(7, "Cryptographic Hash Chains Audit (All 5 TPS Prodis)", async () => {
    try {
      const client = createClient({ url: tursoUrl, authToken: tursoAuthToken });
      const tpsRes = await client.execute("SELECT id, name, chainSalt, lastChainHash FROM Tps ORDER BY id;");
      let allOk = true;
      const brokenProdis: string[] = [];

      for (const tps of tpsRes.rows) {
        const tpsId = String(tps.id);
        const salt = String(tps.chainSalt);
        const expectedLast = String(tps.lastChainHash ?? "");

        const ballots = await client.execute({
          sql: "SELECT id, category, candidateId, isEmptyBox, createdAt, ballotHash FROM BallotBox WHERE tpsId = ? ORDER BY createdAt ASC, id ASC;",
          args: [tpsId],
        });

        let prev = "";
        for (const b of ballots.rows) {
          const date = new Date(String(b.createdAt));
          const payload = [
            prev,
            String(b.id),
            String(b.category),
            b.candidateId ? String(b.candidateId) : "NULL",
            b.isEmptyBox ? "EMPTY_BOX" : "CANDIDATE",
            date.toISOString(),
            salt,
          ].join("||");
          const h = createHash("sha256").update(payload).digest("hex");
          if (h !== b.ballotHash) {
            allOk = false;
            brokenProdis.push(`${tpsId}:${b.id}`);
            break;
          }
          prev = h;
        }

        if (ballots.rows.length > 0 && prev !== expectedLast) {
          allOk = false;
          brokenProdis.push(`${tpsId}:head_mismatch`);
        }
      }
      client.close();

      if (allOk) {
        return {
          passed: true,
          detail: `Kelima rantai prodi (TPTP, TPHP, MANLOG, BD, TRPL) utuh dan terverifikasi secara matematis.`,
        };
      }
      return { passed: false, detail: `Rantai cacat pada: ${brokenProdis.join(", ")}` };
    } catch (e: any) {
      return { passed: false, detail: `Error audit rantai: ${e?.message}` };
    }
  });

  // Rekapitulasi
  console.log("\n==================== REKAPITULASI HASIL SMOKE TEST ====================");
  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  console.log(`Pengujian Selesai : ${passedTests}/${totalTests} Lolos (${Math.round((passedTests / totalTests) * 100)}%)`);

  for (const r of results) {
    console.log(` ${r.passed ? "✓" : "✗"} [${r.step}] ${r.name}: ${r.detail}`);
  }
  console.log("=======================================================================\n");

  if (passedTests < totalTests) {
    console.warn("⚠️ Terdapat beberapa langkah smoke test yang memerlukan perhatian.");
  } else {
    console.log("🎉 SEMUA SISTEM SIAP & STABIL UNTUK HARI-H PEMIRA POLTEK CWE!");
  }
}

runSmokeTests().catch((err) => {
  console.error("Fatal smoke test error:", err);
  process.exit(1);
});
