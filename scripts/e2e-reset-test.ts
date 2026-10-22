// ============================================================
// E2E API TEST — SEGEL & RESET PEMIRA (Siklus Hidup Periode)
// 0. RBAC & guard berlapis → 1. pleno terkunci ditolak 409 →
// 2. Pleno Unlock → pratinjau arsip → 3. RESET mode DEMO (gelombang
// ulang) → 4. rotasi sesi (sesi lama hangus) → 5. verifikasi genesis
// bersih + arsip unduhan + tanda tangan → 6. pemungutan dibuka lagi,
// vote ulang sukses (DPT & kandidat dipakai ulang) → 7. RESET mode
// NEW_PERIOD → 8. verifikasi DPT/kandidat kosong + arsip kedua.
// Jalankan setelah: bunx tsx scripts/seed.ts && bunx tsx scripts/e2e-test.ts (opsional)
// ============================================================
import { createHash } from "crypto";

const BASE = "http://localhost:3000";

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  const raw = await res.text();
  let body: any = null;
  try { body = JSON.parse(raw); } catch { /* attachment / bukan JSON */ }
  return { status: res.status, body, text: body === null ? raw : null };
}

async function login(username: string, password: string) {
  const res = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json();
  if (!res.ok || !body.ok) throw new Error(`Login ${username} gagal: ${JSON.stringify(body)}`);
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
  return { cookie, operator: body.operator };
}

const assert = (cond: boolean, label: string) => {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.error(`  ❌ ${label}`); process.exitCode = 1; }
};

