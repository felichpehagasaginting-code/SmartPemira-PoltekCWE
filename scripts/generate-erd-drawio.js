// ============================================================
// NATIVE DRAW.IO TABLE ERD GENERATOR — SMART PEMIRA POLTEK CWE
// Menghasilkan ERD berformat Draw.io resmi dengan:
// 1. shape=table & shape=tableRow (Tabel 3 Kolom: KEY | KOLOM | TIPE & KETERANGAN)
// 2. Layout Grid 4 Kolom berjarak lebar (Anti-Tumpang Tindih)
// 3. Crow's Foot Connector rapi dengan port terarah (exit/entry koordinat)
// 4. Zero-Knowledge Barrier Banner & Panduan Penggunaan
// ============================================================
const { writeFileSync, mkdirSync } = require("fs");
const path = require("path");

const OUT_DIR = path.resolve(__dirname, "../Dokumentasi/04_ENTITY_RELATIONSHIP_DIAGRAM_ERD");
const OUT_FILE = path.join(OUT_DIR, "ERD_SMART_PEMIRA_POLTEK_CWE.drawio");
const SQL_FILE = path.join(OUT_DIR, "schema_erd.sql");

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const entities = [
  // ==================== KOLOM 1: DOMAIN DPT & AKADEMIK (X = 80) ====================
  {
    id: "t_study_program",
    name: "StudyProgram",
    subtitle: "Master Program Studi (5 Prodi)",
    x: 80,
    y: 130,
    width: 360,
    headerColor: "#107C41", // Excel Green
    borderColor: "#0B5A2F",
    fields: [
      { key: "PK", name: "id", type: "String", note: "TPTP, TPHP, MANLOG, BD, TRPL" },
      { key: "", name: "name", type: "String", note: "Nama Resmi Program Studi" },
      { key: "", name: "facultyName", type: "String", note: "Jurusan / Fakultas" },
      { key: "", name: "colorPrimary", type: "String", note: "Warna Aksen Hima (Hex)" },
      { key: "", name: "colorTint", type: "String", note: "Warna Background Tint (Hex)" },
    ],
  },
  {
    id: "t_voter",
    name: "Voter",
    subtitle: "Daftar Pemilih Tetap (DPT BAAK)",
    x: 80,
    y: 400,
    width: 360,
    headerColor: "#004E8C", // Classic Navy
    borderColor: "#003366",
    fields: [
      { key: "PK", name: "id", type: "String", note: "UUIDv4" },
      { key: "UK", name: "nim", type: "String", note: "Nomor Induk Mahasiswa BAAK" },
      { key: "", name: "name", type: "String", note: "Nama Lengkap Mahasiswa" },
      { key: "", name: "angkatan", type: "Int", note: "Tahun Masuk (2023-2026)" },
      { key: "FK", name: "studyProgramId", type: "String", note: "FK -> StudyProgram.id (1:N)" },
      { key: "FK", name: "tpsId", type: "String", note: "FK -> Tps.id (1:N)" },
      { key: "", name: "status", type: "String", note: "BELUM_MEMILIH | SUDAH_MEMILIH" },
      { key: "", name: "hasVoted", type: "Boolean", note: "Flag Hak Suara Digunakan" },
      { key: "", name: "votedAt", type: "DateTime?", note: "Waktu Check-in Selesai" },
      { key: "", name: "pendingTokenHash", type: "String?", note: "1:0..1 Transien (Dihapus saat Vote)" },
      { key: "", name: "createdAt", type: "DateTime", note: "Waktu Rekam DPT" },
    ],
  },
  {
    id: "t_incident",
    name: "ElectionIncident",
    subtitle: "Laporan Sengketa & Pelanggaran Panwaslu",
    x: 80,
    y: 840,
    width: 360,
    headerColor: "#5C2D91", // Purple
    borderColor: "#3E1A64",
    fields: [
      { key: "PK", name: "id", type: "String", note: "UUIDv4" },
      { key: "UK", name: "ticketNumber", type: "String", note: "INC-2026-XXXX" },
      { key: "", name: "reporterName", type: "String", note: "Nama Lengkap Pelapor" },
      { key: "", name: "reporterNim", type: "String", note: "NIM Pelapor Terverifikasi" },
      { key: "", name: "incidentType", type: "String", note: "KECURANGAN | MALFUNGSI" },
      { key: "", name: "location", type: "String", note: "Lokasi Fisik / Digital" },
      { key: "", name: "description", type: "String", note: "Uraian Kronologis Kejadian" },
      { key: "", name: "status", type: "String", note: "SUBMITTED | RESOLVED" },
      { key: "", name: "verdict", type: "String?", note: "Amar Putusan Panwaslu / DKPPR" },
      { key: "", name: "createdAt", type: "DateTime", note: "Waktu Laporan Masuk" },
    ],
  },

  // ==================== KOLOM 2: DOMAIN TPS & TOKEN BILIK (X = 600) ====================
  {
    id: "t_tps",
    name: "Tps",
    subtitle: "TPS Virtual & Rantai Hash per Prodi",
    x: 600,
    y: 130,
    width: 360,
    headerColor: "#107C41",
    borderColor: "#0B5A2F",
    fields: [
      { key: "PK", name: "id", type: "String", note: "Kode Prodi (TPTP, TRPL...)" },
      { key: "", name: "name", type: "String", note: "TPS ONLINE - <Nama Prodi>" },
      { key: "", name: "location", type: "String", note: "Keterangan Pemira Online" },
      { key: "UK", name: "chainSalt", type: "String", note: "Salt Rantai SHA-256 (32-byte)" },
      { key: "", name: "lastChainHash", type: "String", note: "Head Hash Terkini Rantai" },
    ],
  },
  {
    id: "t_voting_token",
    name: "VotingToken",
    subtitle: "Kredensial Bilik Ephemeral & Re-vote",
    x: 600,
    y: 400,
    width: 360,
    headerColor: "#B45309", // Warm Amber
    borderColor: "#78350F",
    fields: [
      { key: "PK", name: "id", type: "String", note: "UUIDv4" },
      { key: "UK", name: "tokenHash", type: "String", note: "SHA-256 Plaintext Token 6 Karakter" },
      { key: "FK", name: "tpsId", type: "String", note: "FK -> Tps.id (1:N)" },
      { key: "FK", name: "studyProgramId", type: "String", note: "FK -> StudyProgram.id (1:N)" },
      { key: "", name: "status", type: "String", note: "ACTIVE | USED | REVOKED" },
      { key: "", name: "issuedAt", type: "DateTime", note: "Waktu Terbit di Meja PPUR" },
      { key: "", name: "expiresAt", type: "DateTime", note: "TTL Masuk Bilik Pertama (10m)" },
      { key: "", name: "usedAt", type: "DateTime?", note: "Waktu Akses Pertama" },
      { key: "", name: "lockedAt", type: "DateTime?", note: "Kunci Suaraku (Final)" },
      { key: "", name: "revoteCount", type: "Int", note: "Jumlah Re-vote (0 = 1x Vote)" },
    ],
  },
  {
    id: "t_audit_log",
    name: "AuditLog",
    subtitle: "Catatan Forensik Keamanan Append-Only",
    x: 600,
    y: 840,
    width: 360,
    headerColor: "#5C2D91",
    borderColor: "#3E1A64",
    fields: [
      { key: "PK", name: "id", type: "String", note: "UUIDv4" },
      { key: "", name: "event", type: "String", note: "TOKEN_ISSUED, BALLOT_SUBMIT, dll" },
      { key: "", name: "detail", type: "String", note: "Deskripsi Tanpa Pilihan Suara" },
      { key: "FK", name: "tpsId", type: "String?", note: "FK -> Tps.id (Opsional 1:N)" },
      { key: "", name: "createdAt", type: "DateTime", note: "Waktu Kejadian Presisi Server" },
    ],
  },

  // ==================== KOLOM 3: DOMAIN KOTAK SUARA & KANDIDAT (X = 1120) ====================
  {
    id: "t_ballot_box",
    name: "BallotBox",
    subtitle: "Surat Suara Anonim & Junction M:N",
    x: 1120,
    y: 200,
    width: 380,
    headerColor: "#A4262C", // Crimson
    borderColor: "#751A1F",
    fields: [
      { key: "PK", name: "id", type: "String", note: "UUIDv4 Acak Murni" },
      { key: "", name: "category", type: "String", note: "PRESMA | DPM | HIMA" },
      { key: "FK", name: "candidateId", type: "String?", note: "FK -> Candidate.id (NULL = Suara Kosong)" },
      { key: "", name: "isEmptyBox", type: "Boolean", note: "Flag Coblos Suara Kosong" },
      { key: "FK", name: "tpsId", type: "String", note: "FK -> Tps.id (1:N Rantai Hash)" },
      { key: "FK", name: "tokenId", type: "String?", note: "FK -> VotingToken.id (1:N Sesi Suara)" },
      { key: "", name: "voteVersion", type: "Int", note: "Versi Suara: 1=Asli, 2+=Re-vote" },
      { key: "", name: "createdAt", type: "DateTime", note: "Waktu Simpan dengan Jitter Acak" },
      { key: "", name: "ballotHash", type: "String", note: "SHA-256 Hash Rantai Integritas" },
    ],
  },
  {
    id: "t_candidate",
    name: "Candidate",
    subtitle: "Master Paslon Presma, DPM & Hima",
    x: 1120,
    y: 560,
    width: 380,
    headerColor: "#A4262C",
    borderColor: "#751A1F",
    fields: [
      { key: "PK", name: "id", type: "String", note: "UUIDv4" },
      { key: "", name: "category", type: "String", note: "PRESMA | DPM | HIMA" },
      { key: "FK", name: "studyProgramId", type: "String?", note: "FK -> StudyProgram.id (Khusus HIMA)" },
      { key: "", name: "number", type: "Int", note: "Nomor Urut Paslon" },
      { key: "", name: "presidentName", type: "String", note: "Presma / Ketum DPM / Ketua Hima" },
      { key: "", name: "viceName", type: "String?", note: "Wapresma / Ketua 1 / Wakil Hima" },
      { key: "", name: "secondViceName", type: "String?", note: "Khusus DPM: Ketua 2" },
      { key: "", name: "photoLeaderUrl", type: "String?", note: "URL Foto Pemimpin Utama" },
      { key: "", name: "photoViceUrl", type: "String?", note: "URL Foto Wakil" },
      { key: "", name: "photoSecondViceUrl", type: "String?", note: "URL Foto Wakil 2 (DPM)" },
      { key: "", name: "vision", type: "String", note: "Pernyataan Visi" },
      { key: "", name: "missionJson", type: "String", note: "Array JSON Misi" },
      { key: "", name: "photoAccent", type: "String", note: "Warna Hex Kartu Paslon" },
      { key: "", name: "isEmptyBox", type: "Boolean", note: "Opsi Bawaan Kotak Kosong" },
    ],
  },
  {
    id: "t_candidate_photo",
    name: "CandidatePhoto",
    subtitle: "Penyimpanan BLOB Foto Paslon (WebP 3:4)",
    x: 1120,
    y: 1000,
    width: 380,
    headerColor: "#107C41", // Forest Green
    borderColor: "#0B5A2F",
    fields: [
      { key: "PK", name: "id", type: "String", note: "UUIDv4 Kunci Primer" },
      { key: "FK", name: "candidateId", type: "String", note: "FK -> Candidate.id (ON DELETE CASCADE)" },
      { key: "UK", name: "role", type: "String", note: "leader | vice | secondVice (Unique/Candidate)" },
      { key: "", name: "mimeType", type: "String", note: "Format Konten (Default: image/webp)" },
      { key: "", name: "data", type: "Bytes", note: "BLOB Biner Gambar Terkompresi Canvas" },
      { key: "", name: "createdAt", type: "DateTime", note: "Waktu Unggah Pertama" },
      { key: "", name: "updatedAt", type: "DateTime", note: "Waktu Perubahan Terakhir" },
    ],
  },

  // ==================== KOLOM 4: DOMAIN TATA KELOLA & ARSIP (X = 1660) ====================
  {
    id: "t_operator",
    name: "Operator",
    subtitle: "Akun Pengguna RBAC & 2FA TOTP",
    x: 1660,
    y: 130,
    width: 360,
    headerColor: "#323130", // Dark Slate
    borderColor: "#201F1E",
    fields: [
      { key: "PK", name: "id", type: "String", note: "UUIDv4" },
      { key: "UK", name: "username", type: "String", note: "ID Login Petugas" },
      { key: "", name: "passwordHash", type: "String", note: "scrypt Salted Password Hash" },
      { key: "", name: "role", type: "String", note: "KPUM | PPUR | PANWASLU | SAKSI | ITPO" },
      { key: "", name: "fullName", type: "String", note: "Nama Lengkap Petugas" },
      { key: "FK", name: "tpsId", type: "String?", note: "FK -> Tps.id (Khusus Petugas PPUR)" },
      { key: "", name: "isActive", type: "Boolean", note: "Status Akun Aktif" },
      { key: "", name: "mustChangePassword", type: "Boolean", note: "Wajib Ganti Sandi Awal" },
      { key: "", name: "totpSecret", type: "String?", note: "Secret TOTP Terenkripsi AES-GCM" },
      { key: "", name: "totpEnabledAt", type: "DateTime?", note: "Waktu Pengaktifan 2FA" },
      { key: "", name: "backupCodesJson", type: "String?", note: "JSON Hash Kode Cadangan" },
      { key: "", name: "lastLoginAt", type: "DateTime?", note: "Login Terakhir" },
      { key: "", name: "createdAt", type: "DateTime", note: "Waktu Pendaftaran Akun" },
    ],
  },
  {
    id: "t_setting",
    name: "ElectionSetting",
    subtitle: "Konfigurasi Singleton (1:1 System State)",
    x: 1660,
    y: 560,
    width: 360,
    headerColor: "#323130",
    borderColor: "#201F1E",
    fields: [
      { key: "PK", name: "id", type: "String", note: "Singleton 'main'" },
      { key: "", name: "votingOpen", type: "Boolean", note: "Status Gerbang Voting" },
      { key: "", name: "emergencyFreeze", type: "Boolean", note: "Hak Veto Darurat Panwaslu" },
      { key: "", name: "plenoUnlocked", type: "Boolean", note: "Hukum 5: Pleno Vault Lock" },
      { key: "", name: "plenoUnlockedAt", type: "DateTime?", note: "Waktu Sidang Pleno Buka Hasil" },
      { key: "", name: "sessionSecret", type: "String", note: "HMAC Secret Sesi Operator" },
      { key: "", name: "baSignatureEd25519", type: "String?", note: "Digital Signature Asimetris" },
      { key: "", name: "baSignedAt", type: "DateTime?", note: "Waktu Pengesahan Pleno" },
      { key: "", name: "baSignaturesJson", type: "String?", note: "Multi-Signature Ed25519" },
      { key: "", name: "periodLabel", type: "String", note: "Label Periode Aktif" },
      { key: "", name: "periodStartedAt", type: "DateTime?", note: "Waktu Buka Periode" },
      { key: "", name: "updatedAt", type: "DateTime", note: "Waktu Pembaruan Terakhir" },
    ],
  },
  {
    id: "t_archive",
    name: "ElectionArchive",
    subtitle: "Kapsul Segel Penutupan Periode",
    x: 1660,
    y: 960,
    width: 360,
    headerColor: "#323130",
    borderColor: "#201F1E",
    fields: [
      { key: "PK", name: "id", type: "String", note: "UUIDv4" },
      { key: "UK", name: "archiveCode", type: "String", note: "ARS-2026-XXXX" },
      { key: "", name: "periodLabel", type: "String", note: "Label Periode Disegel" },
      { key: "", name: "mode", type: "String", note: "DEMO | NEW_PERIOD" },
      { key: "", name: "sealedAt", type: "DateTime", note: "Waktu Segel Permanen" },
      { key: "", name: "sealedBy", type: "String", note: "Username ITPO Eksekutor" },
      { key: "", name: "note", type: "String", note: "Catatan BA Penutupan" },
      { key: "", name: "summaryJson", type: "String", note: "Rekap Hasil Tally & Rantai" },
      { key: "", name: "canonical", type: "String", note: "Teks Kanonikal BA Model C-KWE" },
      { key: "", name: "signature", type: "String", note: "SHA-256 Digest Kanonikal" },
      { key: "", name: "signatureEd25519", type: "String?", note: "Signature Digital Ed25519" },
      { key: "", name: "chainHeadsJson", type: "String", note: "Snapshot 5 Head Rantai Hash" },
      { key: "", name: "dptCount", type: "Int", note: "Total DPT Terdaftar" },
      { key: "", name: "votedCount", type: "Int", note: "Total Pemilih Memilih" },
      { key: "", name: "ballotCount", type: "Int", note: "Total Suara Sah Masuk" },
    ],
  },
];

