import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { validateBody, schemas } from "@/lib/api-validation";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // The create-guichet endpoint accepts a slightly different shape than
  // schemas.billetGuichetCreate (which is missing ticketNumber). Use a
  // dedicated inline schema to also validate ticketNumber.
  const body = await validateBody(
    req,
    schemas.billetGuichetCreate.extend({
      ticketNumber: z.string().min(1, "Numéro de ticket requis").max(100),
    })
  );
  if (body instanceof NextResponse) return body;

  const { trajetId, passengerName, passengerPhone, seatNumber, ticketNumber } = body;

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

  // Generate a temporary qrCode that satisfies the @unique constraint.
  // We update it with the real billet.id-based URL right after creation.
  const tempQrCode = `https://busgo.sn/b/tmp-${crypto.randomUUID()}`;

  const billet = await db.billet.create({
    data: {
      trajetId,
      clientId: client.id,
      seatNumber,
      ticketNumber,
      qrCode: tempQrCode,
      status: "sold",
    },
    include: {
      trajet: { include: { bus: true } },
      client: { select: { id: true, name: true, phone: true } },
    },
  });

  // Update qrCode with the actual billet ID
  const updated = await db.billet.update({
    where: { id: billet.id },
    data: { qrCode: `https://busgo.sn/b/${billet.id}` },
    include: {
      trajet: { include: { bus: true } },
      client: { select: { id: true, name: true, phone: true } },
    },
  });

  return NextResponse.json(updated, { status: 201 });
}