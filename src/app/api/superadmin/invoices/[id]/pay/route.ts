import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/superadmin-utils";
import { schemas } from "@/lib/api-validation";

// POST /api/superadmin/invoices/[id]/pay
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;
  // Validate optional paymentMethod field. Body may be empty {} for manual payment.
  let body;
  try {
    body = schemas.invoicePay.parse(await req.json());
  } catch {
    body = {}; // empty body is acceptable for this endpoint
  }
  const { method: paymentMethod } = body;

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