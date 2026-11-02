// ============================================================
// 2FA TOTP OPERATOR (Rekomendasi #3) — RFC 6238 + RFC 4648 base32
// Tanpa dependensi eksternal: HMAC-SHA1 dari node:crypto.
//  - Secret base32 (20 byte acak), provisioning via otpauth:// URI + QR.
//  - Secret AKTIF disimpan TERENKRIPSI AES-256-GCM (kunci = SHA-256
//    sessionSecret) — bocornya DB tidak langsung membuka faktor kedua.
//  - Kode cadangan 8 × "XXXX-XXXX", disimpan sebagai hash scrypt, sekali pakai.
// ============================================================
import { createHmac, randomBytes, scryptSync, createCipheriv, createDecipheriv, createHash, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Secret baru: 20 byte acak → base32 (menghasilkan 32 karakter). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** Kode 6 digit pada counter tertentu (RFC 6238, T0=0, X=30s, HMAC-SHA1). */
export function totpAt(secretB32: string, counter: number): string {
  const key = base32Decode(secretB32);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(msg).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const bin =
    ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
  return String(bin % 1_000_000).padStart(6, "0");
}

/** Verifikasi kode dengan jendela ±1 langkah (30 s) untuk toleransi jam. */
export function verifyTotp(secretB32: string, code: string, atMs: number = Date.now(), window = 1): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(atMs / 1000 / 30);
  for (let i = -window; i <= window; i++) {
    const expected = Buffer.from(totpAt(secretB32, counter + i));
    const given = Buffer.from(code);
    if (expected.length === given.length && timingSafeEqual(expected, given)) return true;
  }
  return false;
}

/** otpauth:// URI untuk provisioning (Google Authenticator/Aegis, dsb.). */
export function buildOtpauthUri(secretB32: string, account: string, issuer = "Pemira Poltek CWE"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret: secretB32, issuer, algorithm: "SHA1", digits: "6", period: "30" });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ---------- Enkripsi secret at-rest (AES-256-GCM) ----------
export function encryptTotpSecret(plainB32: string, masterSecret: string): string {
  const key = createHash("sha256").update(`pemira-totp-aes:${masterSecret}`).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plainB32, "utf8"), cipher.final()]);
  return `${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${ct.toString("base64")}`;
}

export function decryptTotpSecret(stored: string, masterSecret: string): string | null {
  try {
    const [ivB64, tagB64, ctB64] = stored.split(":");
    const decipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(`pemira-totp-aes:${masterSecret}`).digest(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ---------- Kode cadangan sekali pakai ----------
const BACKUP_CODE_RE = /^[A-Z2-7]{4}-[A-Z2-7]{4}$/;

export function generateBackupCodes(count = 8): string[] {
  const codes = new Set<string>();
  while (codes.size < count) {
    const raw = base32Encode(randomBytes(5)).slice(0, 8); // 8 char base32
    codes.add(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return [...codes];
}

export function hashBackupCode(code: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(code, salt, 32).toString("hex")}`;
}

export function verifyBackupCode(code: string, stored: string): boolean {
  if (!BACKUP_CODE_RE.test(code)) return false;
  const [saltHex, hashHex] = stored.split(":");
  const candidate = scryptSync(code, Buffer.from(saltHex, "hex"), 32);
  return candidate.length === Buffer.from(hashHex, "hex").length && timingSafeEqual(candidate, Buffer.from(hashHex, "hex"));
}

export async function getMasterSecret(): Promise<string> {
  const setting = await db.electionSetting.findUnique({ where: { id: "main" }, select: { sessionSecret: true } });
  return setting?.sessionSecret ?? "";
}
