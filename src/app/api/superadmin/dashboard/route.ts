import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const activeTenantCount = await db.tenant.count({ where: { isActive: true } });
  const totalBusCount = await db.bus.count({ where: { isActive: true } });
  const monthlyBillets = await db.billet.count({
    where: { createdAt: { gte: currentMonthStart } },
  });

  const activeSubscriptions = await db.subscription.findMany({
    where: { status: "active" },
  });
  const mrr = activeSubscriptions.reduce((sum, s) => sum + s.totalAmount, 0);

  const prevSubs = await db.subscription.findMany({
    where: { status: "active", startDate: { lte: prevMonthStart } },
  });
  const prevMrr = prevSubs.reduce((sum, s) => sum + s.totalAmount, 0);

  const mrrHistory: { month: string; mrr: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const label = mStart.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    const paid = await db.invoice.findMany({ where: { status: "paid", paidAt: { gte: mStart, lte: mEnd } } });
    mrrHistory.push({ month: label, mrr: paid.reduce((s, inv) => s + inv.total, 0) });
  }

  const alerts: { type: string; message: string; tenantName?: string; severity: "error" | "warning" }[] = [];

  const failed = await db.invoice.findMany({ where: { status: "failed" }, include: { tenant: { select: { name: true } } } });
  for (const inv of failed) {
    alerts.push({ type: "payment_failed", message: `Paiement échoué — ${inv.invoiceNumber}`, tenantName: inv.tenant.name, severity: "error" });
  }

  const overdue = await db.invoice.findMany({ where: { status: "pending", dueDate: { lt: now } }, include: { tenant: { select: { name: true } } } });
  for (const inv of overdue) {
    alerts.push({ type: "invoice_overdue", message: `Facture en retard — ${inv.invoiceNumber}`, tenantName: inv.tenant.name, severity: "warning" });
  }

  const inactive = await db.tenant.findMany({ where: { isActive: false } });
  for (const t of inactive) {
    alerts.push({ type: "tenant_inactive", message: `Entreprise inactive — ${t.name}`, severity: "warning" });
  }

  const recentLogs = await db.systemLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return NextResponse.json({
    kpis: { activeTenantCount, mrr, prevMrr, mrrGrowth: prevMrr > 0 ? ((mrr - prevMrr) / prevMrr * 100).toFixed(1) : "0", totalBusCount, monthlyBillets },
    mrrHistory,
    alerts,
    recentLogs,
  });
}