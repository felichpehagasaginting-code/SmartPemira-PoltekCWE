// ============================================================
// KONSTANTA ELEKSI — Smart Pemira Poltek CWE
// Referensi: DESIGN.md Bab 4 (Multi-Ballot Color Coding), PRD.md Bab 7
// ============================================================

export type ElectionCategory = "PRESMA" | "DPM" | "HIMA";

export const CATEGORY_LABEL: Record<ElectionCategory, string> = {
  PRESMA: "BEM — Presma & Wapresma",
  DPM: "Pimpinan DPM",
  HIMA: "Ketua Hima Prodi",
};

export const CATEGORY_SHORT: Record<ElectionCategory, string> = {
  PRESMA: "PRESMA",
  DPM: "DPM",
  HIMA: "HIMA",
};

/** Identitas warna surat suara tingkat institusi (DESIGN.md 4.1) */
export const BALLOT_CATEGORY_COLORS = {
  PRESMA: {
    name: "Tropic Green",
    primary: "#1B7F4E",
    tint: "#E6F4EC",
    textOnBadge: "#FFFFFF",
  },
  DPM: {
    name: "Tropic Jade",
    primary: "#0F766E",
    tint: "#E2F3F1",
    textOnBadge: "#FFFFFF",
  },
} as const;

/** Warna Kotak Kosong (Pasal 9 ayat 3 UUD IKM) */
export const EMPTY_BOX_COLOR = {
  name: "Neutral Slate Ink",
  primary: "#3F4743",
  tint: "#ECEAE4",
} as const;

/** TTL Token Bilik Suara (FR-04.3) */
export const TOKEN_TTL_MINUTES = 10;

/** Ambang batas kemenangan calon tunggal (UUD IKM Pasal 9 ayat 3) */
export const SINGLE_CANDIDATE_THRESHOLD = 50;

/** Alfabet token tanpa karakter ambigu 0/O/1/I (PROMPT.md Bab 4) */
export const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const TOKEN_LENGTH = 6;

export const APP_CONSTANTS = {
  institute: "Ikatan Keluarga Mahasiswa Poltek CWE",
  appName: "Smart Pemira",
  legalBasis: "Ketetapan DPM No. 005/DPM-CWE/KEP/VII/2024",
};
