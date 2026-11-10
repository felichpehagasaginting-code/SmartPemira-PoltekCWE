// ============================================================
// PRISMA STUDIO RUNNER (Turso Cloud Synchronizer)
// Menjawab pertanyaan: "Kalo udah di-deploy, gimana cara buka Prisma Studio?"
//
// Alur Kerja:
// 1. Secara otomatis menyinkronkan data terbaru dari Turso Cloud ke SQLite lokal (db/custom.db).
// 2. Menjalankan Prisma Studio di port 5555 dengan data produksi yang identik.
//
// Penggunaan:
//   npm run studio
//   npm run studio:offline (tanpa download ulang dari Turso)
// ============================================================
import { spawn } from "child_process";
import path from "path";
import { runBackup } from "./backup-turso";

async function main() {
  const isOffline = process.argv.includes("--offline");

  console.log("============================================================");
  console.log("  SMART PEMIRA POLTEK CWE — PRISMA STUDIO RUNNER");
  console.log("============================================================");

  if (!isOffline) {
    console.log("📥 Mengunduh snapshot data terbaru dari Turso Cloud...");
    try {
      const res = await runBackup({ syncLocal: true });
      if (res.success) {
        console.log("✅ Data Turso berhasil disinkronkan ke db/custom.db!");
      }
    } catch (err: any) {
      console.warn("⚠️ Gagal menyinkronkan dari Turso (mungkin offline):", err?.message);
      console.log("ℹ️ Melanjutkan membuka database lokal yang ada di db/custom.db...");
    }
  } else {
    console.log("ℹ️ Mode offline: Membuka db/custom.db lokal yang sudah ada.");
  }

  console.log("\n🚀 Membuka Prisma Studio di http://localhost:5555 ...");
  console.log("Tekan Ctrl + C untuk keluar kapan saja.\n");

  const isWindows = process.platform === "win32";
  const cmd = isWindows ? "npx.cmd" : "npx";

  const child = spawn(cmd, ["prisma", "studio", "--port", "5555"], {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error("Gagal menjalankan Studio:", err);
  process.exit(1);
});
