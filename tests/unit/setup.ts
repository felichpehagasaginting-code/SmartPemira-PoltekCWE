// ============================================================
// SETUP VITEST — DB uji terisolasi (Rekomendasi #6)
// DATABASE_URL diarahkan ke file /tmp SEBELUM modul apa pun mengimpor
// @/lib/db (PrismaClient membaca env saat pertama dibuat), lalu schema
// di-push. `prisma db push` idempoten — aman dipanggil ulang.
// Database produksi TIDAK pernah disentuh test.
// ============================================================
import { execSync } from "child_process";
import path from "path";

process.env["NODE_ENV" as keyof NodeJS.ProcessEnv] = "test";

const tmpDb = path.join("/tmp", `pemira-vitest-${process.pid}.db`);
// connection_limit=1: SQLite hanya mendukung satu penulis — semua query
// diserialisasi lewat satu koneksi sehingga uji paralel deterministik
// (tanpa P2024 socket timeout saat 30 submit bersamaan).
process.env["DATABASE_URL" as keyof NodeJS.ProcessEnv] = `file:${tmpDb}?connection_limit=1`;

execSync("npx prisma db push --skip-generate", {
  env: process.env,
  stdio: "pipe",
  cwd: path.resolve(import.meta.dirname, "..", ".."),
});
