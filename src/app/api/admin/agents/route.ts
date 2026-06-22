import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET agents list
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant manquant" }, { status: 400 });
    }

    const body = await req.json();
    const { name, email, phone, password, role } = body;

    if (!name || !email || !phone || !password) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email deja utilise" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    const agent = await db.user.create({
      data: {
        name,
        email,
        phone,
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

// DELETE agent
export async function DELETE(
  req: NextRequest,
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

    const user = await db.user.findFirst({ where: { id, tenantId, role: { in: ["agent", "admin"] } } });
    if (!user) {
      return NextResponse.json({ error: "Agent non trouve" }, { status: 404 });
    }

    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AGENTS_DELETE]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}