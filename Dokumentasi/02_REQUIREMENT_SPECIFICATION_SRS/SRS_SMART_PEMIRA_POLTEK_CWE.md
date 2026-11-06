# SOFTWARE REQUIREMENT SPECIFICATION (SRS)
## SISTEM E-VOTING SMART PEMIRA (SMART PEMILIHAN UMUM RAYA)
### Politeknik Kelapa Sawit Citra Widya Edukasi (Poltek CWE)

---

| Standar Dokumen | ISO/IEC/IEEE 29148:2018 / IEEE Std 830-1998 |
| :--- | :--- |
| **Kode Dokumen** | `DOC-SRS-001` |
| **Versi Dokumen** | `1.0.0` (Master Release Baseline) |
| **Tanggal Terbit** | 04 September 2026 |
| **Status Dokumen** | Disetujui & Dikunci (*Approved Baseline*) |
| **Penyusun** | Tim Informasi dan Teknologi Pemira Online (ITPO) Poltek CWE |
| **Pemangku Kepentingan** | KPUM, Panwaslu, DPM, Saksi Pasangan Calon, Mahasiswa Poltek CWE |

---

## DAFTAR ISI
1. [Pengantar & Gambaran Umum Dokumen](#1-pengantar--gambaran-umum-dokumen)
   * 1.1 Tujuan Dokumen
   * 1.2 Lingkup Produk
   * 1.3 Definisi, Akronim, dan Singkatan
   * 1.4 Referensi Yuridis & Teknis
   * 1.5 Gambaran Umum Struktur Dokumen
2. [Deskripsi Umum Sistem (General System Description)](#2-deskripsi-umum-sistem-general-system-description)
   * 2.1 Perspektif Produk & Batasan Lingkungan
   * 2.2 Fungsi Utama Perangkat Lunak
   * 2.3 Karakteristik Pengguna & Matriks Hak Akses (RBAC)
   * 2.4 Lima Hukum Arsitektur Non-Negotiable (Hard Constraints)
   * 2.5 Asumsi dan Ketergantungan
3. [Spesifikasi Kebutuhan Fungsional Lengkap (FR-01 s/d FR-08)](#3-spesifikasi-kebutuhan-fungsional-lengkap-fr-01-sd-fr-08)
   * 3.1 FR-01: Manajemen Konfigurasi Eleksi & Tahapan
   * 3.2 FR-02: Manajemen Daftar Pemilih Tetap (DPT)
   * 3.3 FR-03: Manajemen Kandidat & Kotak Kosong
   * 3.4 FR-04: Otentikasi & Penerbitan Token Meja PPUR
   * 3.5 FR-05: Antarmuka Kiosk Bilik Suara Fullscreen
   * 3.6 FR-06: Kotak Suara Digital & Pleno Vault Lock 423
   * 3.7 FR-07: Berita Acara & Tanda Tangan Digital Ed25519
   * 3.8 FR-08: Pengawasan Panwaslu, Audit Log & Sengketa
4. [Kebutuhan Non-Fungsional (Non-Functional Requirements - NFR)](#4-kebutuhan-non-fungsional-non-functional-requirements---nfr)
   * 4.1 NFR-01: Keamanan Sistem & Kriptografi
   * 4.2 NFR-02: Kinerja & Skalabilitas (Performance)
   * 4.3 NFR-03: Ketersediaan & Keandalan (Availability & Fault Tolerance)
   * 4.4 NFR-04: Aksesibilitas, Ergonomi & Kepatuhan Desain
5. [Kebutuhan Antarmuka Eksternal (External Interface Requirements)](#5-kebutuhan-antarmuka-eksternal-external-interface-requirements)
   * 5.1 Antarmuka Pengguna (User Interface)
   * 5.2 Antarmuka Perangkat Keras (Hardware Interface)
   * 5.3 Antarmuka Perangkat Lunak (Software Interface)
   * 5.4 Antarmuka Komunikasi (Communication Interface)
6. [Matriks Keterlacakan Kebutuhan (Requirements Traceability Matrix - RTM)](#6-matriks-keterlacakan-kebutuhan-requirements-traceability-matrix---rtm)

---

## 1. Pengantar & Gambaran Umum Dokumen

### 1.1 Tujuan Dokumen
Dokumen Software Requirement Specification (SRS) ini merumuskan secara spesifik, formal, dan komprehensif seluruh kebutuhan fungsional (*functional requirements*), kebutuhan non-fungsional (*non-functional requirements*), batasan desain arsitektural (*design constraints*), dan antarmuka eksternal bagi sistem **Smart Pemira (Sistem Informasi Pemilihan Umum Raya Terintegrasi)** Politeknik Kelapa Sawit Citra Widya Edukasi (Poltek CWE).

Dokumen ini berfungsi sebagai:
1. Kontrak teknis formal antara pemangku kepentingan pemira (DPM, KPUM, Panwaslu) dengan tim rekayasa perangkat lunak (Tim ITPO).
2. Rujukan utama (*baseline*) dalam proses implementasi kode, pengujian unit/integrasi, verifikasi kriptografis, serta audit sistem independen.

### 1.2 Lingkup Produk
Sistem **Smart Pemira** adalah rangkaian aplikasi web berbasis *hybrid on-premise/cloud* yang melayani seluruh siklus pemungutan dan penghitungan suara mahasiswa Poltek CWE:
* **Sub-Sistem Meja PPUR**: Registrasi pemilih fisik berbasis KTM, validasi DPT, dan penerbitan slip token acak sekali pakai.
* **Sub-Sistem Bilik Kiosk**: Antarmuka pemilihan layar penuh bertahap (*multi-ballot wizard*) yang menyajikan 3 surat suara (Presiden-Wakil Presiden Mahasiswa, Dewan Perwakilan Mahasiswa, dan Ketua Himpunan Mahasiswa Program Studi) dengan perlindungan isolasi *Zero-Knowledge*.
* **Sub-Sistem Pleno KPUM & Tallying**: Ruang penyimpanan terkunci (*Pleno Vault*) yang hanya dapat dibuka secara serentak pasca-pemilihan untuk penghitungan instan dan penerbitan Berita Acara Model C-KWE bertanda tangan Ed25519.
* **Sub-Sistem Monitor Panwaslu & Sengketa**: Pemantauan langsung jejak audit (*tamper-evident log*), metrik partisipasi, dan pelaporan pelanggaran secara daring.

### 1.3 Definisi, Akronim, dan Singkatan
* **BAAK**: Biro Administrasi Akademik dan Kemahasiswaan Poltek CWE.
* **CSPRNG**: *Cryptographically Secure Pseudo-Random Number Generator* (mesin pembangkit bilangan acak berstandar keamanan militer).
* **DPM**: Dewan Perwakilan Mahasiswa Politeknik Kelapa Sawit Citra Widya Edukasi.
* **DPT**: Daftar Pemilih Tetap (daftar mahasiswa aktif berhak suara yang telah disahkan).
* **Ed25519**: Algoritma tanda tangan digital berbasis kurva eliptik *Edwards-curve Digital Signature Algorithm* sesuai RFC 8032.
* **HIMA**: Himpunan Mahasiswa Program Studi di lingkungan Poltek CWE.
* **ITPO**: Tim Informasi dan Teknologi Pemira Online.
* **KPUM**: Komisi Pemilihan Umum Mahasiswa Poltek CWE.
* **LUBER JURDIL**: Langsung, Umum, Bebas, Rahasia, Jujur, dan Adil.
* **Panwaslu**: Panitia Pengawas Pemilihan Umum Raya Mahasiswa Poltek CWE.
* **PPUR**: Panitia Pemungutan Suara TPS / Petugas Registrasi Meja TPS.
* **RBAC**: *Role-Based Access Control* (pembatasan hak akses berdasarkan peran pengguna).
* **TOTP**: *Time-Based One-Time Password* sesuai RFC 6238 (autentikasi 2 faktor petugas).
* **TTL**: *Time-To-Live* (masa aktif berlaku token bilik suara sebelum kedaluwarsa).
* **Zero-Knowledge Ballot**: Arsitektur di mana sistem mampu membuktikan keabsahan hak suara pemilih tanpa pernah mengetahui atau menyimpan asosiasi siapa memilih apa.

### 1.4 Referensi Yuridis & Teknis
1. **Undang-Undang Dasar Ikatan Keluarga Mahasiswa (IKM) Poltek CWE** (Pasal 1 ayat 2, Pasal 9 ayat 1-5, Pasal 13 ayat 2, Pasal 19 ayat 2 & 4, Pasal 27 ayat 1-6).
2. **Ketetapan DPM No. 005/DPM-CWE/KEP/VII/2024** tentang RUU Pemira Online IKM Poltek CWE.
3. **ISO/IEC/IEEE 29148:2018**: *Systems and software engineering — Life cycle processes — Requirements engineering*.
4. **RFC 8032**: *Edwards-Curve Digital Signature Algorithm (EdDSA)*.
5. **RFC 6238**: *TOTP: Time-Based One-Time Password Algorithm*.
6. **Dokumen PRD & DESIGN.md Smart Pemira** Versi 1.0.0.

---

## 2. Deskripsi Umum Sistem (General System Description)

### 2.1 Perspektif Produk & Batasan Lingkungan
Smart Pemira merupakan sistem pemungutan suara hibrida terpadu yang memadukan kehadiran fisik pemilih di TPS kampus (*TPS Diam*) dengan keandalan pencatatan elektronik. 

Sistem dapat beroperasi dalam dua mode lingkungan (*Dual-Mode Architecture*):
1. **Mode On-Premise LAN Tertutup (Default Hari-H)**: Seluruh perangkat bilik Kiosk, meja registrasi PPUR, dan dashboard pengawas terhubung ke server mini-PC lokal via jaringan intranet kabel Cat6 / Wi-Fi 6 tanpa memerlukan koneksi internet luar. Mode ini mengeliminasi risiko serangan siber dari internet publik dan menjamin kelancaran pemungutan suara saat koneksi ISP kampus terputus.
2. **Mode Cloud Serverless (Portal Publik & Arsip)**: Berjalan di atas arsitektur Next.js Edge / Vercel dan database terdistribusi Turso LibSQL untuk penayangan profil calon pra-pemira dan publikasi hasil pleno bagi civitas akademika umum.

```
       +--------------------------------------------------------------+
       |                  JARINGAN INTRANET LAN TPS                   |
       |                                                              |
       |  +-------------------+              +---------------------+  |
       |  | Meja PPUR         |              | Kiosk Bilik Suara   |  |
       |  | (Verifikasi DPT)  |              | (Layar Sentuh Kiosk)|  |
       |  +---------+---------+              +----------+----------+  |
       |            |                                   |             |
       |            +-----------------+-----------------+             |
       |                              |                               |
       |                              v                               |
       |                 +--------------------------+                 |
       |                 |  Server Mini-PC On-Prem  |                 |
       |                 |  (Next.js + SQLite Core) |                 |
       |                 +------------+-------------+                 |
       |                              |                               |
       |            +-----------------+-----------------+             |
       |            |                                   |             |
       |            v                                   v             |
       |  +-------------------+              +---------------------+  |
       |  | Monitor Panwaslu  |              | Proyektor Pleno     |  |
       |  | (Audit Dark Mode) |              | (Layar Sidang KPUM) |  |
       |  +-------------------+              +---------------------+  |
       +--------------------------------------------------------------+
```

### 2.2 Fungsi Utama Perangkat Lunak
Sistem menyediakan kapabilitas komputasi terdistribusi yang mencakup:
* Verifikasi kehadiran DPT secara real-time dan penerbitan token CSPRNG acak (TTL 10 menit).
* Penyajian surat suara bertahap (*multi-ballot*) dengan filtrasi program studi secara tegas di sisi server (*Server-Side Assertion*).
* Penyisipan dinamis opsi "Kotak Kosong" apabila hanya terdapat 1 pasangan calon pada kategori bersangkutan (Pasal 9 ayat 3 UUD IKM).
* Transaksi atomik penyimpanan suara 3 kategori serentak disertai pembentukan rantai integritas hash SHA-256 per TPS.
* Penguncian ketat hasil rekapitulasi (*Pleno Vault Lock HTTP 423*) hingga pembukaan resmi oleh komisioner KPUM.
* Otomasi penyusunan Berita Acara Model C-KWE PDF bertanda tangan digital Ed25519 dan stempel verifikasi QR.
* Pemantauan audit aktivitas sistem (*append-only log feed*) dan portal penanganan sengketa pemira secara online.

### 2.3 Karakteristik Pengguna & Matriks Hak Akses (RBAC)

| Peran (Role) | Kategori Pengguna | Karakteristik & Kompetensi | Lingkup Wewenang Sistem |
| :--- | :--- | :--- | :--- |
| **ITPO (Super Admin)** | Mahasiswa pengembang & teknisi jaringan | Penguasaan sistem Linux, Node.js, database, dan kriptografi | * Konfigurasi master sistem, kunci enkripsi, dan basis data.<br>* Manajemen status *Emergency Freeze* darurat.<br>* Backup data, reset sesi, dan audit teknis infrastruktur. |
| **KPUM (Komisioner)** | Penyelenggara Pemira Poltek CWE | Mahasiswa penyelenggara pemilu, memahami regulasi RUU Pemira | * Manajemen impor dan pengesahan DPT dari BAAK.<br>* Penetapan data kandidat, foto, visi-misi, dan nomor urut.<br>* Penetapan jadwal tahapan dan eksekusi *Pleno Unlocking*.<br>* Penandatanganan digital Berita Acara Model C-KWE. |
| **PPUR (Petugas TPS)** | Panitia pendaftaran di TPS kampus | Mahasiswa operator meja pendaftaran, teliti memeriksa fisik KTM | * Pencarian data mahasiswa pada DPT terverifikasi.<br>* Verifikasi identitas fisik mahasiswa (KTM/KRS).<br>* Penerbitan token bilik Kiosk 6 digit (TTL 10 menit).<br>* Memonitor antrean bilik dan pencetakan slip token. |
| **Pemilih (Voter)** | Mahasiswa aktif Poltek CWE | Pengguna awam gawai sentuh, heterogen dari 5 program studi | * Memasukkan token alfanumerik 6 digit pada layar bilik.<br>* Memberikan pilihan suara pada 3 surat suara bertahap.<br>* Melakukan review konfirmasi dan submit suara rahasia. |
| **Panwaslu (Pengawas)** | Komisioner Badan Pengawas Pemira | Memahami hukum acara sengketa dan independen | * Memantau *Live Audit Monitor* (turnout, rate pemilih/jam).<br>* Memeriksa keutuhan rantai hash (*Hash Chain Verifier*).<br>* Menerima, memeriksa, dan memutus laporan sengketa daring.<br>* Menandatangani Berita Acara digital secara resmi. |
| **Saksi Paslon** | Utusan resmi kandidat pemira | Memiliki surat mandat sah, mengawal perolehan suara paslon | * Menyaksikan uji kotak suara nol sebelum TPS dibuka.<br>* Memantau proses pembukaan sidang pleno rekapitulasi.<br>* Membubuhkan catatan keberatan saksi pada Berita Acara.<br>* Menandatangani Berita Acara hasil akhir perolehan suara. |
| **Publik (Civitas)** | Dosen, mahasiswa umum, dan alumni | Pengakses portal publik via web browser | * Mengakses profil kandidat dan visi-misi selama masa kampanye.<br>* Mengakses pengumuman resmi dan hasil pleno pasca-pengesahan. |

### 2.4 Lima Hukum Arsitektur Non-Negotiable (Hard Constraints)
Seluruh modul implementasi sistem **wajib tunduk 100% tanpa kompromi** pada lima hukum arsitektur berikut:

1. **Hukum 1: Zero-Knowledge Ballot Isolation (Pemisahan Mutlak Identitas & Suara)**
   * Dilarang keras membuat *Foreign Key*, relasi relasional, atau kolom `voter_id` / `nim` di dalam tabel `ballot_boxes` maupun `voting_tokens`.
   * Tabel `voters` hanya mencatat kehadiran administratif (`has_voted = TRUE`, `status = 'SUDAH_MEMILIH'`).
   * Tabel `ballot_boxes` menyimpan suara dengan *timestamp jitter* (pengacakan mikro-detik) dan UUID acak murni sehingga korelasi temporal dengan waktu pendaftaran di meja PPUR terputus total.
2. **Hukum 2: Atomic Ballot Submission & Single-Use Token**
   * Pengiriman suara di Kiosk wajib berjalan dalam satu transaksi basis data atomik (`DB Transaction`):
     1. Validasi token berstatus `ACTIVE` dan masih dalam batas TTL 10 menit.
     2. Validasi kesesuaian prodi pemilih terhadap kandidat HIMA (*Server-Side Assertion*).
     3. Penyimpanan 3 surat suara secara berantai (*SHA-256 Hash Chaining*).
     4. Pembaruan status token menjadi `USED`.
     5. Pembaruan status pemilih di DPT menjadi `SUDAH_MEMILIH`.
     6. Pencatatan *event* ke tabel `audit_logs` (*append-only* tanpa membocorkan pilihan calon).
3. **Hukum 3: Aturan Calon Tunggal vs Kotak Kosong (Pasal 9 Ayat 3 UUD IKM)**
   * Jika hanya ada 1 pasangan calon pada kategori apapun, sistem wajib mengaktifkan opsi **"KOTAK KOSONG"** secara otomatis.
   * Paslon tunggal dinyatakan menang jika dan hanya jika meraih suara sah **$> 50\%$**. Jika $\le 50\%$, status hasil wajib ditetapkan secara otomatis sebagai **`MANDAT_KEMBALI_KE_MUSYAWARAH_MAHASISWA`**.
4. **Hukum 4: Server-Side Multi-Ballot Prodi Filtering**
   * Pemilih hanya berhak menerima: $\text{Surat Suara} = \{\text{BEM}\} \cup \{\text{DPM}\} \cup \{\text{HIMA Prodi Terkait}\}$.
   * Mahasiswa Prodi Budidaya Perkebunan Kelapa Sawit (BKS/TPTP) tidak boleh menerima payload data calon HIMA TRPL, TPHP, atau Manajemen Logistik dari API, begitu pula sebaliknya.
5. **Hukum 5: Pleno Vault Lock & Emergency Freeze**
   * Seluruh endpoint API rekapitulasi suara wajib mengembalikan kode status **`HTTP 423 Locked`** selama pemungutan suara berlangsung.
   * Sistem menyediakan saklar *Emergency Freeze* global. Jika diaktifkan, seluruh penerbitan token PPUR dan pengiriman bilik Kiosk dihentikan seketika dengan notifikasi resmi.

### 2.5 Asumsi dan Ketergantungan
* Data master mahasiswa aktif dari BAAK Poltek CWE telah tervalidasi dan diserahkan dalam format CSV/XLSX sebelum tahapan DPT dimulai.
* Pasokan listrik di gedung TPS didukung oleh UPS dan genset cadangan kampus.
* Perangkat bilik Kiosk dioperasikan dalam mode peramban layar penuh terkunci (*Kiosk Mode / App Pinning*).

---

## 3. Spesifikasi Kebutuhan Fungsional Lengkap (FR-01 s/d FR-08)

### 3.1 FR-01: Manajemen Konfigurasi Eleksi & Tahapan
* **FR-01.1 (Penetapan Jendela Waktu)**: Sistem harus memungkinkan Komisioner KPUM mengatur jadwal waktu mulai dan selesai untuk setiap tahapan pemilihan (Pendaftaran Calon, Verifikasi, Kampanye, Masa Tenang, Pemungutan Suara TPS, dan Sidang Pleno).
* **FR-01.2 (Emergency Freeze Darurat)**: Sistem harus menyediakan tombol *Emergency Freeze* yang hanya dapat diakses oleh ITPO dan KPUM dengan otentikasi ganda. Jika aktif, seluruh operasi meja PPUR dan bilik Kiosk berhenti seketika, dan sistem menampilkan banner pemberitahuan status darurat.
* **FR-01.3 (Segel & Reset Periode Eleksi)**: Sistem harus menyediakan fungsi pengarsipan lembar periode lama secara *append-only* (`ElectionArchive`) sebelum membuka gelombang eleksi baru, menyimpan rekap final, snapshot audit log, dan rantai hash terdahulu.

### 3.2 FR-02: Manajemen Daftar Pemilih Tetap (DPT)
* **FR-02.1 (Impor Massal Data BAAK)**: Sistem harus mampu mengimpor berkas CSV/XLSX berisi minimal field: `NIM`, `Nama Mahasiswa`, `Program Studi`, `Angkatan`, dan `Lokasi TPS`.
* **FR-02.2 (Pencegahan Duplikasi NIM)**: Sistem wajib memvalidasi keunikan NIM sebagai kunci primer (*Primary Key*). Jika ditemukan NIM ganda dalam berkas impor, sistem harus menolak baris duplikat dan menerbitkan laporan galat (*error report*).
* **FR-02.3 (Pencarian Instan Meja PPUR)**: Sistem harus menyediakan antarmuka pencarian cepat DPT pada meja PPUR berdasarkan kata kunci NIM atau Nama Mahasiswa dengan waktu respon kueri $< 200$ ms.
* **FR-02.4 (Pelacakan Status Kehadiran 3-State)**: Sistem harus mencatat dan memperbarui status pemilih ke dalam 3 tingkatan status:
  1. `BELUM_MEMILIH`: Status awal mahasiswa terdaftar dalam DPT.
  2. `DALAM_ANTREAN`: Pemilih telah terverifikasi fisik di meja PPUR dan slip token telah dicetak (sedang menuju bilik Kiosk).
  3. `SUDAH_MEMILIH`: Pemilih telah menuntaskan pengiriman suara di bilik Kiosk atau status difinalisasi oleh sistem.

### 3.3 FR-03: Manajemen Kandidat & Kotak Kosong
* **FR-03.1 (Struktur Multi-Ballot 3 Kategori)**: Sistem harus mendukung pengelolaan master data calon untuk 3 kategori:
  1. Presma & Wapresma (Tingkat Institusi / Seluruh Mahasiswa).
  2. Pimpinan DPM (Ketua Umum, Wakil Ketua I, Wakil Ketua II).
  3. Gubernur/Ketua HIMA Program Studi (Spesifik per 5 prodi: TPTP/BKS, TPHP, MANLOG, BD, TRPL).
* **FR-03.2 (Manajemen Profil Kandidat)**: Sistem harus menyimpan nomor urut, foto resmi pimpinan & wakil, visi, misi (dalam format JSON array), dan warna aksen kartu kandidat.
* **FR-03.3 (Generator Otomatis Kotak Kosong)**: Apabila dalam suatu kategori pemilihan hanya terdapat 1 pasangan calon yang disahkan KPUM, sistem wajib membuat entitas kartu tandingan **"KOTAK KOSONG"** (`isEmptyBox = TRUE`) secara otomatis dengan nomor urut berikutnya atau format pilihan setuju/tidak setuju sesuai mandat Pasal 9 ayat 3 UUD IKM.
* **FR-03.4 (Pilihan Suara Kosong / Abstain Sah)**: Sistem harus menyediakan opsi resmi "Suara Kosong" di posisi terakhir bilik suara bagi pemilih yang secara sadar tidak ingin memilih pasangan calon manapun; suara ini terhitung sebagai suara sah masuk kotak suara namun tidak menambah perolehan kandidat.

### 3.4 FR-04: Otentikasi & Penerbitan Token Meja PPUR
* **FR-04.1 (Hak Akses Operator Terikat TPS)**: Petugas PPUR wajib melakukan login terotentikasi yang terikat dengan ID TPS penugasan tertentu (`tpsId`).
* **FR-04.2 (Pembangkitan Token CSPRNG Acak)**: Sistem harus menerbitkan token 6-karakter alfanumerik menggunakan algoritma *Node Crypto CSPRNG* yang diambil dari himpunan karakter bebas ambigu: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (menghapus karakter ambigu `0, O, 1, I`).
* **FR-04.3 (Kontrol Masa Berlaku TTL 10 Menit)**: Token yang diterbitkan memiliki batas waktu penggunaan (*Time-To-Live*) tepat 10 menit sejak diterbitkan. Jika waktu terlampaui, status token otomatis menjadi `EXPIRED`.
* **FR-04.4 (Kerahasiaan Hash Token)**: Sistem dilarang menyimpan *plaintext* token di basis data; hanya nilai `tokenHash` (SHA-256) yang disimpan pada tabel `voting_tokens`.
* **FR-04.5 (Pencetakan Slip Token)**: Sistem harus menyediakan fungsi cetak slip token instan ke perangkat mini thermal printer 58mm yang memuat kode token berukuran raksasa, timestamp terbit, dan petunjuk ringkas bagi pemilih.
* **FR-04.6 (Pembatalan & Terbit Ulang Token)**: Jika token kedaluwarsa sebelum digunakan akibat kendala teknis antrean, petugas PPUR memiliki wewenang membatalkan token lama (`status = REVOKED`) dan menerbitkan token baru dengan kewajiban mengisi log alasan pembatalan.

### 3.5 FR-05: Antarmuka Kiosk Bilik Suara Fullscreen
* **FR-05.1 (Mode Fullscreen & Keamanan Kiosk)**: Antarmuka bilik suara harus berjalan dalam mode layar penuh (*fullscreen 100dvh*), menonaktifkan klik kanan (*anti-inspect element*), menonaktifkan pintasan keyboard berbahaya, dan bebas bilah navigasi URL.
* **FR-05.2 (Keypad Input Token Ergonomis)**: Layar awal Kiosk menampilkan papan tombol sentuh (*virtual keypad*) berukuran besar untuk memudahkan pemilih mengetikkan 6 digit kode token dari slip meja PPUR.
* **FR-05.3 (Multi-Ballot Wizard 3 Tahap)**: Setelah token tervalidasi, sistem memandu pemilih melewati 3 tahapan pemilihan berurutan:
  * Tahap 1: Surat Suara Presma & Wapresma (Aksen *Tropic Green* `#1B7F4E`).
  * Tahap 2: Surat Suara Pimpinan DPM (Aksen *Tropic Jade* `#0F766E`).
  * Tahap 3: Surat Suara Ketua HIMA (Aksen warna spesifik prodi pemilih sesuai `studyProgramId` token).
* **FR-05.4 (Desain Kartu Sentuh Tactile Neo-Brutalism)**: Kartu paslon wajib menggunakan gaya visual *tactile* dengan border tegas `2px solid #141E19`, bayangan keras `4px 4px 0px #141E19`, dan indikator lencana **"✓ PILIHAN ANDA"** yang jelas saat terpilih.
* **FR-05.5 (Layar Review Konfirmasi Akhir)**: Sebelum suara disubmit permanen, sistem menyuguhkan layar rangkuman pilihan dari ketiga kategori. Pemilih diberikan tombol "Ubah Pilihan" jika ingin mengoreksi pilihan sebelum mengklik "KIRIM SUARA SEKARANG".
* **FR-05.6 (Umpan Balik Sukses & Auto-Reset)**: Setelah transaksi commit sukses, sistem menampilkan animasi konfirmasi sukses bahwa suara telah tersimpan secara rahasia selama 3 detik, lalu secara otomatis mereset tampilan kembali ke halaman input token awal.

### 3.6 FR-06: Kotak Suara Digital & Pleno Vault Lock 423
* **FR-06.1 (Format Suara Acak & Timestamp Jitter)**: Suara yang masuk disimpan ke tabel `ballot_boxes` dengan penambahan *jitter* acak pada timestamp mikro-detik dan ID UUIDv4 acak murni untuk mencegah analisis korelasi waktu kedatangan pemilih.
* **FR-06.2 (Pleno Vault Lock HTTP 423)**: Endpoint kueri hasil perolehan suara (`/api/tally/*`) wajib mengembalikan kode status **`HTTP 423 Locked`** selama pemungutan suara berlangsung. Kueri ke basis data hasil suara dilarang menampilkan agregat apapun sebelum kunci dibuka.
* **FR-06.3 (Prosedur Sidang Pleno Unlocking)**: Pembukaan kotak suara digital (*Pleno Unlocking*) hanya dapat dieksekusi melalui dashboard KPUM yang disaksikan langsung oleh Panwaslu dan Saksi Paslon, memverifikasi status `votingOpen = FALSE`.
* **FR-06.4 (Algoritma Rekapitulasi Suara Eksak)**: Sistem menghitung agregat suara per kategori, suara sah paslon, suara kotak kosong, persentase suara, dan secara otomatis menetapkan status pemenang sesuai ketentuan:
  $$\text{Persentase} = \frac{\text{Suara Paslon}}{\text{Total Suara Sah}} \times 100\%$$
* **FR-06.5 (Penanganan Kasus Suara Seri)**: Apabila perolehan suara dua paslon tertinggi menghasilkan angka yang sama persis, sistem menetapkan status kategori sebagai **`STATUS_SERI_PENDING_PLENO`** dan melampirkan catatan musyawarah pleno.

### 3.7 FR-07: Berita Acara & Tanda Tangan Digital Ed25519
* **FR-07.1 (Otomasi Kanonikal Berita Acara Model C-KWE)**: Sistem secara otomatis mengompilasi seluruh hasil rekapitulasi ke dalam format string kanonikal standar yang memuat: tanggal pemira, jumlah DPT, perolehan suara tiap calon per prodi, dan 5 head rantai hash TPS prodi.
* **FR-07.2 (Penandatanganan Digital Asimetris Ed25519)**: Dokumen kanonikal ditandatangani secara kriptografis menggunakan kunci privat sistem berbasis algoritma Ed25519 (RFC 8032) menghasilkan tanda tangan digital base64 yang diikat permanen ke tabel `ElectionSetting`.
* **FR-07.3 (Ekspor Berita Acara PDF & QR Verification Seal)**: Sistem menghasilkan berkas unduhan PDF resmi Berita Acara Model C-KWE yang dilengkapi dengan kode QR stempel kriptografis; pemindaian kode QR mengarah pada laman verifikasi publik yang memvalidasi integritas dokumen menggunakan kunci publik Ed25519.
* **FR-07.4 (Pencatatan Keberatan Saksi Paslon)**: Sistem menyediakan formulir input khusus bagi saksi resmi kandidat untuk membubuhkan catatan keberatan formal yang dicantumkan langsung pada lampiran Berita Acara elektronik.

### 3.8 FR-08: Pengawasan Panwaslu, Audit Log & Sengketa
* **FR-08.1 (Live Audit Monitor Proyektor Dark Mode)**: Sistem menyediakan portal monitor khusus Panwaslu dengan tema gelap (*Obsidian Forest* `#0D1512`) yang menyajikan visualisasi tingkat kehadiran mahasiswa (*Turnout Rate*), grafik laju pemilih per jam, dan status keaktifan bilik TPS tanpa mengekspos hasil suara sementara.
* **FR-08.2 (Integritas Log Append-Only)**: Setiap aksi penting sistem (token diterbitkan, token kedaluwarsa, suara masuk, aktivasi freeze, pleno unlock) wajib dicatat ke tabel `AuditLog` secara *append-only* (tanpa izin edit atau hapus).
* **FR-08.3 (Portal Pelaporan Sengketa Daring)**: Sistem menyediakan modul formulir laporan dugaan pelanggaran pemira (sesuai Pasal 65 RUU Pemira), mencakup: identitas pelapor, terlapor, lokasi kejadian, uraian peristiwa, dan pengunggahan berkas bukti foto/dokumen.
* **FR-08.4 (Modul Eksekusi Sanksi Pemotongan Suara)**: Apabila sidang Dewan Kehormatan Penyelenggara Pemira (DKPPR) atau Panwaslu menjatuhkan sanksi administratif berupa pemotongan perolehan suara kepada kandidat (Pasal 67), sistem menyediakan fitur input penyesuaian sanksi resmi yang dicatat transparan dalam Berita Acara.

---

## 4. Kebutuhan Non-Fungsional (Non-Functional Requirements - NFR)

### 4.1 NFR-01: Keamanan Sistem & Kriptografi
* **NFR-01.1 (Zero-Knowledge Isolation)**: Struktur basis data dilarang memiliki jembatan relasi langsung maupun tidak langsung antara identitas pemilih di tabel `voters` dengan catatan pilihan di tabel `ballot_boxes`.
* **NFR-01.2 (SHA-256 Ballot Hash Chaining)**: Setiap suara yang masuk ke kotak suara digital wajib terikat dengan hash blok sebelumnya menggunakan rumus matematis:
  $$\text{Hash}_n = \text{SHA256}(\text{Hash}_{n-1} \parallel \text{ballotId} \parallel \text{category} \parallel \text{candidateId} \parallel \text{timestamp} \parallel \text{tpsSalt})$$
* **NFR-01.3 (Otentikasi Sandi Scrypt & 2FA TOTP)**: Sandi operator di-hash menggunakan algoritma `scrypt` dengan salt unik per pengguna. Akun komisioner KPUM dan Super Admin diwajibkan mengaktifkan 2-Factor Authentication (TOTP RFC 6238) dengan enkripsi kunci rahasia AES-256-GCM.
* **NFR-01.4 (Perlindungan Serangan Web Standar)**: Sistem kebal terhadap ancaman OWASP Top 10: SQL Injection (dicegah via Prisma parameterized query), Cross-Site Scripting (XSS Sanitization), Cross-Site Request Forgery (CSRF Protection), dan Session Hijacking.
* **NFR-01.5 (Rate Limiting Ketat)**: Endpoint input token dan otentikasi dibatasi secara ketat (*rate limit* maksimal 5 percobaan gagal per IP/menit) dengan perbandingan token *timing-safe constant time* (`timingSafeEqual`) guna mencegah *timing attacks*.

### 4.2 NFR-02: Kinerja & Skalabilitas (Performance)
* **NFR-02.1 (Latensi Respon Bilik Kiosk)**: Waktu respon antarmuka Kiosk pada saat pemilih mengklik tombol kandidat atau navigasi halaman tidak boleh melebihi **500 milidetik** ($p95 < 300\text{ ms}$).
* **NFR-02.2 (Throughput Transaksi Paralel)**: Sistem mampu melayani sedikitnya 50 pengiriman suara simultan secara paralel tanpa kegagalan transaksi (*zero concurrency deadlock*).
* **NFR-02.3 (Kecepatan Tallying Rekapitulasi)**: Proses penghitungan suara menyeluruh seluruh kategori saat sidang pleno berlangsung wajib selesai dalam tempo $< 5$ detik.

### 4.3 NFR-03: Ketersediaan & Keandalan (Availability & Fault Tolerance)
* **NFR-03.1 (Tingkat Ketersediaan Operasional)**: Sistem menjamin ketersediaan (*uptime*) minimal **99.9%** selama rentang waktu jam pemungutan suara di TPS berlangsung.
* **NFR-03.2 (Dukungan Operasi Offline LAN)**: Sistem harus mampu dijalankan secara mandiri pada jaringan lokal tertutup (*Local Area Network*) tanpa ketergantungan koneksi internet publik.
* **NFR-03.3 (Integritas Transaksi ACID)**: Seluruh operasi modifikasi status token, DPT, dan surat suara wajib berjalan di bawah jaminan transaksi ACID (*Atomicity, Consistency, Isolation, Durability*).

### 4.4 NFR-04: Aksesibilitas, Ergonomi & Kepatuhan Desain
* **NFR-04.1 (Kepatuhan WCAG AA Contrast Compliance)**: Seluruh teks dan elemen kontrol interaktif wajib memiliki rasio kontras warna minimal **4.5:1** terhadap latar belakang kanvas.
* **NFR-04.2 (Ergonomi Sentuh Kiosk)**: Seluruh tombol pada bilik Kiosk memiliki target sentuh (*touch target*) minimal **$56 \times 56\text{ px}$** untuk kenyamanan navigasi jari di tablet touchscreen.
* **NFR-04.3 (Anti-AI Slop & Filosofi Neo-Editorial)**: Antarmuka dibangun sesuai panduan `DESIGN.md`: menggunakan latar kanvas hangat *Warm Oat Milk* (`#F6F4EE`), teks *Deep Espresso Ink* (`#141E19`), bebas gradasi ungu/biru generik, dan tipografi angka tabular (*tabular-nums*) untuk data token dan NIM.

---

## 5. Kebutuhan Antarmuka Eksternal (External Interface Requirements)

### 5.1 Antarmuka Pengguna (User Interface)
* **Kiosk Interface**: Layar penuh (*100dvh*), kartu kandidat *Tactile Neo-Brutalism* (`shadow-[4px_4px_0px_#141E19]`), header kategori dengan warna eksklusif prodi, dialog konfirmasi modal, dan penanda visual yang kontras.
* **Admin & PPUR Interface**: Layout *Bento Grid* berdensitas tinggi, tabel DPT dengan pencarian instan, tombol cetak slip token, dan counter antrean TPS real-time.
* **Layar Pleno & Monitor Panwaslu**: Antarmuka gelap sinematik (`.theme-pleno-dark` *Obsidian Forest* `#0D1512`), grafik visualisasi batang perolehan suara, indikator ambang 50%, dan log transaksi langsung.

### 5.2 Antarmuka Perangkat Keras (Hardware Interface)
* **Perangkat Kiosk**: Monitor sentuh atau tablet beresolusi minimal $1280 \times 800\text{ px}$ dengan dukungan sentuhan multitouch.
* **Server TPS**: Unit Mini-PC atau Laptop (Minimal CPU 4-Core, RAM 8GB, SSD NVMe) bertenaga UPS cadangan.
* **Printer Slip Token**: Mini Thermal Printer 58mm (koneksi USB / Serial / Bluetooth) yang mendukung pencetakan teks monospaced dan barcode.

### 5.3 Antarmuka Perangkat Lunak (Software Interface)
* **Operating System**: Linux Ubuntu Server 22.04 LTS / Windows 11 Pro 64-bit.
* **Runtime & Framework**: Node.js v20+ / Bun Runtime, Next.js 15 (App Router), React 19.
* **Database Management System**: SQLite / LibSQL (melalui Prisma ORM) dengan driver transaksi ACID native.
* **Web Server & Reverse Proxy**: Caddy Server / Nginx dengan konfigurasi otomatis SSL/TLS internal.

### 5.4 Antarmuka Komunikasi (Communication Interface)
* **Protokol Jaringan**: HTTP/2 melalui TLS v1.3 (HTTPS) untuk enkripsi end-to-end lalu lintas data lokal maupun publik.
* **Komunikasi Data**: RESTful JSON API dan Server-Sent Events (SSE) untuk pembaharuan log monitor secara real-time.

---

## 6. Matriks Keterlacakan Kebutuhan (Requirements Traceability Matrix - RTM)

Matriks keterlacakan berikut memetakan keterkaitan antara Landasan Regulasi, Kebutuhan Fungsional (FR), Kebutuhan Non-Fungsional (NFR), dan Modul Kode Implementasi:

| ID Regulasi | Kode Kebutuhan Fungsional | Deskripsi Singkat Kebutuhan | Kode NFR Terkait | Modul Implementasi Basis Kode | Status Verifikasi |
| :--- | :---: | :--- | :---: | :--- | :---: |
| Ketetapan DPM Ps. 1 & 3 | **FR-01** | Konfigurasi Eleksi & Emergency Freeze | NFR-01, NFR-03 | `src/app/api/election/*`, `middleware.ts` | Terverifikasi |
| UUD IKM Ps. 27, RUU Ps. 42 | **FR-02** | Manajemen DPT & Filter Hak Suara Prodi | NFR-02, NFR-04 | `src/lib/db/voter-service.ts`, `ppur/page.tsx` | Terverifikasi |
| UUD IKM Ps. 9 ayat 3 & 4 | **FR-03** | Kandidat & Kotak Kosong Calon Tunggal | NFR-01, NFR-04 | `src/lib/constants/election.ts`, `kiosk/*` | Terverifikasi |
| RUU Pemira Ps. 6 & 61 | **FR-04** | Token Meja PPUR CSPRNG & TTL 10m | NFR-01, NFR-02 | `src/lib/crypto/token-generator.ts` | Terverifikasi |
| UUD IKM Ps. 27 (LUBER) | **FR-05** | Kiosk Bilik Suara Fullscreen 3 Surat Suara | NFR-02, NFR-04 | `src/app/(kiosk)/bilik/*`, `tactile-button` | Terverifikasi |
| UUD IKM Ps. 9, RUU Ps. 64 | **FR-06** | Kotak Suara Digital & Pleno Vault Lock 423 | NFR-01, NFR-02 | `src/lib/db/ballot-service.ts`, `tally-service` | Terverifikasi |
| RUU Pemira Ps. 64 | **FR-07** | Berita Acara Model C-KWE & Ed25519 Sign | NFR-01, NFR-03 | `src/lib/server/ba-signing.ts`, `ba-canonical`| Terverifikasi |
| RUU Pemira Ps. 65 & 67 | **FR-08** | Live Audit Panwaslu, Sengketa & Sanksi | NFR-01, NFR-04 | `src/app/(panwaslu)/*`, `AuditLog` | Terverifikasi |
