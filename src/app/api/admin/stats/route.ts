import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id || !["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const isSuperAdmin = session.user.role === "superadmin";
    const tenantFilter = isSuperAdmin ? {} : { tenantId };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's KPIs
    const todayTrajets = await db.trajet.findMany({
      where: { ...tenantFilter, date: { gte: today, lt: tomorrow } },
      include: { bus: true, _count: { select: { billets: true } } },
    });

    const todayTrajetIds = todayTrajets.map((t) => t.id);

    const todayBillets = todayTrajetIds.length > 0
      ? await db.billet.findMany({
          where: { trajetId: { in: todayTrajetIds } },
        })
      : [];

    const totalBillets = todayBillets.length;
    const boardedBillets = todayBillets.filter((b) => b.status === "boarded").length;
    const absentBillets = todayBillets.filter((b) => b.status === "absent").length;
    const revenue = todayBillets.reduce((s) => s + 1, 0); // placeholder - need price from trajet

    // Get actual revenue
    let ca = 0;
    for (const billet of todayBillets) {
      const trajet = todayTrajets.find((t) => t.id === billet.trajetId);
      if (trajet) ca += trajet.price;
    }

    const boardingRate = totalBillets > 0 ? Math.round((boardedBillets / totalBillets) * 100) : 0;

    // Total capacity today
    const totalCapacity = todayTrajets.reduce((s, t) => s + t.bus.capacity, 0);
    const lostSeats = totalCapacity - totalBillets;

    // Last 30 days boarding rate (for chart)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const last30Trajets = await db.trajet.findMany({
      where: { ...tenantFilter, date: { gte: thirtyDaysAgo, lt: tomorrow } },
      include: { _count: { select: { billets: true } } },
      orderBy: { date: "asc" },
    });

    // Group by date
    const dailyStats: Array<{ date: string; rate: number; count: number; revenue: number }> = [];
    const dateMap = new Map<string, { total: number; boarded: number; revenue: number; count: number }>();

    for (const t of last30Trajets) {
      const dateKey = t.date.toISOString().split("T")[0];
      const existing = dateMap.get(dateKey) || { total: 0, boarded: 0, revenue: 0, count: 0 };
      existing.count += 1;
      existing.total += t._count.billets;
      existing.revenue += t._count.billets * t.price;
      dateMap.set(dateKey, existing);
    }

    // Get boarded counts per date
    const boardedByDate = await db.billet.groupBy({
      by: ["trajetId"],
      where: { trajetId: { in: last30Trajets.map((t) => t.id) }, status: "boarded" },
      _count: true,
    });

    const boardedTrajetMap = new Map<string, number>();
    for (const group of boardedByDate) {
      boardedTrajetMap.set(group.trajetId, group._count);
    }

    // Also count absent per trajet for accurate boarding rate
    const absentByDate = await db.billet.groupBy({
      by: ["trajetId"],
      where: { trajetId: { in: last30Trajets.map((t) => t.id) }, status: "absent" },
      _count: true,
    });
    const absentTrajetMap = new Map<string, number>();
    for (const group of absentByDate) {
      absentTrajetMap.set(group.trajetId, group._count);
    }

    for (const [dateKey, stats] of dateMap) {
      const dayTrajets = last30Trajets.filter((t) => t.date.toISOString().split("T")[0] === dateKey);
      let dayBoarded = 0;
      for (const t of dayTrajets) {
        dayBoarded += boardedTrajetMap.get(t.id) || 0;
      }
      dailyStats.push({
        date: dateKey,
        rate: stats.total > 0 ? Math.round((dayBoarded / stats.total) * 100) : 0,
        count: stats.count,
        revenue: stats.revenue,
      });
    }

    // Today's trajets with details for the list
    const todayList = await Promise.all(
      todayTrajets.map(async (t) => {
        const boarded = await db.billet.count({ where: { trajetId: t.id, status: "boarded" } });
        const absent = await db.billet.count({ where: { trajetId: t.id, status: "absent" } });
        return {
          id: t.id,
          origin: t.origin,
          destination: t.destination,
          time: t.time,
          status: t.status,
          busNumber: t.bus.number,
          busCapacity: t.bus.capacity,
          totalBillets: t._count.billets,
          boarded,
          absent,
          fillRate: t.bus.capacity > 0 ? Math.round((t._count.billets / t.bus.capacity) * 100) : 0,
          price: t.price,
        };
      })
    );

    return NextResponse.json({
      today: {
        trajets: todayTrajets.length,
        boardingRate,
        revenue: ca,
        lostSeats,
        totalBillets,
        boardedBillets,
        absentBillets,
      },
      chart30Days: dailyStats,
      todayList,
    });
  } catch (error) {
    console.error("[ADMIN_STATS]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}