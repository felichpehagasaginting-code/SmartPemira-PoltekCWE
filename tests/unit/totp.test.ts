// ============================================================
// INVARIANT — TOTP 2FA (Rekomendasi #3):
//  a. Vektor resmi RFC 6238 (HMAC-SHA1, secret ASCII "12345678901234567890")
//     → implementasi cocok SEMPURNA di 6 titik waktu (termasuk 64-bit counter).
//  b. Jendela ±1 langkah menerima kode langkah tetangga; kode acak ditolak.
//  c. Base32 encode/decode bolak-balik; otpauth URI memuat parameter wajib.
//  d. Kode cadangan: hash scrypt diverifikasi, salah format/case ditolak.
//  e. Enkripsi AES-256-GCM secret at-rest: bolak-balik + tamper terdeteksi.
// ============================================================
import { describe, it, expect } from "vitest";
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  totpAt,
  verifyTotp,
  buildOtpauthUri,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  encryptTotpSecret,
  decryptTotpSecret,
} from "@/lib/server/totp";

const RFC_SECRET_B32 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"; // ASCII "12345678901234567890"

// Vektor RFC 6238 §B (SHA1): [counter, kode 6 digit = 6 terakhir nilai 8 digit]
const RFC_VECTORS: Array<[number, string]> = [
  [1, "287082"], // T=59          → 94287082
  [37037036, "081804"], // T=1111111109  → 07081804
  [37037037, "050471"], // T=1111111111  → 14050471
  [41152263, "005924"], // T=1234567890  → 89005924
  [66666666, "279037"], // T=2000000000  → 69279037
  [666666666, "353130"], // T=20000000000 → 65353130
];

describe("TOTP 2FA — RFC 6238", () => {
  it("cocok dengan semua vektor resmi RFC 6238", () => {
    for (const [counter, expected] of RFC_VECTORS) {
      expect(totpAt(RFC_SECRET_B32, counter)).toBe(expected);
    }
  });

  it("jendela ±1 langkah menerima tetangga, kode asing ditolak", () => {
    const atMs = 59_000; // counter 1
    expect(verifyTotp(RFC_SECRET_B32, "287082", atMs)).toBe(true);
    expect(verifyTotp(RFC_SECRET_B32, totpAt(RFC_SECRET_B32, 2), atMs)).toBe(true); // langkah berikutnya
    expect(verifyTotp(RFC_SECRET_B32, totpAt(RFC_SECRET_B32, 0), atMs)).toBe(true); // langkah sebelumnya
    expect(verifyTotp(RFC_SECRET_B32, totpAt(RFC_SECRET_B32, 3), atMs)).toBe(false); // di luar jendela
    expect(verifyTotp(RFC_SECRET_B32, "000000", atMs)).toBe(false);
    expect(verifyTotp(RFC_SECRET_B32, "28708", atMs)).toBe(false); // format salah
  });

  it("secret baru selalu 32 karakter base32 & unik", () => {
    const s1 = generateTotpSecret();
    const s2 = generateTotpSecret();
    expect(s1).toMatch(/^[A-Z2-7]{32}$/);
    expect(s1).not.toBe(s2);
  });

  it("base32 bolak-balik dan otpauth URI lengkap", () => {
    const raw = Buffer.from([0, 1, 2, 250, 251, 254, 255]);
    expect(base32Decode(base32Encode(raw)).equals(raw)).toBe(true);
    const uri = buildOtpauthUri("ABC23456", "kpum");
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("secret=ABC23456");
    expect(uri).toContain("issuer=Pemira");
    expect(uri).toContain("digits=6");
  });
});

describe("Kode cadangan sekali pakai", () => {
  it("8 kode format benar, hash terverifikasi, salah ditolak", () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(8);
    for (const c of codes) expect(c).toMatch(/^[A-Z2-7]{4}-[A-Z2-7]{4}$/);
    const hash = hashBackupCode(codes[0]);
    expect(verifyBackupCode(codes[0], hash)).toBe(true);
    expect(verifyBackupCode("AAAA-BBBB", hash)).toBe(false);
    expect(verifyBackupCode(codes[0].toLowerCase(), hash)).toBe(false);
  });
});

describe("Enkripsi secret at-rest (AES-256-GCM)", () => {
  it("bolak-balik utuh, master secret lain gagal, tamper terdeteksi", () => {
    const secret = generateTotpSecret();
    const stored = encryptTotpSecret(secret, "master-abc");
    expect(decryptTotpSecret(stored, "master-abc")).toBe(secret);
    expect(decryptTotpSecret(stored, "master-lain")).toBeNull();
    const [iv, tag, ct] = stored.split(":");
    const tamperedCt = Buffer.from(ct, "base64");
    tamperedCt[0] ^= 0xff;
    expect(decryptTotpSecret(`${iv}:${tag}:${tamperedCt.toString("base64")}`, "master-abc")).toBeNull();
  });
});
