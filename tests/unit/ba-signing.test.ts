// ============================================================
// INVARIANT — TANDA TANGAN ED25519 BA (Rekomendasi #2):
//  a. Tanda tangan sah atas kanonikal asli; tamper 1 karakter → GAGAL.
//  b. Ed25519 deterministik (RFC 8032): menandatangani 2× → base64 sama.
//  c. Verifikasi publik murni: PEM publik saja (tanpa privat) cukup.
//  d. KeyPair persisten: getBaKeyPair stabil (kid sama antar pemanggilan).
// ============================================================
import { describe, it, expect } from "vitest";
import { getBaKeyPair, getBaPublicKeyPem, signBaCanonical, verifyBaSignature } from "@/lib/server/ba-signing";
import { buildBaCanonical, type BaCanonicalInput } from "@/lib/server/ba-canonical";

const CANONICAL = JSON.stringify({
  dptTotal: 1000,
  voted: 871,
  ballots: 880,
  tokenUsed: 871,
  chainHeads: ["TPS-A|ab12cd34|880"],
  chainValid: true,
  totalChecked: 880,
  revote: { tokensVoted: 871, tokensRevoted: 9, supersededBallots: 9, lockedTokens: 862 },
  plenoUnlockedAt: "2026-11-02T09:00:00.000Z",
  results: ["Presma|1|450|51.66", "Presma|2|421|48.34"],
});

describe("Ed25519 Berita Acara", () => {
  it("sign → verify utuh; tamper satu karakter terdeteksi", () => {
    const sig = signBaCanonical(CANONICAL);
    expect(verifyBaSignature(CANONICAL, sig)).toBe(true);
    expect(verifyBaSignature(CANONICAL + " ", sig)).toBe(false);
    expect(verifyBaSignature(CANONICAL, sig.slice(0, -4) + "AAAA")).toBe(false);
  });

  it("deterministik — tanda tangan sama untuk pesan & kunci sama", () => {
    expect(signBaCanonical(CANONICAL)).toBe(signBaCanonical(CANONICAL));
  });

  it("verifikasi publik murni dengan PEM publik saja", () => {
    const publicPem = getBaPublicKeyPem();
    const sig = signBaCanonical(CANONICAL);
    expect(verifyBaSignature(CANONICAL, sig, publicPem)).toBe(true);
    // kunci publik ASING (palsu) tidak bisa memverifikasi tanda tangan asli
    const foreign = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA\n-----END PUBLIC KEY-----";
    expect(verifyBaSignature(CANONICAL, sig, foreign)).toBe(false);
  });

  it("keypair persisten — kid stabil, kanonikal BA nyata tersign & terverifikasi", () => {
    const kid1 = getBaKeyPair().kid;
    const kid2 = getBaKeyPair().kid;
    expect(kid1).toBe(kid2);
    expect(kid1).toMatch(/^[0-9a-f]{8}$/);

    const input: BaCanonicalInput = {
      dptTotal: 10,
      voted: 7,
      ballots: 7,
      tokenUsed: 7,
      tally: {
        unlocked: true,
        unlockedAt: "2026-11-02T09:00:00.000Z",
        categories: [
          {
            category: "PRESMA",
            studyProgramId: null,
            studyProgramName: null,
            totalValidVotes: 7,
            outcome: "TERPILIH",
            outcomeDetail: "Kandidat 1 terpilih (uji)",
            results: [
              { candidateId: "c1", number: 1, name: "A", viceName: null, secondViceName: null, isEmptyBox: false, votes: 5, percentage: 71.43 },
              { candidateId: "c2", number: 2, name: "B", viceName: null, secondViceName: null, isEmptyBox: false, votes: 2, percentage: 28.57 },
            ],
          },
        ],
        integrity: { allValid: true, chains: [{ tpsId: "T1", name: "TPS 1", valid: true, checkedCount: 7, headHash: "aa11", brokenAtIndex: null }], totalChecked: 7 },
        revoteStats: { tokensVoted: 7, tokensRevoted: 0, supersededBallots: 0, lockedTokens: 7 },
        generatedAt: "2026-11-02T09:05:00.000Z",
      },
      plenoUnlockedAt: new Date("2026-11-02T09:00:00Z"),
    };
    const canonical = buildBaCanonical(input);
    const sig = signBaCanonical(canonical);
    expect(verifyBaSignature(canonical, sig)).toBe(true);
    // ubah satu angka hasil (kanonikal memakai array string flat) → tanda tangan batal
    const parsed = JSON.parse(canonical) as { results: string[] };
    parsed.results[0] = parsed.results[0].replace("|5|", "|500|");
    const forged = JSON.stringify(parsed);
    expect(forged).not.toBe(canonical);
    expect(verifyBaSignature(forged, sig)).toBe(false);
  });
});
