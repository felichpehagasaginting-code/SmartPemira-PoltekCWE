// ============================================================
// RESTORE DRILL — Simulasi pemulihan + verifikasi rantai hash
// Jalankan: `bun scripts/restore-drill.ts [--file backups/pemira-xxx.db]`
// Tanpa argumen: pakai snapshot TERBARU di backups/.
//
// Membuktikan tiga hal pada sebuah snapshot:
//  1. File SQLite utuh (PRAGMA integrity_check = ok)
//  2. Seluruh blok suara terekonstruksi: ballotHash tiap baris cocok
//     dengan perhitungan ulang SHA-256 (prev + id + kategori + ts + salt)
//  3. Head tiap rantai prodi identik dengan lastChainHash tersimpan
// PASS = snapshot ini SAH dipakai sebagai pemulihan resmi.
// ============================================================
import { Database } from "bun:sqlite";
import { readdirSync } from "fs";
import path from "path";
import { createHash } from "crypto";

const ROOT = path.resolve(import.meta.dir, "..");
const argFile = process.argv.indexOf("--file");
const target =
  argFile !== -1 && process.argv[argFile + 1]
    ? path.resolve(process.argv[argFile + 1])
    : path.join(ROOT, "backups", readdirSync(path.join(ROOT, "backups")).filter((f) => f.endsWith(".db")).sort().pop() ?? "");

if (!target || !readdirSync(path.dirname(target)).includes(path.basename(target))) {
  console.error(JSON.stringify({ ok: false, error: `Snapshot tidak ditemukan: ${target}` }));
  process.exit(1);
}

interface Row { id: string; category: string; candidateId: string | null; isEmptyBox: number; tpsId: string; createdAt: string | number; ballotHash: string }

const db = new Database(target, { readonly: true });
const t0 = performance.now();

// 1. Integritas file
const integrity = (db.query("PRAGMA integrity_check;").get() as { integrity_check: string }).integrity_check;

// 2+3. Rekonstruksi rantai per TPS
function computeBallotHash(p: {
  prevChainHash: string; ballotId: string; category: string; candidateId: string | null;
  isEmptyBox: boolean; timestamp: Date; tpsSalt: string;
}): string {
  const payload = [
    p.prevChainHash, p.ballotId, p.category,
    p.candidateId ?? "NULL",
    p.isEmptyBox ? "EMPTY_BOX" : "CANDIDATE",
    p.timestamp.toISOString(),
    p.tpsSalt,
  ].join("||");
  return createHash("sha256").update(payload).digest("hex");
}

const tpsList = db.query("SELECT id, name, chainSalt, lastChainHash FROM Tps ORDER BY id").all() as Array<{
  id: string; name: string; chainSalt: string; lastChainHash: string;
}>;

let totalChecked = 0;
let brokenAt: string | null = null;
const chains: Array<{ tpsId: string; blocks: number; headOk: boolean }> = [];

function parseTs(v: string | number): Date {
  // Prisma menyimpan DateTime sebagai string "YYYY-MM-DD HH:MM:SS(.sss)" UTC;
  // bun:sqlite dapat mengembalikannya sebagai number (epoch ms) — terima keduanya.
  if (typeof v === "number") return new Date(v);
  if (v.endsWith("Z")) return new Date(v);
  return new Date(v.replace(" ", "T") + "Z");
}

for (const tps of tpsList) {
  const rows = db
    .query("SELECT id, category, candidateId, isEmptyBox, tpsId, createdAt, ballotHash FROM BallotBox WHERE tpsId = ? ORDER BY createdAt ASC, id ASC")
    .all(tps.id) as unknown as Row[];
  let prev = "";
  for (const r of rows) {
    const h = computeBallotHash({
      prevChainHash: prev,
      ballotId: r.id,
      category: r.category,
      candidateId: r.candidateId,
      isEmptyBox: !!r.isEmptyBox,
      timestamp: parseTs(r.createdAt as unknown as string | number),
      tpsSalt: tps.chainSalt,
    });
    if (h !== r.ballotHash) { brokenAt = `${tps.id}:${r.id}`; break; }
    prev = h;
    totalChecked++;
  }
  const headOk = rows.length === 0 ? tps.lastChainHash === "" : prev === tps.lastChainHash;
  chains.push({ tpsId: tps.id, blocks: rows.length, headOk });
  if (brokenAt) break;
}

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
