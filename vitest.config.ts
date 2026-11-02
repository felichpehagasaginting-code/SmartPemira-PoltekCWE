import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // Proses tunggal tanpa isolasi (vitest 5: poolOptions.singleFork dihapus):
    // setup DB cukup sekali, state modul dibagi antar file, cepat & deterministik.
    pool: "forks",
    isolate: false,
    setupFiles: ["./tests/unit/setup.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: { "@": path.resolve(root, "src") },
  },
});
