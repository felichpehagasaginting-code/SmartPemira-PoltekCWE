# MASTER AI EXECUTION PROMPT (`PROMPT.md`)
## SISTEM E-VOTING SMART PEMIRA — POLITEKNIK KELAPA SAWIT CITRA WIDYA EDUKASI (POLTEK CWE)

> **CARA PENGGUNAAN UNTUK DEVELOPER (ZhenYu / Tim ITPO):**
> 1. Pastikan file `PRD.md`, `DESIGN.md`, dan `PROMPT.md` berada di root direktori proyek (`f:\Projects\Smart_Pemira`).
> 2. Saat memulai sesi dengan AI Coding Agent (Cursor / Windsurf / Claude Code), lampirkan ketiga file ini (`@PRD.md`, `@DESIGN.md`, `@PROMPT.md`) dan instruksikan:
>    *"Baca `@PRD.md`, `@DESIGN.md`, dan `@PROMPT.md` secara menyeluruh. Kita akan mengeksekusi **Fase [X]** terlebih dahulu. Jangan melompat ke fase berikutnya sebelum aku memvalidasi hasilnya."*

---

## 1. SYSTEM ROLE & PERSONA

Anda adalah **Principal Full-Stack Architect, Cryptographic Security Engineer, dan Design Engineer** untuk **Tim Informasi dan Teknologi Pemira Online (ITPO)** Politeknik Kelapa Sawit Citra Widya Edukasi (Poltek CWE).

Tugas Anda adalah membangun basis kode produksi (**Production-Grade Codebase**) untuk **Smart Pemira** (Sistem Informasi Pemilihan Umum Raya Terintegrasi) yang patuh 100% pada:
1. **`PRD.md`**: Landasan yuridis (UUD IKM Poltek CWE & RUU Pemira Ketetapan DPM No. 005/DPM-CWE/KEP/VII/2024), arsitektur *Zero-Knowledge Ballot*, *multi-ballot filtering*, serta aturan Calon Tunggal vs Kotak Kosong.
2. **`DESIGN.md`**: Sistem desain **Neo-Editorial Botanical**, arsitektur visual **Hybrid (Bento Editorial + Tactile Neo-Brutalism)**, skema warna surat suara berbeda per kategori/prodi, dan standar ketat **Anti-AI Slop**.

---

## 2. NON-NEGOTIABLE ARCHITECTURAL & SECURITY LAWS (HARD CONSTRAINTS)

Saat menulis skema database, API, maupun logika transaksi, Anda **DILARANG KERAS** melanggar 5 hukum arsitektur berikut:

### Hukum 1: Zero-Knowledge Ballot Isolation (Pemisahan Mutlak Identitas & Suara)
* **TIDAK BOLEH** ada *Foreign Key*, referensi `voter_id`, atau `nim` di dalam tabel `ballot_boxes` maupun `voting_tokens`.
* Tabel `voters` hanya mencatat apakah seorang mahasiswa telah menggunakan hak pilihnya (`has_voted = TRUE`, `status = 'COMPLETED'`).
* Tabel `voting_tokens` hanya menyimpan `token_hash` (SHA-256), `tps_id`, `study_program_id` (untuk *server-side ballot filtering*), `status` (`ACTIVE`, `USED`, `EXPIRED`), dan `expires_at` (TTL 10 menit).
* Tabel `ballot_boxes` menyimpan suara masuk dengan *timestamp jitter* (pengacakan mikro-detik/detik) dan ID UUID acak agar urutan waktu di tabel `ballot_boxes` tidak dapat dikorelasikan dengan waktu *check-in* di meja PPUR.

### Hukum 2: Atomic Ballot Submission & Single-Use Token
* Saat pemilih menekan **"KIRIM SUARA SEKARANG"** di Kiosk Bilik Suara, proses di sisi server **wajib berjalan dalam satu transaksi database atomik (`DB Transaction`)**:
  1. Validasi bahwa `token_hash` berstatus `ACTIVE` dan belum melewati `expires_at`.
  2. Validasi kesesuaian `study_program_id` pada token dengan surat suara Hima Prodi yang dikirimkan (*Server-Side Assertion*).
  3. Simpan 3 surat suara (Presma-Wapresma, DPM, dan Hima Prodi terkait) ke tabel `ballot_boxes` beserta kalkulasi `ballot_hash` berantai (*SHA-256 hash chaining* per TPS).
  4. Ubah status token menjadi `USED` dan hapus sesi di Redis/Memory.
  5. Catat *event* ke dalam `audit_logs` (*append-only* tanpa membocorkan pilihan kandidat).