const relationships = [
  // 1:N StudyProgram -> Voter (Vertical Down in Col 1)
  {
    id: "rel_prodi_voter",
    source: "t_study_program",
    target: "t_voter",
    exitX: "0.3", exitY: "1", entryX: "0.3", entryY: "0",
    label: "1 : N (One to Many)",
    startArrow: "ERmandOne", endArrow: "ERmandMany",
  },
  // 1:N StudyProgram -> Candidate (Col 1 to Col 3)
  {
    id: "rel_prodi_candidate",
    source: "t_study_program",
    target: "t_candidate",
    exitX: "0.7", exitY: "1", entryX: "0", entryY: "0.2",
    label: "1 : N (Optional - HIMA)",
    startArrow: "ERmandOne", endArrow: "ERzeroToMany",
  },
  // 1:N StudyProgram -> VotingToken (Col 1 to Col 2)
  {
    id: "rel_prodi_token",
    source: "t_study_program",
    target: "t_voting_token",
    exitX: "1", exitY: "0.5", entryX: "0", entryY: "0.2",
    label: "1 : N",
    startArrow: "ERmandOne", endArrow: "ERmandMany",
  },
  // 1:N Tps -> Voter (Col 2 to Col 1)
  {
    id: "rel_tps_voter",
    source: "t_tps",
    target: "t_voter",
    exitX: "0", exitY: "0.7", entryX: "1", entryY: "0.2",
    label: "1 : N",
    startArrow: "ERmandOne", endArrow: "ERmandMany",
  },
  // 1:N Tps -> VotingToken (Vertical Down in Col 2)
  {
    id: "rel_tps_token",
    source: "t_tps",
    target: "t_voting_token",
    exitX: "0.3", exitY: "1", entryX: "0.3", entryY: "0",
    label: "1 : N (One to Many)",
    startArrow: "ERmandOne", endArrow: "ERmandMany",
  },
  // 1:N Tps -> BallotBox (Col 2 to Col 3)
  {
    id: "rel_tps_ballot",
    source: "t_tps",
    target: "t_ballot_box",
    exitX: "1", exitY: "0.6", entryX: "0", entryY: "0.2",
    label: "1 : N (Hash Chain)",
    startArrow: "ERmandOne", endArrow: "ERmandMany",
  },
  // 1:N Tps -> Operator (Col 2 to Col 4)
  {
    id: "rel_tps_operator",
    source: "t_tps",
    target: "t_operator",
    exitX: "1", exitY: "0.2", entryX: "0", entryY: "0.2",
    label: "1 : N (Optional - PPUR)",
    startArrow: "ERmandOne", endArrow: "ERzeroToMany",
  },
  // 1:N Tps -> AuditLog (Col 2 vertical down)
  {
    id: "rel_tps_audit",
    source: "t_tps",
    target: "t_audit_log",
    exitX: "0.8", exitY: "1", entryX: "0.8", entryY: "0",
    label: "1 : N (Optional)",
    startArrow: "ERmandOne", endArrow: "ERzeroToMany",
  },
  // 1:N VotingToken -> BallotBox (Col 2 to Col 3)
  {
    id: "rel_token_ballot",
    source: "t_voting_token",
    target: "t_ballot_box",
    exitX: "1", exitY: "0.3", entryX: "0", entryY: "0.5",
    label: "1 : N (3 Suara / Versi)",
    startArrow: "ERmandOne", endArrow: "ERmandMany",
  },
  // 1:N Candidate -> BallotBox (Vertical Up in Col 3)
  {
    id: "rel_candidate_ballot",
    source: "t_candidate",
    target: "t_ballot_box",
    exitX: "0.5", exitY: "0", entryX: "0.5", entryY: "1",
    label: "1 : N (Optional - Kotak Kosong)",
    startArrow: "ERmandOne", endArrow: "ERzeroToMany",
  },
  // 1:N Candidate -> CandidatePhoto (Vertical Down in Col 3)
  {
    id: "rel_candidate_photo",
    source: "t_candidate",
    target: "t_candidate_photo",
    exitX: "0.5", exitY: "1", entryX: "0.5", entryY: "0",
    label: "1 : N (0..3 Foto Paslon)",
    startArrow: "ERmandOne", endArrow: "ERzeroToMany",
  },
];

