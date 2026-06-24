import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/api-validation";
import { z } from "zod";

const VALID_ACTIONS = ["start-boarding", "depart"] as const;
const ACTION_STATUS_MAP: Record<string, string> = {
  "start-boarding": "boarding",
  depart: "departed",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ trajetId: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const role = session.user.role;
    const userId = session.user.id;
    const tenantId = session.user.tenantId;

    if (!["agent", "admin", "superadmin"].includes(role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { trajetId } = await params;

    const body = await validateBody(
      req,
      z.object({
        action: z.enum(VALID_ACTIONS),
      })
    );
    if (body instanceof NextResponse) return body;
    const { action } = body;

    // Find trajet and verify ownership
    const trajet = await db.trajet.findUnique({
      where: { id: trajetId },
      include: { bus: { select: { driverId: true } } },
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

    // Verify agent owns this trajet (is the driver of the trajet or bus)
    if (
      role !== "superadmin" &&
      role !== "admin" &&
      trajet.driverId !== userId &&
      trajet.bus.driverId !== userId
    ) {
      return NextResponse.json(
        { error: "Vous n'êtes pas le conducteur de ce trajet" },
        { status: 403 }
      );
    }

    const newStatus = ACTION_STATUS_MAP[action];

    const updatedTrajet = await db.trajet.update({
      where: { id: trajetId },
      data: { status: newStatus },
      include: {
        bus: true,
        driver: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json(updatedTrajet);
  } catch (error) {
    console.error("[AGENT_TRAJET_DEPART_POST]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}