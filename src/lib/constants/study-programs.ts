// ============================================================
// PRODI COLOR-CODING & METADATA — Smart Pemira
// Referensi: DESIGN.md Bab 4.2 (Server-Side Filtered Hima colors)
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
    id: "BKS",
    name: "Budidaya Perkebunan Kelapa Sawit",
    himaName: "Hima Budidaya Perkebunan Kelapa Sawit",
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
    id: "LOGISTIK",
    name: "Manajemen Logistik Perkebunan",
    himaName: "Hima Manajemen Logistik Perkebunan",
    colorName: "Royal Cobalt",
    colorPrimary: "#2B50AA",
    colorTint: "#E8EEF9",
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
