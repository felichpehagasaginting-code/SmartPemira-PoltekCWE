// POST /api/admin/dpt-import — Import massal DPT dari CSV/XLSX paste (FR-02.1, FR-02.2)
// Format baris: NIM,Nama,ProdiID,Angkatan  → contoh: 22111005,Ahmad Saputra,BKS,2022
// RBAC: hanya KPUM & ITPO (PRD Bab 3).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  const gate = await requireRole(["KPUM", "ITPO"]);
  if ("error" in gate) return gate.error;
  try {
    const body = await req.json();
    const csv = String(body?.csv ?? "").trim();
    if (!csv) {
      return NextResponse.json({ ok: false, message: "Data CSV kosong." }, { status: 400 });
    }

    const prodis = await db.studyProgram.findMany();
    const validProdiIds = new Set(prodis.map((p) => p.id));

    const tps = await db.tps.findFirst();
    if (!tps) {
      return NextResponse.json({ ok: false, message: "TPS belum tersedia." }, { status: 400 });
    }

    const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let added = 0, duplicates = 0, invalid = 0;
    const errors: string[] = [];

    for (const [i, line] of lines.entries()) {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length < 3) { invalid++; errors.push(`Baris ${i + 1}: format tidak sesuai (NIM,Nama,ProdiID,Angkatan)`); continue; }
      const [nim, name, prodiId, angkatanStr] = parts;
      if (!/^[A-Za-z0-9]{6,20}$/.test(nim)) { invalid++; errors.push(`Baris ${i + 1}: NIM tidak valid`); continue; }
      if (!validProdiIds.has(prodiId)) { invalid++; errors.push(`Baris ${i + 1}: kode prodi '${prodiId}' tidak dikenal`); continue; }
      const existing = await db.voter.findUnique({ where: { nim } });
      if (existing) { duplicates++; errors.push(`Baris ${i + 1}: NIM ${nim} sudah terdaftar (anti duplikat FR-02.2)`); continue; }
      await db.voter.create({
        data: {
          nim, name,
          studyProgramId: prodiId,
          angkatan: Number(angkatanStr) || 2024,
          tpsId: tps.id,
        },
      });
      added++;
    }

    const total = await db.voter.count();
    await db.auditLog.create({
      data: {
        event: "DPT_IMPORTED",
        detail: `Import DPT: ${added} pemilih baru, ${duplicates} duplikat ditolak, ${invalid} baris invalid. Total DPT kini ${total}.`,
      },
    });

    return NextResponse.json({ ok: true, added, duplicates, invalid, errors: errors.slice(0, 10), total });
  } catch {
    return NextResponse.json({ ok: false, message: "Gagal mengimpor DPT." }, { status: 500 });
  }
}
