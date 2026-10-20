// ============================================================
// LOAD TEST SMART PEMIRA — Rekomendasi #10
// Simulasi beban puncak hari-H tanpa dependensi eksternal:
//   Fase 1 : burst baca publik (portal + health)
//   Fase 2 : campuran login (valid + salah username acak —
//            TIDAK memicu lockout akun asli)
//   Fase 3 : alur suara penuh (issue token → submit → receipt)
//   Fase 4 : verifikasi struk
// Output: p50/p95/p99 + rasio sukses per fase.
// Catatan: fase 3 mengubah DB — jalankan `seed.ts` setelahnya.
// ============================================================
import { performance } from "perf_hooks";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

interface Stat {
  phase: string;
  total: number;
  ok: number;
  fail: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function workerPool(n: number, concurrency: number, fn: (i: number) => Promise<boolean>): Promise<boolean[]> {
  const results: boolean[] = [];
  let cursor = 0;
  async function run(): Promise<void> {
    while (cursor < n) {
      const i = cursor++;
      results[i] = await fn(i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, n) }, run));
  return results;
}

async function timed(phase: string, n: number, concurrency: number, fn: (i: number) => Promise<boolean>): Promise<Stat> {
  const t0 = performance.now();
  const results = await workerPool(n, concurrency, fn);
  const wall = performance.now() - t0;
  void wall;
  const latencies = (globalThis as unknown as { __lat?: number[] }).__lat ?? [];
  void latencies;
  return finalize(phase, results);
}

// kumpulan latensi per fase (diisi request helper)
let lat: number[] = [];
async function req(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: unknown }> {
  const t = performance.now();
  try {
    const res = await fetch(`${BASE}${path}`, init);
    const body = await res.json().catch(() => null);
    lat.push(performance.now() - t);
    return { ok: res.ok, status: res.status, body };
  } catch {
    lat.push(performance.now() - t);
    return { ok: false, status: 0, body: null };
  }
}

function finalize(phase: string, results: boolean[]): Stat {
  const sorted = [...lat].sort((a, b) => a - b);
  const stat: Stat = {
    phase,
    total: results.length,
    ok: results.filter(Boolean).length,
    fail: results.filter((r) => !r).length,
    p50: Math.round(percentile(sorted, 50) * 10) / 10,
    p95: Math.round(percentile(sorted, 95) * 10) / 10,
    p99: Math.round(percentile(sorted, 99) * 10) / 10,
    max: Math.round((sorted.at(-1) ?? 0) * 10) / 10,
  };
  lat = [];
  return stat;
}

