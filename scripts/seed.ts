// ============================================================
// SEED SCRIPT — Smart Pemira Poltek CWE
// Data awal: prodi, TPS, kandidat, DPT, & suara demo berantai hash.
// Jalankan: bun run scripts/seed.ts
// ============================================================
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes, randomUUID, scryptSync } from "crypto";

const db = new PrismaClient();

// --- helpers (mirror lib crypto agar script mandiri) ---
const jitter = (base: Date, maxMs = 60_000) =>
  new Date(base.getTime() + Math.floor(Math.random() * (2 * maxMs + 1)) - maxMs);

function computeBallotHash(
  prev: string,
  id: string,
  category: string,
  candidateId: string | null,
  isEmptyBox: boolean,
  ts: Date,
  salt: string
) {
  return createHash("sha256")
    .update(
      [prev, id, category, candidateId ?? "NULL", isEmptyBox ? "EMPTY_BOX" : "CANDIDATE", ts.toISOString(), salt].join("||")
    )
    .digest("hex");
}

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const FIRST_NAMES = ["Ahmad", "Siti", "Budi", "Dewi", "Rizki", "Putri", "Agus", "Wulan", "Fajar", "Intan", "Bayu", "Citra", "Dimas", "Eka", "Farhan", "Gita", "Hendra", "Indah", "Joko", "Kirana", "Lukman", "Maya", "Nanda", "Oktavia", "Panji", "Rahma", "Surya", "Tiara", "Umar", "Vina", "Wahyu", "Yulia", "Zaki", "Nabila", "Rangga", "Sinta"];
const LAST_NAMES = ["Saputra", "Maharani", "Wijaya", "Lestari", "Pratama", "Anggraini", "Santoso", "Puspita", "Ramadhan", "Hutapea", "Simanjuntak", "Halim", "Nugraha", "Kusuma", "Sabrina", "Tanjung", "Firdaus", "Azzahra", "Gunawan", "Prasetyo"];

const PRODI_CODE: Record<string, string> = { BKS: "11", TPHP: "21", LOGISTIK: "31", TRPL: "41" };

