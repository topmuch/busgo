import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import {
  generateSlug,
  generatePassword,
  calculateMonthlyPrice,
  generateInvoiceNumber,
  logAudit,
  getClientIp,
} from "@/lib/superadmin-utils";

const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  adminEmail: z.string().email(),
  adminPhone: z.string().min(8),
  plan: z.enum(["starter", "pro", "enterprise"]).default("starter"),
  numberOfBuses: z.number().int().min(1).max(500).default(1),
  country: z.string().default("SN"),
  address: z.string().optional(),
  logo: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
});

// GET /api/superadmin/tenants
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const plan = searchParams.get("plan") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { slug: { contains: search.toLowerCase() } },
      { adminEmail: { contains: search.toLowerCase() } },
    ];
  }
  if (plan) where.plan = plan;
  if (status === "active") where.isActive = true;
  else if (status === "suspended") where.isSuspended = true;
  else if (status === "inactive") where.isActive = false;

  const [tenants, total] = await Promise.all([
    db.tenant.findMany({
      where,
      include: {
        _count: { select: { users: true, buses: true, trajets: true, invoices: true } },
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.tenant.count({ where }),
  ]);

  return NextResponse.json({ tenants, total, page, limit });
}

// PATCH /api/superadmin/tenants — Quick toggle isActive
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const { tenantId, isActive } = body;

  if (!tenantId || typeof isActive !== "boolean") {
    return NextResponse.json({ error: "tenantId et isActive (boolean) requis" }, { status: 400 });
  }

  const existing = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "Compagnie non trouvée" }, { status: 404 });
  }

  const updated = await db.tenant.update({
    where: { id: tenantId },
    data: { isActive },
  });

  // Also toggle user accounts
  await db.user.updateMany({
    where: { tenantId },
    data: { isActive },
  });

  await logAudit({
    userId: session.user.id,
    action: isActive ? "tenant.activate" : "tenant.deactivate",
    entityType: "Tenant",
    entityId: tenantId,
    tenantId,
    oldValues: { isActive: existing.isActive },
    newValues: { isActive },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json(updated);
}

// POST /api/superadmin/tenants — Create tenant
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const { name, slug, phone, email, country, adminName, adminEmail, adminPhone, plan } = body;

    // Validate required fields
    if (!name || !slug || !adminName || !adminEmail || !adminPhone) {
      return NextResponse.json(
        { error: "Les champs name, slug, adminName, adminEmail et adminPhone sont requis" },
        { status: 400 }
      );
    }

    // Validate plan
    const tenantPlan = (plan && ["starter", "pro", "enterprise"].includes(plan)) ? plan : "starter";

    // Check slug uniqueness
    const slugExists = await db.tenant.findUnique({ where: { slug } });
    if (slugExists) {
      return NextResponse.json(
        { error: "Ce slug est déjà utilisé" },
        { status: 409 }
      );
    }

    // Check adminEmail uniqueness
    const emailExists = await db.tenant.findUnique({
      where: { adminEmail },
    });
    if (emailExists) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 409 }
      );
    }

    // Generate password
    const plainPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const ipAddress =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Transaction: Tenant + User + Subscription + AuditLog
    const tenant = await db.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name,
          slug,
          phone: phone || null,
          email: email || null,
          country: country || "SN",
          adminEmail,
          adminPassword: hashedPassword,
          adminPhone,
          plan: tenantPlan,
          subscriptionStatus: "trial",
          subscriptionStart: now,
          subscriptionEnd: trialEnd,
          isActive: true,
        },
      });

      await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          phone: adminPhone,
          role: "admin",
          tenantId: newTenant.id,
          isActive: true,
        },
      });

      await tx.subscription.create({
        data: {
          tenantId: newTenant.id,
          plan: tenantPlan,
          status: "active",
          startDate: now,
          endDate: trialEnd,
          pricePerBus: 20000,
          busCount: 0,
          totalAmount: 0,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "tenant.create",
          entityType: "Tenant",
          entityId: newTenant.id,
          tenantId: newTenant.id,
          newValues: JSON.stringify({ name, slug, plan: tenantPlan }),
          ipAddress,
        },
      });

      return newTenant;
    });

    return NextResponse.json(
      {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        adminEmail: tenant.adminEmail,
        generatedPassword: plainPassword,
        plan: tenant.plan,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create tenant error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}