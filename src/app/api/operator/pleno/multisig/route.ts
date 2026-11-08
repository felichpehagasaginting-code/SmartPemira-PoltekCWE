// ============================================================
// API MULTISIG BERITA ACARA PLENO (Paket #5)
// Endpoint penandatanganan kolektif (co-signing) Berita Acara Model C-KWE
// oleh KPUM, Panwaslu, Saksi Paslon 01 & 02, dan Perwakilan DPM.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/auth";
import { getTallyReport } from "@/lib/db/tally-service";
import {
  buildBaCanonical,
  collectBaTotals,
  computeBaSignature,
} from "@/lib/server/ba-canonical";
import {
  ALL_BA_SIGNER_ROLES,
  BA_SIGNER_ROLES,
  generateSignerKeyPair,
  parseSignaturesJson,
  serializeSignaturesJson,
  signCanonicalPayload,
  upsertSignatureEntry,
  verifyMultiSignatures,
  verifySingleSignature,
  type BaSignatureEntry,
  type BaSignerRole,
} from "@/lib/crypto/multisig";

export async function GET() {
  const gate = await requireRole(["KPUM", "PANWASLU", "SAKSI", "ITPO"]);
  if ("error" in gate) return gate.error;

  const setting = await db.electionSetting.findUnique({ where: { id: "main" } });
  if (!setting?.plenoUnlocked) {
    return NextResponse.json(
      {
        ok: false,
        locked: true,
        message:
          "Berita Acara Pleno belum dibuka (Pleno Vault masih terkunci). Sidang pleno harus dibuka terlebih dahulu oleh Ketua KPUM.",
      },
      { status: 423 }
    );
  }

  const tally = await getTallyReport();
  const totals = await collectBaTotals();
  const canonical = buildBaCanonical({
    ...totals,
    tally,
    plenoUnlockedAt: setting.plenoUnlockedAt ?? null,
  });
  const sha256 = computeBaSignature(canonical);

  const existingSignatures = parseSignaturesJson(setting.baSignaturesJson);
  const verification = verifyMultiSignatures(canonical, existingSignatures);

  return NextResponse.json({
    ok: true,
    locked: false,
    plenoUnlockedAt: setting.plenoUnlockedAt?.toISOString() ?? null,
    canonical,
    sha256,
    defaultEd25519Signature: setting.baSignatureEd25519,
    signatures: existingSignatures,
    verification,
    roles: BA_SIGNER_ROLES,
    allRoles: ALL_BA_SIGNER_ROLES,
    quorumMet: verification.quorumMet,
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireRole(["KPUM", "PANWASLU", "SAKSI", "ITPO"]);
  if ("error" in gate) return gate.error;

  const setting = await db.electionSetting.findUnique({ where: { id: "main" } });
  if (!setting?.plenoUnlocked) {
    return NextResponse.json(
      {
        ok: false,
        message: "Pleno belum dibuka. Tanda tangan hanya dapat dibubuhkan setelah Pleno Unlocking.",
      },
      { status: 423 }
    );
  }

  try {
    const body = await req.json();
    const role = body.role as BaSignerRole;
    const signerName = (body.signerName ?? gate.session.fullName ?? "").trim();
    const signerNim = (body.signerNim ?? gate.session.username ?? "").trim();
    const autoSignWithNewKey = Boolean(body.autoSignWithNewKey);

    if (!ALL_BA_SIGNER_ROLES.includes(role)) {
      return NextResponse.json(
        {
          ok: false,
          message: `Role penandatangan tidak valid. Harus salah satu dari: ${ALL_BA_SIGNER_ROLES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validasi wewenang penandatanganan berdasarkan role operator (RBAC Elektoral)
    const operatorRole = gate.session.role;
    if (operatorRole === "KPUM" && role !== "KPUM_CHAIR") {
      return NextResponse.json(
        { ok: false, message: "Operator KPUM hanya berwenang menandatangani sebagai Ketua KPUM." },
        { status: 403 }
      );
    }
    if (operatorRole === "PANWASLU" && role !== "PANWASLU_CHAIR") {
      return NextResponse.json(
        { ok: false, message: "Operator Panwaslu hanya berwenang menandatangani sebagai Ketua Panwaslu." },
        { status: 403 }
      );
    }
    if (
      operatorRole === "SAKSI" &&
      !["WITNESS_PASLON_01", "WITNESS_PASLON_02", "DPM_REPRESENTATIVE"].includes(role)
    ) {
      return NextResponse.json(
        { ok: false, message: "Saksi tidak diizinkan menandatangani atas nama Ketua KPUM atau Ketua Panwaslu." },
        { status: 403 }
      );
    }

    if (!signerName || !signerNim) {
      return NextResponse.json(
        { ok: false, message: "Nama dan NIM penandatangan wajib diisi." },
        { status: 400 }
      );
    }

    // Hitung kanonikal terkini
    const tally = await getTallyReport();
    const totals = await collectBaTotals();
    const canonical = buildBaCanonical({
      ...totals,
      tally,
      plenoUnlockedAt: setting.plenoUnlockedAt ?? null,
    });

    let publicKeyPem = (body.publicKeyPem ?? "").trim();
    let signatureB64 = (body.signatureB64 ?? "").trim();
    let generatedPrivateKeyPem: string | undefined;

    if (autoSignWithNewKey) {
      // Fasilitas pembuatan keypair dan penandatanganan instan untuk simulasi sidang pleno
      const generated = generateSignerKeyPair();
      publicKeyPem = generated.publicKeyPem;
      generatedPrivateKeyPem = generated.privateKeyPem;
      signatureB64 = signCanonicalPayload(canonical, generated.privateKeyPem);
    } else {
      if (!publicKeyPem || !signatureB64) {
        return NextResponse.json(
          {
            ok: false,
            message: "Sertakan publicKeyPem dan signatureB64, atau aktifkan autoSignWithNewKey: true.",
          },
          { status: 400 }
        );
      }

      const isValid = verifySingleSignature(canonical, signatureB64, publicKeyPem);
      if (!isValid) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Tanda tangan Ed25519 TIDAK COCOK dengan kanonikal Berita Acara saat ini. Pastikan payload yang ditandatangani identik.",
          },
          { status: 400 }
        );
      }
    }

    const newEntry: BaSignatureEntry = {
      role,
      signerName,
      signerNim,
      publicKeyPem,
      signatureB64,
      signedAt: new Date().toISOString(),
    };

    // Eksekusi transaksi interaktif untuk mencegah race condition penandatanganan simultan
    const { updatedSignatures, verification } = await db.$transaction(async (tx) => {
      const freshSetting = await tx.electionSetting.findUnique({ where: { id: "main" } });
      if (!freshSetting?.plenoUnlocked) {
        throw new Error("Pleno belum dibuka atau Pleno Vault terkunci kembali.");
      }
      const currentSignatures = parseSignaturesJson(freshSetting.baSignaturesJson);
      const updated = upsertSignatureEntry(currentSignatures, newEntry);
      const updatedJson = serializeSignaturesJson(updated);

      await tx.electionSetting.update({
        where: { id: "main" },
        data: { baSignaturesJson: updatedJson },
      });

      await tx.auditLog.create({
        data: {
          event: "BA_MULTISIG_SIGNED",
          detail: `Tanda tangan digital Ed25519 dibubuhkan oleh ${BA_SIGNER_ROLES[role]?.label ?? role} (${signerName} - ${signerNim}).`,
        },
      });

      const verif = verifyMultiSignatures(canonical, updated);
      return { updatedSignatures: updated, verification: verif };
    });

    return NextResponse.json({
      ok: true,
      message: `Tanda tangan untuk ${BA_SIGNER_ROLES[role]?.label ?? role} (${signerName}) berhasil dibubuhkan.`,
      entry: newEntry,
      generatedPrivateKeyPem,
      signatures: updatedSignatures,
      verification,
      quorumMet: verification.quorumMet,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Kesalahan server internal";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
