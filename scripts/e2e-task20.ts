// ============================================================
// E2E TASK 20 — Verifikasi Rekomendasi #2 (Ed25519), #3 (2FA), #7 (Alerting)
// Server produksi dijalankan terhadap KLON DB (/tmp/pemira-e2e-task20.db).
// Jalankan: bun scripts/e2e-task20.ts   (server harus hidup di :3210)
// ============================================================
process.env.DATABASE_URL = "file:/tmp/pemira-e2e-task20.db";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/server/auth";
import { totpAt } from "@/lib/server/totp";

const BASE = "http://127.0.0.1:3210";
const PASS = "SandiE2E-2026!";
let failures = 0;

function check(name: string, cond: boolean, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);
  if (!cond) failures++;
}

async function call(method: string, path: string, body?: unknown, cookie?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const session = setCookies.map((c) => c.split(";")[0]).find((c) => c.includes("session"));
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, cookie: session };
}

async function login(username: string, totpCode?: string) {
  return call("POST", "/api/auth/login", { username, password: PASS, totpCode });
}

// ---------- Seed operator e2e pada DB klon ----------
const USERS: Array<[string, string]> = [
  ["itpo-e2e20", "ITPO"],
  ["kpum-e2e20", "KPUM"],
  ["panwas-e2e20", "PANWASLU"],
];
for (const [username, role] of USERS) {
  await db.operator.upsert({
    where: { username },
    update: { passwordHash: hashPassword(PASS), isActive: true, totpSecret: null, totpPendingSecret: null, totpEnabledAt: null, backupCodesJson: null },
    create: { username, passwordHash: hashPassword(PASS), role, fullName: `E2E ${role} 20` },
  });
}
console.log("Seed operator e2e siap (DB klon).");

// ========== #3 2FA — siklus penuh ==========
let r = await login("itpo-e2e20");
check("login awal tanpa 2FA sukses", r.status === 200 && r.json?.ok === true, `status=${r.status}`);
const itpoCookie = r.cookie ?? "";

r = await call("GET", "/api/auth/2fa", undefined, itpoCookie);
check("status 2FA awal: belum aktif & wajib utk ITPO", r.json?.twoFactor?.enabled === false && r.json?.twoFactor?.mandatory === true);

r = await call("POST", "/api/auth/2fa", { action: "setup" }, itpoCookie);
const secret: string | undefined = r.json?.secret;
check("setup: secret + otpauth URI diberikan", r.status === 200 && !!secret && String(r.json?.otpauthUri).startsWith("otpauth://totp/"));

const counter = Math.floor(Date.now() / 1000 / 30);
r = await call("POST", "/api/auth/2fa", { action: "enable", code: totpAt(secret!, counter) }, itpoCookie);
const backupCodes: string[] = r.json?.backupCodes ?? [];
check("enable dengan kode TOTP → 8 kode cadangan", r.status === 200 && backupCodes.length === 8, `n=${backupCodes.length}`);

r = await login("itpo-e2e20");
check("login TANPA kode ditolak (needs2fa)", r.status === 401 && r.json?.needs2fa === true);

r = await login("itpo-e2e20", "000000");
check("login dengan kode salah ditolak", r.status === 401 && r.json?.needs2fa === true);

r = await login("itpo-e2e20", totpAt(secret!, Math.floor(Date.now() / 1000 / 30)));
check("login dengan kode TOTP sah → sukses", r.status === 200 && r.json?.ok === true);

r = await login("itpo-e2e20", backupCodes[0]);
check("login dengan kode cadangan → sukses", r.status === 200 && r.json?.ok === true);

r = await login("itpo-e2e20", backupCodes[0]);
check("kode cadangan yang sama dipakai ulang → hangus (ditolak)", r.status === 401);

r = await call("GET", "/api/auth/2fa", undefined, itpoCookie);
check("status: aktif, sisa 7 kode cadangan", r.json?.twoFactor?.enabled === true && r.json?.twoFactor?.backupCodesRemaining === 7);

r = await call("POST", "/api/auth/2fa", { action: "disable", password: PASS, code: totpAt(secret!, Math.floor(Date.now() / 1000 / 30)) }, itpoCookie);
check("disable (password + kode) → 2FA mati", r.status === 200 && r.json?.ok === true);
r = await login("itpo-e2e20");
check("login kembali tanpa kode → sukses", r.status === 200);

// ========== #7 Alerting ==========
r = await login("panwas-e2e20");
const panwasCookie = r.cookie ?? "";
r = await call("GET", "/api/monitor/alerts", undefined, panwasCookie);
const alertIds: string[] = (r.json?.alerts ?? []).map((a: { id: string }) => a.id);
check("GET /api/monitor/alerts → evaluator jalan", r.status === 200 && r.json?.ok === true && Array.isArray(r.json?.alerts), `alerts=[${alertIds.join(", ")}]`);
check("peringatan kepatuhan 2FA hadir (KPUM belum 2FA)", alertIds.includes("2FA_KEPATUHAN"));

r = await call("POST", "/api/monitor/alerts", { alertId: "2FA_KEPATUHAN" }, panwasCookie);
check("ACK peringatan → tercatat append-only", r.status === 200 && r.json?.ok === true);

r = await call("GET", "/api/monitor/alerts", undefined, (await login("kpum-e2e20")).cookie);
check("KPUM juga boleh membaca alerts", r.status === 200 && r.json?.ok === true);

// ========== #2 Ed25519 Berita Acara ==========
await db.electionSetting.upsert({
  where: { id: "main" },
  create: { id: "main", sessionSecret: "e2e-task20", plenoUnlocked: true, plenoUnlockedAt: new Date() },
  update: { plenoUnlocked: true, plenoUnlockedAt: new Date(), emergencyFreeze: false },
});

const kpumCookie = (await login("kpum-e2e20")).cookie ?? "";
r = await call("GET", "/api/kpum/berita-acara", undefined, kpumCookie);
const doc = r.json?.document;
check("BA menghasilkan signatureEd25519 + konsisten", r.status === 200 && !!doc?.signatureEd25519 && doc?.ed25519Consistent === true);
check("BA memuat kunci publik untuk publikasi", typeof doc?.publicKeyPem === "string" && doc.publicKeyPem.includes("BEGIN PUBLIC KEY"));

const sigSha = doc?.signature as string;
const edsig = doc?.signatureEd25519 as string;
r = await fetch(`${BASE}/api/public/verify-ba?sig=${sigSha}&edsig=${encodeURIComponent(edsig)}`);
const vb = await r.json();
check("verify-ba publik: SHA-256 + Ed25519 VALID", vb?.valid === true && vb?.checks?.sha256 === true && vb?.checks?.ed25519 === true);

const tampered = (edsig.slice(0, -2) === edsig ? edsig.slice(0, -2) : edsig.slice(0, -2)) + (edsig.endsWith("AA") ? "BB" : "AA");
r = await fetch(`${BASE}/api/public/verify-ba?edsig=${encodeURIComponent(tampered)}`);
const vbt = await r.json();
check("verify-ba dengan edsig dipalsukan → DITOLAK", vbt?.valid === false && vbt?.checks?.ed25519 === false);

r = await fetch(`${BASE}/api/public/verify-ba?sig=${sigSha}`);
const vbs = await r.json();
check("verify-ba kompatibel (sig SHA-256 saja) → valid", vbs?.valid === true);

// ---------- Ringkasan ----------
console.log(`\n${failures === 0 ? "SEMUA CEK E2E LULUS" : `${failures} CEK GAGAL`}`);
await db.$disconnect();
process.exit(failures === 0 ? 0 : 1);
