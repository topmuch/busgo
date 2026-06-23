import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const session = await getServerSession();
  if (session?.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { tenantId } = await params;
  const body = await req.json();
  const { plan, busCount, pricePerBus, endDate } = body;

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 });
  }

  const currentSub = await db.subscription.findFirst({
    where: { tenantId, status: "active" },
    orderBy: { createdAt: "desc" },
  });

  if (currentSub) {
    const updateData: Record<string, unknown> = {};
    if (plan) updateData.plan = plan;
    if (busCount !== undefined) updateData.busCount = busCount;
    if (pricePerBus !== undefined) updateData.pricePerBus = pricePerBus;
    if (endDate) updateData.endDate = new Date(endDate);
    if (busCount !== undefined && pricePerBus !== undefined) {
      updateData.totalAmount = busCount * pricePerBus;
    }

    const updated = await db.subscription.update({
      where: { id: currentSub.id },
      data: updateData,
    });

    if (plan) {
      await db.tenant.update({ where: { id: tenantId }, data: { plan } });
    }

    await db.systemLog.create({
      data: {
        level: "info",
        action: "subscription_updated",
        message: `Abonnement ${tenant.name} mis à jour — plan: ${plan || currentSub.plan}`,
        userId: session.user.id,
        tenantId,
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Aucun abonnement actif trouvé" }, { status: 404 });
}