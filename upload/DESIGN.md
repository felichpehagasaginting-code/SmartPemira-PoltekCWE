# DESIGN SYSTEM & UI/UX SPECIFICATION (`DESIGN.md`)
## SISTEM E-VOTING SMART PEMIRA (SMART PEMILIHAN UMUM RAYA)
### Politeknik Kelapa Sawit Citra Widya Edukasi (Poltek CWE)

---

| Atribut Dokumen | Keterangan |
| :--- | :--- |
| **Nama Proyek** | Smart Pemira (Sistem Informasi Pemilihan Umum Raya Terintegrasi) |
| **Versi Desain** | 1.0.0 (Master Design System) |
| **Arah Estetika** | *Neo-Editorial Botanical* + *Hybrid Bento & Tactile Neo-Brutalism* |
| **Standar Kualitas** | *Anti-AI Slop*, *High-Craft UI*, WCAG AAA Contrast Compliance |
| **Referensi Dokumen** | `PRD.md` v1.0.0 (Ketetapan DPM No. 005/DPM-CWE/KEP/VII/2024) |
| **Target Implementasi** | Next.js / Vite + Tailwind CSS + Radix UI / Custom Primitives |

---

## DAFTAR ISI
1. [Filosofi Desain & Manifesto Anti-AI Slop](#1-filosofi-desain--manifesto-anti-ai-slop)
2. [Arsitektur Tema Ganda (Dual-Environment Theme)](#2-arsitektur-tema-ganda-dual-environment-theme)
3. [Sistem Warna & Token Palet (Neo-Editorial Botanical)](#3-sistem-warna--token-palet-neo-editorial-botanical)
4. [Color-Coding Surat Suara (Multi-Ballot Identity)](#4-color-coding-surat-suara-multi-ballot-identity)
5. [Tipografi & Hierarki Skala Teks](#5-tipografi--hierarki-skala-teks)
6. [Aturan Layout, Grid & Spasi](#6-aturan-layout-grid--spasi)
7. [Gaya Komponen Hybrid (Bento Editorial vs Tactile Neo-Brutalism)](#7-gaya-komponen-hybrid-bento-editorial-vs-tactile-neo-brutalism)
8. [Spesifikasi Antarmuka per Modul (End-to-End Screens)](#8-spesifikasi-antarmuka-per-modul-end-to-end-screens)
9. [Interaksi, Transisi & Micro-States](#9-interaksi-transisi--micro-states)
10. [Konfigurasi CSS Variables & Tailwind Token](#10-konfigurasi-css-variables--tailwind-token)

---

## 1. Filosofi Desain & Manifesto Anti-AI Slop

Desain **Smart Pemira Poltek CWE** dirancang untuk memancarkan **kredibilitas konstitusional**, **transparansi kriptografis**, dan **energi demokrasi mahasiswa Gen Z** yang segar, berani, serta berkelas.

### 1.1 Empat Pilar Estetika
1. **Warm Botanical Editorial**: Mengangkat identitas kampus kelapa sawit (Poltek CWE) ke level desain modern melalui kanvas kertas hangat (*Warm Oat Milk*), tinta hijau gelap pekat (*Deep Espresso Ink*), dan aksen tropis yang kaya—tanpa kesan kuno atau birokratis.
2. **Tactile Confidence pada Bilik Suara**: Memberikan sensasi fisik yang nyata saat mahasiswa mencoblos di layar sentuh (*Kiosk*). Tombol dan kartu kandidat menggunakan *crisp ink border* dan *tactile offset shadow* agar setiap ketukan terasa mantap, pasti, dan bebas salah pencet.
3. **Bento Clarity pada Dashboard**: Menyajikan data berdensitas tinggi di meja PPUR, KPUM, dan Panwaslu menggunakan *Bento Grid* yang bersih, terstruktur, dan bebas gangguan visual (*zero visual clutter*).
4. **Zero-Knowledge Transparency**: Menampilkan proses enkripsi suara, masa aktif token (TTL 10 menit), dan rantai hash (*SHA-256*) melalui tipografi *monospace* yang presisi sehingga menumbuhkan rasa percaya penuh pada sistem.

### 1.2 Pantangan Mutlak (Anti-AI Slop Rules)
Tim pengembang (ITPO) **dilarang keras** menggunakan pola visual generik berikut:
* ❌ **DILARANG** menggunakan gradasi biru-ungu/neon (*cyberpunk/SaaS AI gradients*) pada *background*, tombol, maupun teks.
* ❌ **DILARANG** menggunakan warna latar putih buta mutlak (`#FFFFFF`) sebagai kanvas utama halaman karena menyilaukan mata di bilik TPS. Gunakan `#FFFFFF` **hanya** untuk permukaan kartu (*elevated card surface*) di atas latar *Warm Oat Milk* (`#F6F4EE`).
* ❌ **DILARANG** menggunakan *blurry drop-shadow* tebal yang kotor (`box-shadow: 0 20px 25px rgba(0,0,0,0.15)`).
* ❌ **DILARANG** menggunakan *font* sistem membosankan tanpa kurasi atau memasang ikon dekoratif tanpa fungsi di setiap judul kartu.
* ❌ **DILARANG** membuat tampilan halaman yang seragam tanpa kontras ukuran tipografi antara judul utama, metrik angka, dan label pendukung.

---

## 2. Arsitektur Tema Ganda (Dual-Environment Theme)

Sesuai kebutuhan operasional lapangan pada Hari-H Pemungutan Suara dan Sidang Pleno, sistem mengimplementasikan **dua polaritas tema yang dikunci berdasarkan konteks ruang**:

| Lingkungan / Modul | Tema Default | Alasan Ergonomis & Visual |
| :--- | :--- | :--- |
| **1. Kiosk Bilik Suara (FR-05)** | **Warm Light Mode** (*Locked*) | Mencegah pantulan bayangan wajah pemilih di layar tablet/monitor TPS, menjaga keterbacaan foto paslon secara akurat, dan ramah bagi semua kondisi mata. |
| **2. Meja Registrasi PPUR (FR-04)** | **Warm Light Mode** (*Default*) | Ruangan TPS kampus memiliki pencahayaan terang; kanvas *Warm Oat Milk* mengurangi kelelahan mata panitia yang bertugas berjam-jam memverifikasi KTM. |
| **3. Portal Publik & Kampanye** | **Warm Light Mode** | Memberikan kesan inklusif, hangat, editorial, dan mudah dibaca di perangkat *mobile* mahasiswa. |
| **4. Dashboard Admin KPUM** | **Warm Light Mode** (*Switchable*) | Mengutamakan kejelasan tabel DPT, verifikasi berkas paslon, dan manajemen dokumen Berita Acara. |
| **5. Live Audit Panwaslu & Layar Sidang Pleno (FR-06 & FR-08)** | **High-Craft Dark Mode** (*Obsidian Forest*) | Dirancang khusus untuk proyektor ruang sidang pleno dan layar monitor pengawasan. Memberikan kesan sinematik, berwibawa, dan membuat grafik perhitungan suara (*Quick Count / Real Count*) tampil mencolok tanpa menyilaukan ruangan. |

---

## 3. Sistem Warna & Token Palet (*Neo-Editorial Botanical*)

Seluruh warna dikurasi dengan *undertone* organik yang hangat dan tegas (bukan warna neon/stabilo).

### 3.1 Palet Utama — Warm Light Mode (Kiosk, PPUR, KPUM, Publik)

| Kategori Token | Nama Warna | HEX | Penggunaan Spesifik |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | **Warm Oat Milk** | `#F6F4EE` | Background utama seluruh halaman aplikasi. |
| `--bg-surface` | **Pure Alabaster** | `#FFFFFF` | Permukaan *Card* paslon, tabel DPT, dan modal konfirmasi. |
| `--bg-subtle` | **Soft Parchment** | `#EAE6DF` | Area sekunder, *header* tabel, *input field disabled*, dan *skeleton loader*. |
| `--text-primary` | **Deep Espresso Ink** | `#141E19` | Warna teks judul, nama paslon, NIM, dan warna garis *border* utama. |
| `--text-secondary` | **Muted Forest Slate** | `#4A5851` | Teks deskripsi visi-misi, sub-label, dan keterangan waktu. |
| `--text-muted` | **Dry Sage Grey** | `#7A8881` | *Placeholder* form pencarian, *caption* kaki halaman, dan teks non-aktif. |
| `--accent-primary` | **Tropic Palm Green** | `#1B7F4E` | Identitas utama Smart Pemira, tombol CTA primer, dan status *Active/Valid*. |
| `--accent-primary-hover`| **Deep Canopy Green** | `#13613B` | *Hover/Active state* untuk tombol primer. |
| `--accent-secondary` | **Sunbaked Terracotta**| `#E05A47` | Aksen sekunder yang *eye-catchy*, *badge* peringatan, *countdown* TTL Token. |
| `--accent-highlight` | **Warm Marigold** | `#F2B705` | *Highlight* nomor urut paslon, *badge* tahapan aktif, dan aksen sorotan. |
| `--border-subtle` | **Warm Stone Border** | `#D8D3C8` | Garis pemisah tabel dan *border card* pada Dashboard Bento (`1px solid`). |
| `--border-strong` | **Espresso Ink Line** | `#141E19` | Garis tegas pada kartu Kiosk & tombol *Tactile Neo-Brutalist* (`1.5px - 2px solid`). |

### 3.2 Palet Khusus — High-Craft Dark Mode (Live Audit Monitor & Layar Pleno)

| Kategori Token | Nama Warna | HEX | Penggunaan Spesifik |
| :--- | :--- | :--- | :--- |
| `--pleno-bg-canvas` | **Obsidian Forest** | `#0D1512` | Kanvas gelap utama layar proyektor pleno & dashboard live Panwaslu. |
| `--pleno-bg-surface` | **Deep Pine Slate** | `#15221D` | Permukaan kartu metrik *live turnout*, grafik bar, dan log aktivitas. |
| `--pleno-bg-elevated` | **Elevated Moss** | `#1D2E27` | *Hover state* baris tabel dan *header* panel pengawasan. |
| `--pleno-text-primary` | **Crisp Alabaster** | `#F4F1EA` | Teks utama dan angka persentase perolehan suara. |
| `--pleno-text-secondary`| **Sage Mist** | `#9EB0A7` | Label keterangan prodi, waktu log, dan metadata hash. |
| `--pleno-accent-green` | **Luminous Tropic** | `#28A769` | Indikator *live pulse*, progres suara masuk, dan status server *Online*. |
| `--pleno-accent-amber` | **Glowing Marigold** | `#F5C431` | Sorotan pemenang sementara & indikator ambang batas 50% Calon Tunggal. |
| `--pleno-border` | **Subtle Pine Line** | `#263B33` | Garis tepi *Bento Box* pada layar gelap (`1px solid`). |

### 3.3 Warna Semantik & Status Operasional (RBAC & DPT Status)

* **Status `BELUM_MEMILIH` (Neutral)**: Teks `#4A5851` di atas latar `#EAE6DF` dengan border `#D8D3C8`.
* **Status `DALAM_ANTREAN` / Token Aktif (Warning/In-Progress)**: Teks `#8A5200` di atas latar `#FEF5D6` dengan aksen *Warm Marigold* `#F2B705`.
* **Status `SUDAH_MEMILIH` / Terverifikasi (Success)**: Teks `#0F5132` di atas latar `#DCFCE7` dengan aksen *Tropic Palm Green* `#1B7F4E`.
* **Status `TOKEN_EXPIRED` / Sengketa / Emergency Freeze (Danger)**: Teks `#842029` di atas latar `#FDE8E5` dengan aksen *Sunbaked Terracotta* `#E05A47`.

---

## 4. Color-Coding Surat Suara (Multi-Ballot Identity)

Sesuai **FR-03.1** dan **FR-05.2**, setiap pemilih akan melewati 3 tahap surat suara di bilik Kiosk. Agar mahasiswa **tidak bingung atau salah mengenali kategori pemilihan**, setiap surat suara wajib memiliki identitas warna (*Header Banner*, *Step Pill*, dan *Card Accent Ring*) yang berbeda dan eksklusif:

### 4.1 Kategori Tingkat Institusi (Seluruh Mahasiswa)
1. **SURAT SUARA 1: Pemilihan Presma & Wapresma (BEM)**
   * **Identitas Warna**: **Tropic Green**
   * **Primary HEX**: `#1B7F4E` | **Soft Tint Surface**: `#E6F4EC` | **Text on Badge**: `#FFFFFF`
   * **Karakter**: Hijau tropis yang tegas, melambangkan kepemimpinan eksekutif tertinggi kampus.
2. **SURAT SUARA 2: Pemilihan Pimpinan DPM (Legislatif)**
   * **Identitas Warna**: **Tropic Jade**
   * **Primary HEX**: `#0F766E` | **Soft Tint Surface**: `#E2F3F1` | **Text on Badge**: `#FFFFFF`
   * **Karakter**: *Deep Teal-Jade* yang tenang, konstitusional, dan berbeda jelas dari hijau BEM.

### 4.2 Kategori Tingkat Program Studi — Hima Prodi (Server-Side Filtered)
Berdasarkan **Aturan Bisnis 7.2**, surat suara ke-3 otomatis menyesuaikan Program Studi pemilih dengan kode warna unik per jurusan agar tidak ada yang sama:

| Program Studi / Hima | Nama Aksen Warna | Primary HEX | Soft Tint Surface | Karakter Visual |
| :--- | :--- | :--- | :--- | :--- |
| **Hima Budidaya Perkebunan Kelapa Sawit (BKS)** | **Spiced Terracotta** | `#D95338` | `#FCECE8` | Merah bata agraris yang hangat dan berani. |
| **Hima Teknologi Pengolahan Hasil Perkebunan (TPHP)** | **Golden Ochre** | `#D9822B` | `#FDF2E4` | Jingga keemasan industrial yang enerjik. |
| **Hima Manajemen Logistik / Perkebunan** | **Royal Cobalt** | `#2B50AA` | `#E8EEF9` | Biru kobalt struktural dan presisi. |
| **Hima Teknologi Rekayasa Perangkat Lunak (TRPL)** | **Electric Plum** | `#6D28D9` | `#F1E9FD` | Ungu tua *deep-tech* yang modern dan ekspresif. |
| **Opsi Khusus: KOTAK KOSONG (Calon Tunggal)** | **Neutral Slate Ink** | `#3F4743` | `#ECEAE4` | Abu-abu arang netral tanpa bias visual (Pasal 9 ayat 3 UUD IKM). |

---

## 5. Tipografi & Hierarki Skala Teks

Kombinasi tipografi menggunakan pasangan **Geometric & Punchy** yang memberikan karakter Gen Z yang kuat pada judul, keterbacaan maksimal pada antarmuka, dan presisi teknis pada data kriptografi.

### 5.1 Font Family Stack
* **`--font-display` (Heading & Nomor Urut Paslon)**: `'Bricolage Grotesque', sans-serif`
  * *Karakter*: Unik, ekspresif, sedikit *quirky* namun sangat berwibawa pada bobot `700 (Bold)` dan `800 (ExtraBold)`.
* **`--font-sans` (UI Controls, Body, Tabel DPT, Visi-Misi)**: `'Geist', 'Inter', system-ui, sans-serif`
  * *Karakter*: Neo-grotesque modern yang super jernih, netral, dan nyaman dibaca cepat.
* **`--font-mono` (Token 6-Digit, NIM, Countdown, SHA-256 Hash)**: `'Geist Mono', monospace`
  * *Karakter*: Memastikan angka `0` vs huruf `O`, serta angka `1` vs huruf `I` pada **Token Bilik Suara** terbedakan secara mutlak. Wajib mengaktifkan `font-variant-numeric: tabular-nums`.

### 5.2 Skala Tipografi (Typographic Scale)

| Level / Peran UI | Font Family | Ukuran (`rem` / `px`) | Weight | Line Height | Tracking |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Kiosk Ballot Number** (Nomor Urut `01`, `02`) | `--font-display` | `3.5rem` (56px) | `800` | `1.0` | `-0.04em` |
| **Token Display Giant** (Kode Token 6 Karakter) | `--font-mono` | `3.0rem` (48px) | `700` | `1.1` | `0.18em` |
| **H1 / Page Hero & Pleno Title** | `--font-display` | `2.25rem` (36px) | `700` | `1.15` | `-0.03em` |
| **H2 / Section & Ballot Header** | `--font-display` | `1.5rem` (24px) | `700` | `1.25` | `-0.02em` |
| **H3 / Candidate Name on Card** | `--font-display` | `1.25rem` (20px) | `700` | `1.3` | `-0.01em` |
| **Body Large (Kiosk Instructions)** | `--font-sans` | `1.125rem` (18px) | `500` | `1.5` | `0em` |
| **Body Base (Tabel DPT, Visi-Misi)** | `--font-sans` | `1.0rem` (16px) | `400` | `1.6` | `0em` |
| **UI Label & Button Text** | `--font-sans` | `0.875rem` (14px) | `600` | `1.2` | `0.01em` |
| **Mono Data (NIM, Timestamp, Hash)** | `--font-mono` | `0.8125rem` (13px) | `500` | `1.4` | `0.02em` |

---

## 6. Aturan Layout, Grid & Spasi

1. **Base Spacing Unit**: Menggunakan kelipatan `4px` (`0.25rem`) dengan ritme spasi utama `8px`, `16px`, `24px`, `32px`, dan `48px`.
2. **Whitespace Mandate**: Minimal **25% dari total layar** wajib berupa area kosong (*breathing room* berwarna `--bg-canvas` `#F6F4EE`) agar pemilih di bilik Kiosk tidak merasa terintimidasi atau bingung.
3. **Ukuran Kontainer Maksimum**:
   * **Kiosk Bilik Suara**: `max-width: 1280px` (terpusat secara vertikal dan horizontal di layar penuh `100dvh`, **tanpa scroll vertikal** jika memungkinkan agar seluruh kandidat terlihat sekaligus).
   * **Dashboard Admin / PPUR / Panwaslu**: Fluid Bento Layout dengan `max-width: 1600px`, *sidebar* navigasi ramping (`260px`), dan *padding* konten utama `24px–32px`.
4. **Touch Target Ergonomics (Khusus Kiosk FR-05)**:
   * Seluruh tombol interaktif di Kiosk Bilik Suara wajib memiliki tinggi minimal **`56px`** dengan area sentuh yang luas agar nyaman ditekan menggunakan jari di layar tablet maupun klik *mouse*.

---

## 7. Gaya Komponen Hybrid (Bento Editorial vs Tactile Neo-Brutalism)

Sistem menerapkan strategi visual **Hybrid** yang membedakan komponen **interaksi pemilihan (Kiosk & Publik)** dengan komponen **manajemen administratif (PPUR, KPUM, Panwaslu)**:

### 7.1 Mode A: *Tactile Neo-Brutalism* (Khusus Kiosk Bilik Suara & Portal Publik)
Digunakan untuk membangun rasa antusiasme, kejelasan fisik, dan kepastian saat memilih:
* **Surface & Border**: Latar kartu `#FFFFFF` dengan garis tepi tegas `2px solid #141E19` (`--border-strong`).
* **Tactile Shadow**: Menggunakan *hard offset shadow* yang rapi dan berkelas:
  * Default Card: `box-shadow: 4px 4px 0px #141E19;`
  * Hover / Focus State: `transform: translate(-2px, -2px); box-shadow: 6px 6px 0px #141E19;`
  * Active / Pressed State: `transform: translate(2px, 2px); box-shadow: 2px 2px 0px #141E19;`
* **Selected Candidate Card**: Saat paslon diklik di bilik suara, *border* berubah menjadi `3px solid` mengikuti warna kategori surat suara (misal `#1B7F4E` untuk BEM), *offset shadow* berubah mengikuti warna kategori (`6px 6px 0px #1B7F4E`), dan muncul lencana **"✓ PILIHAN ANDA"** di sudut kanan atas kartu.
* **Border Radius**: `14px` untuk kartu kandidat, `10px` untuk tombol utama, dan `9999px` (*full pill*) untuk *badge* nomor urut & kategori.

### 7.2 Mode B: *Bento Editorial* (Khusus Dashboard KPUM, Meja PPUR, & Panwaslu)
Digunakan untuk efisiensi kerja tinggi, fokus pembacaan tabel ribuan baris DPT, dan ketenangan visual:
* **Surface & Border**: Latar kartu `#FFFFFF` (Light) atau `#15221D` (Dark Pleno) dengan garis tepi halus `1px solid #D8D3C8` (Light) / `#263B33` (Dark).
* **Shadow**: Tanpa *hard offset shadow*. Menggunakan elevasi super halus (`0 1px 3px rgba(20, 30, 25, 0.04)`) dan mengandalkan kontras warna kanvas `#F6F4EE` vs permukaan kartu `#FFFFFF`.
* **Border Radius**: `12px` untuk panel *Bento*, `8px` untuk baris input dan tombol tabel.
* **Data Alignment**: Seluruh kolom angka, NIM, waktu kehadiran, dan jumlah suara wajib rata kanan (`text-align: right`) atau menggunakan `tabular-nums` agar lurus sempurna dari atas ke bawah.

---

## 8. Spesifikasi Antarmuka per Modul (End-to-End Screens)

Berikut adalah panduan desain spesifik untuk setiap modul yang diamanatkan dalam `PRD.md`:

### 8.1 Modul Meja Registrasi PPUR (FR-04: Token Issuer)
* **Tujuan Utama**: Kecepatan pencarian NIM/Scan KTM (< 3 detik) dan penerbitan Token 6 Digit.
* **Struktur Layout (Split Bento 60:40)**:
  * **Panel Kiri (60%) — Pencarian & Tabel DPT TPS**:
    * *Search Bar* berukuran besar di bagian atas (`height: 52px`), otomatis *autofocus* untuk menerima input *Barcode Scanner* KTM atau ketikan NIM.
    * Filter cepat berbentuk *Pill Tabs*: `Semua DPT`, `Belum Memilih`, `Dalam Antrean (Token Aktif)`, `Sudah Memilih`.
  * **Panel Kanan (40%) — Kartu Verifikasi & Generator Token**:
    * Menampilkan detail mahasiswa yang dipilih (Nama Lengkap, NIM dengan `--font-mono`, Program Studi dengan *badge* warna prodinya, dan Status Hak Pilih).
    * Tombol aksi primer lebar penuh: **"TERBITKAN TOKEN BILIK SUARA"** (`#1B7F4E`).
    * **Modal / Kartu Token Terbit**: Menampilkan **6 Karakter Alfanumerik** dalam ukuran raksasa (`48px Geist Mono Bold`, spasi antar huruf lebar) di atas latar *Warm Marigold Tint* (`#FEF5D6`), dilengkapi *progress bar* hitung mundur **10:00 menit** dan tombol *"Cetak Slip Token"*.

### 8.2 Modul Kiosk Bilik Suara (FR-05: Multi-Ballot Wizard)
Antarmuka terkunci dalam *Fullscreen Kiosk Mode*, bebas *navbar* eksternal, bebas *footer* berantakan.

#### Layar 1: Gate Input Token
* Terpusat di tengah kanvas `#F6F4EE`.
* Menampilkan logo resmi IKM Poltek CWE & KPUM, judul `"BILIK SUARA DIGITAL SMART PEMIRA"`, dan **6 Kotak Input Karakter** bergaya *Tactile Neo-Brutalist* (`64px x 76px` per kotak, border `2px solid #141E19`).
* Dilengkapi *Virtual On-Screen Keypad* (angka `0-9` dan huruf `A-Z`) berukuran besar di layar untuk memudahkan bilik suara yang menggunakan tablet layar sentuh tanpa *keyboard* fisik.

#### Layar 2: Wizard Surat Suara Bertahap (Step 1, 2, 3)
* **Top Stepper Bar**: Menampilkan posisi pemilih saat ini secara jelas:
  * `[ 1. PRESMA & WAPRESMA ] ─── [ 2. PIMPINAN DPM ] ─── [ 3. KETUA HIMA PRODI ]`
  * *Header Banner* di bagian atas berubah warna secara dinamis mengikuti surat suara aktif:
    * Tahap 1 (BEM): Banner **Tropic Green** (`#1B7F4E`)
    * Tahap 2 (DPM): Banner **Tropic Jade** (`#0F766E`)
    * Tahap 3 (Hima): Banner warna Prodi pemilih (misal **Electric Plum** `#6D28D9` untuk TRPL).
* **Grid Kartu Paslon**:
  * Maksimal 2 hingga 3 kartu berjejer horizontal.
  * Setiap kartu menampilkan: **Badge Nomor Urut** (`Bricolage Grotesque 56px`) di pojok kiri atas, **Foto Resmi Paslon** dengan rasio `4:3` atau `1:1` berbingkai rapi, **Nama Pasangan Calon**, dan ringkasan 3 poin **Visi Utama**.
* **Desain Khusus Skenario Calon Tunggal vs Kotak Kosong (Aturan Bisnis 7.1)**:
  * Jika kategori hanya memiliki 1 paslon, layar wajib membagi ruang **50% : 50% secara simetris dan adil**.
  * Kartu Kiri: Pasangan Calon Tunggal (Nomor Urut `01`).
  * Kartu Kanan: **KOTAK KOSONG (Kolom Tidak Setuju)** dengan ilustrasi kotak suara netral berarsir bersih, judul tegas `"KOTAK KOSONG"`, dan penjelasan singkat: *"Pilih kotak ini apabila Anda tidak menyetujui pasangan calon tunggal."*

#### Layar 3: Konfirmasi Akhir (*Review Selections* - FR-05.4)
* Menampilkan ringkasan 3 kartu pilihan mahasiswa secara berdampingan (Pilihan BEM, Pilihan DPM, Pilihan Hima Prodi) lengkap dengan warna *badge* masing-masing.
* Setiap kartu ringkasan memiliki tombol sekunder `"Ubah Pilihan"` untuk kembali ke surat suara terkait.
* Di bagian bawah terdapat *callout* jaminan keamanan: `"🔒 Zero-Knowledge Ballot: Pilihan Anda dienkripsi secara acak dan dipisahkan sepenuhnya dari identitas NIM Anda."`
* Tombol aksi final berukuran ekstra besar (`height: 64px`) dengan gaya *Tactile Neo-Brutalist*: **"KIRIM SUARA SEKARANG"** (`#1B7F4E` dengan *offset shadow* `#141E19`).

#### Layar 4: Sukses & Auto-Reset (3 Detik)
* Menampilkan animasi centang hijau *Tropic Green*, pesan apresiasi, pengingat untuk **mencelupkan jari ke tinta di meja keluar TPS**, dan *countdown bar* 3 detik sebelum layar otomatis kembali ke *Gate Input Token*.

### 8.3 Modul Live Audit Panwaslu & Sidang Pleno (FR-06 & FR-08)
Menggunakan **High-Craft Dark Mode (`#0D1512`)**:
* **Bento Row Atas (4 KPI Cards)**:
  1. *Total DPT Terdaftar* (Angka besar `Bricolage Grotesque`).
  2. *Total Suara Masuk / Turnout (%)* dilengkapi *progress bar* hijau `#28A769`.
  3. *Token Aktif di Bilik Saat Ini* (Indikator *real-time*).
  4. *Status Integritas Hash Chain* (Badge `"✓ SHA-256 VERIFIED"` dengan font `Geist Mono`).
* **Pleno Unlocking Gate (FR-06.3)**:
  * Sebelum pemungutan suara ditutup, area grafik perolehan suara tertutup oleh **Cryptographic Vault Overlay** (panel terkunci dengan ikon gembok kriptografis).
  * Saat Sidang Pleno dimulai, Ketua KPUM menekan tombol `"BUKA KOTAK SUARA DIGITAL (PLENO UNLOCK)"` yang menampilkan animasi dekripsi *hash* dan langsung merender grafik perolehan suara *real-time* beserta indikator kelulusan ambang batas `> 50%` (untuk skenario Calon Tunggal).

### 8.4 Modul Berita Acara Digital Model C-KWE (FR-07)
* Dirancang dengan estetika **Swiss Legal Document** di atas kertas putih `#FFFFFF`.
* Menampilkan tabel rekapitulasi presisi tinggi, kolom catatan keberatan saksi (FR-07.3), serta **Panel Status Tanda Tangan Digital** (Ketua KPUM, Ketua PPUR, Ketua Panwaslu, dan Saksi Paslon) lengkap dengan cap waktu (*timestamp*) dan **QR Code Cryptographic Seal** di pojok kanan bawah untuk ekspor PDF.

---

## 9. Interaksi, Transisi & Micro-States

1. **Kecepatan Respons Kiosk (< 500ms - NFR 4.2.3)**:
   * Transisi antar surat suara (BEM -> DPM -> Hima) menggunakan animasi *horizontal slide & fade* berdurasi `180ms cubic-bezier(0.22, 1, 0.36, 1)`—terasa instan, lincah, dan tidak membuat pemilih menunggu.
2. **Pencegahan Double-Submit**:
   * Saat tombol `"KIRIM SUARA SEKARANG"` ditekan, tombol langsung terkunci (`disabled`), menampilkan status `"Mengenkripsi & Mengacak Suara..."` dengan ikon *spinner* minimal, mencegah pengiriman suara ganda.
3. **Indikator Countdown Token**:
   * Di pojok kanan atas layar Kiosk, terdapat *pill timer* (`⏱ 09:42`) dengan font `Geist Mono`. Jika waktu tersisa kurang dari **2 menit**, warna *pill* berubah menjadi **Sunbaked Terracotta (`#E05A47`)** dengan efek *gentle pulse* agar pemilih segera menyelesaikan pilihannya.

---

## 10. Konfigurasi CSS Variables & Tailwind Token

Tim pengembang ITPO dapat langsung menyalin konfigurasi variabel CSS berikut ke dalam file `globals.css` proyek **Smart Pemira**:

```css
@layer base {
  :root {
    /* === WARM LIGHT MODE (DEFAULT: KIOSK, PPUR, KPUM, PUBLIK) === */
    --bg-canvas: #F6F4EE;
    --bg-surface: #FFFFFF;
    --bg-subtle: #EAE6DF;

    --text-primary: #141E19;
    --text-secondary: #4A5851;
    --text-muted: #7A8881;

    --accent-primary: #1B7F4E;
    --accent-primary-hover: #13613B;
    --accent-secondary: #E05A47;
    --accent-highlight: #F2B705;

    --border-subtle: #D8D3C8;
    --border-strong: #141E19;

    /* === MULTI-BALLOT CATEGORY COLORS === */
    --ballot-bem: #1B7F4E;
    --ballot-bem-tint: #E6F4EC;

    --ballot-dpm: #0F766E;
    --ballot-dpm-tint: #E2F3F1;

    --ballot-hima-bks: #D95338;
    --ballot-hima-bks-tint: #FCECE8;

    --ballot-hima-tphp: #D9822B;
    --ballot-hima-tphp-tint: #FDF2E4;

    --ballot-hima-logistik: #2B50AA;
    --ballot-hima-logistik-tint: #E8EEF9;

    --ballot-hima-trpl: #6D28D9;
    --ballot-hima-trpl-tint: #F1E9FD;

    --ballot-empty-box: #3F4743;
    --ballot-empty-box-tint: #ECEAE4;

    /* === TYPOGRAPHY === */
    --font-display: 'Bricolage Grotesque', sans-serif;
    --font-sans: 'Geist', 'Inter', system-ui, sans-serif;
    --font-mono: 'Geist Mono', monospace;

    /* === TACTILE NEO-BRUTALIST SHADOWS (KIOSK & PUBLIC) === */
    --shadow-tactile-sm: 2px 2px 0px #141E19;
    --shadow-tactile-md: 4px 4px 0px #141E19;
    --shadow-tactile-lg: 6px 6px 0px #141E19;
    --shadow-tactile-selected-bem: 6px 6px 0px #1B7F4E;
    --shadow-tactile-selected-dpm: 6px 6px 0px #0F766E;
  }

  /* === HIGH-CRAFT DARK MODE (PLENO & PANWASLU LIVE MONITOR) === */
  .theme-pleno-dark {
    --bg-canvas: #0D1512;
    --bg-surface: #15221D;
    --bg-subtle: #1D2E27;

    --text-primary: #F4F1EA;
    --text-secondary: #9EB0A7;
    --text-muted: #64786F;

    --accent-primary: #28A769;
    --accent-primary-hover: #34C77E;
    --accent-secondary: #E05A47;
    --accent-highlight: #F5C431;

    --border-subtle: #263B33;
    --border-strong: #39564A;
  }
}
```
