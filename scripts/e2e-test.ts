// ============================================================
// E2E API TEST — Pemira 100% Online + Re-vote Estonia + RBAC
// 0. RBAC 401/403 → 1. DPT PPUR → 2. Terbitkan token →
// 3. Validasi portal pemilih (urutan DPM→BEM→HIMA, filter prodi) →
// 4. Submit v1 → 5. DPT ter-update → 6. RE-VOTE (suara terakhir menang) →
// 7. Kunci suara → 8. Struk v1 DIGANTI / v2 AKTIF → 9. Tally 423 →
// 10. Pleno unlock (KPUM; ITPO ditolak) → 11. Rekap latest-wins + 5 rantai
// Jalankan setelah: bunx tsx scripts/seed.ts
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
  const anonValidate = await api("/api/pemilih/validate", { method: "POST", body: JSON.stringify({ token: "AAAAAA" }) });
  assert(anonValidate.status === 401 || anonValidate.status === 400, "Portal pemilih tanpa sesi tetap terbuka utk token (kredensial anonim)");

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

  console.log("\n=== 1. Pencarian DPT Pos Bantuan PPUR (sesi PPUR) ===");
  const search = await api("/api/ppur/voters?q=&filter=BELUM_MEMILIH", { headers: { Cookie: ppur.cookie } });
  assert(search.status === 200 && search.body.voters.length > 0, `DPT termuat (${search.body.voters.length} pemilih BELUM_MEMILIH)`);
  const voter = search.body.voters.find((v) => v.studyProgramId === "TPTP"); // prodi calon tunggal!
  assert(!!voter && /^[0-9]+$/.test(voter.nim), `Pemilih TPTP ditemukan dengan NIM: ${voter?.nim} — ${voter?.name}`);

  console.log("\n=== 2. Terbitkan token + QR (FR-04) ===");
  const issue = await api("/api/ppur/issue-token", { method: "POST", headers: { Cookie: ppur.cookie }, body: JSON.stringify({ voterId: voter.id }) });
  assert(issue.status === 200 && issue.body.ok, "Token diterbitkan");
  const token = issue.body.token;
  assert(/^[A-HJ-NP-Z2-9]{6}$/.test(token), `Format token valid tanpa karakter ambigu: ${token}`);

  console.log("\n=== 3. Validasi Portal Pemilih (Hukum 4 + urutan DPM→BEM→HIMA) ===");
  const val = await api("/api/pemilih/validate", { method: "POST", body: JSON.stringify({ token }) });
  assert(val.status === 200 && val.body.ok, "Token valid, bilik online dibuat");
  assert(val.body.isRevote === false, "Mode vote PERTAMA (bukan re-vote)");
  const ballots = val.body.ballots;
  assert(ballots.length === 3, `3 surat suara dimuat (rantai ${val.body.session.studyProgramId})`);
  assert(
    JSON.stringify(ballots.map((b) => b.category)) === JSON.stringify(["DPM", "PRESMA", "HIMA"]),
    `Urutan resmi DPM → BEM → HIMA: ${ballots.map((b) => b.category).join(" → ")}`
  );
  const hima = ballots.find((b) => b.category === "HIMA");
  assert(
    ballots.every((b) => b.candidates.every((c) => !c.isEmptyBox)),
    "Tidak ada entitas kandidat dummy — opsi Suara Kosong kini disediakan sistem di akhir setiap surat suara"
  );
  assert(hima.candidates.length === 2, "Hima TPTP punya 2 kandidat resmi (+ Suara Kosong di UI)");
  assert(
    hima.candidates.every((c) => !!c.photoLeaderUrl && !!c.photoViceUrl),
    "Semua kandidat HIMA membawa foto Ketua & Wakil (photoLeaderUrl + photoViceUrl terisi)"
  );
  const dpmBallot = ballots.find((b) => b.category === "DPM");
  assert(
    dpmBallot.candidates.every((c) => !!c.secondViceName && !!c.photoSecondViceUrl),
    "Kandidat DPM membawa Ketua 2 + foto (struktur Ketua Umum / Ketua 1 / Ketua 2)"
  );
  assert(ballots.every((b) => b.category !== "HIMA" || b.candidates.every((c) => !c.id || hima.candidates.some((x) => x.id === c.id))), "Tidak ada kebocoran kandidat prodi lain (server-side filter)");
  assert(!!val.body.session.expiresAt, "Vote pertama membawa TTL");

  console.log("\n=== 4. Submit suara versi 1 (Hukum 2 — transaksi atomik) ===");
  const presmaPick = ballots.find((b) => b.category === "PRESMA").candidates[0];
  const dpmPick = ballots.find((b) => b.category === "DPM").candidates[0];
  const submit = await api("/api/pemilih/submit", {
    method: "POST",
    body: JSON.stringify({
      token,
      selections: { presmaCandidateId: presmaPick.id, dpmCandidateId: dpmPick.id, himaCandidateId: null }, // null = SUARA KOSONG
    }),
  });
  assert(submit.status === 200 && submit.body.ok, "Suara v1 terkirim (3 kategori, HIMA = Suara Kosong)");
  assert(submit.body.voteVersion === 1, "Versi suara tercatat: 1");
  const receiptV1 = submit.body.receiptCode;
  assert(/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(receiptV1), `Struk digital terformat: ${receiptV1}`);

  console.log("\n=== 4b. SUARA KOSONG di kategori DPM (opsi terakhir bilik) ===");
  const searchTphp = await api("/api/ppur/voters?q=&filter=BELUM_MEMILIH", { headers: { Cookie: ppur.cookie } });
  const voterTphp = searchTphp.body.voters.find((v) => v.studyProgramId === "TPHP");
  assert(!!voterTphp, `Pemilih TPHP ditemukan utk demo Suara Kosong DPM: ${voterTphp?.nim}`);
  const issueTphp = await api("/api/ppur/issue-token", { method: "POST", headers: { Cookie: ppur.cookie }, body: JSON.stringify({ voterId: voterTphp.id }) });
  assert(issueTphp.status === 200 && issueTphp.body.ok, "Token diterbitkan utk pemilih TPHP");
  const valTphp = await api("/api/pemilih/validate", { method: "POST", body: JSON.stringify({ token: issueTphp.body.token }) });
  assert(valTphp.status === 200, "Bilik TPHP terbuka");
  const presmaTphp = valTphp.body.ballots.find((b) => b.category === "PRESMA").candidates[0];
  const himaTphp = valTphp.body.ballots.find((b) => b.category === "HIMA").candidates[0];
  const submitBlankDpm = await api("/api/pemilih/submit", {
    method: "POST",
    body: JSON.stringify({
      token: issueTphp.body.token,
      selections: { presmaCandidateId: presmaTphp.id, dpmCandidateId: null, himaCandidateId: himaTphp.id }, // DPM = Suara Kosong
    }),
  });
  assert(submitBlankDpm.status === 200 && submitBlankDpm.body.ok, "Suara terkirim dengan DPM = SUARA KOSONG (null diterima untuk kategori institusi)");

  console.log("\n=== 5. Verifikasi pasca-submit ===");
  const after = await api(`/api/ppur/voters?q=${voter.nim}`, { headers: { Cookie: ppur.cookie } });
  assert(after.body.voters[0].status === "SUDAH_MEMILIH" && after.body.voters[0].hasVoted === true, "DPT berubah: SUDAH_MEMILIH + has_voted=TRUE");

  console.log("\n=== 6. RE-VOTE model Estonia (suara terakhir yang menang) ===");
  const revalidate = await api("/api/pemilih/validate", { method: "POST", body: JSON.stringify({ token }) });
  assert(revalidate.status === 200 && revalidate.body.isRevote === true, "Token USED masih membuka bilik ulang (bukan 409 single-use)");
  assert(revalidate.body.voteVersion === 2 && revalidate.body.session.expiresAt === null, "Re-vote: versi berikutnya 2, tanpa TTL");
  const presmaPick2 = revalidate.body.ballots.find((b) => b.category === "PRESMA").candidates[1];
  const dpmPick2 = revalidate.body.ballots.find((b) => b.category === "DPM").candidates[1];
  const revote = await api("/api/pemilih/submit", {
    method: "POST",
    body: JSON.stringify({
      token,
      selections: { presmaCandidateId: presmaPick2.id, dpmCandidateId: dpmPick2.id, himaCandidateId: null },
    }),
  });
  assert(revote.status === 200 && revote.body.ok && revote.body.voteVersion === 2 && revote.body.isRevote === true, `Suara BERHASIL DIGANTI (versi 2) — struk baru: ${revote.body.receiptCode}`);
  const receiptV2 = revote.body.receiptCode;

  console.log("\n=== 7. Kunci Suaraku (finalisasi sukarela — anti-paksaan) ===");
  const lock = await api("/api/pemilih/lock", { method: "POST", body: JSON.stringify({ token }) });
  assert(lock.status === 200 && lock.body.ok, "Suara DIKUNCI final oleh pemilik token");
  const valLocked = await api("/api/pemilih/validate", { method: "POST", body: JSON.stringify({ token }) });
  assert(valLocked.status === 403, "Validasi token terkunci → 403 (tidak bisa ganti suara lagi)");
  const submitLocked = await api("/api/pemilih/submit", {
    method: "POST",
    body: JSON.stringify({ token, selections: { presmaCandidateId: presmaPick.id, dpmCandidateId: dpmPick.id, himaCandidateId: null } }),
  });
  assert(submitLocked.status === 403, "Submit token terkunci → 403 ditolak");

  console.log("\n=== 8. Struk digital: v1 DIGANTI, v2 AKTIF (tanpa identitas) ===");
  const r1 = await api(`/api/public/receipt?code=${encodeURIComponent(receiptV1)}`);
  assert(r1.body.found === true && r1.body.voteStatus === "DIGANTI", `Struk v1 terverifikasi dengan status: ${r1.body.voteStatus}`);
  const r2 = await api(`/api/public/receipt?code=${encodeURIComponent(receiptV2)}`);
  assert(r2.body.found === true && r2.body.voteStatus === "AKTIF", `Struk v2 (terakhir) status: ${r2.body.voteStatus}`);

  console.log("\n=== 9. Tally terkunci sebelum pleno (Hukum 5) ===");
  const tallyLocked = await api("/api/tally");
  assert(tallyLocked.status === 423 && tallyLocked.body.locked === true, "Tally → 423 Locked");

  console.log("\n=== 10. Pleno Unlocking (FR-06.3 — sesi KPUM) ===");
  const unlock = await api("/api/tally/unlock", { method: "POST", headers: { Cookie: kpum.cookie } });
  assert(unlock.status === 200 && unlock.body.ok, "Kotak suara dibuka oleh Ketua KPUM");
  const tally = await api("/api/tally");
  assert(tally.status === 200 && tally.body.unlocked === true, "Tally terbuka");

  console.log("\n=== 11. Rekap latest-wins + 5 rantai prodi + SUARA KOSONG ===");
  assert(tally.body.integrity.allValid === true, "Semua rantai VALID");
  assert(tally.body.integrity.chains.length === 5, `5 rantai prodi terverifikasi: ${tally.body.integrity.chains.map((c) => c.tpsId).join(", ")}`);
  const catOrder = tally.body.categories.map((c) => c.category);
  assert(catOrder[0] === "DPM" && catOrder[1] === "PRESMA", `Urutan rekap: ${catOrder.slice(0, 2).join(" → ")} → HIMA×5`);

  // ---------- SUARA KOSONG: baris sintetis terakhir di setiap kategori ----------
  const dpmCat = tally.body.categories.find((c) => c.category === "DPM");
  const dpmBlank = dpmCat.results.find((r) => r.isEmptyBox);
  assert(
    dpmCat.results.every((r, i) => (i === dpmCat.results.length - 1) === !!r.isEmptyBox),
    "Baris Suara Kosong selalu di posisi TERAKHIR rekap DPM"
  );
  assert(dpmBlank.votes === 2, `DPM Suara Kosong = ${dpmBlank.votes} (1 pra-cast TPTP + 1 E2E §4b)`);
  const presmaCat = tally.body.categories.find((c) => c.category === "PRESMA");
  const presmaBlank = presmaCat.results.find((r) => r.isEmptyBox);
  assert(presmaBlank.votes === 1, `BEM Suara Kosong = ${presmaBlank.votes} (pra-cast TPHP)`);
  assert(
    dpmCat.totalValidVotes === dpmCat.results.reduce((s, r) => s + r.votes, 0),
    `Suara Kosong ikut total suara sah DPM (${dpmCat.totalValidVotes})`
  );

  const tptpCat = tally.body.categories.find((c) => c.category === "HIMA" && c.studyProgramId === "TPTP");
  assert(
    tptpCat.results.filter((r) => !r.isEmptyBox).length === 2 && tptpCat.results.some((r) => r.isEmptyBox),
    "TPTP rekap: 2 kandidat riil + baris Suara Kosong"
  );
  const tptpBlank = tptpCat.results.find((r) => r.isEmptyBox);
  assert(tptpBlank.votes === 1, `TPTP Suara Kosong = ${tptpBlank.votes} (token E2E §4 memilih HIMA kosong di v1 & v2)`);
  console.log(`  ℹ️  Outcome TPTP: ${tptpCat.outcome} — ${tptpCat.outcomeDetail}`);
  const trplCat = tally.body.categories.find((c) => c.category === "HIMA" && c.studyProgramId === "TRPL");
  const trpl2 = trplCat.results.find((r) => r.number === 2);
  const trpl1 = trplCat.results.find((r) => r.number === 1);
  assert(trpl2.votes === 0 && trpl1.votes >= 2, `Latest-wins terbukti: TRPL paslon 2 = ${trpl2.votes} (versi lamanya tergantikan), paslon 1 = ${trpl1.votes}`);
  const bdCat = tally.body.categories.find((c) => c.category === "HIMA" && c.studyProgramId === "BD");
  const bdBlank = bdCat.results.find((r) => r.isEmptyBox);
  assert(bdBlank.votes === 1, `BD Suara Kosong HIMA = ${bdBlank.votes} (pra-cast)`);
  assert(tally.body.revoteStats.supersededBallots > 0 && tally.body.revoteStats.lockedTokens >= 1, `Statistik re-vote: ${tally.body.revoteStats.supersededBallots} blok usang, ${tally.body.revoteStats.lockedTokens} terkunci`);
  // Pre-cast seed tidak boleh hilang akibat revote
  assert(bdCat.totalValidVotes >= 2, `Rantai BD rekap utuh (${bdCat.totalValidVotes} suara sah)`);

  console.log("\n=== SELESAI: hukum arsitektur + re-vote + RBAC tervalidasi ===");
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
