// ============================================================
// DB WRITE RETRY — Anti SQLITE_BUSY untuk beban puncak (Rekomendasi #8)
// WAL menoleransi 1 penulis pada satu waktu; ketika dua transaksi menabrak,
// SQLite melempar "database is locked"/Prisma P2034. Dengan busy_timeout=5 dtk
// sebagian besar tabrakan sudah terselesaikan sendiri — wrapper ini menangkap
// sisanya dengan backoff jitter pendek, sehingga pemilih TIDAK melihat error
// saat 1000 mahasiswa mengirim suara bersamaan.
// ============================================================

const RETRYABLE = [
  "P2034", // Prisma: Transaction failed due to a write conflict / deadlock
  "database is locked",
  "SQLITE_BUSY",
  "database table is locked",
];

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 40;

function isRetryable(err: unknown): boolean {
  if (!err) return false;
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  if (RETRYABLE.includes(code)) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return RETRYABLE.some((needle) => msg.includes(needle));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Jalankan fungsi tulis dengan retry transparan untuk konflik tulis SQLite.
 * Hanya untuk operasi IDEMPOTEN-semantik transaksional (submit suara, issue
 * token, dsb.) — keseluruhan transaksi diulang dari awal, bukan sebagian.
 */
export async function withWriteRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_ATTEMPTS || !isRetryable(err)) throw err;
      const jitter = Math.random() * BASE_DELAY_MS;
      await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1) + jitter);
    }
  }
  throw lastErr;
}
