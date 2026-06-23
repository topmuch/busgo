import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { qrCode, trajetId } = body;

    if (!qrCode || !trajetId) {
      return NextResponse.json(
        { error: "QR code et trajet ID requis" },
        { status: 400 }
      );
    }

    // Find the billet by QR code
    const billet = await db.billet.findUnique({
      where: { qrCode },
      include: {
        trajet: { select: { tenantId: true, id: true } },
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
        { error: "Billet non trouvé" },
        { status: 404 }
      );
    }

    // Verify tenant access (unless superadmin)
    if (role !== "superadmin" && billet.trajet.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Verify trajet matches
    if (billet.trajetId !== trajetId) {
      return NextResponse.json(
        { error: "Ce billet ne correspond pas à ce trajet" },
        { status: 400 }
      );
    }

    // Check if already scanned
    if (billet.status !== "sold") {
      if (billet.status === "boarded") {
        return NextResponse.json(
          { error: "Billet déjà embarqué" },
          { status: 400 }
        );
      }
      if (billet.status === "absent") {
        return NextResponse.json(
          { error: "Billet marqué absent" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Billet non valide" },
        { status: 400 }
      );
    }

    // Update billet status to boarded
    const updatedBillet = await db.billet.update({
      where: { id: billet.id },
      data: { status: "boarded" },
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

    return NextResponse.json({
      success: true,
      id: updatedBillet.id,
      seatNumber: updatedBillet.seatNumber,
      ticketNumber: updatedBillet.ticketNumber,
      clientName: updatedBillet.client.name,
      clientPhone: updatedBillet.client.phone,
    });
  } catch (error) {
    console.error("[AGENT_SCAN_POST]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}