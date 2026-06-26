import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { listOffersForAdmin } from "@/lib/modules/sponsor-service";

/**
 * GET /api/sponsor/admin?scope=global|tenant&isActive=true
 * Lists all offers (admin or superadmin only).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") as "global" | "tenant" | null;
    const isActive = url.searchParams.get("isActive");

    // Admin (tenant) can only see their own tenant's offers + global offers
    // SuperAdmin can see all
    const tenantId =
      session.user.role === "superadmin"
        ? url.searchParams.get("tenantId") ?? undefined
        : session.user.tenantId ?? undefined;

    const offers = await listOffersForAdmin({
      tenantId: tenantId ?? undefined,
      scope: scope ?? undefined,
      isActive: isActive !== null ? isActive === "true" : undefined,
    });

    return NextResponse.json({ offers });
  } catch (error) {
    console.error("[SPONSOR_ADMIN_LIST_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sponsor/admin
 * Creates a new sponsored offer.
 * SuperAdmin only can create global offers; tenant admin can create tenant offers.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      imageUrl,
      ctaLabel,
      ctaUrl,
      bgColor,
      textColor,
      targetPwa,
      scope,
      tenantId: bodyTenantId,
      startDate,
      endDate,
      maxImpressions,
      maxClicks,
      priority,
    } = body as {
      title: string;
      description?: string;
      imageUrl?: string;
      ctaLabel?: string;
      ctaUrl: string;
      bgColor?: string;
      textColor?: string;
      targetPwa?: "client" | "agent" | "both";
      scope?: "global" | "tenant";
      tenantId?: string;
      startDate?: string;
      endDate: string;
      maxImpressions?: number;
      maxClicks?: number;
      priority?: number;
    };

    if (!title || !ctaUrl || !endDate) {
      return NextResponse.json(
        { error: "title, ctaUrl et endDate sont requis" },
        { status: 400 }
      );
    }

    // Resolve scope + tenantId
    const finalScope = scope ?? "tenant";
    let finalTenantId: string | null = null;

    if (finalScope === "global") {
      // Only superadmin can create global offers
      if (session.user.role !== "superadmin") {
        return NextResponse.json(
          { error: "Seul le SuperAdmin peut créer des offres globales" },
          { status: 403 }
        );
      }
    } else {
      // Tenant offer
      finalTenantId =
        session.user.role === "superadmin"
          ? (bodyTenantId ?? session.user.tenantId ?? null)
          : session.user.tenantId ?? null;

      if (!finalTenantId) {
        return NextResponse.json(
          { error: "tenantId requis pour une offre tenant" },
          { status: 400 }
        );
      }
    }

    const offer = await db.sponsoredOffer.create({
      data: {
        scope: finalScope,
        tenantId: finalTenantId,
        targetPwa: targetPwa ?? "client",
        title,
        description: description ?? null,
        imageUrl: imageUrl ?? null,
        ctaLabel: ctaLabel ?? "En savoir plus",
        ctaUrl,
        bgColor: bgColor ?? "#4A90E2",
        textColor: textColor ?? "#ffffff",
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: new Date(endDate),
        isActive: true,
        maxImpressions: maxImpressions ?? null,
        maxClicks: maxClicks ?? null,
        priority: priority ?? 50,
        createdBy: session.user.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, offer });
  } catch (error) {
    console.error("[SPONSOR_ADMIN_CREATE_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
