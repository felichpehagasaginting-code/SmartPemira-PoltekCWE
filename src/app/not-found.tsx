import Link from "next/link";

// not-found.tsx — 404 kustom yang ramah & tetap dalam bahasa sistem
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[16px] border-2 border-[#141E19] bg-[#E2F3F1] shadow-[4px_4px_0px_#141E19]">
        <svg viewBox="0 0 24 24" className="h-9 w-9 text-[#0F766E]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
          <path d="M8.5 11h5" />
        </svg>
      </div>
      <p className="font-mono text-sm font-extrabold tracking-[0.2em] text-[#0F766E]">404 — TIDAK DITEMUKAN</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.03em] text-[#141E19]">
        Halaman Ini Tidak Ada
      </h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-[#4A5851]">
        Alamat yang kamu buka salah ketik atau sudah dipindahkan. Berikut pintu yang benar:
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/pemilih"
          className="flex items-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] px-6 py-3.5 text-sm font-extrabold tracking-wide text-white shadow-[4px_4px_0px_#141E19] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#141E19] active:translate-y-0.5 active:shadow-[2px_2px_0px_#141E19]"
        >
          Bilik Suara (Pemilih)
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-white px-6 py-3 text-sm font-bold shadow-[3px_3px_0px_#141E19] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Gerbang Sistem (Petugas)
        </Link>
      </div>
    </main>
  );
}
