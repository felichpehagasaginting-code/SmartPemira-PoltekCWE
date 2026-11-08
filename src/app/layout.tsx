import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { RegisterSW } from "@/components/pwa/register-sw";

export const metadata: Metadata = {
  title: "Smart Pemira — Poltek CWE | Pemilihan Umum Raya Mahasiswa",
  description:
    "Sistem Informasi Pemilihan Umum Raya Terintegrasi Ikatan Keluarga Mahasiswa Politeknik Kelapa Sawit Citra Widya Edukasi. Zero-Knowledge Ballot, aman, rahasia, dan transparan.",
  keywords: ["Smart Pemira", "Pemira", "E-Voting", "Poltek CWE", "KPUM", "Mahasiswa"],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bilik Suara Pemira",
  },
};

export const viewport: Viewport = {
  themeColor: "#1B7F4E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground"
      >
        {children}
        <Toaster />
        <RegisterSW />
      </body>
    </html>
  );
}
