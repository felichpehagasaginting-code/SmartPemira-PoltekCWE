# 10 Rekomendasi Upgrade Smart Pemira — Roadmap Prioritas

Disusun setelah audit faktual kode (Task 18): setiap item terverifikasi **belum ada** di codebase per hari ini.

## Ringkasan

| # | Upgrade | Prioritas | Upaya |
|---|---------|-----------|-------|
| 1 | Backup otomatis + disaster recovery + arsip kedap-cetak | P0 | 1–2 hari |
| 2 | Tanda tangan kriptografi Ed25519 untuk hasil & BA | P0 | 2–3 hari |
| 3 | 2FA TOTP untuk KPUM & ITPO | P0 | 1 hari |
| 4 | Validasi input terpusat dengan Zod | P1 | 1–1,5 hari |
| 5 | Hardening produksi: middleware + CSP + Origin check + cookie `__Host-` | P1 | 1 hari |
| 6 | Unit test invariant inti dengan Vitest | P1 | 1,5–2 hari |
| 7 | Observabilitas & alerting proaktif (Telegram/WA) | P1 | 1–1,5 hari |
| 8 | Tuning SQLite (WAL) + stress test sebagai gerbang hari-H | P2 | 0,5–1 hari |
| 9 | Dasbor turnout & antrean operasional untuk PPUR | P2 | 1–1,5 hari |
| 10 | Aksesibilitas WCAG 2.1 AA + mode bantu pemilih | P2 | 1,5–2 hari |

---

## 1. Backup otomatis + disaster recovery + arsip kedap-cetak — P0

**Fakta:** seluruh bukti suara hidup di satu file `db/custom.db` (184 KB). Grep `backup`/`VACUUM INTO` di seluruh repo = **0 hasil**. Satu kerusakan disk atau reset keliru (route `/api/itpo/reset` ada di produksi!) berarti bukti pemilu hilang permanen.

**Solusi:**
- Skrip backup berkala via `VACUUM INTO` (snapshot konsisten tanpa henti layanan), dipicu cron lokal + webhook otomatis **sebelum** dan **sesudah** aksi segel/reset — momen paling berisiko.
- Retensi 3 generasi: lokal, `/home/z/my-project/download/`, arsip zip per periode (mengikat `periodLabel`).
- Restore drill: satu perintah yang membuktikan snapshot bisa dibuka Prisma dan hash chain-nya utuh.
- Saat segel: ekspor otomatis hasil per prodi (CSV/Excel) + BA PDF ke folder arsip.

**Kenapa nomor 1:** semua rekomendasi lain bermakna karena datanya ada. Ini biaya kecil (1–2 hari) menghapus risiko fatal tunggal.

## 2. Tanda tangan kriptografi Ed25519 untuk hasil & BA — P0

**Fakta:** integritas saat ini bertumpu pada hash chain SHA-256 + QR struk — keduanya **hanya bisa diverifikasi di dalam server yang sama**. Grep `createSign`/`generateKeyPair`/`ed25519` = **0 hasil**. Tidak ada kunci publik independen; kepercayaan berhenti di "percaya admin server".

**Solusi:**
- Saat segel: generate keypair Ed25519 (Node `crypto.generateKeyPairSync('ed25519')`), publik key dicetak di BA dan dipublikasikan di portal; private key di-shamir-split antara Ketua KPUM + Panwaslu (masing-masing separuh) lalu dihapus dari server.
- Tandatangani: canonical tally per kategori (sudah ada `ba-canonical.ts` sebagai basis), head tiap rantai hash, dan BA PDF.
- Portal publik: verifikasi signature + walk hash chain dari struk → bukti suara masuk rantai → rantai tanda tangan kunci periode. Rantai kepercayaan jadi lengkap tanpa percaya server.

**Kenapa:** ini pembeda e-voting kredibel vs aplikasi hitung biasa; PRD 4.1 sudah menuntut verifiability — langkah ini menyelesaikannya sampai akar.

## 3. 2FA TOTP untuk KPUM & ITPO — P0

**Fakta:** satu password menggerakkan dua peran paling berkuasa: KPUM (segel, buka pleno) dan ITPO (reset pemira, reset password operator). Route reset sudah punya rate limit, tapi tetap single-factor.

**Solusi:** TOTP standar (RFC 6238, paket `otplib`) — enrol via QR di dialog ganti password, wajib untuk KPUM/ITPO, opsional untuk lainnya; simpan secret terenkripsi; sediakan 8 kode cadangan sekali pakai. Komponen OTP (`input-otp`) sudah ada di UI untuk pemilih — dipakai ulang.

**Kenapa:** dampak keamanan terbesar per baris kode; pola standar industri yang mudah dijelaskan ke auditasi kampus.

## 4. Validasi input terpusat dengan Zod — P1

**Fakta:** `zod@4` terpasang, tapi grep `z.object` di `src/app/api/**` = **0 hasil** — semua route memvalidasi manual (`String(body?.token ?? "").trim()` di `pemilih/submit`), dengan gaya berbeda tiap penulis.

**Solusi:** schema per endpoint di `src/lib/schemas/` (token, submit ballot, import DPT, operator CRUD, settings), `safeParse` di boundary API, peta error standar (kode + field), tolak unknown key, batas ukuran payload. Client `react-hook-form` + `@hookform/resolvers` sudah terpasang — schema yang sama bisa dipakai lintas sisi.

**Kenapa:** menutup kelas bug validasi (panjang/format/hidden field) sekaligus memangkas kode berulang ~15 route; prasyarat item 6 (test jadi ringkas).

