import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  const newPassword = "BusGoAdmin2026Xk";
  const hash = await bcrypt.hash(newPassword, 12);
  
  // Update ALL superadmins to the same password
  const result = await db.user.updateMany({
    where: { role: "superadmin" },
    data: { password: hash, isActive: true },
  });
  
  console.log(`✅ ${result.count} superadmin(s) mis à jour avec le mot de passe: ${newPassword}`);
  
  // List them
  const supers = await db.user.findMany({
    where: { role: "superadmin" },
    select: { email: true, name: true, isActive: true }
  });
  console.log("\nComptes superadmin disponibles :");
  console.table(supers);
}
main().finally(() => db.$disconnect());
