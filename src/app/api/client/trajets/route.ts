import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get the next upcoming billet (sold, future date, closest)
  const now = new Date();
  const upcomingBillets = await db.billet.findMany({
    where: {
      clientId: userId,
      status: "sold",
      trajet: { date: { gte: now } },
    },
    include: {
      trajet: {
        include: {
          bus: {
            include: {
              driver: { select: { id: true, name: true, phone: true } },
            },
          },
          tenant: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    orderBy: { trajet: { date: "asc" } },
  });

  // Get past billets for history
  const pastBillets = await db.billet.findMany({
    where: {
      clientId: userId,
      OR: [
        { status: { in: ["boarded", "absent", "cancelled"] } },
        { trajet: { date: { lt: now } } },
      ],
    },
    include: {
      trajet: {
        include: {
          bus: { select: { id: true, number: true } },
          tenant: { select: { name: true } },
        },
      },
    },
    orderBy: { trajet: { date: "desc" } },
    take: 20,
  });

  const activeBillet = upcomingBillets[0] ?? null;

  // Get voice config for the tenant
  let voiceConfig: { introText: string; language: string } | null = null;
  if (activeBillet?.trajet.tenantId) {
    const vc = await db.voiceConfig.findUnique({
      where: { tenantId: activeBillet.trajet.tenantId },
    });
    if (vc) {
      voiceConfig = { introText: vc.introText, language: vc.language };
    }
  }

  return NextResponse.json({
    activeBillet,
    upcomingBillets,
    pastBillets,
    voiceConfig,
  });
}