// ============================================================
// EVENT BUS IN-PROCESS — Realtime push (Rekomendasi #8)
// Dipakai endpoint SSE /api/realtime/monitor untuk mendorong
// event otentikasi (login sukses/gagal/lockout) SEKETIKA ke
// monitor Panwaslu, tanpa menunggu siklus polling.
// ============================================================
import { EventEmitter } from "events";

export interface AuthEventPayload {
  type: "OPERATOR_LOGIN" | "OPERATOR_LOGIN_FAILED" | "OPERATOR_ACCOUNT_LOCKED" | "OPERATOR_LOGOUT" | "OPERATOR_PASSWORD_CHANGED";
  detail: string;
  at: string;
}

const g = globalThis as unknown as { __pemiraBus?: EventEmitter };
export function getBus(): EventEmitter {
  if (!g.__pemiraBus) {
    const bus = new EventEmitter();
    bus.setMaxListeners(50);
    g.__pemiraBus = bus;
  }
  return g.__pemiraBus;
}

export function publishAuthEvent(payload: AuthEventPayload): void {
  getBus().emit("auth", payload);
}

export function subscribeAuth(listener: (payload: AuthEventPayload) => void): () => void {
  const bus = getBus();
  bus.on("auth", listener);
  return () => bus.off("auth", listener);
}
