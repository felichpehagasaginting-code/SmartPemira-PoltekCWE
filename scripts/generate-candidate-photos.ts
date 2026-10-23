// ============================================================
// GENERATOR FOTO KANDIDAT (FAKE / AI) — Smart Pemira Poltek CWE
// Menghasilkan 30 potret formal mahasiswa via z-ai-web-dev-sdk
// (backend-only). Output: public/candidates/*.png (864x1152).
// Jalankan: bunx tsx scripts/generate-candidate-photos.ts
// ============================================================
import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const OUT_DIR = path.join(process.cwd(), "public", "candidates");

type Person = {
  file: string;
  gender: "M" | "F";
  hijab?: boolean;
  look: string; // variasi tampilan agar tiap foto unik & konsisten formal
};

// Roster 30 foto: DPM 2×3, BEM 2×2, HIMA 5 prodi×2×2
const PEOPLE: Person[] = [
  // ---- DPM 01 (Ketua Umum / Ketua 1 / Ketua 2) ----
  { file: "dpm-01-ketua-umum.png", gender: "M", look: "short black hair, wearing a brown batik shirt" },
  { file: "dpm-01-ketua-1.png", gender: "F", hijab: true, look: "wearing a soft grey hijab and a white formal blouse" },
  { file: "dpm-01-ketua-2.png", gender: "M", look: "neat side-parted black hair, wearing a dark green almamater college jacket" },
  // ---- DPM 02 ----
  { file: "dpm-02-ketua-umum.png", gender: "M", look: "short curly black hair, wearing a navy blazer over a white shirt" },
  { file: "dpm-02-ketua-1.png", gender: "F", hijab: true, look: "wearing a navy hijab and a brown batik top" },
  { file: "dpm-02-ketua-2.png", gender: "F", look: "long black hair, wearing a white formal blouse" },
  // ---- BEM / PRESMA 01 & 02 (Ketua + Wakil) ----
  { file: "bem-01-ketua.png", gender: "M", look: "athletic look, short hair, wearing a dark green almamater college jacket" },
  { file: "bem-01-wakil.png", gender: "F", hijab: true, look: "wearing an earth-tone hijab and a navy blazer" },
  { file: "bem-02-ketua.png", gender: "M", look: "wearing round glasses and a crisp white formal shirt" },
  { file: "bem-02-wakil.png", gender: "F", look: "shoulder-length black hair, wearing a brown batik blouse" },
  // ---- HIMA TPTP ----
  { file: "hima-tptp-01-ketua.png", gender: "F", hijab: true, look: "wearing a dark green hijab and a white formal blouse" },
  { file: "hima-tptp-01-wakil.png", gender: "M", look: "wearing a white formal shirt with rolled sleeves" },
  { file: "hima-tptp-02-ketua.png", gender: "M", look: "wearing a brown batik shirt, friendly smile" },
  { file: "hima-tptp-02-wakil.png", gender: "F", look: "wearing a navy blazer over a white blouse" },
  // ---- HIMA TPHP ----
  { file: "hima-tphp-01-ketua.png", gender: "M", look: "tall, short hair, wearing a crisp white formal shirt" },
  { file: "hima-tphp-01-wakil.png", gender: "F", look: "wearing a dark green almamater college jacket" },
  { file: "hima-tphp-02-ketua.png", gender: "M", look: "wearing a navy blazer over a grey shirt" },
  { file: "hima-tphp-02-wakil.png", gender: "F", hijab: true, look: "wearing a maroon hijab and a white formal blouse" },
  // ---- HIMA MANLOG ----
  { file: "hima-manlog-01-ketua.png", gender: "M", look: "wearing a brown batik shirt with confident expression" },
  { file: "hima-manlog-01-wakil.png", gender: "F", hijab: true, look: "wearing a cream hijab and a white formal blouse" },
  { file: "hima-manlog-02-ketua.png", gender: "M", look: "wearing a dark green almamater college jacket" },
  { file: "hima-manlog-02-wakil.png", gender: "F", look: "long wavy black hair, wearing a white formal blouse" },
  // ---- HIMA BD ----
  { file: "hima-bd-01-ketua.png", gender: "F", look: "shoulder-length hair, wearing a navy blazer over a white top" },
  { file: "hima-bd-01-wakil.png", gender: "M", look: "wearing a brown batik shirt" },
  { file: "hima-bd-02-ketua.png", gender: "M", look: "wearing rectangular glasses and a crisp white formal shirt" },
  { file: "hima-bd-02-wakil.png", gender: "F", hijab: true, look: "wearing a dark green hijab and an almamater college jacket" },
  // ---- HIMA TRPL ----
  { file: "hima-trpl-01-ketua.png", gender: "M", look: "wearing black-rimmed glasses and a navy blazer" },
  { file: "hima-trpl-01-wakil.png", gender: "F", look: "long straight black hair, wearing a white formal blouse" },
  { file: "hima-trpl-02-ketua.png", gender: "M", look: "wearing a dark green almamater college jacket, warm smile" },
  { file: "hima-trpl-02-wakil.png", gender: "F", hijab: true, look: "wearing a light grey hijab and a brown batik top" },
];

