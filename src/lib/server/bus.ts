// ============================================================
// EVENT BUS IN-PROCESS — Realtime push (Rekomendasi #8)
// Dipakai endpoint SSE /api/realtime/monitor untuk mendorong
// event otentikasi (login sukses/gagal/lockout) SEKETIKA ke
// monitor Panwaslu, tanpa menunggu siklus polling.
// ============================================================
import { EventEmitter } from "events";

export type AuthEventType =
  | "OPERATOR_LOGIN"
  | "OPERATOR_LOGIN_FAILED"
  | "OPERATOR_LOGIN_BLOCKED"
  | "OPERATOR_ACCOUNT_LOCKED"
  | "OPERATOR_LOGOUT"
  | "OPERATOR_PASSWORD_CHANGED"
  | "OPERATOR_PASSWORD_CHANGE_FAILED"
  | "OPERATOR_PASSWORD_RESET"
  // Rekomendasi #3 — 2FA TOTP
  | "OPERATOR_2FA_ENABLED"
  | "OPERATOR_2FA_DISABLED";

export interface AuthEventPayload {
  type: AuthEventType;
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
