// loading.tsx root — skeleton ringan saat RSC memuat
export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F6F4EE]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8D3C8] border-t-[#1B7F4E]" aria-hidden />
      <p className="text-sm font-bold text-[#4A5851]">Memuat Smart Pemira…</p>
    </div>
  );
}
