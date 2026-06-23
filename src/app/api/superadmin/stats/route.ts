import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";

// GET /api/superadmin/stats
export async function GET() {
  const session = await getServerSession();
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    activeTenants,
    suspendedTenants,
    allBuses,
    thisMonthBillets,
    activeSubs,
    prevMonthSubs,
  ] = await Promise.all([
    db.tenant.count({ where: { isActive: true, isSuspended: false } }),
    db.tenant.count({ where: { isSuspended: true } }),
    db.bus.count({ where: { isActive: true } }),
    db.billet.count({
      where: { createdAt: { gte: thisMonthStart } },
    }),
    // This month active subscriptions MRR
    db.subscription.findMany({
      where: { status: { in: ["active", "trial"] } },
    }),
    // Previous month MRR (use same subs for simplicity)
    db.subscription.findMany({
      where: {
        status: { in: ["active", "trial"] },
        createdAt: { lt: thisMonthStart },
      },
    }),
  ]);

  const mrr = activeSubs.reduce((sum, s) => sum + s.totalAmount, 0);
  const prevMrr = prevMonthSubs.reduce((sum, s) => sum + s.totalAmount, 0);
  const mrrGrowth = prevMrr > 0 ? (((mrr - prevMrr) / prevMrr) * 100).toFixed(1) : "0";

  return NextResponse.json({
    kpis: {
      activeTenantCount: activeTenants,
      mrr,
      prevMrr,
      mrrGrowth,
      totalBusCount: allBuses,
      monthlyBillets: thisMonthBillets,
      suspendedCount: suspendedTenants,
    },
  });
}