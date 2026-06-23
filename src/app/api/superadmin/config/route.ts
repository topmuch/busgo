import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/superadmin-utils";

// GET /api/superadmin/config
export async function GET() {
  const session = await getServerSession();
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  let config = await db.systemConfig.findUnique({ where: { id: "global" } });
  if (!config) {
    config = await db.systemConfig.create({ data: { id: "global" } });
  }

  return NextResponse.json(config);
}

// PATCH /api/superadmin/config
export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();

  // Only allow known fields
  const allowedFields = [
    "siteName", "siteDescription", "siteKeywords", "ogImage", "favicon",
    "logoUrl", "primaryColor", "secondaryColor",
    "supportEmail", "supportPhone", "supportWhatsApp", "address",
    "pricePerBus", "trialDays",
    "smsEnabled", "whatsappEnabled", "ttsEnabled",
  ];

  const updateData: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      updateData[key] = body[key];
    }
  }

  const config = await db.systemConfig.upsert({
    where: { id: "global" },
    update: updateData,
    create: { id: "global", ...updateData },
  });

  await logAudit({
    userId: session.user.id,
    action: "config.update",
    entityType: "SystemConfig",
    entityId: "global",
    newValues: updateData,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json(config);
}