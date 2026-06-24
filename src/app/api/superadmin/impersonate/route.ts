import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { encode } from "next-auth/jwt";
import { validateBody } from "@/lib/api-validation";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (session?.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // schemas.impersonate expects tenantId, but this endpoint actually wants userId.
  // Use a local schema.
  const body = await validateBody(
    req,
    z.object({ userId: z.string().min(1, "userId requis") })
  );
  if (body instanceof NextResponse) return body;
  const { userId } = body;

  const targetUser = await db.user.findUnique({
    where: { id: userId },
    include: { tenant: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  await db.systemLog.create({
    data: {
      level: "warning",
      action: "impersonate_start",
      message: `Impersonation démarrée — ${targetUser.email} (${targetUser.role})`,
      userId: session.user.id,
      tenantId: targetUser.tenantId ?? undefined,
    },
  });

  const impersonatedToken = await encode({
    token: {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      tenantId: targetUser.tenantId ?? undefined,
      tenantSlug: targetUser.tenant?.slug ?? undefined,
      tenantName: targetUser.tenant?.name ?? undefined,
      impersonatedBy: session.user.id,
    },
    secret: process.env.NEXTAUTH_SECRET!,
  });

  return NextResponse.json({
    token: impersonatedToken,
    user: {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      tenantName: targetUser.tenant?.name,
    },
  });
}