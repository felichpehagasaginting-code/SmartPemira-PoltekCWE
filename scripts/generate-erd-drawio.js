// ============================================================
// GENERATOR FILE DRAW.IO (.drawio) — ERD SMART PEMIRA POLTEK CWE
// Menghasilkan diagram basis data berformat draw.io XML lengkap dengan:
// - 11 Entitas dengan atribut PK, FK, UK, dan tipe data
// - Notasi Kardinalitas Crow's Foot: 1:N, N:1, 1:1, M:N (via Junction Table)
// - Garis Pemisah Zero-Knowledge (0:0 Air-Gapped Barrier)
// - Penataan Layout Visual Rapi & Color-Coded Domains
// ============================================================
const { writeFileSync, mkdirSync } = require("fs");
const path = require("path");

const OUT_DIR = path.resolve(__dirname, "../Dokumentasi/04_ENTITY_RELATIONSHIP_DIAGRAM_ERD");
const OUT_FILE = path.join(OUT_DIR, "ERD_SMART_PEMIRA_POLTEK_CWE.drawio");

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const entities = [
  // ==================== DOMAIN 1: MASTER PRODI & TPS ====================
  {
    id: "e_study_program",
    name: "StudyProgram",
    domain: "Master Akademik",
    x: 60,
    y: 90,
    width: 290,
    headerColor: "#E2F0D9",
    headerFontColor: "#276A3C",
    borderColor: "#385723",
    fields: [
      { name: "id", type: "String", tag: "PK", note: "TPTP, TPHP, MANLOG, BD, TRPL" },
      { name: "name", type: "String", note: "Nama Program Studi Resmi" },
      { name: "facultyName", type: "String", note: "Fakultas / Jurusan" },
      { name: "colorPrimary", type: "String", note: "Warna Aksen Primer (Hex)" },
      { name: "colorTint", type: "String", note: "Warna Background Tint (Hex)" },
    ],
  },
  {
    id: "e_tps",
    name: "Tps (Virtual Online)",
    domain: "TPS Virtual & Rantai Hash",
    x: 450,
    y: 90,
    width: 320,
    headerColor: "#E2F0D9",
    headerFontColor: "#276A3C",
    borderColor: "#385723",
    fields: [
      { name: "id", type: "String", tag: "PK", note: "Kode Prodi (TPTP, TPHP, dst)" },
      { name: "name", type: "String", note: "TPS Online - <Nama Prodi>" },
      { name: "location", type: "String", note: "Keterangan Pemira Online" },
      { name: "chainSalt", type: "String", tag: "UK", note: "Salt Kriptografis Rantai" },
      { name: "lastChainHash", type: "String", note: "Head Hash SHA-256 Terkini" },
    ],
  },

  // ==================== DOMAIN 2: PEMILIH (DPT) ====================
  {
    id: "e_voter",
    name: "Voter (DPT Mahasiswa)",
    domain: "Identitas Pemilih",
    x: 60,
    y: 350,
    width: 330,
    headerColor: "#D9E1F2",
    headerFontColor: "#1F4E79",
    borderColor: "#203764",
    fields: [
      { name: "id", type: "String", tag: "PK", note: "UUIDv4" },
      { name: "nim", type: "String", tag: "UK", note: "Nomor Induk Mahasiswa BAAK" },
      { name: "name", type: "String", note: "Nama Lengkap Mahasiswa" },
      { name: "angkatan", type: "Int", note: "Tahun Masuk (2023-2026)" },
      { name: "studyProgramId", type: "String", tag: "FK", note: "FK ke StudyProgram.id (1:N)" },
      { name: "tpsId", type: "String", tag: "FK", note: "FK ke Tps.id (1:N)" },
      { name: "status", type: "String", note: "BELUM_MEMILIH | DALAM_ANTREAN | SUDAH_MEMILIH" },
      { name: "hasVoted", type: "Boolean", note: "Status Penggunaan Hak Pilih" },
      { name: "votedAt", type: "DateTime", note: "Waktu Check-in PPUR Selesai" },
      { name: "pendingTokenHash", type: "String", note: "1:1 Transien Token (Dihapus saat Vote)" },
      { name: "createdAt", type: "DateTime", note: "Waktu Rekam DPT" },
    ],
  },

  // ==================== DOMAIN 3: TOKEN BILIK SUARA ====================
  {
    id: "e_voting_token",
    name: "VotingToken (Tiket Masuk Bilik)",
    domain: "Kredensial Anonim Ephemeral",
    x: 450,
    y: 350,
    width: 330,
    headerColor: "#FFF2CC",
    headerFontColor: "#7F6000",
    borderColor: "#B28900",
    fields: [
      { name: "id", type: "String", tag: "PK", note: "UUIDv4" },
      { name: "tokenHash", type: "String", tag: "UK", note: "SHA-256 dari Token Plaintext 6 Karakter" },
      { name: "tpsId", type: "String", tag: "FK", note: "FK ke Tps.id (1:N)" },
      { name: "studyProgramId", type: "String", tag: "FK", note: "FK ke StudyProgram.id (1:N)" },
      { name: "status", type: "String", note: "ACTIVE | USED | EXPIRED | REVOKED" },
      { name: "issuedAt", type: "DateTime", note: "Waktu Terbit di Meja PPUR" },
      { name: "expiresAt", type: "DateTime", note: "Batas Masuk Bilik Pertama (TTL 10m)" },
      { name: "usedAt", type: "DateTime", note: "Waktu Pertama Buka Bilik" },
      { name: "lockedAt", type: "DateTime", note: "Kunci Suaraku (Finalisasi Mandiri)" },
      { name: "revoteCount", type: "Int", note: "Jumlah Pergantian Suara (0 = Pertama)" },
    ],
  },

  // ==================== DOMAIN 4: KOTAK SUARA & KANDIDAT ====================
  {
    id: "e_ballot_box",
    name: "BallotBox (Kotak Suara Anonim)",
    domain: "Junction Table & Rantai Suara",
    x: 900,
    y: 260,
    width: 350,
    headerColor: "#FCE4D6",
    headerFontColor: "#833C0C",
    borderColor: "#C65911",
    fields: [
      { name: "id", type: "String", tag: "PK", note: "UUIDv4 Acak Murni" },
      { name: "category", type: "String", note: "PRESMA | DPM | HIMA" },
      { name: "candidateId", type: "String", tag: "FK", note: "FK ke Candidate.id (NULL = Kotak Kosong)" },
      { name: "isEmptyBox", type: "Boolean", note: "Pilihan Sah Suara Kotak Kosong" },
      { name: "tpsId", type: "String", tag: "FK", note: "FK ke Tps.id (1:N Rantai Hash)" },
      { name: "tokenId", type: "String", tag: "FK", note: "FK ke VotingToken.id (1:N Sesi Suara)" },
      { name: "voteVersion", type: "Int", note: "Versi Suara: 1=Asli, 2+=Re-vote Estonia" },
      { name: "createdAt", type: "DateTime", note: "Timestamp dengan Random Jitter" },
      { name: "ballotHash", type: "String", note: "SHA-256 Rantai Integritas" },
    ],
  },
  {
    id: "e_candidate",
    name: "Candidate (Paslon & Calon Tunggal)",
    domain: "Master Data Peserta Pemira",
    x: 900,
    y: 620,
    width: 350,
    headerColor: "#FCE4D6",
    headerFontColor: "#833C0C",
    borderColor: "#C65911",
    fields: [
      { name: "id", type: "String", tag: "PK", note: "UUIDv4" },
      { name: "category", type: "String", note: "PRESMA | DPM | HIMA" },
      { name: "studyProgramId", type: "String", tag: "FK", note: "FK ke StudyProgram.id (Khusus HIMA)" },
      { name: "number", type: "Int", note: "Nomor Urut Paslon" },
      { name: "presidentName", type: "String", note: "Presma / Ketum DPM / Ketua Hima" },
      { name: "viceName", type: "String", note: "Wapresma / Ketua 1 / Wakil Hima" },
      { name: "secondViceName", type: "String", note: "Khusus DPM: Ketua 2" },
      { name: "photoLeaderUrl", type: "String", note: "URL Foto Pemimpin Utama" },
      { name: "photoViceUrl", type: "String", note: "URL Foto Wakil" },
      { name: "photoSecondViceUrl", type: "String", note: "URL Foto Wakil 2 (DPM)" },
      { name: "vision", type: "String", note: "Pernyataan Visi" },
      { name: "missionJson", type: "String", note: "JSON Array Misi" },
      { name: "photoAccent", type: "String", note: "Warna Hex Kartu Paslon" },
      { name: "isEmptyBox", type: "Boolean", note: "Opsi Bawaan Kotak Kosong" },
    ],
  },

  // ==================== DOMAIN 5: AUDIT & PENGAWASAN ====================
  {
    id: "e_audit_log",
    name: "AuditLog (Jejak Forensik)",
    domain: "Audit Immutable Append-Only",
    x: 450,
    y: 730,
    width: 330,
    headerColor: "#F2F2F2",
    headerFontColor: "#333333",
    borderColor: "#595959",
    fields: [
      { name: "id", type: "String", tag: "PK", note: "UUIDv4" },
      { name: "event", type: "String", note: "TOKEN_ISSUED, BALLOT_SUBMITTED, dll" },
      { name: "detail", type: "String", note: "Deskripsi Tanpa Pilihan Suara" },
      { name: "tpsId", type: "String", tag: "FK", note: "ID TPS Terkait (Opsional)" },
      { name: "createdAt", type: "DateTime", note: "Waktu Presisi Server" },
    ],
  },
  {
    id: "e_incident",
    name: "ElectionIncident (Sengketa Panwaslu)",
    domain: "Laporan Pelanggaran",
    x: 60,
    y: 730,
    width: 330,
    headerColor: "#F2F2F2",
    headerFontColor: "#333333",
    borderColor: "#595959",
    fields: [
      { name: "id", type: "String", tag: "PK", note: "UUIDv4" },
      { name: "ticketNumber", type: "String", tag: "UK", note: "INC-2026-XXXX" },
      { name: "reporterName", type: "String", note: "Nama Lengkap Pelapor" },
      { name: "reporterNim", type: "String", note: "NIM Pelapor Terverifikasi" },
      { name: "incidentType", type: "String", note: "KECURANGAN, MALFUNGSI, KAMPANYE" },
      { name: "location", type: "String", note: "Lokasi Fisik / Digital" },
      { name: "description", type: "String", note: "Fakta Kronologis" },
      { name: "status", type: "String", note: "SUBMITTED | IN_REVIEW | RESOLVED" },
      { name: "verdict", type: "String", note: "Amar Putusan Panwaslu / DKPPR" },
      { name: "createdAt", type: "DateTime", note: "Waktu Laporan Masuk" },
    ],
  },

  // ==================== DOMAIN 6: TATA KELOLA & ARSIP ====================
  {
    id: "e_operator",
    name: "Operator (Petugas RBAC)",
    domain: "Otentikasi & 2FA TOTP",
    x: 1340,
    y: 90,
    width: 350,
    headerColor: "#E7E6E6",
    headerFontColor: "#3B3838",
    borderColor: "#7B7B7B",
    fields: [
      { name: "id", type: "String", tag: "PK", note: "UUIDv4" },
      { name: "username", type: "String", tag: "UK", note: "ID Login Petugas" },
      { name: "passwordHash", type: "String", note: "scrypt Salted Password Hash" },
      { name: "role", type: "String", note: "KPUM | PPUR | PANWASLU | SAKSI | ITPO" },
      { name: "fullName", type: "String", note: "Nama Lengkap Petugas" },
      { name: "tpsId", type: "String", tag: "FK", note: "TPS Khusus Petugas PPUR (Nullable)" },
      { name: "isActive", type: "Boolean", note: "Status Akun Aktif" },
      { name: "mustChangePassword", type: "Boolean", note: "Wajib Ganti Sandi Awal" },
      { name: "totpSecret", type: "String", note: "Secret TOTP Terenkripsi AES-GCM" },
      { name: "totpEnabledAt", type: "DateTime", note: "Waktu Pengaktifan 2FA" },
      { name: "backupCodesJson", type: "String", note: "Hash Kode Cadangan Darurat" },
      { name: "lastLoginAt", type: "DateTime", note: "Login Terakhir" },
      { name: "createdAt", type: "DateTime", note: "Waktu Didaftarkan" },
    ],
  },
  {
    id: "e_setting",
    name: "ElectionSetting (Vault Gate)",
    domain: "1:1 Singleton State",
    x: 1340,
    y: 500,
    width: 350,
    headerColor: "#D0CECE",
    headerFontColor: "#3B3838",
    borderColor: "#7B7B7B",
    fields: [
      { name: "id", type: "String", tag: "PK", note: "Singleton 'main'" },
      { name: "votingOpen", type: "Boolean", note: "Gerbang Pemungutan Suara" },
      { name: "emergencyFreeze", type: "Boolean", note: "Hak Veto Darurat Panwaslu" },
      { name: "plenoUnlocked", type: "Boolean", note: "Hukum 5: Pleno Vault Lock" },
      { name: "plenoUnlockedAt", type: "DateTime", note: "Waktu Sidang Pleno Buka Hasil" },
      { name: "sessionSecret", type: "String", note: "HMAC Secret Sesi Operator" },
      { name: "baSignatureEd25519", type: "String", note: "Tanda Tangan Asimetris Ed25519" },
      { name: "baSignedAt", type: "DateTime", note: "Waktu Pengesahan Pleno" },
      { name: "baSignaturesJson", type: "String", note: "Multi-Signature Ed25519" },
      { name: "periodLabel", type: "String", note: "Label Periode Aktif" },
      { name: "periodStartedAt", type: "DateTime", note: "Waktu Buka Periode" },
      { name: "updatedAt", type: "DateTime", note: "Waktu Update" },
    ],
  },
  {
    id: "e_archive",
    name: "ElectionArchive (Kapsul Segel)",
    domain: "Arsip Historis Periode",
    x: 1340,
    y: 840,
    width: 350,
    headerColor: "#D0CECE",
    headerFontColor: "#3B3838",
    borderColor: "#7B7B7B",
    fields: [
      { name: "id", type: "String", tag: "PK", note: "UUIDv4" },
      { name: "archiveCode", type: "String", tag: "UK", note: "ARS-2026-XXXX" },
      { name: "periodLabel", type: "String", note: "Label Periode Disegel" },
      { name: "mode", type: "String", note: "DEMO | NEW_PERIOD" },
      { name: "sealedAt", type: "DateTime", note: "Waktu Segel Permanen" },
      { name: "sealedBy", type: "String", note: "Username ITPO Penyegel" },
      { name: "note", type: "String", note: "Catatan BA Penutupan" },
      { name: "summaryJson", type: "String", note: "Rekap Perolehan Suara" },
      { name: "canonical", type: "String", note: "Teks Kanonikal BA C-KWE" },
      { name: "signature", type: "String", note: "SHA-256 Digest Kanonikal" },
      { name: "signatureEd25519", type: "String", note: "Digital Signature Ed25519" },
      { name: "chainHeadsJson", type: "String", note: "Snapshot 5 Head Hash" },
      { name: "dptCount", type: "Int", note: "Total DPT" },
      { name: "votedCount", type: "Int", note: "Total Pengguna Hak" },
      { name: "ballotCount", type: "Int", note: "Total Suara Sah" },
    ],
  },
];

