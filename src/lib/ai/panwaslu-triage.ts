// ============================================================
// MODUL TRIASE SENGKETA PANWASLU — SMART PEMIRA POLTEK CWE
// Berbasis TypeSafe AI (System One Decision Primitives: Choice, Score, Noul)
// Dilengkapi Deterministic Local Heuristic Fallback (100% Offline Resilience)
// ============================================================

export type IncidentCategory =
  | "ADMINISTRATIF"
  | "KAMPANYE_HITAM"
  | "INTIMIDASI_TPS"
  | "MALFUNGSI_SISTEM"
  | "SPAM_IRRELEVAN";

export type SeverityLevel =
  | "SANGAT_RINGAN"
  | "RINGAN"
  | "SEDANG"
  | "BERAT"
  | "KRITIS";

export interface ChoiceResult<T extends string = string> {
  value: T;
  probabilities: Record<T, number>;
  confidence: number; // 0.0 to 1.0
}

export interface ScoreResult {
  score: number; // 1.0 to 5.0
  level: SeverityLevel;
  probabilities: Record<SeverityLevel, number>;
  confidence: number; // 0.0 to 1.0
}

export interface NoulResult {
  probability: number; // 0.0 to 1.0 (probability that condition is true)
  requiresEmergencyFreeze: boolean;
  threshold: number; // 0.70
  reasoning: string;
}

export interface IncidentTriageInput {
  title?: string;
  description: string;
  location?: string;
  reporterRole?: string;
  reporterNim?: string;
  evidenceUrls?: string[];
  reportedAt?: string;
}

export interface PanwasluTriageReport {
  ticketNumber?: string;
  classification: ChoiceResult<IncidentCategory>;
  severity: ScoreResult;
  freezeRecommendation: NoulResult;
  recommendedAction: string;
  source: "typesafe_ai" | "deterministic_heuristic";
  evaluatedAt: string;
}

const CATEGORY_CHOICES: IncidentCategory[] = [
  "ADMINISTRATIF",
  "KAMPANYE_HITAM",
  "INTIMIDASI_TPS",
  "MALFUNGSI_SISTEM",
  "SPAM_IRRELEVAN",
];

const SEVERITY_LEVELS: SeverityLevel[] = [
  "SANGAT_RINGAN",
  "RINGAN",
  "SEDANG",
  "BERAT",
  "KRITIS",
];

// Kata kunci pemicu kegagalan kritis dan ancaman kekerasan ekstrem
const CRITICAL_SYSTEM_TRIGGERS = [
  "database corrupt", "database rusak", "hash chain putus", "rantai hash rusak",
  "server crash", "tamper", "injeksi", "exploit", "offline total"
];

const CRITICAL_VIOLENCE_TRIGGERS = [
  "senjata", "golok", "bakar", "kekerasan fisik", "sandera", "rusuh massal", "pukul"
];

// Kata kunci pendeteksi heuristik deterministik
const KEYWORDS: Record<IncidentCategory, string[]> = {
  INTIMIDASI_TPS: [
    "ancam", "intimidasi", "preman", "kekerasan", "pukul", "senjata",
    "golok", "hadang", "halangi", "teror", "paksa", "rusuh",
    "dobrak", "bilik", "sita", "serang", "ancaman", "fisik",
    "bakar", "lempar", "sandera", "suppression"
  ],
  MALFUNGSI_SISTEM: [
    "sistem down", "server down", "server crash", "database corrupt",
    "database rusak", "hash chain putus", "rantai hash rusak", "error 500",
    "layar putih", "token gagal", "tidak bisa login", "bug sistem",
    "api timeout", "tamper", "bocor", "sistem mati", "server mati",
    "koneksi terputus", "ddos", "injeksi", "exploit", "crash",
    "gagal submit", "offline total"
  ],
  KAMPANYE_HITAM: [
    "black campaign", "kampanye hitam", "fitnah", "hoax", "politik uang",
    "money politics", "suap", "sembako", "bagi uang", "amplop",
    "pamflet gelap", "serangan fajar", "menjelekkan", "pencemaran nama baik",
    "dokumen palsu", "isu sara", "ujaran kebencian", "hasut", "buzzer"
  ],
  ADMINISTRATIF: [
    "syarat berkas", "terlambat", "surat mandat", "tata tertib", "absensi",
    "dpt bermasalah", "nama tidak terdaftar", "prosedur", "saksi terlambat",
    "id card hilang", "formulir", "berita acara", "administrasi", "jadwal",
    "registrasi", "kartu tanda mahasiswa", "ktm", "verifikasi manual"
  ],
  SPAM_IRRELEVAN: [
    "test", "testing", "halo", "coba", "asdf", "lorem ipsum", "beli pulsa",
    "slot gacor", "judi", "promo", "pinjol", "mabar", "mobile legends",
    "jual obat", "iseng", "tes 123", "cek sound"
  ],
};

