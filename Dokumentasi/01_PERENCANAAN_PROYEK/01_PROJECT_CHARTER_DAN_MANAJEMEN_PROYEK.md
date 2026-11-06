# PROJECT CHARTER & RENCANA MANAJEMEN PROYEK
## SISTEM E-VOTING SMART PEMIRA (SMART PEMILIHAN UMUM RAYA)
### Politeknik Kelapa Sawit Citra Widya Edukasi (Poltek CWE)

---

| Atribut Dokumen | Rincian Dokumen |
| :--- | :--- |
| **Judul Proyek** | Pengembangan Sistem E-Voting Terintegrasi "Smart Pemira Poltek CWE" |
| **Kode Dokumen** | `DOC-PLAN-001` |
| **Versi Dokumen** | `1.0.0` (Definitif / Release Baseline) |
| **Status Dokumen** | Disetujui (Approved by Steering Committee & DPM Poltek CWE) |
| **Pemilik Proyek** | Tim Informasi dan Teknologi Pemira Online (ITPO) Poltek CWE |
| **Sponsor Proyek** | Dewan Perwakilan Mahasiswa (DPM) & Komisi Pemilihan Umum Mahasiswa (KPUM) |
| **Institusi Naungan** | Ikatan Keluarga Mahasiswa Politeknik Kelapa Sawit Citra Widya Edukasi |
| **Klasifikasi Akses** | Terbatas (Internal Civitas Akademika & Panitia Pemira) |

---

