import { describe, expect, it } from "vitest";
import { generateKeyPairSync } from "crypto";
import {
  generateSignerKeyPair,
  getPublicKeyFingerprint,
  signCanonicalPayload,
  verifySingleSignature,
  verifyMultiSignatures,
  parseSignaturesJson,
  serializeSignaturesJson,
  upsertSignatureEntry,
  type BaSignatureEntry,
} from "@/lib/crypto/multisig";

describe("Ed25519 Multisig Engine (Paket #5)", () => {
  const sampleCanonical = JSON.stringify({
    dptTotal: 1200,
    voted: 1050,
    ballots: 1050,
    chainHeads: ["BD|abc|200", "TRPL|def|250"],
    chainValid: true,
  });

  describe("Key Generation & Fingerprint", () => {
    it("menghasilkan pasangan kunci Ed25519 dan kid 8 karakter hex", () => {
      const pair = generateSignerKeyPair();
      expect(pair.publicKeyPem).toContain("BEGIN PUBLIC KEY");
      expect(pair.publicKeyPem).toContain("END PUBLIC KEY");
      expect(pair.privateKeyPem).toContain("BEGIN PRIVATE KEY");
      expect(pair.privateKeyPem).toContain("END PRIVATE KEY");
      expect(pair.kid).toMatch(/^[0-9a-f]{8}$/);
    });

    it("menghitung fingerprint kunci publik secara deterministik", () => {
      const pair = generateSignerKeyPair();
      const fp1 = getPublicKeyFingerprint(pair.publicKeyPem);
      const fp2 = getPublicKeyFingerprint(pair.publicKeyPem);
      expect(fp1).toBe(fp2);
      expect(fp1).toBe(pair.kid);
    });
  });

  describe("Tanda Tangan Tunggal", () => {
    it("menandatangani payload kanonikal dan memverifikasi dengan kunci publik yang cocok", () => {
      const pair = generateSignerKeyPair();
      const sigB64 = signCanonicalPayload(sampleCanonical, pair.privateKeyPem);
      expect(typeof sigB64).toBe("string");
      expect(sigB64.length).toBeGreaterThan(40);

      const isValid = verifySingleSignature(sampleCanonical, sigB64, pair.publicKeyPem);
      expect(isValid).toBe(true);
    });

    it("gagal verifikasi jika dokumen kanonikal diubah (tampered)", () => {
      const pair = generateSignerKeyPair();
      const sigB64 = signCanonicalPayload(sampleCanonical, pair.privateKeyPem);
      const tamperedCanonical = sampleCanonical.replace("1200", "9999");

      const isValid = verifySingleSignature(tamperedCanonical, sigB64, pair.publicKeyPem);
      expect(isValid).toBe(false);
    });

    it("gagal verifikasi jika signature rusak", () => {
      const pair = generateSignerKeyPair();
      const sigB64 = signCanonicalPayload(sampleCanonical, pair.privateKeyPem);
      const brokenSig = "A" + sigB64.slice(1);

      const isValid = verifySingleSignature(sampleCanonical, brokenSig, pair.publicKeyPem);
      expect(isValid).toBe(false);
    });

    it("gagal verifikasi jika kunci publik tidak cocok", () => {
      const pairA = generateSignerKeyPair();
      const pairB = generateSignerKeyPair();
      const sigA = signCanonicalPayload(sampleCanonical, pairA.privateKeyPem);

      const isValid = verifySingleSignature(sampleCanonical, sigA, pairB.publicKeyPem);
      expect(isValid).toBe(false);
    });
  });

  describe("Verifikasi Multi-Signature Konsensus", () => {
    it("menangani daftar signature kosong dengan status invalid & kuorum belum terpenuhi", () => {
      const result = verifyMultiSignatures(sampleCanonical, []);
      expect(result.valid).toBe(false);
      expect(result.totalSigners).toBe(0);
      expect(result.missingRequiredRoles).toContain("KPUM_CHAIR");
      expect(result.missingRequiredRoles).toContain("PANWASLU_CHAIR");
      expect(result.quorumMet).toBe(false);
    });

    it("mengharuskan minimal KPUM dan Panwaslu untuk mencapai kuorum", () => {
      const kpumPair = generateSignerKeyPair();
      const kpumEntry: BaSignatureEntry = {
        role: "KPUM_CHAIR",
        signerName: "Budi Santoso",
        signerNim: "202401001",
        publicKeyPem: kpumPair.publicKeyPem,
        signatureB64: signCanonicalPayload(sampleCanonical, kpumPair.privateKeyPem),
        signedAt: new Date().toISOString(),
      };

      // Hanya KPUM: belum kuorum (kurang Panwaslu)
      const res1 = verifyMultiSignatures(sampleCanonical, [kpumEntry]);
      expect(res1.valid).toBe(false);
      expect(res1.quorumMet).toBe(false);
      expect(res1.missingRequiredRoles).toEqual(["PANWASLU_CHAIR"]);
      expect(res1.totalSigners).toBe(1);

      // Tambah Panwaslu: kuorum tercapai!
      const panwasluPair = generateSignerKeyPair();
      const panwasluEntry: BaSignatureEntry = {
        role: "PANWASLU_CHAIR",
        signerName: "Siti Rahma",
        signerNim: "202401002",
        publicKeyPem: panwasluPair.publicKeyPem,
        signatureB64: signCanonicalPayload(sampleCanonical, panwasluPair.privateKeyPem),
        signedAt: new Date().toISOString(),
      };

      const res2 = verifyMultiSignatures(sampleCanonical, [kpumEntry, panwasluEntry]);
      expect(res2.valid).toBe(true);
      expect(res2.quorumMet).toBe(true);
      expect(res2.missingRequiredRoles).toEqual([]);
      expect(res2.totalSigners).toBe(2);
      expect(res2.verifiedRoles).toContain("KPUM_CHAIR");
      expect(res2.verifiedRoles).toContain("PANWASLU_CHAIR");
    });

    it("memverifikasi konsensus penuh 5 penandatangan (KPUM, Panwaslu, Saksi 01, Saksi 02, DPM)", () => {
      const roles: Array<{ role: BaSignatureEntry["role"]; name: string; nim: string }> = [
        { role: "KPUM_CHAIR", name: "Ketua KPUM", nim: "1001" },
        { role: "PANWASLU_CHAIR", name: "Ketua Panwaslu", nim: "1002" },
        { role: "WITNESS_PASLON_01", name: "Saksi Paslon 01", nim: "1003" },
        { role: "WITNESS_PASLON_02", name: "Saksi Paslon 02", nim: "1004" },
        { role: "DPM_REPRESENTATIVE", name: "Perwakilan DPM", nim: "1005" },
      ];

      const entries: BaSignatureEntry[] = roles.map((r) => {
        const pair = generateSignerKeyPair();
        return {
          role: r.role,
          signerName: r.name,
          signerNim: r.nim,
          publicKeyPem: pair.publicKeyPem,
          signatureB64: signCanonicalPayload(sampleCanonical, pair.privateKeyPem),
          signedAt: new Date().toISOString(),
        };
      });

      const res = verifyMultiSignatures(sampleCanonical, entries);
      expect(res.valid).toBe(true);
      expect(res.quorumMet).toBe(true);
      expect(res.totalSigners).toBe(5);
      expect(res.verifiedRoles.length).toBe(5);
      expect(res.invalidSignatures.length).toBe(0);
      expect(res.signers.length).toBe(5);
      res.signers.forEach((s) => expect(s.valid).toBe(true));
    });

    it("mendeteksi jika ada salah satu tanda tangan saksi yang dipalsukan", () => {
      const kpumPair = generateSignerKeyPair();
      const panwasluPair = generateSignerKeyPair();
      const witnessPair = generateSignerKeyPair();

      const kpumEntry: BaSignatureEntry = {
        role: "KPUM_CHAIR",
        signerName: "Ketua KPUM",
        signerNim: "1001",
        publicKeyPem: kpumPair.publicKeyPem,
        signatureB64: signCanonicalPayload(sampleCanonical, kpumPair.privateKeyPem),
        signedAt: new Date().toISOString(),
      };
      const panwasluEntry: BaSignatureEntry = {
        role: "PANWASLU_CHAIR",
        signerName: "Ketua Panwaslu",
        signerNim: "1002",
        publicKeyPem: panwasluPair.publicKeyPem,
        signatureB64: signCanonicalPayload(sampleCanonical, panwasluPair.privateKeyPem),
        signedAt: new Date().toISOString(),
      };
      // Saksi menandatangani dokumen yang BERBEDA (palsu)
      const fakeWitnessEntry: BaSignatureEntry = {
        role: "WITNESS_PASLON_01",
        signerName: "Saksi Paslon 01 Palsu",
        signerNim: "1003",
        publicKeyPem: witnessPair.publicKeyPem,
        signatureB64: signCanonicalPayload("DOKUMEN_PALSU", witnessPair.privateKeyPem),
        signedAt: new Date().toISOString(),
      };

      const res = verifyMultiSignatures(sampleCanonical, [
        kpumEntry,
        panwasluEntry,
        fakeWitnessEntry,
      ]);
      expect(res.valid).toBe(false);
      expect(res.totalSigners).toBe(2);
      expect(res.invalidSignatures.length).toBe(1);
      expect(res.invalidSignatures[0].role).toBe("WITNESS_PASLON_01");
    });
  });

  describe("JSON Serialization & Upsert Helper", () => {
    it("melakukan serialize dan parse secara roundtrip", () => {
      const pair = generateSignerKeyPair();
      const entry: BaSignatureEntry = {
        role: "KPUM_CHAIR",
        signerName: "Ketua KPUM",
        signerNim: "1001",
        publicKeyPem: pair.publicKeyPem,
        signatureB64: signCanonicalPayload(sampleCanonical, pair.privateKeyPem),
        signedAt: new Date().toISOString(),
      };

      const json = serializeSignaturesJson([entry]);
      const parsed = parseSignaturesJson(json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].role).toBe("KPUM_CHAIR");
      expect(parsed[0].signerName).toBe("Ketua KPUM");
    });

    it("menangani input JSON rusak dengan mengembalikan array kosong", () => {
      expect(parseSignaturesJson(null)).toEqual([]);
      expect(parseSignaturesJson("bukan-json")).toEqual([]);
      expect(parseSignaturesJson("{}")).toEqual([]);
    });

    it("memperbarui (upsert) tanda tangan role yang sama tanpa menduplikasi", () => {
      const pair1 = generateSignerKeyPair();
      const pair2 = generateSignerKeyPair();

      const entry1: BaSignatureEntry = {
        role: "KPUM_CHAIR",
        signerName: "Ketua Lama",
        signerNim: "1001",
        publicKeyPem: pair1.publicKeyPem,
        signatureB64: "sig1",
        signedAt: "2026-11-01T00:00:00Z",
      };
      const entry2: BaSignatureEntry = {
        role: "KPUM_CHAIR",
        signerName: "Ketua Baru",
        signerNim: "1001",
        publicKeyPem: pair2.publicKeyPem,
        signatureB64: "sig2",
        signedAt: "2026-11-02T00:00:00Z",
      };

      const list1 = upsertSignatureEntry([], entry1);
      expect(list1).toHaveLength(1);
      expect(list1[0].signerName).toBe("Ketua Lama");

      const list2 = upsertSignatureEntry(list1, entry2);
      expect(list2).toHaveLength(1);
      expect(list2[0].signerName).toBe("Ketua Baru");
      expect(list2[0].signatureB64).toBe("sig2");
    });

    it("memfilter elemen JSON yang memiliki role tidak sah", () => {
      const invalidRoleJson = JSON.stringify([
        {
          role: "ATTACKER_ROLE",
          signerName: "Hacker",
          signerNim: "9999",
          publicKeyPem: "key",
          signatureB64: "sig",
          signedAt: "2026-11-01T00:00:00Z",
        },
      ]);
      expect(parseSignaturesJson(invalidRoleJson)).toEqual([]);
    });
  });

  describe("Hardening & Robustness Kriptografi", () => {
    it("menolak tanda tangan dengan role tidak sah / di luar whitelist", () => {
      const pair = generateSignerKeyPair();
      const unauthorizedEntry = {
        role: "UNAUTHORIZED_SOCIETY" as any,
        signerName: "Penyusup",
        signerNim: "999999",
        publicKeyPem: pair.publicKeyPem,
        signatureB64: signCanonicalPayload(sampleCanonical, pair.privateKeyPem),
        signedAt: new Date().toISOString(),
      };

      const res = verifyMultiSignatures(sampleCanonical, [unauthorizedEntry]);
      expect(res.valid).toBe(false);
      expect(res.invalidSignatures).toHaveLength(1);
      expect(res.invalidSignatures[0].reason).toContain("Role penandatangan tidak dikenali");
      expect(res.verifiedRoles).not.toContain("UNAUTHORIZED_SOCIETY");
    });

    it("mendeteksi duplikasi tanda tangan untuk role yang sama", () => {
      const pair1 = generateSignerKeyPair();
      const pair2 = generateSignerKeyPair();

      const entry1: BaSignatureEntry = {
        role: "KPUM_CHAIR",
        signerName: "Ketua KPUM 1",
        signerNim: "1001",
        publicKeyPem: pair1.publicKeyPem,
        signatureB64: signCanonicalPayload(sampleCanonical, pair1.privateKeyPem),
        signedAt: new Date().toISOString(),
      };
      const entry2: BaSignatureEntry = {
        role: "KPUM_CHAIR",
        signerName: "Ketua KPUM Duplikat",
        signerNim: "1001-dup",
        publicKeyPem: pair2.publicKeyPem,
        signatureB64: signCanonicalPayload(sampleCanonical, pair2.privateKeyPem),
        signedAt: new Date().toISOString(),
      };

      const res = verifyMultiSignatures(sampleCanonical, [entry1, entry2]);
      expect(res.valid).toBe(false);
      expect(res.invalidSignatures).toHaveLength(1);
      expect(res.invalidSignatures[0].reason).toContain("Duplikasi tanda tangan");
    });

    it("menolak kunci non-Ed25519 (RSA) pada verifySingleSignature", () => {
      const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
      const rsaPub = rsa.publicKey.export({ type: "spki", format: "pem" }).toString();

      const isValid = verifySingleSignature(sampleCanonical, "dummy-base64", rsaPub);
      expect(isValid).toBe(false);
    });

    it("menolak payload kanonikal kosong pada signCanonicalPayload", () => {
      const pair = generateSignerKeyPair();
      expect(() => signCanonicalPayload("", pair.privateKeyPem)).toThrow("Payload kanonikal wajib berupa string");
    });
  });
});
