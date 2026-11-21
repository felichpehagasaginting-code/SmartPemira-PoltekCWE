// ============================================================
// CRUD KANDIDAT / PASLON â€” /api/admin/candidates
// Role: KPUM & ITPO (PRD Bab 3).
// Menambah paslon baru serta mengambil daftar kandidat lengkap.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/auth";

export async function GET() {
  const gate = await requireRole(["KPUM", "ITPO"]);
  if ("error" in gate) return gate.error;

  try {
    const candidates = await db.candidate.findMany({
      orderBy: [{ category: "asc" }, { number: "asc" }],
      include: { studyProgram: true },
    });

    return NextResponse.json({
      ok: true,
      candidates: candidates.map((c) => ({
        id: c.id,
        category: c.category,
        studyProgramId: c.studyProgramId,
        studyProgramName: c.studyProgram?.name ?? null,
        number: c.number,
        presidentName: c.presidentName,
        viceName: c.viceName,
        secondViceName: c.secondViceName,
        photoLeaderUrl: c.photoLeaderUrl,
        photoViceUrl: c.photoViceUrl,
        photoSecondViceUrl: c.photoSecondViceUrl,
        vision: c.vision,
        missions: JSON.parse(c.missionJson || "[]") as string[],
        photoAccent: c.photoAccent,
        isEmptyBox: c.isEmptyBox,
      })),
    });
  } catch (error) {
    console.error("Gagal mengambil data kandidat:", error);
    return NextResponse.json({ ok: false, message: "Gagal mengambil data kandidat" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireRole(["KPUM", "ITPO"]);
  if ("error" in gate) return gate.error;
  const session = gate.session;

  try {
    const body = await req.json();
    const {
      category,
      studyProgramId,
      number,
      presidentName,
      viceName,
      secondViceName,
      vision,
      missions,
      photoAccent,
    } = body ?? {};

    const validCategories = ["PRESMA", "DPM", "HIMA"];
    if (!category || !validCategories.includes(category)) {
      return NextResponse.json({ ok: false, message: "Kategori paslon wajib dipilih (PRESMA/DPM/HIMA)." }, { status: 400 });
    }

    if (category === "HIMA" && !studyProgramId) {
      return NextResponse.json({ ok: false, message: "Program studi wajib dipilih untuk paslon HIMA." }, { status: 400 });
    }

    if (!number || typeof number !== "number" || number < 1) {
      return NextResponse.json({ ok: false, message: "Nomor urut harus berupa angka positif." }, { status: 400 });
    }

    if (!presidentName || typeof presidentName !== "string" || presidentName.trim().length < 2) {
      return NextResponse.json({ ok: false, message: "Nama calon ketua/presma wajib diisi minimal 2 karakter." }, { status: 400 });
    }

    if (!vision || typeof vision !== "string" || vision.trim().length < 5) {
      return NextResponse.json({ ok: false, message: "Visi paslon wajib diisi minimal 5 karakter." }, { status: 400 });
    }

    // Default accent colors if not specified
    const defaultAccents: Record<string, string> = {
      PRESMA: "#1B7F4E",
      DPM: "#0F766E",
      HIMA: "#2B50AA",
    };
    const accent = (photoAccent && typeof photoAccent === "string" && photoAccent.startsWith("#"))
      ? photoAccent
      : defaultAccents[category] || "#1B7F4E";

    // Format missions as array
    const missionArray = Array.isArray(missions)
      ? missions.map((m: unknown) => String(m).trim()).filter((m: string) => m.length > 0)
      : typeof missions === "string"
      ? missions.split("\n").map((m) => m.trim()).filter((m) => m.length > 0)
      : [];

    const newCandidate = await db.candidate.create({
      data: {
        category,
        studyProgramId: category === "HIMA" ? studyProgramId : null,
        number,
        presidentName: presidentName.trim(),
        viceName: viceName ? String(viceName).trim() : null,
        secondViceName: category === "DPM" && secondViceName ? String(secondViceName).trim() : null,
        vision: vision.trim(),
        missionJson: JSON.stringify(missionArray),
        photoAccent: accent,
        isEmptyBox: false,
      },
      include: { studyProgram: true },
    });

    await db.auditLog.create({
      data: {
        event: "CANDIDATE_CREATED",
        detail: `Paslon baru #${number} '${newCandidate.presidentName}' (${category}${category === "HIMA" ? ` - ${studyProgramId}` : ""}) ditambahkan oleh ${session.username} (${session.role}).`,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Paslon #${number} '${newCandidate.presidentName}' berhasil didaftarkan.`,
      candidate: {
        ...newCandidate,
        missions: missionArray,
      },
    });
  } catch (error) {
    console.error("Gagal menambahkan kandidat baru:", error);
    return NextResponse.json({ ok: false, message: "Terjadi kesalahan saat menambahkan kandidat." }, { status: 500 });
  }
}
