import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
} from "crypto";

export type BaSignerRole =
  | "KPUM_CHAIR"
  | "PANWASLU_CHAIR"
  | "WITNESS_PASLON_01"
  | "WITNESS_PASLON_02"
  | "DPM_REPRESENTATIVE";

export interface BaSignerRoleMeta {
  role: BaSignerRole;
  label: string;
  description: string;
  required: boolean;
}

export const BA_SIGNER_ROLES: Record<BaSignerRole, BaSignerRoleMeta> = {
  KPUM_CHAIR: {
    role: "KPUM_CHAIR",
    label: "Ketua KPUM",
    description: "Penyelenggara Utama Pemira Poltek CWE",
    required: true,
  },
  PANWASLU_CHAIR: {
    role: "PANWASLU_CHAIR",
    label: "Ketua Panwaslu",
    description: "Pengawas Independen Pemilu Raya",
    required: true,
  },
  WITNESS_PASLON_01: {
    role: "WITNESS_PASLON_01",
    label: "Saksi Paslon 01",
    description: "Saksi Resmi Paslon Presma-Wapresma No. Urut 01",
    required: false,
  },
  WITNESS_PASLON_02: {
    role: "WITNESS_PASLON_02",
    label: "Saksi Paslon 02",
    description: "Saksi Resmi Paslon Presma-Wapresma No. Urut 02",
    required: false,
  },
  DPM_REPRESENTATIVE: {
    role: "DPM_REPRESENTATIVE",
    label: "Perwakilan DPM",
    description: "Dewan Perwakilan Mahasiswa Poltek CWE",
    required: false,
  },
};

export const ALL_BA_SIGNER_ROLES: BaSignerRole[] = [
  "KPUM_CHAIR",
  "PANWASLU_CHAIR",
  "WITNESS_PASLON_01",
  "WITNESS_PASLON_02",
  "DPM_REPRESENTATIVE",
];

export interface BaSignatureEntry {
  role: BaSignerRole;
  signerName: string;
  signerNim: string;
  publicKeyPem: string;
  signatureB64: string;
  signedAt: string;
}

export interface MultiSignatureVerificationResult {
  valid: boolean;
  totalSigners: number;
  verifiedRoles: string[];
  invalidSignatures: Array<{
    role: string;
    signerName: string;
    reason: string;
  }>;
  missingRequiredRoles: string[];
  quorumMet: boolean;
  signers: Array<{
    role: BaSignerRole;
    signerName: string;
    signerNim: string;
    signedAt: string;
    valid: boolean;
    publicKeyFingerprint: string;
  }>;
}

/** Menghasilkan pasangan kunci Ed25519 untuk penandatangan (KPUM, Panwaslu, Saksi, DPM). */
export function generateSignerKeyPair(): {
  publicKeyPem: string;
  privateKeyPem: string;
  kid: string;
} {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const kid = getPublicKeyFingerprint(publicPem);
  return { publicKeyPem: publicPem, privateKeyPem: privatePem, kid };
}

/** Menghasilkan sidik jari kunci publik (8 karakter hex pertama dari SHA-256). */
export function getPublicKeyFingerprint(publicKeyPem: string): string {
  try {
    return createHash("sha256").update(publicKeyPem.trim()).digest("hex").slice(0, 8);
  } catch {
    return "unknown";
  }
}

/** Membubuhkan tanda tangan Ed25519 atas kanonikal payload. Mengembalikan signature dalam format base64. */
export function signCanonicalPayload(canonical: string, privateKeyPem: string): string {
  if (!canonical || typeof canonical !== "string") {
    throw new Error("Payload kanonikal wajib berupa string dan tidak boleh kosong");
  }
  if (!privateKeyPem || typeof privateKeyPem !== "string") {
    throw new Error("Kunci privat Ed25519 wajib disediakan");
  }
  const privKey = createPrivateKey(privateKeyPem);
  if (privKey.asymmetricKeyType !== "ed25519") {
    throw new Error("Hanya kunci privat berjenis Ed25519 yang didukung");
  }
  return sign(null, Buffer.from(canonical, "utf8"), privKey).toString("base64");
}

/** Memverifikasi tanda tangan Ed25519 tunggal atas kanonikal payload. */
export function verifySingleSignature(
  canonical: string,
  signatureB64: string,
  publicKeyPem: string
): boolean {
  if (!canonical || !signatureB64 || !publicKeyPem) return false;
  try {
    const pubKey = createPublicKey(publicKeyPem);
    if (pubKey.asymmetricKeyType !== "ed25519") {
      return false;
    }
    return verify(
      null,
      Buffer.from(canonical, "utf8"),
      pubKey,
      Buffer.from(signatureB64, "base64")
    );
  } catch {
    return false;
  }
}

