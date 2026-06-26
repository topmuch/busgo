import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { getOfferStats } from "@/lib/modules/sponsor-service";

/**
 * GET /api/sponsor/admin/[offerId]
 * Returns offer details + stats.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { offerId } = await params;
    const offer = await db.sponsoredOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    }

    // Tenant access check
    if (
      session.user.role !== "superadmin" &&
      offer.tenantId !== session.user.tenantId
    ) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const stats = await getOfferStats(offerId);

    return NextResponse.json({ offer, stats });
  } catch (error) {
    console.error("[SPONSOR_ADMIN_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sponsor/admin/[offerId]
 * Updates an offer (toggle isActive, edit content, etc.)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { offerId } = await params;
    const offer = await db.sponsoredOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    }

    // Tenant access check
    if (
      session.user.role !== "superadmin" &&
      offer.tenantId !== session.user.tenantId
    ) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();
    const allowedFields = [
      "title",
      "description",
      "imageUrl",
      "ctaLabel",
      "ctaUrl",
      "bgColor",
      "textColor",
      "targetPwa",
      "endDate",
      "isActive",
      "maxImpressions",
      "maxClicks",
      "priority",
    ];

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Convert endDate if provided
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate as string);
    }

    const updated = await db.sponsoredOffer.update({
      where: { id: offerId },
      data: updateData,
    });

    return NextResponse.json({ ok: true, offer: updated });
  } catch (error) {
    console.error("[SPONSOR_ADMIN_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sponsor/admin/[offerId]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { offerId } = await params;
    const offer = await db.sponsoredOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    }

    // Tenant access check
    if (
      session.user.role !== "superadmin" &&
      offer.tenantId !== session.user.tenantId
    ) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    await db.sponsoredOffer.delete({ where: { id: offerId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SPONSOR_ADMIN_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