const relationships = [
  // 1:N StudyProgram -> Voter
  {
    id: "rel_prodi_voter",
    source: "e_study_program",
    target: "e_voter",
    label: "1 : N (One to Many)\nmemiliki anggota pemilih",
    cardinality: "1:N",
    startArrow: "ERmandOne",
    endArrow: "ERmandMany",
  },
  // 1:N StudyProgram -> Candidate (khusus HIMA)
  {
    id: "rel_prodi_candidate",
    source: "e_study_program",
    target: "e_candidate",
    label: "1 : N (One to Many, Optional)\nmenaungi kandidat Hima",
    cardinality: "1:N",
    startArrow: "ERmandOne",
    endArrow: "ERzeroToMany",
  },
  // 1:N StudyProgram -> VotingToken
  {
    id: "rel_prodi_token",
    source: "e_study_program",
    target: "e_voting_token",
    label: "1 : N (One to Many)\nmenentukan filter surat suara",
    cardinality: "1:N",
    startArrow: "ERmandOne",
    endArrow: "ERmandMany",
  },
  // 1:N Tps -> Voter
  {
    id: "rel_tps_voter",
    source: "e_tps",
    target: "e_voter",
    label: "1 : N (One to Many)\nmenampung antrean DPT",
    cardinality: "1:N",
    startArrow: "ERmandOne",
    endArrow: "ERmandMany",
  },
  // 1:N Tps -> VotingToken
  {
    id: "rel_tps_token",
    source: "e_tps",
    target: "e_voting_token",
    label: "1 : N (One to Many)\nmenerbitkan token bilik",
    cardinality: "1:N",
    startArrow: "ERmandOne",
    endArrow: "ERmandMany",
  },
  // 1:N Tps -> BallotBox
  {
    id: "rel_tps_ballot",
    source: "e_tps",
    target: "e_ballot_box",
    label: "1 : N (One to Many)\nmemelihara rantai hash prodi",
    cardinality: "1:N",
    startArrow: "ERmandOne",
    endArrow: "ERmandMany",
  },
  // 1:N Tps -> Operator (PPUR)
  {
    id: "rel_tps_operator",
    source: "e_tps",
    target: "e_operator",
    label: "1 : N (One to Many, Optional)\npenugasan operator PPUR",
    cardinality: "1:N",
    startArrow: "ERmandOne",
    endArrow: "ERzeroToMany",
  },
  // 1:N Tps -> AuditLog
  {
    id: "rel_tps_audit",
    source: "e_tps",
    target: "e_audit_log",
    label: "1 : N (One to Many, Optional)\nlokasi audit kejadian",
    cardinality: "1:N",
    startArrow: "ERmandOne",
    endArrow: "ERzeroToMany",
  },
  // 1:N VotingToken -> BallotBox (3 surat suara per revisi)
  {
    id: "rel_token_ballot",
    source: "e_voting_token",
    target: "e_ballot_box",
    label: "1 : N (One to Many)\nmengotorisasi surat suara (3/versi)",
    cardinality: "1:N",
    startArrow: "ERmandOne",
    endArrow: "ERmandMany",
  },
  // 1:N Candidate -> BallotBox (pilihan suara)
  {
    id: "rel_candidate_ballot",
    source: "e_candidate",
    target: "e_ballot_box",
    label: "1 : N (One to Many, Optional)\nmenerima coblosan pemilih",
    cardinality: "1:N",
    startArrow: "ERmandOne",
    endArrow: "ERzeroToMany",
  },
];

