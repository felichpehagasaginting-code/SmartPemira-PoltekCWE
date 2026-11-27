# DOKUMEN PENGUJIAN PERANGKAT LUNAK (STP / STD / UAT)
## SISTEM E-VOTING SMART PEMIRA — POLITEKNIK KELAPA SAWIT CITRA WIDYA EDUKASI

**Dokumen Referensi**: SP-CWE-DOC-09  
**Klasifikasi**: Dokumen Pengujian Kualitas (*Quality Assurance & Security Verification*)  
**Versi**: 1.0.0  
**Target Sistem**: Next.js 16 (App Router) + Prisma ORM + Turso LibSQL Cloud  

---

## 1. Tujuan & Ruang Lingkup Pengujian

Dokumen ini merangkum strategi pengujian (*Software Test Plan*), skenario uji fungsional (*Black-Box & User Acceptance Testing*), serta pengujian otomatis (*Unit, Integration, Smoke,* dan *Load Test*) untuk memastikan sistem **Smart Pemira Poltek CWE** siap digunakan secara stabil, aman, dan berintegritas pada Hari-H Pemira.

Cakupan utama pengujian meliputi:
1. **Integritas Kriptografi & Zero-Knowledge**: Pemisahan mutlak identitas pemilih (`Voter`) dan kotak suara (`BallotBox`), rantai hash `SHA-256`, tanda tangan digital `Ed25519`, serta *2FA TOTP* terenkripsi `AES-256-GCM`.
2. **Alur Pemilu 100% Online (BYOD)**: Penerbitan token PPUR, pencoblosan 3 surat suara (DPM, PRESMA, HIMA) + opsi Suara Kosong, model *Re-vote Estonia*, dan *Kunci Suaraku*.
3. **Manajemen Paslon & BLOB Storage**: CRUD Paslon dan pengunggahan foto potret 3:4 terkompresi WebP ke tabel `CandidatePhoto`.
4. **Ketahanan Beban & Keamanan**: *Rate limiter* ramah NAT Wi-Fi kampus (`campusNatLimit`), *Emergency Freeze* (`HTTP 423`), dan konsistensi rantai hash pada trafik bersamaan.

---

## 2. Pengujian Otomatis (*Unit & Integration Tests*)

Pengujian otomatis dijalankan menggunakan **Vitest** (`npm test`) terhadap berkas pengujian di direktori `tests/`:

| Berkas Pengujian | Fokus Modul & Verifikasi | Cakupan Utama |
| :--- | :--- | :--- |
| `tests/ballot-service.test.ts` | Transaksi atomik pemungutan suara | Validasi token, pembersihan `pendingTokenHash`, penulisan `BallotBox` dengan *time jitter*, *re-vote* Estonia (`voteVersion`), dan *Kunci Suaraku*. |
| `tests/hash-chain.test.ts` | Rantai integritas `SHA-256` per prodi | Verifikasi konsistensi blok genesis hingga blok terakhir serta deteksi *tampering* bila satu blok diubah. |
| `tests/token.test.ts` | Generator token CSPRNG 6 karakter | Entropi token, hashing `SHA-256` token, dan kedaluwarsa TTL (10 menit). |
| `tests/totp.test.ts` | Autentikasi 2FA TOTP (RFC 6238) | Enkripsi secret `AES-256-GCM`, verifikasi kode OTP 6 digit, dan penggunaan *backup codes* sekali pakai. |
| `tests/ba-signing.test.ts` | Tanda tangan digital Berita Acara | Kanonikal payload Berita Acara Model C-KWE dan verifikasi tanda tangan `Ed25519` (RFC 8032). |
| `tests/multisig.test.ts` | Multi-signature Pleno | Pengumpulan tanda tangan elektronik KPUM, Panwaslu, dan Saksi pada dokumen Berita Acara. |
| `tests/panwaslu-triage.test.ts` | Manajemen sengketa & triage | Pelaporan insiden (`ElectionIncident`), nomor tiket unik, dan pembaruan status penanganan Panwaslu. |
| `tests/alerts.test.ts` | Pusat peringatan (*Alert Center*) | Evaluasi otomatis kondisi *freeze*, anomali login, kepatuhan 2FA, dan integritas rantai. |
| `tests/rate-limit.test.ts` | Pembatas laju ramah NAT kampus | Pengujian batas agregat IP kampus vs pembatasan ketat per-token agar tidak terjadi *false HTTP 429*. |
| `tests/receipt.test.ts` | Verifikasi struk suara digital | Pencocokan kode struk pemilih tanpa membocorkan pilihan kandidat. |

