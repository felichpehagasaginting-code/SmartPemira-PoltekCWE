import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { RegisterSW } from "@/components/pwa/register-sw";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

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
        className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <RegisterSW />
      </body>
    </html>
  );
}