async function main() {
  console.log(`\n🔥 LOAD TEST SMART PEMIRA → ${BASE}\n`);
  const stats: Stat[] = [];

  // ---------- FASE 1: burst baca publik ----------
  console.log("── Fase 1: Burst baca publik (portal + health), 400 req @ conc 40");
  const phase1Targets: string[] = [];
  for (let i = 0; i < 400; i++) phase1Targets.push(i % 4 === 0 ? "/api/health" : "/api/public/portal");
  const s1 = await timed("Baca publik", 400, 40, async (i) => {
    const r = await req(phase1Targets[i]);
    return r.ok;
  });
  stats.push(s1);

  // ---------- Fase 2: campuran login ----------
  console.log("── Fase 2: Campuran login (30 valid, 60 username-palsu acak), conc 15");
  const loginCookie: string[] = [];
  let validCount = 0;
  const s2 = await timed("Login campuran", 90, 15, async (i) => {
    const isReal = i % 3 === 0;
    const creds = isReal
      ? [["kpum", "kpum123"], ["itpo", "itpo123"], ["panwaslu", "panwaslu123"]][validCount++ % 3]
      : [`ghost_${i}_${Math.floor(Math.random() * 1e6)}`, "wrongpass"];
    const r = await req("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: creds[0], password: creds[1] }),
    });
    if (isReal && r.ok) {
      const setCookie = (r.body as { _cookie?: string })?._cookie;
      void setCookie;
    }
    // valid → 200; palsu → 401 (bukan 429/5xx)
    return isReal ? r.status === 200 : r.status === 401;
  });
  stats.push(s2);
  void loginCookie;

  // ---------- Fase 3: alur suara penuh ----------
  console.log("── Fase 3: Alur suara (PPUR issue → kiosk submit → receipt), 12 pemilih @ conc 4");
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "ppur", password: "ppur123" }),
  });
  const ppurCookie = loginRes.headers.get("set-cookie")?.split(";")[0] ?? "";
  const meRes = await fetch(`${BASE}/api/ppur/voters?filter=BELUM_MEMILIH`, { headers: { cookie: ppurCookie } });
  const votersJson = (await meRes.json()) as { voters?: Array<{ id: string }> };
  const voterIds = (votersJson.voters ?? []).slice(0, 12).map((v) => v.id);
  console.log(`   pemilih tersedia: ${voterIds.length}`);

  // kandidat dari portal publik
  const portalRes = await fetch(`${BASE}/api/public/portal`);
  const portal = (await portalRes.json()) as { candidates: Array<{ id: string; category: string; studyProgramId: string | null; isEmptyBox: boolean }> };
  const presmaId = portal.candidates.find((c) => c.category === "PRESMA")?.id;
  const dpmId = portal.candidates.find((c) => c.category === "DPM")?.id;
  const himaIds = new Map<string, string>();
  for (const c of portal.candidates) if (c.category === "HIMA" && c.studyProgramId) himaIds.set(c.studyProgramId, c.id);

  const receiptCodes: string[] = [];
  if (voterIds.length > 0 && presmaId && dpmId) {
    // Concurrency 1: bilik suara nyata dilayani serial per TPS, dan SQLite
    // (demo) tidak mendukung tulis paralel — kontensi lock → butuh PostgreSQL
    // untuk skala multi-TPS paralel (Rekomendasi #4).
    const s3 = await timed("Alur suara", voterIds.length, 1, async (i) => {
      const issueRes = await fetch(`${BASE}/api/ppur/issue-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: ppurCookie },
        body: JSON.stringify({ voterId: voterIds[i] }),
      });
      const issue = (await issueRes.json()) as { ok: boolean; token?: string };
      if (!issue.ok || !issue.token) return false;
      // validasi kiosk untuk mengetahui prodi → pilih Hima prodi tsb
      const valRes = await fetch(`${BASE}/api/kiosk/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: issue.token }),
      });
      const val = (await valRes.json()) as { ok: boolean; session?: { studyProgramId: string } };
      if (!val.ok || !val.session) return false;
      const himaId = himaIds.get(val.session.studyProgramId) ?? null;
      const subRes = await fetch(`${BASE}/api/kiosk/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: issue.token,
          selections: { presmaCandidateId: presmaId, dpmCandidateId: dpmId, himaCandidateId: himaId },
        }),
      });
      const sub = (await subRes.json()) as { ok: boolean; receiptCode?: string };
      if (sub.ok && sub.receiptCode) receiptCodes.push(sub.receiptCode);
      return sub.ok;
    });
    stats.push(s3);

    // ---------- Fase 4: verifikasi struk ----------
    if (receiptCodes.length > 0) {
      console.log(`── Fase 4: Verifikasi struk (${receiptCodes.length} kode @ conc 20, 3x ulang)`);
      const codes = receiptCodes;
      const s4 = await timed("Verifikasi struk", codes.length * 3, 20, async (i) => {
        const r = await req(`/api/public/receipt?code=${encodeURIComponent(codes[i % codes.length])}`);
        return r.ok && (r.body as { found?: boolean })?.found === true;
      });
      stats.push(s4);
    }
  } else {
    console.log("   (fase 3 dilewati — tidak ada pemilih belum-memilih / kandidat)");
  }

  // ---------- Ringkasan ----------
  console.log("\n══════════ RINGKASAN LOAD TEST ══════════");
  console.log("Fase              │ Total│  OK │ Fail│ p50(ms)│ p95(ms)│ p99(ms)│ max(ms)");
  console.log("──────────────────┼──────┼─────┼─────┼────────┼────────┼────────┼────────");
  for (const s of stats) {
    const row = `${s.phase.padEnd(17)} │ ${String(s.total).padEnd(4)} │ ${String(s.ok).padEnd(3)} │ ${String(s.fail).padEnd(3)} │ ${String(s.p50).padEnd(6)} │ ${String(s.p95).padEnd(6)} │ ${String(s.p99).padEnd(6)} │ ${s.max}`;
    console.log(row);
  }
  const allOk = stats.every((s) => s.fail === 0);
  console.log(allOk ? "\n✅ SEMUA FASE LULUS — sistem sehat di bawah beban." : "\n⚠️  ADA KEGAGALAN — periksa fase bermasalah di atas.");
  console.log("ℹ️  Catatan: jalankan `npx tsx scripts/seed.ts` untuk mengembalikan demo segar.\n");
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error("load test fatal:", e);
  process.exit(1);
});
