import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const buses = await db.bus.findMany({
    where: {
      tenantId: session.user.tenantId,
      isActive: true,
    },
    include: {
      driver: { select: { id: true, name: true, phone: true } },
      _count: { select: { trajets: true } },
    },
    orderBy: { number: "asc" },
  });

  return NextResponse.json(buses);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const { number, capacity, driverId } = body;

  if (!number || !capacity) {
    return NextResponse.json(
      { error: "Numéro et capacité requis" },
      { status: 400 }
    );
  }

  // Check uniqueness
  const existing = await db.bus.findFirst({
    where: { tenantId: session.user.tenantId, number },
  });

  if (existing) {
    return NextResponse.json(
      { error: `Le bus ${number} existe déjà` },
      { status: 409 }
    );
  }

  const bus = await db.bus.create({
    data: {
      tenantId: session.user.tenantId,
      number,
      capacity: Number(capacity),
      ...(driverId ? { driverId } : {}),
    },
    include: { driver: { select: { id: true, name: true } } },
  });

  return NextResponse.json(bus, { status: 201 });
}