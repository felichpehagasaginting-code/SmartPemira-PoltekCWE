// ============================================================
// E2E — Dialog ganti sandi + 2FA di viewport mobile harus bisa
// di-scroll penuh (bug: konten meluber & tak bisa discroll).
// Jalankan: npx tsx scripts/e2e-dialog-scroll.ts
// ============================================================
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const errors: string[] = [];
const results: Array<{ name: string; ok: boolean; note?: string }> = [];

function check(name: string, ok: boolean, note?: string) {
  results.push({ name, ok, note });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${note ? ` (${note})` : ""}`);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // ponsel kecil
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: "networkidle" });

  // Login sebagai operator panwaslu (tanpa 2FA di seed)
  await page.fill('input[placeholder="mis. kpum"]', "panwaslu");
  await page.fill('input[type="password"]', "panwaslu123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  // Buka dialog ganti sandi dari header
  await page.click('button[aria-label="Ganti password"]');
  await page.waitForSelector('[data-slot="dialog-content"]', { timeout: 5000 });
  check("Dialog ganti sandi terbuka", true);

  const scroll = page.locator('[data-slot="dialog-scroll"]');
  check("Wrapper scroll internal ada", (await scroll.count()) === 1);

  // Masuk ke keadaan enroll 2FA (QR) — kasus terburuk seperti laporan user
  await page.getByRole("button", { name: /AKTIFKAN 2FA/ }).click();
  await page.waitForSelector('img[alt="QR provisioning TOTP"]', { timeout: 8000 });
  check("Keadaan enroll 2FA (QR) tampil", true);

  // Konten harus lebih tinggi dari viewport → wrapper harus mengizinkan scroll
  const m = await scroll.evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight }));
  check("Konten melebihi layar (kasus uji valid)", m.sh > 844, `scrollHeight=${m.sh} clientHeight=${m.ch}`);
  const scrollable = await scroll.evaluate((el) => {
    el.scrollTo(0, el.scrollHeight);
    return el.scrollTop > 0;
  });
  check("Wrapper BISA di-scroll ke bawah", scrollable);

  // Tombol KONFIRMASI (paling bawah) harus berada penuh di dalam viewport setelah scroll
  const btn = page.getByRole("button", { name: /KONFIRMASI/ });
  await btn.scrollIntoViewIfNeeded();
  const box = await btn.boundingBox();
  const inView = !!box && box.y >= 0 && box.y + box.height <= 844;
  check("Tombol KONFIRMASI terlihat penuh di layar", inView, box ? `y=${box.y.toFixed(0)} h=${box.height.toFixed(0)}` : "no box");

  // Atas dialog tidak terpotong (dulu label "Password Lama" ikut terpotong)
  const dlg = await page.locator('[data-slot="dialog-content"]').boundingBox();
  check("Kotak dialog di dalam viewport", !!dlg && dlg.y >= 0 && dlg.y + dlg.height <= 844, dlg ? `y=${dlg.y.toFixed(0)} h=${dlg.height.toFixed(0)}` : "no box");

  await page.screenshot({ path: "scripts/dlg-scroll-bottom.png" });
  await scroll.evaluate((el) => el.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: "scripts/dlg-scroll-top.png" });

  check("Tanpa pageerror", errors.length === 0, errors.join(" | ").slice(0, 200));
  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(failed.length === 0 ? "\nSEMUA CHECK LULUS" : `\n${failed.length} CHECK GAGAL`);
  process.exit(failed.length === 0 ? 0 : 1);
}

void main();
