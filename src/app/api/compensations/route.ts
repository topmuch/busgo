import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { listClientCompensations } from "@/lib/modules/compensation-service";

/**
 * GET /api/compensations
 * List compensations for the connected client.
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Only clients (or admins viewing their own) can list their compensations
    const compensations = await listClientCompensations(session.user.id);

    return NextResponse.json({
      compensations,
      total: compensations.length,
      active: compensations.filter((c) => c.status === "issued").length,
      redeemed: compensations.filter((c) => c.status === "redeemed").length,
      totalValueFcfa: compensations
        .filter((c) => c.status === "issued")
        .reduce((sum, c) => sum + c.amountFcfa, 0),
    });
  } catch (error) {
    console.error("[COMPENSATIONS_LIST_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