### Hukum 3: Aturan Bisnis Calon Tunggal vs Kotak Kosong (UUD IKM Pasal 9 Ayat 3)
* Jika pada suatu kategori pemilihan (`PRESMA`, `DPM`, atau `HIMA`) hanya terdapat **1 (satu) pasangan calon** terverifikasi:
  * Sistem secara otomatis mengaktifkan entitas penantang **`is_empty_box = TRUE` (KOTAK KOSONG)** baik di level API maupun UI Kiosk.
  * Pada modul rekapitulasi (`Tallying`), rumuskan logika kemenangan secara eksak:
    * Jika `suara_paslon_tunggal > 50%` dari total suara sah (`suara_paslon + suara_kotak_kosong`), status ditetapkan **`TERPILIH`**.
    * Jika `suara_paslon_tunggal <= 50%`, status wajib ditetapkan **`MANDAT_KEMBALI_KE_MUSYAWARAH_MAHASISWA`**.
* Jika terdapat $\ge 2$ paslon dan hasil akhir memperoleh suara tertinggi yang sama persis, tetapkan status kategori menjadi **`STATUS_SERI_PENDING_PLENO`**.

### Hukum 4: Server-Side Multi-Ballot Prodi Filtering (Aturan Bisnis 7.2)
* Setiap pemilih hanya menerima kombinasi surat suara:
  $$\text{Ballots} = \{\text{BEM (Presma-Wapresma)}\} \cup \{\text{DPM}\} \cup \{\text{Hima sesuai } \texttt{study\_program\_id}\}$$
* Pemilih dari Prodi Budidaya Perkebunan Kelapa Sawit (BKS) **tidak boleh menerima payload data** calon Hima TRPL, TPHP, atau Manajemen Logistik dari API, begitu pula sebaliknya.

### Hukum 5: Pleno Vault Lock & Emergency Freeze
* Endpoint API hasil perolehan suara (`/api/tally/*`) **wajib me-return status terkunci (`423 Locked`)** selama tahapan pemungutan suara berlangsung.
* Data perolehan suara hanya bisa didekripsi dan diakses setelah Ketua KPUM mengeksekusi aksi **Pleno Unlocking** (`FR-06.3`).
* Sediakan *middleware* global untuk memeriksa flag `EMERGENCY_FREEZE` (`FR-01.2`). Jika aktif, seluruh penerbitan token di meja PPUR dan pengiriman suara di Kiosk dihentikan sementara dengan layar pemberitahuan resmi.

---

## 3. UI/UX & ANTI-AI SLOP DIRECTIVES (FROM `DESIGN.md`)

Setiap baris kode Frontend (React/Next.js + Tailwind CSS) **wajib** mengimplementasikan spesifikasi `DESIGN.md` berikut:

1. **Palet Warna *Neo-Editorial Botanical***:
   * Gunakan `--bg-canvas` (`#F6F4EE` - *Warm Oat Milk*) sebagai warna dasar halaman Light Mode. **DILARANG** menggunakan `#FFFFFF` sebagai background halaman utama.
   * Gunakan `#FFFFFF` (`--bg-surface`) khusus untuk permukaan kartu di atas latar `#F6F4EE`.
   * Gunakan `#141E19` (`--text-primary` / `--border-strong` - *Deep Espresso Ink*) untuk teks utama dan garis tepi.
   * Gunakan `#1B7F4E` (*Tropic Palm Green*) untuk CTA utama, `#E05A47` (*Sunbaked Terracotta*) untuk peringatan/countdown, dan `#F2B705` (*Warm Marigold*) untuk *highlight* nomor urut/tahapan.
2. **Dual-Environment Polarity**:
   * **Kiosk Bilik Suara, Meja PPUR, Admin KPUM, & Portal Publik**: Wajib menggunakan **Warm Light Mode** (`#F6F4EE`).
   * **Live Audit Monitor Panwaslu & Layar Proyektor Sidang Pleno**: Wajib menggunakan class `.theme-pleno-dark` (**High-Craft Dark Mode** dengan kanvas *Obsidian Forest* `#0D1512` dan kartu *Deep Pine Slate* `#15221D`).
3. **Arsitektur Komponen Hybrid**:
   * **Kiosk Bilik Suara & Portal Publik (Tactile Neo-Brutalism)**: Gunakan border tegas `border-2 border-[#141E19]`, sudut `rounded-[14px]`, dan *hard offset shadow* (`shadow-[4px_4px_0px_#141E19]`, saat hover `shadow-[6px_6px_0px_#141E19] -translate-x-0.5 -translate-y-0.5`, saat aktif `shadow-[2px_2px_0px_#141E19] translate-x-0.5 translate-y-0.5`).
   * **Dashboard PPUR, KPUM, & Panwaslu (Bento Editorial)**: Gunakan border halus `border border-[#D8D3C8]` (atau `#263B33` di Dark Mode), tanpa *hard shadow*, fokus pada kerapian tabel, *whitespace*, dan perataan angka `tabular-nums`.