/** Memverifikasi seluruh tanda tangan multisig atas kanonikal Berita Acara. */
export function verifyMultiSignatures(
  canonical: string,
  signatures: BaSignatureEntry[]
): MultiSignatureVerificationResult {
  if (!Array.isArray(signatures) || signatures.length === 0) {
    return {
      valid: false,
      totalSigners: 0,
      verifiedRoles: [],
      invalidSignatures: [],
      missingRequiredRoles: ["KPUM_CHAIR", "PANWASLU_CHAIR"],
      quorumMet: false,
      signers: [],
    };
  }

  const verifiedRoles: BaSignerRole[] = [];
  const invalidSignatures: Array<{ role: string; signerName: string; reason: string }> = [];
  const signersSummary: MultiSignatureVerificationResult["signers"] = [];
  const seenRoles = new Set<string>();

  for (const entry of signatures) {
    if (!entry.role || !entry.signatureB64 || !entry.publicKeyPem) {
      invalidSignatures.push({
        role: entry.role ?? "UNKNOWN",
        signerName: entry.signerName ?? "Unknown",
        reason: "Struktur data tanda tangan tidak lengkap",
      });
      continue;
    }

    if (!ALL_BA_SIGNER_ROLES.includes(entry.role)) {
      invalidSignatures.push({
        role: String(entry.role),
        signerName: entry.signerName ?? "Unknown",
        reason: "Role penandatangan tidak dikenali atau tidak sah",
      });
      continue;
    }

    if (seenRoles.has(entry.role)) {
      invalidSignatures.push({
        role: entry.role,
        signerName: entry.signerName ?? "Unknown",
        reason: "Duplikasi tanda tangan untuk role yang sama terdeteksi",
      });
      continue;
    }
    seenRoles.add(entry.role);

    const isValid = verifySingleSignature(canonical, entry.signatureB64, entry.publicKeyPem);
    const fingerprint = getPublicKeyFingerprint(entry.publicKeyPem);

    signersSummary.push({
      role: entry.role,
      signerName: entry.signerName,
      signerNim: entry.signerNim,
      signedAt: entry.signedAt,
      valid: isValid,
      publicKeyFingerprint: fingerprint,
    });

    if (isValid) {
      verifiedRoles.push(entry.role);
    } else {
      invalidSignatures.push({
        role: entry.role,
        signerName: entry.signerName,
        reason: "Tanda tangan kriptografis tidak cocok dengan kanonikal dokumen",
      });
    }
  }

  const requiredRoles: BaSignerRole[] = ["KPUM_CHAIR", "PANWASLU_CHAIR"];
  const missingRequiredRoles = requiredRoles.filter((r) => !verifiedRoles.includes(r));

  // Kuorum terpenuhi jika:
  // 1. Kedua required role (Ketua KPUM & Ketua Panwaslu) telah bertanda tangan valid.
  // 2. Minimal 2 penandatangan valid (KPUM + Panwaslu), idealnya >= 3 termasuk saksi / DPM.
  const quorumMet = missingRequiredRoles.length === 0 && verifiedRoles.length >= 2;
  const valid = invalidSignatures.length === 0 && quorumMet;

  return {
    valid,
    totalSigners: verifiedRoles.length,
    verifiedRoles,
    invalidSignatures,
    missingRequiredRoles,
    quorumMet,
    signers: signersSummary,
  };
}

/** Deserialisasi JSON signatures array dengan penanganan fallback aman. */
export function parseSignaturesJson(raw: string | null | undefined): BaSignatureEntry[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is BaSignatureEntry =>
        item &&
        typeof item === "object" &&
        typeof item.role === "string" &&
        ALL_BA_SIGNER_ROLES.includes(item.role as BaSignerRole) &&
        typeof item.signerName === "string" &&
        typeof item.signerNim === "string" &&
        typeof item.publicKeyPem === "string" &&
        typeof item.signatureB64 === "string" &&
        typeof item.signedAt === "string"
    );
  } catch {
    return [];
  }
}

/** Serialisasi signatures array ke format JSON tersimpan. */
export function serializeSignaturesJson(entries: BaSignatureEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

/** Menambah atau memperbarui tanda tangan role tertentu pada daftar signatures. */
export function upsertSignatureEntry(
  existing: BaSignatureEntry[],
  newEntry: BaSignatureEntry
): BaSignatureEntry[] {
  const filtered = existing.filter((s) => s.role !== newEntry.role);
  return [...filtered, newEntry];
}
