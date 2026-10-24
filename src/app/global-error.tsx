"use client";

// global-error.tsx — jaring pengaman terakhir (layout pun gagal render).
// Harus punya <html>/<body> sendiri; styling minimal tanpa font Google.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F6F4EE",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#141E19", margin: "0 0 12px" }}>
          Sistem Sedang Tidak Tersedia
        </h1>
        <p style={{ maxWidth: 420, lineHeight: 1.6, color: "#4A5851", margin: "0 0 20px" }}>
          Gangguan internal terjadi. Silakan muat ulang halaman. Bila kamu sedang memilih, draf pilihanmu tersimpan di
          perangkatmu.
        </p>
        {error.digest && (
          <p style={{ fontFamily: "monospace", fontSize: 11, color: "#7A8881", margin: "0 0 20px" }}>
            Kode gangguan: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          style={{
            border: "2px solid #141E19",
            background: "#1B7F4E",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "4px 4px 0 #141E19",
          }}
        >
          Coba Lagi
        </button>
      </body>
    </html>
  );
}
