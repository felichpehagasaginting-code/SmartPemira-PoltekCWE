// ============================================================
// INVARIANT 1 — HASH CHAIN: integritas rantai adalah janji utama sistem.
// Jika rantai bisa terputus/mundur, seluruh verifikasi publik runtuh.
// ============================================================
import { describe, it, expect } from "vitest";
import { computeBallotHash } from "@/lib/crypto/ballot-hash-chain";

const SALT = "salt-rantai-uji";

function makeHash(prev: string, id: string, category: string, candidateId: string | null, ts: Date): string {
  return computeBallotHash({
    prevChainHash: prev,
    ballotId: id,
    category,
    candidateId,
    isEmptyBox: candidateId === null,
    timestamp: ts,
    tpsSalt: SALT,
  });
}

describe("Invariant: hash chain", () => {
  it("genesis (suara pertama) memakai prevHash kosong dan menghasilkan hash 64-hex", () => {
    const h = makeHash("", "id-1", "PRESMA", "cand-1", new Date("2026-01-01T00:00:00Z"));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rantai 100 blok berurutan: tiap hash bergantung penuh pada sebelumnya", () => {
    let prev = "";
    const hashes: string[] = [];
    for (let i = 0; i < 100; i++) {
      prev = makeHash(prev, `id-${i}`, "DPM", i % 2 === 0 ? `cand-${i}` : null, new Date(Date.now() + i));
      hashes.push(prev);
    }
    expect(new Set(hashes).size).toBe(100); // tidak ada duplikat
  });

  it("perubahan SATU bit pada payload mengubah hash (deteksi manipulasi)", () => {
    const base = {
      prevChainHash: "abc",
      ballotId: "id-1",
      category: "PRESMA",
      candidateId: "cand-1",
      isEmptyBox: false,
      timestamp: new Date("2026-01-01T00:00:00Z"),
      tpsSalt: SALT,
    };
    const h1 = computeBallotHash(base);
    const h2 = computeBallotHash({ ...base, candidateId: "cand-2" });
    const h3 = computeBallotHash({ ...base, timestamp: new Date("2026-01-01T00:00:01Z") });
    const h4 = computeBallotHash({ ...base, tpsSalt: "salt-lain" });
    expect(h1).not.toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).not.toBe(h4);
  });

  it("deterministik: payload sama → hash sama (bisa diverifikasi ulang oleh publik)", () => {
    const base = {
      prevChainHash: "abc",
      ballotId: "id-9",
      category: "HIMA",
      candidateId: null,
      isEmptyBox: true,
      timestamp: new Date("2026-05-05T10:00:00Z"),
      tpsSalt: SALT,
    };
    expect(computeBallotHash(base)).toBe(computeBallotHash({ ...base }));
  });

  it("suara kosong vs kandidat menghasilkan hash berbeda meski timestamp sama", () => {
    const prev = "prev";
    const ts = new Date("2026-02-02T08:00:00Z");
    const kosong = makeHash(prev, "id-a", "HIMA", null, ts);
    const isi = makeHash(prev, "id-a", "HIMA", "cand-x", ts);
    expect(kosong).not.toBe(isi);
  });
});
