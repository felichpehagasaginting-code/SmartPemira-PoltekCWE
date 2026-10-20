import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
  icons: {
    icon: "/logo.svg",
  },
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
      </body>
    </html>
  );
}
