// ============================================================
// MIDDLEWARE GLOBAL — Smart Pemira (Rekomendasi #5 — Hardening Produksi)
// Dua fungsi:
//  1. ANTI-CSRF ORIGIN CHECK (produksi): setiap metode mutasi (POST/PUT/
//     PATCH/DELETE) yang membawa header Origin dari host asing ditolak 403.
//     Permintaan non-browser (load test, health check, curl) TIDAK membawa
//     Origin → tidak terpengaruh. Mendukung reverse proxy via x-forwarded-host
//     dan daftar putih env PEMIRA_TRUSTED_ORIGINS (pisah koma).
//  2. CSP PRODUKSI: Content-Security-Policy ketat — default-src 'self'
//     memutus eksfiltrasi data ke domain luar (connect/img/form), object-src
//     'none', frame-ancestors 'none'. Di development CSP sengaja dilewati
//     agar panel preview sandbox & HMR tetap berfungsi (sama seperti
//     kebijakan framing sadar-lingkungan di next.config.ts).
// ============================================================
import { NextRequest, NextResponse } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function trustedOrigins(): string[] {
  return (process.env.PEMIRA_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function middleware(req: NextRequest): NextResponse {
  const isProduction = process.env.NODE_ENV === "production";

  // ---------- 1. Anti-CSRF: verifikasi Origin pada metode mutasi ----------
  if (isProduction && MUTATING_METHODS.has(req.method)) {
    const origin = req.headers.get("origin");
    if (origin) {
      let originHost = "";
      try {
        originHost = new URL(origin).host;
      } catch {
        originHost = "";
      }
      const host = req.headers.get("host") ?? "";
      const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
      const allowed =
        (originHost !== "" && originHost === host) ||
        (forwardedHost !== "" && originHost === forwardedHost) ||
        trustedOrigins().includes(originHost);

      if (!allowed) {
        return NextResponse.json(
          {
            ok: false,
            code: "CSRF_ORIGIN_REJECTED",
            message: "Permintaan ditolak: Origin tidak dikenali (lapisan anti-CSRF middleware).",
          },
          { status: 403 }
        );
      }
    }
  }

  const res = NextResponse.next();

  // ---------- 2. CSP produksi (dev tanpa CSP demi preview sandbox) ----------
  if (isProduction) {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");
    res.headers.set("Content-Security-Policy", csp);
  }

  return res;
}

export const config = {
  // Lewati aset statis murni — sisanya (termasuk /api/*) melewati middleware.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|logo.svg).*)"],
};
