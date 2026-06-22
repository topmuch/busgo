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
  const { trajetId, passengers } = body;

  if (!trajetId || !Array.isArray(passengers) || passengers.length === 0) {
    return NextResponse.json(
      { error: "trajetId et passengers requis" },
      { status: 400 }
    );
  }

  // Verify trajet belongs to tenant
  const trajet = await db.trajet.findFirst({
    where: { id: trajetId, tenantId: session.user.tenantId },
    include: { bus: true },
  });

  if (!trajet) {
    return NextResponse.json({ error: "Trajet introuvable" }, { status: 404 });
  }

  // Get existing billets for this trajet
  const existingBillets = await db.billet.findMany({
    where: { trajetId },
    select: { seatNumber: true },
  });
  const occupiedSeats = new Set(existingBillets.map((b) => b.seatNumber));

  const results: { success: number; errors: string[] } = {
    success: 0,
    errors: [],
  };

  for (const p of passengers) {
    const { name, phone, seat } = p;

    if (!name || !seat) {
      results.errors.push("Ligne ignorée : nom ou siège manquant");
      continue;
    }

    const seatNum = Number(seat);
    if (isNaN(seatNum) || seatNum < 1 || seatNum > trajet.bus.capacity) {
      results.errors.push(`${name} : siège ${seat} invalide`);
      continue;
    }

    if (occupiedSeats.has(seatNum)) {
      results.errors.push(`${name} : siège ${seatNum} déjà pris`);
      continue;
    }

    // Create user (client) if needed
    const email = phone ? `${phone.replace(/\s/g, "")}@busgo.local` : `guest_${Date.now()}@busgo.local`;
    let client = await db.user.findUnique({ where: { email } });

    if (!client) {
      client = await db.user.create({
        data: {
          email,
          password: await bcrypt.hash(`pass_${Date.now()}`, 10),
          name,
          phone: phone || "",
          role: "client",
          tenantId: session.user.tenantId,
        },
      });
    }

    const ticketNumber = `BG-${Date.now().toString(36).toUpperCase()}-${seatNum.toString().padStart(4, "0")}`;
    const qrCode = `https://busgo.sn/b/${ticketNumber}`;

    try {
      await db.billet.create({
        data: {
          trajetId,
          clientId: client.id,
          seatNumber: seatNum,
          ticketNumber,
          qrCode,
          status: "sold",
        },
      });
      occupiedSeats.add(seatNum);
      results.success++;
    } catch {
      results.errors.push(`${name} : erreur de création`);
    }
  }

  return NextResponse.json(results, { status: 201 });
}