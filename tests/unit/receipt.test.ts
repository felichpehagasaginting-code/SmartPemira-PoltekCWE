// ============================================================
// INVARIANT 2 — STRUK SUARA: deterministik, tak membawa identitas/isi suara.
// ============================================================
import { describe, it, expect } from "vitest";
import { formatReceiptCode, normalizeReceiptCode } from "@/lib/crypto/receipt";

const HASH_A = "7a3f9c2b01de5f6a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a";
const HASH_B = "deadbeefcafe5f6a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a";

describe("Invariant: struk suara", () => {
  it("deterministik — hash sama selalu menghasilkan struk sama", () => {
    expect(formatReceiptCode(HASH_A)).toBe(formatReceiptCode(HASH_A));
  });

  it("format XXXX-XXXX-XXXX (12 hex)", () => {
    expect(formatReceiptCode(HASH_A)).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(formatReceiptCode(HASH_A)).toBe("7A3F-9C2B-01DE");
  });

  it("posisi rantai berbeda → struk berbeda (dua pemilih tak berbagi struk)", () => {
    expect(formatReceiptCode(HASH_A)).not.toBe(formatReceiptCode(HASH_B));
  });

  it("tidak membocorkan isi: hanya 12 karakter hex pertama", () => {
    const code = formatReceiptCode(HASH_A);
    expect(code.replace(/-/g, "")).toHaveLength(12);
    expect(HASH_A.slice(12)).not.toBe(""); // sisanya memang tidak diekspor
    expect(code).not.toContain(HASH_A.slice(12));
  });

  it("normalisasi input publik: strip tanda baca & spasi, huruf besar", () => {
    expect(normalizeReceiptCode("7a3f-9c2b-01de")).toBe("7A3F9C2B01DE");
    expect(normalizeReceiptCode(" 7A3F 9C2B 01DE ")).toBe("7A3F9C2B01DE");
  });
});
