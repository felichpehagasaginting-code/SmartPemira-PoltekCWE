// /offline — halaman fallback service worker saat jaringan putus (Rekomendasi #2/#3)
// Statis total: tanpa fetch, tanpa data — aman disajikan dari cache SW.

export const metadata = {
  title: "Offline — Smart Pemira Poltek CWE",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[16px] border-2 border-[#141E19] bg-[#FEF5D6] shadow-[4px_4px_0px_#141E19]">
        <svg viewBox="0 0 24 24" className="h-9 w-9 text-[#8A5200]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 2a10 10 0 1 0 10 10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-[#141E19]">Koneksi Terputus</h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-[#4A5851]">
        Halaman ini tidak bisa dimuat karena jaringan sedang tidak tersedia. Coba periksa sinyal Wi-Fi atau data
        selulermu, lalu muat ulang halaman.
      </p>
      <div className="mt-5 w-full max-w-md rounded-[12px] border-2 border-dashed border-[#3F4743] bg-[#ECEAE4] px-4 py-3 text-left">
        <p className="text-[13px] font-bold leading-relaxed text-[#141E19]">
          Sedang berada di tengah memilih? Tenang.
        </p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[12.5px] leading-relaxed text-[#4A5851]">
          <li>Pilihan yang sudah kamu buat tersimpan aman sebagai draf di perangkatmu.</li>
          <li>Begitu koneksi pulih dan kamu masuk lagi dengan token yang sama, draf dipulihkan otomatis.</li>
          <li>Bila token bermasalah, datangi pos bantuan PPUR untuk bantuan.</li>
        </ul>
      </div>
      <a
        href="/pemilih"
        className="mt-7 flex items-center gap-2 rounded-[10px] border-2 border-[#141E19] bg-[#1B7F4E] px-6 py-3.5 text-sm font-extrabold tracking-wide text-white shadow-[4px_4px_0px_#141E19] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#141E19] active:translate-y-0.5 active:shadow-[2px_2px_0px_#141E19]"
      >
        Coba Muat Ulang Bilik Suara
      </a>
      <p className="mt-4 text-xs font-semibold text-[#7A8881]">Smart Pemira — Poltek CWE • Pemungutan Suara Online</p>
    </main>
  );
}
