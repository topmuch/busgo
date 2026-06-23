import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id || !["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant manquant" }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, logo: true, phone: true, plan: true, isActive: true },
    });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("[SETTINGS_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id || !["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant manquant" }, { status: 400 });
    }

    const body = await req.json();
    const { name, phone, logo } = body;

    const tenant = await db.tenant.update({
      where: { id: tenantId },
      data: {
        name: name ?? undefined,
        phone: phone ?? undefined,
        logo: logo ?? undefined,
      },
    });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("[SETTINGS_PUT]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}