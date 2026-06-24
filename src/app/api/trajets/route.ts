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
  const dateFilter = searchParams.get("dateFilter") || searchParams.get("date");
  const statusFilter = searchParams.get("status");
  const includeBillets = searchParams.get("includeBillets") === "true";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let dateWhere: Record<string, unknown> = {};

  if (dateFilter === "today") {
    dateWhere = { date: { gte: today, lt: tomorrow } };
  } else if (dateFilter === "upcoming") {
    dateWhere = { date: { gte: today } };
  } else if (dateFilter === "all") {
    // No date filter
  } else if (dateFilter) {
    // Specific date string
    dateWhere = { date: new Date(dateFilter) };
  } else {
    // Default: show today
    dateWhere = { date: { gte: today, lt: tomorrow } };
  }

  const trajets = await db.trajet.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...dateWhere,
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
  const session = await getServerSession();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await validateBody(req, schemas.trajetCreate);
  if (body instanceof NextResponse) return body;

  const { busId, origin, destination, date, time, price } = body;

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