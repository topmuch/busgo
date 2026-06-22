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
  const dateFilter = searchParams.get("date");
  const statusFilter = searchParams.get("status");
  const includeBillets = searchParams.get("includeBillets") === "true";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const trajets = await db.trajet.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(dateFilter === "today"
        ? { date: { gte: today, lt: tomorrow } }
        : dateFilter
          ? { date: new Date(dateFilter) }
          : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: {
      bus: {
        include: {
          driver: { select: { id: true, name: true } },
        },
      },
      ...(includeBillets
        ? {
            billets: {
              include: {
                client: { select: { name: true, phone: true } },
              },
              orderBy: { seatNumber: "asc" },
            },
          }
        : {
            _count: { select: { billets: true } },
          }),
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  return NextResponse.json(trajets);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const { busId, origin, destination, date, time, price } = body;

  if (!busId || !origin || !destination || !date || !time || !price) {
    return NextResponse.json(
      { error: "Champs requis manquants" },
      { status: 400 }
    );
  }

  // Verify bus belongs to tenant
  const bus = await db.bus.findFirst({
    where: { id: busId, tenantId: session.user.tenantId },
  });

  if (!bus) {
    return NextResponse.json({ error: "Bus introuvable" }, { status: 404 });
  }

  const trajet = await db.trajet.create({
    data: {
      tenantId: session.user.tenantId,
      busId,
      origin,
      destination,
      date: new Date(date),
      time,
      price: Number(price),
      status: "scheduled",
    },
    include: { bus: true },
  });

  return NextResponse.json(trajet, { status: 201 });
}