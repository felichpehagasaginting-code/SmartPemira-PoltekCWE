// Uji BA PDF: unlock Pleno (KPUM) → unduh PDF publik → valid → re-lock via reset/reseed nanti
import { chromium } from "playwright";
import { writeFileSync } from "fs";

const BASE = "http://localhost:3000";

async function main() {
  // login KPUM via API dgn cookie jar sederhana
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.locator('input[autocomplete="username"]').fill("kpum");
  await page.locator('input[autocomplete="current-password"]').fill("kpum123");
  await page.getByRole("button", { name: /MASUK KE SISTEM/i }).click();
  await page.waitForTimeout(1200);

  // Pleno unlock via UI API (dengan confirm dialog di-auto-accept)
  page.on("dialog", (d) => void d.accept());
  const unlockRes = await page.evaluate(async () => {
    const r = await fetch("/api/tally/unlock", { method: "POST" });
    return { status: r.status, body: (await r.json()) as Record<string, unknown> };
  });
  console.log("[unlock]", unlockRes.status, JSON.stringify(unlockRes.body).slice(0, 120));

  // Unduh PDF publik
  const pdfRes = await page.evaluate(async () => {
    const r = await fetch("/api/public/ba-pdf");
    const buf = await r.arrayBuffer();
    const head = new TextDecoder().decode(new Uint8Array(buf).slice(0, 8));
    return { status: r.status, size: buf.byteLength, head, ctype: r.headers.get("content-type") };
  });
  console.log("[pdf]", pdfRes.status, `${pdfRes.size} bytes`, pdfRes.ctype, "magic:", pdfRes.head.slice(0, 5));
  check("PDF status 200", pdfRes.status === 200);
  check("Content-Type application/pdf", (pdfRes.ctype ?? "").includes("application/pdf"));
  check("Magic bytes %PDF", pdfRes.head.startsWith("%PDF"));

  // Simpan untuk inspeksi visual
  const dl = await ctx.request.get(`${BASE}/api/public/ba-pdf`);
  writeFileSync("/home/z/my-project/screenshots/ba-pdf-sample.pdf", await dl.body());
  console.log("PDF disimpan → screenshots/ba-pdf-sample.pdf");

  await browser.close();

  function check(name: string, cond: boolean) {
    console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`);
    if (!cond) process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
