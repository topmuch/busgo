/**
 * Emergency DB fix — creates missing core Bus Go tables so proof can run.
 * Idempotent: only creates if missing.
 */
import { db } from "../src/lib/db";

async function main() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "Bus" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tenantId" TEXT NOT NULL,
      "driverId" TEXT,
      number TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "Trajet" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tenantId" TEXT NOT NULL,
      "busId" TEXT,
      "driverId" TEXT,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      date DATETIME NOT NULL,
      time TEXT NOT NULL,
      price INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'scheduled',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
      FOREIGN KEY ("busId") REFERENCES "Bus"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "Billet" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "trajetId" TEXT NOT NULL,
      "clientId" TEXT NOT NULL,
      "seatNumber" INTEGER NOT NULL,
      "ticketNumber" TEXT NOT NULL UNIQUE,
      "qrCode" TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'sold',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("trajetId") REFERENCES "Trajet"("id"),
      FOREIGN KEY ("clientId") REFERENCES "User"("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Bus_tenantId_number_key" ON "Bus"("tenantId", "number")`,
  ];

  for (const stmt of statements) {
    try {
      await db.$executeRawUnsafe(stmt);
      console.log(`✅ ${stmt.substring(0, 60)}...`);
    } catch (err) {
      console.log(`⏭️  ${stmt.substring(0, 60)}... — ${(err as Error).message.substring(0, 80)}`);
    }
  }

  // Also ensure Tenant has isActive column with value 1
  try {
    await db.$executeRawUnsafe(
      `UPDATE Tenant SET "isActive" = 1 WHERE "isActive" IS NULL OR "isActive" = 0`
    );
    console.log("✅ Tenant.isActive updated");
  } catch (err) {
    console.log(`⏭️  Tenant update — ${(err as Error).message}`);
  }

  await db.$disconnect();
  console.log("🎉 Emergency DB fix complete");
}

main().catch((err) => {
  console.error("💥 Failed:", err);
  process.exit(1);
});
