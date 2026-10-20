// GET /api/realtime/monitor — Stream SSE realtime untuk Panwaslu (Rekomendasi #8)
// - Snapshot (monitor + tally + login log) dikirim bila ada PERUBAHAN (dicek tiap 4 dtk)
// - Event otentikasi (login gagal/lockout) di-push SEKETIKA via event bus
// - Keep-alive comment tiap 20 dtk; bersih-bersih saat klien putus
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { buildRealtimeSnapshot } from "@/lib/db/monitor-service";
import { subscribeAuth } from "@/lib/server/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const gate = await requireRole(["PANWASLU", "SAKSI", "KPUM", "ITPO"]);
  if ("error" in gate) return gate.error;

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };
      const send = (event: string, data: unknown) => safeEnqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      let lastJson = "";
      const pushSnapshot = async (force = false) => {
        if (closed) return;
        try {
          const snap = await buildRealtimeSnapshot();
          const json = JSON.stringify(snap);
          if (force || json !== lastJson) {
            lastJson = json;
            send("snapshot", snap);
          }
        } catch {
          // kirim ulang pada tick berikutnya
        }
      };

      await pushSnapshot(true);

      const unsubscribe = subscribeAuth((payload) => {
        send("auth", payload);
        void pushSnapshot(true); // refresh data segera setelah event keamanan
      });

      const snapshotTimer = setInterval(() => void pushSnapshot(), 4000);
      const keepaliveTimer = setInterval(() => safeEnqueue(": ping\n\n"), 20_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(snapshotTimer);
        clearInterval(keepaliveTimer);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // sudah tertutup
        }
      };
      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
