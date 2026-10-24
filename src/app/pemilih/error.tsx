"use client";

// error.tsx khusus /pemilih — bahasa tenang khusus konteks bilik suara.
// ATURAN: JANGAN pernah menampilkan detail error teknis yang menyebut token/
// pilihan/sesi. Pesan hanya mengonfirmasi draf aman + arah bantuan.
export default function PemilihError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[16px] border-2 border-[#141E19] bg-[#FEF5D6] shadow-[4px_4px_0px_#141E19]">
        <svg viewBox="0 0 24 24" className="h-9 w-9 text-[#8A5200]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 2a10 10 0 1 0 10 10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-[#141E19]">
        Bilik Suara Terkendala Sebentar
      </h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-[#4A5851]">
        Ada gangguan teknis di halaman bilik suara. Tenang — <strong className="text-[#141E19]">tidak ada suara yang
        terkirim sebelum kamu menekan tombol kirim</strong>, dan pilihan yang sudah dibuat tersimpan sebagai draf di
        perangkatmu.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] px-6 py-3.5 text-sm font-extrabold tracking-wide text-white shadow-[4px_4px_0px_#141E19] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#141E19] active:translate-y-0.5 active:shadow-[2px_2px_0px_#141E19]"
        >
          Coba Lagi
        </button>
        <a
          href="/pemilih"
          className="flex items-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-white px-6 py-3 text-sm font-bold shadow-[3px_3px_0px_#141E19] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Kembali ke Gerbang Bilik
        </a>
      </div>
      <p className="mt-6 max-w-md text-xs leading-relaxed text-[#7A8881]">
        Gangguan berulang? Datangi <strong className="text-[#4A5851]">pos bantuan PPUR</strong> — petugas dapat memeriksa
        tokenmu dan mengembalikan hak pilih dengan aman.
      </p>
    </main>
  );
}