function generateDrawioXml() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2026-11-20T03:00:00.000Z" agent="SmartPemira-ERD-Generator-v2" version="24.0.0" type="device">
  <diagram id="smart-pemira-erd-v2" name="ERD Smart Pemira Official Table">
    <mxGraphModel dx="2200" dy="1400" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2200" pageHeight="1500" background="#FFFFFF" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- ==================== HEADER BANNER UTAMA ==================== -->
        <mxCell id="b_title" value="&lt;b style=&quot;font-size: 18px; color: #141E19;&quot;&gt;ENTITY RELATIONSHIP DIAGRAM (ERD) — SMART PEMIRA POLTEK CWE&lt;/b&gt;&lt;br&gt;&lt;span style=&quot;font-size: 12px; color: #4A5851;&quot;&gt;Model Basis Data Relasional Zero-Knowledge: 11 Entitas, 5 Rantai Hash TPS Virtual, &amp;amp; Re-vote Model Estonia (Normalisasi 3NF)&lt;/span&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#F8F9FA;strokeColor=#141E19;strokeWidth=2;align=center;verticalAlign=middle;shadow=0;fontFamily=Segoe UI,Helvetica;" vertex="1" parent="1">
          <mxGeometry x="80" y="20" width="1940" height="60" as="geometry" />
        </mxCell>

        <!-- ==================== ZERO-KNOWLEDGE AIR-GAP BANNER ==================== -->
        <mxCell id="b_zk" value="&lt;b style=&quot;color: #C00000; font-size: 13px;&quot;&gt;⛔ HUKUM 1: DOKTRIN ZERO-KNOWLEDGE BALLOT ISOLATION (KARDINALITAS 0 : 0)&lt;/b&gt;&lt;br&gt;&lt;span style=&quot;font-size: 11px; color: #600;&quot;&gt;Tabel &lt;b&gt;Voter&lt;/b&gt; (Identitas DPT) dan &lt;b&gt;BallotBox&lt;/b&gt; (Surat Suara Anonim) &lt;b&gt;TIDAK MEMILIKI KUNCI ASING (FOREIGN KEY)&lt;/b&gt; voter_id atau nim. Kerahasiaan pilihan dijamin mutlak.&lt;/span&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FDE8E5;strokeColor=#C00000;strokeWidth=2;dashed=1;dashPattern=6 4;align=center;verticalAlign=middle;fontFamily=Segoe UI,Helvetica;" vertex="1" parent="1">
          <mxGeometry x="80" y="740" width="880" height="60" as="geometry" />
        </mxCell>

        <!-- ==================== MANY-TO-MANY RESOLUTION BANNER ==================== -->
        <mxCell id="b_mn" value="&lt;b style=&quot;color: #833C0C; font-size: 13px;&quot;&gt;ℹ️ DEKOMPOSISI RELASI MANY-TO-MANY (M : N)&lt;/b&gt;&lt;br&gt;&lt;span style=&quot;font-size: 11px; color: #595959;&quot;&gt;Relasi M:N konseptual antara &lt;b&gt;VotingToken&lt;/b&gt; dan &lt;b&gt;Candidate&lt;/b&gt; diwujudkan melalui tabel perantara &lt;b&gt;BallotBox&lt;/b&gt; (1 Token mencoblos 3 surat suara; 1 Paslon dicoblos banyak token).&lt;/span&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FFF2CC;strokeColor=#B28900;strokeWidth=1;align=center;verticalAlign=middle;fontFamily=Segoe UI,Helvetica;" vertex="1" parent="1">
          <mxGeometry x="1120" y="120" width="380" height="60" as="geometry" />
        </mxCell>