## DAFTAR ISI
1. [Latar Belakang & Urgensi Transformasi](#1-latar-belakang--urgensi-transformasi)
2. [Landasan Yuridis & Konstitusional](#2-landasan-yuridis--konstitusional)
3. [Visi, Misi, dan Tujuan Strategis Proyek](#3-visi-misi-dan-tujuan-strategis-proyek)
4. [Indikator Keberhasilan Proyek (Key Performance Indicators)](#4-indikator-keberhasilan-proyek-key-performance-indicators)
5. [Ruang Lingkup Proyek (Project Scope Management)](#5-ruang-lingkup-proyek-project-scope-management)
6. [Analisis Pemangku Kepentingan (Stakeholder Analysis & RACI Matrix)](#6-analisis-pemangku-kepentingan-stakeholder-analysis--raci-matrix)
7. [Struktur Tata Kelola Proyek (Project Governance)](#7-struktur-tata-kelola-proyek-project-governance)
8. [Manajemen Risiko Proyek (Risk Breakdown Structure & Mitigasi)](#8-manajemen-risiko-proyek-risk-breakdown-structure--mitigasi)
9. [Estimasi Anggaran & Alokasi Sumber Daya](#9-estimasi-anggaran--alokasi-sumber-daya)
10. [Lembar Pengesahan Project Charter](#10-lembar-pengesahan-project-charter)

---

## 1. Latar Belakang & Urgensi Transformasi

Pemilihan Umum Raya (Pemira) di lingkungan Politeknik Kelapa Sawit Citra Widya Edukasi (Poltek CWE) merupakan manifestasi kedaulatan mahasiswa tertinggi dalam menentukan nakhoda kepemimpinan eksekutif (Presiden & Wakil Presiden Mahasiswa), pimpinan legislatif (Dewan Perwakilan Mahasiswa), serta kepengurusan Himpunan Mahasiswa Program Studi (HIMA). 

Secara historis, pelaksanaan Pemira berbasis kertas manual (*paper-based ballot*) menghadapi sejumlah tantangan struktural yang signifikan:
1. **Beban Biaya dan Logistik Tinggi**: Pengadaan ribuan lembar kertas suara, bilik suara fisik, kotak suara gembok manual, serta logistik tinta dan formulir C1 fisik menghabiskan alokasi anggaran kemahasiswaan yang substansial.
2. **Kerentanan Human-Error dan Keabsahan Suara**: Proses pencoblosan manual sering menimbulkan perdebatan interpretasi surat suara sah vs tidak sah (misal: coblos tembus, coblos ganda, coblos di luar garis batas).
3. **Lamanya Waktu Rekapitulasi Manual**: Penghitungan suara manual di TPS kampus memakan waktu hingga larut malam, memicu kelelahan fisik panitia dan meningkatkan tensi konflik horizontal antar tim sukses.
4. **Keterbatasan Audit Integritas**: Ketiadaan rantai jejak digital (*audit trail*) yang terverifikasi secara matematis mempersulit penyelesaian sengketa pemilu di tingkat Panitia Pengawas Pemilu Raya (Panwaslu).

Sistem **Smart Pemira** diinisiasi sebagai jawaban rekayasa perangkat lunak modern untuk mengonversi seluruh proses pemilihan menuju platform digital berbasis web yang aman, terisolasi secara kriptografis (*Zero-Knowledge Ballot*), transparan, dan mampu menjamin hak suara mahasiswa tanpa mengorbankan asas LUBER JURDIL (Langsung, Umum, Bebas, Rahasia, Jujur, dan Adil).

---

## 2. Landasan Yuridis & Konstitusional

Pengembangan dan pengoperasian Smart Pemira memiliki legitimasi hukum formal yang mengikat seluruh civitas kemahasiswaan Poltek CWE, berakar pada dua instrumen regulasi utama:

```
                      +------------------------------------------+
                      |       UNDANG-UNDANG DASAR IKM CWE        |
                      |  Konstitusi Induk Mahasiswa Poltek CWE   |
                      +--------------------+---------------------+
                                           |
                                           v
                      +------------------------------------------+
                      |   KETETAPAN DPM NO. 005/DPM-CWE/KEP/VII  |
                      |   Regulasi Penyelenggaraan Pemira Online |
                      +--------------------+---------------------+
                                           |
                                           v
                      +------------------------------------------+
                      |      SISTEM E-VOTING SMART PEMIRA        |
                      |  Spesifikasi Rekayasa Teknis Tim ITPO    |
                      +------------------------------------------+
```

### 2.1 Klausul Rujukan UUD IKM Poltek CWE
* **Pasal 1 ayat (2)**: Kedaulatan IKM berada di tangan seluruh mahasiswa dan dijalankan sepenuhnya menurut ketentuan Undang-Undang Dasar.
* **Pasal 9 ayat (1) s/d (5)**: 
  * Pasangan Calon Presiden dan Wakil Presiden Mahasiswa dipilih langsung dalam satu pasangan utuh melalui Pemira.
  * Pasangan calon peraih suara terbanyak disahkan dan dilantik dalam Sidang Musyawarah Mahasiswa.
  * **Klausul Calon Tunggal (Pasal 9 ayat 3 & 4)**: Apabila hanya terdapat 1 (satu) pasangan calon yang lolos verifikasi, pemilihan dilaksanakan melawan opsi **Kotak Kosong**. Calon tunggal dinyatakan menang jika dan hanya jika meraih suara **lebih dari 50% ($> 50\%$)** dari total suara sah. Jika tidak mencapai $50\%$, mandat kepemimpinan dikembalikan kepada Musyawarah Mahasiswa.
* **Pasal 13 ayat (2)**: Pengakuan hak otonom mahasiswa program studi dalam memilih ketua dan pengurus Himpunan Mahasiswa Program Studi (HIMA).
* **Pasal 19 ayat (2) & (4)**: Komposisi Dewan Perwakilan Mahasiswa (Ketua Umum, Wakil Ketua I, dan Wakil Ketua II) dipilih secara langsung dengan jaminan keterwakilan proporsional seluruh program studi.
* **Pasal 27 ayat (1) s/d (6)**: Pemira wajib berasaskan LUBER JURDIL, diselenggarakan secara periodik satu tahun sekali oleh Komisi Pemilihan Umum Mahasiswa (KPUM), serta diawasi secara independen oleh Panitia Pengawas Pemira (Panwaslu).

### 2.2 Klausul Rujukan Ketetapan DPM No. 005/DPM-CWE/KEP/VII/2024
* **Pasal 1 & Pasal 3**: Penyelenggaraan pemungutan dan penghitungan suara dilakukan dengan memanfaatkan teknologi informasi yang dibangun dan dikelola secara mandiri oleh **Tim Informasi dan Teknologi Pemira Online (ITPO)**.
* **Pasal 6 & Pasal 61**: Mekanisme pemungutan suara dipusatkan pada **TPS Diam (On-Premise)** di lingkungan kampus Poltek CWE menggunakan bilik suara digital (*Kiosk*), menjamin *one person one vote* tanpa perwakilan atau titip suara.
* **Pasal 42**: Kriteria pemilih sah adalah mahasiswa aktif terdaftar di Pangkalan Data Akademik (BAAK) Poltek CWE, dibuktikan melalui KTM/KRS resmi.
* **Pasal 64 & Pasal 67**: Penerbitan Berita Acara Model C-KWE secara otomatis, pengesahan tanda tangan digital multipihak, serta mekanisme yudisial penanganan sengketa dan sanksi pemotongan suara.

---

## 3. Visi, Misi, dan Tujuan Strategis Proyek

### 3.1 Visi Proyek
Mewujudkan platform e-voting kemahasiswaan terdepan yang berintegritas tinggi, berkeamanan kriptografis mutlak (*cryptographically verifiable*), ramah pengguna (*accessible*), dan menjadi percontohan tata kelola pemilu digital di pendidikan vokasi perkebunan nasional.

### 3.2 Misi Proyek
1. Mengembangkan sistem bilik suara digital (*Kiosk*) yang intuitif, ergonomis, dan mengusung filosofi desain *Neo-Editorial Botanical* khas kampus perkebunan sawit.
2. Menjamin kerahasiaan pilihan pemilih melalui arsitektur *Zero-Knowledge Ballot* tanpa jejak identitas yang mengaitkan pemilih dengan surat suara.
3. Membangun integritas data suara berbasis rantai hash (*SHA-256 Hash Chaining*) dan tanda tangan digital dokumen resmi berbasis *Ed25519 (RFC 8032)*.
4. Menyediakan modul pengawasan real-time bagi Panwaslu dan saksi tanpa membuka kerahasiaan hasil suara sebelum Sidang Pleno resmi (*Pleno Vault Lock*).
5. Mendukung operasional tangguh secara *Dual-Mode* (kemampuan beroperasi pada jaringan intranet lokal/LAN kampus saat internet publik padam, maupun deploy cloud).

### 3.3 Tujuan Strategis & Target Deliverable
* **Tujuan 1 (Integritas)**: Terciptanya sistem pemungutan suara tanpa kebocoran pilihan pemilih ($0\%$ korelasi data) dan pencegahan coblos ganda secara absolut ($100\%$ terverifikasi).
* **Tujuan 2 (Efisiensi)**: Memangkas durasi pemungutan suara per mahasiswa hingga di bawah 90 detik dan menyelesaikan rekapitulasi pleno dalam waktu $< 5$ detik setelah gembok digital dibuka.
* **Tujuan 3 (Akuntabilitas)**: Menerbitkan Berita Acara Model C-KWE berformat PDF resmi yang dilengkapi stempel kriptografis (*QR Verification Seal*) yang dapat diuji integritasnya oleh publik kapan saja.

---

## 4. Indikator Keberhasilan Proyek (Key Performance Indicators)

Keberhasilan implementasi Smart Pemira diukur berdasarkan parameter kuantitatif dan kualitatif berikut:

| Kategori KPI | Indikator Metrik | Nilai Target (Baseline) | Metode Verifikasi |
| :--- | :--- | :--- | :--- |
| **Partisipasi Pemilih** | Persentase kehadiran mahasiswa dalam DPT (*Turnout*) | $\ge 85.0\%$ dari total DPT aktif | Rekapitulasi sistem DPT terverifikasi pada Dashboard Panwaslu |
| **Kinerja Teknis** | Waktu respon latensi input bilik suara Kiosk | $< 500$ milidetik ($p99 < 800\text{ ms}$) | Pengujian beban (Load Testing) & Web Vitals |
| **Throughput TPS** | Durasi rata-rata alur pemilih (PPUR s/d Bilik Kiosk) | $\le 90$ detik per pemilih | Observasi simulasi gladi resik lapangan |
| **Kerahasiaan Suara** | Derajat keterkaitan identitas pemilih vs surat suara | **$0\%$ (Zero Correlation)** | Audit struktur basis data & kueri SQL oleh auditor independen |
| **Integritas Rantai** | Validitas rantai hash SHA-256 pada seluruh TPS | **$100\%$ Valid (0 broken block)** | Eksekusi otomatis fungsi `verifyChain()` saat sidang pleno |
| **Ketersediaan Sistem** | Uptime ketersediaan server selama jam pemilihan | $\ge 99.9\%$ operasional lancar | Log monitoring infrastruktur (Caddy/Node process) |
| **Keamanan Autentikasi** | Ketahanan token bilik terhadap serangan tebak/brute-force | Entropi CSPRNG 30-karakter ($30^6$ kombinasi) | Analisis kriptografis modul `token-generator.ts` |
| **Kepuasan Pengguna** | Indeks kepuasan pengguna (*Customer Satisfaction / CSAT*) | $\ge 90\%$ responden puas/sangat puas | Kuesioner evaluasi pasca-pemira kepada mahasiswa |

---

## 5. Ruang Lingkup Proyek (Project Scope Management)

### 5.1 Cakupan Pekerjaan (In-Scope)
1. **Modul Konfigurasi & Manajemen Tahapan (FR-01)**:
   - Pengaturan jendela waktu eleksi, tahapan pemilihan, dan saklar *Emergency Freeze* darurat.
2. **Modul Manajemen DPT & Integrasi Data BAAK (FR-02)**:
   - Parser CSV/XLSX data mahasiswa, filter prodi, pencegahan duplikasi NIM, dan pelacak status kehadiran 3 tahap (`BELUM_MEMILIH`, `DALAM_ANTREAN`, `SUDAH_MEMILIH`).
3. **Modul Manajemen Kandidat & Kotak Kosong (FR-03)**:
   - Pengelolaan profil paslon 3 kategori (Presma-Wapresma, DPM, Ketua HIMA) serta generator dinamis opsi Kotak Kosong untuk calon tunggal (Pasal 9 ayat 3 UUD IKM).
4. **Modul Otentikasi & Penerbitan Token Meja PPUR (FR-04)**:
   - Mesin penerbit token alfanumerik CSPRNG 6 karakter bebas karakter ambigu (`0/O/1/I`), kontrol TTL 10 menit, dan sistem cetak slip token.
5. **Modul Kiosk Bilik Suara Full-Screen (FR-05)**:
   - Wizard alur bertahap 3 surat suara dengan identitas warna eksklusif per prodi, kartu sentuh *Tactile Neo-Brutalism*, layar review konfirmasi, dan auto-reset aman.
6. **Modul Kotak Suara Digital & Sidang Pleno Vault (FR-06)**:
   - Penyimpanan suara teracak (*timestamp jitter* & UUIDv4), mekanisme penguncian endpoint hasil (*HTTP 423 Locked*), dan prosedur otorisasi pembukaan pleno serentak.
7. **Modul Berita Acara Elektronik Model C-KWE (FR-07)**:
   - Generator dokumen kanonikal, penandatanganan asimetris digital Ed25519 (RFC 8032), dan ekspor PDF resmi dengan QR Code verifikasi.
8. **Modul Pengawasan, Sengketa & Audit Trail Panwaslu (FR-08)**:
   - Layar monitor berdensitas tinggi (*High-Craft Dark Mode*), pencatatan audit log append-only, formulir sengketa online, dan pencatatan sanksi pemotongan suara.

### 5.2 Di Luar Cakupan (Out-of-Scope)
* Pemungutan suara mandiri dari gawai pribadi di luar TPS tanpa verifikasi fisik meja PPUR (karena bertentangan dengan asas TPS Diam Pasal 6 RUU Pemira).
* Integrasi sistem pembayaran bank/keuangan untuk dana kampanye paslon.
* Pengadaan fisik infrastruktur kabel LAN gedung kampus dan renovasi tata ruang aula TPS.

---

## 6. Analisis Pemangku Kepentingan (Stakeholder Analysis & RACI Matrix)

### 6.1 Daftar Pemangku Kepentingan (Stakeholder Register)

| ID | Pemangku Kepentingan | Peran / Institusi | Minat Utama | Tingkat Pengaruh | Tingkat Kepentingan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SH-01** | Komisioner KPUM | Penyelenggara Pemira | Kelancaran proses, kepatuhan jadwal, dan keabsahan hasil pleno | Sangat Tinggi | Sangat Tinggi |
| **SH-02** | Panitia Pengawas (Panwaslu) | Pengawas Independen | Integritas data, ketiadaan manipulasi, dan penanganan sengketa adil | Tinggi | Sangat Tinggi |
| **SH-03** | Dewan Perwakilan Mahasiswa (DPM) | Badan Legislatif Kampus | Kepatuhan konstitusi UUD IKM dan pengesahan Berita Acara | Sangat Tinggi | Tinggi |
| **SH-04** | Petugas TPS (PPUR) | Operator Lapangan TPS | Kemudahan pencarian DPT dan pencetakan token yang cepat | Sedang | Tinggi |
| **SH-05** | Tim ITPO | Pengembang Perangkat Lunak | Kestabilan server, keamanan kriptografi, dan zero-bug sistem | Tinggi | Sangat Tinggi |
| **SH-06** | Saksi Pasangan Calon | Utusan Resmi Kandidat | Transparansi kotak suara (mulai dari nol) dan rekapitulasi jujur | Sedang | Tinggi |
| **SH-07** | Mahasiswa Poltek CWE | Pemilih Berdaulat | Kemudahan mencoblos di bilik, kerahasiaan suara terjamin | Sedang | Sangat Tinggi |
| **SH-08** | Pimpinan Kampus (Wadir III/BAAK) | Pembina Kemahasiswaan | Ketertiban kampus, keabsahan data akademik, dan suasana kondusif | Tinggi | Sedang |

### 6.2 Matriks RACI (Responsible, Accountable, Consulted, Informed)

* **R (Responsible)**: Pihak yang melaksanakan dan menuntaskan tugas.
* **A (Accountable)**: Pihak yang memegang persetujuan akhir dan tanggung jawab yuridis.
* **C (Consulted)**: Pihak yang dimintai masukan teknis/konseptual dua arah.
* **I (Informed)**: Pihak yang menerima pembaruan informasi satu arah.

| Fase / Deliverable Proyek | KPUM | Panwaslu | DPM | ITPO | PPUR | Saksi | Pemilih | BAAK |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Pengesahan Dokumen Charter & SRS** | A | C | A | R | I | I | I | I |
| **Penyusunan & Penguncian DPT** | R | C | I | C | I | I | I | A |
| **Verifikasi Berkas & Penetapan Nomor Urut** | A | C | I | I | I | C | I | I |
| **Konfigurasi Server & Kriptografi Rantai** | I | I | I | A/R | I | I | I | I |
| **Verifikasi Kotak Suara Nol (Pra-Buka TPS)** | A | R | C | C | R | R | I | I |
| **Operasional Registrasi & Token di TPS** | C | I | I | C | A/R | I | I | I |
| **Pemungutan Suara di Bilik Kiosk** | I | C | I | I | I | I | A/R | I |
| **Sidang Pleno Unlocking & Rekapitulasi** | A | R | C | C | I | R | I | I |
| **Penandatanganan Berita Acara Ed25519** | A | R | I | C | R | R | I | I |
| **Penyelesaian Sengketa Pemira** | C | A/R | C | C | I | C | I | I |

---

## 7. Struktur Tata Kelola Proyek (Project Governance)

Tata kelola proyek diatur dalam struktur komando yang jelas guna memastikan koordinasi rekayasa dan kepatuhan hukum berjalan selaras:

```
                  +----------------------------------------------+
                  |               PROJECT SPONSOR                |
                  |     DPM Poltek CWE & Wadir III Kemahasiswaan |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |              STEERING COMMITTEE              |
                  |         Ketua KPUM & Ketua Panwaslu          |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |         PROJECT MANAGER / LEAD ARCHITECT     |
                  |                Ketua Tim ITPO                |
                  +----------------------+-----------------------+
                                         |
         +-------------------------------+-------------------------------+
         |                               |                               |
         v                               v                               v
+------------------+           +------------------+           +------------------+
| FRONTEND & UI/UX |           | BACKEND & CRYPTO |           | DEVOPS, QA & SEC |
| Specialist Lead  |           | Core Specialist  |           | Auditor Lead     |
+------------------+           +------------------+           +------------------+
```

### Rincian Tanggung Jawab Tim Pengembang (ITPO):
1. **Project Manager / Lead Architect**:
   - Memastikan eksekusi proyek tepat waktu, memitigasi kendala antar divisi, dan menjaga kepatuhan arsitektur terhadap 5 Hukum Non-Negotiable (`PROMPT.md`).
2. **Frontend & UI/UX Specialist**:
   - Membangun antarmuka *Tactile Neo-Brutalism* untuk Kiosk dan *Bento Editorial* untuk dashboard administratif sesuai standar *Neo-Editorial Botanical* (`DESIGN.md`).
3. **Backend & Cryptography Specialist**:
   - Merancang transaksi database atomik 6-langkah, kalkulator rantai hash SHA-256, penerbit token CSPRNG, dan modul tanda tangan digital Ed25519.
4. **DevOps, QA & Security Auditor**:
   - Menyiapkan infrastruktur server on-premise/LAN, optimasi engine LibSQL/SQLite, pengujian penetrasi siber, dan audit keandalan zero-knowledge.

---

## 8. Manajemen Risiko Proyek (Risk Breakdown Structure & Mitigasi)

Analisis risiko dilakukan secara komprehensif mencakup aspek teknis, operasional, keamanan siber, dan faktor regulasi organisasi:

| ID Risiko | Deskripsi Risiko | Kategori | Peluang (1-5) | Dampak (1-5) | Skor Risiko | Rencana Mitigasi Preventif | Rencana Kontinjensi / Pemulihan |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **RSK-01** | Padamnya aliran listrik kampus PLN saat jam pemungutan suara di TPS | Teknis / Lingkungan | 3 | 5 | **15 (Tinggi)** | Menyediakan Uninterruptible Power Supply (UPS) pada server lokal dan menggunakan laptop/tablet berdaya baterai mandiri di bilik suara. | Server otomatis berpindah ke genset kampus dalam tempo $< 15$ detik tanpa kehilangan status transaksi DB. |
| **RSK-02** | Terputusnya jaringan internet publik kampus | Infrastruktur | 4 | 4 | **16 (Tinggi)** | Menyiapkan router intranet lokal (LAN tertutup) di area TPS; sistem beroperasi offline penuh tanpa ketergantungan koneksi cloud publik. | Beralih instan ke mode Dual-Mode On-Premise LAN dengan server mini-PC lokal. |
| **RSK-03** | Serangan brute-force tebakan token bilik Kiosk | Keamanan Siber | 2 | 5 | **10 (Sedang)** | Ruang kunci token CSPRNG sebesar $30^6$ kombinasi (729 juta), masa berlaku TTL singkat (10 menit), dan implementasi rate limiter (maksimal 5 percobaan gagal per IP/menit). | Penguncian otomatis IP bilik suara selama 3 menit dan pencatatan insiden ke tabel `AuditLog`. |
| **RSK-04** | Tuduhan kecurangan manipulasi perolehan suara di basis data | Integritas Data | 2 | 5 | **10 (Sedang)** | Implementasi SHA-256 Hash Chaining per prodi dan kunci vault 423. Setiap surat suara terikat dengan hash blok sebelumnya secara matematis. | Verifikasi integritas rantai secara publik di hadapan saksi menggunakan modul `verifyChain()`. |
| **RSK-05** | Terjadinya Calon Tunggal hanya ada 1 pasangan calon | Regulasi / Politik | 4 | 3 | **12 (Sedang)** | Sistem secara otomatis mengaktifkan entitas "Kotak Kosong" (Pasal 9 ayat 3 UUD IKM) jika kandidat kategori bersangkutan hanya berjumlah 1. | Algoritma tallying otomatis menerapkan syarat kemenangan mutlak $> 50\%$ suara sah. |
| **RSK-06** | Pemilih membatalkan pemilihan di tengah bilik suara (Walk-out) | Operasional TPS | 3 | 2 | **6 (Rendah)** | Bilik suara dilengkapi tombol "Batal / Keluar" yang otomatis menghanguskan token dan mereset layar Kiosk ke status awal. | Token ditandai `REVOKED`/`EXPIRED` dan pemilih wajib melapor ke meja PPUR jika terjadi kendala teknis. |
| **RSK-07** | Kebocoran relasi identitas pemilih dengan pilihan paslon | Privasi Data | 1 | 5 | **5 (Rendah)** | Isolasi mutlak tabel `Voter` dan `BallotBox`. Dilarang ada kolom foreign key atau NIM di tabel suara. Timestamp diberi jitter mikro-detik. | Audit skema database berkala memastikan ketiadaan jembatan identitas suara. |

---

## 9. Estimasi Anggaran & Alokasi Sumber Daya

Penyusunan anggaran Smart Pemira dialokasikan secara efisien melalui pemanfaatan gawai inventaris kampus serta teknologi open-source:

| No | Pos Alokasi Pengeluaran | Rincian Item Komponen | Volume | Biaya Satuan (Rp) | Subtotal (Rp) |
| :---: | :--- | :--- | :---: | :---: | :---: |
| 1 | **Infrastruktur Komputasi** | Mini PC / Server Lokal Core i5, RAM 16GB, SSD 512GB (Server TPS Utama) | 1 Unit | 4.500.000 | 4.500.000 |
| 2 | **Daya Cadangan Darurat** | UPS 1200VA / 720W untuk Server TPS & Router | 1 Unit | 1.250.000 | 1.250.000 |
| 3 | **Jaringan Intranet TPS** | Gigabit Router Wi-Fi 6 + Switch 8-Port + Kabel Cat6 | 1 Paket | 850.000 | 850.000 |
| 4 | **Perangkat Kiosk TPS** | Tablet / Touchscreen Display 10-14 Inch (Sewa/Optimalisasi Lab) | 4 Unit | 250.000 | 1.000.000 |
| 5 | **Slip Cetak Token** | Mini Thermal Printer 58mm USB/Bluetooth + Kertas Thermal Roll | 2 Unit | 350.000 | 700.000 |
| 6 | **Deployment & Cloud Fallback** | Domain, SSL Certificate, dan VPS Backup Server (2 Bulan) | 1 Paket | 500.000 | 500.000 |
| 7 | **Pengujian & Gladi Resik** | Konsumsi simulasi UAT, cetak atribut TPS, dan logistik tinta celup | 1 Kegiatan| 1.200.000 | 1.200.000 |
| **TOTAL** | **Estimasi Anggaran Keseluruhan Proyek** | | | | **Rp 10.000.000** |

*Catatan: Total anggaran Rp 10.000.000 sepenuhnya mematuhi batas pagu anggaran operasional kemahasiswaan yang diatur dalam regulasi keuangan IKM Poltek CWE.*

---

## 10. Lembar Pengesahan Project Charter

Dokumen *Project Charter* ini disahkan sebagai mandat resmi pelaksanaan rekayasa perangkat lunak sistem Smart Pemira Poltek CWE:

```
Ditetapkan di : Bekasi, Jawa Barat
Pada tanggal  : 15 Juli 2026
```

| Disahkan Oleh: | Menyetujui: | Mengetahui: |
| :---: | :---: | :---: |
| <br><br><br>**( Ketua Tim ITPO )**<br>Lead Software Architect | <br><br><br>**( Ketua Umum KPUM )**<br>Penyelenggara Pemira | <br><br><br>**( Ketua DPM Poltek CWE )**<br>Project Sponsor Yuridis |