function generateDrawioXml() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2026-11-20T02:40:00.000Z" agent="SmartPemira-ERD-Generator" version="24.0.0" type="device">
  <diagram id="smart-pemira-erd" name="ERD Smart Pemira Zero-Knowledge">
    <mxGraphModel dx="1800" dy="1200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1800" pageHeight="1300" background="#FAFAF8" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- ==================== JUDUL & HEADER DIAGRAM ==================== -->
        <mxCell id="title_banner" value="&lt;b style=&quot;font-size: 20px;&quot;&gt;ENTITY RELATIONSHIP DIAGRAM (ERD) — SMART PEMIRA POLTEK CWE&lt;/b&gt;&lt;br&gt;&lt;span style=&quot;font-size: 13px; color: #4A5851;&quot;&gt;Arsitektur Basis Data Zero-Knowledge Ballot, 5 Rantai Hash TPS Virtual, &amp;amp; Model Re-vote Estonia (Versi 1.1 Produksi)&lt;/span&gt;" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=1;fillColor=#FFFFFF;strokeColor=#141E19;strokeWidth=2;shadow=1;fontFamily=Helvetica;" vertex="1" parent="1">
          <mxGeometry x="60" y="15" width="1630" height="48" as="geometry" />
        </mxCell>

        <!-- ==================== ZERO-KNOWLEDGE AIR-GAP BARRIER ==================== -->
        <mxCell id="zk_barrier_box" value="&lt;b style=&quot;font-size: 14px; color: #C00000;&quot;&gt;⛔ ZERO-KNOWLEDGE AIR-GAP BARRIER (HUKUM 1 ARSITEKTUR DATA)&lt;/b&gt;&lt;br&gt;&lt;span style=&quot;font-size: 11px; color: #660000;&quot;&gt;Relasi Langsung antara [Voter] dan [BallotBox / Candidate] DILARANG KERAS (Kardinalitas 0 : 0).&lt;br&gt;Database tidak menyimpan relasi voter_id atau nim di dalam kotak suara demi jaminan kerahasiaan konstitusional mutlak.&lt;/span&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FCE4D6;strokeColor=#C00000;strokeWidth=2;dashed=1;dashPattern=6 4;align=center;verticalAlign=top;spacingTop=8;fontFamily=Helvetica;" vertex="1" parent="1">
          <mxGeometry x="410" y="270" width="450" height="50" as="geometry" />
        </mxCell>

        <!-- ==================== KOTAK KETERANGAN RELASI M:N VIA JUNCTION ==================== -->
        <mxCell id="mn_junction_box" value="&lt;b style=&quot;font-size: 12px; color: #833C0C;&quot;&gt;ℹ️ RELASI MANY-TO-MANY (M : N) TERDEKOMPOSISI&lt;/b&gt;&lt;br&gt;&lt;span style=&quot;font-size: 10px; color: #595959;&quot;&gt;Relasi konseptual M:N antara &lt;b&gt;VotingToken&lt;/b&gt; dan &lt;b&gt;Candidate&lt;/b&gt; dipecah menjadi dua relasi 1:N melalui tabel perantara &lt;b&gt;BallotBox&lt;/b&gt;.&lt;br&gt;Satu token mencoblos 3 kandidat (DPM, BEM, HIMA). Satu kandidat dicoblos oleh ratusan token.&lt;/span&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FFF2CC;strokeColor=#B28900;strokeWidth=1;align=center;verticalAlign=middle;fontFamily=Helvetica;" vertex="1" parent="1">
          <mxGeometry x="900" y="90" width="350" height="60" as="geometry" />
        </mxCell>
