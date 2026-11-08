// ============================================================
// K6 LOAD TESTING SCENARIO — Smart Pemira Poltek CWE
// Uji beban HTTP eksternal untuk endpoint /api/pemilih/submit
// Eksekusi: k6 run tests/load/k6-ballot-submit.js
// Parameter environment opsional:
//   - TARGET_URL: URL aplikasi (default: http://localhost:3000)
//   - TEST_TOKEN: Token pemilih khusus atau otomatis
// ============================================================
import http from "k6/http";
import { check, sleep } from "k6";

// Menandai status 200, 400, 403, 423 sebagai status yang diharapkan
// sehingga k6 tidak salah menghitung validasi bisnis sebagai error infrastruktur (http_req_failed)
http.setResponseCallback(http.expectedStatuses(200, 400, 403, 423));

export const options = {
  stages: [
    { duration: "10s", target: 20 },  // Ramp-up ke 20 Virtual Users
    { duration: "30s", target: 50 },  // Stabil pada 50 Virtual Users
    { duration: "15s", target: 100 }, // Lonjakan beban (spike) ke 100 Virtual Users
    { duration: "10s", target: 0 },   // Ramp-down pendinginan
  ],
  thresholds: {
    // 95% permintaan harus selesai dalam waktu < 500ms
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    // Tingkat kesalahan HTTP (di luar status bisnis terduga) di bawah 1%
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.TARGET_URL || "http://localhost:3000";

export default function ballotSubmitTest() {
  // Simulasi alamat IP gawai pemilih yang terdistribusi
  const clientSubnet = Math.floor(Math.random() * 250) + 1;
  const clientHost = Math.floor(Math.random() * 250) + 1;
  const simulatedIp = `192.168.${clientSubnet}.${clientHost}`;

  const headers = {
    "Content-Type": "application/json",
    "X-Forwarded-For": simulatedIp,
  };

  // Gunakan token unik per VU dan iterasi jika tidak ada token tunggal khusus
  const token = __ENV.TEST_TOKEN || `LOAD-VU${__VU}-IT${__ITER}`;

  // Payload surat suara 3 kategori (PRESMA, DPM, HIMA)
  const payload = JSON.stringify({
    token: token,
    selections: {
      presmaCandidateId: null, // Suara Kosong atau ID Paslon
      dpmCandidateId: null,
      himaCandidateId: null,
    },
  });

  const res = http.post(`${BASE_URL}/api/pemilih/submit`, payload, { headers });

  check(res, {
    "Status code valid (200 OK atau 400/403/423 sesuai status token)": (r) =>
      r.status === 200 || r.status === 400 || r.status === 403 || r.status === 423,
    "Respons mengandung JSON terstruktur": (r) => {
      try {
        const data = r.json();
        return typeof data.ok === "boolean";
      } catch {
        return false;
      }
    },
    "Latensi dalam ambang batas (< 1000ms)": (r) => r.timings.duration < 1000,
  });

  sleep(0.3);
}
