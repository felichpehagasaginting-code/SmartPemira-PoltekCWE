// ============================================================
// INVARIANT 5 — SUBMIT SUARA (jantung sistem, uji terhadap DB nyata):
//  a. 30 pemilih submit BERSAMAAN (Promise.all) → semua sukses, rantai
//     tiap prodi terekonstruksi penuh & head cocok (tak ada rantai putus).
//  b. Satu token disubmit 2× bersamaan → model Estonia: dua versi tersimpan,
//     TEPAT SATU versi terbaru per kategori yang dihitung (latest-wins).
//  c. Kandidat prodi salah → PRODI_MISMATCH, TIDAK ada blok tertulis.
//  d. Token kedaluwarsa ditolak; re-vote diizinkan sampai dikunci.
//  e. Kunci suara (lockBallot) menutup re-vote permanen.
// ============================================================
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash, randomUUID } from "crypto";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto/token-generator";
import { computeBallotHash } from "@/lib/crypto/ballot-hash-chain";
import {
  submitBallots,
  lockBallot,
  issueToken,
  type BallotSelections,
} from "@/lib/db/ballot-service";

const PRODI_ID = `VT-${randomUUID().slice(0, 6)}`;
const PRODI_LAIN_ID = `VL-${randomUUID().slice(0, 6)}`;
const TPS_ID = `VTPS-${PRODI_ID}`;
const SALT = createHash("sha256").update(randomUUID()).digest("hex");

let presmaId = "";
let dpmId = "";
let himaId = "";
let otherProdiHimaId = "";

