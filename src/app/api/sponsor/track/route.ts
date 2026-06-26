import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { trackImpression, trackClick, type OfferContext } from "@/lib/modules/sponsor-service";

/**
 * POST /api/sponsor/track
 *
 * Tracks an impression or a click on a sponsored offer.
 *
 * Body: {
 *   offerId: string,
 *   event: "impression" | "click",
 *   pwa: "client" | "agent",
 *   sessionId: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { offerId, event, pwa, sessionId } = body as {
      offerId: string;
      event: "impression" | "click";
      pwa: "client" | "agent";
      sessionId: string;
    };

    if (!offerId || !event || !pwa || !sessionId) {
      return NextResponse.json(
        { error: "offerId, event, pwa, sessionId sont requis" },
        { status: 400 }
      );
    }

    if (!["impression", "click"].includes(event)) {
      return NextResponse.json(
        { error: "event doit être 'impression' ou 'click'" },
        { status: 400 }
      );
    }

    if (!["client", "agent"].includes(pwa)) {
      return NextResponse.json(
        { error: "pwa doit être 'client' ou 'agent'" },
        { status: 400 }
      );
    }

    // Optional auth (for user identification)
    const session = await getServerSession().catch(() => null);

    const ctx: OfferContext = {
      tenantId: session?.user?.tenantId,
      pwa,
      userId: session?.user?.id,
      sessionId,
      userAgent: req.headers.get("user-agent") ?? undefined,
      referer: req.headers.get("referer") ?? undefined,
    };

    if (event === "impression") {
      const result = await trackImpression(offerId, ctx);
      return NextResponse.json({ ok: result.ok, deduplicated: result.deduplicated });
    } else {
      const result = await trackClick(offerId, ctx);
      return NextResponse.json({ ok: result.ok });
    }
  } catch (error) {
    console.error("[SPONSOR_TRACK_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
