import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";

const VALID_STATUSES = ["absent", "boarded", "sold"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ billetId: string }> }
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

    const { billetId } = await params;

    const body = await req.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Statut invalide. Valeurs acceptées: absent, boarded, sold" },
        { status: 400 }
      );
    }

    // Find billet with trajet to verify tenant access
    const billet = await db.billet.findUnique({
      where: { id: billetId },
      include: {
        trajet: { select: { tenantId: true } },
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            reliabilityScore: true,
          },
        },
      },
    });

    if (!billet) {
      return NextResponse.json(
        { error: "Billet introuvable" },
        { status: 404 }
      );
    }

    // Verify tenant access (unless superadmin)
    if (role !== "superadmin" && billet.trajet.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Update billet status
    const updatedBillet = await db.billet.update({
      where: { id: billetId },
      data: { status },
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
    });

    return NextResponse.json(updatedBillet);
  } catch (error) {
    console.error("[AGENT_BILLET_STATUS_PATCH]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}