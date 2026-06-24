import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { validateBody, schemas } from "@/lib/api-validation";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
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
  const session = await getServerSession();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await validateBody(req, schemas.billetCreate);
  if (body instanceof NextResponse) return body;

  const { trajetId, clientId, seatNumber, ticketNumber, passengerName, passengerPhone } = body as {
    trajetId: string;
    clientId: string;
    seatNumber: number;
    ticketNumber?: string;
    passengerName?: string;
    passengerPhone?: string;
  };

  // ticketNumber is optional in the schema but required by this endpoint's business logic
  if (!ticketNumber) {
    return NextResponse.json(
      { error: "Numéro de billet requis" },
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

  // Generate a temporary qrCode that satisfies the @unique constraint.
  // We update it with the real billet.id-based URL right after creation.
  const tempQrCode = `https://busgo.sn/b/tmp-${crypto.randomUUID()}`;

  const billet = await db.billet.create({
    data: {
      trajetId,
      clientId,
      seatNumber,
      ticketNumber,
      qrCode: tempQrCode,
      status: "sold",
    },
    include: {
      trajet: { include: { bus: true } },
    },
  });

  // Set qrCode with the actual billet ID
  const updated = await db.billet.update({
    where: { id: billet.id },
    data: { qrCode: `https://busgo.sn/b/${billet.id}` },
    include: {
      trajet: { include: { bus: true } },
    },
  });

  return NextResponse.json(updated, { status: 201 });
}