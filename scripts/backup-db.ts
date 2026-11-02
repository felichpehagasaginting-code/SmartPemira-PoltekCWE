// ============================================================
// BACKUP DB — Standalone DR script (jalankan: `bun scripts/backup-db.ts`)
// Snapshot konsisten via VACUUM INTO + verifikasi integritas snapshot.
// Untuk penjadwalan berkala: pasang cron OS / CI schedule yang memanggil
// perintah ini; di dalam aplikasi, backup otomatis terpicu saat segel/reset.
// ============================================================
import { Database } from "bun:sqlite";
import { mkdirSync, readdirSync, statSync, unlinkSync, copyFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dir, "..");
const DB_PATH = (() => {
  const raw = process.env.DATABASE_URL ?? "file:/home/z/my-project/db/custom.db";
  const p = raw.startsWith("file:") ? raw.slice(5) : raw;
  return path.isAbsolute(p) ? p : path.join(ROOT, "prisma", p);
})();

const BACKUP_DIR = path.join(ROOT, "backups");
const MIRROR_DIR = path.join(ROOT, "download", "pemira-backups");
const KEEP_LOCAL = 10;
const KEEP_MIRROR = 3;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function slug(d = new Date()): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function retention(dir: string, keep: number): void {
  const files = readdirSync(dir).filter((f) => f.endsWith(".db")).sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) {
    try { unlinkSync(path.join(dir, f)); } catch { /* best-effort */ }
  }
}

// ---------- Eksekusi ----------
mkdirSync(BACKUP_DIR, { recursive: true });
mkdirSync(MIRROR_DIR, { recursive: true });

const t0 = performance.now();
const fileName = `pemira-${slug()}-scheduled.db`;
const target = path.join(BACKUP_DIR, fileName);

const src = new Database(DB_PATH, { readonly: true });
src.exec(`VACUUM INTO '${target}'`);
src.close();

// Verifikasi snapshot: integritas + hitungan domain
const snap = new Database(target, { readonly: true });
const integrity = snap.query("PRAGMA integrity_check;").get() as { integrity_check: string };
const counts = {
  voters: (snap.query("SELECT COUNT(*) c FROM Voter").get() as { c: number }).c,
  ballots: (snap.query("SELECT COUNT(*) c FROM BallotBox").get() as { c: number }).c,
  tokens: (snap.query("SELECT COUNT(*) c FROM VotingToken").get() as { c: number }).c,
  archives: (snap.query("SELECT COUNT(*) c FROM ElectionArchive").get() as { c: number }).c,
};
snap.close();

const sizeBytes = statSync(target).size;
if (integrity.integrity_check !== "ok" || sizeBytes <= 0) {
  console.error(JSON.stringify({ ok: false, error: `integritas=${integrity.integrity_check}`, sizeBytes }));
  process.exit(1);
}

try { copyFileSync(target, path.join(MIRROR_DIR, fileName)); retention(MIRROR_DIR, KEEP_MIRROR); } catch { /* mirror best-effort */ }
retention(BACKUP_DIR, KEEP_LOCAL);

console.log(
  JSON.stringify(
    {
      ok: true,
      file: fileName,
      path: target,
      sizeBytes,
      integrity: integrity.integrity_check,
      counts,
      durationMs: Math.round(performance.now() - t0),
    },
    null,
    2
  )
);
