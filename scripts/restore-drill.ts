// ============================================================
// RESTORE DRILL — Simulasi pemulihan + verifikasi rantai hash
// Jalankan: `npx tsx scripts/restore-drill.ts [--file backups/pemira-xxx.db]`
// Tanpa argumen: pakai snapshot TERBARU di backups/.
//
// Membuktikan tiga hal pada sebuah snapshot:
//  1. File SQLite utuh (PRAGMA integrity_check = ok)
//  2. Seluruh blok suara terekonstruksi: ballotHash tiap baris cocok
//     dengan perhitungan ulang SHA-256 (prev + id + kategori + ts + salt)
//  3. Head tiap rantai prodi identik dengan lastChainHash tersimpan
// PASS = snapshot ini SAH dipakai sebagai pemulihan resmi.
// ============================================================
import { createClient } from "@libsql/client";
import { readdirSync } from "fs";
import path from "path";
import { createHash } from "crypto";

const ROOT = path.resolve(__dirname, "..");
const argFile = process.argv.indexOf("--file");
const backupFiles = readdirSync(path.join(ROOT, "backups")).filter((f) => f.endsWith(".db")).sort();
const latestFile = backupFiles.pop();

const target =
  argFile !== -1 && process.argv[argFile + 1]
    ? path.resolve(process.argv[argFile + 1])
    : latestFile
      ? path.join(ROOT, "backups", latestFile)
      : "";

if (!target) {
  console.error(JSON.stringify({ ok: false, error: "Tidak ada snapshot .db di folder backups/" }));
  process.exit(1);
}

function computeBallotHash(p: {
  prevChainHash: string;
  ballotId: string;
  category: string;
  candidateId: string | null;
  isEmptyBox: boolean;
  timestamp: Date;
  tpsSalt: string;
}): string {
  const payload = [
    p.prevChainHash,
    p.ballotId,
    p.category,
    p.candidateId ?? "NULL",
    p.isEmptyBox ? "EMPTY_BOX" : "CANDIDATE",
    p.timestamp.toISOString(),
    p.tpsSalt,
  ].join("||");
  return createHash("sha256").update(payload).digest("hex");
}

function parseTs(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  if (!v) return new Date();
  const s = String(v).trim();
  const direct = new Date(s);
  if (!isNaN(direct.getTime())) return direct;
  const withZ = new Date(s.replace(" ", "T") + "Z");
  if (!isNaN(withZ.getTime())) return withZ;
  return new Date();
}

async function run() {
  const t0 = performance.now();
  const db = createClient({ url: `file:${target}` });

  // 1. Integritas file
  const integrityRes = await db.execute("PRAGMA integrity_check;");
  const integrity = String(integrityRes.rows[0]?.integrity_check ?? "unknown");

  // 2+3. Rekonstruksi rantai per TPS
  const tpsRes = await db.execute("SELECT id, name, chainSalt, lastChainHash FROM Tps ORDER BY id;");
  let totalChecked = 0;
  let brokenAt: string | null = null;
  const chains: Array<{ tpsId: string; blocks: number; headOk: boolean }> = [];

  for (const tps of tpsRes.rows) {
    const tpsId = String(tps.id);
    const chainSalt = String(tps.chainSalt);
    const expectedLast = String(tps.lastChainHash ?? "");

    const ballotsRes = await db.execute({
      sql: "SELECT id, category, candidateId, isEmptyBox, createdAt, ballotHash FROM BallotBox WHERE tpsId = ? ORDER BY createdAt ASC, id ASC;",
      args: [tpsId],
    });

    let prev = "";
    for (const b of ballotsRes.rows) {
      const h = computeBallotHash({
        prevChainHash: prev,
        ballotId: String(b.id),
        category: String(b.category),
        candidateId: b.candidateId ? String(b.candidateId) : null,
        isEmptyBox: Boolean(b.isEmptyBox),
        timestamp: parseTs(b.createdAt),
        tpsSalt: chainSalt,
      });
      if (h !== b.ballotHash) {
        brokenAt = `${tpsId}:${b.id}`;
        break;
      }
      prev = h;
      totalChecked++;
    }
    const headOk = ballotsRes.rows.length === 0 ? expectedLast === "" : prev === expectedLast;
    chains.push({ tpsId, blocks: ballotsRes.rows.length, headOk });
    if (brokenAt) break;
  }

  db.close();

  const ok = integrity === "ok" && !brokenAt && chains.every((c) => c.headOk);
  console.log(
    JSON.stringify(
      {
        drill: ok ? "PASS" : "FAIL",
        file: path.basename(target),
        integrity,
        totalBlocksChecked: totalChecked,
        chains,
        brokenAt,
        durationMs: Math.round(performance.now() - t0),
      },
      null,
      2
    )
  );
  process.exit(ok ? 0 : 1);
}

run().catch((err) => {
  console.error("Restore drill error:", err);
  process.exit(1);
});
