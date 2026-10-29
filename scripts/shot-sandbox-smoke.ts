import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  // 1. Login/portal publik root
  await page.goto(BASE, { waitUntil: "networkidle" });
  const voterBtn = await page.locator('a[href="/pemilih"]').count();
  console.log("root: voter entry links =", voterBtn);
  await page.screenshot({ path: "screenshots/sandbox-root.png" });

  // 2. Portal pemilih gate (mobile viewport — target utama pemilih)
  await page.goto(`${BASE}/pemilih`, { waitUntil: "networkidle" });
  const gate = await page.getByText(/PORTAL PEMILIH|MASUK BILIK|TOKEN/i).first().isVisible().catch(() => false);
  console.log("pemilih gate visible =", gate);
  await page.screenshot({ path: "screenshots/sandbox-pemilih.png" });

  console.log("pageerrors =", errors.length ? errors : "none");
  await browser.close();
  if (voterBtn === 0 || !gate || errors.length) {
    console.error("SANDBOX SMOKE: FAIL");
    process.exit(1);
  }
  console.log("SANDBOX SMOKE: PASS");
})();