`;

  let cellCounter = 200;

  // Render Entities using Draw.io native shape=table
  for (const ent of entities) {
    const tableId = ent.id;
    const headerHeight = 36;
    const rowHeight = 26;
    const totalHeight = headerHeight + (ent.fields.length + 1) * rowHeight; // +1 for table column headers

    // 1. Table Container
    xml += `
        <!-- Table: ${ent.name} -->
        <mxCell id="${tableId}" value="&lt;b&gt;${escapeXml(ent.name)}&lt;/b&gt;&lt;br&gt;&lt;span style=&quot;font-size: 9px; font-weight: normal; opacity: 0.85;&quot;&gt;${escapeXml(ent.subtitle)}&lt;/span&gt;" style="shape=table;startSize=${headerHeight};container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=1;fontStyle=1;align=center;resizeLast=1;html=1;whiteSpace=wrap;fillColor=${ent.headerColor};strokeColor=${ent.borderColor};strokeWidth=2;fontColor=#FFFFFF;fontFamily=Segoe UI,Helvetica;fontSize=12;shadow=0;" vertex="1" parent="1">
          <mxGeometry x="${ent.x}" y="${ent.y}" width="${ent.width}" height="${totalHeight}" as="geometry" />
        </mxCell>`;

    // 2. Table Column Headers Row (KEY | ATRIBUT | TIPE DATA & KETERANGAN)
    cellCounter++;
    const headRowId = `${tableId}_hrow`;
    xml += `
        <mxCell id="${headRowId}" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;top=0;left=0;bottom=0;right=0;collapsible=0;dropTarget=0;fillColor=#F3F2F1;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;" vertex="1" parent="${tableId}">
          <mxGeometry y="${headerHeight}" width="${ent.width}" height="${rowHeight}" as="geometry" />
        </mxCell>
        <mxCell id="${tableId}_c_h1" value="KEY" style="shape=partialRectangle;connectable=0;fillColor=none;top=0;left=0;bottom=1;right=0;fontStyle=1;overflow=hidden;align=center;verticalAlign=middle;html=1;whiteSpace=wrap;fontColor=#323130;fontSize=9;fontFamily=Segoe UI,Helvetica;strokeColor=#D2D0CE;" vertex="1" parent="${headRowId}">
          <mxGeometry width="38" height="${rowHeight}" as="geometry">
            <mxRectangle width="38" height="${rowHeight}" as="alternateBounds" />
          </mxGeometry>
        </mxCell>
        <mxCell id="${tableId}_c_h2" value="ATRIBUT" style="shape=partialRectangle;connectable=0;fillColor=none;top=0;left=0;bottom=1;right=0;fontStyle=1;overflow=hidden;align=left;verticalAlign=middle;spacingLeft=6;html=1;whiteSpace=wrap;fontColor=#323130;fontSize=9;fontFamily=Segoe UI,Helvetica;strokeColor=#D2D0CE;" vertex="1" parent="${headRowId}">
          <mxGeometry x="38" width="142" height="${rowHeight}" as="geometry">
            <mxRectangle width="142" height="${rowHeight}" as="alternateBounds" />
          </mxGeometry>
        </mxCell>
        <mxCell id="${tableId}_c_h3" value="TIPE &amp; KETERANGAN" style="shape=partialRectangle;connectable=0;fillColor=none;top=0;left=0;bottom=1;right=0;fontStyle=1;overflow=hidden;align=left;verticalAlign=middle;spacingLeft=6;html=1;whiteSpace=wrap;fontColor=#323130;fontSize=9;fontFamily=Segoe UI,Helvetica;strokeColor=#D2D0CE;" vertex="1" parent="${headRowId}">
          <mxGeometry x="180" width="${ent.width - 180}" height="${rowHeight}" as="geometry">
            <mxRectangle width="${ent.width - 180}" height="${rowHeight}" as="alternateBounds" />
          </mxGeometry>
        </mxCell>`;

    // 3. Field Rows
    ent.fields.forEach((f, idx) => {
      cellCounter++;
      const rowId = `${tableId}_r_${idx}`;
      const rowY = headerHeight + (idx + 1) * rowHeight;
      const isAlt = idx % 2 === 1;
      const rowBg = isAlt ? "#FAFAFA" : "#FFFFFF";

      const keyColor = f.key === "PK" ? "#C00000" : f.key === "FK" ? "#0078D4" : f.key === "UK" ? "#B45309" : "#888888";
      const keyVal = f.key ? `&lt;b style=&quot;color: ${keyColor};&quot;&gt;${f.key}&lt;/b&gt;` : "";
      const nameVal = `&lt;span style=&quot;font-size: 11px; font-weight: ${f.key ? "bold" : "normal"}; color: #201F1E;&quot;&gt;${escapeXml(f.name)}&lt;/span&gt;`;
      const typeVal = `&lt;span style=&quot;font-size: 10px; color: #555;&quot;&gt;${escapeXml(f.type)}&lt;/span&gt; &lt;span style=&quot;color: #888; font-size: 9px;&quot;&gt;(${escapeXml(f.note)})&lt;/span&gt;`;

      xml += `
        <mxCell id="${rowId}" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;top=0;left=0;bottom=0;right=0;collapsible=0;dropTarget=0;fillColor=${rowBg};points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;" vertex="1" parent="${tableId}">
          <mxGeometry y="${rowY}" width="${ent.width}" height="${rowHeight}" as="geometry" />
        </mxCell>
        <mxCell id="${rowId}_k" value="${keyVal}" style="shape=partialRectangle;connectable=0;fillColor=none;top=0;left=0;bottom=1;right=0;fontStyle=1;overflow=hidden;align=center;verticalAlign=middle;html=1;whiteSpace=wrap;fontFamily=monospace;fontSize=9;strokeColor=#EDEBE9;" vertex="1" parent="${rowId}">
          <mxGeometry width="38" height="${rowHeight}" as="geometry">
            <mxRectangle width="38" height="${rowHeight}" as="alternateBounds" />
          </mxGeometry>
        </mxCell>
        <mxCell id="${rowId}_n" value="${nameVal}" style="shape=partialRectangle;connectable=0;fillColor=none;top=0;left=0;bottom=1;right=0;fontStyle=0;overflow=hidden;align=left;verticalAlign=middle;spacingLeft=6;html=1;whiteSpace=wrap;fontFamily=Segoe UI,Helvetica;strokeColor=#EDEBE9;" vertex="1" parent="${rowId}">
          <mxGeometry x="38" width="142" height="${rowHeight}" as="geometry">
            <mxRectangle width="142" height="${rowHeight}" as="alternateBounds" />
          </mxGeometry>
        </mxCell>
        <mxCell id="${rowId}_t" value="${typeVal}" style="shape=partialRectangle;connectable=0;fillColor=none;top=0;left=0;bottom=1;right=0;fontStyle=0;overflow=hidden;align=left;verticalAlign=middle;spacingLeft=6;html=1;whiteSpace=wrap;fontFamily=Segoe UI,Helvetica;strokeColor=#EDEBE9;" vertex="1" parent="${rowId}">
          <mxGeometry x="180" width="${ent.width - 180}" height="${rowHeight}" as="geometry">
            <mxRectangle width="${ent.width - 180}" height="${rowHeight}" as="alternateBounds" />
          </mxGeometry>
        </mxCell>`;
    });
  }

  // Render Clean Relationships
  for (const rel of relationships) {
    cellCounter++;
    xml += `
        <!-- Edge: ${rel.id} -->
        <mxCell id="${rel.id}" value="&lt;b style=&quot;font-size: 10px; color: #141E19;&quot;&gt;${escapeXml(rel.label)}&lt;/b&gt;" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;exitX=${rel.exitX};exitY=${rel.exitY};exitDx=0;exitDy=0;entryX=${rel.entryX};entryY=${rel.entryY};entryDx=0;entryDy=0;startArrow=${rel.startArrow};startFill=0;endArrow=${rel.endArrow};endFill=0;strokeColor=#201F1E;strokeWidth=1.8;fontFamily=Segoe UI,Helvetica;fontSize=10;labelBackgroundColor=#FFFFFF;labelBorderColor=#8A8886;" edge="1" parent="1" source="${rel.source}" target="${rel.target}">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>`;
  }

  xml += `
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;
  return xml;
}

function generateSqlDdl() {
  return `-- ============================================================
