import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const role = session.user.role;
    const userId = session.user.id;
    const tenantId = session.user.tenantId;

    if (!["agent", "admin", "superadmin"].includes(role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Build the where clause
    const where: Record<string, unknown> = {
      date: { gte: today, lt: tomorrow },
      OR: [{ driverId: userId }, { bus: { driverId: userId } }],
    };

    // For non-superadmin, filter by tenantId
    if (role !== "superadmin") {
      if (!tenantId) {
        return NextResponse.json({ error: "Tenant non trouvé" }, { status: 400 });
      }
      (where as Record<string, unknown>).tenantId = tenantId;
    }

    const trajets = await db.trajet.findMany({
      where,
      include: {
        bus: {
          include: {
            driver: { select: { id: true, name: true, phone: true } },
          },
        },
        driver: { select: { id: true, name: true, phone: true } },
        _count: { select: { billets: true } },
      },
      orderBy: [{ time: "asc" }],
    });

    // Count boarded billets for each trajet
    const trajetsWithBoardedCount = await Promise.all(
      trajets.map(async (trajet) => {
        const boardedCount = await db.billet.count({
          where: {
            trajetId: trajet.id,
            status: "boarded",
          },
        });
        return {
          ...trajet,
          boardedCount,
        };
      })
    );

    return NextResponse.json(trajetsWithBoardedCount);
  } catch (error) {
    console.error("[AGENT_TRAJETS_GET]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}