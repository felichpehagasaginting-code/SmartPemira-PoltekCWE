// ============================================================
// SEED SCRIPT — Smart Pemira Poltek CWE (Pemira 100% Online)
// Data awal: 5 prodi (TPTP/TPHP/MANLOG/BD/TRPL), 5 TPS virtual
// (satu rantai hash per prodi), kandidat per kategori DPM→BEM→HIMA,
// DPT ber-NIM, suara demo pra-cast + satu demo re-vote (Estonia).
// Jalankan: bunx tsx scripts/seed.ts
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

const PRODI_CODE: Record<string, string> = { TPTP: "11", TPHP: "21", MANLOG: "31", BD: "41", TRPL: "51" };

async function main() {
  console.log("🌱 Seeding Smart Pemira (100% Online, 5 rantai prodi)...");

  // ---------- Reset ----------
  await db.electionArchive.deleteMany();
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
    data: {
      id: "main",
      votingOpen: true,
      emergencyFreeze: false,
      plenoUnlocked: false,
      sessionSecret: randomBytes(32).toString("hex"),
      periodLabel: "Pemira Poltek CWE 2026",
      periodStartedAt: new Date(Date.now() - 100 * 60_000),
    },
  });

  // ---------- Operator RBAC (PRD Bab 3) — pos bantuan tidak terikat TPS ----------
  const operators: Array<{ username: string; password: string; role: string; fullName: string; tpsId?: string }> = [
    { username: "itpo", password: "itpo123", role: "ITPO", fullName: "Rizky Ananda — Koordinator Tim ITPO" },
    { username: "kpum", password: "kpum123", role: "KPUM", fullName: "Alifia Rahmadani — Ketua KPUM" },
    { username: "ppur", password: "ppur123", role: "PPUR", fullName: "Bagas Setiawan — Petugas Pos Bantuan PPUR" },
    { username: "panwaslu", password: "panwaslu123", role: "PANWASLU", fullName: "Citra Amelia — Ketua Panwaslu" },
    { username: "saksi01", password: "saksi123", role: "SAKSI", fullName: "Dimas Prakoso — Saksi Paslon BEM 01" },
  ];
  for (const op of operators) {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(op.password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
    await db.operator.upsert({
      where: { username: op.username },
      update: { passwordHash: `${salt}:${hash}`, role: op.role, fullName: op.fullName, tpsId: op.tpsId ?? null, isActive: true, mustChangePassword: false },
      create: { username: op.username, passwordHash: `${salt}:${hash}`, role: op.role, fullName: op.fullName, tpsId: op.tpsId ?? null },
    });
  }
  await db.auditLog.create({
    data: {
      event: "RBAC_PROVISIONED",
      detail: `Provisioning akun operator RBAC: ${operators.map((o) => `${o.username} (${o.role})`).join(", ")}.`,
    },
  });

  // ---------- Prodi (keputusan diskusi 2026-10-20: 5 prodi) ----------
  const prodiData = [
    { id: "TPTP", name: "D3 Teknologi Produksi Tanaman Perkebunan", facultyName: "Hima Teknologi Produksi Tanaman Perkebunan", colorPrimary: "#D95338", colorTint: "#FCECE8" },
    { id: "TPHP", name: "D4 Teknologi Pengolahan Hasil Perkebunan", facultyName: "Hima Teknologi Pengolahan Hasil Perkebunan", colorPrimary: "#D9822B", colorTint: "#FDF2E4" },
    { id: "MANLOG", name: "D4 Manajemen Logistik Perkebunan", facultyName: "Hima Manajemen Logistik Perkebunan", colorPrimary: "#2B50AA", colorTint: "#E8EEF9" },
    { id: "BD", name: "D4 Bisnis Digital", facultyName: "Hima Bisnis Digital", colorPrimary: "#0F766E", colorTint: "#E4F2EF" },
    { id: "TRPL", name: "D4 Teknologi Rekayasa Perangkat Lunak", facultyName: "Hima Teknologi Rekayasa Perangkat Lunak", colorPrimary: "#6D28D9", colorTint: "#F1E9FD" },
  ];
  for (const p of prodiData) await db.studyProgram.create({ data: p });

  // ---------- 5 TPS Virtual — satu rantai hash per prodi ----------
  const chains: Record<string, { id: string; name: string; location: string; chainSalt: string }> = {};
  for (const p of prodiData) {
    const chainSalt = createHash("sha256").update(randomUUID()).digest("hex");
    chains[p.id] = {
      id: p.id,
      name: `TPS ONLINE — ${p.id}`,
      location: `Pemungutan Online — ${p.name.replace(/^(D3|D4) /, "")}`,
      chainSalt,
    };
    await db.tps.create({ data: { ...chains[p.id] } });
  }

  // ---------- Kandidat ----------
  // Struktur per peran (keputusan diskusi 2026-10-22):
  //  - DPM : Ketua Umum (presidentName) + Ketua 1 (viceName) + Ketua 2 (secondViceName)
  //  - BEM : Presma (presidentName) + Wakil Presma (viceName)
  //  - HIMA: Ketua (presidentName) + Wakil Ketua (viceName)
  //  Tiap kandidat punya foto AI palsu per orang (public/candidates).
  const mkCandidate = (data: {
    category: string; studyProgramId?: string; number: number; presidentName: string; viceName?: string;
    secondViceName?: string;
    photoLeaderUrl?: string; photoViceUrl?: string; photoSecondViceUrl?: string;
    vision: string; missions: string[]; photoAccent: string; isEmptyBox?: boolean;
  }) =>
    db.candidate.create({
      data: {
        category: data.category,
        studyProgramId: data.studyProgramId,
        number: data.number,
        presidentName: data.presidentName,
        viceName: data.viceName,
        secondViceName: data.secondViceName,
        photoLeaderUrl: data.photoLeaderUrl,
        photoViceUrl: data.photoViceUrl,
        photoSecondViceUrl: data.photoSecondViceUrl,
        vision: data.vision,
        missionJson: JSON.stringify(data.missions),
        photoAccent: data.photoAccent,
        isEmptyBox: data.isEmptyBox ?? false,
      },
    });

  // DPM (Surat Suara 1) — 2 kandidat × struktur 3 peran: Ketua Umum, Ketua 1, Ketua 2
  const dpm1 = await mkCandidate({
    category: "DPM", number: 1,
    presidentName: "Rangga Aditya Nugraha", viceName: "Melati Anggun Sari", secondViceName: "Naufal Arya Saputra",
    photoLeaderUrl: "/candidates/dpm-01-ketua-umum.png",
    photoViceUrl: "/candidates/dpm-01-ketua-1.png",
    photoSecondViceUrl: "/candidates/dpm-01-ketua-2.png",
    vision: "Legislasi mahasiswa yang adaptif, responsif, dan menjadi rumah bersama bagi seluruh elemen IKM.",
    missions: ["Revisi UUD IKM & RUU Pemira berbasis masukan publik", "Dashboard akuntabilitas anggaran DPM real-time", "Asistensi tata kelola untuk seluruh Hima prodi"],
    photoAccent: "#0F766E",
  });
  const dpm2 = await mkCandidate({
    category: "DPM", number: 2,
    presidentName: "Fariz Aulia Rahman", viceName: "Hana Puspita Dewi", secondViceName: "Salma Nadhira Putri",
    photoLeaderUrl: "/candidates/dpm-02-ketua-umum.png",
    photoViceUrl: "/candidates/dpm-02-ketua-1.png",
    photoSecondViceUrl: "/candidates/dpm-02-ketua-2.png",
    vision: "DPM sebagai penjaga konstitusi yang berintegritas dan berdedikasi pada kemajuan mahasiswa.",
    missions: ["Klinik hukum organisasi mahasiswa setiap pekan", "Digitalisasi persidangan & arsip jurnal DPM", "Komisi pengawasan berita acara Pemira yang ketat"],
    photoAccent: "#0F766E",
  });

  // BEM / PRESMA (Surat Suara 2) — 2 kandidat × (Presma + Wakil Presma)
  const presma1 = await mkCandidate({
    category: "PRESMA", number: 1,
    presidentName: "Muhammad Raffi Pratama", viceName: "Salsabila Kirana Putri",
    photoLeaderUrl: "/candidates/bem-01-ketua.png",
    photoViceUrl: "/candidates/bem-01-wakil.png",
    vision: "Mewujudkan IKM Poltek CWE sebagai federasi mahasiswa yang digital, inklusif, dan berdaya saing industri perkebunan nasional.",
    missions: ["Digitalisasi total layanan kemahasiswaan berbasis satu portal", "Program beasiswa prestasi & literasi keuangan mahasiswa", "Penguatan incubator bisnis sawit mahasiswa bersama industri mitra"],
    photoAccent: "#1B7F4E",
  });
  const presma2 = await mkCandidate({
    category: "PRESMA", number: 2,
    presidentName: "Bintang Aditya Halim", viceName: "Nadia Ayu Lestari",
    photoLeaderUrl: "/candidates/bem-02-ketua.png",
    photoViceUrl: "/candidates/bem-02-wakil.png",
    vision: "Eksekutif mahasiswa yang transparan, kolaboratif, dan dekat dengan aspirasi seluruh Himpunan Mahasiswa Prodi.",
    missions: ["Portal aspirasi terbuka 24 jam dengan tindak lanjut terukur", "Festival budaya & olahraga antar-prodi tahunan", "Optimalisasi data DPT & partisipasi pemilu 90%+"],
    photoAccent: "#1B7F4E",
  });

  // HIMA (Surat Suara 3) — per prodi, masing-masing 2 kandidat × (Ketua + Wakil Ketua)
  const himaTptp1 = await mkCandidate({
    category: "HIMA", studyProgramId: "TPTP", number: 1,
    presidentName: "Desi Ratna Kusumawati", viceName: "Aldi Saputra",
    photoLeaderUrl: "/candidates/hima-tptp-01-ketua.png",
    photoViceUrl: "/candidates/hima-tptp-01-wakil.png",
    vision: "Hima TPTP sebagai laboratorium lapangan produksi tanaman perkebunan terbaik tingkat politeknik.",
    missions: ["Praktik lapangan kebun mitra setiap semester", "Kelas sertifikasi agronomis muda & pest control", "Lomba budidaya antar-angkatan"],
    photoAccent: "#D95338",
  });
  const himaTptp2 = await mkCandidate({
    category: "HIMA", studyProgramId: "TPTP", number: 2,
    presidentName: "Fajar Arya Wibowo", viceName: "Putri Maharani Ayu",
    photoLeaderUrl: "/candidates/hima-tptp-02-ketua.png",
    photoViceUrl: "/candidates/hima-tptp-02-wakil.png",
    vision: "TPTP yang unggul dalam praktik agronomis modern dan kewirausahaan agribisnis perkebunan.",
    missions: ["Demplot riset budidaya mandiri di kebun kampus", "Sertifikasi pest control & pemupukan presisi", "Koperasi hasil panen mahasiswa antar-angkatan"],
    photoAccent: "#D95338",
  });

  const himaTphp1 = await mkCandidate({
    category: "HIMA", studyProgramId: "TPHP", number: 1,
    presidentName: "Gilang Prakasa Wirawan", viceName: "Ayu Fitri Handayani",
    photoLeaderUrl: "/candidates/hima-tphp-01-ketua.png",
    photoViceUrl: "/candidates/hima-tphp-01-wakil.png",
    vision: "Menjadikan TPHP motor inovasi pengolahan sawit berbasis riset dan industri.",
    missions: ["Incubator produk olahan sawit (minyak, oleokimia)", "Kunjungan industri pabrik CPO rutin", "Pelatihan HPLC & analisis mutu untuk anggota"],
    photoAccent: "#D9822B",
  });
  const himaTphp2 = await mkCandidate({
    category: "HIMA", studyProgramId: "TPHP", number: 2,
    presidentName: "Reza Fahlevi Nasution", viceName: "Cindi Amelia Wati",
    photoLeaderUrl: "/candidates/hima-tphp-02-ketua.png",
    photoViceUrl: "/candidates/hima-tphp-02-wakil.png",
    vision: "TPHP yang kolaboratif dengan BUMN perkebunan dan startup pangan.",
    missions: ["Magang terjamin di pabrik mitra", "Seminar nasional olahan sawit", "Studi banding institusi teknologi"],
    photoAccent: "#D9822B",
  });

  const himaManlog1 = await mkCandidate({
    category: "HIMA", studyProgramId: "MANLOG", number: 1,
    presidentName: "Kevin Sapta Nugroho", viceName: "Laras Oktaviani",
    photoLeaderUrl: "/candidates/hima-manlog-01-ketua.png",
    photoViceUrl: "/candidates/hima-manlog-01-wakil.png",
    vision: "Sistem rantai pasok sawit yang efisien dimulai dari mahasiswa logistik yang unggul.",
    missions: ["Sertifikasi supply chain (SCOR model)", "Simulasi logistik gudang & distribusi sawit", "Klub data analytics logistik"],
    photoAccent: "#2B50AA",
  });
  const himaManlog2 = await mkCandidate({
    category: "HIMA", studyProgramId: "MANLOG", number: 2,
    presidentName: "Ilham Nur Hidayat", viceName: "Sekar Ayu Ramadhani",
    photoLeaderUrl: "/candidates/hima-manlog-02-ketua.png",
    photoViceUrl: "/candidates/hima-manlog-02-wakil.png",
    vision: "Menjembatani teori kampus dan praktik logistik industri perkebunan nasional.",
    missions: ["Job fair logistik tahunan", "Workshop WMS/ERP gratis", "Tim lomba logistik olimpiade"],
    photoAccent: "#2B50AA",
  });

  const himaBd1 = await mkCandidate({
    category: "HIMA", studyProgramId: "BD", number: 1,
    presidentName: "Alya Nirmala Sari", viceName: "Fathan Arya Maulana",
    photoLeaderUrl: "/candidates/hima-bd-01-ketua.png",
    photoViceUrl: "/candidates/hima-bd-01-wakil.png",
    vision: "Hima BD sebagai inkubator wirausaha digital: e-commerce, fintech, dan data-driven business.",
    missions: ["Toko digital kampus untuk produk mahasiswa", "Kelas digital marketing & SEO bulanan", "Kolaborasi proyek marketplace dengan UMKM sawit"],
    photoAccent: "#0F766E",
  });
  const himaBd2 = await mkCandidate({
    category: "HIMA", studyProgramId: "BD", number: 2,
    presidentName: "Raditya Bayu Kurniawan", viceName: "Selina Maharani",
    photoLeaderUrl: "/candidates/hima-bd-02-ketua.png",
    photoViceUrl: "/candidates/hima-bd-02-wakil.png",
    vision: "Bisnis Digital yang berakar pada etika data dan inovasi berkelanjutan.",
    missions: ["Bootcamp data analytics & BI tools", "Competition e-commerce & business plan", "Podcast wirausaha digital mahasiswa"],
    photoAccent: "#0F766E",
  });

  const himaTrpl1 = await mkCandidate({
    category: "HIMA", studyProgramId: "TRPL", number: 1,
    presidentName: "Aditya Yoga Pratama", viceName: "Naura Zahira Aulia",
    photoLeaderUrl: "/candidates/hima-trpl-01-ketua.png",
    photoViceUrl: "/candidates/hima-trpl-01-wakil.png",
    vision: "TRPL sebagai inkubator software engineer profesional kelas industri.",
    missions: ["Bootcamp fullstack & DevOps tiap semester", "Portofolio GitHub mahasiswa terkurasi", "Kolaborasi proyek riil dengan kampus"],
    photoAccent: "#6D28D9",
  });
  const himaTrpl2 = await mkCandidate({
    category: "HIMA", studyProgramId: "TRPL", number: 2,
    presidentName: "Bagas Dwi Cahyono", viceName: "Kirana Melati Sukma",
    photoLeaderUrl: "/candidates/hima-trpl-02-ketua.png",
    photoViceUrl: "/candidates/hima-trpl-02-wakil.png",
    vision: "Komunitas coding yang sehat, produktif, dan berdampak pada masyarakat.",
    missions: ["Hackathon tahunan TRPL", "Mentoring algoritma & competitive programming", "Proyek sosial digital desa mitra"],
    photoAccent: "#6D28D9",
  });

  // ---------- DPT (44 mahasiswa ber-NIM, terbagi 5 prodi) ----------
  interface SeedVoter { nim: string; name: string; angkatan: number; studyProgramId: string }
  const quota: Record<string, number> = { TPTP: 8, TPHP: 9, MANLOG: 9, BD: 9, TRPL: 9 };
  const voters: SeedVoter[] = [];
  for (const prodi of prodiData) {
    for (let i = 1; i <= quota[prodi.id]; i++) {
      const angkatan = rand([2022, 2023, 2024, 2025]);
      const nim = `${String(angkatan).slice(2)}${PRODI_CODE[prodi.id]}${String(i).padStart(3, "0")}`;
      voters.push({
        nim,
        name: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
        angkatan,
        studyProgramId: prodi.id,
      });
    }
  }

  const createdVoters: { id: string; nim: string; studyProgramId: string }[] = [];
  for (const v of voters) {
    const created = await db.voter.create({
      data: { ...v, tpsId: v.studyProgramId, status: "BELUM_MEMILIH" }, // tpsId = rantai prodi
    });
    createdVoters.push({ id: created.id, nim: created.nim, studyProgramId: created.studyProgramId });
  }

  // ---------- Suara demo pra-cast (rantai jujur per prodi + 1 demo re-vote) ----------
  const himaByProdi: Record<string, Array<{ id: string; isEmptyBox: boolean }>> = {
    TPTP: [{ id: himaTptp1.id, isEmptyBox: false }, { id: himaTptp2.id, isEmptyBox: false }],
    TPHP: [{ id: himaTphp1.id, isEmptyBox: false }, { id: himaTphp2.id, isEmptyBox: false }],
    MANLOG: [{ id: himaManlog1.id, isEmptyBox: false }, { id: himaManlog2.id, isEmptyBox: false }],
    BD: [{ id: himaBd1.id, isEmptyBox: false }, { id: himaBd2.id, isEmptyBox: false }],
    TRPL: [{ id: himaTrpl1.id, isEmptyBox: false }, { id: himaTrpl2.id, isEmptyBox: false }],
  };
  const presmaCands = [presma1.id, presma2.id];
  const dpmCands = [dpm1.id, dpm2.id];

  // Rencana deterministik: 9 pemilih sudah memilih (2 TPTP, 2 TPHP, 1 MANLOG, 2 BD, 2 TRPL)
  const perProdi = (pid: string, n: number) => createdVoters.filter((v) => v.studyProgramId === pid).slice(0, n);
  const precastPlan: Array<{ voter: { id: string; nim: string; studyProgramId: string }; himaPick: string | null }> = [
    ...perProdi("TPTP", 2).map((v, i) => ({ voter: v, himaPick: i === 0 ? himaTptp1.id : himaTptp2.id })),
    ...perProdi("TPHP", 2).map((v, i) => ({ voter: v, himaPick: i === 0 ? himaTphp1.id : himaTphp2.id })),
    ...perProdi("MANLOG", 1).map((v) => ({ voter: v, himaPick: himaManlog1.id })),
    ...perProdi("BD", 2).map((v, i) => ({ voter: v, himaPick: i === 0 ? himaBd2.id : himaBd1.id })),
    ...perProdi("TRPL", 2).map((v, i) => ({ voter: v, himaPick: i === 0 ? himaTrpl1.id : himaTrpl2.id })),
  ];
  // Re-vote demo: pemilih TRPL kedua mengganti suaranya (versi 2 → himaTrpl1)
  const revoter = precastPlan.find((p) => p.voter.studyProgramId === "TRPL" && p.himaPick === himaTrpl2.id)!;
  const revotePick = himaTrpl1.id;

  const now = Date.now();
  const chainState = new Map<string, { prev: string; prevTs: number }>();
  for (const p of prodiData) chainState.set(p.id, { prev: "", prevTs: 0 });

  async function castVote(opts: {
    voter: { id: string; nim: string; studyProgramId: string };
    himaCandidateId: string | null;
    voteAt: Date;
    voteVersion: number;
    tokenId: string;
    isRevote: boolean;
  }) {
    const { voter, himaCandidateId, voteAt, voteVersion, tokenId, isRevote } = opts;
    const salt = chains[voter.studyProgramId].chainSalt;
    const entries = [
      { category: "DPM", candidateId: rand(dpmCands), isEmptyBox: false },
      { category: "PRESMA", candidateId: rand(presmaCands), isEmptyBox: false },
      { category: "HIMA", candidateId: himaCandidateId, isEmptyBox: himaCandidateId === null },
    ];
    let head = "";
    for (const entry of entries) {
      const st = chainState.get(voter.studyProgramId)!;
      const id = randomUUID();
      const ts = new Date(Math.max(jitter(voteAt).getTime(), st.prevTs));
      st.prevTs = ts.getTime() + 1;
      const hash = computeBallotHash(st.prev, id, entry.category, entry.candidateId, entry.isEmptyBox, ts, salt);
      await db.ballotBox.create({
        data: {
          id, category: entry.category, candidateId: entry.candidateId, isEmptyBox: entry.isEmptyBox,
          tpsId: voter.studyProgramId, tokenId, voteVersion, createdAt: ts, ballotHash: hash,
        },
      });
      st.prev = hash;
      head = hash;
    }
    return head;
  }

  let revoteHead = "";
  for (let i = 0; i < precastPlan.length; i++) {
    const plan = precastPlan[i];
    const voteAt = new Date(now - (precastPlan.length - i) * 11 * 60_000);
    const token = await db.votingToken.create({
      data: {
        tokenHash: createHash("sha256").update(randomUUID()).digest("hex"), // token demo pra-cast (plaintext tak pernah ada)
        tpsId: plan.voter.studyProgramId,
        studyProgramId: plan.voter.studyProgramId,
        status: "USED",
        issuedAt: new Date(voteAt.getTime() - 10 * 60_000),
        expiresAt: new Date(voteAt.getTime() - 60_000),
        usedAt: voteAt,
      },
    });
    await castVote({
      voter: plan.voter,
      himaCandidateId: plan.himaPick,
      voteAt,
      voteVersion: 1,
      tokenId: token.id,
      isRevote: false,
    });
    await db.voter.update({
      where: { id: plan.voter.id },
      data: { hasVoted: true, status: "SUDAH_MEMILIH", votedAt: voteAt },
    });

    // Re-vote demo (Estonia): suara versi 2 menggantikan versi 1
    if (plan === revoter) {
      const revoteAt = new Date(voteAt.getTime() + 17 * 60_000);
      await db.votingToken.update({
        where: { id: token.id },
        data: { revoteCount: 1 },
      });
      revoteHead = await castVote({
        voter: plan.voter,
        himaCandidateId: revotePick,
        voteAt: revoteAt,
        voteVersion: 2,
        tokenId: token.id,
        isRevote: true,
      });
      await db.auditLog.create({
        data: {
          event: "BALLOT_REVOTED",
          detail: `Suara diganti (versi 2) di TPS ONLINE — TRPL. Versi sebelumnya otomatis tidak dihitung — suara terakhir yang sah. Identitas terpisah mutlak.`,
          tpsId: "TRPL",
        },
      });
    }
  }

  // Simpan head tiap rantai
  for (const p of prodiData) {
    const st = chainState.get(p.id)!;
    await db.tps.update({ where: { id: p.id }, data: { lastChainHash: st.prev } });
  }

  // ---------- Audit log awal ----------
  const auditSeed = [
    { event: "SYSTEM_INIT", detail: "Inisialisasi basis data Smart Pemira Online. Lima rantai hash prodi (TPTP, TPHP, MANLOG, BD, TRPL) terverifikasi uji integritas pra-pemungutan.", at: new Date(now - 90 * 60_000) },
    { event: "DPT_LOCKED", detail: "DPT ditetapkan & dikunci oleh Komisioner KPUM. Total 44 pemilih ber-NIM terdaftar pada 5 rantai prodi.", at: new Date(now - 80 * 60_000) },
    { event: "PEMUNGUTAN_ONLINE_OPENED", detail: "Pemungutan suara online 100% dibuka oleh Ketua KPUM, disaksikan Panwaslu & Saksi. Mahasiswa memilih dari perangkat sendiri via Portal Pemilih; re-vote model Estonia aktif.", at: new Date(now - 60 * 60_000) },
  ];
  for (const a of auditSeed) {
    await db.auditLog.create({ data: { event: a.event, detail: a.detail, createdAt: a.at } });
  }

  // ---------- Contoh laporan sengketa ----------
  await db.electionIncident.create({
    data: {
      ticketNumber: "SPR-2026-0001",
      reporterName: "Wahyu Setiawan",
      reporterNim: createdVoters[2].nim,
      incidentType: "PELANGGARAN_KAMPANYE",
      location: "Grup WhatsApp angkatan",
      description: "Dugaan kampanye hari tenang: materi promosi dibagikan ke grup WhatsApp angkatan pada masa tenang.",
      status: "IN_REVIEW",
    },
  });

  const counts = {
    prodi: await db.studyProgram.count(),
    chains: await db.tps.count(),
    candidates: await db.candidate.count(),
    voters: await db.voter.count(),
    ballots: await db.ballotBox.count(),
    voted: await db.voter.count({ where: { hasVoted: true } }),
    tokensRevoted: await db.votingToken.count({ where: { revoteCount: { gt: 0 } } }),
  };
  console.log("✅ Seed selesai:", JSON.stringify(counts));
  console.log("🔗 Head per rantai:");
  for (const p of prodiData) {
    const st = chainState.get(p.id)!;
    console.log(`   ${p.id}: ${st.prev.slice(0, 24)}${st.prev ? "…" : " (kosong)"}`);
  }
  if (revoteHead) console.log("🔁 Demo re-vote tercatat (TRPL versi 2).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
