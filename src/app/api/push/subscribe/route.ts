import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { subscribeDevice } from "@/lib/push";

/**
 * POST /api/push/subscribe
 *
 * Body: { endpoint, keys: { p256dh, auth } }
 * Persists a push subscription for the authenticated user.
 * Idempotent: same endpoint → updates keys.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, keys } = body as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "endpoint et keys.{p256dh,auth} sont requis" },
        { status: 400 }
      );
    }

    // Validate endpoint URL (must be https in prod, allow http for dev)
    try {
      const url = new URL(endpoint);
      if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
        return NextResponse.json(
          { error: "L'endpoint doit être HTTPS en production" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Endpoint invalide" },
        { status: 400 }
      );
    }

    const result = await subscribeDevice({
      userId: session.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    return NextResponse.json({ ok: true, subscriptionId: result.subscriptionId });
  } catch (error) {
    console.error("[PUSH_SUBSCRIBE_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
