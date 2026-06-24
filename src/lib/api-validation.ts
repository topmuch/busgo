import { NextRequest, NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";

/**
 * API input validation helpers using Zod.
 *
 * USAGE
 * ─────
 *   import { validateBody, schemas } from "@/lib/api-validation";
 *
 *   export async function POST(request: NextRequest) {
 *     const session = await getServerSession();
 *     if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
 *
 *     const body = await validateBody(request, schemas.billetCreate);
 *     if (body instanceof NextResponse) return body; // validation error
 *
 *     // body is now typed as z.infer<typeof schemas.billetCreate>
 *     const billet = await db.billet.create({ data: { ... } });
 *     ...
 *   }
 */

/**
 * Validate a JSON request body against a Zod schema.
 *
 * Returns the parsed body on success, or a NextResponse (400) on validation
 * error. The caller is expected to check `instanceof NextResponse` to detect
 * the error case (see USAGE above).
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T | NextResponse> {
  try {
    const json = await request.json();
    return schema.parse(json);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: err.issues.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Body JSON invalide" },
      { status: 400 }
    );
  }
}

/**
 * Validate a search-param against a Zod schema.
 *
 * Returns the parsed value on success, or a NextResponse (400) on error.
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): T | NextResponse {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    return schema.parse(params);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Paramètres invalides",
          details: err.issues.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Paramètres invalides" },
      { status: 400 }
    );
  }
}

/**
 * Common Zod schemas for BusGo API endpoints.
 *
 * These cover the main POST/PATCH routes that accept user input. Routes that
 * only do GET with simple query params don't need explicit validation since
 * Prisma type-checks the query at runtime.
 */
import { z } from "zod";

export const schemas = {
  // POST /api/login
  login: z.object({
    email: z.string().email("Email invalide"),
    password: z.string().min(1, "Mot de passe requis"),
  }),

  // POST /api/trajets
  trajetCreate: z.object({
    busId: z.string().min(1, "busId requis"),
    origin: z.string().min(1, "Origine requise"),
    destination: z.string().min(1, "Destination requise"),
    date: z.string().min(1, "Date requise"),
    time: z.string().min(1, "Heure requise"),
    price: z.union([z.number(), z.string()]).transform((v) => Number(v)),
    capacity: z.number().int().positive().optional(),
  }),

  // POST /api/billets
  billetCreate: z.object({
    trajetId: z.string().min(1, "trajetId requis"),
    clientId: z.string().min(1, "clientId requis"),
    seatNumber: z.number().int().positive("Numéro de siège invalide"),
  }),

  // POST /api/billets/create-guichet
  billetGuichetCreate: z.object({
    trajetId: z.string().min(1, "trajetId requis"),
    seatNumber: z.number().int().positive("Numéro de siège invalide"),
    passengerName: z.string().min(1, "Nom passager requis"),
    passengerPhone: z.string().optional(),
    email: z.string().email("Email invalide").optional(),
  }),

  // POST /api/trajets/import-csv
  // Note: per-passenger validation is intentionally LENIENT here — the route
  // handler does row-by-row validation and skips invalid rows (returning them
  // as errors in the response, not rejecting the whole request).
  csvImport: z.object({
    trajetId: z.string().min(1, "trajetId requis"),
    passengers: z.array(
      z.object({
        name: z.string().optional(),
        seat: z.union([z.number(), z.string()]).optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
      })
    ).min(1, "Au moins un passager requis"),
  }),

  // POST /api/buses
  busCreate: z.object({
    number: z.string().min(1, "Numéro de bus requis"),
    capacity: z.number().int().positive("Capacité invalide"),
    driverId: z.string().optional(),
  }),

  // POST /api/admin/agents
  agentCreate: z.object({
    name: z.string().min(1, "Nom requis"),
    email: z.string().email("Email invalide"),
    phone: z.string().optional(),
    password: z.string().min(8, "Mot de passe min 8 caractères"),
    role: z.enum(["admin", "agent"]).optional().default("agent"),
  }),

  // POST /api/agent/scan
  scanBillet: z.object({
    qrCode: z.string().min(1, "qrCode requis"),
    trajetId: z.string().min(1, "trajetId requis"),
  }),

  // PATCH /api/agent/billets/[billetId]/status
  billetStatusUpdate: z.object({
    status: z.enum(["sold", "boarded", "absent", "cancelled"]),
  }),

  // POST /api/agent/trajets/[trajetId]/depart
  trajetDepart: z.object({
    actualDepartureTime: z.string().optional(),
  }),

  // POST /api/superadmin/tenants
  tenantCreate: z.object({
    name: z.string().min(1, "Nom requis"),
    slug: z.string().min(1, "Slug requis").regex(/^[a-z0-9-]+$/, "Slug invalide"),
    adminEmail: z.string().email("Email admin invalide"),
    adminPassword: z.string().min(8, "Mot de passe min 8 caractères"),
    adminName: z.string().min(1, "Nom admin requis"),
    adminPhone: z.string().optional(),
    plan: z.enum(["trial", "starter", "pro", "enterprise"]).optional().default("trial"),
  }),

  // POST /api/superadmin/impersonate
  impersonate: z.object({
    tenantId: z.string().min(1, "tenantId requis"),
  }),

  // POST /api/superadmin/invoices/[id]/pay
  invoicePay: z.object({
    method: z.enum(["card", "transfer", "cash", "mobile_money"]).optional(),
    reference: z.string().optional(),
  }),
};