const AGGRAVATING_KEYWORDS = [
  "massal", "seluruh kampus", "semua tps", "lumpuh", "rusuh total",
  "darurat", "fatal", "korban", "merajalela", "tidak terkendali"
];

const MITIGATING_KEYWORDS = [
  "sudah selesai", "minor", "terkendali", "hanya satu", "salah paham",
  "dapat diatasi", "laporan sementara", "klarifikasi"
];

/**
 * Heuristik Deterministik Lokal untuk evaluasi System One
 * Berfungsi 100% tanpa internet ketika TYPESAFE_API_KEY tidak dikonfigurasi.
 */
export function evaluateDeterministicHeuristic(
  input: IncidentTriageInput
): PanwasluTriageReport {
  const fullText = `${input.title ?? ""} ${input.description} ${input.location ?? ""}`.toLowerCase();
  const trimmedDesc = input.description.trim().toLowerCase();

  // 1. Primitive CHOICE: Klasifikasi Kategori
  const rawScores: Record<IncidentCategory, number> = {
    ADMINISTRATIF: 0.1,
    KAMPANYE_HITAM: 0.1,
    INTIMIDASI_TPS: 0.1,
    MALFUNGSI_SISTEM: 0.1,
    SPAM_IRRELEVAN: 0.1,
  };

  if (trimmedDesc.length < 15) {
    rawScores.SPAM_IRRELEVAN += 2.0;
  }

  for (const cat of CATEGORY_CHOICES) {
    for (const kw of KEYWORDS[cat]) {
      if (fullText.includes(kw)) {
        rawScores[cat] += kw.includes(" ") ? 2.5 : 1.5;
      }
    }
  }

  // Safety invariant: pemicu kritis mendapat prioritas agar spam/filler kata tidak mengalihkan alarm keamanan
  const hasCriticalSystem = CRITICAL_SYSTEM_TRIGGERS.some((trig) => fullText.includes(trig));
  const hasCriticalViolence = CRITICAL_VIOLENCE_TRIGGERS.some((trig) => fullText.includes(trig));

  if (hasCriticalSystem) {
    rawScores.MALFUNGSI_SISTEM += 8.0;
    rawScores.SPAM_IRRELEVAN = 0;
  }
  if (hasCriticalViolence) {
    rawScores.INTIMIDASI_TPS += 8.0;
    rawScores.SPAM_IRRELEVAN = 0;
  }

  // Normalisasi skor kategori menjadi probabilitas terkalibrasi (softmax-like)
  const expScores: Record<IncidentCategory, number> = {
    ADMINISTRATIF: Math.exp(rawScores.ADMINISTRATIF),
    KAMPANYE_HITAM: Math.exp(rawScores.KAMPANYE_HITAM),
    INTIMIDASI_TPS: Math.exp(rawScores.INTIMIDASI_TPS),
    MALFUNGSI_SISTEM: Math.exp(rawScores.MALFUNGSI_SISTEM),
    SPAM_IRRELEVAN: Math.exp(rawScores.SPAM_IRRELEVAN),
  };
  const sumExp = Object.values(expScores).reduce((a, b) => a + b, 0);

  let selectedCategory: IncidentCategory = "ADMINISTRATIF";
  let maxP = -1;
  const probabilities: Record<IncidentCategory, number> = {} as any;

  for (const cat of CATEGORY_CHOICES) {
    const p = Math.round((expScores[cat] / sumExp) * 1000) / 1000;
    probabilities[cat] = p;
    if (p > maxP) {
      maxP = p;
      selectedCategory = cat;
    }
  }

  // Ensure total probability sums to exactly 1.0
  const curSum = Object.values(probabilities).reduce((a, b) => a + b, 0);
  probabilities[selectedCategory] = Math.round((probabilities[selectedCategory] + (1.0 - curSum)) * 1000) / 1000;

  const sortedPs = Object.values(probabilities).sort((a, b) => b - a);
  const choiceConfidence = Math.min(1.0, Math.max(0.4, Number((sortedPs[0] - (sortedPs[1] || 0) + 0.3).toFixed(2))));

  // 2. Primitive NOUL: Evaluasi Rekomendasi Emergency Freeze (evaluasi independen atas state teks)
  let freezeProbability = 0.02;
  let freezeReason = "Tidak ada indikasi ancaman fatal terhadap integritas pemilihan.";

  if (hasCriticalSystem) {
    freezeProbability = 0.94;
    freezeReason = "Terdeteksi kegagalan sistem kritis pada basis data atau integritas rantai hash.";
  } else if (hasCriticalViolence) {
    freezeProbability = 0.95;
    freezeReason = "Terdeteksi ancaman kekerasan fisik dan anarki di area TPS yang membahayakan pemilih.";
  } else if (selectedCategory === "MALFUNGSI_SISTEM") {
    freezeProbability = 0.78;
    freezeReason = "Malfungsi sistem berbobot berat yang berisiko menghentikan proses pemberian suara.";
  } else if (selectedCategory === "INTIMIDASI_TPS") {
    freezeProbability = 0.76;
    freezeReason = "Intimidasi serius terhadap petugas atau pemilih yang merusak asas bebas dan rahasia.";
  } else if (selectedCategory === "KAMPANYE_HITAM" && fullText.includes("serangan fajar massal")) {
    freezeProbability = 0.45;
    freezeReason = "Dugaan pelanggaran kampanye berat, namun pembekuan hanya opsional.";
  }

  freezeProbability = Number(freezeProbability.toFixed(2));
  const FREEZE_THRESHOLD = 0.70;
  const requiresFreeze = freezeProbability >= FREEZE_THRESHOLD;

  // 3. Primitive SCORE: Tingkat Keparahan (1.0 - 5.0)
  let baseScore = 2.0;
  switch (selectedCategory) {
    case "SPAM_IRRELEVAN":
      baseScore = 1.0;
      break;
    case "ADMINISTRATIF":
      baseScore = 2.2;
      break;
    case "KAMPANYE_HITAM":
      baseScore = 3.3;
      break;
    case "MALFUNGSI_SISTEM":
      baseScore = 4.1;
      break;
    case "INTIMIDASI_TPS":
      baseScore = 4.6;
      break;
  }

  // Jika kondisi freeze terpenuhi, batas bawah keparahan minimal 4.5
  if (requiresFreeze) {
    baseScore = Math.max(baseScore, 4.5);
  }

  for (const agg of AGGRAVATING_KEYWORDS) {
    if (fullText.includes(agg)) baseScore += 0.4;
  }
  for (const mit of MITIGATING_KEYWORDS) {
    if (fullText.includes(mit)) baseScore -= 0.3;
  }

  const finalScore = Math.min(5.0, Math.max(1.0, Number(baseScore.toFixed(1))));

  let level: SeverityLevel = "SEDANG";
  if (finalScore <= 1.5) level = "SANGAT_RINGAN";
  else if (finalScore <= 2.5) level = "RINGAN";
  else if (finalScore <= 3.5) level = "SEDANG";
  else if (finalScore < 4.5) level = "BERAT";
  else level = "KRITIS";

  // Calibrated Gaussian-kernel probability distribution for Severity Levels (strictly sums to 1.0)
  const LEVEL_CENTERS: Record<SeverityLevel, number> = {
    SANGAT_RINGAN: 1.0,
    RINGAN: 2.0,
    SEDANG: 3.0,
    BERAT: 4.0,
    KRITIS: 5.0,
  };
  const sigma = 0.65;
  const rawLevelWeights: Record<SeverityLevel, number> = {} as any;
  let sumWeights = 0;
  for (const lvl of SEVERITY_LEVELS) {
    const dist = finalScore - LEVEL_CENTERS[lvl];
    const w = Math.exp(-(dist * dist) / (2 * sigma * sigma));
    rawLevelWeights[lvl] = w;
    sumWeights += w;
  }

  const levelProbabilities: Record<SeverityLevel, number> = {} as any;
  let probSum = 0;
  for (const lvl of SEVERITY_LEVELS) {
    const p = Math.round((rawLevelWeights[lvl] / sumWeights) * 1000) / 1000;
    levelProbabilities[lvl] = p;
    probSum += p;
  }
  // Guarantee exact 1.0 sum invariant by adjusting the modal level
  levelProbabilities[level] = Math.round((levelProbabilities[level] + (1.0 - probSum)) * 1000) / 1000;

  // Rekomendasi aksi taktis Panwaslu
  let recommendedAction = "";
  if (requiresFreeze) {
    recommendedAction =
      "SEGERA AKTIFKAN EMERGENCY FREEZE: Hubungi Ketua KPUM dan ITPO untuk membekukan pemungutan suara sementara guna menjaga integritas pemilu.";
  } else if (selectedCategory === "INTIMIDASI_TPS") {
    recommendedAction =
      "KERAHKAN KEAMANAN KAMPUS: Koordinasikan dengan Satpam Poltek CWE untuk mengamankan lokasi dan melindungi pemilih di bilik.";
  } else if (selectedCategory === "MALFUNGSI_SISTEM") {
    recommendedAction =
      "ESKALASI KE ITPO: Hubungi tim teknis ITPO untuk pemeriksaan log audit dan verifikasi konsistensi rantai hash 5 TPS.";
  } else if (selectedCategory === "KAMPANYE_HITAM") {
    recommendedAction =
      "SIDANG PLENO CEPAT: Panggil tim sukses paslon terkait untuk klarifikasi dalam 1x24 jam dan sita barang bukti.";
  } else if (selectedCategory === "ADMINISTRATIF") {
    recommendedAction =
      "CATAT DI BUKU REGISTER: Terbitkan teguran administratif atau koreksi prosedural sesuai tata tertib KPUM CWE.";
  } else {
    recommendedAction =
      "TUTUP LAPORAN: Arsipkan laporan sebagai spam atau tidak berdasar tanpa tindakan lanjutan.";
  }

  return {
    classification: {
      value: selectedCategory,
      probabilities,
      confidence: choiceConfidence,
    },
    severity: {
      score: finalScore,
      level,
      probabilities: levelProbabilities,
      confidence: Math.min(1.0, Math.max(0.5, Number((levelProbabilities[level] + 0.25).toFixed(2)))),
    },
    freezeRecommendation: {
      probability: freezeProbability,
      requiresEmergencyFreeze: requiresFreeze,
      threshold: FREEZE_THRESHOLD,
      reasoning: freezeReason,
    },
    recommendedAction,
    source: "deterministic_heuristic",
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Menjalankan triase insiden Panwaslu.
 * Mendukung TypeSafe AI System One saat TYPESAFE_API_KEY tersedia,
 * dengan automatic failover ke heuristik deterministik jika offline atau gagal.
 */
export async function triageIncident(
  input: IncidentTriageInput
): Promise<PanwasluTriageReport> {
  const apiKey = process.env.TYPESAFE_API_KEY;

  if (!apiKey) {
    return evaluateDeterministicHeuristic(input);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const payload = {
      model: "jev-latest",
      state: {
        title: input.title ?? "",
        description: input.description,
        location: input.location ?? "Lingkungan Kampus Poltek CWE",
        reporterRole: input.reporterRole ?? "PEMILIH",
        reportedAt: input.reportedAt ?? new Date().toISOString(),
      },
      questions: {
        category: {
          type: "choice",
          instructions:
            "Klasifikasikan laporan sengketa pemira mahasiswa Poltek CWE ke dalam kategori hukum pemilu yang paling tepat.",
          criteria: {
            ADMINISTRATIF:
              "Pelanggaran administratif, tata tertib, jadwal, dpt, atau keterlambatan berkas",
            KAMPANYE_HITAM:
              "Black campaign, fitnah, politik uang, pencemaran nama baik, atau alat peraga liar",
            INTIMIDASI_TPS:
              "Ancaman fisik/verbal, pemaksaan pilihan, premanisme, atau sabotase bilik suara",
            MALFUNGSI_SISTEM:
              "Gangguan teknis, server down, database error, putusnya rantai hash, bug token",
            SPAM_IRRELEVAN:
              "Pesan acak, spam komersial, lelucon, atau teks tidak terkait pemira",
          },
        },
        severity: {
          type: "score",
          instructions:
            "Beri skor tingkat keparahan insiden dari skala 1.0 (sangat ringan) hingga 5.0 (kritis merusak legitimasi pemilu).",
          criteria: [
            "Sangat ringan / tidak berdampak pada suara",
            "Ringan / kesalahan prosedural kecil",
            "Sedang / sengketa antar paslon butuh teguran",
            "Berat / gangguan lokal signifikan terhadap pemberian suara",
            "Kritis / integritas suara rusak atau ancaman keselamatan fisik",
          ],
        },
        emergency_freeze: {
          type: "noul",
          instructions:
            "Apakah insiden ini memerlukan pembekuan darurat (emergency freeze) pemungutan suara kampus?",
        },
      },
    };

    const res = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return evaluateDeterministicHeuristic(input);
    }

    const data = await res.json();
    const answers = data?.answers ?? {};

    // Transform TypeSafe AI response format
    const choiceAnswer = answers.category;
    const scoreAnswer = answers.severity;
    const noulAnswer = answers.emergency_freeze;

    if (!choiceAnswer || !scoreAnswer || !noulAnswer) {
      return evaluateDeterministicHeuristic(input);
    }

    // TypeSafe AI choice: answer uses 'choice' property
    const rawChoice = choiceAnswer.choice ?? choiceAnswer.value;
    const categoryVal = (CATEGORY_CHOICES.includes(rawChoice) ? rawChoice : "ADMINISTRATIF") as IncidentCategory;

    // TypeSafe AI score: score runs along criteria indices (0 to 4), mapping to 1.0 - 5.0
    let rawScore = typeof scoreAnswer.score === "number" ? scoreAnswer.score : parseFloat(scoreAnswer.score);
    if (isNaN(rawScore)) rawScore = 2.0;
    const numScore = rawScore <= 4.0 && !scoreAnswer.legend?.["1.0"]
      ? Number(Math.min(5.0, Math.max(1.0, rawScore + 1.0)).toFixed(1))
      : Number(Math.min(5.0, Math.max(1.0, rawScore)).toFixed(1));

    let level: SeverityLevel = "SEDANG";
    if (numScore <= 1.5) level = "SANGAT_RINGAN";
    else if (numScore <= 2.5) level = "RINGAN";
    else if (numScore <= 3.5) level = "SEDANG";
    else if (numScore < 4.5) level = "BERAT";
    else level = "KRITIS";

    // Map score probabilities
    const rawScoreProbs = scoreAnswer.probabilities ?? {};
    const levelProbabilities: Record<SeverityLevel, number> = {
      SANGAT_RINGAN: rawScoreProbs["0"] ?? rawScoreProbs["SANGAT_RINGAN"] ?? 0.05,
      RINGAN: rawScoreProbs["1"] ?? rawScoreProbs["RINGAN"] ?? 0.05,
      SEDANG: rawScoreProbs["2"] ?? rawScoreProbs["SEDANG"] ?? 0.05,
      BERAT: rawScoreProbs["3"] ?? rawScoreProbs["BERAT"] ?? 0.05,
      KRITIS: rawScoreProbs["4"] ?? rawScoreProbs["KRITIS"] ?? 0.05,
    };
    const scoreProbSum = Object.values(levelProbabilities).reduce((a, b) => a + b, 0);
    if (scoreProbSum > 0) {
      for (const k of SEVERITY_LEVELS) {
        levelProbabilities[k] = Math.round((levelProbabilities[k] / scoreProbSum) * 1000) / 1000;
      }
      const adjustedSum = Object.values(levelProbabilities).reduce((a, b) => a + b, 0);
      levelProbabilities[level] = Math.round((levelProbabilities[level] + (1.0 - adjustedSum)) * 1000) / 1000;
    }

    // TypeSafe AI noul: answer uses 'noul' property
    const rawNoul = noulAnswer.noul ?? noulAnswer.probability;
    const freezeProb = typeof rawNoul === "number" ? Number(rawNoul.toFixed(2)) : 0.05;
    const requiresFreeze = freezeProb >= 0.70;

    return {
      classification: {
        value: categoryVal,
        probabilities: choiceAnswer.probabilities ?? {},
        confidence: Number(choiceAnswer.confidence) || 0.85,
      },
      severity: {
        score: numScore,
        level,
        probabilities: levelProbabilities,
        confidence: Number(scoreAnswer.confidence) || 0.85,
      },
      freezeRecommendation: {
        probability: freezeProb,
        requiresEmergencyFreeze: requiresFreeze,
        threshold: 0.70,
        reasoning: requiresFreeze
          ? "TypeSafe AI System One mendeteksi risiko kritis yang memenuhi kriteria emergency freeze."
          : "Tingkat keparahan tidak memenuhi ambang batas pembekuan pemilihan.",
      },
      recommendedAction: requiresFreeze
        ? "SEGERA AKTIFKAN EMERGENCY FREEZE: Koordinasikan pembekuan bilik dengan Ketua KPUM."
        : `Tindak lanjuti penanganan laporan sesuai prosedur kategori ${categoryVal}.`,
      source: "typesafe_ai",
      evaluatedAt: new Date().toISOString(),
    };
  } catch {
    // Failover elegan jika koneksi jaringan bermasalah
    return evaluateDeterministicHeuristic(input);
  }
}
