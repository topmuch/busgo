/**
 * Seed raw SQL — bypasses Prisma schema mismatch.
 * Creates: tenant, user, bus, trajet, billet for proof script.
 */
import { db } from "../src/lib/db";

async function main() {
  // Use raw SQL to avoid Prisma schema/DB mismatch on Tenant table
  // Check if tenant exists
  const existing = await db.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM Tenant WHERE slug = 'proof-tenant' LIMIT 1`
  );

  let tenantId: string;
  if (existing.length > 0) {
    tenantId = existing[0]!.id;
    console.log(`✅ Tenant existant: ${tenantId}`);
  } else {
    const result = await db.$executeRawUnsafe(
      `INSERT INTO Tenant (id, name, slug, plan, "isActive", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      "tenant-proof",
      "Proof Tenant",
      "proof-tenant",
      "starter"
    );
    tenantId = "tenant-proof";
    console.log(`✅ Tenant créé: ${tenantId} (rows=${result})`);
  }

  // User
  const existingUser = await db.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM User WHERE email = 'proof@busgo.sn' LIMIT 1`
  );
  let userId: string;
  if (existingUser.length > 0) {
    userId = existingUser[0]!.id;
    console.log(`✅ User existant: ${userId}`);
  } else {
    userId = "user-proof";
    await db.$executeRawUnsafe(
      `INSERT INTO User (id, email, password, name, phone, role, "tenantId", "isActive", "createdAt", updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      userId,
      "proof@busgo.sn",
      "$2a$10$hashed",
      "Proof Client",
      "+22177000000",
      "client",
      tenantId
    );
    console.log(`✅ User créé: ${userId}`);
  }

  // Bus
  const existingBus = await db.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM Bus WHERE "tenantId" = ? LIMIT 1`,
    tenantId
  );
  let busId: string;
  if (existingBus.length > 0) {
    busId = existingBus[0]!.id;
    console.log(`✅ Bus existant: ${busId}`);
  } else {
    busId = "bus-proof";
    await db.$executeRawUnsafe(
      `INSERT INTO Bus (id, "tenantId", number, capacity, "isActive", "createdAt") VALUES (?, ?, ?, ?, 1, datetime('now'))`,
      busId,
      tenantId,
      "PRF-001",
      50
    );
    console.log(`✅ Bus créé: ${busId}`);
  }

  // Trajet
  const existingTrajet = await db.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM Trajet WHERE "tenantId" = ? LIMIT 1`,
    tenantId
  );
  let trajetId: string;
  if (existingTrajet.length > 0) {
    trajetId = existingTrajet[0]!.id;
    console.log(`✅ Trajet existant: ${trajetId}`);
  } else {
    trajetId = "trajet-proof";
    await db.$executeRawUnsafe(
      `INSERT INTO Trajet (id, "tenantId", "busId", origin, destination, date, time, price, status, "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      trajetId,
      tenantId,
      busId,
      "Dakar",
      "Thiès",
      new Date(Date.now() + 86400000).toISOString(),
      "08:00",
      5000,
      "scheduled"
    );
    console.log(`✅ Trajet créé: ${trajetId}`);
  }

  // Billet
  const existingBillet = await db.$queryRawUnsafe<Array<{ id: string; status: string }>>(
    `SELECT id, status FROM Billet WHERE "clientId" = ? LIMIT 1`,
    userId
  );
  let billetId: string;
  if (existingBillet.length > 0) {
    billetId = existingBillet[0]!.id;
    // Reset to 'sold' for re-run
    await db.$executeRawUnsafe(
      `UPDATE Billet SET status = 'sold' WHERE id = ?`,
      billetId
    );
    console.log(`✅ Billet existant reset à 'sold': ${billetId}`);
  } else {
    billetId = "billet-proof";
    await db.$executeRawUnsafe(
      `INSERT INTO Billet (id, "trajetId", "clientId", "seatNumber", "ticketNumber", "qrCode", status, "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      billetId,
      trajetId,
      userId,
      1,
      `PRF-${Date.now()}`,
      `qr-${Date.now()}`,
      "sold"
    );
    console.log(`✅ Billet créé: ${billetId}`);
  }

  console.log(`\n🎉 Seed complete!`);
  console.log(`   tenantId: ${tenantId}`);
  console.log(`   userId: ${userId}`);
  console.log(`   busId: ${busId}`);
  console.log(`   trajetId: ${trajetId}`);
  console.log(`   billetId: ${billetId}`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error("💥 Seed failed:", err);
  process.exit(1);
});
