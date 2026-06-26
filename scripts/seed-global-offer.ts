/**
 * Seed a global sponsored offer so all tenants see at least one banner.
 * Run: bun scripts/seed-global-offer.ts
 */
import { db } from "../src/lib/db";

async function main() {
  // Check if a global offer already exists
  const existing = await db.sponsoredOffer.findFirst({
    where: { scope: "global" },
  });

  if (existing) {
    console.log(`✅ Offre globale déjà existante: ${existing.id} (${existing.title})`);
    await db.$disconnect();
    return;
  }

  // Find a superadmin or admin user to be the creator
  const user = await db.user.findFirst({
    where: { role: { in: ["superadmin", "admin"] } },
    select: { id: true, name: true },
  });

  if (!user) {
    console.log("❌ Aucun utilisateur admin trouvé. Créez d'abord un admin.");
    await db.$disconnect();
    return;
  }

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 3);

  const offer = await db.sponsoredOffer.create({
    data: {
      scope: "global",
      tenantId: null,
      targetPwa: "both",
      title: "🎉 Bienvenue sur Bus Go — Téléchargez la PWA",
      description: "Installez l'app Bus Go sur votre écran d'accueil pour un accès rapide à vos billets et notifications en temps réel.",
      ctaLabel: "Installer l'app",
      ctaUrl: "/client",
      bgColor: "#F97316",
      textColor: "#ffffff",
      endDate,
      isActive: true,
      priority: 100,
      maxImpressions: 50000,
      maxClicks: 5000,
      createdBy: user.id,
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Offre globale créée:`);
  console.log(`   ID: ${offer.id}`);
  console.log(`   Titre: ${offer.title}`);
  console.log(`   Scope: global (visible par tous les tenants)`);
  console.log(`   PWA: ${offer.targetPwa}`);
  console.log(`   Expire le: ${offer.endDate.toISOString().split("T")[0]}`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error("💥 Failed:", err);
  process.exit(1);
});
