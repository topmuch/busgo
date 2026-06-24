/**
 * Create a new superadmin user.
 *
 * Usage: bun run scripts/create-superadmin.ts
 *
 * Default credentials (overridable via env vars):
 *   - email:    SUPERADMIN_EMAIL    (default: admin@busgo.sn)
 *   - password: SUPERADMIN_PASSWORD (default: auto-generated 16-char strong)
 *
 * If a user with the same email already exists, the script aborts with an
 * error message (use --force to overwrite the password).
 */
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function main() {
  const email = (process.env.SUPERADMIN_EMAIL || "admin@busgo.sn")
    .toLowerCase()
    .trim();
  const name = process.env.SUPERADMIN_NAME || "Super Admin";
  const phone = process.env.SUPERADMIN_PHONE || "+221 00 000 0000";

  // Generate a strong 16-char password if not provided
  const password =
    process.env.SUPERADMIN_PASSWORD ||
    crypto.randomBytes(12).toString("base64").slice(0, 16);

  const force = process.argv.includes("--force");

  console.log("═══════════════════════════════════════════════════════");
  console.log("  Création du compte SuperAdmin");
  console.log("═══════════════════════════════════════════════════════\n");

  // Check if user already exists
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (!force) {
      console.error(`❌ Un utilisateur avec l'email ${email} existe déjà.`);
      console.error("   Utilise --force pour réinitialiser le mot de passe.");
      process.exit(1);
    }
    console.log(`⚠️  Utilisateur existant trouvé — réinitialisation du mot de passe...`);
    const hash = await bcrypt.hash(password, 12);
    await db.user.update({
      where: { email },
      data: {
        password: hash,
        name,
        phone,
        role: "superadmin",
        isActive: true,
      },
    });
    console.log("✅ Compte mis à jour avec succès.\n");
  } else {
    console.log(`Création de l'utilisateur ${email}...`);
    const hash = await bcrypt.hash(password, 12);
    await db.user.create({
      data: {
        email,
        password: hash,
        name,
        phone,
        role: "superadmin",
        isActive: true,
      },
    });
    console.log("✅ Compte créé avec succès.\n");
  }

  console.log("═══════════════════════════════════════════════════════");
  console.log("  IDENTIFIANTS SUPERADMIN");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Email:    ${email}`);
  console.log(`  Mot de passe: ${password}`);
  console.log(`  Rôle:     superadmin`);
  console.log(`  URL:      http://localhost:3000/login`);
  console.log("═══════════════════════════════════════════════════════");
  console.log("\n⚠️  CONSERVE CES IDENTIFIANTS EN LIEU SÛR.");
  console.log("   Le mot de passe ne sera plus affiché.\n");
}

main()
  .catch((e) => {
    console.error("Erreur:", e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
