import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession();
  if (session?.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalTrajets = await db.trajet.count();
  const monthTrajets = await db.trajet.count({ where: { createdAt: { gte: monthStart } } });
  const totalBillets = await db.billet.count();
  const boardedBillets = await db.billet.count({ where: { status: "boarded" } });
  const absentBillets = await db.billet.count({ where: { status: "absent" } });
  const monthBillets = await db.billet.count({ where: { createdAt: { gte: monthStart } } });

  const boardingRate = totalBillets > 0 ? ((boardedBillets / totalBillets) * 100).toFixed(1) : "0";
  const absenceRate = totalBillets > 0 ? ((absentBillets / totalBillets) * 100).toFixed(1) : "0";

  const trajetsByStatus = await db.trajet.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  const billetsByStatus = await db.billet.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  const tenantsWithStats = await db.tenant.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { buses: true, trajets: true } },
      subscriptions: { where: { status: "active" }, take: 1 },
      trajets: {
        include: { _count: { select: { billets: true } } },
      },
    },
  });

  const roiData = tenantsWithStats.map((t) => {
    const sub = t.subscriptions[0];
    const cost = sub ? sub.totalAmount : 0;
    const billetCount = t.trajets.reduce((s, tr) => s + tr._count.billets, 0);
    const billetRevenue = billetCount * 3500;
    const roi = cost > 0 ? ((billetRevenue - cost) / cost * 100).toFixed(1) : "0";
    return {
      tenantName: t.name,
      busCount: t._count.buses,
      trajetCount: t._count.trajets,
      billetCount,
      monthlyCost: cost,
      estimatedRevenue: billetRevenue,
      roi,
    };
  });

  const monthlyTrend: { month: string; trajets: number; billets: number; boarded: number; rate: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const label = mStart.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    const mTrajets = await db.trajet.count({ where: { createdAt: { gte: mStart, lte: mEnd } } });
    const mBillets = await db.billet.count({ where: { createdAt: { gte: mStart, lte: mEnd } } });
    const mBoarded = await db.billet.count({ where: { createdAt: { gte: mStart, lte: mEnd }, status: "boarded" } });
    monthlyTrend.push({
      month: label,
      trajets: mTrajets,
      billets: mBillets,
      boarded: mBoarded,
      rate: mBillets > 0 ? ((mBoarded / mBillets) * 100).toFixed(1) : "0",
    });
  }

  const featureUsage = {
    qrScan: true,
    voiceConfig: await db.voiceConfig.count(),
    activeDrivers: await db.user.count({ where: { role: "agent", isActive: true } }),
    activeClients: await db.user.count({ where: { role: "client", isActive: true } }),
    avgReliability: (await db.user.aggregate({
      where: { role: "client", reliabilityScore: { not: null } },
      _avg: { reliabilityScore: true },
    }))._avg.reliabilityScore,
  };

  return NextResponse.json({
    overview: { totalTrajets, monthTrajets, totalBillets, boardedBillets, absentBillets, monthBillets, boardingRate, absenceRate },
    trajetsByStatus,
    billetsByStatus,
    roiData,
    monthlyTrend,
    featureUsage,
  });
}