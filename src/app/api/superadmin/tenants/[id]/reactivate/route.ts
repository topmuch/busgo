import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/superadmin-utils";

// POST /api/superadmin/tenants/[id]/reactivate
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;

  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) {
    return NextResponse.json({ error: "Compagnie non trouvée" }, { status: 404 });
  }

  const updated = await db.tenant.update({
    where: { id },
    data: {
      isSuspended: false,
      suspensionReason: null,
      suspendedAt: null,
      suspendedBy: null,
      subscriptionStatus: "active",
      isActive: true,
    },
  });

  // Reactivate all tenant users
  await db.user.updateMany({
    where: { tenantId: id },
    data: { isActive: true },
  });

  await logAudit({
    userId: session.user.id,
    action: "tenant.reactivate",
    entityType: "Tenant",
    entityId: id,
    tenantId: id,
    oldValues: { isSuspended: true },
    newValues: { isSuspended: false },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({
    success: true,
    message: `${tenant.name} réactivée`,
    tenant: updated,
  });
}