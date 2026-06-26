import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { redeemVoucher } from "@/lib/modules/compensation-service";

/**
 * POST /api/compensations/redeem
 *
 * Called by guichet (admin/agent) when a client uses a voucher code
 * to purchase a new billet.
 *
 * Body: { voucherCode: string, newBilletId: string }
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
    const { voucherCode, newBilletId } = body as {
      voucherCode: string;
      newBilletId: string;
    };

    if (!voucherCode || !newBilletId) {
      return NextResponse.json(
        { error: "voucherCode et newBilletId sont requis" },
        { status: 400 }
      );
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant manquant" }, { status: 400 });
    }

    const result = await redeemVoucher({ voucherCode, newBilletId, tenantId });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, reason: result.reason },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, compensationId: result.compensationId });
  } catch (error) {
    console.error("[COMPENSATION_REDEEM_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
