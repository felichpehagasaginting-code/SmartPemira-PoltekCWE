# BUKU SAKU & PANDUAN PENGGUNA SMART PEMIRA POLTEK CWE
## Panduan Praktis Pemilih (Mahasiswa) dan Petugas Panitia Pemira

**Dokumen Referensi**: SP-CWE-DOC-10  
**Klasifikasi**: Panduan Pengguna Akhir (*End-User Manual*)  
**Versi**: 1.0.0  

---

## BAGIAN A — PANDUAN UNTUK PEMILIH (MAHASISWA)

Pemira Poltek CWE dilaksanakan **100% online** menggunakan gawai (*smartphone*/laptop) masing-masing mahasiswa (**BYOD — *Bring Your Own Device***).

### 1. Cara Mendapatkan Token Pemilihan
1. Datangi **Pos Bantuan PPUR** (atau layanan verifikasi resmi panitia) dengan membawa **KTM / KRS / KTP aktif**.
2. Petugas PPUR akan mencocokkan NIM Anda pada Daftar Pemilih Tetap (DPT).
3. Anda akan menerima **Slip Token 6 Karakter** (atau kode QR) yang berlaku selama **10 menit** untuk masuk ke bilik suara.

### 2. Cara Mencoblos di Bilik Suara (`/pemilih`)
1. Buka peramban (Chrome/Safari) di HP Anda dan kunjungi alamat portal pemilih:
   - `[URL_APLIKASI]/pemilih` (atau langsung pindai **QR Code** dari slip token).
2. Masukkan **Token 6 Karakter** lalu tekan **Masuk ke Bilik Suara**.
3. Anda akan melewati **3 tahap surat suara** secara berurutan:
   - **Surat Suara 1 — DPM**: Pilih pasangan calon pimpinan DPM atau pilih **Suara Kosong** di kartu terakhir.
   - **Surat Suara 2 — BEM / PRESMA**: Pilih pasangan calon Presma & Wapresma atau **Suara Kosong**.
   - **Surat Suara 3 — HIMA Prodi**: Otomatis menampilkan kandidat Hima sesuai Program Studi Anda (TPTP, TPHP, MANLOG, BD, atau TRPL), atau **Suara Kosong**.
4. Pada halaman **Tinjauan Pilihan**, periksa kembali seluruh pilihan Anda lalu tekan **KIRIM SUARA SEKARANG**.
5. Simpan atau tangkap layar (*screenshot*) **Struk Suara Digital** (contoh: `VOTE-TRPL-XXXXXX-2026`) sebagai bukti sah partisipasi.

### 3. Fitur Ganti Pilihan (*Re-vote Estonia*) & Kunci Suaraku
- **Mengubah Pilihan (*Re-vote*)**: Apabila sebelum jam pemungutan ditutup Anda merasa ragu atau sempat mendapat tekanan pihak lain, Anda dapat membuka kembali `/pemilih` dengan **token yang sama** untuk mengganti pilihan. Sistem otomatis menghitung **suara terakhir Anda yang sah** (*latest-ballot-wins*).
- **Kunci Suaraku (Final)**: Jika Anda sudah 100% yakin dengan pilihan Anda, tekan tombol **KUNCI SUARAKU (FINAL)** pada halaman struk agar token tidak bisa digunakan lagi oleh siapa pun.

### 4. Cara Memverifikasi Struk & Berita Acara
- Buka **`/cek-struk`** dan masukkan kode struk digital Anda untuk memastikan suara Anda benar-benar tercatat di rantai hash prodi (tanpa membocorkan siapa yang Anda pilih).
- Buka **`/verify`** (atau pindai QR pada Berita Acara Model C-KWE) untuk memverifikasi keaslian tanda tangan digital **Ed25519** hasil pleno.

---

## BAGIAN B — PANDUAN UNTUK PETUGAS PANITIA (RBAC)

Seluruh petugas mengakses sistem melalui **satu gerbang login utama** di halaman depan (`/`). Setelah login, menu di bilah atas otomatis menyesuaikan hak akses peran Anda.

### 1. Petugas Meja PPUR (`ppur`)
- **Menerbitkan Token**: Cari nama atau NIM mahasiswa di kolom pencarian DPT. Jika status masih **`BELUM_MEMILIH`**, klik **TERBITKAN TOKEN + QR** dan berikan kode/QR kepada mahasiswa.
- **Mencabut Token Bermasalah**: Jika slip token hilang atau HP mahasiswa bermasalah sebelum mencoblos (`DALAM_ANTREAN`), klik **Cabut Token** agar hak pilih kembali ke `BELUM_MEMILIH` dan token baru dapat diterbitkan.

### 2. Komisioner KPUM (`kpum`)
- **Manajemen Kandidat & Upload Foto Paslon (BLOB)**:
  1. Buka tab **Kandidat**.
  2. Klik **+ Tambah Paslon Baru** untuk mendaftarkan paslon baru, atau klik **Kelola & Foto** pada kartu paslon yang sudah ada.
  3. Di tab **Profil & Visi Misi**, lengkapi nomor urut, nama Ketua/Presma, Wakil, Ketua 2 (khusus DPM), visi, dan misi.
  4. Di tab **Foto Anggota Paslon (BLOB)**, klik **Unggah Foto** / **Ganti Foto** per peran. Sistem otomatis memotong dan mengompresi foto ke rasio **3:4 WebP (~50 KB)** sebelum menyimpannya ke Turso Cloud.
- **Manajemen DPT**: Buka tab **Manajemen DPT** untuk mengimpor data mahasiswa secara massal menggunakan format CSV.
- **Kontrol Tahapan & Pleno**: Buka tab **Tahapan & Pleno** untuk membuka/menutup pemungutan suara, mengaktifkan *Emergency Freeze*, dan menekan **BUKA BRANKAS SIDANG PLENO** setelah pemungutan selesai.
- **Berita Acara**: Buka tab **Berita Acara** setelah pleno terbuka untuk melihat rekapitulasi Model C-KWE, QR verifikasi, dan mencetak/ekspor PDF.

### 3. Panwaslu (`panwaslu`) & Saksi (`saksi01`)
- **Monitor Real-Time**: Pantau grafik partisipasi, log audit *append-only* (tanpa pilihan suara), dan keutuhan **5 Rantai Hash SHA-256** prodi secara langsung.
- **Penanganan Sengketa & Emergency Freeze**: Tindak lanjuti tiket laporan pelanggaran mahasiswa dan aktifkan **Emergency Freeze** apabila terjadi pelanggaran serius di lapangan.
- **Tanda Tangan Pleno (*Multisig*)**: Setelah pemungutan ditutup, berikan persetujuan tanda tangan digital pada dokumen Berita Acara Model C-KWE.

### 4. Administrator Teknis / ITPO (`itpo`)
- Memiliki akses ke tab **Manajemen Operator** untuk membuat akun petugas baru, mereset sandi sementara petugas, melihat log keamanan login, serta mengeksekusi **Segel & Reset Periode** setelah sidang pleno selesai dan arsip diamankan.
- **Wajib Pra-Hari-H**: Ingatkan seluruh petugas untuk mengganti sandi default melalui tombol **SANDI** di pojok kanan atas dan mengaktifkan **2FA TOTP**.
