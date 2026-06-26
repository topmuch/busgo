import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { listActiveOffers, type OfferContext } from "@/lib/modules/sponsor-service";

/**
 * GET /api/sponsor/offers?pwa=client|agent
 *
 * Returns active sponsored offers for the given PWA context.
 * Public endpoint (no auth required) — but if logged in, we use
 * userId + tenantId for personalization + tracking.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pwa = (url.searchParams.get("pwa") ?? "client") as "client" | "agent";

    if (!["client", "agent"].includes(pwa)) {
      return NextResponse.json(
        { error: "pwa doit être 'client' ou 'agent'" },
        { status: 400 }
      );
    }

    // Optional auth (allows personalization)
    const session = await getServerSession().catch(() => null);

    // Session ID from header or generated
    const sessionId =
      req.headers.get("x-session-id") ??
      `anon-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const ctx: OfferContext = {
      tenantId: session?.user?.tenantId,
      pwa,
      userId: session?.user?.id,
      sessionId,
      userAgent: req.headers.get("user-agent") ?? undefined,
      referer: req.headers.get("referer") ?? undefined,
    };

    const offers = await listActiveOffers(ctx);

    return NextResponse.json({ offers, sessionId });
  } catch (error) {
    console.error("[SPONSOR_OFFERS_LIST_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
