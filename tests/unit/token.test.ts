// ============================================================
// INVARIANT 3 — TOKEN: CSPRNG, unik, hash-stabil, tak ambigu.
// ============================================================
import { describe, it, expect } from "vitest";
import { generateVotingToken, hashToken, verifyTokenMatch } from "@/lib/crypto/token-generator";
import { TOKEN_ALPHABET, TOKEN_LENGTH } from "@/lib/constants/election";

const AMBIGUOUS = /[0O1I]/;

describe("Invariant: token pemilih", () => {
  it("panjang & alfabet benar, tanpa karakter ambigu (anti tertukar saat dibaca)", () => {
    for (let i = 0; i < 200; i++) {
      const t = generateVotingToken();
      expect(t).toHaveLength(TOKEN_LENGTH);
      for (const ch of t) expect(TOKEN_ALPHABET).toContain(ch);
      expect(AMBIGUOUS.test(t)).toBe(false);
    }
  });

  it("unik secara statistik: 500 sampel tak ada duplikat", () => {
    const set = new Set(Array.from({ length: 500 }, () => generateVotingToken()));
    expect(set.size).toBe(500);
  });

  it("hash stabil: kasus & spasi tidak mengubah hash (input user dinormalisasi)", () => {
    const t = generateVotingToken();
    expect(hashToken(t)).toBe(hashToken(t.toLowerCase()));
    expect(hashToken(` ${t} `)).toBe(hashToken(t));
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifyTokenMatch: cocok = true, token salah = false (constant-time)", () => {
    const t = generateVotingToken();
    const h = hashToken(t);
    expect(verifyTokenMatch(t, h)).toBe(true);
    expect(verifyTokenMatch(t.toLowerCase(), h)).toBe(true);
    let other = generateVotingToken();
    while (other === t) other = generateVotingToken();
    expect(verifyTokenMatch(other, h)).toBe(false);
  });

  it("hash dua token berbeda selalu berbeda (kolisi praktis mustahil)", () => {
    const tokens = Array.from({ length: 300 }, () => generateVotingToken());
    const hashes = tokens.map(hashToken);
    expect(new Set(hashes).size).toBe(300);
  });
});
