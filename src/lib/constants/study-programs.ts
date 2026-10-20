// ============================================================
// PRODI COLOR-CODING & METADATA — Smart Pemira
// Referensi: DESIGN.md Bab 4.2 (Server-Side Filtered Hima colors)
// Keputusan diskusi 2026-10-20: 5 prodi resmi — TPTP mewarisi aksen
// Terracotta dari BKS (domain perkebunan yang sama), BD warna baru.
// ============================================================

export interface ProdiMeta {
  id: string;
  name: string;
  himaName: string;
  colorName: string;
  colorPrimary: string;
  colorTint: string;
}

export const STUDY_PROGRAMS: ProdiMeta[] = [
  {
    id: "TPTP",
    name: "Teknologi Produksi Tanaman Perkebunan",
    himaName: "Hima Teknologi Produksi Tanaman Perkebunan",
    colorName: "Spiced Terracotta",
    colorPrimary: "#D95338",
    colorTint: "#FCECE8",
  },
  {
    id: "TPHP",
    name: "Teknologi Pengolahan Hasil Perkebunan",
    himaName: "Hima Teknologi Pengolahan Hasil Perkebunan",
    colorName: "Golden Ochre",
    colorPrimary: "#D9822B",
    colorTint: "#FDF2E4",
  },
  {
    id: "MANLOG",
    name: "Manajemen Logistik Perkebunan",
    himaName: "Hima Manajemen Logistik Perkebunan",
    colorName: "Royal Cobalt",
    colorPrimary: "#2B50AA",
    colorTint: "#E8EEF9",
  },
  {
    id: "BD",
    name: "Bisnis Digital",
    himaName: "Hima Bisnis Digital",
    colorName: "Deep Teal",
    colorPrimary: "#0F766E",
    colorTint: "#E4F2EF",
  },
  {
    id: "TRPL",
    name: "Teknologi Rekayasa Perangkat Lunak",
    himaName: "Hima Teknologi Rekayasa Perangkat Lunak",
    colorName: "Electric Plum",
    colorPrimary: "#6D28D9",
    colorTint: "#F1E9FD",
  },
];

export function getProdiMeta(id: string): ProdiMeta | undefined {
  return STUDY_PROGRAMS.find((p) => p.id === id);
}
