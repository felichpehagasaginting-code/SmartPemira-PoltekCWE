// POST /api/pemilih/validate — Validasi token Portal Pemilih (100% Online BYOD)
// & muat surat suara sesuai prodi (FR-05.2, Hukum 4). Urutan pemungutan resmi:
// Surat Suara 1 = DPM → Surat Suara 2 = BEM (Presma) → Surat Suara 3 = HIMA Prodi.
// Re-vote model Estonia: token USED masih bisa membuka bilik ulang (suara terakhir menang)
// selama pemungutan terbuka dan token belum dikunci/dicabut.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto/token-generator";
import { expireStaleTokens } from "@/lib/db/ballot-service";
import { BALLOT_CATEGORY_COLORS } from "@/lib/constants/election";
import { getProdiMeta } from "@/lib/constants/study-programs";
import { clientIp, generalLimit } from "@/lib/server/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Anti-brute force: maks 30 validasi token/menit per IP (Rekomendasi #1)
    const limit = generalLimit(`pemilihval:${clientIp(req.headers)}`, 30, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, message: `Terlalu banyak percobaan token. Coba lagi dalam ${Math.ceil(limit.retryAfterSec)} detik.` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await req.json();
    const rawToken = String(body?.token ?? "").trim().toUpperCase();
    if (rawToken.length !== 6) {
      return NextResponse.json({ ok: false, message: "Token harus 6 karakter." }, { status: 400 });
    }

    const setting = await db.electionSetting.findUnique({ where: { id: "main" } });
    if (setting?.emergencyFreeze) {
      return NextResponse.json(
        { ok: false, message: "EMERGENCY FREEZE aktif. Bilik suara ditutup sementara oleh Panwaslu/KPUM." },
        { status: 423 }
      );
    }
    if (!setting?.votingOpen) {
      return NextResponse.json(
        { ok: false, message: "Pemungutan suara telah ditutup oleh KPUM." },
        { status: 423 }
      );
    }

    await expireStaleTokens();
    const tokenHash = hashToken(rawToken);
    const token = await db.votingToken.findUnique({ where: { tokenHash } });

    if (!token) {
      return NextResponse.json({ ok: false, message: "Token tidak dikenali. Periksa kembali atau hubungi petugas PPUR." }, { status: 401 });
    }
    if (token.status === "REVOKED") {
      return NextResponse.json({ ok: false, message: "Token telah dicabut petugas PPUR. Seluruh suara token ini dibatalkan." }, { status: 403 });
    }
    if (token.lockedAt) {
      return NextResponse.json({ ok: false, message: "Suara sudah DIKUNCI (final) — pilihanmu tersimpan dan tidak dapat diganti lagi." }, { status: 403 });
    }

    // Re-vote (Estonia): token USED = sudah pernah memilih, bilik dibuka ulang
    const isRevote = token.status === "USED";
    if (!isRevote) {
      // Vote PERTAMA wajib ACTIVE dalam TTL
      if (token.status !== "ACTIVE" || token.expiresAt.getTime() < Date.now()) {
        return NextResponse.json({ ok: false, message: "Token kedaluwarsa. Minta token ulang di pos bantuan PPUR." }, { status: 401 });
      }
    }

    // ---------- Muat surat suara (Hukum 4: filter server-side) ----------
    const [presma, dpm, himaProdi, prodi, tps] = await Promise.all([
      db.candidate.findMany({
        where: { category: "PRESMA", isEmptyBox: false },
        orderBy: { number: "asc" },
      }),
      db.candidate.findMany({
        where: { category: "DPM", isEmptyBox: false },
        orderBy: { number: "asc" },
      }),
      db.candidate.findMany({
        where: { category: "HIMA", studyProgramId: token.studyProgramId, isEmptyBox: false },
        orderBy: { number: "asc" },
      }),
      db.studyProgram.findUnique({ where: { id: token.studyProgramId } }),
      db.tps.findUnique({ where: { id: token.tpsId } }),
    ]);

    const parse = (c: (typeof presma)[number]) => ({
      id: c.id,
      category: c.category,
      number: c.number,
      presidentName: c.presidentName,
      viceName: c.viceName,
      secondViceName: c.secondViceName,
      photoLeaderUrl: c.photoLeaderUrl,
      photoViceUrl: c.photoViceUrl,
      photoSecondViceUrl: c.photoSecondViceUrl,
      vision: c.vision,
      missions: JSON.parse(c.missionJson || "[]") as string[],
      isEmptyBox: c.isEmptyBox,
    });

    // SUARA KOSONG tidak lagi entitas kandidat — opsi ini selalu disediakan
    // sistem sebagai kartu TERAKHIR di setiap surat suara (keputusan 2026-10-23).

    const himaColor = getProdiMeta(token.studyProgramId);

    return NextResponse.json({
      ok: true,
      isRevote,
      voteVersion: token.revoteCount + (isRevote ? 2 : 1),
      session: {
        // Vote pertama: TTL berjalan. Re-vote: tanpa TTL (sampai pemungutan ditutup)
        expiresAt: isRevote ? null : token.expiresAt.toISOString(),
        chainName: tps?.name ?? "",
        studyProgramId: token.studyProgramId,
        studyProgramName: prodi?.name ?? "",
        himaName: prodi?.facultyName ?? "",
      },
      // Urutan resmi: DPM → BEM → HIMA (keputusan diskusi 2026-10-20)
      ballots: [
        {
          category: "DPM",
          stepTitle: "Pimpinan DPM",
          institutionLabel: "Surat Suara 1 — Tingkat Institusi (Legislatif)",
          color: BALLOT_CATEGORY_COLORS.DPM.primary,
          tint: BALLOT_CATEGORY_COLORS.DPM.tint,
          candidates: dpm.map(parse),
        },
        {
          category: "PRESMA",
          stepTitle: "BEM — Presma & Wapresma",
          institutionLabel: "Surat Suara 2 — Tingkat Institusi (Eksekutif)",
          color: BALLOT_CATEGORY_COLORS.PRESMA.primary,
          tint: BALLOT_CATEGORY_COLORS.PRESMA.tint,
          candidates: presma.map(parse),
        },
        {
          category: "HIMA",
          stepTitle: `Ketua ${prodi?.facultyName ?? "Hima Prodi"}`,
          institutionLabel: `Surat Suara 3 — Tingkat Program Studi: ${prodi?.name ?? ""}`,
          color: himaColor?.colorPrimary ?? "#3F4743",
          tint: himaColor?.colorTint ?? "#ECEAE4",
          candidates: himaProdi.map(parse),
        },
      ],
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Kesalahan internal saat validasi token." }, { status: 500 });
  }
}