async function seedToken(opts?: { expired?: boolean }): Promise<{ token: string }> {
  const plaintext = [...Array(6)].map(() => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  const tokenHash = hashToken(plaintext);
  const now = new Date();
  await db.votingToken.create({
    data: {
      tokenHash,
      tpsId: TPS_ID,
      studyProgramId: PRODI_ID,
      status: "ACTIVE",
      issuedAt: now,
      expiresAt: new Date(now.getTime() + (opts?.expired ? -60_000 : 10 * 60_000)),
    },
  });
  return { token: plaintext };
}

const selFor = (v?: boolean): BallotSelections =>
  v === false
    ? { presmaCandidateId: null, dpmCandidateId: null, himaCandidateId: null }
    : { presmaCandidateId: presmaId, dpmCandidateId: dpmId, himaCandidateId: himaId };

beforeAll(async () => {
  await db.electionSetting.upsert({
    where: { id: "main" },
    create: { id: "main", votingOpen: true, emergencyFreeze: false, sessionSecret: randomUUID() },
    update: { votingOpen: true, emergencyFreeze: false },
  });
  await db.studyProgram.create({
    data: {
      id: PRODI_ID,
      name: `Prodi Uji ${PRODI_ID}`,
      facultyName: "Fakultas Uji",
      colorPrimary: "#1B7F4E",
      colorTint: "#E6F4EC",
    },
  });
  await db.studyProgram.create({
    data: {
      id: PRODI_LAIN_ID,
      name: `Prodi Lain ${PRODI_LAIN_ID}`,
      facultyName: "Fakultas Lain",
      colorPrimary: "#0F766E",
      colorTint: "#E0F2F1",
    },
  });
  await db.tps.create({
    data: { id: TPS_ID, name: `TPS Uji ${TPS_ID}`, location: "Uji", chainSalt: SALT, lastChainHash: "" },
  });
  const [presma, dpm, hima, otherHima] = await Promise.all([
    db.candidate.create({ data: { category: "PRESMA", number: 1, presidentName: "Paslon A", vision: "v", missionJson: "[]", photoAccent: "#111111" } }),
    db.candidate.create({ data: { category: "DPM", number: 1, presidentName: "DPM A", vision: "v", missionJson: "[]", photoAccent: "#222222" } }),
    db.candidate.create({ data: { category: "HIMA", number: 1, presidentName: "Hima A", vision: "v", missionJson: "[]", photoAccent: "#333333", studyProgramId: PRODI_ID } }),
    db.candidate.create({
      data: {
        category: "HIMA", number: 1, presidentName: "Hima Prodi Lain", vision: "v", missionJson: "[]", photoAccent: "#444444",
        studyProgramId: PRODI_LAIN_ID,
      },
    }),
  ]);
  presmaId = presma.id;
  dpmId = dpm.id;
  himaId = hima.id;
  otherProdiHimaId = otherHima.id;
});

afterAll(async () => {
  await db.ballotBox.deleteMany({ where: { tpsId: TPS_ID } });
  await db.votingToken.deleteMany({ where: { tpsId: TPS_ID } });
  await db.candidate.deleteMany({ where: { id: { in: [presmaId, dpmId, himaId, otherProdiHimaId] } } });
  await db.tps.deleteMany({ where: { id: TPS_ID } });
  await db.studyProgram.deleteMany({ where: { id: { in: [PRODI_ID, PRODI_LAIN_ID] } } });
});

/** Rekonstruksi rantai seperti verifyChain: urut createdAt, hitung ulang hash. */
async function walkChain(): Promise<{ ok: boolean; brokenAt: string | null; head: string; blocks: number }> {
  const tps = await db.tps.findUnique({ where: { id: TPS_ID } });
  const rows = await db.ballotBox.findMany({ where: { tpsId: TPS_ID }, orderBy: { createdAt: "asc" } });
  let prev = "";
  for (const r of rows) {
    const h = computeBallotHash({
      prevChainHash: prev,
      ballotId: r.id,
      category: r.category,
      candidateId: r.candidateId,
      isEmptyBox: r.isEmptyBox,
      timestamp: r.createdAt,
      tpsSalt: SALT,
    });
    if (h !== r.ballotHash) return { ok: false, brokenAt: r.id, head: prev, blocks: rows.length };
    prev = h;
  }
  return { ok: true, brokenAt: null, head: prev, blocks: rows.length };
}

describe("Invariant: submit suara — beban paralel", () => {
  it("30 token disubmit BERSAMAAN → semua sukses & rantai hash utuh", async () => {
    const tokens = await Promise.all(Array.from({ length: 30 }, () => seedToken()));
    const results = await Promise.all(tokens.map((t) => submitBallots(t.token, selFor())));

    expect(results.every((r) => r.ok)).toBe(true);
    const receipts = new Set(results.filter((r) => r.ok).map((r) => r.receiptCode));
    expect(receipts.size).toBe(30); // tiap pemilih struk unik

    const walk = await walkChain();
    expect(walk.ok).toBe(true);
    expect(walk.brokenAt).toBeNull();
    expect(walk.blocks).toBe(90); // 30 pemilih × 3 kategori
    const tps = await db.tps.findUnique({ where: { id: TPS_ID } });
    expect(walk.head).toBe(tps?.lastChainHash);
  });

  it("satu token 2 submit BERSAMAAN → model Estonia: tepat satu versi terakhir per kategori", async () => {
    const { token } = await seedToken();
    const [r1, r2] = await Promise.all([
      submitBallots(token, selFor()),
      submitBallots(token, { presmaCandidateId: null, dpmCandidateId: null, himaCandidateId: null }), // versi kosong
    ]);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    // Urutan eksekusi antar-transaksi paralel TIDAK terjamin (Promise.all) —
    // yang dijamin model Estonia: dua versi berbeda 1 & 2, keduanya sukses.
    const versions = [r1.ok ? r1.voteVersion : -1, r2.ok ? r2.voteVersion : -1].sort((a, b) => a - b);
    expect(versions).toEqual([1, 2]);

    const tokenHash = hashToken(token);
    const tokenRow = await db.votingToken.findUnique({ where: { tokenHash } });
    const ballots = await db.ballotBox.findMany({ where: { tokenId: tokenRow!.id } });
    expect(ballots).toHaveLength(6); // 2 versi × 3 kategori

    // INVARIANT latest-ballot-wins: per kategori hanya max(voteVersion) yang dihitung
    for (const cat of ["PRESMA", "DPM", "HIMA"]) {
      const versions = ballots.filter((b) => b.category === cat).map((b) => b.voteVersion);
      expect(new Set(versions).size).toBe(versions.length); // tak ada duplikat versi
      expect(versions.filter((v) => v === Math.max(...versions))).toHaveLength(1);
    }
  });
});

describe("Invariant: submit suara — penolakan & kebersihan rantai", () => {
  it("kandidat HIMA prodi lain → PRODI_MISMATCH, TIDAK ada blok masuk rantai", async () => {
    const before = (await walkChain()).blocks;
    const { token } = await seedToken();
    const res = await submitBallots(token, {
      presmaCandidateId: presmaId,
      dpmCandidateId: dpmId,
      himaCandidateId: otherProdiHimaId, // HUKUM 4 — assertion server-side
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("PRODI_MISMATCH");
    const after = (await walkChain()).blocks;
    expect(after).toBe(before);
  });

  it("token kedaluwarsa → EXPIRED_TOKEN", async () => {
    const { token } = await seedToken({ expired: true });
    const res = await submitBallots(token, selFor());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("EXPIRED_TOKEN");
  });

  it("re-vote diizinkan sampai Kunci Suaraku; setelah lock → LOCKED_TOKEN", async () => {
    const { token } = await seedToken();
    const v1 = await submitBallots(token, selFor());
    expect(v1.ok).toBe(true);

    const lock = await lockBallot(token);
    expect(lock.ok).toBe(true);

    const v2 = await submitBallots(token, selFor());
    expect(v2.ok).toBe(false);
    if (!v2.ok) expect(v2.code).toBe("LOCKED_TOKEN");
  });

  it("pemungutan ditutup → VOTING_CLOSED (dipulihkan setelahnya)", async () => {
    await db.electionSetting.update({ where: { id: "main" }, data: { votingOpen: false } });
    try {
      const { token } = await seedToken();
      const res = await submitBallots(token, selFor());
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("VOTING_CLOSED");
    } finally {
      await db.electionSetting.update({ where: { id: "main" }, data: { votingOpen: true } });
    }
  });
});

describe("Invariant: penerbitan token PPUR (FR-04)", () => {
  it("terbit token → pemilih DALAM_ANTREAN; terbit ulang menghanguskan token lama", async () => {
    const nim = `VT${Date.now()}${Math.floor(Math.random() * 100)}`.slice(0, 16);
    const voter = await db.voter.create({
      data: { nim, name: "Pemilih Uji", angkatan: 2024, studyProgramId: PRODI_ID, tpsId: TPS_ID },
    });
    try {
      const first = await issueToken(voter.id, "uji");
      expect(first.ok).toBe(true);

      const mid = await db.voter.findUnique({ where: { id: voter.id } });
      expect(mid?.status).toBe("DALAM_ANTREAN");
      expect(mid?.pendingTokenHash).toBe(hashToken(first.ok ? first.token : ""));

      const second = await issueToken(voter.id, "uji ulang");
      expect(second.ok).toBe(true);

      const oldToken = await db.votingToken.findUnique({ where: { tokenHash: hashToken(first.ok ? first.token : "") } });
      expect(oldToken?.status).toBe("EXPIRED"); // FR-04.3: token lama dihanguskan
    } finally {
      await db.voter.delete({ where: { id: voter.id } });
    }
  });
});
