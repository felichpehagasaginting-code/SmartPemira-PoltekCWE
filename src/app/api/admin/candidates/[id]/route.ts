// ============================================================
// DETAIL, UPDATE & DELETE KANDIDAT â€” /api/admin/candidates/[id]
// Role: KPUM & ITPO (PRD Bab 3).
// Mendukung update data profil kandidat dan penghapusan aman.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireRole(["KPUM", "ITPO"]);
  if ("error" in gate) return gate.error;

  try {
    const { id } = await params;
    const candidate = await db.candidate.findUnique({
      where: { id },
      include: { studyProgram: true },
    });

    if (!candidate) {
      return NextResponse.json({ ok: false, message: "Kandidat tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      candidate: {
        id: candidate.id,
        category: candidate.category,
        studyProgramId: candidate.studyProgramId,
        studyProgramName: candidate.studyProgram?.name ?? null,
        number: candidate.number,
        presidentName: candidate.presidentName,
        viceName: candidate.viceName,
        secondViceName: candidate.secondViceName,
        photoLeaderUrl: candidate.photoLeaderUrl,
        photoViceUrl: candidate.photoViceUrl,
        photoSecondViceUrl: candidate.photoSecondViceUrl,
        vision: candidate.vision,
        missions: JSON.parse(candidate.missionJson || "[]") as string[],
        photoAccent: candidate.photoAccent,
        isEmptyBox: candidate.isEmptyBox,
      },
    });
  } catch (error) {
    console.error("Gagal mengambil detail kandidat:", error);
    return NextResponse.json({ ok: false, message: "Gagal memuat detail kandidat." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireRole(["KPUM", "ITPO"]);
  if ("error" in gate) return gate.error;
  const session = gate.session;

  try {
    const { id } = await params;
    const existing = await db.candidate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Kandidat tidak ditemukan." }, { status: 404 });
    }

    if (existing.isEmptyBox) {
      return NextResponse.json({ ok: false, message: "Entitas Kotak/Suara Kosong sistem tidak dapat diubah." }, { status: 400 });
    }

    const body = await req.json();
    const {
      number,
      presidentName,
      viceName,
      secondViceName,
      vision,
      missions,
      photoAccent,
      studyProgramId,
    } = body ?? {};

    const updateData: Record<string, unknown> = {};

    if (typeof number === "number" && number > 0) {
      updateData.number = number;
    }

    if (typeof presidentName === "string" && presidentName.trim().length >= 2) {
      updateData.presidentName = presidentName.trim();
    }

    if (typeof viceName !== "undefined") {
      updateData.viceName = viceName ? String(viceName).trim() : null;
    }

    if (typeof secondViceName !== "undefined" && existing.category === "DPM") {
      updateData.secondViceName = secondViceName ? String(secondViceName).trim() : null;
    }

    if (typeof vision === "string" && vision.trim().length >= 5) {
      updateData.vision = vision.trim();
    }

    if (missions) {
      const missionArray = Array.isArray(missions)
        ? missions.map((m: unknown) => String(m).trim()).filter((m: string) => m.length > 0)
        : typeof missions === "string"
        ? missions.split("\n").map((m) => m.trim()).filter((m) => m.length > 0)
        : [];
      updateData.missionJson = JSON.stringify(missionArray);
    }

    if (photoAccent && typeof photoAccent === "string" && photoAccent.startsWith("#")) {
      updateData.photoAccent = photoAccent;
    }

    if (existing.category === "HIMA" && typeof studyProgramId === "string") {
      updateData.studyProgramId = studyProgramId;
    }

    const updated = await db.candidate.update({
      where: { id },
      data: updateData,
      include: { studyProgram: true },
    });

    await db.auditLog.create({
      data: {
        event: "CANDIDATE_UPDATED",
        detail: `Profil paslon #${updated.number} '${updated.presidentName}' (${updated.category}) diperbarui oleh ${session.username} (${session.role}).`,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Profil paslon #${updated.number} '${updated.presidentName}' berhasil diperbarui.`,
      candidate: {
        ...updated,
        missions: JSON.parse(updated.missionJson || "[]"),
      },
    });
  } catch (error) {
    console.error("Gagal memperbarui profil kandidat:", error);
    return NextResponse.json({ ok: false, message: "Terjadi kesalahan saat memperbarui kandidat." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireRole(["KPUM", "ITPO"]);
  if ("error" in gate) return gate.error;
  const session = gate.session;

  try {
    const { id } = await params;
    const candidate = await db.candidate.findUnique({
      where: { id },
      include: { ballots: { select: { id: true }, take: 1 } },
    });

    if (!candidate) {
      return NextResponse.json({ ok: false, message: "Kandidat tidak ditemukan." }, { status: 404 });
    }

    if (candidate.isEmptyBox) {
      return NextResponse.json({ ok: false, message: "Entitas Kotak/Suara Kosong sistem tidak dapat dihapus." }, { status: 400 });
    }

    // Hukum Integritas Rantai Audit: Tidak boleh menghapus paslon yang sudah memiliki surat suara sah
    const ballotCount = await db.ballotBox.count({ where: { candidateId: id } });
    if (ballotCount > 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "BALLOT_EXISTS",
          message: `Tidak dapat menghapus paslon ini karena telah terdapat ${ballotCount} surat suara sah yang tercatat di rantai hash. Melanggar integritas audit pemilu.`,
        },
        { status: 400 }
      );
    }

    // 1. Hapus BLOB foto terkait di CandidatePhoto
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).candidatePhoto.deleteMany({
      where: { candidateId: id },
    });

    // 2. Hapus kandidat
    await db.candidate.delete({
      where: { id },
    });

    // 3. Catat jejak audit
    await db.auditLog.create({
      data: {
        event: "CANDIDATE_DELETED",
        detail: `Paslon #${candidate.number} '${candidate.presidentName}' (${candidate.category}) dihapus dari daftar oleh ${session.username} (${session.role}).`,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Paslon #${candidate.number} '${candidate.presidentName}' berhasil dihapus.`,
    });
  } catch (error) {
    console.error("Gagal menghapus kandidat:", error);
    return NextResponse.json({ ok: false, message: "Gagal menghapus kandidat." }, { status: 500 });
  }
}
