import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const section = url.searchParams.get("section") || "logs";

  if (section === "logs") {
    const level = url.searchParams.get("level");
    const where: Record<string, unknown> = {};
    if (level) where.level = level;

    const logs = await db.systemLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(logs);
  }

  if (section === "templates") {
    const tenantId = url.searchParams.get("tenantId");
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;

    const templates = await db.notificationTemplate.findMany({
      where,
      orderBy: { event: "asc" },
    });
    return NextResponse.json(templates);
  }

  if (section === "voice-configs") {
    const configs = await db.voiceConfig.findMany({
      include: { tenant: { select: { name: true, slug: true } } },
    });
    return NextResponse.json(configs);
  }

  return NextResponse.json({ error: "Section non reconnue" }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const { type, data } = body;

  if (type === "template") {
    const { id, ...fields } = data;
    const template = await db.notificationTemplate.update({
      where: { id },
      data: fields,
    });
    return NextResponse.json(template);
  }

  return NextResponse.json({ error: "Type non reconnu" }, { status: 400 });
}