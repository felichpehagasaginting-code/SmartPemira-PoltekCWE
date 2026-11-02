// ============================================================
// SKEMA VALIDASI TERPUSAT (Rekomendasi #4 — Zod di boundary API)
// Satu sumber kebenaran untuk bentuk payload semua endpoint mutasi:
//  - tolak unknown key (.strict()) — mencegah field liar masuk service
//  - batas panjang eksplisit — payload aneh ditolak sebelum menyentuh DB
//  - normalisasi (trim/uppercase) dilakukan DI SINI, bukan tersebar di route
// Dipakai bersama src/lib/server/validate.ts (helper readJson).
// ============================================================
import { z } from "zod";

// ---------- Dasar ----------
// Token pemilih: 6 karakter, alfabet tanpa 0/O/1/I (TOKEN_ALPHABET).
export const TOKEN_ALPHABET_RE = /^[A-HJ-NP-Z2-9]{6}$/;
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const HEX128_RE = /^[0-9a-f]{1,128}$/;

export const tokenSchema = z
  .string({ message: "Token wajib diisi." })
  .trim()
  .toUpperCase()
  .pipe(z.string().regex(TOKEN_ALPHABET_RE, "Token harus 6 karakter alfanumerik (tanpa 0/O/1/I)."));

/** Id kandidat: UUID, atau null (Suara Kosong). "EMPTY" (kiosk lawas) & "" dinormalisasi → null. */
export const candidateIdSchema = z
  .preprocess(
    (v) => (v === "" || v === "EMPTY" ? null : v),
    z.string().regex(UUID_RE, "ID kandidat tidak valid.").nullable()
  );

export const uuidSchema = z.string().regex(UUID_RE, "ID tidak valid.");
export const uuidNullableSchema = z
  .preprocess((v) => (v === "" ? null : v), z.string().regex(UUID_RE, "ID tidak valid.").nullable());

// ---------- Pemilih (Portal BYOD) ----------
export const pemilihSubmitSchema = z
  .object({
    token: tokenSchema,
    selections: z
      .object({
        presmaCandidateId: candidateIdSchema,
        dpmCandidateId: candidateIdSchema,
        himaCandidateId: candidateIdSchema,
      })
      .strict(),
  })
  .strict();

export const tokenOnlySchema = z.object({ token: tokenSchema }).strict();

// ---------- Kiosk ----------
// Hima boleh tidak dikirim (undefined) — diperlakukan Suara Kosong, sesuai
// perilaku layar kiosk lawas; PRESMA/DPM wajib eksplisit (id atau null).
export const kioskSubmitSchema = z
  .object({
    token: tokenSchema,
    selections: z
      .object({
        presmaCandidateId: candidateIdSchema,
        dpmCandidateId: candidateIdSchema,
        himaCandidateId: candidateIdSchema.optional(),
      })
      .strict(),
  })
  .strict();

// ---------- Autentikasi operator ----------
export const loginSchema = z
  .object({
    username: z.string({ message: "Username wajib diisi." }).trim().min(1, "Username wajib diisi.").max(32, "Username maksimal 32 karakter."),
    password: z.string({ message: "Password wajib diisi." }).min(1, "Password wajib diisi.").max(128, "Password maksimal 128 karakter."),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password lama wajib diisi.").max(128),
    newPassword: z.string().min(8, "Password baru minimal 8 karakter.").max(128),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi.").max(128),
  })
  .strict();

// ---------- PPUR ----------
export const issueTokenSchema = z
  .object({
    voterId: uuidSchema,
    note: z.string().max(200, "Catatan maksimal 200 karakter.").optional().default(""),
  })
  .strict();

export const revokeTokenSchema = z
  .object({
    token: tokenSchema,
    voterId: uuidNullableSchema.optional(),
    note: z.string().max(200).optional().default(""),
    resetRights: z.boolean().optional().default(false),
  })
  .strict();

// ---------- Admin ----------
export const dptImportSchema = z
  .object({
    csv: z.string().min(1, "Data CSV wajib diisi.").max(2_000_000, "Data import terlalu besar (maks 2 MB)."),
  })
  .strict();

export const OPERATOR_ROLES = ["KPUM", "PPUR", "PANWASLU", "SAKSI", "ITPO"] as const;

export const operatorCreateSchema = z
  .object({
    username: z
      .string().trim().toLowerCase()
      .min(3, "Username minimal 3 karakter.").max(24, "Username maksimal 24 karakter.")
      .regex(/^[a-z0-9._-]+$/, "Username hanya boleh huruf kecil, angka, titik, strip, underscore."),
    fullName: z.string().trim().min(2, "Nama lengkap minimal 2 karakter.").max(80),
    role: z.enum(OPERATOR_ROLES),
    password: z.string().min(8, "Password minimal 8 karakter.").max(128),
    tpsId: z.string().max(40).nullable().optional(),
  })
  .strict();

export const operatorPatchSchema = z
  .object({
    isActive: z.boolean().optional(),
    role: z.enum(OPERATOR_ROLES).optional(),
    fullName: z.string().trim().min(1).max(80).optional(),
    tpsId: z.string().max(40).nullable().optional(),
  })
  .strict();

export const resetPasswordOperatorSchema = z
  .object({
    // Sandi sementara dibuat petugas ITPO; wajib diganti pemilik akun saat login.
    newPassword: z.string().min(8, "Password minimal 8 karakter.").max(128),
  })
  .strict();

// ---------- ITPO (Segel & Reset) ----------
export const itpoResetSchema = z
  .object({
    mode: z.enum(["DEMO", "NEW_PERIOD"]),
    newPeriodLabel: z.string().trim().min(3, "Label periode minimal 3 karakter.").max(80),
    confirmPhrase: z.string().max(100).optional().default(""),
    password: z.string().min(1, "Password ITPO wajib diisi.").max(128),
    note: z.string().max(500).optional().default(""),
  })
  .strict();

export const itpoResetPreviewSchema = z
  .object({
    mode: z.enum(["DEMO", "NEW_PERIOD"]).optional().default("DEMO"),
    note: z.string().max(300).optional().default(""),
  })
  .strict();

// ---------- Monitor / Panwaslu ----------
export const incidentSchema = z
  .object({
    reporterName: z.string().trim().min(2, "Nama pelapor minimal 2 karakter.").max(80),
    reporterNim: z.string().trim().min(5, "NIM minimal 5 karakter.").max(20),
    incidentType: z.enum(["PELANGGARAN_KAMPANYE", "KECURANGAN_TPS", "MALFUNGSI_SISTEM", "LAINNYA"], {
      message: "Jenis insiden tidak dikenal.",
    }),
    location: z.string().trim().min(2, "Lokasi wajib diisi.").max(120),
    description: z.string().trim().min(10, "Deskripsi minimal 10 karakter.").max(2000),
  })
  .strict();

// ---------- Publik (query GET ringan; tetap dibatasi) ----------
export const receiptQuerySchema = z
  .object({
    code: z.string().max(20, "Kode struk tidak valid."),
  })
  .strict();

export const verifyBaQuerySchema = z
  .object({
    sig: z.string().max(128).regex(HEX128_RE, "Signature tidak valid."),
  })
  .strict();
