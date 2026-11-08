"use client";

// ============================================================
// PORTAL PEMILIH — BILIK SUARA OFFLINE-FIRST (Paket #3)
// Pintu suara tunggal Pemira Online (100% BYOD).
// Dilengkapi banner ketahanan jaringan (Network Resilience)
// dan modal antrean aman (safe retry) agar token dan suara
// tidak hilang saat sinyal kampus terputus di tengah proses pencoblosan.
// ============================================================
import { Suspense, useEffect, useState } from "react";
import { PemilihPortal } from "@/components/pemilih/pemilih-portal";
import { useNetworkStatus } from "@/lib/hooks/use-network-status";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

function OfflineResilienceShell() {
  const { isOnline, wasOffline, checkConnectivity } = useNetworkStatus();
  const [checking, setChecking] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);

  // Tampilkan notifikasi "Koneksi Pulih" sementara setelah sempat offline
  useEffect(() => {
    if (wasOffline && isOnline) {
      const showTimer = window.setTimeout(() => setShowRestoredNotice(true), 0);
      const hideTimer = window.setTimeout(() => setShowRestoredNotice(false), 5000);
      return () => {
        window.clearTimeout(showTimer);
        window.clearTimeout(hideTimer);
      };
    }
  }, [wasOffline, isOnline]);

  // Dukungan tombol Escape untuk menutup modal aksesibilitas
  useEffect(() => {
    if (!showRetryModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowRetryModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showRetryModal]);

  const handleManualCheck = async () => {
    setChecking(true);
    await checkConnectivity();
    setChecking(false);
  };

  return (
    <>
      {/* 1. Offline Alert Banner (Sticky Top) */}
      {!isOnline && (
        <aside
          role="alert"
          aria-live="assertive"
          className="sticky top-0 z-50 border-b-2 border-[#141E19] bg-[#FDE8E5] px-4 py-3 text-[#842029] shadow-md transition-all"
        >
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#842029] bg-white text-[#E05A47]">
                <WifiOff className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-sm font-black tracking-[-0.01em] text-[#842029]">
                  Koneksi Terputus — Suara & Token Anda Tersimpan Aman di Memori Lokal Bilik
                </p>
                <p className="text-xs text-[#5C2328]">
                  Pilihan Anda tidak akan hilang. Jangan tutup tab peramban. Sistem akan menyinkronkan suara begitu sinyal pulih.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setShowRetryModal(true)}
                className="rounded-[6px] border-2 border-[#842029] bg-white px-3 py-1 text-xs font-black text-[#842029] shadow-[2px_2px_0px_#842029] hover:bg-[#FDF3F2] focus-visible:ring-2 focus-visible:ring-[#842029]"
              >
                Detail Antrean Aman
              </button>
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={checking}
                aria-label="Periksa ulang sambungan internet"
                className="flex h-8 items-center gap-1.5 rounded-[6px] border-2 border-[#842029] bg-[#842029] px-3 text-xs font-black text-white shadow-[2px_2px_0px_#141E19] hover:bg-[#6A1A21] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#842029]"
              >
                {checking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>Cek Sinyal</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Restored Connection Notice */}
      {isOnline && showRestoredNotice && (
        <aside
          role="status"
          aria-live="polite"
          className="sticky top-0 z-50 border-b-2 border-[#141E19] bg-[#DCFCE7] px-4 py-2.5 text-[#0F5132] shadow-sm transition-all"
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs font-black">
              <Wifi className="h-4 w-4 text-[#1B7F4E]" aria-hidden="true" />
              <span>Koneksi Pulih — Bilik suara kembali online. Anda dapat melanjutkan pengiriman suara.</span>
            </div>
            <button
              type="button"
              onClick={() => setShowRestoredNotice(false)}
              aria-label="Tutup pemberitahuan koneksi pulih"
              className="rounded p-1 hover:bg-[#BBF7D0] focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </aside>
      )}

      {/* 3. Bilik Suara Component */}
      <PemilihPortal />

      {/* 4. Safe Retry & Offline Resilience Modal */}
      {showRetryModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-offline-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-[14px] border-2 border-[#141E19] bg-white p-6 shadow-[6px_6px_0px_#141E19]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border-2 border-[#141E19] bg-[#DCFCE7] text-[#0F5132]">
                  <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="modal-offline-title" className="font-display text-base font-black text-[#141E19]">
                    Garansi Ketahanan Offline Bilik
                  </h2>
                  <p className="text-[11px] font-bold text-[#7A8881]">Smart Pemira Poltek CWE</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRetryModal(false)}
                aria-label="Tutup jendela penjelasan antrean aman"
                className="rounded-[6px] border border-[#D8D3C8] p-1.5 hover:bg-[#F6F4EE] focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs leading-relaxed text-[#4A5851]">
              <div className="rounded-[8px] border border-[#D8D3C8] bg-[#FDFCF7] p-3">
                <p className="font-bold text-[#141E19]">Bagaimana pilihan saya tetap aman?</p>
                <p className="mt-1">
                  Setiap kali Anda memilih kandidat, draf pilihan Anda diamankan seketika di penyimpanan lokal peramban
                  (Local Storage) dengan kunci token terenkripsi. Refresh peramban atau sinyal mati tidak akan mengulang
                  proses dari awal.
                </p>
              </div>

              <div className="rounded-[8px] border border-[#D8D3C8] bg-[#FDFCF7] p-3">
                <p className="font-bold text-[#141E19]">Bagaimana jika koneksi mati saat menekan Kirim?</p>
                <p className="mt-1">
                  Sistem bilik suara menerapkan metode Safe Retry. Suara tidak hangus. Begitu Wi-Fi atau sinyal seluler
                  Anda terhubung kembali, tekan tombol kirim ulang dan transaksi voting akan diselesaikan ke server.
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={checking}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[8px] border-2 border-[#141E19] bg-[#1B7F4E] text-xs font-black text-white shadow-[2px_2px_0px_#141E19] hover:bg-[#16663E] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
              >
                {checking ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                )}
                <span>UJI SAMBUNGAN INTERNET</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRetryModal(false)}
                className="h-11 rounded-[8px] border-2 border-[#141E19] bg-white px-4 text-xs font-black shadow-[2px_2px_0px_#141E19] hover:bg-[#F6F4EE] focus-visible:ring-2 focus-visible:ring-[#1B7F4E]"
              >
                TUTUP
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function PemilihPage() {
  return (
    <main className="min-h-screen bg-[#F6F4EE]">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8D3C8] border-t-[#1B7F4E]" />
          </div>
        }
      >
        <OfflineResilienceShell />
      </Suspense>
    </main>
  );
}
