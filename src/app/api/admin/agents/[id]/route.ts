import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant manquant" }, { status: 400 });
    }

    const user = await db.user.findFirst({
      where: { id, tenantId, role: { in: ["agent", "admin"] } },
    });

    if (!user) {
      return NextResponse.json({ error: "Agent non trouve" }, { status: 404 });
    }

    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AGENT_DELETE]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}