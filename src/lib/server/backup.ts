// ============================================================
// BACKUP & DISASTER RECOVERY (Rekomendasi #1)
// Seluruh bukti pemilu hidup di SATU file SQLite — tanpa salinan, satu
// kerusakan disk atau reset keliru menghapus bukti secara permanen.
//
// Mekanisme:
//  - `VACUUM INTO` = snapshot konsisten TANPA menghentikan layanan (WAL-safe),
//    beda dengan copy file mentah yang bisa robek saat ditulis bersamaan.
//  - Momen wajib: SEBELUM & SESUDAH aksi Segel & Reset (reset-service) —
//    titik paling berisiko dalam siklus hidup pemira.
//  - Retensi: 10 snapshot terbaru di backups/ + 3 terbaru dicerminkan ke
//    download/pemira-backups/ (kelihatan oleh user/pengawas).
//  - Semua kegagalan backup TIDAK memblokir operasi utama, tapi selalu
//    meninggalkan jejak AuditLog — kegagalan backup adalah insiden, bukan
//    hal sepele.
// ============================================================
import { mkdir, stat, readdir, copyFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

const PROJECT_ROOT = process.cwd().includes("/.next")
  ? path.resolve(process.cwd(), "..", "..")
  : process.cwd();

export const BACKUP_DIR = path.join(PROJECT_ROOT, "backups");
export const BACKUP_MIRROR_DIR = path.join(PROJECT_ROOT, "download", "pemira-backups");
const KEEP_LOCAL = 10;
const KEEP_MIRROR = 3;

export interface BackupResult {
  ok: boolean;
  path?: string;
  fileName?: string;
  sizeBytes?: number;
  error?: string;
}

export function resolveDbFilePath(): string {
  const raw = process.env.DATABASE_URL ?? "file:./db/custom.db";
  const p = raw.startsWith("file:") ? raw.slice(5) : raw;
  const stripped = p.split("?")[0];
  return path.isAbsolute(stripped) ? stripped : path.resolve(PROJECT_ROOT, "prisma", stripped);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function timestampSlug(d = new Date()): string {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function sanitizeReason(reason: string): string {
  return reason.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 40) || "manual";
}

/** Snapshot konsisten DB via VACUUM INTO. Tidak pernah melempar error. */
export async function createDbBackup(reason: string): Promise<BackupResult> {
  const srcPath = resolveDbFilePath();
  const fileName = `pemira-${timestampSlug()}-${sanitizeReason(reason)}.db`;
  const target = path.join(BACKUP_DIR, fileName);
  try {
    await mkdir(BACKUP_DIR, { recursive: true });
    await mkdir(BACKUP_MIRROR_DIR, { recursive: true });
    // VACUUM INTO menolak file yang sudah ada — nama bertimestamp memang unik.
    await db.$executeRawUnsafe(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
    const st = await stat(target);
    if (st.size <= 0) throw new Error("snapshot kosong");

    await applyRetention(BACKUP_DIR, KEEP_LOCAL);
    // Cerminan ringan untuk pengawas/user (3 terbaru)
    try {
      await copyFile(target, path.join(BACKUP_MIRROR_DIR, fileName));
      await applyRetention(BACKUP_MIRROR_DIR, KEEP_MIRROR);
    } catch {
      // cerminan gagal tidak fatal — salinan utama sudah ada
    }
    return { ok: true, path: target, fileName, sizeBytes: st.size };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function applyRetention(dir: string, keep: number): Promise<void> {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".db")).sort(); // nama = urut waktu
  const excess = files.length - keep;
  for (let i = 0; i < excess; i++) {
    try {
      await (await import("fs/promises")).unlink(path.join(dir, files[i]));
    } catch {
      // biarkan — retention bersifat best-effort
    }
  }
}

// ---------- Ekspor arsip kedap-cetak (hasil per kategori + audit) ----------

function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Tulis paket arsip file-level untuk satu archiveCode:
 *  - hasil-rekap.csv   : rekap suara per kategori (Excel-ready, BOM UTF-8)
 *  - arsip-lengkap.json: seluruh payload arsip (identik dgn baris ElectionArchive)
 * Tersimpan di backups/archives/<code>/ — salinan kedap-cetak di luar DB.
 */
export async function writeArchiveFiles(
  archiveCode: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; dir?: string; error?: string }> {
  try {
    const dir = path.join(BACKUP_DIR, "archives", archiveCode);
    await mkdir(dir, { recursive: true });
    const { writeFile } = await import("fs/promises");

    // ---- Rekap CSV ----
    const tally = payload.tally as
      | { categories?: Array<{ category: string; studyProgramName: string | null; totalValidVotes: number; results: Array<{ number: number; name: string; viceName: string | null; votes: number; percentage: number }> }> }
      | undefined;
    const lines: string[] = [];
    lines.push(`Rekap Resmi Periode — ${csvEscape(String(payload.periodLabel ?? ""))}`);
    lines.push(`Kode Arsip,${csvEscape(archiveCode)}`);
    lines.push(`Disegel oleh,${csvEscape(String(payload.sealedBy ?? ""))}`);
    lines.push(`Waktu,${csvEscape(String(payload.sealedAt ?? ""))}`);
    lines.push("");
    lines.push("Kategori,Prodi,No Urut,Nama,Wakil,Suara,Persentase (%)");
    for (const cat of tally?.categories ?? []) {
      for (const r of cat.results) {
        lines.push(
          [
            cat.category,
            cat.studyProgramName ?? "-",
            r.number,
            r.name,
            r.viceName ?? "-",
            r.votes,
            r.percentage.toFixed(2),
          ]
            .map(csvEscape)
            .join(",")
        );
      }
    }
    // BOM agar Excel mengenali UTF-8
    await writeFile(path.join(dir, "hasil-rekap.csv"), "\uFEFF" + lines.join("\r\n"), "utf8");

    // ---- Arsip JSON lengkap ----
    await writeFile(
      path.join(dir, "arsip-lengkap.json"),
      JSON.stringify(payload, null, 2),
      "utf8"
    );
    return { ok: true, dir };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Catat insiden backup gagal ke AuditLog — backup gagal WAJIB terlihat panitia. */
export async function auditBackupFailure(context: string, error: string): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        event: "BACKUP_FAILED",
        detail: `Backup GAGAL pada konteks "${context}": ${error}. SEGERA periksa ruang disk & izin folder backups/.`,
      },
    });
  } catch {
    // bahkan audit pun gagal — biarkan; operasi utama tidak boleh terblokir
  }
}
