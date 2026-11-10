// ============================================================
// TURSO DISASTER RECOVERY & SNAPSHOT BACKUP (Node.js + LibSQL)
// Menghubungkan ke Turso Cloud, mengunduh seluruh skema & data pemilu,
// menyimpan ke SQLite lokal bertanggal di backups/, memverifikasi PRAGMA
// integrity_check, dan mengaudit keutuhan 5 rantai hash TPS prodi.
//
// Penggunaan:
//   npx tsx scripts/backup-turso.ts
//   npx tsx scripts/backup-turso.ts --sync-local (juga update db/custom.db untuk Prisma Studio)
// ============================================================
import { createClient } from "@libsql/client";
import { mkdirSync, writeFileSync, copyFileSync, readdirSync, unlinkSync } from "fs";
import path from "path";
import { createHash } from "crypto";

const ROOT = path.resolve(__dirname, "..");
const BACKUP_DIR = path.join(ROOT, "backups");
const LOCAL_DB_PATH = path.join(ROOT, "db", "custom.db");
const KEEP_BACKUPS = 15;

const tursoUrl =
  process.env.TURSO_DATABASE_URL ||
  "libsql://smartpemira-poltekcwe-felichpehagasaginting-code.aws-ap-southeast-1.turso.io";
const tursoAuthToken =
  process.env.TURSO_AUTH_TOKEN ||
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTM5MzMyMjYsImlkIjoiMDFhMWFlYzAtNTUwMS03NTBkLTlkOTYtNGM3YzFmZjc0ODFjIiwia2lkIjoiWjZWMkJRc2c4MEJfVTF5c2VSRUlJX25JMVFFNkw4c1lCSFJVLVN3dFBmcyIsInJpZCI6IjU2NWQ0ZGE1LWEzYjUtNGQ0Zi1iNzQ2LTUyMjMzOWMyMjAzZSJ9.2lpafp81QjUEZyAQS-ballAPzJ12HoOC4yYAXVvwp_VmMbQbhhKXQXC8l5paIt-AlNA25riiskk6T5VdLPVBBQ";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function timestampSlug(d = new Date()): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
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

