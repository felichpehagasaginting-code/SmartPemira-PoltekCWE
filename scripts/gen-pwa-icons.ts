// Generate ikon PWA (192/512/maskable) — render SVG jadi PNG via Playwright.
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const OUT = "/home/z/my-project/public";
mkdirSync(OUT, { recursive: true });

// Ikon: kotak hijau rounded + lambang surat suara + centang — selaras brand Smart Pemira.
// Semua koordinat digambar langsung pada viewBox 512 (tanpa nested transform).
const svg512 = (fullBleed: boolean) => {
  const stroke = fullBleed ? "#141E19" : "#141E19";
  return `<html><body style="margin:0;background:transparent;overflow:hidden;">
  <svg width="100%" height="100%" viewBox="0 0 512 512" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="512" height="512" rx="${fullBleed ? 0 : 92}" fill="#1B7F4E"/>
    ${
      fullBleed
        ? ""
        : `<rect x="16" y="16" width="480" height="480" rx="78" fill="none" stroke="${stroke}" stroke-width="6" opacity="0.3"/>`
    }
    <!-- dokumen suara -->
    <path d="M186 108 h104 l52 52 v244 a16 16 0 0 1 -16 16 H202 a16 16 0 0 1 -16 -16 Z"
      fill="#FFFFFF" stroke="#141E19" stroke-width="9" stroke-linejoin="round"/>
    <path d="M290 108 v52 h52" fill="none" stroke="#141E19" stroke-width="9" stroke-linejoin="round"/>
    <!-- garis teks -->
    <path d="M226 232 h96 M226 266 h96" stroke="#C9D4CE" stroke-width="10" stroke-linecap="round"/>
    <!-- centang -->
    <path d="m222 320 26 26 52-52" fill="none" stroke="#1B7F4E" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</body></html>`;
};

async function shot(size: number, file: string, fullBleed: boolean) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(svg512(fullBleed));
  await page.screenshot({ path: `${OUT}/${file}`, omitBackground: !fullBleed });
  await browser.close();
  console.log("OK →", file);
}

async function main() {
  await shot(192, "icon-192.png", false);
  await shot(512, "icon-512.png", false);
  await shot(512, "icon-maskable-512.png", true); // maskable: full-bleed agar aman di-crop launcher
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
