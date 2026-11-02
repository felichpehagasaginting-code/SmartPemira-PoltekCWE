// ============================================================
// INVARIANT — PUSAT PERINGATAN (Rekomendasi #7):
//  a. Freeze aktif → FREEZE_AKTIF muncul; reda → hilang.
//  b. ≥5 kegagalan login 15 menit → LOGIN_STORM; di bawah ambang → senyap.
//  c. BACKUP_FAILED dalam 24 jam → muncul; lebih tua dari 24 jam → diabaikan.
//  d. Kepatuhan 2FA: KPUM aktif tanpa 2FA → WARNING muncul.
//  e. DB segar → integritas rantai valid (tidak ada CRITICAL).
// ============================================================
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { evaluateAlerts } from "@/lib/server/alerts";

const STAMP = randomUUID().slice(0, 8);
let kpumUsername = "";

async function idsOf(): Promise<Set<string>> {
  const { alerts } = await evaluateAlerts();
  return new Set(alerts.map((a) => a.id));
}

describe("Evaluator ambang batas", () => {
  beforeAll(async () => {
    await db.electionSetting.upsert({
      where: { id: "main" },
      create: { id: "main", sessionSecret: `test-${STAMP}` },
      update: { emergencyFreeze: false, votingOpen: true },
    });
    kpumUsername = `kpum-alert-${STAMP}`;
    await db.operator.create({
      data: { username: kpumUsername, passwordHash: "x:y", role: "KPUM", fullName: `KPUM Alert ${STAMP}` },
    });
  });

  afterAll(async () => {
    await db.operator.deleteMany({ where: { username: kpumUsername } });
    await db.auditLog.deleteMany({ where: { detail: { contains: STAMP } } });
    await db.electionSetting.update({ where: { id: "main" }, data: { emergencyFreeze: false, votingOpen: true } });
  });

  it("freeze aktif → peringatan HIGH; reda → hilang", async () => {
    await db.electionSetting.update({ where: { id: "main" }, data: { emergencyFreeze: true } });
    expect((await idsOf()).has("FREEZE_AKTIF")).toBe(true);
    await db.electionSetting.update({ where: { id: "main" }, data: { emergencyFreeze: false } });
    expect((await idsOf()).has("FREEZE_AKTIF")).toBe(false);
  });

  it("badai login: 4 kegagalan senyap, 5 → LOGIN_STORM", async () => {
    const base = { detail: `uji ${STAMP}` };
    for (let i = 0; i < 4; i++) await db.auditLog.create({ data: { event: "OPERATOR_LOGIN_FAILED", ...base } });
    expect((await idsOf()).has("LOGIN_STORM")).toBe(false);
    await db.auditLog.create({ data: { event: "OPERATOR_LOGIN_FAILED", ...base } });
    expect((await idsOf()).has("LOGIN_STORM")).toBe(true);
  });

  it("backup gagal: dalam 24 jam muncul, lebih tua diabaikan", async () => {
    await db.auditLog.create({ data: { event: "BACKUP_FAILED", detail: `uji ${STAMP} lama`, createdAt: new Date(Date.now() - 25 * 3600_000) } });
    expect((await idsOf()).has("BACKUP_FAILED")).toBe(false);
    await db.auditLog.create({ data: { event: "BACKUP_FAILED", detail: `uji ${STAMP} baru` } });
    expect((await idsOf()).has("BACKUP_FAILED")).toBe(true);
  });

  it("kepatuhan 2FA: KPUM tanpa 2FA → WARNING, lalu hilang setelah 2FA aktif", async () => {
    expect((await idsOf()).has("2FA_KEPATUHAN")).toBe(true);
    await db.operator.update({ where: { username: kpumUsername }, data: { totpEnabledAt: new Date(), totpSecret: "ENC:x" } });
    expect((await idsOf()).has("2FA_KEPATUHAN")).toBe(false);
  });

  it("integritas rantai pada DB segar → tidak ada CRITICAL", async () => {
    const { alerts } = await evaluateAlerts();
    expect(alerts.filter((a) => a.severity === "CRITICAL")).toHaveLength(0);
  });
});
