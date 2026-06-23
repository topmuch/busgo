import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/superadmin-utils";

// POST /api/superadmin/invoices/[id]/pay
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;
  const { paymentMethod } = await req.json().catch(() => ({}));

  const invoice = await db.invoice.findUnique({ where: { id } });
  if (!invoice) {
    return NextResponse.json({ error: "Facture non trouvée" }, { status: 404 });
  }

  const updated = await db.invoice.update({
    where: { id },
    data: {
      status: "paid",
      paidAt: new Date(),
      paymentMethod: paymentMethod || "manual",
    },
  });

  // If tenant was suspended for payment, reactivate
  if (invoice.tenantId) {
    const tenant = await db.tenant.findUnique({ where: { id: invoice.tenantId } });
    if (tenant?.isSuspended && tenant.suspensionReason?.includes("paiement")) {
      await db.tenant.update({
        where: { id: invoice.tenantId },
        data: {
          isSuspended: false,
          suspensionReason: null,
          suspendedAt: null,
          suspendedBy: null,
          subscriptionStatus: "active",
        },
      });
      await db.user.updateMany({
        where: { tenantId: invoice.tenantId },
        data: { isActive: true },
      });
    }
  }

  await logAudit({
    userId: session.user.id,
    action: "invoice.pay",
    entityType: "Invoice",
    entityId: id,
    tenantId: invoice.tenantId,
    newValues: { status: "paid", paymentMethod, amount: invoice.total },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ success: true, invoice: updated });
}