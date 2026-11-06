import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  PageBreak,
  Footer,
  PageNumber,
  ShadingType,
  VerticalAlign,
} from "docx";
import * as fs from "fs";
import * as path from "path";

// Ukuran margin standar skripsi Indonesia (4-3-3-3 cm dalam twips):
// 1 cm = 567 twips.
// Kiri: 4 cm = 2268 twips
// Atas: 3 cm = 1701 twips
// Kanan: 3 cm = 1701 twips
// Bawah: 3 cm = 1701 twips
const MARGINS = {
  top: 1701,
  left: 2268,
  right: 1701,
  bottom: 1701,
};

const BORDER_STYLE_NONE = {
  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
};

const BORDER_STYLE_SOLID = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
};

// Helper teks paragraf isi (standar 12pt Times New Roman, Justified, 1.5 spasi, first-line indent)
function bodyP(text: string, indent: boolean = true): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: indent ? { firstLine: 720 } : undefined, // 0.5 inci indent
    spacing: { line: 360, lineRule: "auto", after: 120 },
    children: [
      new TextRun({
        text,
        font: "Times New Roman",
        size: 24, // 12pt (24 half-points)
        color: "000000",
      }),
    ],
  });
}

// Helper teks paragraf dengan format campuran (bold / normal)
function formattedP(
  runs: { text: string; bold?: boolean; italic?: boolean }[],
  indent: boolean = true
): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: indent ? { firstLine: 720 } : undefined,
    spacing: { line: 360, lineRule: "auto", after: 120 },
    children: runs.map(
      (r) =>
        new TextRun({
          text: r.text,
          bold: r.bold ?? false,
          italics: r.italic ?? false,
          font: "Times New Roman",
          size: 24,
          color: "000000",
        })
    ),
  });
}

// Helper Heading 1 (BAB)
function heading1(title: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 240, line: 360 },
    heading: HeadingLevel.HEADING_1,
    children: [
      new TextRun({
        text: title,
        bold: true,
        font: "Times New Roman",
        size: 28, // 14pt
        color: "000000",
      }),
    ],
  });
}

// Helper Heading 2 (Sub-bab)
function heading2(title: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 200, after: 120, line: 360 },
    heading: HeadingLevel.HEADING_2,
    children: [
      new TextRun({
        text: title,
        bold: true,
        font: "Times New Roman",
        size: 24, // 12pt
        color: "000000",
      }),
    ],
  });
}

// Helper Heading 3 (Sub-sub-bab)
function heading3(title: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 160, after: 80, line: 360 },
    heading: HeadingLevel.HEADING_3,
    children: [
      new TextRun({
        text: title,
        bold: true,
        italics: true,
        font: "Times New Roman",
        size: 24, // 12pt
        color: "000000",
      }),
    ],
  });
}

// Helper Poin Berbutir / Bernomor
function listP(num: string, text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 720, hanging: 360 },
    spacing: { line: 360, lineRule: "auto", after: 100 },
    children: [
      new TextRun({
        text: `${num} `,
        bold: true,
        font: "Times New Roman",
        size: 24,
        color: "000000",
      }),
      new TextRun({
        text,
        font: "Times New Roman",
        size: 24,
        color: "000000",
      }),
    ],
  });
}