async function main() {
  // ================= 0. RBAC & GUARD =================
  console.log("=== 0. Guard RBAC — hanya ITPO ===");
  const itpo = await login("itpo", "itpo123");
  const kpum = await login("kpum", "kpum123");
  const ppur = await login("ppur", "ppur123");
  const panwaslu = await login("panwaslu", "panwaslu123");

  const anon = await api("/api/itpo/reset");
  assert(anon.status === 401, "Tanpa sesi → status reset ditolak 401");
  const kpumStatus = await api("/api/itpo/reset", { headers: { Cookie: kpum.cookie } });
  assert(kpumStatus.status === 403, "KPUM melihat status reset → 403 (khusus ITPO)");
  const ppurReset = await api("/api/itpo/reset", {
    method: "POST",
    headers: { Cookie: ppur.cookie },
    body: JSON.stringify({ mode: "DEMO", newPeriodLabel: "Hacks", confirmPhrase: "RESET PEMIRA", password: "x" }),
  });
  assert(ppurReset.status === 403, "PPUR mencoba eksekusi reset → 403");

  const status0 = await api("/api/itpo/reset", { headers: { Cookie: itpo.cookie } });
  assert(status0.status === 200 && status0.body.ok, "ITPO membaca status siklus hidup → 200");
  const s = status0.body.status;
  assert(s.periodLabel === "Pemira Poltek CWE 2026", `Periode aktif: "${s.periodLabel}"`);
  assert(s.counts.ballots > 0 && s.archives.length === 0, `Lembar pertama berisi ${s.counts.ballots} blok suara, 0 arsip`);
  assert(s.chains.length === 5 && s.chains.every((c: any) => c.blocks > 0), "Lima rantai prodi berisi blok suara");
  const oldBallots = s.counts.ballots;
  const oldDpt = s.counts.dpt;
  const oldCandidates = s.counts.candidates;
  const oldAudit = s.counts.auditLogs;

  // ================= 1. VALIDASI INPUT & PLENO LOCK =================
  console.log("\n=== 1. Validasi berlapis (sebelum & sesudah pleno) ===");
  const badMode = await api("/api/itpo/reset", {
    method: "POST", headers: { Cookie: itpo.cookie },
    body: JSON.stringify({ mode: "HANCURKAN", newPeriodLabel: "Xxx", confirmPhrase: "RESET PEMIRA", password: "itpo123" }),
  });
  assert(badMode.status === 400, "Mode tidak dikenal → 400");
  const shortLabel = await api("/api/itpo/reset", {
    method: "POST", headers: { Cookie: itpo.cookie },
    body: JSON.stringify({ mode: "DEMO", newPeriodLabel: "AB", confirmPhrase: "RESET PEMIRA", password: "itpo123" }),
  });
  assert(shortLabel.status === 400, "Label periode baru terlalu pendek → 400");
  const badPhrase = await api("/api/itpo/reset", {
    method: "POST", headers: { Cookie: itpo.cookie },
    body: JSON.stringify({ mode: "DEMO", newPeriodLabel: "Uji Frasa", confirmPhrase: "reset pemira langsung", password: "itpo123" }),
  });
  assert(badPhrase.status === 400, "Frasa konfirmasi salah → 400");
  const badPassword = await api("/api/itpo/reset", {
    method: "POST", headers: { Cookie: itpo.cookie },
    body: JSON.stringify({ mode: "DEMO", newPeriodLabel: "Uji Sandi", confirmPhrase: "RESET PEMIRA", password: "bukan-sandi" }),
  });
  assert(badPassword.status === 403, "Sandi ITPO salah → 403");
  const plenoLocked = await api("/api/itpo/reset", {
    method: "POST", headers: { Cookie: itpo.cookie },
    body: JSON.stringify({ mode: "DEMO", newPeriodLabel: "Uji Pleno", confirmPhrase: "RESET PEMIRA", password: "itpo123" }),
  });
  assert(plenoLocked.status === 409 && plenoLocked.body.code === "PLENO_LOCKED",
    "Kotak suara terkunci (pleno belum dibuka) → 409 PLENO_LOCKED — suara belum direkap tak boleh dilenyuhkan");

  // ================= 2. PLENO UNLOCK + PRATINJAU =================
  console.log("\n=== 2. Pleno Unlocking (KPUM) + pratinjau arsip ===");
  const unlock = await api("/api/tally/unlock", { method: "POST", headers: { Cookie: kpum.cookie } });
  assert(unlock.status === 200 && unlock.body.ok, "Pleno Unlocking oleh KPUM → 200 (FR-06.3)");

  // Ambil ulang hitungan TERKINI (login & percobaan gagal menambah audit log)
  const statusFresh = await api("/api/itpo/reset", { headers: { Cookie: itpo.cookie } });
  const auditNow = statusFresh.body.status.counts.auditLogs;

  const preview = await api("/api/itpo/reset/preview", {
    method: "POST", headers: { Cookie: itpo.cookie },
    body: JSON.stringify({ mode: "DEMO", note: "Uji pratinjau" }),
  });
  assert(preview.status === 200 && preview.body.ok, "Pratinjau arsip (belum disegel) → 200");
  assert(!!preview.body.payload?.signature && !!preview.body.payload?.canonical,
    "Pratinjau memuat kanonikal BA + tanda tangan SHA-256");
  assert(preview.body.payload.auditLogSnapshot.length === auditNow,
    `Snapshot audit log utuh (${auditNow} entri saat pratinjau)`);
  assert(preview.body.payload.tally.categories.length >= 3, "Rekap lengkap tersedia (pleno terbuka)");
  const previewSig = preview.body.payload.signature;

  // ================= 3. RESET MODE DEMO (GELOMBANG ULANG) =================
  console.log("\n=== 3. Eksekusi Segel & Reset — mode DEMO ===");
  const demo = await api("/api/itpo/reset", {
    method: "POST", headers: { Cookie: itpo.cookie },
    body: JSON.stringify({ mode: "DEMO", newPeriodLabel: "Pemira Gelombang Ulang 2026", confirmPhrase: "RESET PEMIRA", password: "itpo123", note: "Uji E2E gelombang ulang" }),
  });
  assert(demo.status === 200 && demo.body.ok, "Reset mode DEMO → 200");
  assert(demo.body.archiveCode === "ARS-2026-0001", `Arsip diberi kode: ${demo.body.archiveCode}`);
  assert(demo.body.postCounts.ballots === 0 && demo.body.postCounts.tokens === 0, "Suara & token terhapus (genesis bersih)");
  assert(demo.body.postCounts.dpt === oldDpt && demo.body.postCounts.candidates === oldCandidates,
    `DPT (${oldDpt}) & kandidat (${oldCandidates}) DIPERTAHANKAN pada mode gelombang ulang`);
  const oldCookie = itpo.cookie;

  // ================= 4. ROTASI SESI (secret baru) =================
  console.log("\n=== 4. Rotasi secret — sesi lama hangus ===");
  const stale = await api("/api/admin/overview", { headers: { Cookie: oldCookie } });
  assert(stale.status === 401, "Sesi ITPO lama ditolak 401 setelah rotasi secret");
  const relogin = await login("itpo", "itpo123");
  assert(!!relogin.cookie, "Login ulang ITPO → sesi baru diterbitkan");
  // SELURUH sesi operator lain juga hangus (by design) — re-login semua
  const kpum2 = await login("kpum", "kpum123");
  const ppur2 = await login("ppur", "ppur123");
  const panwaslu2 = await login("panwaslu", "panwaslu123");
  assert(!!kpum2.cookie && !!ppur2.cookie && !!panwaslu2.cookie, "KPUM/PPUR/PANWASLU login ulang (sesi lama mereka juga hangus)");

  // ================= 5. VERIFIKASI LEMBAR BARU =================
  console.log("\n=== 5. Verifikasi lembar baru & arsip unduhan ===");
  const status1 = await api("/api/itpo/reset", { headers: { Cookie: relogin.cookie } });
  const s1 = status1.body.status;
  assert(s1.periodLabel === "Pemira Gelombang Ulang 2026", `Periode aktif berganti: "${s1.periodLabel}"`);
  assert(s1.votingOpen === false && s1.plenoUnlocked === false, "Pemungutan TERTUTUP & pleno TERKUNCI kembali");
  assert(s1.counts.ballots === 0 && s1.counts.tokens === 0 && s1.counts.incidents === 0, "Suara, token, sengketa: 0");
  assert(s1.chains.length === 5 && s1.chains.every((c: any) => c.blocks === 0 && c.headHash === ""),
    "Lima rantai prodi genesis kosong (head '' & 0 blok)");
  assert(s1.archives.length === 1 && s1.archives[0].archiveCode === "ARS-2026-0001", "Arsip pertama tercantum di daftar");

  const dl = await api(`/api/itpo/reset/archives/${s1.archives[0].id}`, { headers: { Cookie: relogin.cookie } });
  assert(dl.status === 200 && !!dl.body, "Unduhan arsip final → 200 (attachment JSON)");
  const arch = dl.body;
  if (arch) {
    const recomputed = createHash("sha256").update(arch.canonical).digest("hex");
    assert(recomputed === arch.signature, `Tanda tangan arsip cocok hasil hitung ulang (BA lama: ${previewSig.slice(0, 8)}…)`);
    assert(arch.auditLogSnapshot.length >= auditNow,
      `Audit log lama tersegel utuh (${arch.auditLogSnapshot.length} entri ≥ ${auditNow} saat pratinjau)`);
    assert(arch.candidatesSnapshot.length === oldCandidates, `Kandidat lama tersegel (${arch.candidatesSnapshot.length})`);
    assert(arch.chainHeads.length === 5 && arch.chainHeads.every((c: any) => !!c.headHash), "Head kelima rantai lama tersegel (bukti append-only)");
    assert(arch.ballotCount === oldBallots, `Arsip mencatat ${oldBallots} blok suara periode lama`);
    assert(!!arch.summary.tally.revoteStats, "Statistik re-vote periode lama tersimpan di arsip");
  }

  const live = await api("/api/monitor/live", { headers: { Cookie: panwaslu2.cookie } });
  assert(live.status === 200 && JSON.stringify(live.body).includes("PERIOD_RESET"),
    "Audit log Panwaslu mencatat PERIOD_RESET sebagai entri pertama lembar baru");

  // ================= 6. PEMIRA ULANG BERJALAN =================
  console.log("\n=== 6. Siklus pemungutan dimulai ulang (DPT & kandidat pakai ulang) ===");
  const open = await api("/api/admin/settings", {
    method: "POST", headers: { Cookie: kpum2.cookie },
    body: JSON.stringify({ action: "TOGGLE_VOTING" }),
  });
  assert(open.status === 200 && open.body.settings.votingOpen === true, "KPUM membuka pemungutan lembar baru → 200");

  const voters = await api("/api/ppur/voters?q=&filter=BELUM_MEMILIH", { headers: { Cookie: ppur2.cookie } });
  assert(voters.status === 200 && voters.body.voters.length === oldDpt,
    `Seluruh DPT kembali BELUM_MEMILIH (${voters.body.voters.length} pemilih)`);
  const voter = voters.body.voters.find((v: any) => v.studyProgramId === "TPTP");
  const tok = await api("/api/ppur/issue-token", {
    method: "POST", headers: { Cookie: ppur2.cookie }, body: JSON.stringify({ voterId: voter.id }),
  });
  assert(tok.status === 200 && tok.body.ok, `Token baru diterbitkan untuk ${voter.nim} (TPTP)`);

  const portal = await api("/api/public/portal");
  const presma = portal.body.candidates.find((c: any) => c.category === "PRESMA");
  const dpm = portal.body.candidates.find((c: any) => c.category === "DPM");
  const hima = portal.body.candidates.find((c: any) => c.category === "HIMA" && c.studyProgramId === "TPTP");
  const submit = await api("/api/pemilih/submit", {
    method: "POST", body: JSON.stringify({
      token: tok.body.token,
      selections: {
        presmaCandidateId: presma.id,
        dpmCandidateId: dpm.id,
        himaCandidateId: hima?.id ?? null,
      },
    }),
  });
  assert(submit.status === 200 && submit.body.ok && submit.body.voteVersion === 1,
    "Suara pertama lembar baru tersimpan (voteVersion 1) — pemira ulang BERFUNGSI");

  const status2 = await api("/api/itpo/reset", { headers: { Cookie: relogin.cookie } });
  assert(status2.body.status.counts.ballots === 3, "Rantai TPTP kini berisi 3 blok suara baru");
  const tptpChain = status2.body.status.chains.find((c: any) => c.id === "TPTP");
  assert(tptpChain.blocks === 3 && !!tptpChain.headHash, `Head rantai TPTP terisi: ${tptpChain.headHash.slice(0, 12)}…`);

  // ================= 7. RESET MODE PERIODE BARU TOTAL =================
  console.log("\n=== 7. Eksekusi Segel & Reset — mode NEW_PERIOD ===");
  const unlock2 = await api("/api/tally/unlock", { method: "POST", headers: { Cookie: kpum2.cookie } });
  assert(unlock2.status === 200, "Pleno dibuka lagi untuk menutup lembar kedua");
  const period2 = await api("/api/itpo/reset", {
    method: "POST", headers: { Cookie: relogin.cookie },
    body: JSON.stringify({ mode: "NEW_PERIOD", newPeriodLabel: "Pemira Poltek CWE 2027", confirmPhrase: "RESET PEMIRA", password: "itpo123", note: "Uji E2E periode baru total" }),
  });
  assert(period2.status === 200 && period2.body.archiveCode === "ARS-2026-0002",
    `Reset mode NEW_PERIOD → 200, arsip kedua: ${period2.body.archiveCode}`);
  assert(period2.body.postCounts.dpt === 0 && period2.body.postCounts.candidates === 0,
    "DPT & kandidat DIKOSONGKAN pada mode periode baru total (tersimpan di arsip)");

  // Sesi hangus LAGI oleh rotasi secret reset kedua — login ulang utk inspeksi akhir
  const itpo3 = await login("itpo", "itpo123");
  const status3 = await api("/api/itpo/reset", { headers: { Cookie: itpo3.cookie } });
  const s3 = status3.body.status;
  assert(s3.periodLabel === "Pemira Poltek CWE 2027" && s3.archives.length === 2,
    `Periode aktif "${s3.periodLabel}" dengan 2 arsip tersimpan`);
  assert(s3.counts.dpt === 0 && s3.counts.candidates === 0 && s3.counts.auditLogs >= 1,
    `Lembar ketiga: DPT 0, kandidat 0, audit log mulai segar (${s3.counts.auditLogs} entri — PERIOD_RESET + login inspeksi)`);

  const dl2 = await api(`/api/itpo/reset/archives/${s3.archives[0].id}`, { headers: { Cookie: itpo3.cookie } });
  if (dl2.body) {
    const arch2 = dl2.body;
    assert(arch2.periodLabel === "Pemira Gelombang Ulang 2026", `Arsip #2 menyegel periode: "${arch2.periodLabel}"`);
    assert(arch2.candidatesSnapshot.length === oldCandidates && arch2.dptCount === oldDpt,
      `Snapshot kandidat (${arch2.candidatesSnapshot.length}) & DPT (${arch2.dptCount}) tersegel utk referensi pemulihan`);
  }
  const dl2b = await api(`/api/itpo/reset/archives/${s3.archives[1].id}`, { headers: { Cookie: itpo3.cookie } });
  if (dl2b.body) {
    const arch1 = dl2b.body;
    assert(arch1.archiveCode === "ARS-2026-0001" && arch1.mode === "DEMO", "Arsip #1 tetap utuh & terbaca (append-only arsip)");
  }

  console.log("\n==========================================");
  console.log(process.exitCode ? "❌ ADA ASERSI GAGAL" : "🎉 SELURUH ASERSI SEGEL & RESET LULUS");
}

main();
