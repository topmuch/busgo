import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/superadmin-utils";

// POST /api/superadmin/tenants/[id]/suspend
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;
  const { reason } = await req.json();

  if (!reason || typeof reason !== "string") {
    return NextResponse.json({ error: "Raison de suspension requise" }, { status: 400 });
  }

  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) {
    return NextResponse.json({ error: "Compagnie non trouvée" }, { status: 404 });
  }

  const updated = await db.tenant.update({
    where: { id },
    data: {
      isSuspended: true,
      suspensionReason: reason,
      suspendedAt: new Date(),
      suspendedBy: session.user.id,
      subscriptionStatus: "suspended",
    },
  });

  // Deactivate all tenant users
  await db.user.updateMany({
    where: { tenantId: id },
    data: { isActive: false },
  });

  await logAudit({
    userId: session.user.id,
    action: "tenant.suspend",
    entityType: "Tenant",
    entityId: id,
    tenantId: id,
    oldValues: { isSuspended: false },
    newValues: { isSuspended: true, reason },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({
    success: true,
    message: `${tenant.name} suspendue`,
    tenant: updated,
  });
}