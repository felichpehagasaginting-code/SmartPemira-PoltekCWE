import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal Pemilih — Smart Pemira Poltek CWE",
  description:
    "Bilik suara online Pemira Poltek CWE. Masukkan token dari pos bantuan PPUR untuk memilih dengan ketahanan offline.",
};

export default function PemilihLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
