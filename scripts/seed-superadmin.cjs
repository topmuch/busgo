const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seed() {
  try {
    const count = await prisma.user.count();
    if (count > 0) {
      console.log("DB already seeded, skipping.");
      return;
    }

    console.log("Seeding SuperAdmin user...");

    const passwordHash = await bcrypt.hash("Demo1234!", 10);
    await prisma.user.create({
      data: {
        email: "superadmin@busgo.com",
        password: passwordHash,
        name: "Super Admin",
        phone: "+221 00 000 0000",
        role: "superadmin",
        isActive: true,
      },
    });

    console.log("Done! Login: superadmin@busgo.com / Demo1234!");
  } catch (e) {
    console.error("Seed error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

seed();