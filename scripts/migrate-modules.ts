import { db } from "../src/lib/db";

async function main() {
  try {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Compensation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tenantId" TEXT NOT NULL,
      "billetId" TEXT NOT NULL,
      "clientId" TEXT NOT NULL,
      "amountFcfa" INTEGER NOT NULL,
      "reason" TEXT NOT NULL DEFAULT 'missed_delay',
      "status" TEXT NOT NULL DEFAULT 'pending',
      "hadGpsTracking" BOOLEAN NOT NULL DEFAULT 0,
      "lastDistanceMeters" INTEGER,
      "lastEtaMinutes" INTEGER,
      "wasMovingTowardsQuay" BOOLEAN NOT NULL DEFAULT 0,
      "voucherCode" TEXT NOT NULL UNIQUE,
      "redeemedAt" DATETIME,
      "redeemedByBilletId" TEXT,
      "issuedBy" TEXT,
      "issuedByAudit" TEXT,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" DATETIME NOT NULL
    )`);
    console.log("✅ Compensation created");
  } catch (err) {
    console.error("❌ Error:", (err as Error).message);
  }

  try {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SponsoredOffer" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "scope" TEXT NOT NULL DEFAULT 'tenant',
      "tenantId" TEXT,
      "targetPwa" TEXT NOT NULL DEFAULT 'client',
      "title" TEXT NOT NULL,
      "description" TEXT,
      "imageUrl" TEXT,
      "ctaLabel" TEXT NOT NULL DEFAULT 'En savoir plus',
      "ctaUrl" TEXT NOT NULL,
      "bgColor" TEXT NOT NULL DEFAULT '#4A90E2',
      "textColor" TEXT NOT NULL DEFAULT '#ffffff',
      "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endDate" DATETIME NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "maxImpressions" INTEGER,
      "maxClicks" INTEGER,
      "priority" INTEGER NOT NULL DEFAULT 50,
      "impressionsCount" INTEGER NOT NULL DEFAULT 0,
      "clicksCount" INTEGER NOT NULL DEFAULT 0,
      "createdBy" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`);
    console.log("✅ SponsoredOffer created");
  } catch (err) {
    console.error("❌ Error:", (err as Error).message);
  }

  // Add indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS "Compensation_tenantId_idx" ON "Compensation"("tenantId")',
    'CREATE INDEX IF NOT EXISTS "Compensation_clientId_idx" ON "Compensation"("clientId")',
    'CREATE INDEX IF NOT EXISTS "Compensation_status_idx" ON "Compensation"("status")',
    'CREATE INDEX IF NOT EXISTS "Compensation_voucherCode_idx" ON "Compensation"("voucherCode")',
    'CREATE INDEX IF NOT EXISTS "Compensation_billetId_idx" ON "Compensation"("billetId")',
    'CREATE INDEX IF NOT EXISTS "SponsoredOffer_tenantId_idx" ON "SponsoredOffer"("tenantId")',
    'CREATE INDEX IF NOT EXISTS "SponsoredOffer_scope_idx" ON "SponsoredOffer"("scope")',
    'CREATE INDEX IF NOT EXISTS "SponsoredOffer_targetPwa_idx" ON "SponsoredOffer"("targetPwa")',
    'CREATE INDEX IF NOT EXISTS "SponsoredOffer_isActive_idx" ON "SponsoredOffer"("isActive")',
    'CREATE INDEX IF NOT EXISTS "SponsoredOffer_priority_idx" ON "SponsoredOffer"("priority")',
  ];
  for (const stmt of indexes) {
    try {
      await db.$executeRawUnsafe(stmt);
    } catch (err) {
      console.error("❌ Index error:", (err as Error).message);
    }
  }

  // Verify
  const tables = await db.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('Compensation', 'SponsoredOffer', 'OfferImpression', 'OfferClick')`
  );
  console.log("\n📊 Tables found:");
  for (const t of tables) console.log(`   ✓ ${t.name}`);

  await db.$disconnect();
}

main();