### Perintah Eksekusi Pengujian Otomatis
```bash
# 1. Jalankan seluruh unit & integration tests (Vitest)
npm test

# 2. Jalankan smoke test alur end-to-end
npm run test:smoke

# 3. Jalankan simulasi beban (Load Test)
npm run test:load
```

---

## 3. Pengujian Beban (*Load & Stress Testing*)

Pengujian beban disiapkan melalui dua skenario di repositori:
1. **Skrip Load Test Internal (`scripts/load-test.ts`)**: Menguji ketahanan transaksi database saat puluhan hingga ratusan pemilih mengirimkan suara secara bersamaan, memverifikasi tidak terjadinya *hash-chain fork* pada kelima rantai prodi (`TPTP`, `TPHP`, `MANLOG`, `BD`, `TRPL`).
2. **Skrip k6 (`tests/k6-ballot-submit.js`)**: Menguji latensi endpoint `/api/pemilih/validate` dan `/api/pemilih/submit` di bawah beban konkuren.

---

## 4. Matriks Skenario UAT (*User Acceptance Testing* — Black-Box)

Daftar periksa verifikasi manual yang wajib dijalankan bersama **KPUM, Panwaslu, PPUR, dan ITPO** pada H-1 sebelum gerbang voting dibuka:

| ID Uji | Modul / Aktor | Skenario Pengujian | Ekspektasi Hasil | Status |
| :--- | :--- | :--- | :--- | :---: |
| **UAT-01** | **RBAC & Login (`/`)** | Login masing-masing akun (`itpo`, `kpum`, `ppur`, `panwaslu`, `saksi01`) | Diarahkan otomatis ke terminal sesuai peran; endpoint peran lain mengembalikan `403 Forbidden`. | [ ] |
| **UAT-02** | **Keamanan 2FA & Sandi** | Ganti sandi default via menu **SANDI** dan aktifkan **2FA TOTP** pada akun `kpum` & `itpo` | Login berikutnya meminta kode 6 digit TOTP dari aplikasi Authenticator. | [ ] |
| **UAT-03** | **CRUD Paslon & Foto BLOB** | Di tab **Kandidat** KPUM, tambah/edit paslon lalu unggah foto JPG/PNG (>2MB) untuk Ketua & Wakil | Foto otomatis terkompresi WebP 3:4, tersimpan di `CandidatePhoto`, dan langsung tampil di `/pemilih` & Portal Publik. | [ ] |
| **UAT-04** | **Import DPT CSV** | Di tab **Manajemen DPT** KPUM, unggah daftar mahasiswa ber-NIM format CSV | Mahasiswa baru masuk dengan status `BELUM_MEMILIH`; NIM duplikat ditolak aman. | [ ] |
| **UAT-05** | **Meja PPUR & Token QR** | PPUR verifikasi NIM pemilih `BELUM_MEMILIH` lalu klik **TERBITKAN TOKEN + QR** | Muncul slip token 6 karakter + QR Code; status pemilih berubah menjadi `DALAM_ANTREAN`. | [ ] |
| **UAT-06** | **Pemilih BYOD & Suara Kosong** | Buka `/pemilih`, masukkan token, pilih paslon DPM & BEM serta **Suara Kosong** di HIMA, lalu kirim | Suara tersimpan di 3 surat suara; muncul **Struk Digital** berkode verifikasi; status menjadi `SUDAH_MEMILIH`. | [ ] |
| **UAT-07** | **Model Re-vote Estonia** | Masukkan kembali token yang sama sebelum `votingOpen = false`, ubah pilihan, lalu klik **KUNCI SUARAKU** | Suara tercatat sebagai `voteVersion = 2`; setelah dikunci, token berstatus `LOCKED` dan tidak bisa dipakai lagi. | [ ] |
| **UAT-08** | **Emergency Freeze** | Panwaslu/KPUM menekan **AKTIFKAN EMERGENCY FREEZE** | Akses bilik `/pemilih` langsung diblokir dengan pesan `HTTP 423 Locked` dalam hitungan detik. | [ ] |
| **UAT-09** | **Pleno & Berita Acara C-KWE** | KPUM menutup voting lalu menekan **BUKA BRANKAS SIDANG PLENO** | Hasil *tally* 5 prodi terbuka, *Multisig Ed25519* dapat ditandatangani, dan PDF Berita Acara + QR terunduh rapi. | [ ] |
| **UAT-10** | **Cek Struk & Verifikasi Publik** | Buka `/cek-struk` dan `/verify` dengan kode struk & tanda tangan BA | Sistem menyatakan struk/dokumen **SAH** tanpa menampilkan nama paslon yang dipilih. | [ ] |