async function main() {
  console.log("🌱 Seeding Smart Pemira...");

  // ---------- Reset ----------
  await db.auditLog.deleteMany();
  await db.ballotBox.deleteMany();
  await db.votingToken.deleteMany();
  await db.voter.deleteMany();
  await db.candidate.deleteMany();
  await db.tps.deleteMany();
  await db.studyProgram.deleteMany();
  await db.electionSetting.deleteMany();
  await db.electionIncident.deleteMany();

  // ---------- Setting ----------
  await db.electionSetting.create({
    data: { id: "main", votingOpen: true, emergencyFreeze: false, plenoUnlocked: false, sessionSecret: randomBytes(32).toString("hex") },
  });

  // ---------- Operator RBAC (PRD Bab 3: Matriks Hak Akses) ----------
  // Password demo dipublikasikan di kartu login — sistem DEMO, hash scrypt tetap nyata.
  const operators: Array<{ username: string; password: string; role: string; fullName: string; tpsId?: string }> = [
    { username: "itpo", password: "itpo123", role: "ITPO", fullName: "Rizky Ananda — Koordinator Tim ITPO" },
    { username: "kpum", password: "kpum123", role: "KPUM", fullName: "Alifia Rahmadani — Ketua KPUM" },
    { username: "ppur", password: "ppur123", role: "PPUR", fullName: "Bagas Setiawan — Petugas Meja PPUR TPS 01", tpsId: "TPS01" },
    { username: "panwaslu", password: "panwaslu123", role: "PANWASLU", fullName: "Citra Amelia — Ketua Panwaslu" },
    { username: "saksi01", password: "saksi123", role: "SAKSI", fullName: "Dimas Prakoso — Saksi Paslon Presma 01" },
  ];
  for (const op of operators) {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(op.password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
    const created = await db.operator.upsert({
      where: { username: op.username },
      update: { passwordHash: `${salt}:${hash}`, role: op.role, fullName: op.fullName, tpsId: op.tpsId ?? null, isActive: true },
      create: { username: op.username, passwordHash: `${salt}:${hash}`, role: op.role, fullName: op.fullName, tpsId: op.tpsId ?? null },
    });
  }
  await db.auditLog.create({
    data: {
      event: "RBAC_PROVISIONED",
      detail: `Provisioning akun operator RBAC: ${operators.map((o) => `${o.username} (${o.role})`).join(", ")}.`,
    },
  });

  // ---------- TPS ----------
  const chainSalt = createHash("sha256").update(randomUUID()).digest("hex");
  const tps = await db.tps.create({
    data: { id: "TPS01", name: "TPS 01", location: "Aula Lantai 1 — Gedung Utama Kampus", chainSalt },
  });

  // ---------- Prodi ----------
  const prodiData = [
    { id: "BKS", name: "D3 Budidaya Perkebunan Kelapa Sawit", facultyName: "Hima Budidaya Perkebunan Kelapa Sawit", colorPrimary: "#D95338", colorTint: "#FCECE8" },
    { id: "TPHP", name: "D4 Teknologi Pengolahan Hasil Perkebunan", facultyName: "Hima Teknologi Pengolahan Hasil Perkebunan", colorPrimary: "#D9822B", colorTint: "#FDF2E4" },
    { id: "LOGISTIK", name: "D4 Manajemen Logistik Perkebunan", facultyName: "Hima Manajemen Logistik Perkebunan", colorPrimary: "#2B50AA", colorTint: "#E8EEF9" },
    { id: "TRPL", name: "D4 Teknologi Rekayasa Perangkat Lunak", facultyName: "Hima Teknologi Rekayasa Perangkat Lunak", colorPrimary: "#6D28D9", colorTint: "#F1E9FD" },
  ];
  for (const p of prodiData) await db.studyProgram.create({ data: p });

  // ---------- Kandidat ----------
  const mkCandidate = (data: {
    category: string; studyProgramId?: string; number: number; presidentName: string; viceName?: string;
    vision: string; missions: string[]; photoAccent: string; isEmptyBox?: boolean;
  }) =>
    db.candidate.create({
      data: {
        category: data.category,
        studyProgramId: data.studyProgramId,
        number: data.number,
        presidentName: data.presidentName,
        viceName: data.viceName,
        vision: data.vision,
        missionJson: JSON.stringify(data.missions),
        photoAccent: data.photoAccent,
        isEmptyBox: data.isEmptyBox ?? false,
      },
    });

  // PRESMA — 3 pasangan calon
  const presma1 = await mkCandidate({
    category: "PRESMA", number: 1,
    presidentName: "Muhammad Raffi Pratama", viceName: "Salsabila Kirana Putri",
    vision: "Mewujudkan IKM Poltek CWE sebagai federasi mahasiswa yang digital, inklusif, dan berdaya saing industri perkebunan nasional.",
    missions: ["Digitalisasi total layanan kemahasiswaan berbasis satu portal", "Program beasiswa prestasi & literasi keuangan mahasiswa", "Penguatan incubator bisnis sawit mahasiswa bersama industri mitra"],
    photoAccent: "#1B7F4E",
  });
  const presma2 = await mkCandidate({
    category: "PRESMA", number: 2,
    presidentName: "Bintang Aditya Halim", viceName: "Nadia Ayu Lestari",
    vision: "Eksekutif mahasiswa yang transparan, kolaboratif, dan dekat dengan aspirasi seluruh Himpunan Mahasiswa Prodi.",
    missions: ["Portal aspirasi terbuka 24 jam dengan tindak lanjut terukur", "Festival budaya & olahraga antar-prodi tahunan", "Optimalisasi data DPT & partisipasi pemilu 90%+"],
    photoAccent: "#1B7F4E",
  });
  const presma3 = await mkCandidate({
    category: "PRESMA", number: 3,
    presidentName: "Yusuf Maulana Ramadhan", viceName: "Tsania Rahmadani",
    vision: "Kepemimpinan yang berakar pada nilai keilmuan perkebunan dan teknologi untuk kesejahteraan mahasiswa.",
    missions: ["Pusat karier & sertifikasi kompetensi sawit gratis", "Bengkel penelitian mahasiswa menuju PKM nasional", "Renovasi ruang belajar & wifi kampus merata"],
    photoAccent: "#1B7F4E",
  });

  // DPM — 2 pasangan calon
  const dpm1 = await mkCandidate({
    category: "DPM", number: 1,
    presidentName: "Rangga Aditya Nugraha", viceName: "Melati Anggun Sari",
    vision: "Legislasi mahasiswa yang adaptif, responsif, dan menjadi rumah bersama bagi seluruh elemen IKM.",
    missions: ["Revisi UUD IKM & RUU Pemira berbasis masukan publik", "Dashboard akuntabilitas anggaran DPM real-time", "Asistensi tata kelola untuk seluruh Hima prodi"],
    photoAccent: "#0F766E",
  });
  const dpm2 = await mkCandidate({
    category: "DPM", number: 2,
    presidentName: "Fariz Aulia Rahman", viceName: "Hana Puspita Dewi",
    vision: "DPM sebagai penjaga konstitusi yang berintegritas dan berdedikasi pada kemajuan mahasiswa.",
    missions: ["Klinik hukum organisasi mahasiswa setiap pekan", "Digitalisasi persidangan & arsip jurnal DPM", "Komisi pengawasan berita acara Pemira yang ketat"],
    photoAccent: "#0F766E",
  });

  // HIMA BKS — CALON TUNGGAL → memicu KOTAK KOSONG otomatis (FR-03.3)
  const himaBks1 = await mkCandidate({
    category: "HIMA", studyProgramId: "BKS", number: 1,
    presidentName: "Desi Ratna Kusumawati", viceName: "Aldi Saputra",
    vision: "Hima BKS sebagai laboratorium lapangan budidaya sawit terbaik tingkat politeknik.",
    missions: ["Praktik lapangan kebun mitra setiap semester", "Kelas sertifikasi pest control & agronomis muda", "Lomba budidaya antar-angkatan"],
    photoAccent: "#D95338",
  });
  const himaBksEmpty = await mkCandidate({
    category: "HIMA", studyProgramId: "BKS", number: 99,
    presidentName: "KOTAK KOSONG",
    vision: "Pilih kotak ini apabila Anda tidak menyetujui pasangan calon tunggal (Pasal 9 ayat 3 UUD IKM).",
    missions: [],
    photoAccent: "#3F4743", isEmptyBox: true,
  });

  // HIMA TPHP — 2 paslon
  const himaTphp1 = await mkCandidate({
    category: "HIMA", studyProgramId: "TPHP", number: 1,
    presidentName: "Gilang Prakasa Wirawan", viceName: "Ayu Fitri Handayani",
    vision: "Menjadikan TPHP motor inovasi pengolahan sawit berbasis riset dan industri.",
    missions: ["Incubator produk olahan sawit (minyak, oleokimia)", "Kunjungan industri pabrik CPO rutin", "Pelatihan HPLC & analisis mutu untuk anggota"],
    photoAccent: "#D9822B",
  });
  const himaTphp2 = await mkCandidate({
    category: "HIMA", studyProgramId: "TPHP", number: 2,
    presidentName: "Reza Fahlevi Nasution", viceName: "Cindi Amelia Wati",
    vision: "TPHP yang kolaboratif dengan BUMN perkebunan dan startup pangan.",
    missions: ["Magang terjamin di pabrik mitra", "Seminar nasional olahan sawit", "Studi banding institusi teknologi"],
    photoAccent: "#D9822B",
  });

  // HIMA LOGISTIK — 2 paslon
  const himaLog1 = await mkCandidate({
    category: "HIMA", studyProgramId: "LOGISTIK", number: 1,
    presidentName: "Kevin Sapta Nugroho", viceName: "Laras Oktaviani",
    vision: "Sistem rantai pasok sawit yang efisien dimulai dari mahasiswa logistik yang unggul.",
    missions: ["Sertifikasi supply chain (SCOR model)", "Simulasi logistik gudang & distribusi sawit", "Klub data analytics logistik"],
    photoAccent: "#2B50AA",
  });
  const himaLog2 = await mkCandidate({
    category: "HIMA", studyProgramId: "LOGISTIK", number: 2,
    presidentName: "Ilham Nur Hidayat", viceName: "Sekar Ayu Ramadhani",
    vision: "Menjembatani teori kampus dan praktik logistik industri perkebunan nasional.",
    missions: ["Job fair logistik tahunan", "Workshop WMS/ERP gratis", "Tim lomba logistik olimpiade"],
    photoAccent: "#2B50AA",
  });

  // HIMA TRPL — 2 paslon
  const himaTrpl1 = await mkCandidate({
    category: "HIMA", studyProgramId: "TRPL", number: 1,
    presidentName: "Aditya Yoga Pratama", viceName: "Naura Zahira Aulia",
    vision: "TRPL sebagai inkubator software engineer profesional kelas industri.",
    missions: ["Bootcamp fullstack & DevOps tiap semester", "Portofolio GitHub mahasiswa terkurasi", "Kolaborasi proyek riil dengan kampus"],
    photoAccent: "#6D28D9",
  });
  const himaTrpl2 = await mkCandidate({
    category: "HIMA", studyProgramId: "TRPL", number: 2,
    presidentName: "Bagas Dwi Cahyono", viceName: "Kirana Melati Sukma",
    vision: "Komunitas coding yang sehat, produktif, dan berdampak pada masyarakat.",
    missions: ["Hackathon tahunan TRPL", "Mentoring algoritma & competitive programming", "Proyek sosial digital desa mitra"],
    photoAccent: "#6D28D9",
  });

  // ---------- DPT (44 mahasiswa) ----------
  interface SeedVoter { nim: string; name: string; angkatan: number; studyProgramId: string }
  const voters: SeedVoter[] = [];
  let seq = 0;
  for (const prodi of prodiData) {
    for (let i = 1; i <= 11; i++) {
      seq++;
      const angkatan = rand([2022, 2023, 2024, 2025]);
      voters.push({
        nim: `22${PRODI_CODE[prodi.id]}${String(i).padStart(3, "0")}${String(seq).padStart(2, "0")}`,
        name: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
        angkatan,
        studyProgramId: prodi.id,
      });
    }
  }

  const createdVoters: { id: string; nim: string; studyProgramId: string }[] = [];
  for (const v of voters) {
    const created = await db.voter.create({
      data: { ...v, tpsId: tps.id, status: "BELUM_MEMILIH" },
    });
    createdVoters.push({ id: created.id, nim: created.nim, studyProgramId: created.studyProgramId });
  }

  // ---------- Suara demo pra-cast (membangun rantai hash jujur) ----------
  const precastVoters = createdVoters.filter((_, i) => i % 5 === 0).slice(0, 9);

  const presmaCands = [presma1, presma2, presma3];
  const dpmCands = [dpm1, dpm2];
  const himaByProdi: Record<string, { id: string; isEmptyBox: boolean }[]> = {
    BKS: [{ id: himaBks1.id, isEmptyBox: false }, { id: himaBksEmpty.id, isEmptyBox: true }],
    TPHP: [{ id: himaTphp1.id, isEmptyBox: false }, { id: himaTphp2.id, isEmptyBox: false }],
    LOGISTIK: [{ id: himaLog1.id, isEmptyBox: false }, { id: himaLog2.id, isEmptyBox: false }],
    TRPL: [{ id: himaTrpl1.id, isEmptyBox: false }, { id: himaTrpl2.id, isEmptyBox: false }],
  };

  let prevChain = "";
  let prevTs = 0;
  const now = Date.now();
  for (let i = 0; i < precastVoters.length; i++) {
    const voter = precastVoters[i];
    const voteAt = new Date(now - (precastVoters.length - i) * 11 * 60_000);

    const himaOpts = himaByProdi[voter.studyProgramId];
    const canEmpty = himaOpts.some((o) => o.isEmptyBox);
    const himaPick =
      canEmpty && Math.random() < 0.3
        ? himaOpts.find((o) => o.isEmptyBox)!
        : rand(himaOpts.filter((o) => !o.isEmptyBox));

    const entries = [
      { category: "PRESMA", candidateId: rand(presmaCands).id, isEmptyBox: false },
      { category: "DPM", candidateId: rand(dpmCands).id, isEmptyBox: false },
      { category: "HIMA", candidateId: himaPick.isEmptyBox ? null : himaPick.id, isEmptyBox: himaPick.isEmptyBox },
    ];

    for (const entry of entries) {
      const id = randomUUID();
      // Timestamp jitter (±60s) dengan floor monotonic agar urutan
      // createdAt selalu sama dengan urutan rantai hash.
      const ts = new Date(Math.max(jitter(voteAt).getTime(), prevTs));
      prevTs = ts.getTime() + 1;
      const hash = computeBallotHash(prevChain, id, entry.category, entry.candidateId, entry.isEmptyBox, ts, chainSalt);
      await db.ballotBox.create({
        data: {
          id, category: entry.category, candidateId: entry.candidateId, isEmptyBox: entry.isEmptyBox,
          tpsId: tps.id, createdAt: ts, ballotHash: hash,
        },
      });
      prevChain = hash;
    }

    await db.voter.update({
      where: { id: voter.id },
      data: { hasVoted: true, status: "SUDAH_MEMILIH", votedAt: voteAt },
    });
  }
  await db.tps.update({ where: { id: tps.id }, data: { lastChainHash: prevChain } });

  // ---------- Audit log awal ----------
  const auditSeed = [
    { event: "SYSTEM_INIT", detail: "Inisialisasi basis data Smart Pemira. Seluruh kotak suara berstatus 0 (Nol) terverifikasi uji integritas pra-pemungutan (PRD 5.1.3).", at: new Date(now - 90 * 60_000) },
    { event: "DPT_LOCKED", detail: "DPT ditetapkan & dikunci (freeze) oleh Komisioner KPUM. Total 44 pemilih terdaftar di TPS 01.", at: new Date(now - 80 * 60_000) },
    { event: "TPS_OPENED", detail: "TPS 01 dibuka oleh Ketua PPUR, disaksikan Panwaslu & Saksi Paslon. Surat suara awal = 0.", at: new Date(now - 60 * 60_000) },
  ];
  for (const a of auditSeed) {
    await db.auditLog.create({ data: { event: a.event, detail: a.detail, tpsId: tps.id, createdAt: a.at } });
  }

  // ---------- Contoh laporan sengketa ----------
  await db.electionIncident.create({
    data: {
      ticketNumber: "SPR-2026-0001",
      reporterName: "Wahyu Setiawan",
      reporterNim: createdVoters[2].nim,
      incidentType: "PELANGGARAN_KAMPANYE",
      location: "Area parkir kampus",
      description: "Dugaan kampanye hari tenang: terlihat materi promosi dibagikan dekat gerbang kampus pada masa tenang.",
      status: "IN_REVIEW",
    },
  });

  const counts = {
    prodi: await db.studyProgram.count(),
    candidates: await db.candidate.count(),
    voters: await db.voter.count(),
    ballots: await db.ballotBox.count(),
    voted: await db.voter.count({ where: { hasVoted: true } }),
  };
  console.log("✅ Seed selesai:", JSON.stringify(counts));
  console.log("🔗 Chain head:", prevChain.slice(0, 24) + "...");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
