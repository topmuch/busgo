import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Bus Go database...\n");

  // Clean existing data (in order to respect foreign keys)
  await prisma.billet.deleteMany();
  await prisma.trajet.deleteMany();
  await prisma.voiceConfig.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const passwordHash = await bcrypt.hash("Demo1234!", 10);

  // --- Tenants ---
  const fastBus = await prisma.tenant.create({
    data: {
      name: "FastBus Express",
      slug: "fastbus",
      phone: "+221 77 123 4567",
      plan: "pro",
      logo: "/logos/fastbus.svg",
    },
  });

  const senegalVoyage = await prisma.tenant.create({
    data: {
      name: "Sénégal Voyage",
      slug: "senegal-voyage",
      phone: "+221 78 987 6543",
      plan: "starter",
    },
  });

  console.log(`Created ${2} tenants`);

  // --- Users ---
  const superadmin = await prisma.user.create({
    data: {
      email: "superadmin@busgo.com",
      password: passwordHash,
      name: "Amadou Diop",
      phone: "+221 76 000 0001",
      role: "superadmin",
      isActive: true,
    },
  });

  const adminFastBus = await prisma.user.create({
    data: {
      email: "admin@fastbus.com",
      password: passwordHash,
      name: "Fatou Ndiaye",
      phone: "+221 77 111 1111",
      role: "admin",
      tenantId: fastBus.id,
      isActive: true,
    },
  });

  const agent1 = await prisma.user.create({
    data: {
      email: "agent@fastbus.com",
      password: passwordHash,
      name: "Moussa Sow",
      phone: "+221 78 222 2222",
      role: "agent",
      tenantId: fastBus.id,
      isActive: true,
    },
  });

  const client1 = await prisma.user.create({
    data: {
      email: "client@demo.com",
      password: passwordHash,
      name: "Aissatou Ba",
      phone: "+221 76 333 3333",
      role: "client",
      tenantId: fastBus.id,
      isActive: true,
    },
  });

  const client2 = await prisma.user.create({
    data: {
      email: "ibrahima@demo.com",
      password: passwordHash,
      name: "Ibrahim Fall",
      phone: "+221 77 444 4444",
      role: "client",
      tenantId: fastBus.id,
      isActive: true,
    },
  });

  const adminSenegalVoyage = await prisma.user.create({
    data: {
      email: "admin@senegalvoyage.sn",
      password: passwordHash,
      name: "Ousmane Diallo",
      phone: "+221 78 555 5555",
      role: "admin",
      tenantId: senegalVoyage.id,
      isActive: true,
    },
  });

  const driver = await prisma.user.create({
    data: {
      email: "chauffeur@fastbus.com",
      password: passwordHash,
      name: "Cheikh Sy",
      phone: "+221 76 666 6666",
      role: "agent",
      tenantId: fastBus.id,
      isActive: true,
    },
  });

  console.log(`Created ${7} users`);

  // --- Buses ---
  const bus1 = await prisma.bus.create({
    data: {
      tenantId: fastBus.id,
      number: "FB-001",
      capacity: 50,
      driverId: driver.id,
      isActive: true,
    },
  });

  const bus2 = await prisma.bus.create({
    data: {
      tenantId: fastBus.id,
      number: "FB-002",
      capacity: 35,
      isActive: true,
    },
  });

  const bus3 = await prisma.bus.create({
    data: {
      tenantId: senegalVoyage.id,
      number: "SV-001",
      capacity: 45,
      isActive: true,
    },
  });

  console.log(`Created ${3} buses`);

  // --- Trajets ---
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(7, 30, 0, 0);

  const in3Days = new Date(now);
  in3Days.setDate(in3Days.getDate() + 3);
  in3Days.setHours(9, 0, 0, 0);

  const trajet1 = await prisma.trajet.create({
    data: {
      tenantId: fastBus.id,
      busId: bus1.id,
      origin: "Dakar",
      destination: "Saint-Louis",
      date: tomorrow,
      time: "08:00",
      price: 5000,
      status: "scheduled",
    },
  });

  const trajet2 = await prisma.trajet.create({
    data: {
      tenantId: fastBus.id,
      busId: bus2.id,
      origin: "Dakar",
      destination: "Thiès",
      date: tomorrow,
      time: "10:30",
      price: 2000,
      status: "scheduled",
    },
  });

  const trajet3 = await prisma.trajet.create({
    data: {
      tenantId: fastBus.id,
      busId: bus1.id,
      origin: "Saint-Louis",
      destination: "Dakar",
      date: dayAfter,
      time: "07:30",
      price: 5000,
      status: "scheduled",
    },
  });

  const trajet4 = await prisma.trajet.create({
    data: {
      tenantId: fastBus.id,
      busId: bus2.id,
      origin: "Dakar",
      destination: "Kaolack",
      date: in3Days,
      time: "09:00",
      price: 3500,
      status: "scheduled",
    },
  });

  const trajet5 = await prisma.trajet.create({
    data: {
      tenantId: senegalVoyage.id,
      busId: bus3.id,
      origin: "Dakar",
      destination: "Ziguinchor",
      date: in3Days,
      time: "06:00",
      price: 8000,
      status: "scheduled",
    },
  });

  console.log(`Created ${5} trajets`);

  // --- Billets ---
  const ticketPrefix = "BG";
  const generateTicketNumber = (index: number) =>
    `${ticketPrefix}-${Date.now().toString(36).toUpperCase()}-${index.toString().padStart(4, "0")}`;
  const generateQrCode = (ticketNumber: string) =>
    `qr_${ticketNumber.replace(/-/g, "_")}`;

  const billet1 = await prisma.billet.create({
    data: {
      trajetId: trajet1.id,
      clientId: client1.id,
      seatNumber: 1,
      ticketNumber: generateTicketNumber(1),
      qrCode: generateQrCode("BG-TKT-0001"),
      status: "sold",
    },
  });

  const billet2 = await prisma.billet.create({
    data: {
      trajetId: trajet1.id,
      clientId: client2.id,
      seatNumber: 2,
      ticketNumber: generateTicketNumber(2),
      qrCode: generateQrCode("BG-TKT-0002"),
      status: "sold",
    },
  });

  const billet3 = await prisma.billet.create({
    data: {
      trajetId: trajet2.id,
      clientId: client1.id,
      seatNumber: 5,
      ticketNumber: generateTicketNumber(3),
      qrCode: generateQrCode("BG-TKT-0003"),
      status: "sold",
    },
  });

  console.log(`Created ${3} billets`);

  // --- VoiceConfig ---
  await prisma.voiceConfig.create({
    data: {
      tenantId: fastBus.id,
      introText:
        "Bienvenue à bord de FastBus Express. Merci de voyager avec nous. Veuillez installer votre ceinture de sécurité et garder vos effets personnels près de vous.",
      language: "fr-FR",
    },
  });

  console.log(`Created 1 voice config`);

  // --- Summary ---
  console.log("\n--- Seed Summary ---");
  console.log("Tenants:     FastBus Express, Sénégal Voyage");
  console.log("SuperAdmin:  superadmin@busgo.com / Demo1234!");
  console.log("Admin:       admin@fastbus.com / Demo1234!");
  console.log("Agent:       agent@fastbus.com / Demo1234!");
  console.log("Client:      client@demo.com / Demo1234!");
  console.log("Client 2:    ibrahima@demo.com / Demo1234!");
  console.log("Chauffeur:   chauffeur@fastbus.com / Demo1234!");
  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });