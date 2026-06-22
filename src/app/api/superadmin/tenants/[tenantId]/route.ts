import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { tenantId } = await params;

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      _count: { select: { users: true, buses: true, trajets: true, invoices: true } },
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
      users: { select: { id: true, name: true, email: true, role: true, isActive: true }, take: 10 },
      buses: { select: { id: true, number: true, capacity: true, isActive: true }, take: 10 },
      invoices: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 });
  }

  return NextResponse.json(tenant);
}