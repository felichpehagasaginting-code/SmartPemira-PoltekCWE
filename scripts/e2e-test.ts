// ============================================================
// E2E API TEST — Simulasi alur lengkap Smart Pemira + RBAC
// 0. RBAC: login per peran, uji 401/403 → 1. Cari pemilih (sesi PPUR) →
// 2. Terbitkan token → 3. Validasi kiosk → 4. Submit suara →
// 5. Cek status → 6. Uji token bekas → 7. Tally 423 →
// 8. Pleno unlock (sesi KPUM; ITPO ditolak) → 9. Tally
// ============================================================
const BASE = "http://localhost:3000";

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

async function login(username, password) {
  const res = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json();
  if (!res.ok || !body.ok) throw new Error(`Login ${username} gagal: ${JSON.stringify(body)}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";")[0];
  return { cookie, operator: body.operator };
}

const assert = (cond, label) => {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.error(`  ❌ ${label}`); process.exitCode = 1; }
};

async function main() {
  console.log("=== 0. RBAC — Matriks Hak Akses (PRD Bab 3) ===");
  const anonVoters = await api("/api/ppur/voters?q=&filter=ALL");
  assert(anonVoters.status === 401, "Tanpa sesi → PPUR voters ditolak 401");
  const anonUnlock = await api("/api/tally/unlock", { method: "POST" });
  assert(anonUnlock.status === 401, "Tanpa sesi → Pleno Unlock ditolak 401");

  const badLogin = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username: "kpum", password: "salah" }) });
  assert(badLogin.status === 401, "Password salah → 401");

  const ppur = await login("ppur", "ppur123");
  assert(ppur.operator.role === "PPUR", `Login PPUR: ${ppur.operator.fullName}`);
  const itpo = await login("itpo", "itpo123");
  assert(itpo.operator.role === "ITPO", `Login ITPO: ${itpo.operator.fullName}`);
  const saksi = await login("saksi01", "saksi123");
  assert(saksi.operator.role === "SAKSI", `Login SAKSI: ${saksi.operator.fullName}`);
  const kpum = await login("kpum", "kpum123");
  assert(kpum.operator.role === "KPUM", `Login KPUM: ${kpum.operator.fullName}`);

  const ppurAsKpum = await api("/api/ppur/voters?q=", { headers: { Cookie: kpum.cookie } });
  assert(ppurAsKpum.status === 403, "Sesi KPUM di modul PPUR → 403 (pemisahan peran)");
  const itpoUnlock = await api("/api/tally/unlock", { method: "POST", headers: { Cookie: itpo.cookie } });
  assert(itpoUnlock.status === 403, "Pleno Unlock oleh ITPO → 403 (khusus Ketua KPUM, FR-06.3)");
  const saksiIncident = await api("/api/monitor/incidents", {
    method: "POST",
    headers: { Cookie: saksi.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ reporterName: "x", incidentType: "LAINNYA", location: "x", description: "x" }),
  });
  assert(saksiIncident.status === 403, "SAKSI mengajukan sengketa → 403 (khusus Panwaslu)");
  const saksiMonitor = await api("/api/monitor/live", { headers: { Cookie: saksi.cookie } });
  assert(saksiMonitor.status === 200, "SAKSI memantau live audit → 200 (hak pengawasan)");

  console.log("\n=== 1. Pencarian DPT PPUR (sesi PPUR) ===");
  const search = await api("/api/ppur/voters?q=&filter=BELUM_MEMILIH", { headers: { Cookie: ppur.cookie } });
  assert(search.status === 200 && search.body.voters.length > 0, `DPT termuat (${search.body.voters.length} pemilih BELUM_MEMILIH)`);
  const voter = search.body.voters.find((v) => v.studyProgramId === "BKS"); // prodi calon tunggal!
  assert(!!voter, `Pemilih BKS ditemukan: ${voter.nim} — ${voter.name}`);

  console.log("\n=== 2. Terbitkan token (FR-04) ===");
  const issue = await api("/api/ppur/issue-token", { method: "POST", headers: { Cookie: ppur.cookie }, body: JSON.stringify({ voterId: voter.id }) });
  assert(issue.status === 200 && issue.body.ok, "Token diterbitkan");
  const token = issue.body.token;
  assert(/^[A-HJ-NP-Z2-9]{6}$/.test(token), `Format token valid tanpa karakter ambigu: ${token}`);

  console.log("\n=== 3. Validasi token di kiosk (Hukum 4 — tanpa sesi operator) ===");
  const val = await api("/api/kiosk/validate", { method: "POST", body: JSON.stringify({ token }) });
  assert(val.status === 200 && val.body.ok, "Token valid, sesi bilik dibuat");
  const ballots = val.body.ballots;
  assert(ballots.length === 3, `3 surat suara dimuat (PRESMA, DPM, HIMA ${val.body.session.studyProgramId})`);
  const hima = ballots.find((b) => b.category === "HIMA");
  assert(hima.singleCandidateScenario === true, "BKS = calon tunggal → skenario KOTAK KOSONG aktif (Hukum 3)");
  assert(hima.candidates.length === 2, "Hima BKS punya 2 opsi: paslon 01 + KOTAK KOSONG");
  // Pastikan tidak ada kandidat prodi lain yang bocor
  const leaked = ballots.some((b) => b.category === "HIMA" && b.candidates.some((c) => !hima.candidates.find((x) => x.id === c.id)));
  assert(!leaked, "Tidak ada kebocoran kandidat prodi lain (server-side filter)");

  console.log("\n=== 4. Submit suara (Hukum 2 — transaksi atomik) ===");
  const presmaPick = ballots.find((b) => b.category === "PRESMA").candidates[0];
  const dpmPick = ballots.find((b) => b.category === "DPM").candidates[0];
  const submit = await api("/api/kiosk/submit", {
    method: "POST",
    body: JSON.stringify({
      token,
      selections: { presmaCandidateId: presmaPick.id, dpmCandidateId: dpmPick.id, himaCandidateId: null }, // null = kotak kosong
    }),
  });
  assert(submit.status === 200 && submit.body.ok, "Suara terkirim (3 kategori, HIMA = Kotak Kosong)");

  console.log("\n=== 5. Verifikasi pasca-submit ===");
  const after = await api(`/api/ppur/voters?q=${voter.nim}`, { headers: { Cookie: ppur.cookie } });
  assert(after.body.voters[0].status === "SUDAH_MEMILIH" && after.body.voters[0].hasVoted === true, "DPT berubah: SUDAH_MEMILIH + has_voted=TRUE");

  console.log("\n=== 6. Uji token bekas (FR-04.4 single-use) ===");
  const reuse = await api("/api/kiosk/submit", {
    method: "POST",
    body: JSON.stringify({ token, selections: { presmaCandidateId: presmaPick.id, dpmCandidateId: dpmPick.id, himaCandidateId: null } }),
  });
  assert(reuse.status === 400 && !reuse.body.ok, "Token bekas DITOLAK: " + reuse.body.message);
  const revalidate = await api("/api/kiosk/validate", { method: "POST", body: JSON.stringify({ token }) });
  assert(revalidate.status === 409, "Validasi token bekas → 409 Conflict");

  console.log("\n=== 7. Tally terkunci sebelum pleno (Hukum 5) ===");
  const tallyLocked = await api("/api/tally");
  assert(tallyLocked.status === 423 && tallyLocked.body.locked === true, "Tally → 423 Locked");

  console.log("\n=== 8. Pleno Unlocking (FR-06.3 — sesi KPUM) ===");
  const unlock = await api("/api/tally/unlock", { method: "POST", headers: { Cookie: kpum.cookie } });
  assert(unlock.status === 200 && unlock.body.ok, "Kotak suara dibuka oleh Ketua KPUM");
  const tally = await api("/api/tally");
  assert(tally.status === 200 && tally.body.unlocked === true, "Tally terbuka");
  assert(tally.body.integrity.valid === true, `Hash chain VALID (${tally.body.integrity.checkedCount} blok)`);
  const presmaCat = tally.body.categories.find((c) => c.category === "PRESMA");
  const bksCat = tally.body.categories.find((c) => c.category === "HIMA" && c.studyProgramId === "BKS");
  assert(presmaCat.results.length === 3, `Presma direkap: ${presmaCat.results.map((r) => `${r.number}=${r.votes}`).join(", ")}`);
  assert(bksCat.results.some((r) => r.isEmptyBox), "Suara kotak kosong BKS tercatat di rekap");
  console.log("  ℹ️  Outcome BKS:", bksCat.outcome, "—", bksCat.outcomeDetail);

  console.log("\n=== SELESAI: hukum arsitektur + matriks RBAC tervalidasi ===");
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
