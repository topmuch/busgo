import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { unsubscribeDevice } from "@/lib/push";

/**
 * POST /api/push/unsubscribe
 *
 * Body: { endpoint }
 * Removes a push subscription (user revoked permission or logged out).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body as { endpoint: string };

    if (!endpoint) {
      return NextResponse.json(
        { error: "endpoint est requis" },
        { status: 400 }
      );
    }

    await unsubscribeDevice(endpoint);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PUSH_UNSUBSCRIBE_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
