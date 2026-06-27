/**
 * ═══════════════════════════════════════════════════════════════
 *  DATABASE SCHEMA SYNC — Align SQLite DB with Prisma schema
 * ═══════════════════════════════════════════════════════════════
 *
 *  Problem: The SQLite DB has fewer columns than the Prisma schema
 *  expects (the DB was created by an older schema version, then
 *  subsequent migrations added fields without ALTER TABLE).
 *  This causes runtime errors like:
 *    "The column `main.Tenant.logo` does not exist in the current database"
 *  which surfaces as 500 errors on every page that touches the Tenant.
 *
 *  Solution: ALTER TABLE ADD COLUMN for every missing column.
 *  SQLite supports ADD COLUMN (but not DROP COLUMN before 3.35).
 *
 *  This script is IDEMPOTENT: it checks if the column exists before
 *  adding it. Safe to run multiple times.
 *
 *  Usage: bun scripts/sync-db-schema.ts
 */

import { db } from "../src/lib/db";

interface ColumnInfo {
  name: string;
  type: string;
}

async function getColumns(table: string): Promise<Set<string>> {
  try {
    const cols = await db.$queryRawUnsafe<ColumnInfo[]>(
      `PRAGMA table_info(${table})`
    );
    return new Set(cols.map((c) => c.name));
  } catch {
    return new Set();
  }
}

async function addColumnIfMissing(
  table: string,
  column: string,
  definition: string
): Promise<void> {
  const cols = await getColumns(table);
  if (cols.has(column)) {
    return; // Already exists
  }
  try {
    await db.$executeRawUnsafe(
      `ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`
    );
    console.log(`  ✅ ${table}.${column} added`);
  } catch (err) {
    // Column may have been added by a parallel call — check again
    const colsAfter = await getColumns(table);
    if (!colsAfter.has(column)) {
      console.error(`  ❌ ${table}.${column}: ${(err as Error).message}`);
    }
  }
}

async function createTableIfMissing(
  table: string,
  definition: string
): Promise<void> {
  const cols = await getColumns(table);
  if (cols.size > 0) return;
  try {
    await db.$executeRawUnsafe(definition);
    console.log(`  ✅ Table ${table} created`);
  } catch (err) {
    console.error(`  ❌ Table ${table}: ${(err as Error).message}`);
  }
}

