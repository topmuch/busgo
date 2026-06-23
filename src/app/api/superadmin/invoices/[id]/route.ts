import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/superadmin-utils";

// GET /api/superadmin/invoices/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      tenant: true,
      subscription: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Facture non trouvée" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

// PATCH /api/superadmin/invoices/[id]
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

  const existing = await db.invoice.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Facture non trouvée" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.status) {
    updateData.status = body.status;
    if (body.status === "paid") updateData.paidAt = new Date();
    if (body.paymentMethod) updateData.paymentMethod = body.paymentMethod;
  }

  const invoice = await db.invoice.update({ where: { id }, data: updateData });

  await logAudit({
    userId: session.user.id,
    action: "invoice.update",
    entityType: "Invoice",
    entityId: id,
    tenantId: existing.tenantId,
    oldValues: { status: existing.status },
    newValues: updateData,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json(invoice);
}