import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/superadmin-utils";

// GET /api/superadmin/tenants/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;

  const tenant = await db.tenant.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, isActive: true, phone: true },
      },
      buses: { select: { id: true, number: true, capacity: true, isActive: true } },
      trajets: {
        select: { id: true, origin: true, destination: true, date: true, time: true, price: true, status: true, createdAt: true },
        orderBy: { date: "desc" },
        take: 50,
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      subscriptions: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Compagnie non trouvée" }, { status: 404 });
  }

  return NextResponse.json(tenant);
}

// PATCH /api/superadmin/tenants/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const existing = await db.tenant.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Compagnie non trouvée" }, { status: 404 });
  }

  // Build update data (only allow certain fields)
  const allowedFields = [
    "name", "email", "phone", "address", "country", "logo",
    "seoTitle", "seoDescription", "seoKeywords", "ogImage",
    "primaryColor", "secondaryColor", "plan",
  ];
  const updateData: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      if (key === "email") {
        updateData.adminEmail = body[key];
      } else {
        updateData[key] = body[key];
      }
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const tenant = await db.tenant.update({
    where: { id },
    data: updateData,
  });

  await logAudit({
    userId: session.user.id,
    action: "tenant.update",
    entityType: "Tenant",
    entityId: id,
    tenantId: id,
    oldValues: allowedFields
      .filter((f) => body[f] !== undefined)
      .reduce((acc, f) => ({ ...acc, [f]: (existing as Record<string, unknown>)[f] }), {}),
    newValues: updateData,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json(tenant);
}

// DELETE /api/superadmin/tenants/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  if (searchParams.get("confirm") !== "true") {
    return NextResponse.json(
      { error: "Confirmation requise. Ajoutez ?confirm=true" },
      { status: 400 }
    );
  }

  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) {
    return NextResponse.json({ error: "Compagnie non trouvée" }, { status: 404 });
  }

  // Delete in order (invoices, subscriptions, billets, trajets, buses, users, then tenant)
  await db.invoice.deleteMany({ where: { tenantId: id } });
  await db.subscription.deleteMany({ where: { tenantId: id } });
  const trajetIds = (await db.trajet.findMany({ where: { tenantId: id }, select: { id: true } })).map((t) => t.id);
  if (trajetIds.length > 0) {
    await db.billet.deleteMany({ where: { trajetId: { in: trajetIds } } });
    await db.trajet.deleteMany({ where: { tenantId: id } });
  }
  await db.bus.deleteMany({ where: { tenantId: id } });
  await db.user.deleteMany({ where: { tenantId: id } });
  await db.voiceConfig.deleteMany({ where: { tenantId: id } });
  await db.notificationTemplate.deleteMany({ where: { tenantId: id } });
  await db.tenant.delete({ where: { id } });

  await logAudit({
    userId: session.user.id,
    action: "tenant.delete",
    entityType: "Tenant",
    entityId: id,
    oldValues: { name: tenant.name, slug: tenant.slug },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ success: true, message: "Compagnie supprimée" });
}