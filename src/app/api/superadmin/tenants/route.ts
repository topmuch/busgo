import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const tenants = await db.tenant.findMany({
    include: {
      _count: { select: { users: true, buses: true, trajets: true, invoices: true } },
      subscriptions: { where: { status: "active" }, take: 1, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tenants);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const { tenantId, isActive, plan } = body;

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId requis" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (typeof isActive === "boolean") updateData.isActive = isActive;
  if (plan) updateData.plan = plan;

  const tenant = await db.tenant.update({
    where: { id: tenantId },
    data: updateData,
  });

  await db.systemLog.create({
    data: {
      level: "info",
      action: isActive === false ? "tenant_deactivated" : "tenant_updated",
      message: isActive === false
        ? `Entreprise ${tenant.name} désactivée`
        : `Entreprise ${tenant.name} mise à jour`,
      userId: session.user.id,
      tenantId: tenant.id,
    },
  });

  return NextResponse.json(tenant);
}