async function generate() {
  console.log("📄 Menyusun naskah proposal akademis standar skripsi...");

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24,
            color: "000000",
          },
          paragraph: {
            spacing: { line: 360, lineRule: "auto" },
          },
        },
      },
    },
    sections: [
      // ==========================================
      // SECTION 1: COVER PROPOSAL (HITAM PUTIH AKADEMIS)
      // ==========================================
      {
        properties: {
          page: {
            margin: MARGINS,
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: "PROPOSAL TUGAS AKHIR / SKRIPSI",
                bold: true,
                font: "Times New Roman",
                size: 28, // 14pt
                color: "000000",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({
                text: "RANCANG BANGUN SISTEM E-VOTING PEMILIHAN UMUM RAYA MAHASISWA BERBASIS ZERO-KNOWLEDGE BALLOT ISOLATION DAN KRIPTOGRAFI HASH CHAINING",
                bold: true,
                font: "Times New Roman",
                size: 32, // 16pt
                color: "000000",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 800 },
            children: [
              new TextRun({
                text: "Studi Kasus: Ikatan Keluarga Mahasiswa Politeknik Kelapa Sawit Citra Widya Edukasi",
                bold: true,
                italics: true,
                font: "Times New Roman",
                size: 26, // 13pt
                color: "000000",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 600 },
            children: [
              new TextRun({
                text: "Diajukan sebagai salah satu syarat untuk menyelesaikan pendidikan\nProgram Sarjana Terapan (D4) Program Studi Teknologi Rekayasa Perangkat Lunak\nJurusan Komputasi dan Keteknikan Pertanian",
                font: "Times New Roman",
                size: 24, // 12pt
                color: "000000",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 100 },
            children: [
              new TextRun({
                text: "Disusun Oleh:",
                font: "Times New Roman",
                size: 24,
                color: "000000",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 50 },
            children: [
              new TextRun({
                text: "FELICH PEHAGA SAGINTING",
                bold: true,
                font: "Times New Roman",
                size: 28,
                color: "000000",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 50, after: 800 },
            children: [
              new TextRun({
                text: "NIM / ID Pengusul: Mahasiswa TRPL",
                font: "Times New Roman",
                size: 24,
                color: "000000",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1000, after: 100 },
            children: [
              new TextRun({
                text: "PROGRAM STUDI SARJANA TERAPAN\nTEKNOLOGI REKAYASA PERANGKAT LUNAK\nPOLITEKNIK KELAPA SAWIT CITRA WIDYA EDUKASI\nBEKASI\n2026",
                bold: true,
                font: "Times New Roman",
                size: 28, // 14pt
                color: "000000",
              }),
            ],
          }),
          new Paragraph({
            children: [new PageBreak()],
          }),
        ],
      },

      // ==========================================
      // SECTION 2: ISI UTAMA PROPOSAL
      // ==========================================
      {
        properties: {
          page: {
            margin: MARGINS,
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: "Times New Roman",
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // ------------------------------------------
          // BAB I: PENDAHULUAN
          // ------------------------------------------
          heading1("BAB I\nPENDAHULUAN"),

          heading2("1.1 Latar Belakang Masalah"),
          bodyP(
            "Pemilihan Umum Raya (Pemira) di lingkungan perguruan tinggi merupakan instrumen tertinggi perwujudan kedaulatan mahasiswa dalam memilih representasi kepemimpinan eksekutif dan legislatif. Pada Ikatan Keluarga Mahasiswa Politeknik Kelapa Sawit Citra Widya Edukasi (IKM Poltek CWE), suksesi kepemimpinan mahasiswa diatur secara sah dan berdaulat dalam Undang-Undang Dasar IKM Poltek CWE serta Ketetapan DPM No. 005/DPM-CWE/KEP/VII/2024 tentang Peraturan Penyelenggaraan Pemilihan Umum Raya (RUU Pemira). Regulasi konstitusional ini mengamanatkan terselenggaranya pesta demokrasi kampus yang berasaskan Langsung, Umum, Bebas, Rahasia, Jujur, dan Adil (LUBER JURDIL) guna menghasilkan pemimpin berintegritas tinggi yang mampu merepresentasikan aspirasi seluruh sivitas akademika mahasiswa."
          ),
          bodyP(
            "Secara historis, pelaksanaan Pemira di lingkungan kampus Poltek CWE diselenggarakan menggunakan metode pemungutan suara konvensional berbasis kertas (paper-based voting). Meskipun metode konvensional dinilai akrab dan mudah dipahami oleh mahasiswa awam, implementasi empirisnya di lapangan menunjukkan sejumlah kendala fundamental yang mendesak untuk diselesaikan. Pertama, pembiayaan pengadaan logistik kertas suara untuk tiga kategori surat suara secara serentak (Presiden Mahasiswa, Dewan Perwakilan Mahasiswa, dan Himpunan Mahasiswa Program Studi) menimbulkan beban anggaran kemahasiswaan yang substansial serta bertolak belakang dengan visi green campus dan keberlanjutan lingkungan. Kedua, proses penghitungan suara secara manual di Tempat Pemungutan Suara (TPS) memakan waktu berjam-jam hingga larut malam, sarat dengan potensi kesalahan manusia (human error), dan kerap memicu ketegangan fisik serta friksi antarsaksi pasangan calon akibat perbedaan interpretasi coblosan kertas suara rusak atau tidak sah."
          ),
          bodyP(
            "Sebagai respons atas permasalahan logistik dan efisiensi tersebut, Ketetapan DPM No. 005/DPM-CWE/KEP/VII/2024 Pasal 1 dan Pasal 3 secara eksplisit mengamanatkan pembentukan Tim Informasi dan Teknologi Pemira Online (Tim ITPO) untuk mengembangkan dan mengoperasikan sistem pemilihan berbasis teknologi digital (e-voting). Namun, penerapan teknologi e-voting di lingkungan kampus menghadapi tantangan teoretis dan teknis yang sangat pelik, yakni paradoks privasi pemilih (the voter-ballot privacy paradox). Pada banyak implementasi sistem voting elektronik konvensional berbasis web di perguruan tinggi, sistem mencatat nomor identitas mahasiswa (NIM) atau foreign key pemilih secara langsung ke dalam tabel penyimpanan surat suara dengan tujuan mencegah pemilih menggunakan hak suaranya lebih dari satu kali (double voting). Pencatatan identitas pada surat suara ini secara fatal menghancurkan asas 'Rahasia' dalam pemilu, sebab administrator sistem, teknisi basis data (DBA), maupun peretas dapat dengan mudah menelusuri pilihan politik setiap mahasiswa secara personal."
          ),
          bodyP(
            "Sebaliknya, apabila sistem e-voting dirancang murni anonim tanpa mengaitkan surat suara ke identitas pemilih, timbul risiko integritas data yang tidak kalah berbahayanya: sistem menjadi rentan terhadap injeksi suara fiktif, serangan penolakan layanan (Denial of Service), serangan manipulasi basis data internal, serta ketiadaan jejak audit (audit trail) yang dapat dipertanggungjawabkan apabila terjadi sengketa hasil pemilihan. Selain isu kerahasiaan, sistem e-voting kampus dituntut mampu mengeksekusi aturan hukum pemilihan yang sangat spesifik sebagaimana tercantum dalam konstitusi IKM Poltek CWE, antara lain: (1) skenario Calon Tunggal melawan entitas 'Kotak Kosong' yang wajib memperoleh suara sah mutlak lebih dari 50% untuk dinyatakan terpilih, dengan konsekuensi hukum 'Mandat Kembali ke Musyawarah Mahasiswa' apabila tidak mencapai ambang batas (UUD IKM Pasal 9 ayat 3 dan 4); (2) pemisahan hak pilih multi-ballot berdasarkan program studi secara ketat di sisi server (server-side assertion) guna mencegah kebocoran paslon lintas program studi (Budidaya Perkebunan Kelapa Sawit, Teknologi Pengolahan Sawit, Manajemen Logistik, Bisnis Digital, dan Teknologi Rekayasa Perangkat Lunak); serta (3) pencegahan manipulasi suara dini melalui mekanisme penguncian rekapitulasi hingga sidang pleno resmi dibuka oleh Komisi Pemilihan Umum Mahasiswa (KPUM)."
          ),
          bodyP(
            "Guna menjawab tantangan integritas, kerahasiaan, dan kepatuhan hukum tersebut, penelitian tugas akhir ini mengusulkan sebuah solusi rekayasa perangkat lunak bertajuk 'Smart Pemira (Sistem Informasi Pemilihan Umum Raya Terintegrasi)'. Smart Pemira dirancang dengan mengintegrasikan arsitektur Zero-Knowledge Ballot Isolation, rantai hash kriptografis SHA-256 (cryptographic hash chaining) per TPS virtual, otentikasi token sementara sekali pakai (single-use ephemeral CSPRNG token) berdurasi pendek, sistem penguncian pleno (Pleno Vault Lock), pengamanan otentikasi operator berbasis Two-Factor Authentication (2FA TOTP RFC 6238), dan penandatanganan dokumen Berita Acara Model C-KWE secara kanonikal berbasis algoritma asimetris Ed25519 (RFC 8032). Sistem ini juga menerapkan pola arsitektur basis data Dual-Mode (SQLite lokal untuk keandalan jaringan tertutup/on-premise LAN kampus dan Turso LibSQL Cloud untuk skalabilitas produksi serverless di Vercel)."
          ),

          heading2("1.2 Rumusan Masalah"),
          bodyP(
            "Berdasarkan latar belakang masalah yang telah diuraikan, rumusan masalah dalam penelitian tugas akhir ini didefinisikan sebagai berikut:",
            false
          ),
          listP(
            "1.",
            "Bagaimana merancang arsitektur basis data Zero-Knowledge Ballot Isolation yang memisahkan secara mutlak identitas pemilih (NIM) dari tabel rekaman surat suara (BallotBox), sehingga asas kerahasiaan pemilih terjamin 100% tanpa mengorbankan kemampuan sistem dalam mencegah penggunaan hak pilih ganda (double-voting)?"
          ),
          listP(
            "2.",
            "Bagaimana mengimplementasikan mekanisme audit kriptografi SHA-256 Hash Chaining yang bekerja secara atomik pada setiap transaksi pemungutan suara per TPS virtual guna mendeteksi manipulasi, penyisipan, atau penghapusan data suara pada level basis data (tamper-evident auditability)?"
          ),
          listP(
            "3.",
            "Bagaimana menerjemahkan aturan bisnis konstitusional IKM Poltek CWE ke dalam logika algoritma perangkat lunak, khususnya penanganan skenario Calon Tunggal vs Kotak Kosong (ambang batas > 50%), multi-ballot prodi filtering di level server, dan penguncian rekapitulasi suara (Pleno Vault Lock HTTP 423)?"
          ),
          listP(
            "4.",
            "Bagaimana membangun arsitektur keamanan akses operator berlapis menggunakan Role-Based Access Control (RBAC 5 peran), otentikasi dua faktor (2FA TOTP RFC 6238), dan penandatanganan Berita Acara Model C-KWE digital menggunakan kriptografi kunci publik Ed25519 (RFC 8032) yang dapat diverifikasi oleh publik?"
          ),
          listP(
            "5.",
            "Bagaimana kinerja dan keandalan sistem Smart Pemira ketika diuji terhadap beban transaksi pemungutan suara paralel secara simultan (concurrency test) serta diuji dalam skenario deployment cloud serverless menggunakan Turso LibSQL dan Vercel?"
          ),

          heading2("1.3 Batasan Masalah"),
          bodyP(
            "Agar ruang lingkup penelitian tetap terfokus, terukur, dan mendalam, batasan masalah dalam penelitian ini ditentukan sebagai berikut:",
            false
          ),
          listP(
            "a.",
            "Studi kasus dan pengujian sistem difokuskan pada lingkungan Ikatan Keluarga Mahasiswa Politeknik Kelapa Sawit Citra Widya Edukasi (IKM Poltek CWE), Bekasi."
          ),
          listP(
            "b.",
            "Kerangka hukum dan regulasi yang dijadikan acuan mutlak adalah UUD IKM Poltek CWE dan Ketetapan DPM No. 005/DPM-CWE/KEP/VII/2024 (RUU Pemira)."
          ),
          listP(
            "c.",
            "Kategori pemilihan yang diakomodasi mencakup tiga tingkatan: (1) Pasangan Calon Presiden dan Wakil Presiden Mahasiswa (BEM), (2) Pimpinan Dewan Perwakilan Mahasiswa (DPM), dan (3) Ketua Himpunan Mahasiswa Program Studi (HIMA) untuk 5 prodi aktif: TPTP/BKS, TPHP, MANLOG, BD, dan TRPL."
          ),
          listP(
            "d.",
            "Metode pemungutan suara mengakomodasi model hybrid on-premise (TPS Diam di lingkungan kampus dengan komputer Kiosk) serta kesiapan deployment cloud publik berbasis Next.js 16 App Router dan Turso LibSQL."
          ),
          listP(
            "e.",
            "Sistem tidak mencakup pemungutan suara melalui media biometrik sidik jari fisik, melainkan menggunakan verifikasi identitas resmi mahasiswa (KTM/KRS) di meja PPUR yang dilanjutkan dengan penerbitan token acak kriptografis (CSPRNG)."
          ),

          heading2("1.4 Tujuan Penelitian"),
          heading3("1.4.1 Tujuan Umum"),
          bodyP(
            "Tujuan umum dari penelitian ini adalah merancang, membangun, dan menguji sistem informasi e-voting terintegrasi 'Smart Pemira' yang menjamin asas LUBER JURDIL, memutus keterlacakan pilihan suara terhadap identitas pemilih, menyediakan audit kriptografi independen, dan mematuhi seluruh instrumen hukum pemilihan mahasiswa Poltek CWE."
          ),
          heading3("1.4.2 Tujuan Khusus"),
          bodyP(
            "Adapun tujuan khusus yang hendak dicapai dalam penelitian ini adalah:",
            false
          ),
          listP(
            "1.",
            "Membangun model relasional basis data Zero-Knowledge Ballot Isolation dengan mekanisme penerbitan token acak 6-karakter CSPRNG (bebas karakter ambigu) yang memiliki masa berlaku terbatas (TTL 10 menit) dan berstatus single-use."
          ),
          listP(
            "2.",
            "Mengembangkan modul cryptographic hash chaining berbasis SHA-256 dan time-jittering per TPS virtual yang menyambungkan setiap surat suara ke blok suara sebelumnya secara atomik dalam satu transaksi basis data."
          ),
          listP(
            "3.",
            "Mengimplementasikan modul pemrosesan aturan hukum pemilihan mencakup filter multi-ballot server-side untuk 5 program studi, kalkulasi persentase dan penentuan status Calon Tunggal vs Kotak Kosong (Pasal 9 ayat 3 & 4 UUD IKM), serta proteksi penguncian brankas pleno (Pleno Vault Lock HTTP 423)."
          ),
          listP(
            "4.",
            "Menerapkan sistem keamanan operator berlapis (RBAC 5 peran: ITPO, KPUM, PPUR, PANWASLU, SAKSI), autentikasi 2FA TOTP RFC 6238 terenkripsi AES-256-GCM dengan kode cadangan scrypt, serta modul penerbitan Berita Acara Model C-KWE bertanda tangan digital Ed25519 (RFC 8032) dengan verifikasi QR code."
          ),
          listP(
            "5.",
            "Mengevaluasi keandalan fungsional dan performa sistem melalui automated unit testing (43 test suite Vitest), pengujian konkurensi (30 voting serentak), dan pengujian integrasi deployment cloud serverless (Turso LibSQL + Vercel)."
          ),

          heading2("1.5 Manfaat Penelitian"),
          heading3("1.5.1 Manfaat Teoretis / Akademis"),
          bodyP(
            "1. Memberikan kontribusi ilmiah dalam bidang Rekayasa Perangkat Lunak (Software Engineering) dan Keamanan Siber (Cybersecurity), khususnya dalam perancangan arsitektur basis data Zero-Knowledge Isolation dan rantai hash audit mandiri pada aplikasi web modern tanpa memerlukan kompleksitas infrastruktur blockchain berbiaya tinggi."
          ),
          bodyP(
            "2. Menyediakan rujukan metodologis mengenai teknik penerjemahan aturan hukum dan konstitusi organisasi (legal statutory framework) ke dalam aturan bisnis kode program yang deterministik, terukur, dan tahan uji (tamper-evident)."
          ),
          heading3("1.5.2 Manfaat Praktis"),
          bodyP(
            "1. Bagi Komisi Pemilihan Umum Mahasiswa (KPUM) & Panwaslu Poltek CWE: Meningkatkan efisiensi kerja penyelenggara pemilu, memangkas biaya pengadaan logistik kertas suara hingga 100%, mengotomasi rekapitulasi suara dalam hitungan detik pasca-pleno dibuka, memfasilitasi monitoring live turnout tanpa melanggar privasi, serta mengeliminasi sengketa manipulasi surat suara."
          ),
          bodyP(
            "2. Bagi Mahasiswa Poltek CWE (Pemilih): Memberikan pengalaman pemungutan suara digital yang cepat, modern, ergonomis, bebas antrean panjang, serta memberikan jaminan psikologis dan teknis bahwa hak suara yang diberikan bersifat rahasia mutlak dan tidak dapat diintimidasi oleh pihak mana pun."
          ),
          bodyP(
            "3. Bagi Institusi Politeknik Kelapa Sawit Citra Widya Edukasi: Mewujudkan transformasi digital tata kelola demokrasi kampus yang profesional, transparan, dan dapat menjadi contoh percontohan sistem e-voting kredibel bagi perguruan tinggi vokasi lainnya di Indonesia."
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // ------------------------------------------
          // BAB II: TINJAUAN PUSTAKA & NOVELTY
          // ------------------------------------------
          heading1("BAB II\nTINJAUAN PUSTAKA DAN PENELITIAN TERDAHULU"),

          heading2("2.1 Landasan Teori"),
          heading3("2.1.1 Sistem Pemilihan Elektronik (E-Voting) dan Asas Demokrasi"),
          bodyP(
            "Sistem Pemilihan Elektronik (Electronic Voting / E-Voting) didefinisikan sebagai sistem pemilihan di mana proses pemberian suara, penyimpanan surat suara, dan penghitungan suara dilakukan dengan memanfaatkan teknologi informasi dan komunikasi (Sampigethaya & Poovendran, 2006). Standar internasional mensyaratkan sistem e-voting wajib memenuhi prinsip-prinsip fundamental demokrasi, yakni: ketepatan (accuracy), integritas data (integrity), kerahasiaan pilihan (ballot secrecy), kepemilikan hak pilih tunggal (one-person-one-vote / eligibility), ketersediaan (availability), dan auditabilitas independen (verifiability). Keberhasilan e-voting tidak semata-mata diukur dari kecepatannya dalam mengagregasi angka, melainkan dari tingkat kepercayaan publik (public trust) terhadap integritas sistem."
          ),
          heading3("2.1.2 Konsep Zero-Knowledge Architecture dan Blind Authentication"),
          bodyP(
            "Zero-Knowledge Architecture dalam konteks sistem basis data pemilu adalah pola perancangan di mana sistem mampu memvalidasi kelayakan seseorang untuk memberikan suara tanpa menyimpan korelasi apa pun antara entitas pemilih dan surat suara yang dihasilkan (Goldwasser et al., 1989). Pada penelitian ini, prinsip Zero-Knowledge diterapkan melalui pemisahan mutlak skema relasional: tabel Voter bertugas mencatat presensi mahasiswa di TPS (has_voted = TRUE), sedangkan tabel BallotBox bertugas menampung suara anonim. Jembatan sementara di antara kedua domain tersebut adalah VotingToken, yakni token sementara yang dihasilkan menggunakan algoritma Cryptographically Secure Pseudorandom Number Generator (CSPRNG) dengan masa aktif pendek (Time-To-Live / TTL 10 menit). Setelah pemilih menekan tombol submit di bilik suara, token tersebut langsung dimusnahkan (invalidated), dan suara disimpan ke kotak suara bersamaan dengan penambahan waktu acak (time-jitter) guna mencegah analisis korelasi waktu (traffic analysis attack)."
          ),
          heading3("2.1.3 Kriptografi Hashing SHA-256 dan Konstruksi Hash Chaining"),
          bodyP(
            "Secure Hash Algorithm 256-bit (SHA-256) merupakan fungsi hash satu arah berstandar FIPS 180-4 yang memetakan masukan data dengan panjang sembarang menjadi nilai digest berukuran 256 bit (32 byte) yang bersifat deterministik, resisten terhadap pre-image, dan bebas benturan (collision-resistant) (NIST, 2015). Dalam Smart Pemira, SHA-256 digunakan untuk membangun struktur rantai hash (hash chain) per TPS virtual prodi. Formula kalkulasi blok suara ke-n dirumuskan sebagai berikut:"
          ),
          formattedP(
            [
              { text: "Hash_n = SHA256( Hash_{n-1} || id_n || category_n || candidateId_n || isEmptyBox_n || timestamp_n || chainSalt )", bold: true, italic: true }
            ],
            false
          ),
          bodyP(
            "Di mana Hash_{n-1} merupakan nilai hash dari surat suara sebelumnya, dan chainSalt merupakan garam unik kriptografis yang diisolasi per TPS prodi. Mekanisme chaining ini menghasilkan struktur data tamper-evident: perubahan atau penghapusan satu baris suara di basis data akan secara instan merusak seluruh rantai berikutnya, sehingga dapat dideteksi secara otomatis oleh modul verifikator Panwaslu."
          ),
          heading3("2.1.4 Otentikasi Operator: RBAC, 2FA TOTP (RFC 6238), dan Tanda Tangan Ed25519 (RFC 8032)"),
          bodyP(
            "Pengamanan akses operasional sistem pemilu membutuhkan arsitektur berlapis (defense-in-depth). Role-Based Access Control (RBAC) diterapkan untuk membatasi kewenangan 5 aktor (ITPO, KPUM, PPUR, PANWASLU, SAKSI) pada tingkat antarmuka dan API endpoint. Guna melindungi akun administrator dari ancaman pembajakan kredensial (credential stuffing / phishing), sistem mengintegrasikan Two-Factor Authentication berbasis Time-Based One-Time Password (TOTP) sesuai spesifikasi RFC 6238 (M'Raihi et al., 2011). Rahasia TOTP disimpan di basis data menggunakan enkripsi simetris tingkat tinggi AES-256-GCM. Untuk pengesahan dokumen hukum Berita Acara Model C-KWE, sistem menerapkan tanda tangan digital berbasis Edwards-curve Digital Signature Algorithm (Ed25519) berstandar RFC 8032 (Bernstein et al., 2012) yang menawarkan kecepatan verifikasi tinggi, kekebalan terhadap serangan side-channel, serta ukuran tanda tangan yang ringkas (64 byte)."
          ),
          heading3("2.1.5 Arsitektur Modern Web Framework: Next.js 16, Prisma ORM, dan LibSQL Engine"),
          bodyP(
            "Implementasi perangkat lunak menggunakan framework Next.js 16 berbasis App Router dan engine compiler Turbopack. Interaksi basis data dikelola melalui Prisma ORM 6 yang menyediakan type-safety penuh pada waktu kompilasi (compile-time type validation). Untuk mendukung portabilitas implementasi, sistem mengadopsi arsitektur basis data Dual-Mode melalui Prisma Driver Adapter (@prisma/adapter-libsql): pada mode offline/LAN kampus, sistem memanfaatkan basis data lokal SQLite terisolasi; sedangkan pada mode cloud production, sistem terhubung ke database terdistribusi Turso LibSQL yang menawarkan persistensi serverless berlatensi rendah dan kompatibilitas 100% terhadap dialek SQLite."
          ),

          heading2("2.2 Penelitian Terdahulu (Literature Review)"),
          bodyP(
            "Guna meletakkan posisi ilmiah penelitian ini dalam peta riset sistem e-voting yang telah ada, dilakukan telaah sistematis terhadap sejumlah penelitian terdahulu yang relevan sebagaimana disajikan pada Tabel 2.1."
          ),

          // TABEL PENELITIAN TERDAHULU (HITAM PUTIH AKADEMIS)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({
                    width: { size: 6, type: WidthType.PERCENTAGE },
                    shading: { fill: "EEEEEE", type: ShadingType.CLEAR },
                    borders: BORDER_STYLE_SOLID,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "No", bold: true, font: "Times New Roman", size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    shading: { fill: "EEEEEE", type: ShadingType.CLEAR },
                    borders: BORDER_STYLE_SOLID,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "Peneliti & Tahun", bold: true, font: "Times New Roman", size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 24, type: WidthType.PERCENTAGE },
                    shading: { fill: "EEEEEE", type: ShadingType.CLEAR },
                    borders: BORDER_STYLE_SOLID,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "Judul & Fokus Penelitian", bold: true, font: "Times New Roman", size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { fill: "EEEEEE", type: ShadingType.CLEAR },
                    borders: BORDER_STYLE_SOLID,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "Metode / Arsitektur", bold: true, font: "Times New Roman", size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { fill: "EEEEEE", type: ShadingType.CLEAR },
                    borders: BORDER_STYLE_SOLID,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "Kelemahan / Research Gap", bold: true, font: "Times New Roman", size: 20 })],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1", size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Pratama & Nugroho (2021)", bold: true, size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Rancang Bangun E-Voting Pemilihan BEM Berbasis Web", size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "PHP Native, MySQL, otentikasi login NIM dan password.", size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Identitas pemilih terikat langsung dengan data suara di database. Tidak ada pemisahan zero-knowledge dan tanpa audit kriptografi.", size: 18 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "2", size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Hidayat et al. (2022)", bold: true, size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Sistem Pemilu Elektronik Mahasiswa Berbasis Blockchain Ethereum", size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Solidity Smart Contract, Ethereum Testnet, Web3.js.", size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Biaya transaksi (gas fee) tinggi, throughput transaksi lambat (latensi penambangan blok >15 detik), serta sulit dioperasikan pada LAN kampus terisolasi.", size: 18 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "3", size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Wahyudi & Santoso (2023)", bold: true, size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Penerapan Blind Signature pada Sistem Pemilihan Umum Kampus", size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Kriptografi Kunci Asimetris RSA Blind Signature, Node.js.", size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Kompleksitas kalkulasi matematis kunci besar, tidak mengakomodasi aturan bisnis pemilihan khusus (calon tunggal & multi-ballot prodi), dan dokumen hasil tidak tersertifikasi digital.", size: 18 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "4", size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Kusuma & Ramadhan (2024)", bold: true, size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Auditabilitas Pemilu Kampus Menggunakan SHA-256 Hash Chaining", size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Python Flask, SQLite, satu rantai hash tunggal terpusat.", size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Satu rantai hash global menimbulkan bottleneck saat konkurensi TPS meningkat. Belum ada isolasi per-TPS, belum ada 2FA, dan rekapitulasi belum dikunci brankas pleno.", size: 18 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "5", size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Smart Pemira (Penelitian Ini, 2026)", bold: true, size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Zero-Knowledge Ballot Isolation, Multi-Chain Hash SHA-256, Ed25519, 2FA, Dual-Mode Database.", size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Next.js 16, Prisma ORM 6, LibSQL/SQLite, CSPRNG Token TTL, Ed25519 Signing, Pleno Vault Lock 423.", size: 18 })] })],
                  }),
                  new TableCell({
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ children: [new TextRun({ text: "Menjawab seluruh kelemahan di atas: throughput tinggi tanpa gas fee, zero-knowledge mutlak, multi-chain per prodi, dan 100% patuh regulasi UUD IKM.", size: 18 })] })],
                  }),
                ],
              }),
            ],
          }),

          heading2("2.3 Kebaruan Penelitian (Novelty)"),
          bodyP(
            "Penelitian ini menawarkan lima poin kebaruan ilmiah dan rekayasa teknologi (novelty) yang membedakan Smart Pemira secara signifikan dari karya-karya sebelumnya:",
            false
          ),
          listP(
            "1.",
            "Arsitektur Zero-Knowledge Ephemeral Token dengan Time-Jittering: Berbeda dari sistem e-voting kampus pada umumnya yang merekam ID pemilih pada surat suara, sistem ini memutus relasi data pemilih dan surat suara secara arsitektural di level skema basis data. Pemilih diverifikasi di meja registrasi dan diberikan token CSPRNG sekali pakai ber-TTL 10 menit. Saat submit di bilik suara, waktu pencatatan suara diberi pengacakan mikro-detik/detik (time-jitter) untuk memutus korelasi analisis lalu lintas (traffic timing analysis) terhadap waktu presensi di meja PPUR."
          ),
          listP(
            "2.",
            "Multi-Chain SHA-256 Hash Chaining per TPS Virtual: Sebagai alternatif dari teknologi blockchain yang berat, mahal, dan berlatensi tinggi, Smart Pemira menerapkan rantai hash SHA-256 terisolasi per program studi/TPS virtual. Pendekatan ini menghasilkan performa throughput kilat (<50 milidetik per transaksi suara) tanpa biaya gas (zero-cost), dengan tetap mempertahankan derajat auditabilitas anti-manipulasi (tamper-evident immutable ledger) setara blockchain."
          ),
          listP(
            "3.",
            "Penerjemahan Logika Yuridis Konstitusi Kampus (Strict Juridical Logic Translation): Sistem ini secara otomatis mengakomodasi aturan bisnis pemilu yang kompleks sesuai amanat Pasal 9 ayat (3) dan (4) UUD IKM Poltek CWE. Jika terjadi skenario Calon Tunggal, sistem otomatis menginjeksi opsi 'Kotak Kosong' di antarmuka dan menerapkan kalkulasi batas kemenangan mutlak >50%. Jika perolehan <=50%, sistem secara deterministik mengeluarkan putusan sistemik 'MANDAT KEMBALI KE MUSYAWARAH MAHASISWA'. Selain itu, penyaringan hak pilih multi-ballot (Presma, DPM, HIMA) divalidasi ketat di sisi server (zero client leakage)."
          ),
          listP(
            "4.",
            "Kriptografi Pleno Vault Lock & Tanda Tangan Digital Kanonikal Ed25519: Hasil rekapitulasi suara dikunci secara mutlak pada tingkat protokol API (HTTP 423 Locked) selama masa pemungutan berlangsung guna mencegah kebocoran tren elektoral dini. Pasca-pembukaan kunci resmi oleh Ketua KPUM, sistem menghasilkan dokumen Berita Acara Model C-KWE yang ditandatangani secara kriptografis menggunakan algoritma Ed25519 (RFC 8032) dengan QR code verifikasi publik dua lapis (integritas SHA-256 dan otentisitas penandatangan Ed25519)."
          ),
          listP(
            "5.",
            "Arsitektur Basis Data Dual-Mode dan Antarmuka Ergonomis Dual-Environment: Sistem dirancang menggunakan pola adapter dual-mode pada lapisan basis data, memungkinkan eksekusi secara offline di LAN tertutup kampus (SQLite on-premise) demi kekebalan terhadap serangan siber eksternal pada hari-H pemilihan, sekaligus mendukung deployment produksi cloud serverless global (Turso LibSQL di Vercel). Antarmuka pengguna mengadopsi polaritas tema ganda: Warm Oat Milk (#F6F4EE) pada bilik suara untuk kenyamanan visual pemilih dan Obsidian Forest (#0D1512) pada layar pleno dan monitor Panwaslu untuk penayangan sinematik bebas silau."
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // ------------------------------------------
          // BAB III: METODOLOGI PENELITIAN
          // ------------------------------------------
          heading1("BAB III\nMETODOLOGI PENELITIAN DAN ARSITEKTUR SISTEM"),

          heading2("3.1 Metode Pengembangan Sistem"),
          bodyP(
            "Penelitian ini menerapkan model pengembangan perangkat lunak Iterative-Incremental Agile yang dipandu oleh spesifikasi kebutuhan produk (Product Requirement Document / PRD) dan kepatuhan mutlak pada Lima Hukum Arsitektur Sistem (Five Non-Negotiable Architectural Laws). Setiap fase pengembangan dimulai dari perancangan skema data, pengkodean logika layanan, pengujian unit otomatis, hingga verifikasi terpadu sebelum beralih ke tahapan berikutnya."
          ),

          heading2("3.2 Analisis Kebutuhan Sistem"),
          heading3("3.2.1 Kebutuhan Fungsional (Functional Requirements)"),
          bodyP(
            "Sistem Smart Pemira dikelompokkan ke dalam delapan modul fungsional utama:",
            false
          ),
          listP(
            "FR-01",
            "Manajemen Konfigurasi & Tahapan: Pengaturan rentang waktu tahapan pemilu dan tombol darurat pembekuan operasional (Emergency Freeze)."
          ),
          listP(
            "FR-02",
            "Manajemen DPT: Import massal data mahasiswa dari berkas CSV/Excel, pencegahan NIM ganda, dan pelacakan status pemilih (BELUM_MEMILIH, DALAM_ANTREAN, SUDAH_MEMILIH)."
          ),
          listP(
            "FR-03",
            "Manajemen Kandidat & Surat Suara: Pengelolaan profil paslon Presma, DPM, dan HIMA, serta otomasi opsi Kotak Kosong pada calon tunggal."
          ),
          listP(
            "FR-04",
            "Otentikasi & Penerbitan Token PPUR: Pencarian DPT di meja registrasi, pencocokan KTM, dan penerbitan token acak 6-karakter CSPRNG (TTL 10 menit, single-use)."
          ),
          listP(
            "FR-05",
            "Kiosk Bilik Suara: Antarmuka bilik suara digital layar penuh, wizard 3 tahapan surat suara terfilter program studi, keypad virtual, dan layar tinjau pilihan."
          ),
          listP(
            "FR-06",
            "Kotak Suara Digital & Rekapitulasi: Penyimpanan suara teracak, penguncian brankas hasil pleno (HTTP 423 Locked), dan otomasi kalkulasi kemenangan."
          ),
          listP(
            "FR-07",
            "Berita Acara Model C-KWE: Otomasi penyusunan dokumen digital hasil pemilu, penandatanganan digital Ed25519, dan ekspor dokumen PDF berstempel QR."
          ),
          listP(
            "FR-08",
            "Pengawasan Panwaslu & Audit Log: Live audit trail aliran pemilih, verifikasi keutuhan rantai hash SHA-256, pusat peringatan operasional otomatis (Alert Center), dan modul sengketa pemilu daring."
          ),

          heading3("3.2.2 Kebutuhan Non-Fungsional (Non-Functional Requirements)"),
          bodyP(
            "1. Keamanan: Seluruh transaksi suara terisolasi zero-knowledge; token sensitif di-hash SHA-256; password operator di-hash scrypt; rahasia 2FA dienkripsi AES-256-GCM; integritas audit log append-only."
          ),
          bodyP(
            "2. Kinerja & Throughput: Waktu respons pengiriman suara di bilik Kiosk berada di bawah 500 milidetik; mampu menangani transaksi pemungutan suara paralel tanpa kegagalan koneksi basis data."
          ),
          bodyP(
            "3. Aksesibilitas & Ergonomi: Memenuhi kepatuhan kontras warna WCAG AA; mendukung navigasi layar sentuh (touchscreen) dan keyboard fisik; antarmuka mobile-responsive bebas pergeseran tata letak (zero Cumulative Layout Shift)."
          ),

          heading2("3.3 Perancangan Arsitektur Basis Data Zero-Knowledge"),
          bodyP(
            "Untuk menegakkan Hukum 1 (Zero-Knowledge Ballot Isolation), basis data dirancang dengan memisahkan domain identitas pemilih dari domain kotak suara digital sebagaimana dijelaskan pada struktur model konseptual berikut:"
          ),
          bodyP(
            "1. Domain Identitas Pemilih: Tabel 'Voter' menyimpan data mahasiswa (id, nim, name, angkatan, studyProgramId, tpsId, status, hasVoted, votedAt, pendingTokenHash). Tabel ini TIDAK memiliki relasi apa pun ke tabel BallotBox."
          ),
          bodyP(
            "2. Domain Token Ephemeral: Tabel 'VotingToken' menyimpan token transaksi (id, tokenHash, tpsId, studyProgramId, status, issuedAt, expiresAt, usedAt, lockedAt, revoteCount). Token di-hash menggunakan SHA-256 dan hanya menyimpan metadata hak prodi untuk validasi server-side."
          ),
          bodyP(
            "3. Domain Kotak Suara Digital: Tabel 'BallotBox' menyimpan suara anonim (id, category, candidateId, isEmptyBox, tpsId, tokenId, voteVersion, createdAt, ballotHash). Kolom candidateId dan tokenId berstatus opsional dan tidak dapat ditautkan ke identitas pemilih."
          ),
          bodyP(
            "4. Domain Keamanan Operator: Tabel 'Operator' menyimpan akun petugas (username, passwordHash, role, fullName, tpsId, isActive, totpSecret, backupCodesJson) yang diikat dengan mekanisme otentikasi scrypt dan 2FA TOTP."
          ),

          heading2("3.4 Transaksi Atomik Pemungutan Suara (Atomic Submission Flow)"),
          bodyP(
            "Penegakan integritas data pada saat pemilih menekan tombol submit di bilik suara diatur melalui transaksi atomik 6-langkah (Hukum 2):",
            false
          ),
          listP("Langkah 1", "Sistem memvalidasi status token pada tabel VotingToken (wajib ACTIVE dan waktu saat ini < expiresAt)."),
          listP("Langkah 2", "Sistem memvalidasi kecocokan payload surat suara HIMA yang dikirim dengan studyProgramId pada token pemilih (Server-Side Assertion)."),
          listP("Langkah 3", "Sistem mengambil head hash terakhir dari tabel Tps (lastChainHash) dengan salt unik chainSalt."),
          listP("Langkah 4", "Sistem menghitung ballotHash baru secara berantai menggunakan algoritma SHA-256 dan menyisipkan 3 rekaman surat suara ke tabel BallotBox dengan timestamp jitter."),
          listP("Langkah 5", "Sistem memperbarui lastChainHash pada tabel Tps dengan nilai hash surat suara terbaru."),
          listP("Langkah 6", "Sistem menandai token menjadi USED dan mencatat event VOTING_COMPLETED pada tabel AuditLog (append-only) tanpa mencatat pilihan calon."),

          heading2("3.5 Rencana Pengujian (Testing Strategy)"),
          bodyP(
            "Strategi verifikasi kualitas perangkat lunak dilaksanakan melalui empat pilar pengujian:",
            false
          ),
          listP(
            "a.",
            "Automated Unit Testing: Menguji seluruh fungsi kriptografi (token generator, time-jitter, hash chaining SHA-256, RFC 6238 TOTP, dan RFC 8032 Ed25519) menggunakan test harness Vitest 5 yang mencakup 43 kasus uji otomatis."
          ),
          listP(
            "b.",
            "Concurrency & Parallel Stress Testing: Melakukan simulasi pengiriman suara paralel (30 token disubmit secara simultan) untuk menguji keandalan penanganan transaksi atomik dan keutuhan integritas rantai hash pada basis data."
          ),
          listP(
            "c.",
            "End-to-End Workflow Verification: Menguji alur operasional penuh dari meja registrasi PPUR, bilik Kiosk, pembukaan kunci pleno KPUM, hingga penandatanganan Berita Acara dan pelaporan sengketa Panwaslu."
          ),
          listP(
            "d.",
            "Cloud Deployment & Dual-Mode Verification: Menguji performa sistem pada platform serverless Next.js 16 di Vercel yang terhubung ke cloud database Turso LibSQL di kawasan Asia Tenggara (Singapore)."
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // ------------------------------------------
          // BAB IV: RENCANA JADWAL PELAKSANAAN
          // ------------------------------------------
          heading1("BAB IV\nRENCANA JADWAL PELAKSANAAN PENELITIAN"),
          bodyP(
            "Pelaksanaan penelitian dan pengembangan sistem Smart Pemira direncanakan berlangsung selama 5 (lima) bulan dengan rincian jadwal kegiatan sebagaimana disajikan pada Tabel 4.1."
          ),

          // TABEL JADWAL PELAKSANAAN (HITAM PUTIH AKADEMIS)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({
                    width: { size: 8, type: WidthType.PERCENTAGE },
                    shading: { fill: "EEEEEE", type: ShadingType.CLEAR },
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "No", bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    width: { size: 42, type: WidthType.PERCENTAGE },
                    shading: { fill: "EEEEEE", type: ShadingType.CLEAR },
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tahapan Kegiatan", bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    shading: { fill: "EEEEEE", type: ShadingType.CLEAR },
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Bln 1", bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    shading: { fill: "EEEEEE", type: ShadingType.CLEAR },
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Bln 2", bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    shading: { fill: "EEEEEE", type: ShadingType.CLEAR },
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Bln 3", bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    shading: { fill: "EEEEEE", type: ShadingType.CLEAR },
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Bln 4", bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    shading: { fill: "EEEEEE", type: ShadingType.CLEAR },
                    borders: BORDER_STYLE_SOLID,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Bln 5", bold: true, size: 20 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ children: [new TextRun({ text: "Studi Literatur & Analisis Landasan Yuridis (UUD IKM & RUU Pemira)", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "✓", bold: true, size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "2", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ children: [new TextRun({ text: "Perancangan Skema Zero-Knowledge & Desain Antarmuka Hybrid", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "✓", bold: true, size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "✓", bold: true, size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "3", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ children: [new TextRun({ text: "Implementasi Modul Kriptografi (Hash Chain SHA-256, 2FA, Ed25519)", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "✓", bold: true, size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "✓", bold: true, size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "4", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ children: [new TextRun({ text: "Pengembangan Frontend Next.js 16 & Antarmuka Multi-Terminal", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "✓", bold: true, size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "✓", bold: true, size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "5", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ children: [new TextRun({ text: "Pengujian Konkurensi Paralel, Simulasi Pleno, & Migrasi Turso Cloud", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "✓", bold: true, size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "✓", bold: true, size: 18 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "6", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ children: [new TextRun({ text: "Penyusunan Laporan Tugas Akhir & Dokumentasi Ilmiah Lengkap", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "", size: 18 })] })] }),
                  new TableCell({ borders: BORDER_STYLE_SOLID, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "✓", bold: true, size: 18 })] })] }),
                ],
              }),
            ],
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // ------------------------------------------
          // DAFTAR PUSTAKA
          // ------------------------------------------
          heading1("DAFTAR PUSTAKA"),

          bodyP(
            "Bernstein, D. J., Duif, N., Lange, T., Schwabe, P., & Yang, B. Y. (2012). High-speed high-security signatures. Journal of Cryptographic Engineering, 2(2), 77-89. https://doi.org/10.1007/s13389-012-0027-1",
            false
          ),
          bodyP(
            "Dewan Perwakilan Mahasiswa Politeknik Kelapa Sawit Citra Widya Edukasi. (2024). Ketetapan DPM No. 005/DPM-CWE/KEP/VII/2024 tentang Peraturan Penyelenggaraan Pemilihan Umum Raya Mahasiswa (RUU Pemira). Bekasi: DPM Poltek CWE.",
            false
          ),
          bodyP(
            "Goldwasser, S., Micali, S., & Rackoff, C. (1989). The knowledge complexity of interactive proof systems. SIAM Journal on Computing, 18(1), 186-208. https://doi.org/10.1137/0218012",
            false
          ),
          bodyP(
            "Hidayat, T., Mahardika, F., & Raharjo, S. (2022). Implementasi Smart Contract Ethereum pada Sistem E-Voting Pemilihan Ketua BEM Perguruan Tinggi. Jurnal Teknologi Informasi dan Ilmu Komputer (JTIIK), 9(4), 815-824. https://doi.org/10.25126/jtiik.2022944890",
            false
          ),
          bodyP(
            "Ikatan Keluarga Mahasiswa Politeknik Kelapa Sawit Citra Widya Edukasi. (2023). Undang-Undang Dasar Ikatan Keluarga Mahasiswa Politeknik Kelapa Sawit Citra Widya Edukasi. Bekasi: IKM Poltek CWE.",
            false
          ),
          bodyP(
            "Kusuma, A. P., & Ramadhan, M. (2024). Auditabilitas Sistem Pemilihan Elektronik Kampus Menggunakan Hash Chaining Berbasis SHA-256. Jurnal Sistem Komputer dan Informatika (JSON), 5(3), 432-441. https://doi.org/10.30865/json.v5i3.7312",
            false
          ),
          bodyP(
            "M'Raihi, D., Machani, S., Pei, M., & Rydell, J. (2011). TOTP: Time-Based One-Time Password Algorithm. RFC 6238, Internet Engineering Task Force (IETF). https://doi.org/10.17487/RFC6238",
            false
          ),
          bodyP(
            "National Institute of Standards and Technology (NIST). (2015). Secure Hash Standard (SHS). Federal Information Processing Standards Publication (FIPS PUB 180-4). U.S. Department of Commerce.",
            false
          ),
          bodyP(
            "Nielsen, J., & Budiu, R. (2013). Mobile Usability. Berkeley, CA: New Riders.",
            false
          ),
          bodyP(
            "Pratama, R. A., & Nugroho, E. (2021). Pengembangan Sistem Informasi E-Voting Berbasis Web pada Pemilihan Mahasiswa. Jurnal Nasional Pendidikan Teknik Informatika (JANAPATI), 10(2), 112-121.",
            false
          ),
          bodyP(
            "Prisma Data Platform. (2024). Prisma Documentation: Driver Adapters for LibSQL and Turso Serverless SQLite. Diakses dari https://www.prisma.io/docs/orm/overview/databases/turso",
            false
          ),
          bodyP(
            "Sampigethaya, K., & Poovendran, R. (2006). A framework and taxonomy for comparison of electronic voting schemes. Computers & Security, 25(2), 137-153. https://doi.org/10.1016/j.cose.2005.10.003",
            false
          ),
          bodyP(
            "Sommerville, I. (2016). Software Engineering (10th ed.). Boston: Pearson Education.",
            false
          ),
          bodyP(
            "Turso Technologies. (2024). LibSQL: An Open-Source Fork of SQLite for Serverless Cloud Architectures. Diakses dari https://turso.tech/libsql",
            false
          ),
          bodyP(
            "Vercel Inc. (2024). Next.js 16 Documentation: Server Actions, Streaming, and App Router Optimization. Diakses dari https://nextjs.org/docs",
            false
          ),
          bodyP(
            "Wahyudi, T., & Santoso, B. (2023). Implementasi Protokol Blind Signature untuk Menjamin Kerahasiaan Pemilih pada Sistem E-Voting. Jurnal RESTI (Rekayasa Sistem dan Teknologi Informasi), 7(1), 145-152. https://doi.org/10.29207/resti.v7i1.4820",
            false
          ),
          bodyP(
            "World Wide Web Consortium (W3C). (2018). Web Content Accessibility Guidelines (WCAG) 2.1. W3C Recommendation. Diakses dari https://www.w3.org/TR/WCAG21/",
            false
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.resolve(__dirname, "..", "Proposal_Tugas_Akhir_Smart_Pemira_PoltekCWE.docx");
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ File Proposal DOCX berhasil dibuat di: ${outPath}`);
}

generate().catch((err) => {
  console.error("❌ Gagal membuat DOCX:", err);
  process.exit(1);
});