function buildPrompt(p: Person): string {
  const subject = p.gender === "M" ? "young Indonesian man" : "young Indonesian woman";
  const hijabPart = p.hijab ? "wearing a neat hijab, " : "";
  return [
    `Professional formal headshot portrait photograph of a ${subject}, about 20 years old, college student,`,
    hijabPart + p.look + ",",
    `warm confident smile, looking directly at the camera, head and shoulders shot,`,
    `plain light warm-grey studio background, soft even studio lighting, realistic photography, natural skin tone,`,
    `high quality, detailed, official student organization profile photo style`,
  ].join(" ");
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timeout ${Math.round(ms / 1000)}s`)), ms)),
  ]);
}

async function generateOne(zai: Awaited<ReturnType<typeof ZAI.create>>, p: Person, attempt = 1): Promise<boolean> {
  const outPath = path.join(OUT_DIR, p.file);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 20_000) {
    console.log(`↷ Skip (sudah ada): ${p.file}`);
    return true;
  }
  try {
    const res = await withTimeout(
      zai.images.generations.create({ prompt: buildPrompt(p), size: "864x1152" }),
      150_000
    );
    const b64 = res?.data?.[0]?.base64;
    if (!b64) throw new Error("respons kosong dari API gambar");
    const buf = Buffer.from(b64, "base64");
    if (buf.length < 20_000) throw new Error(`file terlalu kecil (${buf.length} B)`);
    fs.writeFileSync(outPath, buf);
    console.log(`✓ ${p.file} (${Math.round(buf.length / 1024)} KB)`);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`✗ ${p.file} [percobaan ${attempt}]: ${msg}`);
    const isRate = msg.includes("429") || msg.toLowerCase().includes("too many");
    if (attempt < (isRate ? 6 : 3)) {
      const wait = isRate ? 20_000 * attempt : 1_500 * attempt; // backoff khusus rate limit
      await new Promise((r) => setTimeout(r, wait));
      return generateOne(zai, p, attempt + 1);
    }
    return false;
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const zai = await ZAI.create();
  let ok = 0;
  const failed: string[] = [];
  // SEKUENSIAL + jeda — API gambar sensitif rate limit (429)
  for (const p of PEOPLE) {
    const okOne = await generateOne(zai, p);
    if (okOne) ok++;
    else failed.push(p.file);
    await new Promise((r) => setTimeout(r, 4_000));
  }
  console.log(`\n=== Selesai: ${ok}/${PEOPLE.length} foto berhasil ===`);
  if (failed.length) {
    console.log("Gagal (jalankan ulang script untuk retry):", failed.join(", "));
    process.exitCode = 2;
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
