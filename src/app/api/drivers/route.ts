import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Get agents (potential drivers) for this tenant
  const drivers = await db.user.findMany({
    where: {
      tenantId: session.user.tenantId,
      role: { in: ["agent", "admin"] },
      isActive: true,
    },
    select: { id: true, name: true, phone: true, role: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(drivers);
}