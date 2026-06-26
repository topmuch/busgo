import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";

/**
 * POST /api/tracking/quay
 * Sets the quay/bus destination position for a trip.
 *
 * Body: { tripId, lat, lng, label? }
 *
 * Note: The agent UI primarily uses the socket event `set_quay_position`
 * for real-time updates. This REST endpoint is provided as documentation
 * and fallback for non-realtime contexts.
 *
 * ⚠️ RGPD: No GPS data is persisted. The position lives in socket server RAM
 * only for the duration of the trip's tracking session.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!["agent", "admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();
    const { tripId, lat, lng, label } = body as {
      tripId: string;
      lat: number;
      lng: number;
      label?: string;
    };

    if (!tripId || typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        { error: "tripId, lat, lng requis" },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "Coordonnées GPS invalides" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        "Position du quai reçue. Utilisez socket.emit('set_quay_position') pour la synchronisation temps réel.",
      tripId,
      lat,
      lng,
      label,
    });
  } catch (error) {
    console.error("[TRACKING_QUAY_POST]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
