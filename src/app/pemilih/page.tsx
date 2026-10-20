// /pemilih — Portal Pemilih Online (100% BYOD)
// Pintu suara tunggal Pemira Online: mahasiswa scan QR slip token / ketik manual.
// Halaman publik tanpa sesi operator — auth = kepemilikan token anonim (Hukum 1).
// Suspense dibutuhkan karena komponen memakai useSearchParams (token dari QR).
import { Suspense } from "react";
import { PemilihPortal } from "@/components/pemilih/pemilih-portal";

export const metadata = {
  title: "Portal Pemilih — Smart Pemira Poltek CWE",
  description: "Bilik suara online Pemira Poltek CWE. Masukkan token dari pos bantuan PPUR untuk memilih.",
};

export default function PemilihPage() {
  return (
    <main className="min-h-screen bg-[#F6F4EE]">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8D3C8] border-t-[#1B7F4E]" />
          </div>
        }
      >
        <PemilihPortal />
      </Suspense>
    </main>
  );
}
