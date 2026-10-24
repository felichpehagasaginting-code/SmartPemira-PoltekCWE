// Screenshot fitur UX baru: gate dgn tombol latihan, bilik latihan, sukses dgn QR, cek-struk
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OUT = "/home/z/my-project/screenshots";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 940 } });

  // 1. Gate dengan tombol MODE LATIHAN
  await page.goto(`${BASE}/pemilih`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/ux-01-gate-latihan.png` });

  // 2. Bilik latihan (DPM simulasi)
  await page.locator("text=MODE LATIHAN — COBA BILIK DULU").click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/ux-02-bilik-latihan.png` });

  // 3. Layar sukses latihan
  for (let i = 0; i < 3; i++) {
    await page.locator('div[aria-label="Kandidat dan opsi Suara Kosong"] > button').first().click();
    if (i < 2) await page.getByRole("button", { name: /SURAT SUARA/i }).click();
  }
  await page.getByRole("button", { name: /TINJAU/i }).click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /KIRIM SIMULASI \(LATIHAN\)/i }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/ux-03-latihan-selesai.png` });

  // 4. Halaman cek-struk publik
  await page.goto(`${BASE}/cek-struk`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/ux-04-cek-struk.png` });

  // 5. 404 kustom
  await page.goto(`${BASE}/xyz-tidak-ada`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/ux-05-not-found.png` });

  await browser.close();
  console.log("OK → ux-0*.png");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
