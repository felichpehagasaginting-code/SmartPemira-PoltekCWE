# MASTER INDEX SUITE DOKUMENTASI REKAYASA PERANGKAT LUNAK SMART PEMIRA

## SISTEM E-VOTING TERINTEGRASI BERBASIS ZERO-KNOWLEDGE BALLOT ISOLATION
### Politeknik Kelapa Sawit Citra Widya Edukasi (Poltek CWE)
**Dokumen Referensi**: SP-CWE-DOC-MASTER  
**Klasifikasi**: Master Table of Contents, Traceability Matrix & Panduan Pemanfaatan  
**Versi**: 1.0.0 (Master Release)  
**Status**: Disahkan Penuh oleh Tim ITPO, Komisioner KPUM & DPM Poltek CWE  
**Dasar Yuridis**: UUD IKM Poltek CWE & Ketetapan DPM No. 005/DPM-CWE/KEP/VII/2024  

---

## DAFTAR ISI
1. [Pengantar & Ringkasan Eksekutif Proyek](#1-pengantar--ringkasan-eksekutif-proyek)
2. [Pohon Struktur Master Dokumentasi](#2-pohon-struktur-master-dokumentasi)
3. [Katalog Deliverable Komprehensif (Folder 01 s/d 06)](#3-katalog-deliverable-komprehensif-folder-01-sd-06)
   - 3.1 [01_PERENCANAAN_PROYEK (Project Management Plan)](#31-01_perencanaan_proyek-project-management-plan)
   - 3.2 [02_REQUIREMENT_SPECIFICATION_SRS (Software Requirements Specification)](#32-02_requirement_specification_srs-software-requirements-specification)
   - 3.3 [03_USE_CASE_DAN_UML_DIAGRAMS (Visual Modeling & Behavior)](#33-03_use_case_dan_uml_diagrams-visual-modeling--behavior)
   - 3.4 [04_ENTITY_RELATIONSHIP_DIAGRAM_ERD (Data Design & Dictionary)](#34-04_entity_relationship_diagram_erd-data-design--dictionary)
   - 3.5 [05_WIREFRAME_DAN_MOCKUP_UIUX (Design System & Visual Catalog)](#35-05_wireframe_dan_mockup_uiux-design-system--visual-catalog)
   - 3.6 [06_SOFTWARE_ARCHITECTURE_DOCUMENT_SAD (4+1 Architectural Views)](#36-06_software_architecture_document_sad-41-architectural-views)
4. [Matriks Keterhubungan Antar Dokumen (Document Traceability Matrix)](#4-matriks-keterhubungan-antar-dokumen-document-traceability-matrix)
5. [Riwayat Versi & Log Perubahan Dokumen](#5-riwayat-versi--log-perubahan-dokumen)
6. [Petunjuk Pemanfaatan Dokumentasi Berdasarkan Peran Stakeholder](#6-petunjuk-pemanfaatan-dokumentasi-berdasarkan-peran-stakeholder)
   - 6.1 [Panduan untuk Tim Pengembang (Software Engineer & DevOps)](#61-panduan-untuk-tim-pengembang-software-engineer--devops)
   - 6.2 [Panduan untuk Tim Penguji Kualitas (QA Tester & Security Auditor)](#62-panduan-untuk-tim-penguji-kualitas-qa-tester--security-auditor)
   - 6.3 [Panduan untuk Penyelenggara Pemira (KPUM, PPUR, Panwaslu & Saksi Paslon)](#63-panduan-untuk-penyelenggara-pemira-kpum-ppur-panwaslu--saksi-paslon)
   - 6.4 [Panduan untuk Dosen Pembimbing & Penguji Sidang Tugas Akhir](#64-panduan-untuk-dosen-pembimbing--penguji-sidang-tugas-akhir)

---

## 1. Pengantar & Ringkasan Eksekutif Proyek

Sistem Informasi Pemilihan Umum Raya Mahasiswa Terintegrasi (**Smart Pemira**) Politeknik Kelapa Sawit Citra Widya Edukasi (Poltek CWE) merupakan platform *e-voting* modern yang memadukan kepatuhan konstitusional kemahasiswaan dengan keunggulan rekayasa perangkat lunak internasional.

Seluruh rangkaian dokumentasi ini disusun secara sistematis untuk memenuhi dua tujuan utama:
1. **Standar Rekayasa Industri & Akademik**: Memenuhi kaidah formal *Software Engineering Body of Knowledge* (SWEBOK), IEEE Std 830-1998, ISO/IEC/IEEE 29148:2018, dan Kruchten 4+1 View Model sebagai landasan pengujian tugas akhir akademik.
2. **Kepatuhan Regulasi & Asas LUBER JURDIL**: Menjamin asas Langsung, Umum, Bebas, Rahasia, Jujur, dan Adil sesuai amanat Pasal 27 UUD IKM Poltek CWE melalui implementasi doktrin kriptografis **Zero-Knowledge Ballot Isolation**, rantai integritas **SHA-256 Hash Chaining**, tanda tangan digital **Ed25519 (RFC 8032)**, serta sistem desain **Neo-Editorial Botanical**.

---

## 2. Pohon Struktur Master Dokumentasi

Berikut adalah struktur hirarki lengkap seluruh berkas dokumentasi rekayasa perangkat lunak Smart Pemira yang tersimpan di dalam direktori `Dokumentasi/`:

```text
Dokumentasi/
├── README.md                                                 # [SP-CWE-DOC-MASTER] Master Index & Panduan Pemanfaatan
│
├── 01_PERENCANAAN_PROYEK/                                     # [Fase 1: Tata Kelola & Jadwal Proyek]
│   ├── 01_PROJECT_CHARTER_DAN_MANAJEMEN_PROYEK.md           # Scope, Stakeholder, RACI, Budget & Risk Breakdown
│   ├── 02_WORK_BREAKDOWN_STRUCTURE_WBS.md                  # WBS Level 1 s/d Level 4, WBS Dictionary & RAM
│   └── 03_JADWAL_DAN_TIMELINE_PROYEK.md                    # CPM (20 Aktivitas), Float, Gantt Chart & Sprint Plan
│
├── 02_REQUIREMENT_SPECIFICATION_SRS/                         # [Fase 2: Analisis Kebutuhan Sistem]
│   └── SRS_SMART_PEMIRA_POLTEK_CWE.md                      # Spesifikasi Kebutuhan IEEE 830 (FR-01 s/d FR-08 & NFR)
│
├── 03_USE_CASE_DAN_UML_DIAGRAMS/                             # [Fase 3: Pemodelan Berorientasi Objek]
│   ├── 01_USE_CASE_DIAGRAM_DAN_SPESIFIKASI.md              # 6 Aktor, Diagram Use Case & 12 Skenario Terinci
│   └── 02_DIAGRAM_UML_LENGKAP.md                           # Class, Sequence (4x), Activity (2x), State (3x), Deployment
│
├── 04_ENTITY_RELATIONSHIP_DIAGRAM_ERD/                      # [Fase 4: Perancangan Data & Kamus Basis Data]
│   └── ERD_DAN_KAMUS_DATA_ZERO_KNOWLEDGE.md                # CDM, PDM, Diagram ERD Mermaid, Kamus Data 11 Entitas
│
├── 05_WIREFRAME_DAN_MOCKUP_UIUX/                             # [Fase 5: Desain Antarmuka & Interaksi Visual]
│   ├── assets/                                             # 50 Berkas Screenshot Kunci Produksi (.png)
│   └── DESAIN_ANTARMUKA_WIREFRAME_DAN_MOCKUP.md            # Desain Neo-Editorial Botanical, Dual-Theme, Mockup Catalog
│
├── 06_SOFTWARE_ARCHITECTURE_DOCUMENT_SAD/                   # [Fase 6: Arsitektur Sistem & Spesifikasi Keamanan]
│   └── DOKUMEN_ARSITEKTUR_PERANGKAT_LUNAK_SAD.md            # Kruchten 4+1 View, Kriptografi, STRIDE & Dual-Mode DB
│
└── 07_PUBLIKASI_ILMIAH/                                     # [Fase 7: Diseminasi Akademik & Publikasi IEEE]
    ├── PAPER_IEEE_SMART_PEMIRA.md                           # Manuskrip Ilmiah Konferensi IEEE 2-Kolom
    └── REFERENCES.bib                                       # Bibliografi BibTeX Standar Akademik (22 Referensi)
```

---

## 3. Katalog Deliverable Komprehensif (Folder 01 s/d 06)

### 3.1 01_PERENCANAAN_PROYEK (Project Management Plan)
* [**01_PROJECT_CHARTER_DAN_MANAJEMEN_PROYEK.md**](01_PERENCANAAN_PROYEK/01_PROJECT_CHARTER_DAN_MANAJEMEN_PROYEK.md):
  * Landasan yuridis konstitusi kampus (UUD IKM dan RUU Pemira Ketetapan DPM No. 005/DPM-CWE/KEP/VII/2024).
  * Definisi sasaran mutu proyek (KPI: partisipasi $\ge 85\%$, respons Kiosk $< 500\text{ ms}$, zero data loss).
  * Matriks wewenang RACI (*Responsible, Accountable, Consulted, Informed*) 6 peran pemangku kepentingan.
  * Analisis manajemen risiko terperinci (RBS) mencakup 7 skenario kegagalan dan strategi mitigasinya.
  * Rencana anggaran biaya (RAB) sebesar Rp 10.000.000 sesuai plafon Pasal 58 RUU Pemira.
* [**02_WORK_BREAKDOWN_STRUCTURE_WBS.md**](01_PERENCANAAN_PROYEK/02_WORK_BREAKDOWN_STRUCTURE_WBS.md):
  * Dekomposisi 4 level pekerjaan: Level 1 (Sistem) hingga Level 4 (Paket Kerja Spesifik).
  * *WBS Dictionary* lengkap yang mendefinisikan kode paket kerja, uraian tugas, penanggung jawab, dan kriteria penerimaan (*acceptance criteria*).
  * Matriks Alokasi Tanggung Jawab (*Responsibility Assignment Matrix* - RAM).
* [**03_JADWAL_DAN_TIMELINE_PROYEK.md**](01_PERENCANAAN_PROYEK/03_JADWAL_DAN_TIMELINE_PROYEK.md):
  * Linimasa proyek berdurasi 20 minggu (5 bulan kalender) dari fase inisiasi hingga evaluasi pasca-pleno.
  * Analisis *Critical Path Method* (CPM) atas 20 aktivitas dengan perhitungan *Early Start*, *Early Finish*, *Late Start*, *Late Finish*, dan *Total Float*.
  * Diagram Gantt Chart komprehensif dalam sintaks Mermaid.js.
  * Alokasi siklus pengembangan *Agile Scrum* ke dalam 4 sprint terukur.

---

### 3.2 02_REQUIREMENT_SPECIFICATION_SRS (Software Requirements Specification)
* [**SRS_SMART_PEMIRA_POLTEK_CWE.md**](02_REQUIREMENT_SPECIFICATION_SRS/SRS_SMART_PEMIRA_POLTEK_CWE.md):
  * Spesifikasi formal mengikuti standar ganda ISO/IEC/IEEE 29148:2018 dan IEEE Std 830-1998.
  * Penjabaran 5 Hukum Arsitektur Non-Negosiabel (*Hard Constraints*).
  * Spesifikasi 8 kelompok Kebutuhan Fungsional (FR-01 s/d FR-08): Konfigurasi Global & Freeze, Manajemen DPT & Paslon, Bilik Kiosk Multi-Ballot, Penanganan Calon Tunggal vs Kotak Kosong, Tallying Berita Acara, serta Pengawasan Panwaslu.
  * Spesifikasi Kebutuhan Non-Fungsional (NFR): Keamanan, Performa ($<500\text{ ms}$), Ketersediaan ($99.9\%$), dan Aksesibilitas WCAG AA/AAA.
  * *Requirements Traceability Matrix* (RTM) yang memetakan klausul regulasi ke modul kode produksi.

---

### 3.3 03_USE_CASE_DAN_UML_DIAGRAMS (Visual Modeling & Behavior)
* [**01_USE_CASE_DIAGRAM_DAN_SPESIFIKASI.md**](03_USE_CASE_DAN_UML_DIAGRAMS/01_USE_CASE_DIAGRAM_DAN_SPESIFIKASI.md):
  * Diagram Use Case lengkap (Mermaid.js) yang memetakan hubungan antara 6 aktor (Pemilih, PPUR, KPUM, Panwaslu, Saksi, ITPO) dengan subsistem pemira.
  * 12 Spesifikasi Use Case Naratif Terinci (UC-01 s/d UC-12) lengkap dengan aktor, prekondisi, alur utama (*main flow*), alur alternatif (*exception flow*), dan postkondisi.
* [**02_DIAGRAM_UML_LENGKAP.md**](03_USE_CASE_DAN_UML_DIAGRAMS/02_DIAGRAM_UML_LENGKAP.md):
  * **Class Diagram**: Struktur kelas domain, atribut, visibilitas, metode, dan batas isolasi Zero-Knowledge.
  * **4 Sequence Diagrams**:
    1. Registrasi & Penerbitan Token di Meja PPUR.
    2. Bilik Kiosk & Transaksi Atomik Pengiriman Suara.
    3. Sidang Pleno Unlocking & Penandatanganan Kanonikal Ed25519.
    4. Pelaporan dan Penanganan Sengketa Panwaslu.
  * **2 Activity Diagrams**: Alur pemilih dari gerbang TPS hingga celup tinta, serta alur audit rekapitulasi pleno.
  * **3 State Machine Diagrams**: Siklus hidup token, siklus status pemilih, dan siklus gembok brankas suara.
  * **Deployment Diagram**: Pemetaan fisik komponen perangkat keras dan jaringan kampus.

---

### 3.4 04_ENTITY_RELATIONSHIP_DIAGRAM_ERD (Data Design & Dictionary)
* [**ERD_DAN_KAMUS_DATA_ZERO_KNOWLEDGE.md**](04_ENTITY_RELATIONSHIP_DIAGRAM_ERD/ERD_DAN_KAMUS_DATA_ZERO_KNOWLEDGE.md):
  * **Conceptual Data Model (CDM) & Physical Data Model (PDM)** dengan pemisahan domain logis.
  * **Diagram ERD Mermaid.js** yang menegaskan secara visual ketiadaan relasi *foreign key* antara `Voter` dan `BallotBox`.
  * **Kamus Data Komprehensif (Data Dictionary)** mencakup 11 entitas basis data:
    1. `StudyProgram`: Master data program studi dan warna aksen surat suara.
    2. `Tps`: TPS virtual 100% online per prodi yang memelihara rantai hash mandiri.
    3. `Voter`: Daftar pemilih tetap dengan kolom transien `pendingTokenHash`.
    4. `VotingToken`: Token bilik suara ephemeral (TTL 10 menit) dan sesi re-vote model Estonia.
    5. `BallotBox`: Surat suara anonim berantai hash SHA-256 dengan penanda nomor versi (`voteVersion`).
    6. `Candidate`: Master calon pimpinan mahasiswa (BEM, DPM, Hima) dan calon tunggal.
    7. `AuditLog`: Catatan audit *append-only* bebas pilihan calon.
    8. `ElectionIncident`: Formulir digital laporan sengketa pemira (Pasal 65 RUU Pemira).
    9. `ElectionSetting`: Konfigurasi singleton, kontrol pembekuan darurat, dan gembok sidang pleno.
    10. `ElectionArchive`: Kapsul arsip segel digital penutupan periode pemira.
    11. `Operator`: Akun pengguna multi-peran (RBAC) dengan proteksi sandi scrypt dan 2FA TOTP.
  * Bukti matematis ketiadaan jembatan rekonstruksi identitas dan analisis entropi token 6-karakter CSPRNG.
  * Prosedur integritas transaksional atomik (ACID) dan kueri rekapitulasi *latest-ballot-wins*.

---

### 3.5 05_WIREFRAME_DAN_MOCKUP_UIUX (Design System & Visual Catalog)
* [**DESAIN_ANTARMUKA_WIREFRAME_DAN_MOCKUP.md**](05_WIREFRAME_DAN_MOCKUP_UIUX/DESAIN_ANTARMUKA_WIREFRAME_DAN_MOCKUP.md):
  * Filosofi desain **Neo-Editorial Botanical** dan manifesto anti-AI slop (tanpa gradien ungu-biru, tanpa latar putih buta, tanpa bayangan blur kabur).
  * Arsitektur **Dual-Environment Theme**: Warm Light Mode (*Warm Oat Milk* `#F6F4EE`) untuk bilik dan meja registrasi vs High-Craft Dark Mode (*Obsidian Forest* `#0D1512`) untuk live monitor Panwaslu dan layar sidang pleno.
  * Sistem identitas warna **Multi-Ballot Color-Coding** untuk 5 prodi (BKS/TPTP Terracotta `#D95338`, TPHP Ochre `#D9822B`, MANLOG Cobalt `#2B50AA`, BD Olive `#0F766E`, TRPL Plum `#6D28D9`), BEM Tropic Green (`#1B7F4E`), DPM Tropic Jade (`#0F766E`), dan Kotak Kosong Slate Ink (`#3F4743`).
  * Hierarki tipografi presisi: `Bricolage Grotesque`, `Geist Sans`, dan `Geist Mono` (`tabular-nums`).
  * Desain komponen hybrid: *Tactile Neo-Brutalism* (tombol tinggi 56px di bilik Kiosk) vs *Bento Editorial* (dasbor PPUR, KPUM, Panwaslu).
  * Gambar struktur *wireframe layout* untuk 4 modul operasional utama.
  * **Katalog Mockup Visual Lengkap (50 Aset Screenshot Produksi)** yang menyematkan seluruh 50 berkas tangkapan layar di subfolder `assets/` tanpa aset tertinggal, disertai ulasan interaksi mendalam, token desain, state mikro, aturan yuridis, dan penanganan skenario khusus.
  * Evaluasi kepatuhan aksesibilitas web **WCAG 2.1 Level AAA** (rasio kontras teks $13.8:1$, touch target minimum 56px, dan navigasi penuh keyboard).

---

### 3.6 06_SOFTWARE_ARCHITECTURE_DOCUMENT_SAD (4+1 Architectural Views)
* [**DOKUMEN_ARSITEKTUR_PERANGKAT_LUNAK_SAD.md**](06_SOFTWARE_ARCHITECTURE_DOCUMENT_SAD/DOKUMEN_ARSITEKTUR_PERANGKAT_LUNAK_SAD.md):
  * Penerapan model arsitektur **Kruchten 4+1 View Model**: Logical View, Process View, Development View, Physical View, dan Use Case Scenarios.
  * **Spesifikasi Kriptografi Mendalam**:
    * Pembuktian formal isolasi Zero-Knowledge dan pembersihan jembatan transien.
    * Formula matematika rantai integritas suara *SHA-256 Hash Chaining* per TPS:
      $$H_i = \text{SHA-256}(H_{i-1} \parallel \text{id} \parallel \text{cat} \parallel \text{cand} \parallel \text{empty} \parallel \text{ts} \parallel \text{salt})$$
    * Tanda tangan digital kanonikal **Ed25519 (RFC 8032)** untuk Berita Acara C-KWE dan segel arsip.
    * Autentikasi dua faktor **2FA TOTP (RFC 6238)** dengan enkripsi *AES-256-GCM* atas secret *at-rest* dan hashing *scrypt* untuk kode cadangan.
  * **Analisis Keamanan STRIDE Threat Model**: Matriks ancaman (*Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege*) beserta mitigasi teknisnya.
  * **Arsitektur Mesin Basis Data Dual-Mode**: Mekanisme switching dinamis Prisma Client antara SQLite lokal (LAN terisolasi, zero latency, WAL mode) dan Turso LibSQL Cloud (replikasi terdistribusi edge).
  * Mekanisme ketahanan bencana (*Disaster Recovery*), *concurrency retry with exponential backoff*, dan prosedur "Segel & Reset" periode pemira.

---

### 3.7 07_PUBLIKASI_ILMIAH (Diseminasi Akademik & Paper Konferensi IEEE)
* [**PAPER_IEEE_SMART_PEMIRA.md**](07_PUBLIKASI_ILMIAH/PAPER_IEEE_SMART_PEMIRA.md):
  * Naskah lengkap manuskrip ilmiah standar IEEE Conference dua kolom berjudul:
    *"Dual-Layer Zero-Knowledge Ballot Architecture with Ephemeral Hash-Chaining and Ed25519 Multi-Signature Verification for High-Integrity Campus Elections"*.
  * Struktur 6 bab formal: Pendahuluan & Trilemma E-Voting, Legal-to-Code Framework (UUD IKM), Desain Kriptografi (CSPRNG, SHA-256 Chains, Ed25519 Multisig, Time Jitter), Evaluasi Eksperimental & Pengujian Beban Sintetis (300 pemilih simultan, P95 < 280 ms, zero fork), Diskusi Komparatif (Helios, Belenios, Estonia), serta Kesimpulan & Riset Masa Depan.
* [**REFERENCES.bib**](07_PUBLIKASI_ILMIAH/REFERENCES.bib):
  * Bibliografi akademis 22 referensi primer (Chaum, Adida, Bernstein, Springall, Rivest, Benaloh, Cortier, Crockford, RFC 8032, FIPS 180-4, NIST SP 800-90A, STRIDE).
* **Generator Paper Word (`scripts/generate-paper.ts`)**:
  * Skrip otomasi `npm run generate:paper` yang mengompilasi naskah menjadi berkas Word siap kirim (`Paper_IEEE_Smart_Pemira_PoltekCWE.docx`) berformat dua kolom standar IEEE.

---

## 4. Matriks Keterhubungan Antar Dokumen (Document Traceability Matrix)

Matriks berikut menunjukkan bagaimana setiap modul dalam sistem Smart Pemira memiliki keterhubungan utuh dari instrumen yuridis, perencanaan proyek, spesifikasi kebutuhan, pemodelan UML, desain data, antarmuka pengguna, hingga arsitektur teknis:

| Area / Modul Sistem | Dasar Yuridis | Perencanaan Proyek (01) | Spesifikasi SRS (02) | Pemodelan UML (03) | Desain Data ERD (04) | Desain UI/UX (05) | Arsitektur Teknis SAD (06) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tata Kelola & Keamanan Petugas** | RUU Pemira Bab III & IV | WBS 1.1, RACI Table | FR-01, FR-04.1 | UC-01, UC-02, Class Diagram | `Operator`, `ElectionSetting` | Mockup 7.1 (Login, RBAC, 403 Denied) | SAD Bab 2.1, Bab 3.4 (TOTP AES-GCM) |
| **DPT & Master Calon** | UUD IKM Ps. 9, 13, 19 | WBS 2.1, CPM Act 05 | FR-02, FR-03 | UC-03, UC-04, Activity Diagram | `Voter`, `Candidate`, `StudyProgram` | Mockup 7.2.1, Mockup 7.6.2 | SAD Bab 2.1, Bab 4.1 (STRIDE) |
| **Registrasi PPUR & Token Ephemeral** | RUU Pemira Ps. 61 | WBS 2.2, CPM Act 08 | FR-04 | UC-05, Seq Diagram 1, State Token | `VotingToken`, `Voter.pendingTokenHash` | Mockup 7.2.2 (Slip Token QR) | SAD Bab 2.2, Bab 3.1 (CSPRNG TTL 10m) |
| **Bilik Kiosk & Zero-Knowledge** | UUD IKM Ps. 27 (LUBER) | WBS 3.1, CPM Act 11 | FR-05 (Multi-Ballot) | UC-06, Seq Diagram 2, State Voter | `BallotBox` (Isolasi Mutlak dari Voter) | Mockup 7.3 (Wizard, Kotak Kosong, Review) | SAD Bab 3.1 (ZK Proof), Bab 4.2 (Jitter) |
| **Rantai Integritas Suara** | RUU Pemira Ps. 64 | WBS 3.2, CPM Act 12 | FR-06.1, NFR-SEC-03 | UC-07, Class Diagram (Hasher) | `Tps.chainSalt`, `BallotBox.ballotHash` | Mockup 7.5.2 (5 Rantai Hash Monitor) | SAD Bab 3.2 (Formula SHA-256 Chaining) |
| **Sidang Pleno & Tallying** | UUD IKM Ps. 9 (3), Ps. 27 | WBS 4.1, CPM Act 14 | FR-06, Aturan Bisnis 7.1 | UC-08, Seq Diagram 3, State Gembok | `ElectionSetting.plenoUnlocked` | Mockup 7.4.2, Mockup 7.4.3 | SAD Bab 2.2, Bab 3.3 (Ed25519 Signing) |
| **Berita Acara Digital C-KWE** | RUU Pemira Ps. 64 | WBS 4.2, CPM Act 15 | FR-07 | UC-09, Seq Diagram 3 (Signing) | `ElectionArchive.canonical`, `signatureEd25519`| Mockup 7.4.4, Mockup 7.4.5 (QR Seal) | SAD Bab 3.3 (RFC 8032 Canonical Ed25519) |
| **Panwaslu & Sengketa Pemira** | RUU Pemira Ps. 65, 67 | WBS 4.3, CPM Act 16 | FR-08 | UC-10, UC-11, Seq Diagram 4 | `AuditLog`, `ElectionIncident` | Mockup 7.5.1, Mockup 7.5.4 | SAD Bab 2.2 (SSE Stream), Bab 4.1 |

---

## 5. Riwayat Versi & Log Perubahan Dokumen

| Versi Dokumen | Tanggal Rilis | Penulis / Entitas | Deskripsi Pemutakhiran Dokumen | Status Persetujuan |
| :---: | :---: | :--- | :--- | :---: |
| **0.1.0** | 2026-08-15 | Tim ITPO Poltek CWE | Inisiasi *Project Charter*, perumusan visi sistem, dan draf awal WBS. | Draf Awal |
| **0.5.0** | 2026-09-10 | Tim ITPO & KPUM | Penyusunan draf SRS standar IEEE 830, pemodelan use case, dan perancangan skema relasi basis data dasar. | Review Internal |
| **0.9.0** | 2026-10-22 | Tim ITPO & Panwaslu | Integrasi model Zero-Knowledge Ballot Isolation, pemisahan 5 rantai TPS virtual, dan perancangan tema ganda Neo-Editorial Botanical. | Uji Coba Alpha |
| **1.0.0** | 2026-11-06 | Tim ITPO (Agent 1 & Agent 2) | **Rilis Master Dokumentasi Lengkap**: Finalisasi 6 modul dokumen, penyatuan 50 aset tangkapan layar produksi, pembuktian formal kriptografi Ed25519/TOTP/SHA-256, dan validasi kepatuhan yuridis UUD IKM. | **Disahkan (Approved)** |

---

## 6. Petunjuk Pemanfaatan Dokumentasi Berdasarkan Peran Stakeholder

Untuk memperoleh manfaat maksimal dari suite dokumentasi ini, setiap pemangku kepentingan disarankan mengikuti panduan telaah berikut:

### 6.1 Panduan untuk Tim Pengembang (Software Engineer & DevOps)
1. Awali dengan membaca [**02_REQUIREMENT_SPECIFICATION_SRS**](02_REQUIREMENT_SPECIFICATION_SRS/SRS_SMART_PEMIRA_POLTEK_CWE.md) Bab 2 untuk memahami 5 Hukum Arsitektur Non-Negosiabel.
2. Pelajari dekomposisi data pada [**04_ENTITY_RELATIONSHIP_DIAGRAM_ERD**](04_ENTITY_RELATIONSHIP_DIAGRAM_ERD/ERD_DAN_KAMUS_DATA_ZERO_KNOWLEDGE.md) sebelum melakukan migrasi basis data (`prisma migrate`). **Patuhi larangan pembuatan Foreign Key antara voter dan ballot_box!**
3. Implementasikan arsitektur komponen sesuai spesifikasi [**06_SOFTWARE_ARCHITECTURE_DOCUMENT_SAD**](06_SOFTWARE_ARCHITECTURE_DOCUMENT_SAD/DOKUMEN_ARSITEKTUR_PERANGKAT_LUNAK_SAD.md), khususnya modul transaksi atomik di `src/lib/server` dan algoritma kriptografi di `src/lib/crypto`.
4. Saat menulis kode antarmuka (React/Tailwind), rujuk [**05_WIREFRAME_DAN_MOCKUP_UIUX**](05_WIREFRAME_DAN_MOCKUP_UIUX/DESAIN_ANTARMUKA_WIREFRAME_DAN_MOCKUP.md) untuk memastikan kepatuhan warna multi-ballot, target sentuh 56px, dan manifesto anti-AI slop.

### 6.2 Panduan untuk Tim Penguji Kualitas (QA Tester & Security Auditor)
1. Rujuk [**03_USE_CASE_DAN_UML_DIAGRAMS**](03_USE_CASE_DAN_UML_DIAGRAMS/01_USE_CASE_DIAGRAM_DAN_SPESIFIKASI.md) dokumen naratif UC-01 s/d UC-12 sebagai acuan penyusunan skenario pengujian (*test cases*), khususnya alur alternatif (*exception flow*) seperti token kedaluwarsa, percobaan vote ganda, dan kegagalan otentikasi.
2. Gunakan Bab 4 [**06_SOFTWARE_ARCHITECTURE_DOCUMENT_SAD**](06_SOFTWARE_ARCHITECTURE_DOCUMENT_SAD/DOKUMEN_ARSITEKTUR_PERANGKAT_LUNAK_SAD.md) (STRIDE Threat Model) untuk merancang pengujian penetrasi (*penetration testing*): pengujian brute force token, simulasi kerusakan rantai hash (*tampered ballot*), dan uji beban (*load test*).
3. Verifikasi kepatuhan aksesibilitas menggunakan instrumen pengujian WCAG 2.1 AAA pada Bab 8 [**05_WIREFRAME_DAN_MOCKUP_UIUX**](05_WIREFRAME_DAN_MOCKUP_UIUX/DESAIN_ANTARMUKA_WIREFRAME_DAN_MOCKUP.md).

### 6.3 Panduan untuk Penyelenggara Pemira (KPUM, PPUR, Panwaslu & Saksi Paslon)
1. **Petugas Meja PPUR**: Pelajari [**05_WIREFRAME_DAN_MOCKUP_UIUX**](05_WIREFRAME_DAN_MOCKUP_UIUX/DESAIN_ANTARMUKA_WIREFRAME_DAN_MOCKUP.md) Bab 7.2 untuk memahami tata cara verifikasi KTM dan pembagian slip token bilik (TTL 10 menit).
2. **Komisioner KPUM**: Pahami mekanisme pembukaan hasil suara pada Bab 7.4 [**05_WIREFRAME_DAN_MOCKUP_UIUX**](05_WIREFRAME_DAN_MOCKUP_UIUX/DESAIN_ANTARMUKA_WIREFRAME_DAN_MOCKUP.md) serta formula keterpilihan Calon Tunggal vs Kotak Kosong ($>50\%$) pada Bab 7 [**02_REQUIREMENT_SPECIFICATION_SRS**](02_REQUIREMENT_SPECIFICATION_SRS/SRS_SMART_PEMIRA_POLTEK_CWE.md).
3. **Badan Pengawas (Panwaslu) & Saksi Paslon**:
   * Pelajari dasbor live audit dan status 5 rantai hash independen pada Bab 7.5 [**05_WIREFRAME_DAN_MOCKUP_UIUX**](05_WIREFRAME_DAN_MOCKUP_UIUX/DESAIN_ANTARMUKA_WIREFRAME_DAN_MOCKUP.md).
   * Pahami keabsahan tanda tangan digital Ed25519 pada Berita Acara Format C-KWE melalui Bab 3.3 [**06_SOFTWARE_ARCHITECTURE_DOCUMENT_SAD**](06_SOFTWARE_ARCHITECTURE_DOCUMENT_SAD/DOKUMEN_ARSITEKTUR_PERANGKAT_LUNAK_SAD.md).

### 6.4 Panduan untuk Dosen Pembimbing & Penguji Sidang Tugas Akhir
1. Telaah bab [**01_PERENCANAAN_PROYEK**](01_PERENCANAAN_PROYEK/01_PROJECT_CHARTER_DAN_MANAJEMEN_PROYEK.md) dan [**03_JADWAL_DAN_TIMELINE_PROYEK**](01_PERENCANAAN_PROYEK/03_JADWAL_DAN_TIMELINE_PROYEK.md) untuk mengevaluasi metodologi manajemen proyek perangkat lunak, perhitungan Critical Path Method (CPM), dan akuntabilitas linimasa tim pengembang.
2. Periksa dokumen [**02_REQUIREMENT_SPECIFICATION_SRS**](02_REQUIREMENT_SPECIFICATION_SRS/SRS_SMART_PEMIRA_POLTEK_CWE.md) untuk menilai ketelitian spesifikasi formal IEEE Std 830 dalam menerjemahkan peraturan perundang-undangan mahasiswa menjadi batasan rekayasa perangkat lunak.
3. Telaah pemodelan visual pada [**03_USE_CASE_DAN_UML_DIAGRAMS**](03_USE_CASE_DAN_UML_DIAGRAMS/02_DIAGRAM_UML_LENGKAP.md) dan perancangan data pada [**04_ENTITY_RELATIONSHIP_DIAGRAM_ERD**](04_ENTITY_RELATIONSHIP_DIAGRAM_ERD/ERD_DAN_KAMUS_DATA_ZERO_KNOWLEDGE.md) untuk menilai konsistensi desain sistem berorientasi objek.
4. Nilai kedalaman ilmiah pada [**06_SOFTWARE_ARCHITECTURE_DOCUMENT_SAD**](06_SOFTWARE_ARCHITECTURE_DOCUMENT_SAD/DOKUMEN_ARSITEKTUR_PERANGKAT_LUNAK_SAD.md), khususnya pembuktian formal kriptografi Zero-Knowledge Anonymity, integritas rantai SHA-256, dan mitigasi ancaman siber berbasis STRIDE.

---
*Ditetapkan dan disahkan secara resmi oleh:*  
**Tim Teknologi Informasi Pemira Online (ITPO) Poltek CWE**  
**Komisi Pemilihan Umum Mahasiswa (KPUM) Poltek CWE**  
**Dewan Perwakilan Mahasiswa (DPM) Poltek CWE**  
*Kampus Politeknik Kelapa Sawit Citra Widya Edukasi, Bekasi, Jawa Barat.*
