import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trajetId: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const role = session.user.role;
    const tenantId = session.user.tenantId;

    if (!["agent", "admin", "superadmin"].includes(role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { trajetId } = await params;

    // Verify trajet exists and belongs to tenant
    const trajet = await db.trajet.findUnique({
      where: { id: trajetId },
      select: { tenantId: true },
    });

    if (!trajet) {
      return NextResponse.json(
        { error: "Trajet introuvable" },
        { status: 404 }
      );
    }

    if (role !== "superadmin" && trajet.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const billets = await db.billet.findMany({
      where: { trajetId },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
            reliabilityScore: true,
          },
        },
      },
      orderBy: { seatNumber: "asc" },
    });

    return NextResponse.json(billets);
  } catch (error) {
    console.error("[AGENT_TRAJET_BILLETS_GET]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}