// ============================================================
// RECEIPT CODE — Struk Suara (Rekomendasi #6: End-to-End Verifiability)
// Kode struk = 12 hex pertama dari ballotHash (posisi rantai TPS).
// Tidak mengandung identitas & tidak membocorkan isi suara —
// cukup untuk membuktikan kehadiran sebuah balok di hash chain.
// ============================================================

/** 12 hex pertama → format XXXX-XXXX-XXXX (huruf besar). */
export function formatReceiptCode(ballotHash: string): string {
  const hex = ballotHash.replace(/[^0-9a-fA-F]/g, "").slice(0, 12).toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

/** Normalisasi input pengguna: buang tanda hubung/spasi, huruf besar. */
export function normalizeReceiptCode(input: string): string {
  return input.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
}
