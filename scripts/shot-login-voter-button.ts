// Screenshot layar login — verifikasi tombol pintu pemilih
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "/home/z/my-project/screenshots/shot-login-voter-button.png";
const OUT2 = "/home/z/my-project/screenshots/shot-login-voter-button-full.png";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  // Viewport: area form + kartu pemilih
  await page.screenshot({ path: OUT });
  // Full page
  await page.screenshot({ path: OUT2, fullPage: true });

  // Sanity: tombol BUKA PORTAL PEMILIH ada & href benar
  const btn = page.locator('a[href="/pemilih"]', { hasText: "BUKA PORTAL PEMILIH" });
  const count = await btn.count();
  const terminalLink = await page.locator('a[href="/pemilih"][title*="Portal Pemilih"]').count();
  console.log(`[check] Tombol BUKA PORTAL PEMILIH: ${count} (harus 1)`);
  console.log(`[check] Link terminal "Portal Pemilih Online" di panel kiri: ${terminalLink} (harus 1)`);

  // Klik tombol → pastikan membuka /pemilih di tab baru
  const [newPage] = await Promise.all([
    page.context().waitForEvent("page", { timeout: 10000 }),
    btn.first().click(),
  ]);
  await newPage.waitForLoadState("networkidle");
  const url = newPage.url();
  const gateText = await newPage.locator("text=PORTAL PEMILIH").first().isVisible().catch(() => false);
  console.log(`[check] Tab baru terbuka: ${url} (harus mengandung /pemilih)`);
  console.log(`[check] Gate Portal Pemilih tampil: ${gateText}`);
  await newPage.close();
  await browser.close();
  console.log("OK →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
