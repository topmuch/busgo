import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { validateBody, schemas } from "@/lib/api-validation";

// GET agents list
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

    const agents = await db.user.findMany({
      where: { tenantId, role: { in: ["agent", "admin"] } },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true, _count: { select: { drivenTrajets: true, buses: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error("[AGENTS_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST create agent
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id || !["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant manquant" }, { status: 400 });
    }

    const body = await validateBody(req, schemas.agentCreate);
    if (body instanceof NextResponse) return body;
    const { name, email, phone, password, role } = body;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email deja utilise" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    const agent = await db.user.create({
      data: {
        name,
        email,
        phone: phone ?? "",
        password: hash,
        role: role || "agent",
        tenantId,
      },
    });

    return NextResponse.json({ id: agent.id, name: agent.name, email: agent.email, role: agent.role }, { status: 201 });
  } catch (error) {
    console.error("[AGENTS_POST]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// NOTE: DELETE handler is in [id]/route.ts (dynamic route)