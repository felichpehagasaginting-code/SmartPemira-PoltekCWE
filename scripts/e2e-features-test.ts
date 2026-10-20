// ============================================================
// E2E FITUR UPGRADE — Rekomendasi #1, #2, #6, #8, #9, #10
// Rate limit • Operator CRUD • Receipt • Berita Acara • SSE • Health
// Jalankan setelah seed segar. Urutan penting: tes rate-limit PALING AKHIR.
// ============================================================
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

let passed = 0;
let failed = 0;

function ok(label: string) {
  passed++;
  console.log(`  ✅ ${label}`);
}
function fail(label: string, detail = "") {
  failed++;
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
}
function expect(cond: boolean, label: string, detail = "") {
  if (cond) ok(label);
  else fail(label, detail);
}

async function login(username: string, password: string): Promise<{ status: number; cookie: string; body: Record<string, unknown> }> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const cookie = res.headers.get("set-cookie")?.split(";")[0] ?? "";
  const body = (await res.json()) as Record<string, unknown>;
  return { status: res.status, cookie, body };
}

async function main() {
  console.log("\n═══ E2E FITUR UPGRADE — Smart Pemira ═══\n");

  // ---------- 10. Health ----------
  console.log("── 1. Health & monitoring (Rekomendasi #10)");
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json() as Promise<{ ok: boolean; db: { connected: boolean }; version: string }>);
  expect(health.ok && health.db.connected, "GET /api/health → ok + db.connected");
  expect(!!health.version, `Versi layanan terlapor (${health.version})`);

  // ---------- 9. Berita Acara: locked dulu ----------
  console.log("── 2. Berita Acara bertanda tangan (Rekomendasi #9)");
  const kpum = await login("kpum", "kpum123");
  expect(kpum.status === 200, "Login KPUM");
  const baLocked = await fetch(`${BASE}/api/kpum/berita-acara`, { headers: { cookie: kpum.cookie } });
  expect(baLocked.status === 423, "BA sebelum pleno → 423 Locked");

  const verifyLocked = await fetch(`${BASE}/api/public/verify-ba?sig=${"a".repeat(64)}`).then((r) => r.json() as Promise<{ locked: boolean }>);
  expect(verifyLocked.locked === true, "Verifikasi publik sebelum pleno → status locked");

  // ---------- 2. Operator CRUD ----------
  console.log("── 3. Manajemen operator (Rekomendasi #2)");
  const itpo = await login("itpo", "itpo123");
  expect(itpo.status === 200, "Login ITPO");

  const saksiForOps = await login("saksi01", "saksi123");
  const opsForbidden = await fetch(`${BASE}/api/admin/operators`, { headers: { cookie: saksiForOps.cookie } });
  expect(opsForbidden.status === 403, "SAKSI akses daftar operator → 403");

  // Idempoten: pakai akun uji lama bila sudah ada (dari run sebelumnya)
  const opsList = (await fetch(`${BASE}/api/admin/operators`, { headers: { cookie: itpo.cookie } }).then((r) => r.json())) as {
    operators: Array<{ id: string; username: string }>;
  };
  let testOpId = opsList.operators.find((o) => o.username === "e2e_ppur")?.id;
  let currentPw = "e2etest123";
  if (!testOpId) {
    const createRes = await fetch(`${BASE}/api/admin/operators`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: itpo.cookie },
      body: JSON.stringify({ username: "e2e_ppur", fullName: "E2E Tester — Petugas Uji", role: "PPUR", password: currentPw }),
    });
    const created = (await createRes.json()) as { ok: boolean; operator?: { id: string } };
    expect(created.ok && !!created.operator?.id, "ITPO buat akun e2e_ppur/PPUR");
    testOpId = created.operator?.id;
    const newLogin1 = await login("e2e_ppur", currentPw);
    expect(newLogin1.status === 200, "Akun baru bisa login");
  } else {
    // sinkronkan sandi akun lama lewat reset (sandinya tak diketahui dari run sebelumnya)
    const pre = (await fetch(`${BASE}/api/admin/operators/${testOpId}/reset-password`, { method: "POST", headers: { cookie: itpo.cookie } }).then((r) =>
      r.json()
    )) as { ok: boolean; tempPassword?: string };
    expect(pre.ok && !!pre.tempPassword, "Akun uji lama disinkronkan (reset sandi)");
    currentPw = pre.tempPassword!;
    const preLogin = await login("e2e_ppur", currentPw);
    expect(preLogin.status === 200, "Akun uji lama bisa login dengan sandi sementara");
  }
  expect(!!testOpId, "ID akun uji tersedia");

  const dupe = await fetch(`${BASE}/api/admin/operators`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: itpo.cookie },
    body: JSON.stringify({ username: "e2e_ppur", fullName: "Duplikat", role: "PPUR", password: "e2etest123" }),
  });
  expect(dupe.status === 409, "Username duplikat → 409");

  // login sebagai akun baru, nonaktifkan, login → 401
  const deactivate = await fetch(`${BASE}/api/admin/operators/${testOpId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie: itpo.cookie },
    body: JSON.stringify({ isActive: false }),
  });
  expect(deactivate.status === 200, "ITPO nonaktifkan akun");
  const newLogin2 = await login("e2e_ppur", currentPw);
  expect(newLogin2.status === 401, "Akun nonaktif login → 401");

  // re-aktifkan + reset password → sandi sementara + wajib ganti
  await fetch(`${BASE}/api/admin/operators/${testOpId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie: itpo.cookie },
    body: JSON.stringify({ isActive: true }),
  });
  const resetRes = await fetch(`${BASE}/api/admin/operators/${testOpId}/reset-password`, { method: "POST", headers: { cookie: itpo.cookie } });
  const resetBody = (await resetRes.json()) as { ok: boolean; tempPassword?: string };
  expect(resetBody.ok && !!resetBody.tempPassword, "Reset sandi → sandi sementara diterbitkan");

  const newLogin3 = await login("e2e_ppur", resetBody.tempPassword!);
  const newOp = newLogin3.body as { operator?: { mustChangePassword?: boolean } };
  expect(newLogin3.status === 200, "Login dengan sandi sementara berhasil");
  expect(newOp.operator?.mustChangePassword === true, "Sesi menandai WAJIB ganti sandi");

  // ---------- 6. Receipt ----------
  console.log("── 4. Struk suara / digital receipt (Rekomendasi #6)");
  const ppur = await login("ppur", "ppur123");
  expect(ppur.status === 200, "Login PPUR");
  const voters = (await fetch(`${BASE}/api/ppur/voters?filter=BELUM_MEMILIH`, { headers: { cookie: ppur.cookie } }).then((r) => r.json())) as {
    voters: Array<{ id: string; studyProgramId: string }>;
  };
  const voter = voters.voters[0];
  expect(!!voter, "Ada pemilih belum-memilih untuk uji");

  const issue = (await fetch(`${BASE}/api/ppur/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: ppur.cookie },
    body: JSON.stringify({ voterId: voter.id }),
  }).then((r) => r.json())) as { ok: boolean; token?: string };
  expect(issue.ok && !!issue.token, "Token diterbitkan");

  const portal = (await fetch(`${BASE}/api/public/portal`).then((r) => r.json())) as {
    candidates: Array<{ id: string; category: string; studyProgramId: string | null }>;
  };
  const presmaId = portal.candidates.find((c) => c.category === "PRESMA")!.id;
  const dpmId = portal.candidates.find((c) => c.category === "DPM")!.id;
  const himaId = portal.candidates.find((c) => c.category === "HIMA" && c.studyProgramId === voter.studyProgramId && c.id)!.id;

  const sub = (await fetch(`${BASE}/api/pemilih/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: issue.token,
      selections: { presmaCandidateId: presmaId, dpmCandidateId: dpmId, himaCandidateId: himaId },
    }),
  }).then((r) => r.json())) as { ok: boolean; receiptCode?: string; tpsName?: string };
  expect(sub.ok && /^\w{4}-\w{4}-\w{4}$/.test(sub.receiptCode ?? ""), `Submit suara → struk ${sub.receiptCode} (${sub.tpsName})`);

  const receiptHit = (await fetch(`${BASE}/api/public/receipt?code=${encodeURIComponent(sub.receiptCode!)}`).then((r) => r.json())) as {
    found: boolean;
    blockSeq?: number;
    tpsName?: string;
  };
  expect(receiptHit.found && !!receiptHit.blockSeq, `Verifikasi struk publik → TERCATAT blok #${receiptHit.blockSeq} @ ${receiptHit.tpsName}`);

  const receiptMiss = (await fetch(`${BASE}/api/public/receipt?code=DEAD-BEEF-0000`).then((r) => r.json())) as { found: boolean };
  expect(receiptMiss.found === false, "Kode struk salah → tidak ditemukan");

  const receiptBad = await fetch(`${BASE}/api/public/receipt?code=pendek`);
  expect(receiptBad.status === 400, "Kode format salah → 400");

  // ---------- 9 lanjutan: pleno unlock → BA + verifikasi ----------
  console.log("── 5. Pleno unlock → BA final + verifikasi publik (Rekomendasi #9)");
  const unlockRes = await fetch(`${BASE}/api/tally/unlock`, { method: "POST", headers: { "Content-Type": "application/json", cookie: kpum.cookie }, body: "{}" });
  expect(unlockRes.status === 200, "Pleno Unlock oleh KPUM");

  const ba = (await fetch(`${BASE}/api/kpum/berita-acara`, { headers: { cookie: kpum.cookie } }).then((r) => r.json())) as {
    ok: boolean;
    document?: { signature: string; signatories: { kpum: string; panwaslu: string }; totals: { ballots: number } };
  };
  expect(ba.ok && /^[0-9a-f]{64}$/.test(ba.document!.signature), `BA final → tanda tangan SHA-256 (${ba.document!.totals.ballots} balok)`);
  expect(!!ba.document!.signatories.kpum && !!ba.document!.signatories.panwaslu, "Penandatangan KPUM + Panwaslu tercantum");

  const verifyOk = (await fetch(`${BASE}/api/public/verify-ba?sig=${ba.document!.signature}`).then((r) => r.json())) as { valid: boolean };
  expect(verifyOk.valid === true, "Verifikasi publik tanda tangan asli → VALID");

  const tampered = "f".repeat(64);
  const verifyBad = (await fetch(`${BASE}/api/public/verify-ba?sig=${tampered}`).then((r) => r.json())) as { valid: boolean };
  expect(verifyBad.valid === false, "Tanda tangan dipalsukan → TIDAK VALID");

  const baForbidden = await fetch(`${BASE}/api/kpum/berita-acara`, { headers: { cookie: saksiForOps.cookie } });
  expect(baForbidden.status === 403, "SAKSI akses BA → 403");

  // ---------- 8. SSE ----------
  console.log("── 6. Stream SSE realtime (Rekomendasi #8)");
  const sseCtl = new AbortController();
  const sseRes = await fetch(`${BASE}/api/realtime/monitor`, { headers: { cookie: saksiForOps.cookie }, signal: sseCtl.signal });
  let gotSnapshot = false;
  let sseIsStream = sseRes.headers.get("content-type")?.includes("text/event-stream") ?? false;
  const reader = sseRes.body?.getReader();
  const timeout = setTimeout(() => sseCtl.abort(), 6000);
  if (reader) {
    try {
      const decoder = new TextDecoder();
      let buf = "";
      while (bufBuf(buf)) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        if (buf.includes("event: snapshot")) {
          gotSnapshot = true;
          break;
        }
      }
    } catch {
      // aborted — wajar
    }
  }
  clearTimeout(timeout);
  sseCtl.abort();
  expect(sseIsStream, "SSE endpoint → content-type text/event-stream");
  expect(gotSnapshot, "SSE mengirim event snapshot (monitor + tally + login log)");

  const sseNoAuth = await fetch(`${BASE}/api/realtime/monitor`);
  expect(sseNoAuth.status === 401, "SSE tanpa sesi → 401");

  // ---------- 1. Rate limit (PALING AKHIR — memicu lockout) ----------
  console.log("── 7. Anti-brute force (Rekomendasi #1) — username palsu, tak ganggu akun asli");
  let got429 = false;
  let lastBody: { message?: string } = {};
  for (let i = 0; i < 8; i++) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "bruteforce_ghost", password: `wrong${i}` }),
    });
    lastBody = (await res.json()) as { message?: string };
    if (res.status === 429) {
      got429 = true;
      expect(!!res.headers.get("retry-after"), `Lockout pada percobaan ke-${i + 1} + header Retry-After`);
      break;
    }
  }
  expect(got429, `Lockout anti-brute force aktif (${lastBody.message ?? ""})`);

  const realLogin = await login("kpum", "kpum123");
  expect(realLogin.status === 200, "Akun asli TIDAK terdampak lockout username lain");

  // security headers
  // Kebijakan frame sadar-lingkungan: server dev/preview sengaja TIDAK mengirim
  // X-Frame-Options agar panel preview sandbox bisa embed (iframe lintas origin);
  // produksi (NODE_ENV=production) wajib DENY + CSP frame-ancestors 'none'.
  const anyRes = await fetch(`${BASE}/api/health`);
  const strictFrames = process.env.NODE_ENV === "production";
  const xfo = anyRes.headers.get("x-frame-options");
  expect(
    strictFrames ? xfo === "DENY" : xfo !== "DENY",
    `Security header kebijakan frame sesuai mode (${strictFrames ? "produksi: DENY" : "preview: embed diizinkan"})`,
  );
  expect(anyRes.headers.get("x-content-type-options") === "nosniff", "Security header nosniff aktif");

  // ---------- Ringkasan ----------
  console.log(`\n═══ SELESAI: ${passed} lulus, ${failed} gagal ═══\n`);
  process.exit(failed > 0 ? 1 : 0);
}

// helper kecil untuk loop baca stream
function bufBuf(_s: string): boolean {
  return true;
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