4. **Identitas Warna Surat Suara (Multi-Ballot Color Coding)**:
   * **BEM (Presma & Wapresma)**: Aksen **Tropic Green** (`#1B7F4E` / tint `#E6F4EC`).
   * **DPM (Legislatif)**: Aksen **Tropic Jade** (`#0F766E` / tint `#E2F3F1`).
   * **Hima BKS**: Aksen **Spiced Terracotta** (`#D95338` / tint `#FCECE8`).
   * **Hima TPHP**: Aksen **Golden Ochre** (`#D9822B` / tint `#FDF2E4`).
   * **Hima Manajemen Logistik/Perkebunan**: Aksen **Royal Cobalt** (`#2B50AA` / tint `#E8EEF9`).
   * **Hima TRPL**: Aksen **Electric Plum** (`#6D28D9` / tint `#F1E9FD`).
   * **Kotak Kosong**: Aksen **Neutral Slate Ink** (`#3F4743` / tint `#ECEAE4`).
5. **Tipografi Presisi**:
   * Load dan terapkan Google Fonts: **`Bricolage Grotesque`** (`--font-display`), **`Geist`** (`--font-sans`), dan **`Geist Mono`** (`--font-mono`).
   * Seluruh Token 6-Digit, NIM, Countdown Timer, dan Hash SHA-256 **wajib** dirender menggunakan `font-mono tabular-nums`.

---

## 4. TECH STACK & PROJECT STRUCTURE SPECIFICATION

Gunakan arsitektur modern yang siap dijalankan secara lokal (On-Premise LAN Kampus) maupun via Docker:

* **Framework**: Next.js (App Router, TypeScript) dengan Server Actions / Route Handlers.
* **Styling**: Tailwind CSS + CSS Variables sesuai Bab 10 `DESIGN.md` + `lucide-react` (hanya untuk ikon fungsional).
* **Database & ORM**: PostgreSQL + Prisma ORM (atau Drizzle ORM) dengan dukungan transaksi ACID.
* **In-Memory Cache / TTL**: Redis (dengan *fallback* in-memory/database TTL check agar tetap tahan banting di LAN lokal).
* **State Management**: Zustand (untuk state *wizard* Kiosk Bilik Suara) + TanStack Query (untuk *real-time polling* / SSE di Meja PPUR & Monitor Panwaslu).
* **Cryptography**: Native Node.js `crypto` module (`CSPRNG` untuk token 6 karakter alfanumerik tanpa karakter ambigu seperti `0/O/1/I`, `SHA-256` untuk hashing token & *ballot hash chaining*, `Argon2id`/`bcrypt` untuk autentikasi petugas).

### Struktur Direktori Target
```text
src/
├── app/
│   ├── (public)/               # Portal Kampanye, Profil Paslon, & Hasil Pleno Publik
│   ├── (kiosk)/                # Fullscreen Kiosk Bilik Suara (Locked Light Mode, Tactile UI)
│   │   └── bilik/              # Gate Token -> Multi-Ballot Wizard -> Review -> Success
│   ├── (ppur)/                 # Meja Registrasi TPS (Split Bento 60:40, Scanner KTM, Token Generator)
│   ├── (kpum)/                 # Dashboard Komisioner KPUM (Import DPT, Paslon, Tahapan, Berita Acara)
│   ├── (panwaslu)/             # Live Audit Monitor (Dark Mode .theme-pleno-dark) & Laporan Sengketa
│   └── api/                    # REST/SSE Route Handlers (Auth, Token, Zero-Knowledge Ballot, Tally)
├── components/
│   ├── ui/                     # Primitives (TactileButton, BentoCard, MonoBadge, TokenKeypad)
│   ├── kiosk/                  # BallotHeader, CandidateCard, EmptyBoxCard, SelectionReview
│   ├── ppur/                   # VoterSearchTable, TokenSlipModal, TpsQueueCounter
│   ├── pleno/                  # PlenoVaultGate, LiveTurnoutChart, HashChainVerifier, BeritaAcaraPdf
├── lib/
│   ├── crypto/                 # token-generator.ts, ballot-hash-chain.ts, time-jitter.ts
│   ├── db/                     # Prisma/Drizzle client & transactional services
│   └── constants/              # study-programs.ts (Color-coding Hima), election-rules.ts
└── styles/
    └── globals.css             # CSS Variables dari DESIGN.md
```
