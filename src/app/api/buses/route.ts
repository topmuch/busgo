import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { validateBody, schemas } from "@/lib/api-validation";

export async function GET() {
  const session = await getServerSession();
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
  const session = await getServerSession();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await validateBody(req, schemas.busCreate);
  if (body instanceof NextResponse) return body;

  const { number, capacity, driverId } = body;

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