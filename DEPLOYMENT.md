# Panduan Deployment Smart Pemira (Turso + Vercel)

Panduan langkah demi langkah mendeploy **Smart Pemira — Poltek CWE** secara gratis menggunakan **Turso** (SQLite Cloud) dan **Vercel** (Serverless Next.js Hosting).

---

## 1. Buat Database di Turso (Gratis)

1. Buka [turso.tech](https://turso.tech) dan masuk (*Sign in*) menggunakan akun GitHub Anda.
2. Di dashboard Turso, klik **Create Database**:
   - Nama database: `smart-pemira` (atau bebas).
   - Pilih region terdekat (misalnya: `Singapore (sin)` atau `Tokyo (nrt)`).
3. Setelah database dibuat, buka tab **Connect** atau detail database untuk mendapatkan:
   - **Database URL**: contoh `libsql://smart-pemira-[org].turso.io`
   - **Auth Token**: klik tombol **Generate Token** / **Create Token**, lalu salin token yang muncul.

---

## 2. Inisialisasi Skema & Data ke Turso

Buka terminal di komputer Anda, lalu jalankan perintah berikut (ganti `<URL>` dan `<TOKEN>` dengan data dari Turso):

```bash
# Set environment variables sementara (PowerShell di Windows)
$env:DATABASE_URL="libsql://smart-pemira-[org].turso.io?authToken=<TOKEN>"
$env:TURSO_DATABASE_URL="libsql://smart-pemira-[org].turso.io"
$env:TURSO_AUTH_TOKEN="<TOKEN>"

# 1. Push struktur tabel ke Turso
npx prisma db push --accept-data-loss

# 2. Masukkan data awal (DPT, kandidat, akun operator demo)
npm run db:seed
```

*(Jika menggunakan Bash / Linux / macOS)*:
```bash
DATABASE_URL="libsql://smart-pemira-[org].turso.io?authToken=<TOKEN>" \
TURSO_DATABASE_URL="libsql://smart-pemira-[org].turso.io" \
TURSO_AUTH_TOKEN="<TOKEN>" \
npx prisma db push --accept-data-loss

DATABASE_URL="libsql://smart-pemira-[org].turso.io?authToken=<TOKEN>" \
TURSO_DATABASE_URL="libsql://smart-pemira-[org].turso.io" \
TURSO_AUTH_TOKEN="<TOKEN>" \
npm run db:seed
```

---

## 3. Deploy ke Vercel (Gratis)

1. Masuk ke [vercel.com](https://vercel.com) menggunakan akun GitHub Anda.
2. Klik tombol **Add New...** -> **Project**.
3. Pilih repositori **`SmartPemira-PoltekCWE`** dari daftar repositori GitHub Anda, lalu klik **Import**.
4. Pada bagian **Configure Project**:
   - **Framework Preset**: Biarkan otomatis `Next.js`.
   - **Root Directory**: `./` (default).
   - **Build Command**: `npm run vercel-build` (atau biarkan default).
5. Buka bagian **Environment Variables** dan tambahkan variabel berikut:

| Key | Value | Keterangan |
|---|---|---|
| `TURSO_DATABASE_URL` | `libsql://smart-pemira-[org].turso.io` | URL database Turso Anda |
| `TURSO_AUTH_TOKEN` | `<TOKEN_DARI_TURSO>` | Token autentikasi Turso |
| `DATABASE_URL` | `libsql://smart-pemira-[org].turso.io?authToken=<TOKEN>` | Connection string lengkap |

6. Klik tombol **Deploy**.
7. Tunggu build selesai (~1-2 menit). Vercel akan memberikan domain publik gratis, misalnya `https://smart-pemira-poltek-cwe.vercel.app`.

---

## 4. Verifikasi Setelah Deploy

1. Buka domain publik yang diberikan oleh Vercel.
2. Anda akan langsung diarahkan ke layar **Login Operator**:
   - Klik chip akun **KPUM** (`kpum` / `kpum123`) untuk memeriksa dashboard, DPT, dan Berita Acara.
   - Klik chip akun **PPUR** (`ppur` / `ppur123`) untuk mencoba alur penerbitan token pemilih.
   - Buka menu **Bilik Suara (Kiosk)** untuk mencoba pemungutan suara dengan token pemilih.
