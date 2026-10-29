// POST /api/kiosk/validate — Validasi token & muat surat suara sesuai prodi (FR-05.2, Hukum 4)
// Server-side assertion: hanya surat suara Hima prodi pemilih yang dikirim ke klien.
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
    const limit = generalLimit(`kioskval:${clientIp(req.headers)}`, 30, 60_000);
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
    if (token.status === "USED") {
      return NextResponse.json({ ok: false, message: "Token telah digunakan dan dihanguskan (single-use)." }, { status: 409 });
    }
    if (token.status !== "ACTIVE" || token.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ ok: false, message: "Token kedaluwarsa. Minta token ulang di meja PPUR." }, { status: 401 });
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
        where: { category: "HIMA", studyProgramId: token.studyProgramId },
        orderBy: { number: "asc" },
      }),
      db.studyProgram.findUnique({ where: { id: token.studyProgramId } }),
      db.tps.findUnique({ where: { id: token.tpsId } }),
    ]);

    const parse = (c: (typeof presma)[number]) => ({
      id: c.id,
      number: c.number,
      presidentName: c.presidentName,
      viceName: c.viceName,
      vision: c.vision,
      missions: JSON.parse(c.missionJson || "[]") as string[],
      isEmptyBox: c.isEmptyBox,
    });

    // Skema Hukum 3: jika hanya 1 paslon real → kandidat tunggal + entitas kotak kosong
    const realHima = himaProdi.filter((c) => !c.isEmptyBox);
    const isEmptyBoxScenario = realHima.length === 1;

    const himaColor = getProdiMeta(token.studyProgramId);

    return NextResponse.json({
      ok: true,
      session: {
        expiresAt: token.expiresAt.toISOString(),
        tpsName: tps?.name ?? "",
        studyProgramId: token.studyProgramId,
        studyProgramName: prodi?.name ?? "",
        himaName: prodi?.facultyName ?? "",
      },
      ballots: [
        {
          category: "PRESMA",
          stepTitle: "Presma & Wapresma",
          institutionLabel: "Tingkat Institusi — Seluruh Mahasiswa",
          color: BALLOT_CATEGORY_COLORS.PRESMA.primary,
          tint: BALLOT_CATEGORY_COLORS.PRESMA.tint,
          singleCandidateScenario: false,
          candidates: presma.map(parse),
        },
        {
          category: "DPM",
          stepTitle: "Pimpinan DPM",
          institutionLabel: "Tingkat Institusi — Legislatif",
          color: BALLOT_CATEGORY_COLORS.DPM.primary,
          tint: BALLOT_CATEGORY_COLORS.DPM.tint,
          singleCandidateScenario: false,
          candidates: dpm.map(parse),
        },
        {
          category: "HIMA",
          stepTitle: `Ketua ${prodi?.facultyName ?? "Hima Prodi"}`,
          institutionLabel: `Tingkat Program Studi — ${prodi?.name ?? ""}`,
          color: himaColor?.colorPrimary ?? "#3F4743",
          tint: himaColor?.colorTint ?? "#ECEAE4",
          singleCandidateScenario: isEmptyBoxScenario,
          candidates: himaProdi.map(parse),
        },
      ],
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Kesalahan internal saat validasi token." }, { status: 500 });
  }
}
