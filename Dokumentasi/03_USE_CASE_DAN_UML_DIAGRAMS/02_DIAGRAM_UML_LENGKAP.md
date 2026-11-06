# DIAGRAM UML LENGKAP SISTEM SMART PEMIRA
## SISTEM E-VOTING SMART PEMIRA (SMART PEMILIHAN UMUM RAYA)
### Politeknik Kelapa Sawit Citra Widya Edukasi (Poltek CWE)

---

| Atribut Dokumen | Rincian Dokumen |
| :--- | :--- |
| **Judul Dokumen** | Suite Pemodelan Diagram UML Lengkap (Struktural, Perilaku, Interaksi, dan Deployment) |
| **Kode Dokumen** | `DOC-UML-002` |
| **Versi Dokumen** | `1.0.0` (Master Release Baseline) |
| **Klasifikasi Standar** | Standar Unified Modeling Language (UML 2.5) |
| **Penyusun** | Tim Informasi dan Teknologi Pemira Online (ITPO) Poltek CWE |

---

## DAFTAR ISI
1. [Class Diagram (Model Domain Basis Data, Core Services & Cryptographic Modules)](#1-class-diagram)
2. [Sequence Diagrams (Empat Alur Interaksi Kritis)](#2-sequence-diagrams)
   * 2.1 Alur Registrasi Pemilih & Penerbitan Token di Meja PPUR
   * 2.2 Alur Pemungutan Suara di Bilik Kiosk (Transaksi Atomik 6-Langkah)
   * 2.3 Alur Sidang Pleno Unlocking & Penandatanganan Berita Acara Ed25519
   * 2.4 Alur Pelaporan & Penanganan Sengketa Panwaslu
3. [Activity Diagrams (Alur Aktivitas Pemilih & Rekapitulasi)](#3-activity-diagrams)
   * 3.1 Alur Perjalanan Pemilih: Dari Meja Registrasi hingga Celup Tinta
   * 3.2 Alur Rekapitulasi Suara & Verifikasi Rantai Hash Kriptografis
4. [State Machine Diagrams (Siklus Hidup Status Entitas Kunci)](#4-state-machine-diagrams)
   * 4.1 Siklus Hidup Status Token Pemilih (`VotingToken`)
   * 4.2 Siklus Hidup Status Kehadiran Pemilih (`Voter`)
   * 4.3 Siklus Hidup Gembok Sidang Pleno (`PlenoVault`)
5. [Deployment Diagram (Arsitektur Dual-Mode On-Premise LAN vs Cloud)](#5-deployment-diagram)

---

## 1. Class Diagram

Class diagram berikut memodelkan arsitektur berorientasi objek sistem Smart Pemira, memisahkan entitas data persistensi Prisma, layanan bisnis transaksi inti (*Core Services*), dan modul utilitas kriptografi.

> **Penegasan Arsitektural Hukum 1 (Zero-Knowledge Isolation):**  
> Perhatikan ketiadaan relasi struktural (*no relationship / foreign key*) antara kelas `Voter` dengan kelas `BallotBox`. Identitas pemilih terputus secara mutlak dari data rekaman pilihan suara.

```mermaid
classDiagram
    %% Entitas Basis Data Prisma
    class StudyProgram {
        +String id
        +String name
        +String facultyName
        +String colorPrimary
        +String colorTint
    }

    class Tps {
        +String id
        +String name
        +String location
        +String chainSalt
        +String lastChainHash
    }

    class Voter {
        +String id
        +String nim
        +String name
        +Int angkatan
        +String studyProgramId
        +String tpsId
        +String status
        +Boolean hasVoted
        +DateTime votedAt
        +String pendingTokenHash
    }

    class VotingToken {
        +String id
        +String tokenHash
        +String tpsId
        +String studyProgramId
        +String status
        +DateTime issuedAt
        +DateTime expiresAt
        +DateTime usedAt
        +DateTime lockedAt
        +Int revoteCount
    }

    class BallotBox {
        +String id
        +String category
        +String candidateId
        +Boolean isEmptyBox
        +String tpsId
        +String tokenId
        +Int voteVersion
        +DateTime createdAt
        +String ballotHash
    }

    class Candidate {
        +String id
        +String category
        +String studyProgramId
        +Int number
        +String presidentName
        +String viceName
        +String secondViceName
        +String photoLeaderUrl
        +String photoViceUrl
        +String photoSecondViceUrl
        +String vision
        +String missionJson
        +String photoAccent
        +Boolean isEmptyBox
    }

    class AuditLog {
        +String id
        +String event
        +String detail
        +String tpsId
        +DateTime createdAt
    }

    class ElectionSetting {
        +String id
        +Boolean votingOpen
        +Boolean emergencyFreeze
        +Boolean plenoUnlocked
        +DateTime plenoUnlockedAt
        +String sessionSecret
        +String baSignatureEd25519
        +DateTime baSignedAt
        +String periodLabel
    }

    class Operator {
        +String id
        +String username
        +String passwordHash
        +String role
        +String fullName
        +String tpsId
        +Boolean isActive
        +String totpSecret
        +DateTime totpEnabledAt
    }

    class ElectionArchive {
        +String id
        +String archiveCode
        +String periodLabel
        +String mode
        +DateTime sealedAt
        +String sealedBy
        +String note
        +String summaryJson
        +String canonical
        +String signature
        +String signatureEd25519
        +Int dptCount
        +Int votedCount
        +Int ballotCount
    }

    %% Layanan Bisnis Inti (Core Services)
    class BallotService {
        +submitBallots(rawToken, selections) SubmitResult
        +lockVoterBallot(rawToken) LockResult
    }

    class TallyService {
        +computeTally(includeEmptyBox) TallySummary
        +evaluateSingleCandidate(candidateId) ElectionVerdict
    }

    class ResetService {
        +sealAndArchivePeriod(note, user) ArchiveResult
        +resetNewPeriod(periodLabel) ResetResult
    }

    %% Modul Kriptografi (Crypto Modules)
    class TokenGenerator {
        +generateVotingToken() String
        +hashToken(token) String
        +verifyTokenMatch(token, hash) Boolean
    }

    class BallotHashChain {
        +computeBallotHash(params) String
        +verifyChain(ballots, salt, headHash) VerifyResult
    }

    class BaSigning {
        +getBaKeyPair() BaKeyPair
        +signBaCanonical(canonical) String
        +verifyBaSignature(canonical, sigB64, pubPem) Boolean
    }

    class TotpService {
        +generateTotpSecret() String
        +verifyTotpToken(secret, token) Boolean
        +encryptSecret(secret, key) String
    }

    %% Hubungan Asosiasi Domain (Standar UML 2.5)
    Voter "many" --> "1" StudyProgram : belongsTo
    Voter "many" --> "1" Tps : assignedTo
    VotingToken "many" --> "1" StudyProgram : scopedTo
    VotingToken "many" --> "1" Tps : belongsTo
    BallotBox "many" --> "1" Tps : chainedIn
    BallotBox "many" --> "1" VotingToken : anonymousCredential
    BallotBox "many" --> "1" Candidate : chosenIn
    Candidate "many" --> "0..1" StudyProgram : represents

    %% Dependensi Layanan
    BallotService ..> BallotHashChain : invokes
    BallotService ..> TokenGenerator : invokes
    BallotService ..> BallotBox : creates
    BallotService ..> VotingToken : updates
    TallyService ..> BallotBox : aggregates
    TallyService ..> Candidate : reads
    TallyService ..> BaSigning : signs
    ResetService ..> ElectionArchive : seals
    Operator ..> TotpService : authenticates
```

---

## 2. Sequence Diagrams

### 2.1 Alur Registrasi Pemilih & Penerbitan Token di Meja PPUR
Diagram interaksi berikut memodelkan proses verifikasi fisik identitas mahasiswa di meja registrasi TPS kampus dan penerbitan slip token sekali pakai:

```mermaid
sequenceDiagram
    autonumber
    actor Pemilih as Mahasiswa (Pemilih)
    actor Petugas as Petugas TPS (PPUR)
    participant UI as Dashboard Meja PPUR
    participant API as Router API (/api/voters)
    participant TokenGen as TokenGenerator (CSPRNG)
    participant DB as Basis Data (Prisma/SQLite)
    participant Printer as Mini Thermal Printer 58mm

    Pemilih->>Petugas: Tunjukkan KTM / KRS Fisik Asli
    Petugas->>UI: Ketikkan NIM / Nama Pemilih
    UI->>API: GET /api/voters/search?query={NIM}
    API->>DB: findUnique({ where: { nim } })
    DB-->>API: Kembalikan Data Pemilih (status: BELUM_MEMILIH)
    API-->>UI: Render Data Pemilih & Foto Referensi
    Petugas->>UI: Periksa Kecocokan Fisik & Klik "Terbitkan Token"
    
    UI->>API: POST /api/tokens/issue { voterId, tpsId }
    activate API
    API->>TokenGen: generateVotingToken()
    TokenGen-->>API: Token Plaintext 6 Karakter (contoh: "K7X9PQ")
    API->>TokenGen: hashToken("K7X9PQ")
    TokenGen-->>API: tokenHash (SHA-256)
    
    API->>DB: DB Transaction Begin
    API->>DB: create VotingToken (tokenHash, tpsId, prodiId, TTL 10m, status: ACTIVE)
    API->>DB: update Voter (status: DALAM_ANTREAN, pendingTokenHash: tokenHash)
    API->>DB: create AuditLog ("TOKEN_ISSUED", tpsId)
    API->>DB: DB Transaction Commit
    
    API-->>UI: Kembalikan Token Plaintext "K7X9PQ" & Expiry Timestamp
    deactivate API

    UI->>Printer: Kirim Perintah ESC/POS Cetak Slip
    Printer-->>UI: Slip Token Tercetak Fisik
    UI-->>Petugas: Tampilkan Konfirmasi Sukses & Countdown 10 Menit
    Petugas->>Pemilih: Serahkan Slip Token & Arahkan ke Bilik Kiosk
```

---

### 2.2 Alur Pemungutan Suara di Bilik Kiosk (Transaksi Atomik 6-Langkah)
Diagram interaksi berikut memodelkan eksekusi pemilihan di bilik suara hingga penyimpanan atomik 6-langkah pada basis data:

```mermaid
sequenceDiagram
    autonumber
    actor Pemilih as Mahasiswa di Bilik
    participant Kiosk as UI Kiosk (Tactile Screen)
    participant VoteAPI as Route API (/api/vote/submit)
    participant Service as BallotService (Atomik)
    participant HashEng as BallotHashChain (SHA-256)
    participant DB as Basis Data (Prisma Engine)

    Pemilih->>Kiosk: Ketikkan 6 Digit Token pada Keypad Sentuh
    Kiosk->>VoteAPI: POST /api/vote/verify-token { token }
    VoteAPI->>DB: findUnique VotingToken via SHA-256(token)
    DB-->>VoteAPI: Token Valid (status: ACTIVE, dalam batas TTL)
    VoteAPI-->>Kiosk: Token OK + Daftar 3 Surat Suara Sah (Filter Prodi)
    
    Pemilih->>Kiosk: Pilih Calon BEM (Surat Suara 1)
    Pemilih->>Kiosk: Pilih Calon DPM (Surat Suara 2)
    Pemilih->>Kiosk: Pilih Calon HIMA / Kotak Kosong (Surat Suara 3)
    Pemilih->>Kiosk: Buka Layar Review Pilihan & Tekan "KIRIM SUARA SEKARANG"
    
    Kiosk->>VoteAPI: POST /api/vote/submit { rawToken, selections }
    activate VoteAPI
    VoteAPI->>Service: submitBallots(rawToken, selections)
    activate Service

    rect rgb(240, 248, 255)
        Note over Service, DB: TRANSAKSI ATOMIK 6-LANGKAH (HUKUM 2)
        Service->>DB: 1. Validasi Token Status == ACTIVE & expiresAt > NOW()
        Service->>DB: 2. Server-side Assertion Kesesuaian Prodi Kandidat HIMA
        Service->>HashEng: 3a. Hitung SHA-256 Hash Chaining Surat Suara 1 (BEM)
        Service->>DB: 3b. Insert BallotBox BEM (UUID, Jittered Timestamp, Hash)
        Service->>HashEng: 3c. Hitung SHA-256 Hash Chaining Surat Suara 2 (DPM)
        Service->>DB: 3d. Insert BallotBox DPM (UUID, Jittered Timestamp, Hash)
        Service->>HashEng: 3e. Hitung SHA-256 Hash Chaining Surat Suara 3 (HIMA)
        Service->>DB: 3f. Insert BallotBox HIMA (UUID, Jittered Timestamp, Hash)
        Service->>DB: 3g. Update Head Hash TPS Virtual di tabel Tps
        Service->>DB: 4. Update status VotingToken = 'USED' & usedAt = NOW()
        Service->>DB: 5. Update Voter status = 'SUDAH_MEMILIH', hasVoted = TRUE
        Service->>DB: 6. Insert AuditLog ('BALLOT_SUBMITTED', tpsId)
    end

    DB-->>Service: Transaksi Berhasil Di-Commit Sepenuhnya
    Service-->>VoteAPI: Return { ok: true, receiptCode, voteVersion: 1 }
    deactivate Service
    VoteAPI-->>Kiosk: Respon Sukses (HTTP 200 OK)
    deactivate VoteAPI

    Kiosk->>Pemilih: Tampilkan Layar Sukses Animasi (3 Detik)
    Kiosk->>Kiosk: Purge Sesi Lokal & Auto-Reset ke Layar Input Token
```

---

### 2.3 Alur Sidang Pleno Unlocking & Penandatanganan Berita Acara Ed25519
Diagram interaksi berikut memodelkan pembukaan kotak suara terkunci dan pengesahan Berita Acara resmi Model C-KWE:

```mermaid
sequenceDiagram
    autonumber
    actor KPUM as Ketua KPUM
    actor Panwas as Panitia Pengawas (Panwaslu)
    actor Saksi as Saksi Pasangan Calon
    participant PlenoUI as Layar Proyektor Sidang Pleno
    participant API as Route API (/api/pleno/*)
    participant Tally as TallyService
    participant ChainVerifier as HashChainVerifier
    participant EdSign as BaSigning (Ed25519 Engine)
    participant DB as Basis Data (Prisma)

    KPUM->>PlenoUI: Buka Halaman Sidang Pleno (Status: LOCKED 423)
    PlenoUI->>API: GET /api/tally/summary
    API-->>PlenoUI: HTTP 423 Locked (Hasil Suara Masih Digembok)
    
    KPUM->>PlenoUI: Klik "Verifikasi Integritas Rantai Suara"
    PlenoUI->>API: POST /api/tally/verify-chains
    API->>ChainVerifier: verifyChain() pada kelima rantai TPS prodi
    ChainVerifier->>DB: Ambil seluruh blok BallotBox terurut
    ChainVerifier-->>API: 100% Rantai Valid (Head Hash Cocok)
    API-->>PlenoUI: Status Integritas Valid (Lampu Hijau)
    
    KPUM->>PlenoUI: Klik "Buka Gembok Sidang Pleno (Pleno Unlock)"
    PlenoUI->>KPUM: Minta Konfirmasi Kredensial & Persetujuan Panwaslu
    KPUM->>PlenoUI: Masukkan Sandi Pengesahan KPUM
    Panwas->>PlenoUI: Verifikasi Otorisasi Pengawasan
    
    PlenoUI->>API: POST /api/pleno/unlock { authCredentials }
    activate API
    API->>DB: Update ElectionSetting { plenoUnlocked: true, plenoUnlockedAt: NOW() }
    API->>Tally: computeTally()
    Tally->>DB: Eksekusi Agregasi Suara Sah & Kotak Kosong
    Tally-->>API: Agregat Hasil Perolehan Suara
    
    API->>EdSign: Buat Kanonikal Berita Acara Model C-KWE
    API->>EdSign: signBaCanonical(canonicalText)
    EdSign-->>API: Signature Asimetris Ed25519 (Base64)
    API->>DB: Simpan baSignatureEd25519 & baSignedAt
    API-->>PlenoUI: Kembalikan Hasil Tally & Signature
    deactivate API

    PlenoUI-->>KPUM: Tampilkan Diagram Batang Perolehan Suara & Pemenang
    PlenoUI-->>Panwas: Tampilkan Dokumen Berita Acara Model C-KWE
    PlenoUI-->>Saksi: Tampilkan Rincian Suara per Prodi & Opsi Keberatan
    
    Saksi->>PlenoUI: Verifikasi Angka & Bubuhkan Tanda Tangan Saksi
    Panwas->>PlenoUI: Bubuhkan Tanda Tangan Pengesahan Panwaslu
    KPUM->>PlenoUI: Unduh Berita Acara PDF Resmi dengan QR Code Seal
```

---

### 2.4 Alur Pelaporan & Penanganan Sengketa Panwaslu
Diagram interaksi berikut memodelkan penanganan laporan pelanggaran pemira secara daring:

```mermaid
sequenceDiagram
    autonumber
    actor Pelapor as Mahasiswa / Saksi Paslon
    participant Portal as Portal Sengketa Daring
    participant API as Route API (/api/incidents)
    participant DB as Basis Data (Prisma)
    actor Panwas as Komisioner Panwaslu

    Pelapor->>Portal: Buka Formulir Pelaporan Sengketa Pemira
    Pelapor->>Portal: Input Data: NIM, Nama, Jenis Pelanggaran, Lokasi, Kronologi
    Pelapor->>Portal: Unggah Berkas Bukti Foto/Dokumen & Klik "Kirim Laporan"
    
    Portal->>API: POST /api/incidents/submit (FormData)
    activate API
    API->>API: Generate Ticket Number (misal: "TKT-2026-003")
    API->>DB: Insert ElectionIncident (ticketNumber, status: 'SUBMITTED')
    API->>DB: Insert AuditLog ('INCIDENT_REPORTED', ticketNumber)
    API-->>Portal: Return { ok: true, ticketNumber: "TKT-2026-003" }
    deactivate API

    Portal-->>Pelapor: Tampilkan Tiket Bukti Laporan & Kode Pantau
    
    API-->>Panwas: Real-Time Alert Event (SSE): Laporan Baru Masuk
    Panwas->>Portal: Buka Panel Penanganan Kasus Sengketa
    Panwas->>DB: Update ElectionIncident { status: 'IN_REVIEW' }
    Panwas->>Panwas: Sidang Verifikasi Bukti & Klarifikasi Pihak Terlapor
    
    alt Laporan Terbukti Melanggar (Sanksi Pengurangan Suara)
        Panwas->>Portal: Input Amar Putusan & Tetapkan Sanksi Pemotongan Suara
        Portal->>DB: Update ElectionIncident { status: 'RESOLVED', verdict: text }
        Panwas->>DB: Catat Penyesuaian Sanksi di tabel Berita Acara
    else Laporan Tidak Cukup Bukti
        Panwas->>Portal: Input Putusan Penolakan Laporan
        Portal->>DB: Update ElectionIncident { status: 'REJECTED', verdict: text }
    end
    
    Portal-->>Pelapor: Status Laporan Terperbarui di Portal Pelapor
```

---

## 3. Activity Diagrams

### 3.1 Alur Perjalanan Pemilih: Dari Meja Registrasi hingga Celup Tinta
Diagram aktivitas berikut menggambarkan alur langkah operasional pemilih sejak tiba di TPS kampus hingga selesai menggunakan hak pilihnya:

```mermaid
flowchart TD
    Start([Pemilih Tiba di TPS Kampus]) --> CekKTM[Tunjukkan Fisik KTM / KRS ke Petugas PPUR]
    CekKTM --> SearchDPT[Petugas Mencari NIM pada Sistem DPT Meja PPUR]
    
    SearchDPT --> IsRegistered{Mahasiswa Terdaftar di DPT?}
    IsRegistered -- Tidak --> DirectBAAK[Diarahkan ke Meja Pengaduan BAAK / KPUM] --> EndFail([Tidak Dapat Memilih])
    IsRegistered -- Ya --> HasVoted{Status Pemilih hasVoted == TRUE?}
    
    HasVoted -- Ya --> RejectDouble[Tolak Pendaftaran: Hak Suara Telah Digunakan] --> EndFail
    HasVoted -- Tidak --> IssueToken[PPUR Mengklik Terbitkan Token]
    
    IssueToken --> GenToken[Sistem Menghasilkan Token CSPRNG 6 Digit & Cetak Slip]
    GenToken --> EnterBooth[Pemilih Memasuki Bilik Suara Kiosk Layar Penuh]
    
    EnterBooth --> InputToken[Pemilih Mengetikkan 6 Digit Token pada Layar Sentuh]
    InputToken --> ValidateToken{Token Valid & Masih Dalam TTL 10 Menit?}
    
    ValidateToken -- Tidak / Expired --> RequestReissue[Kembali ke Meja PPUR Minta Penerbitan Ulang] --> SearchDPT
    ValidateToken -- Ya --> StepBEM[Layar Kiosk Memuat Surat Suara 1: Presma & Wapresma]
    
    StepBEM --> ChooseBEM[Pilih Salah Satu Paslon BEM atau Suara Kosong]
    ChooseBEM --> StepDPM[Layar Kiosk Memuat Surat Suara 2: Pimpinan DPM]
    
    StepDPM --> ChooseDPM[Pilih Salah Satu Calon DPM atau Suara Kosong]
    ChooseDPM --> StepHIMA[Layar Memuat Surat Suara 3: HIMA Sesuai Prodi Pemilih]
    
    StepHIMA --> SingleCandidate{"Kategori HIMA Calon Tunggal?"}
    SingleCandidate -- Ya --> ShowEmptyBox[Sajikan Paslon Tunggal vs KOTAK KOSONG]
    SingleCandidate -- Tidak --> ShowCandidates[Sajikan Seluruh Paslon HIMA Prodi Terdaftar]
    
    ShowEmptyBox --> ChooseHIMA[Pilih Paslon / Kotak Kosong / Suara Kosong]
    ShowCandidates --> ChooseHIMA
    
    ChooseHIMA --> ReviewScreen[Tampilkan Panel Review Ringkasan 3 Pilihan]
    ReviewScreen --> IsConfirmed{"Konfirmasi Pilihan Sudah Tepat?"}
    
    IsConfirmed -- Mau Mengubah --> ChangeSelection[Tekan Ubah Pilihan & Navigasi Kembali] --> StepBEM
    IsConfirmed -- Setuju --> AtomicSubmit[Tekan 'KIRIM SUARA SEKARANG']
    
    AtomicSubmit --> RunAtomicTx[Eksekusi Transaksi Atomik 6-Langkah di Basis Data]
    RunAtomicTx --> SuccessScreen[Tampilkan Layar Konfirmasi Sukses Selama 3 Detik]
    SuccessScreen --> AutoReset[Terminal Kiosk Otomatis Reset ke Halaman Awal]
    
    AutoReset --> InkDesk[Pemilih Menuju Meja Keluar untuk Mencelupkan Jari ke Tinta]
    InkDesk --> EndSuccess([Pemilih Selesai Menyalurkan Hak Suara])
```

---

### 3.2 Alur Rekapitulasi Suara & Verifikasi Rantai Hash Kriptografis
Diagram aktivitas berikut memodelkan prosedur penutupan TPS, audit rantai kriptografi, dan penghitungan suara pada Sidang Pleno terbuka:

```mermaid
flowchart TD
    StartPleno([Waktu Pemungutan Suara Berakhir]) --> CloseVoting[KPUM Mengubah Status votingOpen = FALSE]
    CloseVoting --> LockPPUR[Sistem Mengunci Meja PPUR: Terbit Token Dinonaktifkan]
    
    LockPPUR --> OpenPlenoSession[Pembukaan Sidang Pleno di Hadapan Panwaslu & Saksi]
    OpenPlenoSession --> RunHashAudit[Eksekusi Audit Integritas Rantai Suara SHA-256]
    
    RunHashAudit --> VerifyLoop[Putar Ulang Seluruh Blok Suara di 5 Rantai Prodi]
    VerifyLoop --> IsChainValid{"Apakah Seluruh Blok Hash Rantai 100% Valid?"}
    
    IsChainValid -- Ditemukan Manipulasi --> HaltPleno[Hentikan Pembukaan: Terbitkan Laporan Anomali Forensik] --> Investigation[Sidang Penyelidikan Sengketa Panwaslu]
    IsChainValid -- Valid Sempurna --> AuthorizeUnlock[Otorisasi Pleno Unlocking oleh KPUM & Panwaslu]
    
    AuthorizeUnlock --> RemoveLock423[Sistem Menonaktifkan Gembok HTTP 423 Locked]
    RemoveLock423 --> AggregateTally[Eksekusi Kueri Tallying Agregat Suara Sah & Kotak Kosong]
    
    AggregateTally --> EvalSingleCand{"Kategori Memiliki Paslon Tunggal?"}
    EvalSingleCand -- Ya --> CheckThreshold{"Apakah Suara Paslon Tunggal > 50% Suara Sah?"}
    CheckThreshold -- Ya --> WinnerSingle[Status Pemenang: 'TERPILIH']
    CheckThreshold -- Tidak --> ReturnMandate[Status: 'MANDAT KEMBALI KE MUSYAWARAH MAHASISWA']
    
    EvalSingleCand -- Tidak --> EvalTie{"Apakah Terdapat Dua Paslon Teratas Bersuara Sama?"}
    EvalTie -- Ya --> TieStatus[Status Kategori: 'STATUS_SERI_PENDING_PLENO']
    EvalTie -- Tidak --> WinnerPlural[Tetapkan Paslon Peraih Suara Terbanyak Sebagai Pemenang]
    
    WinnerSingle --> GenCanonical[Susun Teks Kanonikal Berita Acara Model C-KWE]
    ReturnMandate --> GenCanonical
    TieStatus --> GenCanonical
    WinnerPlural --> GenCanonical
    
    GenCanonical --> SignEd25519[Bubuhkan Tanda Tangan Digital Asimetris Ed25519]
    SignEd25519 --> ReviewSignParties[Saksi & Panwaslu Memeriksa dan Menyetujui Dokumen]
    ReviewSignParties --> ExportPdf[Render Dokumen PDF Berita Acara Berstempel QR Seal]
    ExportPdf --> ArchiveState[Segel Lembar Periode ke ElectionArchive]
    ArchiveState --> EndPleno([Sidang Pleno Selesai & Hasil Resmi Ditetapkan])
```

---

## 4. State Machine Diagrams

### 4.1 Siklus Hidup Status Token Pemilih (`VotingToken`)
Diagram mesin status (*State Machine*) berikut memodelkan transisi status token dari saat diterbitkan hingga dimusnahkan:

```mermaid
stateDiagram-v2
    [*] --> ACTIVE : Diterbitkan PPUR (CSPRNG, TTL 10 Menit)
    
    ACTIVE --> EXPIRED : Waktu Melewati expiresAt (10 Menit Habis)
    ACTIVE --> REVOKED : Dibatalkan Petugas PPUR (UC-02 Insiden/Koreksi)
    ACTIVE --> USED : Suara Disubmit di Bilik Kiosk (Transaksi Atomik 6-Langkah)
    
    EXPIRED --> REVOKED : Pemilih Melapor ke PPUR & Minta Terbit Ulang
    
    state USED {
        [*] --> VoteVersion1 : Suara Pertama Sah
        VoteVersion1 --> VoteVersion2 : Re-Vote Diizinkan (Model Estonia)
        VoteVersion2 --> VoteVersionN : Penggantian Suara Terakhir
    }
    
    USED --> LOCKED : Pemilih Memilih Sukarela 'Kunci Suaraku' / Pleno Ditutup
    USED --> REVOKED : Dibatalkan Akibat Sanksi Resmi Panwaslu
    
    REVOKED --> [*] : Suara Dikecualikan dari Rekap
    LOCKED --> [*] : Suara Terkunci Permanen
```

---

### 4.2 Siklus Hidup Status Kehadiran Pemilih (`Voter`)
Diagram mesin status berikut memodelkan perubahan status mahasiswa di dalam Daftar Pemilih Tetap (DPT):

```mermaid
stateDiagram-v2
    [*] --> BELUM_MEMILIH : Inisialisasi Impor CSV DPT dari BAAK
    
    BELUM_MEMILIH --> DALAM_ANTREAN : Verifikasi Fisik KTM & Token Bilik Diterbitkan PPUR
    
    DALAM_ANTREAN --> BELUM_MEMILIH : Token Batal / Hangus & Pemilih Batal Mengantre
    DALAM_ANTREAN --> SUDAH_MEMILIH : Pemilih Sukses Submit Suara di Bilik Kiosk
    
    SUDAH_MEMILIH --> SUDAH_MEMILIH : Melakukan Re-vote di Bilik (Status Tetap Sudah Memilih)
    
    SUDAH_MEMILIH --> [*] : Arsip Periode Ditutup (DPT Diberi Cap Final)
```

---

### 4.3 Siklus Hidup Gembok Sidang Pleno (`PlenoVault`)
Diagram mesin status berikut memodelkan status keterbukaan data perolehan suara:

```mermaid
stateDiagram-v2
    [*] --> INITIALIZING : Pengaturan Master Eleksi Dibuat
    
    INITIALIZING --> LOCKED_423 : Masa Pemungutan Suara Dibuka (votingOpen = TRUE)
    
    state LOCKED_423 {
        [*] --> NormalVoting : Penerimaan Suara Masuk Terenkripsi
        NormalVoting --> FrozenMode : Aktivasi Emergency Freeze Panwaslu/KPUM
        FrozenMode --> NormalVoting : Penonaktifkan Freeze
    }
    
    LOCKED_423 --> UNLOCKED : Sidang Pleno Resmi Dibuka (Otorisasi KPUM + Panwaslu)
    
    UNLOCKED --> TALLY_CALCULATED : Agregasi Suara Tuntas & Pemenang Ditetapkan
    TALLY_CALCULATED --> BA_SIGNED : Tanda Tangan Digital Ed25519 Dibubuhkan
    
    BA_SIGNED --> SEALED_ARCHIVED : Periode Disahkan & Dimasukkan ke Arsip Abadi
    SEALED_ARCHIVED --> [*]
```

---

## 5. Deployment Diagram

Diagram penyebaran (*Deployment Diagram*) berikut memetakan arsitektur penyebaran sistem dalam model ganda (*Dual-Mode Architecture*): Mode Utama On-Premise LAN Tertutup di Kampus Poltek CWE dan Mode Sekunder Cloud Serverless.

```mermaid
graph TD
    subgraph DeploymentLAN["LINGKUNGAN ON-PREMISE LAN TERPILIH (TPS KAMPUS POLTEK CWE)"]
        ServerMiniPC["Server Mini-PC (Linux Ubuntu Server 22.04 LTS)\n- Next.js 15 Standalone Node Engine\n- SQLite / LibSQL Engine (ACID Transaction)\n- Node.js Native Crypto (CSPRNG, SHA-256, Ed25519)\n- Caddy Reverse Proxy (Internal TLS / HTTPS)"]
        DiskKeys["Penyimpanan Kunci Privat Ed25519\n(keys/ba-signing-key.json)"]
        Switch["Gigabit Switch Cat6 & Router Wi-Fi 6\n(Subnet Intranet 192.168.10.0/24)"]
        UPS["UPS Daya Cadangan 1200VA / 720W"]
        
        KioskTerminal1["Bilik Kiosk 1 (Touchscreen Chrome Fullscreen)"]
        KioskTerminal2["Bilik Kiosk 2 (Touchscreen Chrome Fullscreen)"]
        PPURWorkstation["Workstation Meja PPUR (PC / Laptop + Printer 58mm)"]
        PanwasMonitor["Monitor Layar Pengawasan Panwaslu"]
        PlenoProjector["Layar Proyektor Sidang Pleno Kampus"]
    end

    subgraph DeploymentCloud["LINGKUNGAN CLOUD SERVERLESS (PORTAL PUBLIK & CADANGAN)"]
        VercelEdge["Vercel Edge Network / Serverless Functions"]
        TursoCloud["Turso LibSQL Cloud Database (Replica Sinkron)"]
        PublicClient["Mahasiswa Umum (Gawai Smartphone / Browser Eksternal)"]
    end

    %% Hubungan Jaringan Lokal
    UPS -.-> ServerMiniPC
    UPS -.-> Switch
    ServerMiniPC --- Switch
    ServerMiniPC --- DiskKeys
    Switch --- KioskTerminal1
    Switch --- KioskTerminal2
    Switch --- PPURWorkstation
    Switch --- PanwasMonitor
    Switch --- PlenoProjector

    %% Hubungan Cloud
    PublicClient --- VercelEdge
    VercelEdge --- TursoCloud
```
