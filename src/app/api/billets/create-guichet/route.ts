import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const { trajetId, passengerName, passengerPhone, seatNumber, ticketNumber } = body;

  if (!trajetId || !passengerName || !seatNumber || !ticketNumber) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const trajet = await db.trajet.findFirst({
    where: { id: trajetId, tenantId: session.user.tenantId },
    include: { bus: true },
  });

  if (!trajet) {
    return NextResponse.json({ error: "Trajet introuvable" }, { status: 404 });
  }

  if (seatNumber < 1 || seatNumber > trajet.bus.capacity) {
    return NextResponse.json({ error: "Numéro de siège invalide" }, { status: 400 });
  }

  const existingSeat = await db.billet.findFirst({
    where: { trajetId, seatNumber },
  });
  if (existingSeat) {
    return NextResponse.json({ error: `Siège ${seatNumber} déjà pris` }, { status: 409 });
  }

  const existingTicket = await db.billet.findUnique({
    where: { ticketNumber },
  });
  if (existingTicket) {
    return NextResponse.json({ error: "Numéro de ticket déjà utilisé" }, { status: 409 });
  }

  const email = passengerPhone
    ? `${passengerPhone.replace(/\s/g, "")}@busgo.local`
    : `${ticketNumber.replace(/\s/g, "")}@busgo.local`;

  let client = await db.user.findUnique({ where: { email } });

  if (!client) {
    client = await db.user.create({
      data: {
        email,
        password: await bcrypt.hash(`pass_${Date.now()}`, 10),
        name: passengerName,
        phone: passengerPhone || "",
        role: "client",
        tenantId: session.user.tenantId,
      },
    });
  }

  const billet = await db.billet.create({
    data: {
      trajetId,
      clientId: client.id,
      seatNumber,
      ticketNumber,
      qrCode: `https://busgo.sn/b/${ticketNumber}`,
      status: "sold",
    },
    include: {
      trajet: { include: { bus: true } },
      client: { select: { id: true, name: true, phone: true } },
    },
  });

  return NextResponse.json(billet, { status: 201 });
}