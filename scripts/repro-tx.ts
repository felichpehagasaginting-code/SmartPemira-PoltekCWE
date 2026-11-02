// Repro: 30 transaksi interaktif Prisma+SQLite paralel — cari konfigurasi yang tidak hang
import { PrismaClient } from "@prisma/client";

const MODE = process.argv[2] ?? "pool4-default";
const urlBase = process.env.DBFILE ?? "/tmp/pemira-repro.db";

function buildUrl(): string {
  switch (MODE) {
    case "pool4-default": return `file:${urlBase}?connection_limit=4`;
    case "pool1": return `file:${urlBase}?connection_limit=1`;
    case "pool4-tuned": return `file:${urlBase}?connection_limit=4`;
  }
  return `file:${urlBase}?connection_limit=4`;
}

const prisma = new PrismaClient({ datasources: { db: { url: buildUrl() } } });

async function main() {
  await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
  await prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000;");
  // tabel sederhana
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS Repro (id INTEGER PRIMARY KEY, v INTEGER, grp TEXT);`);
  await prisma.$executeRawUnsafe(`DELETE FROM Repro;`);
  const N = 30;
  const rows = Array.from({ length: N }, (_, i) => i);
  await prisma.$executeRawUnsafe(`INSERT INTO Repro (id, v, grp) VALUES ${rows.map((i) => `(${i}, 0, 'g${i}')`).join(",")};`);

  const t0 = performance.now();
  const results = await Promise.all(
    rows.map((i) =>
      (async () => {
        const opts =
          MODE === "pool4-tuned"
            ? { maxWait: 15_000, timeout: 30_000 }
            : undefined;
        return prisma.$transaction(
          async (tx) => {
            await tx.$queryRawUnsafe(`SELECT 1;`);
            await tx.$executeRawUnsafe(`UPDATE Repro SET v = v + 1 WHERE id = ${i};`);
            await tx.$queryRawUnsafe(`SELECT COUNT(*) FROM Repro;`);
          },
          opts
        );
      })()
    )
  );
  const ms = Math.round(performance.now() - t0);
  console.log(JSON.stringify({ mode: MODE, done: results.length, ms }));
  await prisma.$disconnect();
  process.exit(0);
}

const killer = setTimeout(() => {
  console.error(JSON.stringify({ mode: MODE, hang: true, afterMs: 20000 }));
  process.exit(124);
}, 20000);

main().catch((e) => {
  console.error(JSON.stringify({ mode: MODE, error: String(e).slice(0, 200) }));
  process.exit(1);
});
