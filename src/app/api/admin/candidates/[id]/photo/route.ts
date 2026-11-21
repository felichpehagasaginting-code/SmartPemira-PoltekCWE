// ============================================================
// UPLOAD & HAPUS FOTO PASLON (BLOB) â€” /api/admin/candidates/[id]/photo
// Role: KPUM & ITPO (PRD Bab 3).
// Mendukung penyimpanan BLOB langsung di Turso LibSQL Cloud
// serta Vercel Blob CDN jika token cloud tersedia.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireRole(["KPUM", "ITPO"]);
  if ("error" in gate) return gate.error;
  const session = gate.session;

  try {
    const { id } = await params;
    const candidate = await db.candidate.findUnique({ where: { id } });
    if (!candidate) {
      return NextResponse.json({ ok: false, message: "Kandidat tidak ditemukan." }, { status: 404 });
    }

    const formData = await req.formData();
    const role = formData.get("role") as string;
    const file = formData.get("file") as File | null;

    const validRoles = ["leader", "vice", "secondVice"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { ok: false, message: "Peran tidak valid (harus leader, vice, atau secondVice)." },
        { status: 400 }
      );
    }

    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, message: "File gambar tidak ditemukan." }, { status: 400 });
    }

    // Validasi ukuran: maksimal 5 MB
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, message: "Ukuran file terlalu besar (maksimal 5 MB)." },
        { status: 400 }
      );
    }

    // Validasi tipe file
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    const mimeType = file.type || "image/webp";
    if (!allowedMimes.includes(mimeType) && !mimeType.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, message: "Format berkas tidak didukung. Harap unggah berkas gambar (JPG, PNG, WebP)." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Simpan ke database Turso sebagai BLOB di tabel CandidatePhoto
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).candidatePhoto.upsert({
      where: {
        candidateId_role: { candidateId: id, role },
      },
      update: {
        data: buffer,
        mimeType,
        updatedAt: new Date(),
      },
      create: {
        candidateId: id,
        role,
        data: buffer,
        mimeType,
      },
    });

    // 2. Tentukan URL foto baru (endpoint streaming ter-cache dengan timestamp query)
    const timestamp = Date.now();
    const photoUrl = `/api/candidates/${id}/photo/${role}?t=${timestamp}`;

    // 3. Update URL pada kolom kandidat yang bersangkutan
    const updatePayload: Record<string, string | null> = {};
    if (role === "leader") updatePayload.photoLeaderUrl = photoUrl;
    else if (role === "vice") updatePayload.photoViceUrl = photoUrl;
    else if (role === "secondVice") updatePayload.photoSecondViceUrl = photoUrl;

    const updatedCandidate = await db.candidate.update({
      where: { id },
      data: updatePayload,
    });

    // 4. Catat jejak audit (AuditLog)
    const roleLabel =
      role === "leader"
        ? candidate.presidentName
        : role === "vice"
        ? candidate.viceName || "Wakil"
        : candidate.secondViceName || "Ketua 2";

    await db.auditLog.create({
      data: {
        event: "CANDIDATE_PHOTO_UPDATED",
        detail: `Foto peran '${role}' (${roleLabel}) untuk paslon #${candidate.number} (${candidate.category}) berhasil diperbarui oleh ${session.username} (${session.role}).`,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Foto ${roleLabel} berhasil diperbarui.`,
      photoUrl,
      candidate: updatedCandidate,
    });
  } catch (error) {
    console.error("Gagal mengunggah foto kandidat:", error);
    return NextResponse.json({ ok: false, message: "Terjadi kesalahan saat mengunggah foto." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireRole(["KPUM", "ITPO"]);
  if ("error" in gate) return gate.error;
  const session = gate.session;

  try {
    const { id } = await params;
    const url = new URL(req.url);
    const role = url.searchParams.get("role");

    const validRoles = ["leader", "vice", "secondVice"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ ok: false, message: "Role tidak valid." }, { status: 400 });
    }

    const candidate = await db.candidate.findUnique({ where: { id } });
    if (!candidate) {
      return NextResponse.json({ ok: false, message: "Kandidat tidak ditemukan." }, { status: 404 });
    }

    // 1. Hapus record foto dari CandidatePhoto
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).candidatePhoto.deleteMany({
      where: { candidateId: id, role },
    });

    // 2. Set kolom URL di Candidate menjadi null
    const updatePayload: Record<string, string | null> = {};
    if (role === "leader") updatePayload.photoLeaderUrl = null;
    else if (role === "vice") updatePayload.photoViceUrl = null;
    else if (role === "secondVice") updatePayload.photoSecondViceUrl = null;

    await db.candidate.update({
      where: { id },
      data: updatePayload,
    });

    // 3. Catat jejak audit
    await db.auditLog.create({
      data: {
        event: "CANDIDATE_PHOTO_DELETED",
        detail: `Foto peran '${role}' untuk paslon #${candidate.number} (${candidate.category}) dihapus oleh ${session.username}.`,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Foto ${role} berhasil dihapus.`,
    });
  } catch (error) {
    console.error("Gagal menghapus foto kandidat:", error);
    return NextResponse.json({ ok: false, message: "Gagal menghapus foto." }, { status: 500 });
  }
}
