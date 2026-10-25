"use client";

// error.tsx root — boundary error render tak terduga (Rekomendasi #3).
// Pesan generik: tidak pernah menampilkan detail token/suara/stack ke pengguna.
import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log ke console browser untuk diagnosa; tanpa data sensitif dari alur vote
    console.error("[Smart Pemira] Terjadi kesalahan tak terduga:", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[16px] border-2 border-[#141E19] bg-[#FDE8E5] shadow-[4px_4px_0px_#141E19]">
        <svg viewBox="0 0 24 24" className="h-9 w-9 text-[#842029]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
        </svg>
      </div>
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-[#141E19]">
        Terjadi Kesalahan Tak Terduga
      </h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-[#4A5851]">
        Sistem mengalami gangguan sebentar. Coba muat ulang halaman ini. Bila kamu sedang memilih, pilihan yang sudah
        dibuat tersimpan aman sebagai draf di perangkatmu.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] font-bold text-[#7A8881]">Kode gangguan: {error.digest}</p>
      )}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] px-6 py-3.5 text-sm font-extrabold tracking-wide text-white shadow-[4px_4px_0px_#141E19] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#141E19] active:translate-y-0.5 active:shadow-[2px_2px_0px_#141E19]"
        >
          Coba Lagi
        </button>
        <a
          href="/"
          className="flex items-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-white px-6 py-3 text-sm font-bold shadow-[3px_3px_0px_#141E19] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Ke Halaman Depan
        </a>
      </div>
    </main>
  );
}