async function main() {
  console.log("🚀 Syncing SQLite DB with Prisma schema...\n");

  // ═══════════════════════════════════════════════════════════════
  // 1. TENANT — add 17 missing columns
  // ═══════════════════════════════════════════════════════════════
  console.log("📍 Tenant");
  await addColumnIfMissing("Tenant", "logo", "TEXT");
  await addColumnIfMissing("Tenant", "phone", "TEXT");
  await addColumnIfMissing("Tenant", "email", "TEXT");
  await addColumnIfMissing("Tenant", "address", "TEXT");
  await addColumnIfMissing("Tenant", "country", 'TEXT NOT NULL DEFAULT "SN"');
  await addColumnIfMissing("Tenant", "seoTitle", "TEXT");
  await addColumnIfMissing("Tenant", "seoDescription", "TEXT");
  await addColumnIfMissing("Tenant", "seoKeywords", "TEXT");
  await addColumnIfMissing("Tenant", "ogImage", "TEXT");
  await addColumnIfMissing(
    "Tenant",
    "primaryColor",
    'TEXT NOT NULL DEFAULT "#7C3AED"'
  );
  await addColumnIfMissing(
    "Tenant",
    "secondaryColor",
    'TEXT NOT NULL DEFAULT "#F43F5E"'
  );
  await addColumnIfMissing(
    "Tenant",
    "subscriptionStatus",
    'TEXT NOT NULL DEFAULT "trial"'
  );
  await addColumnIfMissing("Tenant", "subscriptionStart", "DATETIME");
  await addColumnIfMissing("Tenant", "subscriptionEnd", "DATETIME");
  await addColumnIfMissing("Tenant", "totalBuses", "INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing(
    "Tenant",
    "monthlyPrice",
    "INTEGER NOT NULL DEFAULT 0"
  );
  await addColumnIfMissing("Tenant", "adminEmail", "TEXT");
  await addColumnIfMissing("Tenant", "adminPassword", "TEXT");
  await addColumnIfMissing("Tenant", "adminPhone", "TEXT");
  await addColumnIfMissing(
    "Tenant",
    "isSuspended",
    "BOOLEAN NOT NULL DEFAULT 0"
  );
  await addColumnIfMissing("Tenant", "suspensionReason", "TEXT");
  await addColumnIfMissing("Tenant", "suspendedAt", "DATETIME");
  await addColumnIfMissing("Tenant", "suspendedBy", "TEXT");
  await addColumnIfMissing(
    "Tenant",
    "totalRevenue",
    "INTEGER NOT NULL DEFAULT 0"
  );
  await addColumnIfMissing("Tenant", "lastLoginAt", "DATETIME");

  // ═══════════════════════════════════════════════════════════════
  // 2. USER — missing columns
  // ═══════════════════════════════════════════════════════════════
  console.log("\n👤 User");
  await addColumnIfMissing(
    "User",
    "reliabilityScore",
    "REAL DEFAULT 100.0"
  );

  // ═══════════════════════════════════════════════════════════════
  // 3. BUS — @@unique([tenantId, number]) index (SQLite doesn't have
  //    unique constraint easily added via ALTER, but we can add a unique index)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n🚌 Bus");
  try {
    await db.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "Bus_tenantId_number_key" ON "Bus"("tenantId", "number")'
    );
    console.log("  ✅ Bus unique index ok");
  } catch (err) {
    console.error("  ❌ Bus index:", (err as Error).message);
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. VOICECONFIG — entire table likely missing
  // ═══════════════════════════════════════════════════════════════
  console.log("\n🎤 VoiceConfig");
  await createTableIfMissing(
    "VoiceConfig",
    `CREATE TABLE IF NOT EXISTS "VoiceConfig" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tenantId" TEXT NOT NULL UNIQUE,
      "introText" TEXT NOT NULL DEFAULT 'Bienvenue à bord',
      "audioUrl" TEXT,
      "language" TEXT NOT NULL DEFAULT 'fr-FR',
      "announceT15" BOOLEAN NOT NULL DEFAULT 1,
      "announceT5" BOOLEAN NOT NULL DEFAULT 1,
      "announceT2" BOOLEAN NOT NULL DEFAULT 1,
      "announceDelay" BOOLEAN NOT NULL DEFAULT 1,
      "announceArrival" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    )`
  );

  // ═══════════════════════════════════════════════════════════════
  // 5. SUBSCRIPTION — entire table missing (0 cols)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n💳 Subscription");
  await createTableIfMissing(
    "Subscription",
    `CREATE TABLE IF NOT EXISTS "Subscription" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tenantId" TEXT NOT NULL,
      "plan" TEXT NOT NULL DEFAULT 'starter',
      "status" TEXT NOT NULL DEFAULT 'active',
      "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endDate" DATETIME NOT NULL,
      "pricePerBus" INTEGER NOT NULL DEFAULT 20000,
      "busCount" INTEGER NOT NULL DEFAULT 0,
      "totalAmount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    )`
  );

  // ═══════════════════════════════════════════════════════════════
  // 6. NOTIFICATIONTEMPLATE — missing
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📨 NotificationTemplate");
  await createTableIfMissing(
    "NotificationTemplate",
    `CREATE TABLE IF NOT EXISTS "NotificationTemplate" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tenantId" TEXT,
      "type" TEXT NOT NULL DEFAULT 'email',
      "event" TEXT NOT NULL,
      "subject" TEXT,
      "body" TEXT NOT NULL DEFAULT '',
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    )`
  );

  // ═══════════════════════════════════════════════════════════════
  // 7. SYSTEMCONFIG — missing
  // ═══════════════════════════════════════════════════════════════
  console.log("\n⚙️  SystemConfig");
  await createTableIfMissing(
    "SystemConfig",
    `CREATE TABLE IF NOT EXISTS "SystemConfig" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
      "siteName" TEXT NOT NULL DEFAULT 'Bus Go',
      "siteDescription" TEXT NOT NULL DEFAULT 'SaaS de gestion d embarquement pour compagnies de bus',
      "siteKeywords" TEXT,
      "ogImage" TEXT,
      "favicon" TEXT,
      "logoUrl" TEXT,
      "primaryColor" TEXT NOT NULL DEFAULT '#7C3AED',
      "secondaryColor" TEXT NOT NULL DEFAULT '#F43F5E',
      "supportEmail" TEXT NOT NULL DEFAULT 'support@busgo.sn',
      "supportPhone" TEXT NOT NULL DEFAULT '+221 33 XXX XX XX',
      "supportWhatsApp" TEXT NOT NULL DEFAULT '+221 77 XXX XX XX',
      "address" TEXT,
      "pricePerBus" INTEGER NOT NULL DEFAULT 20000,
      "trialDays" INTEGER NOT NULL DEFAULT 14,
      "smsEnabled" BOOLEAN NOT NULL DEFAULT 0,
      "whatsappEnabled" BOOLEAN NOT NULL DEFAULT 1,
      "ttsEnabled" BOOLEAN NOT NULL DEFAULT 1,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  // Insert default SystemConfig row if not exists
  try {
    await db.$executeRawUnsafe(
      `INSERT OR IGNORE INTO "SystemConfig" ("id", "updatedAt") VALUES ('global', datetime('now'))`
    );
    console.log("  ✅ Default SystemConfig row ensured");
  } catch (err) {
    console.error("  ❌ SystemConfig seed:", (err as Error).message);
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. Final verification
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📊 Final verification:");
  for (const t of [
    "Tenant",
    "User",
    "Bus",
    "Trajet",
    "Billet",
    "VoiceConfig",
    "Subscription",
    "NotificationTemplate",
    "SystemConfig",
    "AuditLog",
    "Compensation",
    "SponsoredOffer",
    "PushSubscription",
  ]) {
    const cols = await getColumns(t);
    console.log(`  ${t}: ${cols.size} columns`);
  }

  console.log("\n🎉 DB schema sync complete!");
  await db.$disconnect();
}

main().catch((err) => {
  console.error("💥 Sync failed:", err);
  process.exit(1);
});
