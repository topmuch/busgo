import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import {
  attributeCompensation,
  type EligibilityData,
} from "@/lib/modules/compensation-service";

/**
 * POST /api/compensations/attribute
 *
 * Called automatically by the agent "Le bus part" action (when GPS tracking
 * was active for the passenger). Can also be called manually by admin for
 * goodwill gestures.
 *
 * Body: {
 *   billetId: string,
 *   tenantId: string,
 *   eligibility: { hadGpsTracking, lastDistanceMeters?, lastEtaMinutes?, wasMovingTowardsQuay },
 *   notes?: string
 * }
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
    const { billetId, tenantId, eligibility, notes } = body as {
      billetId: string;
      tenantId: string;
      eligibility: EligibilityData;
      notes?: string;
    };

    if (!billetId || !tenantId || !eligibility) {
      return NextResponse.json(
        { error: "billetId, tenantId et eligibility sont requis" },
        { status: 400 }
      );
    }

    // Tenant access check (agent/admin can only act on their tenant)
    if (
      session.user.role !== "superadmin" &&
      session.user.tenantId !== tenantId
    ) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Verify billet belongs to tenant
    const billet = await db.billet.findUnique({
      where: { id: billetId },
      select: { id: true, status: true, trajet: { select: { tenantId: true } } },
    });
    if (!billet) {
      return NextResponse.json(
        { error: "Billet introuvable" },
        { status: 404 }
      );
    }
    if (billet.trajet.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const result = await attributeCompensation({
      billetId,
      tenantId,
      eligibility,
      issuedBy: session.user.id,
      notes,
    });

    if (!result.ok) {
      // Not eligible — return 200 with reason (not an error per se)
      return NextResponse.json({
        ok: false,
        reason: result.reason,
      });
    }

    return NextResponse.json({
      ok: true,
      compensationId: result.compensationId,
      voucherCode: result.voucherCode,
      amountFcfa: result.amountFcfa,
    });
  } catch (error) {
    console.error("[COMPENSATION_ATTRIBUTE_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
