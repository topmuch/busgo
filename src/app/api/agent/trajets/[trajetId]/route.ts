import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trajetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const role = session.user.role;
    const tenantId = session.user.tenantId;

    if (!["agent", "admin", "superadmin"].includes(role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { trajetId } = await params;

    const trajet = await db.trajet.findUnique({
      where: { id: trajetId },
      include: {
        bus: {
          include: {
            driver: { select: { id: true, name: true, phone: true } },
          },
        },
        driver: { select: { id: true, name: true, phone: true } },
        billets: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                phone: true,
                reliabilityScore: true,
              },
            },
          },
          orderBy: { seatNumber: "asc" },
        },
      },
    });

    if (!trajet) {
      return NextResponse.json(
        { error: "Trajet introuvable" },
        { status: 404 }
      );
    }

    // Verify tenant access (unless superadmin)
    if (role !== "superadmin" && trajet.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    return NextResponse.json(trajet);
  } catch (error) {
    console.error("[AGENT_TRAJET_DETAIL_GET]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}