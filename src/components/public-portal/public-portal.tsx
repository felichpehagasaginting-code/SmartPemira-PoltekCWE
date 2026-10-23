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
import { CheckCircle2, CircleSlash, Landmark, Lock, ScrollText, Users, Vote } from "lucide-react";

/** Label peran resmi per kategori — DPM punya struktur 3 peran */
function memberRoles(category: string): { leader: string; vice: string; second?: string } {
  if (category === "DPM") return { leader: "Ketua Umum", vice: "Ketua 1", second: "Ketua 2" };
  if (category === "PRESMA") return { leader: "Presma", vice: "Wakil Presma" };
  return { leader: "Ketua", vice: "Wakil Ketua" };
}

/** Foto anggota kandidat: potret 3:4 + lencana peran + nama */
function MemberPhoto({ name, role, photo, accent }: { name: string; role: string; photo?: string | null; accent: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div
        className="relative w-full overflow-hidden rounded-[10px] border-2 border-[#141E19] shadow-[2px_2px_0px_#141E19]"
        style={{ aspectRatio: "3 / 4", background: accent }}
      >
        {photo ? (
           
          <img src={photo} alt={`Foto ${name} — ${role}`} className="h-full w-full object-cover object-top" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-2xl font-extrabold text-white" aria-hidden>
            {name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-[6px] border border-[#141E19]/50 bg-white/95 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#141E19]">
          {role}
        </span>
      </div>
      <p className="truncate text-[13px] font-bold leading-tight text-[#141E19]" title={name}>
        {name}
      </p>
    </div>
  );
}

function CandidateCard({ c, categoryLabel, accent, tint }: { c: CandidateView; categoryLabel: string; accent: string; tint: string }) {
  const missions = c.missions.slice(0, 3);
  const roles = memberRoles(c.category);
  const members = [
    { role: roles.leader, name: c.presidentName, photo: c.photoLeaderUrl },
    ...(c.viceName ? [{ role: roles.vice, name: c.viceName, photo: c.photoViceUrl }] : []),
    ...(c.secondViceName && roles.second
      ? [{ role: roles.second, name: c.secondViceName, photo: c.photoSecondViceUrl }]
      : []),
  ];
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

      {/* Foto calon pimpinan per peran — DPM: Ketua Umum/Ketua 1/Ketua 2; lainnya: Ketua + Wakil */}
      <div className={`grid gap-3 ${members.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {members.map((m) => (
          <MemberPhoto key={m.role} name={m.name} role={m.role} photo={m.photo} accent={accent} />
        ))}
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
              <span className="text-xs font-semibold uppercase tracking-wide">Rantai Suara Online</span>
            </div>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">{data.chains.length}</p>
            <p className="text-[11px] font-semibold text-[#4A5851]">{data.chains.map((c) => c.id).join(" • ")}</p>
          </div>
        </div>

        {/* CTA pemilih — portal 100% online */}
        <div className="mt-7 flex flex-wrap items-center gap-4 rounded-[12px] border-2 border-[#141E19] bg-[#FEF5D6] p-4 shadow-[4px_4px_0px_#141E19]">
          <div className="flex-1">
            <p className="font-display text-base font-extrabold text-[#141E19]">Sudah terdaftar dan punya token?</p>
            <p className="text-[13px] font-medium text-[#8A5200]">
              Buka Portal Pemilih, scan QR dari slip token pos bantuan PPUR, dan pilih dari HP-mu sendiri. Bisa ganti suara sampai pemungutan ditutup.
            </p>
          </div>
          <a
            href="/pemilih"
            className="tactile-btn flex h-12 items-center gap-2 px-6 text-sm"
          >
            <Vote className="h-4 w-4" /> MASUK BILIK SUARA ONLINE
          </a>
        </div>
      </section>

      {/* ---------- DPM (Surat Suara 1 — urutan resmi DPM → BEM → HIMA) ---------- */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-block h-6 w-2 rounded-full bg-[#0F766E]" aria-hidden />
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Surat Suara 1 — Pimpinan DPM</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {dpm.map((c) => (
            <CandidateCard key={c.id} c={c} categoryLabel="Legislatif — DPM" accent={BALLOT_CATEGORY_COLORS.DPM.primary} tint={BALLOT_CATEGORY_COLORS.DPM.tint} />
          ))}
        </div>
      </section>

      {/* ---------- BEM / PRESMA (Surat Suara 2) ---------- */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-block h-6 w-2 rounded-full bg-[#1B7F4E]" aria-hidden />
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Surat Suara 2 — BEM: Presma &amp; Wapresma</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {presma.map((c) => (
            <CandidateCard key={c.id} c={c} categoryLabel="BEM — Institusi" accent={BALLOT_CATEGORY_COLORS.PRESMA.primary} tint={BALLOT_CATEGORY_COLORS.PRESMA.tint} />
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
                {prodi.colorName ?? prodi.id} • {prodi.name}
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

      {/* ---------- INFO SUARA KOSONG ---------- */}
      <section
        className="rounded-[14px] border-2 border-dashed border-[#3F4743] bg-[#ECEAE4] p-6"
        aria-label="Informasi opsi Suara Kosong"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#141E19] bg-[#3F4743]">
            <CircleSlash className="h-6 w-6 text-white" aria-hidden />
          </span>
          <div>
            <h3 className="font-display text-lg font-extrabold tracking-[-0.01em]">Hak Memilih Suara Kosong</h3>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[#4A5851]">
              Di setiap surat suara — DPM, BEM, maupun HIMA prodimu — selalu tersedia opsi{" "}
              <strong className="text-[#141E19]">SUARA KOSONG</strong> di bagian paling bawah, setelah semua paslon calon.
              Memilihnya berarti kamu tidak mendukung paslon manapun pada pemilihan tersebut, tetapi suaramu{" "}
              <strong className="text-[#141E19]">tetap sah tercatat</strong> dalam rantai hash dan dihitung sebagai suara
              sah pada rekapitulasi resmi Sidang Pleno. Keputusan sepenuhnya milikmu — sistem menjamin pilihan ini
              terhitung tanpa membocorkan identitasmu.
            </p>
          </div>
        </div>
      </section>

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
