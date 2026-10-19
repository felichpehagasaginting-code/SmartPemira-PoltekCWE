// ============================================================
// TOKEN GENERATOR — CSPRNG 6 karakter alfanumerik
// PROMPT.md: Node crypto CSPRNG, tanpa karakter ambigu 0/O/1/I
// ============================================================
import { randomInt, createHash, timingSafeEqual } from "crypto";
import { TOKEN_ALPHABET, TOKEN_LENGTH } from "@/lib/constants/election";

/**
 * Menerbitkan token acak sekali pakai menggunakan CSPRNG.
 * Alfabet dijamin bebas karakter ambigu (0/O dan 1/I) agar tidak
 * tertukar saat dibaca di slip token maupun layar Kiosk.
 */
export function generateVotingToken(): string {
  let token = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += TOKEN_ALPHABET[randomInt(0, TOKEN_ALPHABET.length)];
  }
  return token;
}

/**
 * SHA-256 hash dari token plaintext. HANYA hash yang disimpan
 * di database (tabel voting_tokens tidak menyimpan plaintext).
 */
export function hashToken(token: string): string {
  return createHash("sha256")
    .update(`SMARTPEMIRA::TOKEN::${token.trim().toUpperCase()}`)
    .digest("hex");
}

/** Verifikasi token dengan perbandingan constant-time (anti timing attack). */
export function verifyTokenMatch(token: string, tokenHash: string): boolean {
  const computed = Buffer.from(hashToken(token));
  const stored = Buffer.from(tokenHash);
  if (computed.length !== stored.length) return false;
  return timingSafeEqual(computed, stored);
}
