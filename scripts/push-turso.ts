// ============================================================
// PUSH SCHEMA & SEED TO TURSO
// Menjalankan migrasi skema DDL ke database Turso dan seeding awal.
// ============================================================
import { createClient } from "@libsql/client";
import { execSync } from "child_process";
import path from "path";

const tursoUrl =
  process.env.TURSO_DATABASE_URL ||
  "libsql://smartpemira-poltekcwe-felichpehagasaginting-code.aws-ap-southeast-1.turso.io";
const tursoAuthToken =
  process.env.TURSO_AUTH_TOKEN ||
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTM5MzMyMjYsImlkIjoiMDFhMWFlYzAtNTUwMS03NTBkLTlkOTYtNGM3YzFmZjc0ODFjIiwia2lkIjoiWjZWMkJRc2c4MEJfVTF5c2VSRUlJX25JMVFFNkw4c1lCSFJVLVN3dFBmcyIsInJpZCI6IjU2NWQ0ZGE1LWEzYjUtNGQ0Zi1iNzQ2LTUyMjMzOWMyMjAzZSJ9.2lpafp81QjUEZyAQS-ballAPzJ12HoOC4yYAXVvwp_VmMbQbhhKXQXC8l5paIt-AlNA25riiskk6T5VdLPVBBQ";

async function run() {
  console.log("🚀 Menghubungkan ke Turso:", tursoUrl);
  const client = createClient({ url: tursoUrl, authToken: tursoAuthToken });

  // 1. Generate SQL diff dari schema.prisma
  console.log("📄 Menghasilkan skema SQL dari prisma/schema.prisma...");
  const rawSql = execSync("npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script", {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf-8",
  });

  // Bersihkan komentar SQL (-- ...) dan pisahkan tiap statement berdasarkan ';'
  const cleanSql = rawSql
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !line.startsWith("--"))
    .join(" ");

  const statements = cleanSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`🔨 Menerapkan ${statements.length} DDL statements ke Turso...`);
  for (const stmt of statements) {
    try {
      await client.execute(stmt);
      console.log(`  ✓ ${stmt.slice(0, 40)}...`);
    } catch (err: any) {
      if (err.message?.includes("already exists")) {
        console.log(`  ℹ ${stmt.slice(0, 40)} (sudah ada)`);
      } else {
        console.warn(`  ⚠️ Gagal: ${err.message}`);
      }
    }
  }

  console.log("✅ Struktur tabel dan indeks berhasil dibuat di Turso!");

  // Pastikan kolom baru yang ditambahkan diupgrade (ALTER TABLE) jika tabel sudah ada sebelumnya
  try {
    const tableInfo = await client.execute("PRAGMA table_info(ElectionSetting)");
    const hasBaSignaturesJson = tableInfo.rows.some((r) => r.name === "baSignaturesJson");
    if (!hasBaSignaturesJson) {
      console.log("  ➕ Menambahkan kolom baru 'baSignaturesJson' ke ElectionSetting...");
      await client.execute("ALTER TABLE ElectionSetting ADD COLUMN baSignaturesJson TEXT");
    }
  } catch (err: any) {
    console.warn("  ℹ Info kolom ElectionSetting:", err.message);
  }

  // 2. Lakukan Seeding data awal menggunakan PrismaClient (dual-mode db.ts)
  console.log("🌱 Menjalankan seeding data awal ke Turso...");
  const seedScript = path.resolve(__dirname, "seed.ts");
  execSync(`npx tsx "${seedScript}"`, {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    env: {
      ...process.env,
      TURSO_DATABASE_URL: tursoUrl,
      TURSO_AUTH_TOKEN: tursoAuthToken,
    },
  });

  console.log("🎉 Sukses! Database Turso sudah memiliki skema dan data awal lengkap.");
}

run().catch((e) => {
  console.error("❌ Gagal:", e);
  process.exit(1);
});
