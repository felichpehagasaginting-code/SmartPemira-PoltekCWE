// POST /api/tally/unlock — Pleno Unlocking (FR-06.3, Hukum 5)
// Hanya dieksekusi oleh Ketua KPUM disaksikan Panwaslu & Saksi.
// RBAC: KPUM SAJA (super admin pun tidak — prinsip pemisahan kewenangan penyelenggara).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTallyReport } from "@/lib/db/tally-service";
import { buildBaCanonical, collectBaTotals } from "@/lib/server/ba-canonical";
import { signBaCanonical } from "@/lib/server/ba-signing";
import { requireRole } from "@/lib/server/auth";

export async function POST() {
  const gate = await requireRole(["KPUM"]);
  if ("error" in gate) return gate.error;
  try {
    const setting = await db.electionSetting.findUnique({ where: { id: "main" } });
    if (!setting) {
      return NextResponse.json({ ok: false, message: "Konfigurasi eleksi belum siap." }, { status: 400 });
    }
    if (setting.emergencyFreeze) {
      return NextResponse.json(
        { ok: false, message: "EMERGENCY FREEZE aktif — penutupan & pembukaan kotak suara ditunda." },
        { status: 423 }
      );
    }

    await db.$transaction([
      db.electionSetting.update({
        where: { id: "main" },
        data: { votingOpen: false, plenoUnlocked: true, plenoUnlockedAt: new Date() },
      }),
      db.auditLog.create({
        data: {
          event: "PLENO_UNLOCK",
          detail: "Sidang Pleno dimulai: Ketua KPUM membuka kotak suara digital (Pleno Unlocking), disaksikan Panwaslu & Saksi Paslon. Distribusi suara didekripsi untuk rekapitulasi.",
        },
      }),
    ]);

    const report = await getTallyReport();
    // Rekomendasi #2: tanda tangan Ed25519 BA DIFIKSASI di detik Pleno Unlock —
    // attestation tersimpan di ElectionSetting; dokumen berita acara yang
    // diunduh kapan pun memverifikasi ulang tanda tangan ini.
    const baCanonical = buildBaCanonical({ ...await collectBaTotals(), tally: report, plenoUnlockedAt: setting.plenoUnlockedAt });
    await db.electionSetting.update({
      where: { id: "main" },
      data: { baSignatureEd25519: signBaCanonical(baCanonical), baSignedAt: new Date() },
    });
    return NextResponse.json({ ok: true, report });
  } catch {
    return NextResponse.json({ ok: false, message: "Gagal membuka kotak suara digital." }, { status: 500 });
  }
}
