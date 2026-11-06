# Smart Pemira — E-Voting Zero-Knowledge Ballot
### Politeknik Kelapa Sawit Citra Widya Edukasi (Poltek CWE)

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![Turso](https://img.shields.io/badge/Turso-LibSQL-4FF8D2?logo=turso)](https://turso.tech/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)

Platform E-Voting modern berbasis web yang mengedepankan **privasi pemilih mutlak (Zero-Knowledge)**, **auditabilitas kriptografi waktu-nyata (SHA-256 Hash Chaining)**, dan integritas hukum pemilihan mahasiswa di lingkungan kampus Politeknik Kelapa Sawit Citra Widya Edukasi.

---

## 🏛️ Lima Hukum Arsitektur Sistem

Sistem ini dibangun di atas lima aturan arsitektur yang tidak dapat dilanggar (*non-negotiable invariants*):

1. **Hukum 1: Pemisahan Mutlak Identitas & Suara (Zero-Knowledge)**
   - Tidak ada hubungan data (*Foreign Key* atau relasi) antara data pemilih (`Voter`/NIM) dengan surat suara di kotak suara (`BallotBox`) maupun token pemilihan (`VotingToken`).
2. **Hukum 2: Rantai Hash Audit Per TPS (SHA-256 Chaining)**
   - Setiap surat suara yang masuk secara atomik disambungkan ke dalam rantai hash SHA-256 per TPS virtual prodi (`prevHash || id || category || candidateId || ts || salt`). Siapa pun dapat memverifikasi bahwa tidak ada suara yang disisipkan, dihapus, atau diubah.
3. **Hukum 3: Perlakuan Kasus Calon Tunggal & Status Seri**
   - Mendukung pemilihan calon tunggal berhadapan dengan entitas resmi **Kotak Kosong**. Calon tunggal dinyatakan terpilih jika memperoleh suara **> 50%**. Jika $\le$ 50%, sistem otomatis menetapkan status `MANDAT_KEMBALI_KE_MUSYAWARAH_MAHASISWA` sesuai Pasal 9 ayat (4) UUD IKM Poltek CWE.
4. **Hukum 4: Validasi Hak Suara Ketat (Server-Side Prodi Filter)**
   - Pemilih hanya dapat melihat dan memilih surat suara HIMA yang sesuai dengan Program Studinya masing-masing. Filter dilakukan di sisi server untuk mencegah kebocoran data paslon lintas jurusan.
5. **Hukum 5: Kunci Rekapitulasi Pleno (Pleno Vault Lock)**
   - Hasil penghitungan suara terkunci rapat (*HTTP 423 Locked*) selama masa pemungutan suara berlangsung. Data rekapitulasi hanya dapat dibuka setelah Ketua KPUM membuka kunci pleno (*Pleno Unlock*) secara resmi.

---

## 🌟 Fitur Unggulan

- **Bilik Suara Ramah Pemilih (Kiosk Terminal)**:
  - Antarmuka wizard 3 bilik: Presma (BEM), DPM, dan HIMA prodi.
  - Indikator warna dinamis (*color coding*) per jurusan (BKS Terracotta, TPHP Ochre, MANLOG Cobalt, TRPL Plum, BD Olive).
  - Keypad virtual di layar + integrasi keyboard fisik.
  - Halaman review pilihan sebelum submit dan pencetakan struk bukti pemilihan dengan kode verifikasi anonim.
- **Meja Registrasi & Pos Bantuan (PPUR Desk)**:
  - Pencarian DPT dengan filter angkatan & prodi.
  - Penerbitan token acak 6-karakter CSPRNG (bebas karakter ambigu `0`, `O`, `1`, `I`) dengan waktu kedaluwarsa (TTL).
  - Pencabutan token lama otomatis jika diterbitkan ulang.
- **Dashboard KPUM**:
  - Monitoring partisipasi pemilih (*turnout rate*) live.
  - Impor DPT via CSV anti-duplikasi.
  - Tombol darurat pembekuan pemilu (*Emergency Freeze*).
  - Mekanisme pembukaan kunci pleno (*Pleno Unlock*).
  - Pembuatan Berita Acara Model C-KWE otomatis bertanda tangan digital **Ed25519** dan stempel QR verifikasi publik.
- **Pusat Pengawasan Panwaslu & Saksi (Obsidian Forest UI)**:
  - Tema gelap khusus pengawasan minim kelelahan mata.
  - Feed audit log append-only realtime via Server-Sent Events (SSE).
  - Verifikator rantai hash SHA-256 independen.
  - Formulir pelaporan & penanganan sengketa pemilu.
  - Pusat peringatan operasional otomatis (*Alert Center*: badai login gagal, stall partisipasi, freeze aktif).
- **Keamanan Tingkat Tinggi**:
  - Autentikasi operator berbasis sesi HMAC-SHA256 cookie `httpOnly`.
  - Dukungan **2FA TOTP (Google Authenticator / RFC 6238)** dilengkapi kode pemulihan cadangan sekali pakai.
  - Tanda tangan digital kriptografis **Ed25519 (RFC 8032)** pada Berita Acara dan arsip pemilu.

---

## 🛠️ Tech Stack & Arsitektur

| Komponen | Teknologi | Keterangan |
|---|---|---|
| **Framework** | Next.js 16 (App Router) + Turbopack | Server-Side Rendering & API Route Handlers |
| **Frontend** | React 19 + TypeScript + Tailwind CSS v4 | Desain Neo-Editorial Botanical & Tactile Neo-Brutalism |
| **UI Components** | Radix UI + shadcn/ui + Lucide Icons | Aksesibel (WCAG AA), responsive mobile-first |
| **ORM** | Prisma ORM 6 | Type-safe query engine & data modeling |
| **Database** | **Dual-Mode**: SQLite lokal / Turso LibSQL Cloud | Transisi mulus antara offline dev dan produksi cloud |
| **Kriptografi** | Node.js `crypto` bawaan | SHA-256, scrypt password hashing, Ed25519, AES-256-GCM |
| **Testing** | Vitest 5 | 43 unit tests mencakup beban paralel & kriptografi |

---

## 🗄️ Arsitektur Database Dual-Mode

Aplikasi ini menggunakan pola **Dual-Mode Adapter** pada [`src/lib/db.ts`](file:///f:/Projects/Smart-Pemira-PoltekCWE/src/lib/db.ts):

```mermaid
flowchart LR
    App["Next.js App"] -->|Deteksi Environment| Resolver{"Ada TURSO_DATABASE_URL?"}
    Resolver -->|Tidak (Offline/Dev)| SQLite["SQLite Lokal (db/custom.db)"]
    Resolver -->|Ya (Produksi/Vercel)| Turso["Turso LibSQL Cloud (Serverless Persistent)"]
```

- **Pengembangan Lokal**: Aplikasi otomatis membaca file lokal `db/custom.db` tanpa memerlukan koneksi internet.
- **Produksi di Vercel**: Begitu variabel `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` dipasang di Vercel, Prisma langsung beralih menggunakan koneksi cloud Turso tanpa mengubah kode atau skema.

---

## 🚀 Memulai di Komputer Lokal

### Prasyarat
- [Node.js](https://nodejs.org/) v20.x atau v22.x+
- `npm` atau `pnpm`

### Langkah Instalasi
1. Clone repositori:
   ```bash
   git clone https://github.com/felichpehagasaginting-code/SmartPemira-PoltekCWE.git
   cd SmartPemira-PoltekCWE
   ```
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Siapkan file environment [`.env`](file:///f:/Projects/Smart-Pemira-PoltekCWE/.env):
   ```env
   DATABASE_URL="file:../db/custom.db"
   ```
4. Generate Prisma Client & Inisialisasi Database:
   ```bash
   npx prisma generate
   npm run db:seed
   ```
5. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
6. Buka browser di [http://localhost:3000](http://localhost:3000).

---

## ☁️ Deployment ke Vercel + Turso

Panduan lengkap deployment gratis langkah demi langkah tersedia di:
📄 **[`DEPLOYMENT.md`](file:///f:/Projects/Smart-Pemira-PoltekCWE/DEPLOYMENT.md)**

Secara singkat:
1. Buat database gratis di **[Turso](https://turso.tech)**.
2. Push skema & data awal dengan:
   ```bash
   npm run db:turso:push
   ```
3. Import repositori ke **[Vercel](https://vercel.com)** dan pasang environment variables:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `DATABASE_URL`
4. Deploy!

---

## 👥 Akun Operator Demo

Di halaman login tersedia tombol klik-untuk-isi cepat untuk mencoba semua peran sistem:

| Peran | Username | Password | Ruang Lingkup Kewenangan |
|---|---|---|---|
| **ITPO** | `itpo` | `itpo123` | Administrator Sistem, Monitoring, Reset & Arsip Pemilu |
| **KPUM** | `kpum` | `kpum123` | Dashboard Utama, Import DPT, Pleno Unlock, Berita Acara |
| **PPUR** | `ppur` | `ppur123` | Pos Bantuan, Verifikasi Identitas & Penerbitan Token Pemilih |
| **PANWASLU** | `panwaslu` | `panwaslu123` | Pengawasan Real-Time, Audit Trail Kriptografi, Penanganan Sengketa |
| **SAKSI** | `saksi01` | `saksi123` | Saksi Paslon (Monitoring turnout & hash chain read-only) |

*Catatan: Bilik Suara (Kiosk) dapat diakses pemilih secara independen menggunakan token 6-karakter acak yang diterbitkan oleh petugas PPUR.*

---

## 🧪 Pengujian & Jaminan Kualitas

Untuk menjalankan seluruh test suite otomatis:

```bash
# Menjalankan seluruh unit test (Vitest)
npm test

# Menjalankan build produksi
npm run build
```

---

## 📁 Struktur Direktori

```text
├── prisma/
│   └── schema.prisma         # Skema database Zero-Knowledge & RBAC
├── db/
│   └── custom.db             # File database SQLite lokal
├── src/
│   ├── app/                  # Next.js 16 App Router (Halaman & API Routes)
│   │   ├── api/              # API Endpoint (Auth, Kiosk, PPUR, Tally, Monitor)
│   │   ├── cek-struk/        # Halaman verifikasi struk pemilih
│   │   ├── verify/           # Verifikasi publik Berita Acara Ed25519
│   │   └── page.tsx          # Shell antarmuka multi-terminal
│   ├── components/           # Komponen UI Modular
│   │   ├── auth/             # Login Screen & 2FA Panel
│   │   ├── kiosk/            # Bilik Suara Digital (Wizard 3 Surat Suara)
│   │   ├── kpum/             # Dashboard KPUM & Berita Acara Model C-KWE
│   │   ├── pleno/            # Monitor Pengawasan Panwaslu & Alert Center
│   │   ├── ppur/             # Meja Pencarian DPT & Slip Token
│   │   └── public-portal/    # Portal Publik & Profil Kandidat
│   ├── hooks/                # Custom hooks (SSE, polling, mobile)
│   └── lib/                  # Logika bisnis, server auth, kriptografi & Prisma
├── scripts/
│   ├── seed.ts               # Seeding data demo (DPT, kandidat, rantai hash)
│   ├── push-turso.ts         # Skrip otomatis migrasi DDL & seed ke Turso
│   └── ba-keygen.ts          # Utilitas rotasi kunci Ed25519
├── tests/                    # Unit testing suite (Vitest)
├── DEPLOYMENT.md             # Panduan deployment Vercel + Turso
└── README.md                 # Dokumentasi utama proyek
```

---

© 2026 Komisi Pemilihan Umum Mahasiswa (KPUM) & Tim ITPO — Politeknik Kelapa Sawit Citra Widya Edukasi.
