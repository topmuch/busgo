import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const trajetId = searchParams.get("trajetId");

  const billets = await db.billet.findMany({
    where: {
      trajet: { tenantId: session.user.tenantId },
      ...(trajetId ? { trajetId } : {}),
    },
    include: {
      trajet: { include: { bus: true } },
      client: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(billets);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const { trajetId, clientId, seatNumber, ticketNumber, passengerName, passengerPhone } = body;

  if (!trajetId || !clientId || !seatNumber || !ticketNumber || !passengerName) {
    return NextResponse.json(
      { error: "Champs requis manquants" },
      { status: 400 }
    );
  }

  // Verify the trajet belongs to this tenant
  const trajet = await db.trajet.findFirst({
    where: { id: trajetId, tenantId: session.user.tenantId },
    include: { bus: true },
  });

  if (!trajet) {
    return NextResponse.json({ error: "Trajet introuvable" }, { status: 404 });
  }

  // Check seat not already taken for this trajet
  const existingBillet = await db.billet.findFirst({
    where: { trajetId, seatNumber },
  });

  if (existingBillet) {
    return NextResponse.json(
      { error: `Le siège ${seatNumber} est déjà pris` },
      { status: 409 }
    );
  }

  // Check capacity
  const soldCount = await db.billet.count({ where: { trajetId } });
  if (soldCount >= trajet.bus.capacity) {
    return NextResponse.json(
      { error: "Bus complet" },
      { status: 409 }
    );
  }

  const qrCode = `https://busgo.sn/b/${ticketNumber}`;

  const billet = await db.billet.create({
    data: {
      trajetId,
      clientId,
      seatNumber,
      ticketNumber,
      qrCode,
      status: "sold",
    },
    include: {
      trajet: { include: { bus: true } },
    },
  });

  return NextResponse.json(billet, { status: 201 });
}