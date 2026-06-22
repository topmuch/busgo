import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const invoices = await db.invoice.findMany({
    include: {
      tenant: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const summary = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "paid").length,
    pending: invoices.filter((i) => i.status === "pending").length,
    failed: invoices.filter((i) => i.status === "failed").length,
    totalRevenue: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0),
    pendingAmount: invoices.filter((i) => i.status === "pending" || i.status === "failed").reduce((s, i) => s + i.amount, 0),
  };

  return NextResponse.json({ invoices, summary });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { invoiceId, status } = await req.json();
  if (!invoiceId || !status) {
    return NextResponse.json({ error: "invoiceId et status requis" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { status };
  if (status === "paid") updateData.paidAt = new Date();

  const invoice = await db.invoice.update({
    where: { id: invoiceId },
    data: updateData,
  });

  await db.systemLog.create({
    data: {
      level: status === "paid" ? "info" : "warning",
      action: "invoice_updated",
      message: `Facture ${invoice.number} mise à jour — ${status}`,
      userId: session.user.id,
      tenantId: invoice.tenantId,
    },
  });

  return NextResponse.json(invoice);
}