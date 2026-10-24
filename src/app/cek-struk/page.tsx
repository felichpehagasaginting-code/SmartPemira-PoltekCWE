// /cek-struk — halaman publik mandiri untuk memeriksa struk suara (tanpa login).
// Target QR struk dari bilik suara (?cek=KODE): pemilih memindai QR di layar
// sukses lalu langsung melihat status struknya — tanpa perlu sesi operator.
import Link from "next/link";
import { ReceiptChecker } from "@/components/public-portal/public-verify-tools";

export const metadata = {
  title: "Cek Struk Suara — Smart Pemira Poltek CWE",
  description: "Periksa bahwa struk suaramu tercatat di rantai hash — tanpa membuka isi pilihanmu.",
};

export default function CekStrukPage() {
  return (
    <main className="min-h-screen bg-[#F6F4EE]">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:py-12">
        <header className="mb-6">
          <Link
            href="/pemilih"
            className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#4A5851] underline decoration-dotted underline-offset-4 transition-colors hover:text-[#141E19]"
          >
            ← Kembali ke Bilik Suara
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] shadow-[3px_3px_0px_#141E19]">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 21c4.97 0 9-4.03 9-9V4.5c0-.83-.67-1.5-1.5-1.5H12c-4.97 0-9 4.03-9 9s4.03 9 9 9Z" />
                <path d="m9 11.5 2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-[#141E19]">Cek Struk Suara</h1>
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#7A8881]">Smart Pemira • Poltek CWE</p>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-[#4A5851]">
            Pindai QR pada layar sukses di bilik suara, atau masukkan kode struk 12 karakter secara manual. Sistem hanya
            menunjukkan bahwa strukmu <strong className="text-[#141E19]">tercatat di rantai hash</strong> — isinya tetap
            rahasia (zero-knowledge).
          </p>
        </header>
        <ReceiptChecker />
        <p className="mt-5 text-center text-xs leading-relaxed text-[#7A8881]">
          Struk tidak ditemukan? Datangi pos bantuan PPUR bersama kode strukmu — petugas akan membantu memeriksa.
        </p>
      </div>
    </main>
  );
}