-- SQL DDL SCHEMA — SMART PEMIRA POLTEK CWE (Importable to Draw.io)
-- Gunakan menu: Arrange -> Insert -> Advanced -> SQL... di draw.io
-- ============================================================

CREATE TABLE StudyProgram (
    id VARCHAR(10) PRIMARY KEY, -- TPTP, TPHP, MANLOG, BD, TRPL
    name VARCHAR(100) NOT NULL,
    facultyName VARCHAR(100) NOT NULL,
    colorPrimary VARCHAR(10) NOT NULL,
    colorTint VARCHAR(10) NOT NULL
);

CREATE TABLE Tps (
    id VARCHAR(10) PRIMARY KEY, -- TPTP, TPHP, MANLOG, BD, TRPL
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    chainSalt VARCHAR(64) UNIQUE NOT NULL,
    lastChainHash VARCHAR(64) DEFAULT ''
);

CREATE TABLE Voter (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4
    nim VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    angkatan INTEGER NOT NULL,
    studyProgramId VARCHAR(10) NOT NULL REFERENCES StudyProgram(id),
    tpsId VARCHAR(10) NOT NULL REFERENCES Tps(id),
    status VARCHAR(20) DEFAULT 'BELUM_MEMILIH',
    hasVoted BOOLEAN DEFAULT FALSE,
    votedAt TIMESTAMP NULL,
    pendingTokenHash VARCHAR(64) NULL, -- 1:0..1 Transien
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE VotingToken (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4
    tokenHash VARCHAR(64) UNIQUE NOT NULL,
    tpsId VARCHAR(10) NOT NULL REFERENCES Tps(id),
    studyProgramId VARCHAR(10) NOT NULL REFERENCES StudyProgram(id),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    issuedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiresAt TIMESTAMP NOT NULL, -- TTL 10 Menit
    usedAt TIMESTAMP NULL,
    lockedAt TIMESTAMP NULL, -- Kunci Suaraku
    revoteCount INTEGER DEFAULT 0
);

CREATE TABLE Candidate (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4
    category VARCHAR(20) NOT NULL, -- PRESMA, DPM, HIMA
    studyProgramId VARCHAR(10) NULL REFERENCES StudyProgram(id),
    number INTEGER NOT NULL,
    presidentName VARCHAR(100) NOT NULL,
    viceName VARCHAR(100) NULL,
    secondViceName VARCHAR(100) NULL,
    photoLeaderUrl TEXT NULL,
    photoViceUrl TEXT NULL,
    photoSecondViceUrl TEXT NULL,
    vision TEXT NOT NULL,
    missionJson TEXT NOT NULL,
    photoAccent VARCHAR(10) NOT NULL,
    isEmptyBox BOOLEAN DEFAULT FALSE
);

CREATE TABLE CandidatePhoto (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4
    candidateId VARCHAR(36) NOT NULL REFERENCES Candidate(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- leader, vice, secondVice
    mimeType VARCHAR(50) DEFAULT 'image/webp',
    data BLOB NOT NULL, -- Berkas Biner Gambar Terkompresi WebP
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT UQ_CandidatePhoto_role UNIQUE (candidateId, role)
);

CREATE TABLE BallotBox (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4 Acak Murni
    category VARCHAR(20) NOT NULL, -- PRESMA, DPM, HIMA
    candidateId VARCHAR(36) NULL REFERENCES Candidate(id), -- NULL jika Kotak Kosong
    isEmptyBox BOOLEAN DEFAULT FALSE,
    tpsId VARCHAR(10) NOT NULL REFERENCES Tps(id),
    tokenId VARCHAR(36) NULL REFERENCES VotingToken(id),
    voteVersion INTEGER DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ballotHash VARCHAR(64) NOT NULL
);

CREATE TABLE Operator (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4
    username VARCHAR(50) UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL, -- KPUM, PPUR, PANWASLU, SAKSI, ITPO
    fullName VARCHAR(100) NOT NULL,
    tpsId VARCHAR(10) NULL REFERENCES Tps(id),
    isActive BOOLEAN DEFAULT TRUE,
    mustChangePassword BOOLEAN DEFAULT FALSE,
    totpSecret TEXT NULL,
    totpEnabledAt TIMESTAMP NULL,
    backupCodesJson TEXT NULL,
    lastLoginAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE AuditLog (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4
    event VARCHAR(50) NOT NULL,
    detail TEXT NOT NULL,
    tpsId VARCHAR(10) NULL REFERENCES Tps(id),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ElectionIncident (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4
    ticketNumber VARCHAR(30) UNIQUE NOT NULL,
    reporterName VARCHAR(100) NOT NULL,
    reporterNim VARCHAR(20) NOT NULL,
    incidentType VARCHAR(50) NOT NULL,
    location VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'SUBMITTED',
    verdict TEXT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ElectionSetting (
    id VARCHAR(20) PRIMARY KEY, -- 'main'
    votingOpen BOOLEAN DEFAULT TRUE,
    emergencyFreeze BOOLEAN DEFAULT FALSE,
    plenoUnlocked BOOLEAN DEFAULT FALSE,
    plenoUnlockedAt TIMESTAMP NULL,
    sessionSecret TEXT NOT NULL,
    baSignatureEd25519 TEXT NULL,
    baSignedAt TIMESTAMP NULL,
    baSignaturesJson TEXT NULL,
    periodLabel VARCHAR(100) NOT NULL,
    periodStartedAt TIMESTAMP NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ElectionArchive (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4
    archiveCode VARCHAR(30) UNIQUE NOT NULL,
    periodLabel VARCHAR(100) NOT NULL,
    mode VARCHAR(20) NOT NULL,
    sealedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sealedBy VARCHAR(50) NOT NULL,
    note TEXT NOT NULL,
    summaryJson TEXT NOT NULL,
    canonical TEXT NOT NULL,
    signature VARCHAR(64) NOT NULL,
    signatureEd25519 TEXT NULL,
    chainHeadsJson TEXT NOT NULL,
    dptCount INTEGER NOT NULL,
    votedCount INTEGER NOT NULL,
    ballotCount INTEGER NOT NULL
);
`;
}

function run() {
  mkdirSync(OUT_DIR, { recursive: true });

  // 1. Generate draw.io file with table shape
  const xmlContent = generateDrawioXml();
  writeFileSync(OUT_FILE, xmlContent, "utf-8");
  console.log(`✅ File draw.io (shape=table) berhasil dibuat: ${OUT_FILE}`);

  // 2. Generate SQL DDL for Draw.io SQL Import
  const sqlContent = generateSqlDdl();
  writeFileSync(SQL_FILE, sqlContent, "utf-8");
  console.log(`✅ File SQL DDL (schema_erd.sql) berhasil dibuat: ${SQL_FILE}`);
}

run();
