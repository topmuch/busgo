import { NextResponse } from "next/server";
import { getVapidPublicKey, isPushConfigured } from "@/lib/push";

/**
 * GET /api/push/vapid-public-key
 *
 * Returns the VAPID public key for client-side push subscription.
 * The client uses this to call pushManager.subscribe({ applicationServerKey }).
 *
 * If VAPID is not configured, returns 503 with a helpful message.
 */
export async function GET() {
  const publicKey = getVapidPublicKey();
  const configured = isPushConfigured();

  if (!publicKey) {
    return NextResponse.json(
      {
        configured: false,
        error: "VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env",
        publicKey: null,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    configured,
    publicKey,
  });
}
