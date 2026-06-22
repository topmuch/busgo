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
  await prisma.notificationTemplate.deleteMany();
  await prisma.systemLog.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscription.deleteMany();
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
      reliabilityScore: 95.0,
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
      reliabilityScore: 72.0,
    },
  });

  const client3 = await prisma.user.create({
    data: {
      email: "mamadou@demo.com",
      password: passwordHash,
      name: "Mamadou Diallo",
      phone: "+221 78 555 0000",
      role: "client",
      tenantId: fastBus.id,
      isActive: true,
      reliabilityScore: 88.0,
    },
  });

  const client4 = await prisma.user.create({
    data: {
      email: "fatoumata@demo.com",
      password: passwordHash,
      name: "Fatoumata Touré",
      phone: "+221 76 666 0000",
      role: "client",
      tenantId: fastBus.id,
      isActive: true,
      reliabilityScore: 60.0,
    },
  });

  const client5 = await prisma.user.create({
    data: {
      email: "ousmane@demo.com",
      password: passwordHash,
      name: "Ousmane Ndiaye",
      phone: "+221 77 777 0000",
      role: "client",
      tenantId: fastBus.id,
      isActive: true,
      reliabilityScore: 100.0,
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

  console.log(`Created ${9} users`);

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
      driverId: agent1.id,
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
  const today1 = new Date(now);
  today1.setHours(now.getHours() + 1, 0, 0, 0);

  const today2 = new Date(now);
  today2.setHours(now.getHours() + 3, 30, 0, 0);

  const today3 = new Date(now);
  today3.setHours(now.getHours() + 5, 0, 0, 0);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(7, 30, 0, 0);

  const in3Days = new Date(now);
  in3Days.setDate(in3Days.getDate() + 3);
  in3Days.setHours(9, 0, 0, 0);

  // Today's trajets assigned to agents
  const trajet1 = await prisma.trajet.create({
    data: {
      tenantId: fastBus.id,
      busId: bus1.id,
      driverId: driver.id,
      origin: "Dakar",
      destination: "Saint-Louis",
      date: today1,
      time: String(today1.getHours()).padStart(2, "0") + ":00",
      price: 5000,
      zone: "Quai A1",
      status: "scheduled",
    },
  });

  const trajetToday2 = await prisma.trajet.create({
    data: {
      tenantId: fastBus.id,
      busId: bus2.id,
      driverId: agent1.id,
      origin: "Dakar",
      destination: "Thiès",
      date: today2,
      time: String(today2.getHours()).padStart(2, "0") + ":30",
      price: 2000,
      zone: "Quai B3",
      status: "scheduled",
    },
  });

  const trajetToday3 = await prisma.trajet.create({
    data: {
      tenantId: fastBus.id,
      busId: bus1.id,
      driverId: driver.id,
      origin: "Dakar",
      destination: "Rufisque",
      date: today3,
      time: String(today3.getHours()).padStart(2, "0") + ":00",
      price: 1500,
      zone: "Quai A2",
      status: "scheduled",
    },
  });

  const trajet2 = await prisma.trajet.create({
    data: {
      tenantId: fastBus.id,
      busId: bus1.id,
      driverId: driver.id,
      origin: "Dakar",
      destination: "Saint-Louis",
      date: tomorrow,
      time: "08:00",
      price: 5000,
      zone: "Quai A1",
      status: "scheduled",
    },
  });

  const trajet3 = await prisma.trajet.create({
    data: {
      tenantId: fastBus.id,
      busId: bus1.id,
      driverId: driver.id,
      origin: "Saint-Louis",
      destination: "Dakar",
      date: dayAfter,
      time: "07:30",
      price: 5000,
      zone: "Quai C1",
      status: "scheduled",
    },
  });

  const trajet4 = await prisma.trajet.create({
    data: {
      tenantId: fastBus.id,
      busId: bus2.id,
      driverId: agent1.id,
      origin: "Dakar",
      destination: "Kaolack",
      date: in3Days,
      time: "09:00",
      price: 3500,
      zone: "Quai B1",
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
      zone: "Quai D1",
      status: "scheduled",
    },
  });

  console.log(`Created ${7} trajets`);

  // --- Billets ---
  const ticketPrefix = "BG";
  const generateTicketNumber = (index: number) =>
    `${ticketPrefix}-${Date.now().toString(36).toUpperCase()}-${index.toString().padStart(4, "0")}`;
  const generateQrCode = (ticketNumber: string) =>
    `qr_${ticketNumber.replace(/-/g, "_")}`;

  const clients = [client1, client2, client3, client4, client5];
  let billetIdx = 0;

  // Trajet 1: 15 billets (various clients)
  for (let i = 1; i <= 15; i++) {
    billetIdx++;
    await prisma.billet.create({
      data: {
        trajetId: trajet1.id,
        clientId: clients[i % 5].id,
        seatNumber: i,
        ticketNumber: generateTicketNumber(billetIdx),
        qrCode: generateQrCode(`BG-TKT-${String(billetIdx).padStart(4, "0")}`),
        status: i <= 3 ? "boarded" : i === 14 ? "absent" : "sold",
      },
    });
  }

  // TrajetToday2: 10 billets
  for (let i = 1; i <= 10; i++) {
    billetIdx++;
    await prisma.billet.create({
      data: {
        trajetId: trajetToday2.id,
        clientId: clients[i % 5].id,
        seatNumber: i,
        ticketNumber: generateTicketNumber(billetIdx),
        qrCode: generateQrCode(`BG-TKT-${String(billetIdx).padStart(4, "0")}`),
        status: "sold",
      },
    });
  }

  // TrajetToday3: 8 billets
  for (let i = 1; i <= 8; i++) {
    billetIdx++;
    await prisma.billet.create({
      data: {
        trajetId: trajetToday3.id,
        clientId: clients[i % 5].id,
        seatNumber: i,
        ticketNumber: generateTicketNumber(billetIdx),
        qrCode: generateQrCode(`BG-TKT-${String(billetIdx).padStart(4, "0")}`),
        status: "sold",
      },
    });
  }

  // Trajet 2 (tomorrow): 5 billets
  for (let i = 1; i <= 5; i++) {
    billetIdx++;
    await prisma.billet.create({
      data: {
        trajetId: trajet2.id,
        clientId: clients[i % 5].id,
        seatNumber: i,
        ticketNumber: generateTicketNumber(billetIdx),
        qrCode: generateQrCode(`BG-TKT-${String(billetIdx).padStart(4, "0")}`),
        status: "sold",
      },
    });
  }

  console.log(`Created ${billetIdx} billets`);

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

  // --- Subscriptions ---
  const subNow = new Date();
  const threeMonthsAgo = new Date(subNow);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const nextMonth = new Date(subNow);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const subFastBus = await prisma.subscription.create({
    data: {
      tenantId: fastBus.id,
      plan: "pro",
      status: "active",
      startDate: threeMonthsAgo,
      endDate: nextMonth,
      pricePerBus: 20000,
      busCount: 2,
      totalAmount: 2 * 20000,
    },
  });

  const subSenegalVoyage = await prisma.subscription.create({
    data: {
      tenantId: senegalVoyage.id,
      plan: "starter",
      status: "active",
      startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      endDate: nextMonth,
      pricePerBus: 20000,
      busCount: 1,
      totalAmount: 1 * 20000,
    },
  });

  console.log(`Created 2 subscriptions`);

  // --- Invoices ---
  const invoiceData = [];
  for (let m = 0; m < 4; m++) {
    const month = new Date(now.getFullYear(), now.getMonth() - (3 - m), 1);
    const dueDay = new Date(month.getFullYear(), month.getMonth() + 1, 5);
    invoiceData.push(
      {
        tenantId: fastBus.id,
        subscriptionId: subFastBus.id,
        number: `INV-FB-${String(month.getFullYear()).slice(2)}${String(month.getMonth() + 1).padStart(2, "0")}`,
        amount: 2 * 20000,
        status: m < 3 ? "paid" : "pending",
        dueDate: dueDay,
        paidAt: m < 3 ? new Date(month.getFullYear(), month.getMonth(), 15) : null,
      },
      {
        tenantId: senegalVoyage.id,
        subscriptionId: subSenegalVoyage.id,
        number: `INV-SV-${String(month.getFullYear()).slice(2)}${String(month.getMonth() + 1).padStart(2, "0")}`,
        amount: 1 * 20000,
        status: m < 2 ? "paid" : m === 2 ? "failed" : "pending",
        dueDate: dueDay,
        paidAt: m < 2 ? new Date(month.getFullYear(), month.getMonth(), 12) : null,
      }
    );
  }

  for (const inv of invoiceData) {
    await prisma.invoice.create({ data: inv });
  }

  console.log(`Created ${invoiceData.length} invoices`);

  // --- System Logs ---
  const logEntries = [
    { level: "info", action: "tenant_created", message: "Entreprise FastBus Express créée", tenantId: fastBus.id },
    { level: "info", action: "tenant_created", message: "Entreprise Sénégal Voyage créée", tenantId: senegalVoyage.id },
    { level: "warning", action: "payment_failed", message: "Paiement échoué pour Sénégal Voyage - INV-SV-2605", tenantId: senegalVoyage.id },
    { level: "info", action: "user_login", message: "Connexion superadmin@busgo.com", userId: superadmin.id },
    { level: "error", action: "invoice_overdue", message: "Facture INV-SV-2606 en retard", tenantId: senegalVoyage.id },
    { level: "info", action: "subscription_renewed", message: "Abonnement FastBus Express renouvelé", tenantId: fastBus.id },
    { level: "warning", action: "tenant_inactive", message: "Sénégal Voyage marquée inactive temporairement", tenantId: senegalVoyage.id },
    { level: "info", action: "plan_upgraded", message: "FastBus Express mis à niveau vers le plan Pro", tenantId: fastBus.id },
  ];

  for (const log of logEntries) {
    await prisma.systemLog.create({ data: log });
  }

  console.log(`Created ${logEntries.length} system logs`);

  // --- Notification Templates ---
  const templates = [
    { type: "email", event: "boarding_reminder", subject: "Rappel d'embarquement", body: "Bonjour {{clientName}}, votre trajet {{origin}} → {{destination}} départ à {{time}}. N'oubliez pas d'arriver 15 min en avance.", isActive: true },
    { type: "email", event: "delay_alert", subject: "Retard signalé", body: "Bonjour {{clientName}}, votre trajet {{origin}} → {{destination}} est retardé de {{delayMinutes}} minutes.", isActive: true },
    { type: "email", event: "arrival_notice", subject: "Arrivée à destination", body: "Bonjour {{clientName}}, votre trajet est arrivé à {{destination}}. Merci d'avoir voyagé avec nous !", isActive: true },
    { type: "email", event: "payment_reminder", subject: "Rappel de paiement", body: "Bonjour, votre facture {{invoiceNumber}} d'un montant de {{amount}} FCFA est due le {{dueDate}}.", isActive: true },
    { type: "email", event: "welcome", subject: "Bienvenue sur Bus Go", body: "Bonjour {{name}}, votre compte a été créé avec succès. Bienvenue sur la plateforme Bus Go !", isActive: true },
    { type: "sms", event: "boarding_reminder", subject: null, body: "Bus Go: Votre trajet {{origin}}-{{destination}} depart a {{time}}. Arrivez 15 min en avance.", isActive: true },
    { type: "sms", event: "delay_alert", subject: null, body: "Bus Go: Retard de {{delayMinutes}} min pour {{origin}}-{{destination}}.", isActive: true },
  ];

  for (const tpl of templates) {
    await prisma.notificationTemplate.create({ data: { ...tpl, tenantId: null } });
  }

  console.log(`Created ${templates.length} notification templates`);

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