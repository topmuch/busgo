import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { generateInvoiceNumber, logAudit, getClientIp } from "@/lib/superadmin-utils";

const createInvoiceSchema = z.object({
  tenantId: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  numberOfBuses: z.number().int().min(1),
  pricePerBus: z.number().int().min(0).default(20000),
  tax: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

// GET /api/superadmin/invoices
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const tenantId = searchParams.get("tenantId") || "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (tenantId) where.tenantId = tenantId;

  const [invoices, paidInvoices, pendingInvoices, failedInvoices] =
    await Promise.all([
      db.invoice.findMany({
        where,
        include: { tenant: { select: { name: true, slug: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.invoice.findMany({ where: { status: "paid" } }),
      db.invoice.findMany({ where: { status: "pending" } }),
      db.invoice.findMany({ where: { status: { in: ["failed", "overdue"] } } }),
    ]);

  const summary = {
    total: invoices.length,
    paid: paidInvoices.length,
    pending: pendingInvoices.length,
    failed: failedInvoices.length,
    totalRevenue: paidInvoices.reduce((sum, inv) => sum + inv.total, 0),
    pendingAmount: pendingInvoices.reduce((sum, inv) => sum + inv.total, 0),
  };

  return NextResponse.json({ invoices, summary });
}

// POST /api/superadmin/invoices — Create manual invoice
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createInvoiceSchema.parse(body);

    const tenant = await db.tenant.findUnique({ where: { id: data.tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Compagnie non trouvée" }, { status: 404 });
    }

    const subtotal = data.numberOfBuses * data.pricePerBus;
    const total = subtotal + data.tax;
    const now = new Date();
    const year = now.getFullYear();
    const invoiceCount = await db.invoice.count();
    const invoiceNumber = generateInvoiceNumber(year, invoiceCount + 1);

    // Due date: 15th of next month
    const periodEndDate = new Date(data.periodEnd);
    const dueDate = new Date(periodEndDate.getFullYear(), periodEndDate.getMonth() + 1, 5);

    const invoice = await db.invoice.create({
      data: {
        tenantId: data.tenantId,
        subscriptionId: "", // manual invoice may not be linked to subscription
        invoiceNumber,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        numberOfBuses: data.numberOfBuses,
        pricePerBus: data.pricePerBus,
        subtotal,
        tax: data.tax,
        total,
        dueDate,
        notes: data.notes,
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "invoice.create",
      entityType: "Invoice",
      entityId: invoice.id,
      tenantId: data.tenantId,
      newValues: { invoiceNumber, total, tenantName: tenant.name },
      ipAddress: getClientIp(req),
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.issues }, { status: 400 });
    }
    console.error("Create invoice error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// PATCH /api/superadmin/invoices — Update status
export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { invoiceId, status, paymentMethod } = await req.json();
  if (!invoiceId || !status) {
    return NextResponse.json({ error: "invoiceId et status requis" }, { status: 400 });
  }

  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) {
    return NextResponse.json({ error: "Facture non trouvée" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { status };
  if (status === "paid") {
    updateData.paidAt = new Date();
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
  }

  const updated = await db.invoice.update({
    where: { id: invoiceId },
    data: updateData,
  });

  await logAudit({
    userId: session.user.id,
    action: "invoice.update",
    entityType: "Invoice",
    entityId: invoiceId,
    tenantId: invoice.tenantId,
    oldValues: { status: invoice.status },
    newValues: { status, paymentMethod },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json(updated);
}