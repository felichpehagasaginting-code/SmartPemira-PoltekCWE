// ============================================================
// TIME JITTER — pemutus relasi temporal (Hukum 1 / FR-06.1)
// Timestamp suara digeser acak ±60 detik agar urutan tersimpan
// di ballot_boxes tidak dapat disandingkan dengan urutan
// check-in di meja PPUR.
// ============================================================

/** Offset acak dalam rentang [-maxOffsetMs, +maxOffsetMs]. */
export function jitteredTimestamp(base: Date = new Date(), maxOffsetMs = 60_000): Date {
  const offset = Math.floor(Math.random() * (2 * maxOffsetMs + 1)) - maxOffsetMs;
  return new Date(base.getTime() + offset);
}
