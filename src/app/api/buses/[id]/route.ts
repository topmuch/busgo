import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.bus.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Bus introuvable" }, { status: 404 });
  }

  const body = await req.json();
  const { number, capacity, driverId, isActive } = body;

  // Check number uniqueness if changed
  if (number && number !== existing.number) {
    const duplicate = await db.bus.findFirst({
      where: { tenantId: session.user.tenantId, number },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `Le bus ${number} existe déjà` },
        { status: 409 }
      );
    }
  }

  const bus = await db.bus.update({
    where: { id },
    data: {
      ...(number ? { number } : {}),
      ...(capacity ? { capacity: Number(capacity) } : {}),
      ...(driverId !== undefined ? { driverId: driverId || null } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    include: { driver: { select: { id: true, name: true } } },
  });

  return NextResponse.json(bus);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.bus.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Bus introuvable" }, { status: 404 });
  }

  // Check for active trajets
  const activeTrajets = await db.trajet.count({
    where: { busId: id, status: { in: ["scheduled", "boarding"] } },
  });

  if (activeTrajets > 0) {
    return NextResponse.json(
      { error: `${activeTrajets} trajet(s) actif(s) sur ce bus. Annulez-les d'abord.` },
      { status: 409 }
    );
  }

  // Remove driver reference
  await db.bus.update({
    where: { id },
    data: { driverId: null },
  });

  // Delete related trajets and billets
  const trajets = await db.trajet.findMany({
    where: { busId: id },
    select: { id: true },
  });
  if (trajets.length > 0) {
    await db.billet.deleteMany({
      where: { trajetId: { in: trajets.map((t) => t.id) } },
    });
    await db.trajet.deleteMany({ where: { busId: id } });
  }

  await db.bus.delete({ where: { id } });

  return NextResponse.json({ success: true });
}