async function retryRemote<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 1500): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        console.log(`  ⏳ Jaringan sibuk/timeout, mencoba ulang (${attempt}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
  }
  throw lastErr;
}

export async function runBackup(options?: { syncLocal?: boolean }): Promise<{
  success: boolean;
  backupFile: string;
  sha256: string;
  tablesBackedUp: number;
  totalRows: number;
  integrity: string;
  chains: Array<{ tpsId: string; blocks: number; headOk: boolean }>;
}> {
  const t0 = performance.now();
  mkdirSync(BACKUP_DIR, { recursive: true });
  mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true });

  const fileName = `turso-backup-${timestampSlug()}.db`;
  const backupPath = path.join(BACKUP_DIR, fileName);

  console.log("☁️  Menghubungkan ke Turso Cloud...");
  const remote = createClient({ url: tursoUrl, authToken: tursoAuthToken });

  console.log(`📁 Membuat snapshot SQLite lokal: ${fileName}`);
  // Buat file baru lokal
  const local = createClient({ url: `file:${backupPath}` });

  // 1. Ambil seluruh skema tabel dari Turso
  const tablesResult = await retryRemote(() =>
    remote.execute(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name;"
    )
  );

  let totalRowsCount = 0;
  const tableNames = tablesResult.rows.map((r) => String(r.name));

  // Matikan foreign key check sementara migrasi snapshot
  await local.execute("PRAGMA foreign_keys = OFF;");

  for (const row of tablesResult.rows) {
    const tableName = String(row.name);
    const tableSql = String(row.sql);

    // Buat struktur tabel di lokal
    await local.execute(tableSql);

    // Ambil seluruh data dari remote
    const rowsRes = await retryRemote(() => remote.execute(`SELECT * FROM "${tableName}";`));
    const rows = rowsRes.rows;
    totalRowsCount += rows.length;

    if (rows.length > 0) {
      const cols = rowsRes.columns;
      const placeholders = cols.map(() => "?").join(", ");
      const insertSql = `INSERT INTO "${tableName}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders});`;

      // Batch insert ke lokal
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const slice = rows.slice(i, i + batchSize);
        const batchStmts = slice.map((r) => ({
          sql: insertSql,
          args: cols.map((col) => (r[col] === undefined ? null : r[col])),
        }));
        await local.batch(batchStmts);
      }
    }
    console.log(`  ✓ Tabel ${tableName}: ${rows.length} baris dicadangkan.`);
  }

  // 2. Buat index
  const indexResult = await retryRemote(() =>
    remote.execute(
      "SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%';"
    )
  );
  for (const r of indexResult.rows) {
    try {
      await local.execute(String(r.sql));
    } catch {
      // index mungkin terbuat otomatis oleh UNIQUE constraint
    }
  }

  await local.execute("PRAGMA foreign_keys = ON;");

  // 3. Verifikasi integritas PRAGMA
  const integrityRes = await local.execute("PRAGMA integrity_check;");
  const integrity = String(integrityRes.rows[0]?.integrity_check ?? "unknown");
  console.log(`🔍 Uji Integritas File SQLite: ${integrity}`);

  // 4. Verifikasi keutuhan Rantai Hash TPS
  const tpsRes = await local.execute("SELECT id, name, chainSalt, lastChainHash FROM Tps ORDER BY id;");
  const chains: Array<{ tpsId: string; blocks: number; headOk: boolean }> = [];
  let brokenAt: string | null = null;

  for (const tps of tpsRes.rows) {
    const tpsId = String(tps.id);
    const chainSalt = String(tps.chainSalt);
    const expectedLast = String(tps.lastChainHash ?? "");

    const ballotsRes = await local.execute({
      sql: 'SELECT id, category, candidateId, isEmptyBox, createdAt, ballotHash FROM BallotBox WHERE tpsId = ? ORDER BY createdAt ASC, id ASC;',
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
    }
    const headOk = ballotsRes.rows.length === 0 ? expectedLast === "" : prev === expectedLast;
    chains.push({ tpsId, blocks: ballotsRes.rows.length, headOk });
  }

  // Tutup koneksi lokal
  local.close();
  remote.close();

  // 5. Hitung Fingerprint SHA-256
  const fs = await import("fs");
  const fileBuffer = fs.readFileSync(backupPath);
  const sha256 = createHash("sha256").update(fileBuffer).digest("hex");
  writeFileSync(`${backupPath}.sha256`, `${sha256}  ${fileName}\n`);

  // 6. Sinkronisasi ke db/custom.db jika diminta
  const shouldSync = options?.syncLocal ?? process.argv.includes("--sync-local");
  if (shouldSync) {
    copyFileSync(backupPath, LOCAL_DB_PATH);
    console.log(`🔄 Berhasil sinkronisasi snapshot ke local database: ${LOCAL_DB_PATH}`);
  }

  // 7. Retensi berkas backup lama
  try {
    const files = readdirSync(BACKUP_DIR).filter((f) => f.startsWith("turso-backup-") && f.endsWith(".db")).sort();
    if (files.length > KEEP_BACKUPS) {
      for (const oldFile of files.slice(0, files.length - KEEP_BACKUPS)) {
        unlinkSync(path.join(BACKUP_DIR, oldFile));
        try { unlinkSync(path.join(BACKUP_DIR, `${oldFile}.sha256`)); } catch { /* ignore */ }
      }
    }
  } catch {
    // retensi best effort
  }

  const durationMs = Math.round(performance.now() - t0);
  const isHealthy = integrity === "ok" && !brokenAt && chains.every((c) => c.headOk);

  console.log("\n==================== HASIL PENCADANGAN TURSO ====================");
  console.log(`Status         : ${isHealthy ? "✅ SUKSES (Lolos Audit Integritas)" : "❌ GAGAL"}`);
  console.log(`File Cadangan  : ${backupPath}`);
  console.log(`Ukuran File    : ${(fileBuffer.length / 1024).toFixed(2)} KB`);
  console.log(`SHA-256        : ${sha256}`);
  console.log(`Total Baris    : ${totalRowsCount} baris (${tableNames.length} tabel)`);
  console.log(`Rantai Suara   : ${chains.map((c) => `${c.tpsId}: ${c.blocks} blok (${c.headOk ? "OK" : "CORRUPT"})`).join(", ")}`);
  console.log(`Durasi         : ${durationMs} ms`);
  console.log("=================================================================\n");

  return {
    success: isHealthy,
    backupFile: backupPath,
    sha256,
    tablesBackedUp: tableNames.length,
    totalRows: totalRowsCount,
    integrity,
    chains,
  };
}

if (require.main === module || process.argv[1]?.endsWith("backup-turso.ts")) {
  runBackup()
    .then((res) => {
      if (!res.success) process.exit(1);
    })
    .catch((err) => {
      console.error("❌ Kesalahan fatal saat pencadangan Turso:", err);
      process.exit(1);
    });
}
