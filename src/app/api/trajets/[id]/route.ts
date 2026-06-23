import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  // Check trajet belongs to tenant
  const existing = await db.trajet.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Trajet introuvable" }, { status: 404 });
  }

  const body = await req.json();
  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: "Status requis" }, { status: 400 });
  }

  const validStatuses = ["scheduled", "boarding", "departed", "arrived", "cancelled"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Status invalide" }, { status: 400 });
  }

  const trajet = await db.trajet.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(trajet);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.trajet.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Trajet introuvable" }, { status: 404 });
  }

  // Delete billets first (cascade)
  await db.billet.deleteMany({ where: { trajetId: id } });
  await db.trajet.delete({ where: { id } });

  return NextResponse.json({ success: true });
}