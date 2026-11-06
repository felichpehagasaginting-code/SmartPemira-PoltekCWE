# Panduan Deployment Smart Pemira (Turso + Vercel)

Panduan langkah demi langkah mendeploy **Smart Pemira — Poltek CWE** secara gratis menggunakan **Turso** (SQLite Cloud) dan **Vercel** (Serverless Next.js Hosting).

---

## 1. Buat Database di Turso (Gratis)

1. Buka [turso.tech](https://turso.tech) dan masuk (*Sign in*) menggunakan akun GitHub Anda.
2. Di dashboard Turso, klik **Create Database**:
   - Nama database: `smart-pemira` (atau nama pilihan Anda).
   - Pilih lokasi server terdekat (misalnya: `Singapore (sin)`).
3. Setelah database dibuat, buka tab database untuk mendapatkan:
   - **Database URL**: contoh `libsql://smartpemira-[org].turso.io`
   - **Auth Token**: klik tombol **Create Token** / **Generate Token**, lalu salin token yang muncul.

---

## 2. Inisialisasi Skema & Data ke Turso

Project ini sudah dilengkapi skrip otomatis `scripts/push-turso.ts` yang menjalankan pembuatan tabel (DDL) dan pengisian data awal (seeding) sekaligus.

Jalankan perintah berikut di terminal komputer lokal Anda:

### PowerShell (Windows):
```powershell
$env:TURSO_DATABASE_URL="libsql://<NAMA-DB>-<ORG>.turso.io"
$env:TURSO_AUTH_TOKEN="<TOKEN_TURSO_ANDA>"

npm run db:turso:push
```

### Bash (macOS / Linux):
```bash
TURSO_DATABASE_URL="libsql://<NAMA-DB>-<ORG>.turso.io" \
TURSO_AUTH_TOKEN="<TOKEN_TURSO_ANDA>" \
npm run db:turso:push
```

Skrip ini akan secara otomatis:
1. Membaca `prisma/schema.prisma` dan menghasilkan DDL SQL.
2. Mengeksekusi pembuatan seluruh tabel dan indeks ke Turso cloud.
3. Melakukan seeding data awal (5 Program Studi, 5 TPS online dengan rantai hash, 14 Kandidat, 44 DPT Pemilih, dan akun operator demo).

---

## 3. Deploy ke Vercel (Gratis)

1. Masuk ke [vercel.com](https://vercel.com) menggunakan akun GitHub Anda.
2. Klik tombol **Add New...** -> **Project**.
3. Pilih repositori **`SmartPemira-PoltekCWE`** dari daftar repositori GitHub Anda, lalu klik **Import**.
4. Pada bagian **Configure Project**:
   - **Framework Preset**: `Next.js` (otomatis terdeteksi).
   - **Root Directory**: `./` (default).
   - **Build Command**: `npm run vercel-build` (atau biarkan default Vercel).
5. Buka bagian **Environment Variables** dan tambahkan 3 variabel berikut:

| Key | Value | Keterangan |
|---|---|---|
| `TURSO_DATABASE_URL` | `libsql://<NAMA-DB>-<ORG>.turso.io` | URL database Turso Anda |
| `TURSO_AUTH_TOKEN` | `<TOKEN_TURSO_ANDA>` | Token autentikasi Turso |
| `DATABASE_URL` | `libsql://<NAMA-DB>-<ORG>.turso.io?authToken=<TOKEN>` | Connection string lengkap |

6. Klik tombol **Deploy**.
7. Tunggu build selesai (~1-2 menit). Vercel akan memberikan domain publik gratis, misalnya `https://smartpemira-poltekcwe.vercel.app`.

---

## 4. Kredensial Akses & Verifikasi Pasca-Deploy

Setelah deployment sukses, buka domain Vercel yang diberikan. Sistem langsung siap digunakan dengan kredensial demo berikut:

| Peran | Username | Password | Deskripsi Tugas |
|---|---|---|---|
| **ITPO** | `itpo` | `itpo123` | Administrator Sistem, Monitoring, Reset & Arsip Pemilu |
| **KPUM** | `kpum` | `kpum123` | Dashboard Utama, Import DPT, Pleno Unlock, Berita Acara |
| **PPUR** | `ppur` | `ppur123` | Pos Bantuan, Verifikasi Identitas & Penerbitan Token Pemilih |
| **PANWASLU** | `panwaslu` | `panwaslu123` | Pengawasan Real-Time, Audit Trail Kriptografi, Penanganan Sengketa |
| **SAKSI** | `saksi01` | `saksi123` | Saksi Paslon (Monitoring turnout & hash chain read-only) |

> ℹ️ **Bilik Suara (Kiosk)** dapat diakses langsung oleh pemilih tanpa login operator melalui token 6-karakter acak yang diterbitkan oleh PPUR.
