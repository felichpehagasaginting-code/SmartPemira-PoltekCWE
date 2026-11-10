import type { NextConfig } from "next";

// Security headers (Rekomendasi #1 — hardening)
// CSP sengaja tidak dipasang ketat: Next.js dev membutuhkan inline script;
// proteksi sniffing/referrer tetap aktif.
//
// Kebijakan framing (anti-clickjacking) sadar-lingkungan:
// - dev/preview (NODE_ENV=development): TANPA header frame → panel preview
//   sandbox (iframe lintas origin) tetap bisa menampilkan aplikasi.
// - produksi (next build + next start): X-Frame-Options DENY + CSP
//   frame-ancestors 'none' (standar modern, lebih ketat).
const isProductionBuild = process.env.NODE_ENV === "production";

const framePolicyHeaders = isProductionBuild
  ? [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
    ]
  : [];

const securityHeaders = [
  ...framePolicyHeaders,
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
