// loading.tsx khusus /pemilih — bilik sedang menyiapkan surat suara
export default function PemilihLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F6F4EE]">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#D8D3C8] border-t-[#1B7F4E]" aria-hidden />
      <p className="font-display text-lg font-extrabold text-[#141E19]">Menyiapkan Bilik Suara…</p>
      <p className="max-w-xs text-center text-sm font-medium text-[#4A5851]">
        Memuat surat suara DPM, BEM, dan HIMA untukmu.
      </p>
    </div>
  );
}