`;

  // Render Entities
  let currentId = 100;
  for (const ent of entities) {
    const tableId = ent.id;
    const headerHeight = 34;
    const rowHeight = 22;
    const totalHeight = headerHeight + ent.fields.length * rowHeight + 8;

    // Header table/swimlane
    xml += `
        <!-- Entitas: ${ent.name} -->
        <mxCell id="${tableId}" value="&lt;b&gt;${escapeXml(ent.name)}&lt;/b&gt;&lt;br&gt;&lt;span style=&quot;font-size: 10px; font-weight: normal;&quot;&gt;${escapeXml(ent.domain)}&lt;/span&gt;" style="swimlane;fontStyle=0;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=${headerHeight};horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=0;marginBottom=0;html=1;whiteSpace=wrap;fillColor=${ent.headerColor};strokeColor=${ent.borderColor};strokeWidth=2;fontColor=${ent.headerFontColor};fontFamily=Helvetica;fontSize=12;shadow=1;" vertex="1" parent="1">
          <mxGeometry x="${ent.x}" y="${ent.y}" width="${ent.width}" height="${totalHeight}" as="geometry" />
        </mxCell>`;

    // Field rows
    ent.fields.forEach((f, idx) => {
      currentId++;
      const tagPrefix = f.tag ? `&lt;b style=&quot;color: ${f.tag.includes("PK") ? "#C00000" : f.tag.includes("FK") ? "#002060" : "#7F6000"}; font-family: monospace;&quot;&gt;${f.tag}&lt;/b&gt; ` : "&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;";
      const noteSuffix = f.note ? ` &lt;span style=&quot;color: #7A8881; font-size: 9px;&quot;&gt;/* ${escapeXml(f.note)} */&lt;/span&gt;` : "";
      const rowVal = `${tagPrefix}&lt;span style=&quot;font-size: 11px;&quot;&gt;${escapeXml(f.name)}&lt;/span&gt; : &lt;span style=&quot;color: #555;&quot;&gt;${escapeXml(f.type)}&lt;/span&gt;${noteSuffix}`;
      const rowY = headerHeight + idx * rowHeight;

      xml += `
        <mxCell id="${tableId}_f_${currentId}" value="${rowVal}" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=8;spacingRight=6;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;whiteSpace=wrap;html=1;fontFamily=Helvetica;fontSize=10;" vertex="1" parent="${tableId}">
          <mxGeometry y="${rowY}" width="${ent.width}" height="${rowHeight}" as="geometry" />
        </mxCell>`;
    });
  }

  // Render Connectors with Crow's Foot & Explicit Cardinalities
  for (const rel of relationships) {
    currentId++;
    xml += `
        <!-- Relasi: ${rel.id} (${rel.cardinality}) -->
        <mxCell id="${rel.id}" value="&lt;b style=&quot;font-size: 11px;&quot;&gt;${escapeXml(rel.label)}&lt;/b&gt;" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;startArrow=${rel.startArrow};startFill=0;endArrow=${rel.endArrow};endFill=0;strokeColor=#141E19;strokeWidth=2;fontFamily=Helvetica;fontSize=10;labelBackgroundColor=#FFFFFF;labelBorderColor=#141E19;" edge="1" parent="1" source="${rel.source}" target="${rel.target}">
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

function run() {
  mkdirSync(OUT_DIR, { recursive: true });
  const xmlContent = generateDrawioXml();
  writeFileSync(OUT_FILE, xmlContent, "utf-8");
  console.log(`✅ File draw.io berhasil dibuat: ${OUT_FILE}`);
}

run();
