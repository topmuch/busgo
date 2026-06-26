/**
 * Migration — PushSubscription table for web-push notifications.
 * Idempotent: only creates if missing.
 */
import { db } from "../src/lib/db";

async function main() {
  const stmt = `CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL UNIQUE,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
  )`;

  try {
    await db.$executeRawUnsafe(stmt);
    console.log("✅ PushSubscription table created (or already exists)");
  } catch (err) {
    console.error("❌ Error:", (err as Error).message);
  }

  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId")`
  );
  console.log("✅ Index PushSubscription_userId_idx created");

  await db.$disconnect();
}

main().catch((err) => {
  console.error("💥 Failed:", err);
  process.exit(1);
});
