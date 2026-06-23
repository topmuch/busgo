import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET voice config
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant manquant" }, { status: 400 });
    }

    const config = await db.voiceConfig.findUnique({
      where: { tenantId },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("[VOICE_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT update voice config
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant manquant" }, { status: 400 });
    }

    const body = await req.json();
    const { introText, language, audioUrl, announceT15, announceT5, announceT2, announceDelay, announceArrival } = body;

    const config = await db.voiceConfig.upsert({
      where: { tenantId },
      update: {
        introText: introText ?? undefined,
        language: language ?? undefined,
        audioUrl: audioUrl ?? undefined,
        announceT15: announceT15 ?? undefined,
        announceT5: announceT5 ?? undefined,
        announceT2: announceT2 ?? undefined,
        announceDelay: announceDelay ?? undefined,
        announceArrival: announceArrival ?? undefined,
      },
      create: {
        tenantId,
        introText: introText || "Bienvenue a bord.",
        language: language || "fr-FR",
        audioUrl: audioUrl || null,
        announceT15: announceT15 ?? true,
        announceT5: announceT5 ?? true,
        announceT2: announceT2 ?? true,
        announceDelay: announceDelay ?? true,
        announceArrival: announceArrival ?? true,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("[VOICE_PUT]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}