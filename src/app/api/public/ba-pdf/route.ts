// GET /api/public/ba-pdf — Unduh Berita Acara Rekapitulasi (Model C-KWE) sebagai PDF.
// Rekomendasi #9: transparansi publik — dokumen resmi yang bisa diunduh siapa pun
// SETELAH Pleno Unlocking. Sebelum unlock → 423 (konsisten Hukum 5).
// Data identik dengan /api/kpum/berita-acara (kanonikal bersama lib/server/ba-canonical.ts).
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "@/lib/db";
import { getTallyReport } from "@/lib/db/tally-service";
import { buildBaCanonical, collectBaTotals, computeBaSignature } from "@/lib/server/ba-canonical";

export const dynamic = "force-dynamic";

const A4: [number, number] = [595.28, 841.89]; // portrait pt
const M = 56; // margin
const INK = rgb(0.08, 0.12, 0.1);
const GREY = rgb(0.42, 0.47, 0.44);
const GREEN = rgb(0.11, 0.5, 0.31);
const LINE = rgb(0.8, 0.78, 0.73);

function fmtPct(p: number): string {
  return `${p.toFixed(1)}%`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }) + " WIB";
}

export async function GET() {
  const setting = await db.electionSetting.findUnique({ where: { id: "main" } });
  if (!setting?.plenoUnlocked) {
    return NextResponse.json(
      {
        ok: false,
        locked: true,
        message: "Berita Acara final hanya tersedia setelah Pleno Unlocking (FR-06.3).",
      },
      { status: 423 }
    );
  }

  const tally = await getTallyReport();
  const totals = await collectBaTotals();
  const [chains, kpumChair, panwasluChair] = await Promise.all([
    db.tps.findMany({ orderBy: { id: "asc" } }),
    db.operator.findFirst({ where: { role: "KPUM", isActive: true } }),
    db.operator.findFirst({ where: { role: "PANWASLU", isActive: true } }),
  ]);

  const canonical = buildBaCanonical({ ...totals, tally, plenoUnlockedAt: setting.plenoUnlockedAt ?? null });
  const signature = computeBaSignature(canonical);

  // ---------- Bangun PDF ----------
  const pdf = await PDFDocument.create();
  pdf.setTitle("Berita Acara Rekapitulasi Pemira Poltek CWE — Model C-KWE");
  pdf.setSubject("Rekapitulasi resmi Pemungutan Suara Online");
  pdf.setProducer("Smart Pemira");
  pdf.setCreator("Smart Pemira — Poltek CWE");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  let page = pdf.addPage(A4);
  const { width, height } = page.getSize();
  let y = height - M;

  const ensureSpace = (need: number) => {
    if (y - need < M + 28) {
      page = pdf.addPage(A4);
      y = height - M;
    }
  };

  const clean = (s: string) =>
    s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\u2026/g, "...");

  const text = (
    s: string,
    opts: { size?: number; f?: typeof font; color?: typeof INK; x?: number; maxW?: number } = {}
  ) => {
    const size = opts.size ?? 10;
    const f = opts.f ?? font;
    const color = opts.color ?? INK;
    const x = opts.x ?? M;
    const maxW = opts.maxW ?? width - M * 2;
    let str = clean(s);
    if (f.widthOfTextAtSize(str, size) > maxW) {
      while (str.length > 1 && f.widthOfTextAtSize(str + "...", size) > maxW) str = str.slice(0, -1);
      str += "...";
    }
    page.drawText(str, { x, y, size, font: f, color });
    y -= size + 4;
  };

  const hrule = () => {
    page.drawLine({ start: { x: M, y: y + 4 }, end: { x: width - M, y: y + 4 }, thickness: 0.8, color: LINE });
    y -= 10;
  };

  // ====== KOP ======
  text("IKATAN KELUARGA MAHASISWA POLITEKNIK KELAPA SAWIT CITRA WIDYA EDUKASI", { size: 9, f: bold, color: GREY });
  text("BERITA ACARA REKAPITULASI PEMUNGUTAN SUARA ONLINE", { size: 15, f: bold });
  text("Model C-KWE - Pemira Poltek CWE (Pemilihan Umum Raya Mahasiswa)", { size: 10.5, color: GREY });
  hrule();

  // ====== METADATA ======
  text(`Pleno Unlocking  : ${fmtTime(setting.plenoUnlockedAt?.toISOString() ?? null)}`, { size: 9.5, f: mono });
  text(`Dokumen dibuat   : ${fmtTime(new Date().toISOString())}`, { size: 9.5, f: mono });
  text(`Metode penghitungan: latest-ballot-wins (satu suara terakhir per token)`, { size: 9.5, f: mono });
  y -= 4;

  // ====== REKAP PARTISIPASI ======
  ensureSpace(120);
  text("A. REKAPITULASI PARTISIPASI", { size: 11.5, f: bold, color: GREEN });
  const turnout = totals.dptTotal > 0 ? (totals.voted / totals.dptTotal) * 100 : 0;
  const absent = totals.dptTotal - totals.voted;
  text(`Daftar Pemilih Tetap (DPT)   : ${totals.dptTotal}`, { size: 10, f: mono });
  text(`Menggunakan hak pilih        : ${totals.voted}  (${fmtPct(turnout)})`, { size: 10, f: mono });
  text(`Tidak hadir                  : ${absent}`, { size: 10, f: mono });
  text(`Balok suara di rantai (total): ${totals.ballots} (termasuk versi lama yang diganti)`, { size: 10, f: mono });
  text(`Token terpakai (USED)        : ${totals.tokenUsed}`, { size: 10, f: mono });
  text(
    `Re-vote (Estonia)            : ${tally.revoteStats.tokensRevoted} token pernah mengganti suara; ` +
      `${tally.revoteStats.supersededBallots} balok versi lama tidak dihitung; ${tally.revoteStats.lockedTokens} token dikunci pemilih`,
    { size: 10, f: mono }
  );
  y -= 6;

  // ====== HASIL PER KATEGORI ======
  text("B. HASIL PER SURAT SUARA (DPM, BEM, HIMA)", { size: 11.5, f: bold, color: GREEN });
  const outcomeLabel: Record<string, string> = {
    TERPILIH: "TERPILIH",
    PEMENANG_SEMENTARA: "PEMENANG SEMENTARA",
    STATUS_SERI_PENDING_PLENO: "SERI - DIPUTUSKAN MUSYAWARAH",
    MANDAT_KEMBALI_KE_MUSYAWARAH_MAHASISWA: "MANDAT KEMBALI KE MUSYAWARAH MAHASISWA",
  };

  for (const cat of tally.categories) {
    ensureSpace(70 + cat.results.length * 26);
    const title =
      cat.category === "HIMA"
        ? `HIMA ${cat.studyProgramId ?? ""} - ${cat.studyProgramName ?? ""}`.trim()
        : cat.category === "PRESMA"
          ? "BEM (Presma & Wakil Presma)"
          : "DPM (Dewan Perwakilan Mahasiswa)";
    text(title, { size: 10.5, f: bold });
    text(`Suara sah: ${cat.totalValidVotes}  |  Status: ${outcomeLabel[cat.outcome] ?? cat.outcome}`, { size: 9, color: GREY });
    for (const r of cat.results) {
      const name = r.isEmptyBox ? "SUARA KOSONG (tidak memilih paslon manapun)" : r.name;
      const bar = "#".repeat(Math.max(0, Math.round((r.percentage / 100) * 28)));
      page.drawText(
        clean(`  No.${String(r.number).padStart(2, "0")}  ${String(r.votes).padStart(4)} suara  ${fmtPct(r.percentage).padStart(6)}  ${bar}`),
        { x: M, y, size: 9, font: mono, color: INK }
      );
      y -= 13;
      page.drawText(clean(`         ${name}`), { x: M, y, size: 9, font, color: GREY });
      y -= 13;
    }
    y -= 6;
  }

  // ====== INTEGRITAS ======
  ensureSpace(90);
  text("C. INTEGRITAS RANTAI HASH (AUDIT PUBLIK)", { size: 11.5, f: bold, color: GREEN });
  text(
    `Rantai valid: ${tally.integrity.allValid ? "YA - SELURUH RANTAI SAH" : "TIDAK - DITEMUKAN ANOMALI"} (diperiksa ${tally.integrity.totalChecked} balok)`,
    { size: 10, f: mono }
  );
  for (const ch of tally.integrity.chains) {
    text(
      `  ${ch.name.padEnd(18)} ${ch.valid ? "VALID" : "RUSAK@" + (ch.brokenAtIndex ?? "-")}  head: ${ch.headHash.slice(0, 24)}...`,
      { size: 8.5, f: mono, color: ch.valid ? INK : rgb(0.52, 0.13, 0.16) }
    );
  }
  y -= 6;

  // ====== TANDA TANGAN ======
  ensureSpace(110);
  text("D. TANDA TANGAN KRIPTOGRAFIS DOKUMEN", { size: 11.5, f: bold, color: GREEN });
  text("SHA-256 atas kanonikal seluruh angka hasil (dapat diverifikasi publik di Portal Informasi):", {
    size: 9,
    color: GREY,
  });
  const wrap = 64;
  for (let i = 0; i < signature.length; i += wrap) {
    text(signature.slice(i, i + wrap), { size: 8.5, f: mono, color: GREEN });
  }
  y -= 10;

  // garis tanda tangan dua kolom (digambar manual agar tidak menggeser y dua kali)
  const half = (width - M * 2) / 2;
  const sigLineY = y;
  page.drawLine({ start: { x: M, y: sigLineY }, end: { x: M + half - 24, y: sigLineY }, thickness: 0.8, color: INK });
  page.drawLine({
    start: { x: M + half + 24, y: sigLineY },
    end: { x: width - M, y: sigLineY },
    thickness: 0.8,
    color: INK,
  });
  page.drawText(clean(kpumChair?.fullName ?? "Ketua KPUM"), { x: M, y: sigLineY - 12, size: 9.5, font: bold, color: INK });
  page.drawText("Ketua KPUM (Penetapan Hasil)", { x: M, y: sigLineY - 23, size: 8.5, font, color: GREY });
  page.drawText(clean(panwasluChair?.fullName ?? "Ketua Panwaslu"), {
    x: M + half + 24,
    y: sigLineY - 12,
    size: 9.5,
    font: bold,
    color: INK,
  });
  page.drawText("Ketua Panwaslu (Pengawas)", { x: M + half + 24, y: sigLineY - 23, size: 8.5, font, color: GREY });
  y = sigLineY - 48;

  // ====== FOOTER ======
  text(
    "Dokumen ini dihasilkan otomatis oleh Smart Pemira dari kotak suara digital saat diunduh dan memuat angka yang identik dengan tanda tangan di atas. Sesuai Hukum 1 & 2 (zero-knowledge), dokumen ini tidak memuat dan tidak dapat menghubungkan suara ke identitas pemilih mana pun.",
    { size: 7.8, color: GREY }
  );

  const bytes = await pdf.save();
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="BA-Rekapitulasi-Pemira-C-KWE-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
