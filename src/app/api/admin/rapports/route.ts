import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id || !["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant manquant" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    const trajetId = searchParams.get("trajetId");
    const month = searchParams.get("month"); // YYYY-MM

    if (format === "csv") {
      return generateCSV(tenantId, trajetId, month);
    }

    // JSON report
    const report = await generateReport(tenantId, trajetId, month);
    return NextResponse.json(report);
  } catch (error) {
    console.error("[REPORTS_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

async function generateReport(tenantId: string, trajetId?: string | null, month?: string | null) {
  let dateFilter: any = { tenantId };
  if (trajetId) dateFilter = { ...dateFilter, id: trajetId };
  if (month) {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    dateFilter = { ...dateFilter, date: { gte: start, lt: end } };
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateFilter = { ...dateFilter, date: { gte: today, lt: tomorrow } };
  }

  const trajets = await db.trajet.findMany({
    where: dateFilter,
    include: { bus: true, driver: { select: { name: true } }, _count: { select: { billets: true } } },
    orderBy: { date: "asc", time: "asc" },
  });

  const trajetIds = trajets.map((t) => t.id);
  const billets = trajetIds.length > 0
    ? await db.billet.findMany({
        where: { trajetId: { in: trajetIds } },
        include: { client: { select: { name: true, phone: true } } },
      })
    : [];

  // Stats
  const totalRevenue = trajets.reduce((s, t) => s + t._count.billets * t.price, 0);
  const totalBoarded = billets.filter((b) => b.status === "boarded").length;
  const totalAbsent = billets.filter((b) => b.status === "absent").length;
  const totalSold = billets.filter((b) => b.status === "sold").length;
  const totalCapacity = trajets.reduce((s, t) => s + t.bus.capacity, 0);

  const trajetReports = trajets.map((t) => {
    const tBillets = billets.filter((b) => b.trajetId === t.id);
    const boarded = tBillets.filter((b) => b.status === "boarded").length;
    const absent = tBillets.filter((b) => b.status === "absent").length;
    const revenue = tBillets.length * t.price;
    return {
      id: t.id,
      date: t.date.toISOString(),
      time: t.time,
      origin: t.origin,
      destination: t.destination,
      status: t.status,
      busNumber: t.bus.number,
      busCapacity: t.bus.capacity,
      driver: t.driver?.name,
      totalBillets: t._count.billets,
      boarded,
      absent,
      revenue,
      fillRate: t.bus.capacity > 0 ? Math.round((t._count.billets / t.bus.capacity) * 100) : 0,
      boardingRate: t._count.billets > 0 ? Math.round((boarded / t._count.billets) * 100) : 0,
    };
  });

  return {
    period: month || "today",
    totalRevenue,
    totalBoarded,
    totalAbsent,
    totalSold,
    totalCapacity,
    occupancyRate: totalCapacity > 0 ? Math.round(((totalBoarded + totalSold + totalAbsent) / totalCapacity) * 100) : 0,
    trajets: trajetReports,
  };
}

function generateCSV(tenantId: string, trajetId?: string | null, month?: string | null) {
  // For simplicity, we'll return JSON with a flag; real CSV generation would be similar
  return new NextResponse(
    JSON.stringify({ error: "Utilisez le format JSON pour les rapports. Le CSV sera ajoute prochainement." }),
    { status: 501 }
  );
}