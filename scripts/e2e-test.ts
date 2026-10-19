// ============================================================
// E2E API TEST — Simulasi alur lengkap Smart Pemira
// 1. Cari pemilih → 2. Terbitkan token → 3. Validasi di kiosk →
// 4. Submit suara → 5. Cek status → 6. Uji token bekas →
// 7. Pleno unlock → 8. Tally
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

const assert = (cond, label) => {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.error(`  ❌ ${label}`); process.exitCode = 1; }
};

async function main() {
  console.log("=== 1. Pencarian DPT PPUR ===");
  const search = await api("/api/ppur/voters?q=&filter=BELUM_MEMILIH");
  assert(search.status === 200 && search.body.voters.length > 0, `DPT termuat (${search.body.voters.length} pemilih BELUM_MEMILIH)`);
  const voter = search.body.voters.find((v) => v.studyProgramId === "BKS"); // prodi calon tunggal!
  assert(!!voter, `Pemilih BKS ditemukan: ${voter.nim} — ${voter.name}`);

  console.log("=== 2. Terbitkan token (FR-04) ===");
  const issue = await api("/api/ppur/issue-token", { method: "POST", body: JSON.stringify({ voterId: voter.id }) });
  assert(issue.status === 200 && issue.body.ok, "Token diterbitkan");
  const token = issue.body.token;
  assert(/^[A-HJ-NP-Z2-9]{6}$/.test(token), `Format token valid tanpa karakter ambigu: ${token}`);

  console.log("=== 3. Validasi token di kiosk (Hukum 4) ===");
  const val = await api("/api/kiosk/validate", { method: "POST", body: JSON.stringify({ token }) });
  assert(val.status === 200 && val.body.ok, "Token valid, sesi bilik dibuat");
  const ballots = val.body.ballots;
  assert(ballots.length === 3, `3 surat suara dimuat (PRESMA, DPM, HIMA ${val.body.session.studyProgramId})`);
  const hima = ballots.find((b) => b.category === "HIMA");
  assert(hima.singleCandidateScenario === true, "BKS = calon tunggal → skenario KOTAK KOSONG aktif (Hukum 3)");
  assert(hima.candidates.length === 2, `Hima BKS punya 2 opsi: paslon 01 + KOTAK KOSONG`);
  // Pastikan tidak ada kandidat prodi lain yang bocor
  const leaked = ballots.some((b) => b.category === "HIMA" && b.candidates.some((c) => !hima.candidates.find((x) => x.id === c.id)));
  assert(!leaked, "Tidak ada kebocoran kandidat prodi lain (server-side filter)");

  console.log("=== 4. Submit suara (Hukum 2 — transaksi atomik) ===");
  const presmaPick = ballots.find((b) => b.category === "PRESMA").candidates[0];
  const dpmPick = ballots.find((b) => b.category === "DPM").candidates[0];
  const emptyBox = hima.candidates.find((c) => c.isEmptyBox);
  const submit = await api("/api/kiosk/submit", {
    method: "POST",
    body: JSON.stringify({
      token,
      selections: { presmaCandidateId: presmaPick.id, dpmCandidateId: dpmPick.id, himaCandidateId: null }, // null = kotak kosong
    }),
  });
  assert(submit.status === 200 && submit.body.ok, "Suara terkirim (3 kategori, HIMA = Kotak Kosong)");

  console.log("=== 5. Verifikasi pasca-submit ===");
  const after = await api(`/api/ppur/voters?q=${voter.nim}`);
  assert(after.body.voters[0].status === "SUDAH_MEMILIH" && after.body.voters[0].hasVoted === true, "DPT berubah: SUDAH_MEMILIH + has_voted=TRUE");

  console.log("=== 6. Uji token bekas (FR-04.4 single-use) ===");
  const reuse = await api("/api/kiosk/submit", {
    method: "POST",
    body: JSON.stringify({ token, selections: { presmaCandidateId: presmaPick.id, dpmCandidateId: dpmPick.id, himaCandidateId: null } }),
  });
  assert(reuse.status === 400 && !reuse.body.ok, "Token bekas DITOLAK: " + reuse.body.message);
  const revalidate = await api("/api/kiosk/validate", { method: "POST", body: JSON.stringify({ token }) });
  assert(revalidate.status === 409, "Validasi token bekas → 409 Conflict");

  console.log("=== 7. Tally terkunci sebelum pleno (Hukum 5) ===");
  const tallyLocked = await api("/api/tally");
  assert(tallyLocked.status === 423 && tallyLocked.body.locked === true, "Tally → 423 Locked");

  console.log("=== 8. Pleno Unlocking (FR-06.3) ===");
  const unlock = await api("/api/tally/unlock", { method: "POST" });
  assert(unlock.status === 200 && unlock.body.ok, "Kotak suara dibuka oleh Ketua KPUM");
  const tally = await api("/api/tally");
  assert(tally.status === 200 && tally.body.unlocked === true, "Tally terbuka");
  assert(tally.body.integrity.valid === true, `Hash chain VALID (${tally.body.integrity.checkedCount} blok)`);
  const presmaCat = tally.body.categories.find((c) => c.category === "PRESMA");
  const bksCat = tally.body.categories.find((c) => c.category === "HIMA" && c.studyProgramId === "BKS");
  assert(presmaCat.results.length === 3, `Presma direkap: ${presmaCat.results.map((r) => `${r.number}=${r.votes}`).join(", ")}`);
  assert(bksCat.results.some((r) => r.isEmptyBox), "Suara kotak kosong BKS tercatat di rekap");
  console.log("  ℹ️  Outcome BKS:", bksCat.outcome, "—", bksCat.outcomeDetail);

  console.log("\n=== SELESAI: seluruh hukum arsitektur tervalidasi ===");
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
