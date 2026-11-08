import { describe, it, expect } from "vitest";
import {
  evaluateDeterministicHeuristic,
  triageIncident,
  IncidentTriageInput,
} from "@/lib/ai/panwaslu-triage";

describe("Paket 7: TypeSafe AI Panwaslu Dispute Triage", () => {
  describe("Primitive 1: Choice (Incident Category Classification)", () => {
    it("harus mengklasifikasikan intimidasi fisik di bilik ke INTIMIDASI_TPS", () => {
      const input: IncidentTriageInput = {
        title: "Preman Menghalangi Pemilih di TPS",
        description:
          "Ada sekelompok orang melakukan ancaman kekerasan fisik dan intimidasi preman untuk memaksa pemilih mencoblos paslon tertentu di bilik.",
        location: "TPS 01 Gedung A",
      };

      const report = evaluateDeterministicHeuristic(input);
      expect(report.classification.value).toBe("INTIMIDASI_TPS");
      expect(report.classification.confidence).toBeGreaterThan(0.5);

      // Probabilitas harus valid dan berjumlah mendekati 1.0
      const sumP = Object.values(report.classification.probabilities).reduce((a, b) => a + b, 0);
      expect(sumP).toBeCloseTo(1.0, 2);
      expect(report.classification.probabilities.INTIMIDASI_TPS).toBeGreaterThan(0.5);
    });

    it("harus mengklasifikasikan kerusakan server atau rantai hash ke MALFUNGSI_SISTEM", () => {
      const input: IncidentTriageInput = {
        title: "Rantai Hash Putus dan Server Down",
        description:
          "Layar putih error 500 saat kirim suara, server crash dan database corrupt sehingga hash chain putus di prodi TRPL.",
        location: "Server Cluster",
      };

      const report = evaluateDeterministicHeuristic(input);
      expect(report.classification.value).toBe("MALFUNGSI_SISTEM");
      expect(report.classification.probabilities.MALFUNGSI_SISTEM).toBeGreaterThan(0.5);
    });

    it("harus mengklasifikasikan politik uang atau fitnah ke KAMPANYE_HITAM", () => {
      const input: IncidentTriageInput = {
        title: "Bagi-Bagi Uang di Asrama",
        description:
          "Ditemukan serangan fajar politik uang dan bagi sembako serta amplop oleh tim sukses paslon 01 dengan pamflet gelap fitnah paslon 02.",
        location: "Asrama Mahasiswa",
      };

      const report = evaluateDeterministicHeuristic(input);
      expect(report.classification.value).toBe("KAMPANYE_HITAM");
      expect(report.classification.probabilities.KAMPANYE_HITAM).toBeGreaterThan(0.5);
    });

    it("harus mengklasifikasikan masalah berkas atau keterlambatan ke ADMINISTRATIF", () => {
      const input: IncidentTriageInput = {
        title: "Saksi Paslon Terlambat Menyerahkan Surat Mandat",
        description:
          "Saksi paslon presma terlambat menyerahkan syarat berkas surat mandat dan id card saat registrasi verifikasi tata tertib.",
        location: "Meja Registrasi",
      };

      const report = evaluateDeterministicHeuristic(input);
      expect(report.classification.value).toBe("ADMINISTRATIF");
      expect(report.classification.probabilities.ADMINISTRATIF).toBeGreaterThan(0.4);
    });

    it("harus mengklasifikasikan teks tidak bermakna atau promosi ke SPAM_IRRELEVAN", () => {
      const input: IncidentTriageInput = {
        description: "tes 123 slot gacor beli pulsa promo",
      };

      const report = evaluateDeterministicHeuristic(input);
      expect(report.classification.value).toBe("SPAM_IRRELEVAN");
      expect(report.classification.probabilities.SPAM_IRRELEVAN).toBeGreaterThan(0.4);
    });
  });

  describe("Primitive 2: Score (Severity Index 1.0 - 5.0)", () => {
    it("harus memastikan distribusi probabilitas tingkat keparahan (severity.probabilities) selalu berjumlah tepat 1.0", () => {
      const descriptions = [
        "testing spam", // SANGAT_RINGAN
        "Saksi terlambat membawa berkas tata tertib formulir", // RINGAN / SEDANG
        "Ditemukan amplop serangan fajar politik uang di asrama", // SEDANG / BERAT
        "Server crash error 500 koneksi terputus", // BERAT
        "Preman bersenjata golok melakukan kekerasan fisik massal merusak bilik", // KRITIS
      ];

      for (const desc of descriptions) {
        const report = evaluateDeterministicHeuristic({ description: desc });
        const sumP = Object.values(report.severity.probabilities).reduce((a, b) => a + b, 0);
        expect(sumP).toBeCloseTo(1.0, 2);
        expect(report.severity.probabilities[report.severity.level]).toBeGreaterThan(0.3);
      }
    });

    it("harus memberikan skor kritis (>4.5) untuk intimidasi bersenjata massal", () => {
      const input: IncidentTriageInput = {
        description:
          "Preman bawa senjata tajam golok melakukan kekerasan fisik massal merusak bilik di seluruh kampus secara darurat.",
      };

      const report = evaluateDeterministicHeuristic(input);
      expect(report.severity.score).toBeGreaterThanOrEqual(4.5);
      expect(report.severity.level).toBe("KRITIS");
      expect(report.severity.probabilities.KRITIS).toBeGreaterThan(0.5);
      const sumP = Object.values(report.severity.probabilities).reduce((a, b) => a + b, 0);
      expect(sumP).toBeCloseTo(1.0, 2);
    });

    it("harus memberikan skor ringan atau sangat ringan untuk sengketa administratif atau spam", () => {
      const inputSpam: IncidentTriageInput = {
        description: "testing",
      };
      const spamReport = evaluateDeterministicHeuristic(inputSpam);
      expect(spamReport.severity.score).toBeLessThanOrEqual(2.0);

      const inputAdmin: IncidentTriageInput = {
        description: "Saksi lupa membawa id card cetak, namun membawa KTM asli dan sudah selesai.",
      };
      const adminReport = evaluateDeterministicHeuristic(inputAdmin);
      expect(adminReport.severity.score).toBeLessThanOrEqual(2.5);
    });
  });

  describe("Primitive 3: Noul (Emergency Freeze Condition Evaluation)", () => {
    it("harus merekomendasikan Emergency Freeze (probability >= 0.70) pada malfungsi fatal", () => {
      const input: IncidentTriageInput = {
        description:
          "Kondisi darurat: database corrupt parah dan hash chain putus total di server utama sehingga sistem mati total.",
      };

      const report = evaluateDeterministicHeuristic(input);
      expect(report.freezeRecommendation.probability).toBeGreaterThanOrEqual(0.70);
      expect(report.freezeRecommendation.requiresEmergencyFreeze).toBe(true);
      expect(report.recommendedAction).toContain("EMERGENCY FREEZE");
    });

    it("harus merekomendasikan Emergency Freeze secara independen saat ancaman kekerasan bersenjata hadir meski ada teks administratif", () => {
      const input: IncidentTriageInput = {
        description:
          "Saksi terlambat membawa syarat berkas registrasi kartu tanda mahasiswa tata tertib absensi formulir dpt, namun di luar bilik ada preman bawa senjata golok serang pemilih.",
      };

      const report = evaluateDeterministicHeuristic(input);
      expect(report.freezeRecommendation.requiresEmergencyFreeze).toBe(true);
      expect(report.freezeRecommendation.probability).toBeGreaterThanOrEqual(0.70);
      expect(report.severity.score).toBeGreaterThanOrEqual(4.5);
    });

    it("harus kebal terhadap injeksi kata spam (anti-evasion): kegagalan kritis database/hash chain tetap memicu freeze", () => {
      const input: IncidentTriageInput = {
        description:
          "halo slot gacor judi promo mabar mobile legends beli pulsa tapi server down database corrupt hash chain putus",
      };

      const report = evaluateDeterministicHeuristic(input);
      expect(report.classification.value).toBe("MALFUNGSI_SISTEM");
      expect(report.freezeRecommendation.requiresEmergencyFreeze).toBe(true);
      expect(report.severity.score).toBeGreaterThanOrEqual(4.5);
    });

    it("TIDAK boleh merekomendasikan Emergency Freeze untuk pelanggaran kampanye biasa atau administrasi", () => {
      const input: IncidentTriageInput = {
        description:
          "Ditemukan stiker kampanye hitam ditempel di dinding toilet kampus oleh oknum mahasiswa.",
      };

      const report = evaluateDeterministicHeuristic(input);
      expect(report.freezeRecommendation.probability).toBeLessThan(0.70);
      expect(report.freezeRecommendation.requiresEmergencyFreeze).toBe(false);
      expect(report.recommendedAction).not.toContain("EMERGENCY FREEZE");
    });
  });

  describe("End-to-End Resilience & TypeSafe AI OpenAPI Protocol", () => {
    it("triageIncident harus berhasil mengembalikan laporan terstruktur walau tanpa TYPESAFE_API_KEY", async () => {
      delete process.env.TYPESAFE_API_KEY;

      const report = await triageIncident({
        title: "Dugaan Pemilih Ganda",
        description: "Ditemukan nama pemilih yang tidak terdaftar dalam DPT mencoba registrasi di absensi.",
      });

      expect(report).toBeDefined();
      expect(report.source).toBe("deterministic_heuristic");
      expect(report.classification).toBeDefined();
      expect(report.severity).toBeDefined();
      expect(report.freezeRecommendation).toBeDefined();
      expect(report.recommendedAction).toBeDefined();
      expect(report.evaluatedAt).toBeDefined();
    });

    it("triageIncident harus benar memproses response TypeSafe AI OpenAPI resmi saat API key aktif", async () => {
      process.env.TYPESAFE_API_KEY = "test_key_mock";

      const originalFetch = global.fetch;
      global.fetch = async (url: any, opts: any) => {
        expect(String(url)).toBe("https://api.typesafe.ai/v1/systemone");
        const body = JSON.parse(opts.body);
        expect(body.model).toBe("jev-latest");
        expect(body.questions.category.type).toBe("choice");
        expect(body.questions.category.criteria).toBeDefined();
        expect(body.questions.severity.type).toBe("score");
        expect(body.questions.severity.criteria).toBeInstanceOf(Array);
        expect(body.questions.emergency_freeze.type).toBe("noul");

        return {
          ok: true,
          json: async () => ({
            model: "jev-latest",
            answers: {
              category: {
                type: "choice",
                choice: "MALFUNGSI_SISTEM",
                confidence: 0.92,
                probabilities: {
                  ADMINISTRATIF: 0.02,
                  KAMPANYE_HITAM: 0.01,
                  INTIMIDASI_TPS: 0.02,
                  MALFUNGSI_SISTEM: 0.94,
                  SPAM_IRRELEVAN: 0.01,
                },
              },
              severity: {
                type: "score",
                score: 3.5, // 0-indexed in 5 levels (maps to 4.5/5.0)
                confidence: 0.88,
                probabilities: {
                  "0": 0.02,
                  "1": 0.03,
                  "2": 0.05,
                  "3": 0.35,
                  "4": 0.55,
                },
              },
              emergency_freeze: {
                type: "noul",
                noul: 0.89,
              },
            },
          }),
        } as any;
      };

      try {
        const report = await triageIncident({
          title: "Hash Chain Failure",
          description: "Database corrupt dan rantai hash putus total.",
        });

        expect(report.source).toBe("typesafe_ai");
        expect(report.classification.value).toBe("MALFUNGSI_SISTEM");
        expect(report.severity.score).toBe(4.5);
        expect(report.severity.level).toBe("KRITIS");
        expect(report.freezeRecommendation.probability).toBe(0.89);
        expect(report.freezeRecommendation.requiresEmergencyFreeze).toBe(true);

        const sumScoreP = Object.values(report.severity.probabilities).reduce((a, b) => a + b, 0);
        expect(sumScoreP).toBeCloseTo(1.0, 2);
      } finally {
        global.fetch = originalFetch;
        delete process.env.TYPESAFE_API_KEY;
      }
    });

    it("harus menangani input batas (edge cases) dengan anggun tanpa crash", async () => {
      const edgeCases: IncidentTriageInput[] = [
        { description: "" },
        { description: "a" },
        { description: " ".repeat(100) },
        { title: "Judul Saja", description: "---" },
      ];

      for (const ec of edgeCases) {
        const report = await triageIncident(ec);
        expect(report.classification.value).toBeDefined();
        expect(report.severity.score).toBeGreaterThanOrEqual(1.0);
        expect(report.severity.score).toBeLessThanOrEqual(5.0);
      }
    });
  });

  describe("API Route Handler: POST /api/panwaslu/triage", () => {
    it("harus merespons 400 jika body bukan format JSON valid", async () => {
      const { POST } = await import("@/app/api/panwaslu/triage/route");
      const { NextRequest } = await import("next/server");

      const req = new NextRequest("http://localhost:3000/api/panwaslu/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-non-json-body",
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("JSON");
    });

    it("harus merespons 400 jika deskripsi kosong", async () => {
      const { POST } = await import("@/app/api/panwaslu/triage/route");
      const { NextRequest } = await import("next/server");

      const req = new NextRequest("http://localhost:3000/api/panwaslu/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "   " }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Deskripsi insiden wajib diisi");
    });

    it("harus berhasil memproses triase via POST dan mengembalikan struktur data lengkap", async () => {
      const { POST } = await import("@/app/api/panwaslu/triage/route");
      const { NextRequest } = await import("next/server");

      const req = new NextRequest("http://localhost:3000/api/panwaslu/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Server Down di TPS 02",
          description: "Database corrupt dan server crash saat penghitungan suara.",
          location: "Ruang Server",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.triage).toBeDefined();
      expect(json.triage.classification.value).toBe("MALFUNGSI_SISTEM");
      expect(json.triage.severity.score).toBeGreaterThanOrEqual(4.0);
      expect(json.triage.freezeRecommendation).toBeDefined();
    });
  });
});

