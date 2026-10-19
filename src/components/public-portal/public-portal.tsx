"use client";

// ============================================================
// PORTAL PUBLIK — Kampanye & Informasi Calon (Warm Light, Tactile)
// DESIGN.md 8: portal publik memakai Tactile Neo-Brutalism di atas
// kanvas Warm Oat Milk; tanpa angka suara (Hukum 5).
// ============================================================
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePolling } from "@/hooks/use-polling";
import { BALLOT_CATEGORY_COLORS } from "@/lib/constants/election";
import { getProdiMeta } from "@/lib/constants/study-programs";
import type { CandidateView, PortalResponse } from "@/lib/types";
import { BeritaAcaraVerifier, ReceiptChecker } from "@/components/public-portal/public-verify-tools";
import { CheckCircle2, Landmark, Lock, ScrollText, Users, Vote } from "lucide-react";

function InitialAvatar({ name, accent, size = 64 }: { name: string; accent: string; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className="flex items-center justify-center rounded-[10px] border-2 border-[#141E19] font-display font-extrabold text-white select-none"
      style={{ width: size, height: size, background: accent, fontSize: size * 0.38 }}
      aria-label={`Foto resmi ${name}`}
    >
      {initials}
    </div>
  );
}

function CandidateCard({ c, categoryLabel, accent, tint }: { c: CandidateView; categoryLabel: string; accent: string; tint: string }) {
  const missions = c.missions.slice(0, 3);
  return (
    <article className="tactile-card tactile-card-interactive p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <span
          className="inline-flex items-center rounded-full border-2 border-[#141E19] px-3 py-1 font-display text-xl font-extrabold text-white"
          style={{ background: accent }}
          aria-label={`Nomor urut ${c.number}`}
        >
          {String(c.number).padStart(2, "0")}
        </span>
        <span
          className="rounded-full border border-[#141E19]/20 px-2.5 py-1 text-[11px] font-semibold tracking-wide"
          style={{ background: tint, color: "#141E19" }}
        >
          {categoryLabel}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <InitialAvatar name={c.presidentName} accent={accent} />
        <div>
          <h3 className="font-display text-lg font-bold leading-snug">{c.presidentName}</h3>
          {c.viceName && <p className="text-sm text-[#4A5851] font-medium">& {c.viceName}</p>}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A8881] mb-1">Visi</p>
        <p className="text-sm leading-relaxed text-[#141E19]">{c.vision}</p>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A8881] mb-1.5">Misi Unggulan</p>
        <ul className="space-y-1.5">
          {missions.map((m, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-snug text-[#4A5851]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
              {m}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function PublicPortal() {
  const { data, loading } = usePolling<PortalResponse>("/api/public/portal", 10000);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-[14px]" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-72 w-full rounded-[14px]" />
          <Skeleton className="h-72 w-full rounded-[14px]" />
          <Skeleton className="h-72 w-full rounded-[14px]" />
        </div>
      </div>
    );
  }
  if (!data) return <p className="text-sm text-[#4A5851]">Portal gagal dimuat.</p>;

  const presma = data.candidates.filter((c) => c.category === "PRESMA");
  const dpm = data.candidates.filter((c) => c.category === "DPM");
  const himaByProdi = data.prodis
    .map((p) => ({ prodi: p, list: data.candidates.filter((c) => c.category === "HIMA" && c.studyProgramId === p.id) }))
    .filter((g) => g.list.length > 0);

  const turnout = Math.round(data.stats.turnoutPct * 10) / 10;

  return (
    <div className="space-y-10">
      {/* ---------- HERO ---------- */}
      <section className="tactile-card relative overflow-hidden p-8 md:p-10">
        <div
          className="absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #1B7F4E 0%, transparent 70%)" }}
          aria-hidden
        />
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge className="border-2 border-[#141E19] bg-[#F2B705] text-[#141E19] font-semibold hover:bg-[#F2B705]">
            <ScrollText className="mr-1 h-3.5 w-3.5" /> {data.legalBasis}
          </Badge>
          <Badge
            className={`border-2 border-[#141E19] font-semibold ${
              data.emergencyFreeze
                ? "bg-[#FDE8E5] text-[#842029]"
                : data.votingOpen
                  ? "bg-[#DCFCE7] text-[#0F5132]"
                  : "bg-[#EAE6DF] text-[#4A5851]"
            }`}
          >
            <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${data.votingOpen && !data.emergencyFreeze ? "live-dot bg-[#1B7F4E]" : "bg-[#7A8881]"}`} />
            {data.emergencyFreeze ? "EMERGENCY FREEZE" : data.votingOpen ? "PEMUNGUTAN SUARA AKTIF" : "PEMUNGUTAN DITUTUP"}
          </Badge>
        </div>

        <h1 className="font-display text-4xl md:text-5xl font-extrabold leading-[1.05] tracking-[-0.03em] max-w-3xl">
          Pemilihan Umum Raya Mahasiswa <span className="text-[#1B7F4E]">Poltek CWE</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base md:text-lg leading-relaxed text-[#4A5851]">
          Kenali calon pimpinan eksekutif dan legislatif Ikatan Keluarga Mahasiswa. Sistem e-voting
          <strong className="text-[#141E19]"> Smart Pemira</strong> menjamin kerahasiaan suara Anda melalui
          arsitektur <em>Zero-Knowledge Ballot</em> — identitas dan pilihan dipisahkan mutlak.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#D8D3C8] bg-[#FFFFFF] p-4">
            <div className="flex items-center gap-2 text-[#1B7F4E]">
              <Users className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Total DPT</span>
            </div>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">{data.stats.dptTotal}</p>
          </div>
          <div className="rounded-xl border border-[#D8D3C8] bg-[#FFFFFF] p-4">
            <div className="flex items-center gap-2 text-[#1B7F4E]">
              <Vote className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Partisipasi</span>
            </div>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">{turnout}%</p>
          </div>
          <div className="rounded-xl border border-[#D8D3C8] bg-[#FFFFFF] p-4">
            <div className="flex items-center gap-2 text-[#1B7F4E]">
              <Landmark className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Lokasi TPS</span>
            </div>
            <p className="mt-1.5 text-sm font-semibold leading-snug">{data.tps?.location ?? "-"}</p>
          </div>
        </div>
      </section>

      {/* ---------- PRESMA ---------- */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-block h-6 w-2 rounded-full bg-[#1B7F4E]" aria-hidden />
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Surat Suara 1 — Presma &amp; Wapresma</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {presma.map((c) => (
            <CandidateCard key={c.id} c={c} categoryLabel="BEM — Institusi" accent={BALLOT_CATEGORY_COLORS.PRESMA.primary} tint={BALLOT_CATEGORY_COLORS.PRESMA.tint} />
          ))}
        </div>
      </section>

      {/* ---------- DPM ---------- */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-block h-6 w-2 rounded-full bg-[#0F766E]" aria-hidden />
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Surat Suara 2 — Pimpinan DPM</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {dpm.map((c) => (
            <CandidateCard key={c.id} c={c} categoryLabel="Legislatif — DPM" accent={BALLOT_CATEGORY_COLORS.DPM.primary} tint={BALLOT_CATEGORY_COLORS.DPM.tint} />
          ))}
        </div>
      </section>

      {/* ---------- HIMA per prodi ---------- */}
      {himaByProdi.map(({ prodi, list }) => (
        <section key={prodi.id}>
          <div className="mb-4 flex items-center gap-3">
            <span className="inline-block h-6 w-2 rounded-full" style={{ background: prodi.colorPrimary }} aria-hidden />
            <div>
              <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Surat Suara 3 — {prodi.facultyName}</h2>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: prodi.colorPrimary }}>
                {prodi.colorName} • {prodi.name}
              </p>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <CandidateCard key={c.id} c={c} categoryLabel={prodi.id} accent={prodi.colorPrimary} tint={prodi.colorTint} />
            ))}
          </div>
        </section>
      ))}

      {/* ---------- ALAT VERIFIKASI PUBLIK (Rekomendasi #6 & #9) ---------- */}
      <section className="grid gap-5 xl:grid-cols-2">
        <ReceiptChecker />
        <BeritaAcaraVerifier plenoUnlocked={data.plenoUnlocked} />
      </section>

      {/* ---------- Status hasil ---------- */}
      <section className="tactile-card p-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border-2 border-[#141E19] bg-[#FEF5D6]">
          <Lock className="h-5 w-5 text-[#8A5200]" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold">Kotak Suara Digital — Status</h3>
          <p className="mt-1 text-sm leading-relaxed text-[#4A5851] max-w-3xl">
            {data.plenoUnlocked
              ? "Sidang Pleno telah dibuka. Hasil rekapitulasi resmi dapat dilihat pada Monitor Panwaslu dan akan dipublikasikan setelah pengesahan Berita Acara."
              : "Sesuai Hukum 5 (Pleno Vault Lock), perolehan suara terkunci secara kriptografis selama pemungutan berlangsung. Hasil baru dibuka serentak pada Sidang Pleno oleh Ketua KPUM, disaksikan Panwaslu dan Saksi."}
          </p>
        </div>
      </section>
    </div>
  );
}
