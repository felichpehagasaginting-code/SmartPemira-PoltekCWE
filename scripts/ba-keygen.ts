// ============================================================
// KEYGEN / ROTASI KUNCI BA (Rekomendasi #2)
// Jalankan: `bun scripts/ba-keygen.ts`          → tampilkan kunci publik
//           `bun scripts/ba-keygen.ts --rotate` → ganti keypair (BA lama
//           tetap terverifikasi bila kunci publik lama diarsipkan!)
// Kunci PUBLIK wajib dipublikasikan (papan panitia / dokumen BA) agar
// verifikasi publik berjalan independen dari sistem.
// ============================================================
import { existsSync, readFileSync, renameSync } from "fs";
import path from "path";
import { createHash } from "crypto";
import { generateKeyPairSync } from "crypto";

const KEY_FILE = path.join(import.meta.dirname, "..", "keys", "ba-signing-key.json");

function fingerprint(publicPem: string): string {
  return createHash("sha256").update(publicPem).digest("hex").slice(0, 8);
}

if (process.argv.includes("--rotate") && existsSync(KEY_FILE)) {
  const old = JSON.parse(readFileSync(KEY_FILE, "utf8"));
  const backup = KEY_FILE.replace(/\.json$/, `-old-${fingerprint(old.publicPem)}.json`);
  renameSync(KEY_FILE, backup);
  console.log(`Kunci lama dipindah ke ${path.basename(backup)} — ARSIPKAN kunci publiknya untuk verifikasi BA periode lama.`);
}

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const { mkdirSync, writeFileSync } = await import("fs");
mkdirSync(path.dirname(KEY_FILE), { recursive: true });
writeFileSync(KEY_FILE, JSON.stringify({ kid: fingerprint(publicPem), publicPem, privatePem, createdAt: new Date().toISOString() }, null, 2), { mode: 0o600 });

console.log("=== KUNCI PUBLIK BA (publikasikan ini) ===");
console.log(publicPem);
console.log(`kid: ${fingerprint(publicPem)}`);
console.log(`Lokasi keypair: ${KEY_FILE}`);
