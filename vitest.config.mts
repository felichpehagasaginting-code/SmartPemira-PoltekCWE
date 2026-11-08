import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // Single process without isolation for deterministic and fast DB test runs
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
