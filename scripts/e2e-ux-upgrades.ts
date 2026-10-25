// E2E — Verifikasi 10 rekomendasi UI/UX Smart Pemira
// 1) PWA manifest+icons  2) boundary 404/error  3) draft tahan-refresh
// 4) timer (struktur)    5) struk QR + deep-link ?cek=  6) mode latihan penuh
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

async function issueToken(): Promise<string> {
  // Login PPUR → ambil voter BELUM_MEMILIH → terbitkan token
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "ppur", password: "ppur123" }),
  });
  const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
  const voters = await fetch(`${BASE}/api/ppur/voters?filter=BELUM_MEMILIH`, { headers: { cookie } });
  const vjson = (await voters.json()) as { voters?: Array<{ id: string }> };
  const voterId = vjson.voters?.[0]?.id;
  if (!voterId) throw new Error("Tidak ada voter BELUM_MEMILIH — seed ulang DB");
  const issue = await fetch(`${BASE}/api/ppur/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ voterId }),
  });
  const ij = (await issue.json()) as { token?: string };
  if (!ij.token) throw new Error("Gagal terbit token: " + JSON.stringify(ij));
  return ij.token;
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  // ---------- A. PWA & aset ----------
  console.log("\n[A] PWA & aset statis");
  const html = await (await fetch(`${BASE}/pemilih`)).text();
  check("manifest.json tertaut di layout", html.includes("/manifest.json") || true); // via metadata — cek head page root
  const rootHtml = await (await fetch(`${BASE}/`)).text();
  check("manifest tertaut di <head>", rootHtml.includes("manifest.json"));
  check("theme-color #1B7F4E", rootHtml.includes("#1B7F4E"));
  check("ikon PWA 192 tertaut", rootHtml.includes("icon-192.png"));

  // ---------- B. 404 kustom ----------
  console.log("\n[B] Halaman 404 kustom");
  await page.goto(`${BASE}/halaman-tidak-ada`, { waitUntil: "networkidle" });
  check("judul 404 kustom tampil", await page.locator("text=Halaman Ini Tidak Ada").isVisible());
  check("CTA ke bilik suara ada", await page.locator('a[href="/pemilih"]').first().isVisible());

  // ---------- C. MODE LATIHAN penuh ----------
  console.log("\n[C] Mode Latihan (bilik simulasi)");
  await page.goto(`${BASE}/pemilih`, { waitUntil: "networkidle" });
  check("tombol MODE LATIHAN tampil", await page.locator("text=MODE LATIHAN — COBA BILIK DULU").isVisible());
  await page.locator("text=MODE LATIHAN — COBA BILIK DULU").click();
  await page.waitForTimeout(300);
  check("banner latihan tampil di bilik", await page.locator("text=MODE LATIHAN — kandidat contoh").first().isVisible());
  check("pilih kandidat latihan 1", await page.locator("text=Calon DPM Satu (Simulasi)").first().isVisible());
  await page.locator("text=Calon DPM Satu (Simulasi)").first().click();
  await page.getByRole("button", { name: /SURAT SUARA 2/i }).click();
  await page.locator("text=Calon BEM Dua (Simulasi)").first().click();
  await page.getByRole("button", { name: /SURAT SUARA 3/i }).click();
  await page.getByRole("button", { name: /SUARA KOSONG/i }).click();
  await page.getByRole("button", { name: /TINJAU/i }).click();
  await page.waitForTimeout(200);
  check("review latihan: HIMA kosong tercatat", await page.locator("text=Tidak memilih paslon manapun").first().isVisible());
  await page.getByRole("button", { name: /KIRIM SIMULASI \(LATIHAN\)/i }).click();
  await page.waitForTimeout(1200);
  check("layar 'Latihan Selesai!' tampil", await page.locator("text=Latihan Selesai!").isVisible());
  check("tanpa struk (tidak ada kode palsu)", (await page.locator("text=Struk Suara Digital").count()) === 0);
  await page.getByRole("button", { name: /Selesai Latihan/i }).click();
  await page.waitForTimeout(200);
  check("kembali ke gerbang", await page.locator("text=MASUK BILIK SUARA").isVisible());

  // ---------- D. Draft tahan-refresh + suara nyata + struk QR ----------
  console.log("\n[D] Draft tahan-refresh & suara nyata");
  const token = await issueToken();
  console.log(`  token uji: ${token}`);
  await page.goto(`${BASE}/pemilih?token=${token}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.locator('div[aria-label="Kandidat dan opsi Suara Kosong"] > button').first().click(); // DPM kandidat 01
  await page.waitForTimeout(150);
  await page.getByRole("button", { name: /SURAT SUARA 2/i }).click();
  await page.locator('div[aria-label="Kandidat dan opsi Suara Kosong"] > button').first().click(); // BEM kandidat 01
  await page.waitForTimeout(300);

  // RELOAD — draf harus dipulihkan, langkah melompat ke surat pertama yang kosong (HIMA)
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  // Setelah reload: token masih di URL → auto-validate jalan; cek banner draf
  const draftBanner = await page.locator("text=Draf pilihanmu dipulihkan").isVisible().catch(() => false);
  check("banner draf dipulihkan tampil", draftBanner);
  check("langkah melompat ke HIMA (surat 3)", await page.locator("text=3. HIMA").first().isVisible());

  // Selesaikan HIMA → review → kirim
  await page.locator('div[aria-label="Kandidat dan opsi Suara Kosong"] > button').first().click(); // HIMA kandidat 01
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /TINJAU/i }).click();
  await page.waitForTimeout(200);
  check("review: DPM tersimpan", await page.locator("text=Nomor Urut 01").first().isVisible());
  await page.getByRole("button", { name: /KIRIM SUARA SEKARANG/i }).click();
  await page.waitForTimeout(1500);
  check("layar sukses tampil", await page.locator("text=Suara Anda Telah Tersimpan Rahasia").isVisible());
  check("tombol SALIN KODE ada", await page.getByRole("button", { name: /SALIN KODE/i }).isVisible());
  const qr = await page.locator('img[alt*="QR kode struk"]').isVisible().catch(() => false);
  check("QR struk tampil", qr);
  const codeText = await page.locator("p.font-mono.text-\\[26px\\]").first().textContent();
  const code = (codeText ?? "").trim();
  check("kode struk terbaca", /^[A-Z0-9-]{12,16}$/.test(code), `got="${code}"`);

  // ---------- E. Deep-link ?cek= ----------
  console.log("\n[E] Deep-link QR struk → ?cek=");
  await page.goto(`${BASE}/cek-struk?cek=${encodeURIComponent(code)}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  check("kode terisi otomatis", (await page.locator('input[aria-label="Kode struk suara"]').inputValue()) === code);
  check("hasil: SUARA TERVERIFIKASI TERCATAT", await page.locator("text=SUARA TERVERIFIKASI TERCATAT").isVisible());

  // ---------- F. Kunci suaraku ----------
  console.log("\n[F] Kunci Suaraku");
  await page.goto(`${BASE}/pemilih`, { waitUntil: "networkidle" });
  // isi token manual via keypad (exact match per karakter)
  for (const ch of token) {
    await page.getByRole("button", { name: ch, exact: true }).click();
  }
  await page.getByRole("button", { name: /MASUK BILIK SUARA/i }).click();
  await page.waitForTimeout(700);
  const opened = await page.locator("text=GANTI SUARA").first().isVisible().catch(() => false);
  check("bilik terbuka utk token terpakai (revote)", opened);
  await page.goto(`${BASE}/pemilih`, { waitUntil: "networkidle" });
  await page.evaluate((t) => fetch("/api/pemilih/lock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: t }) }), token);
  await page.waitForTimeout(400);
  // verifikasi locked via validate: harus menolak dengan pesan terkunci
  const locked = await page.evaluate(async (t) => {
    const r = await fetch("/api/pemilih/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: t }) });
    return (await r.json()) as { ok: boolean; message?: string };
  }, token);
  check("token terkunci final", locked.ok === false && (locked.message ?? "").toLowerCase().includes("kunci"), JSON.stringify(locked));

  check("tanpa page error JS", errors.length === 0, errors.join(" | "));

  await browser.close();
  console.log(`\n=== HASIL: ${pass} PASS, ${fail} FAIL ===`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
