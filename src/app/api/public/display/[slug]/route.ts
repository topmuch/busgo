import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const tenant = await db.tenant.findUnique({
      where: { slug, isActive: true },
      select: { id: true, name: true, slug: true, logo: true, phone: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Compagnie non trouvée" }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const trajets = await db.trajet.findMany({
      where: { tenantId: tenant.id, date: { gte: today, lt: tomorrow } },
      include: {
        bus: { select: { number: true, capacity: true } },
        driver: { select: { name: true } },
        _count: { select: { billets: true } },
      },
      orderBy: { time: "asc" },
    });

    const trajetsWithStats = await Promise.all(
      trajets.map(async (t) => {
        const boardedCount = await db.billet.count({
          where: { trajetId: t.id, status: "boarded" },
        });
        const absentCount = await db.billet.count({
          where: { trajetId: t.id, status: "absent" },
        });
        return {
          id: t.id,
          origin: t.origin,
          destination: t.destination,
          time: t.time,
          date: t.date.toISOString(),
          status: t.status,
          zone: t.zone,
          bus: t.bus,
          driver: t.driver,
          totalBillets: t._count.billets,
          boardedCount,
          absentCount,
          fillRate: t.bus.capacity > 0 ? Math.round((t._count.billets / t.bus.capacity) * 100) : 0,
        };
      })
    );

    const totalBoarded = trajetsWithStats.reduce((s, t) => s + t.boardedCount, 0);
    const totalBillets = trajetsWithStats.reduce((s, t) => s + t.totalBillets, 0);
    const currentlyBoarding = trajetsWithStats.filter((t) => t.status === "boarding").length;
    const departed = trajetsWithStats.filter((t) => t.status === "departed" || t.status === "arrived").length;

    const voiceConfig = await db.voiceConfig.findUnique({
      where: { tenantId: tenant.id },
      select: { introText: true, language: true, audioUrl: true },
    });

    return NextResponse.json({
      tenant,
      trajets: trajetsWithStats,
      stats: {
        totalDepartures: trajets.length,
        totalBoarded,
        totalBillets,
        currentlyBoarding,
        departed,
      },
      voiceConfig,
    });
  } catch (error) {
    console.error("[DISPLAY_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}