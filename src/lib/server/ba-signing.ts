// ============================================================
// TANDA TANGAN ED25519 BERITA ACARA (Rekomendasi #2)
// Masalah yang dijawab: SHA-256 kanonikal hanya membuktikan integritas
// (dokumen ≠ dimodifikasi), TIDAK membuktikan PENGARANG — siapa pun bisa
// membuat hash dokumen palsunya sendiri. Ed25519 = kriptografi kunci publik:
//  - Kunci PRIVAT dipakai sistem untuk menandatangani BA (Pleno Unlock & Segel)
//  - Kunci PUBLIK dipublikasikan → SIAPA PUN memverifikasi tanpa rahasia
// Kanonikal memuat 5 head rantai prodi + rekap latest-wins → pemalsuan hasil
// sedikit pun membatalkan tanda tangan.
// Kunci disimpan di <root>/keys/ba-signing-key.json (dibuat otomatis saat
// pertama dipakai); rotasi via `bun scripts/ba-keygen.ts`.
// ============================================================
import { createHash, generateKeyPairSync, createPrivateKey, createPublicKey, sign, verify } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const PROJECT_ROOT = process.cwd().includes("/.next")
  ? path.resolve(process.cwd(), "..", "..")
  : process.cwd();
export const KEYS_DIR = path.join(PROJECT_ROOT, "keys");
const KEY_FILE = path.join(KEYS_DIR, "ba-signing-key.json");

export interface BaKeyPair {
  kid: string; // key id = SHA-256 kunci publik (8 hex pertama) — untuk rotasi
  publicPem: string;
  privatePem: string;
  createdAt: string;
}

function loadOrCreateKeyPair(): BaKeyPair {
  if (existsSync(KEY_FILE)) {
    try {
      const parsed = JSON.parse(readFileSync(KEY_FILE, "utf8")) as BaKeyPair;
      if (parsed.privatePem && parsed.publicPem) return parsed;
    } catch {
      // file korup → buat ulang di bawah
    }
  }
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const pair: BaKeyPair = {
    kid: "",
    publicPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privatePem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    createdAt: new Date().toISOString(),
  };
  pair.kid = createHash("sha256").update(pair.publicPem).digest("hex").slice(0, 8);
  mkdirSync(KEYS_DIR, { recursive: true });
  writeFileSync(KEY_FILE, JSON.stringify(pair, null, 2), { mode: 0o600 });
  return pair;
}

const g = globalThis as unknown as { __pemiraBaKeyPair?: BaKeyPair };

/** KeyPair BA (cached per proses; file dibuat otomatis saat pertama kali). */
export function getBaKeyPair(): BaKeyPair {
  return (g.__pemiraBaKeyPair ??= loadOrCreateKeyPair());
}

/** Kunci publik untuk publikasi (papan pengumuman / situs / dokumen BA). */
export function getBaPublicKeyPem(): string {
  return getBaKeyPair().publicPem;
}

/** Tanda tangani kanonikal BA → base64. */
export function signBaCanonical(canonical: string): string {
  const privateKey = createPrivateKey(getBaKeyPair().privatePem);
  return sign(null, Buffer.from(canonical, "utf8"), privateKey).toString("base64");
}

/** Verifikasi tanda tangan Ed25519 atas kanonikal — TANPA rahasia apa pun. */
export function verifyBaSignature(canonical: string, signatureB64: string, publicPemOverride?: string): boolean {
  try {
    const pem = publicPemOverride ?? getBaKeyPair().publicPem;
    const publicKey = createPublicKey(pem);
    return verify(null, Buffer.from(canonical, "utf8"), publicKey, Buffer.from(signatureB64, "base64"));
  } catch {
    return false;
  }
}
