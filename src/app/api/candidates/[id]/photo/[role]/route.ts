// ============================================================
// STREAMING FOTO KANDIDAT â€” /api/candidates/[id]/photo/[role]
// Menyajikan BLOB foto kandidat dari database Turso (CandidatePhoto)
// dengan header Cache-Control agresif untuk performa tinggi.
// ============================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; role: string }> }
) {
  try {
    const { id, role } = await params;
    const validRoles = ["leader", "vice", "secondVice"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    }

    // 1. Cari BLOB di tabel CandidatePhoto
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const photo = await (db as any).candidatePhoto.findUnique({
      where: {
        candidateId_role: { candidateId: id, role },
      },
    });

    if (photo && photo.data) {
      const buffer = Buffer.from(photo.data);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": photo.mimeType || "image/webp",
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }

    // 2. Jika tidak ada di CandidatePhoto, cek apakah ada fallback URL statis di Candidate
    const candidate = await db.candidate.findUnique({
      where: { id },
      select: {
        presidentName: true,
        viceName: true,
        secondViceName: true,
        photoLeaderUrl: true,
        photoViceUrl: true,
        photoSecondViceUrl: true,
        photoAccent: true,
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Kandidat tidak ditemukan" }, { status: 404 });
    }

    let staticUrl: string | null = null;
    let personName = "Kandidat";

    if (role === "leader") {
      staticUrl = candidate.photoLeaderUrl;
      personName = candidate.presidentName;
    } else if (role === "vice") {
      staticUrl = candidate.photoViceUrl;
      personName = candidate.viceName || "Wakil";
    } else if (role === "secondVice") {
      staticUrl = candidate.photoSecondViceUrl;
      personName = candidate.secondViceName || "Ketua 2";
    }

    // Jika staticUrl menunjuk ke file statis /candidates/..., redirect
    if (staticUrl && staticUrl.startsWith("/candidates/")) {
      return NextResponse.redirect(new URL(staticUrl, _req.url));
    }

    // 3. Fallback: generate SVG avatar dinamis jika foto belum diunggah
    const initials = personName
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase() || "KP";

    const accent = candidate.photoAccent || "#1B7F4E";

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
        <rect width="300" height="400" fill="${accent}" />
        <text x="150" y="215" font-family="sans-serif" font-size="72" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
          ${initials}
        </text>
      </svg>
    `.trim();

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Gagal streaming foto kandidat:", error);
    return NextResponse.json({ error: "Gagal memuat foto" }, { status: 500 });
  }
}