## 5. Hardening produksi: middleware + CSP + Origin check + cookie `__Host-` — P1

**Fakta:** tidak ada `middleware.ts` (tiap route menjaga dirinya sendiri); CSP ketat sengaja ditunda (komentar `next.config.ts`); cookie sesi `sameSite: "lax"` tanpa prefix; tidak ada pemeriksaan Origin pada mutasi.

**Solusi:** `middleware.ts` tunggal: (a) tolak POST mutasi bila header Origin bukan origin sendiri (anti-CSRF kuat di atas `lax`), (b) CSP nonce di produksi (`middleware` Next.js mendukung nonce per-request) sehingga header frame-blocking ketat bisa aktif tanpa merusak dev/preview, (c) ganti nama cookie ke `__Host-pemira_session` (kunci ke path/`Secure`).

**Kenapa:** menutup tiga kelas serangan (CSRF, XSS-injection, cookie-fixation) dengan satu lapisan konsisten; semua pola resmi Next.js 16.

## 6. Unit test invariant inti dengan Vitest — P1

**Fakta:** CI (`ci.yml`) jalan, tapi hanya memanggil e2e script custom (`scripts/e2e-*.ts`) yang lambat dan butuh server hidup. Logika jantung — hash chain, last-vote-wins Estonia, satu-token-sekali, lockout eksponensial, determinisme receipt — **belum punya test mikro**. Folder `tests/` hanya berisi shell script runtime.

**Solusi:** Vitest + SQLite in-memory; suite invariant: (1) chain tidak pernah terputus meski submit paralel, (2) re-vote mengganti suara lama tanpa menduplikasi, (3) token bekas pakai ditolak di semua jalur (BYOD/kiosk), (4) receipt = fungsi deterministik ballotHash, (5) lockout naik eksponensial & reset benar. Dijalankan di CI yang sudah ada (+ langkah coverage).

**Kenapa:** invariant inilah janji kepercayaan sistem; test mikro detik-detik mengusir regresi saat refactor item 4–5.

## 7. Observabilitas & alerting proaktif — P1

**Fakta:** SSE monitor bagus untuk yang sedang menonton; `/api/health` sudah antar metrik — tapi **tidak ada yang bersuara** saat anomali terjadi (spike suara, lockout massal, rantai putus, 5xx).

**Solusi:** logger terstruktur (pino) + modul aturan di atas data yang sudah ada: ambang vote-rate tak wajar, ≥5 lockout/menit, mismatch chain, error rate → notifikasi webhook Telegram/WA ke grup panitia + kartu insiden otomatis di `ElectionIncident`. Tanpa layanan eksternal berbayar.

**Kenapa:** hari-H, jeda deteksi 10 menit = antrean ribuan mahasiswa; alert menit-ke-menit murah dan langsung terpakai.

## 8. Tuning SQLite + stress test sebagai gerbang hari-H — P2

**Fakta:** WAL/busy_timeout belum disetel (grep 0); `load-test.ts` ada tapi belum jadi standar kelulusan.

**Solusi:** pragma koneksi Prisma (`PRAGMA journal_mode=WAL; synchronous=NORMAL; busy_timeout=5000`) — submit paralel tak lagi saling antre tulis; perluas load-test jadi skenario resmi: 300 pemilih BYOD dalam 5 menit + 8 kiosk bersamaan, SLO p95 submit < 800 ms; jalankan sebagai **gate wajib** sebelum segel dibuka (catat hasilnya di BA).

**Kenapa:** upaya setengah hari, melindungi momen paling politis: puncak antrean siang hari-H.

## 9. Dasbor turnout & antrean operasional untuk PPUR — P2

**Fakta:** data sudah lengkap (`Voter.status`, `votedAt`, `StudyProgram`, `Tps`) tapi overview admin hanya mengirim daftar prodi — belum ada senjata mobilisasi.

**Solusi:** panel PPUR: turnout per prodi/angkatan real-time (leaderboard), sparkline per 15 menit, prodi tertinggal vs DPT, estimasi selesai antrean per TPS, rekomendasi target blitz. Reuse SSE yang sudah jalan.

**Kenapa:** satu-satunya rekomendasi yang langsung menaikkan metrik utama pemira: partisipasi; KPU kampus modern memakai ini untuk blitz jam-ke-jam.

## 10. Aksesibilitas WCAG 2.1 AA + mode bantu pemilih — P2

**Fakta:** `aria-*` sebagian ada di `pemilih-portal` & `kiosk-terminal`, tapi belum ada audit sistematis: keyboard-only, screen reader, kontras, ukuran teks.

**Solusi:** audit axe-core + manual; fokus trap benar di wizard suara; mode teks besar & kontras tinggi tersimpan persist; kiosk: navigasi tombol fisik/keyboard, label langkah yang dibaca screen reader; sertakan laporan aksesibilitas ringkas sebagai lampiran BA.

**Kenapa:** mahasiswa disabilitas punya hak suara yang sama — kepatuhan sekaligus citra kampus; temuan a11y biasanya murah diperbaiki jika dicek sebelum hari-H.

---

### Catatan kecil (di luar 10 besar)
- `next-auth` dan `next-intl` terpasang tapi tak terpakai — hapus untuk memangkas attack surface & ukuran build.
- Dukungan bilingual (next-intl sudah terpasang) bisa jadi bonus setelah item 4, karena schema error terpusat memudahkan terjemahan.
- Runbook hari-H (panduan 1 halaman per peran) sebaiknya ditulis bersamaan dengan restore drill di item 1.
