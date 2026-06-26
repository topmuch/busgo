/**
 * ═══════════════════════════════════════════════════════════════
 *  Compensation Service
 *  Module "Compensation Retard Manqué"
 * ═══════════════════════════════════════════════════════════════
 *
 *  Règles d'éligibilité:
 *  - Le passager a partagé sa position GPS live (hadGpsTracking=true)
 *  - La dernière position était à < 2000m du quai (en route vers le bus)
 *  - Le passager n'était pas statique (wasMovingTowardsQuay=true)
 *  - L'ETA était <= 15 min (vraiment en retard, pas absent)
 *
 *  Si éligible → amount = 50% du prix du billet (min 1000 FCFA, max 10000 FCFA)
 *  Voucher valable 90 jours. Code unique format: BG-XXXX-XXXX-XXXX
 */

import { db } from "@/lib/db";
import { randomBytes } from "crypto";

// ─── Constants ─────────────────────────────────────────────────

export const COMPENSATION_PERCENT = 0.5; // 50% du prix du billet
export const COMPENSATION_MIN_FCFA = 1000;
export const COMPENSATION_MAX_FCFA = 10000;
export const COMPENSATION_TTL_DAYS = 90;

export const ELIGIBILITY_MAX_DISTANCE_M = 2000;
export const ELIGIBILITY_MAX_ETA_MIN = 15;

// ─── Types ─────────────────────────────────────────────────────

export interface EligibilityData {
  hadGpsTracking: boolean;
  lastDistanceMeters?: number;
  lastEtaMinutes?: number;
  wasMovingTowardsQuay: boolean;
}

export interface CompensationResult {
  ok: boolean;
  reason?: string;
  compensationId?: string;
  voucherCode?: string;
  amountFcfa?: number;
}

// ─── Voucher code generator ────────────────────────────────────

/**
 * Generate a unique voucher code: BG-XXXX-XXXX-XXXX
 * where X is alphanumeric (uppercase, no ambiguous chars).
 */
export function generateVoucherCode(): string {
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
  const blocks: string[] = [];
  for (let b = 0; b < 3; b++) {
    const bytes = randomBytes(4);
    let block = "";
    for (let i = 0; i < 4; i++) {
      block += ALPHABET[bytes[i]! % ALPHABET.length];
    }
    blocks.push(block);
  }
  return `BG-${blocks.join("-")}`;
}

// ─── Eligibility check ─────────────────────────────────────────

export function checkEligibility(data: EligibilityData): {
  eligible: boolean;
  reason?: string;
} {
  if (!data.hadGpsTracking) {
    return { eligible: false, reason: "no_gps_tracking" };
  }
  if (data.lastDistanceMeters === undefined) {
    return { eligible: false, reason: "no_distance_data" };
  }
  if (data.lastDistanceMeters > ELIGIBILITY_MAX_DISTANCE_M) {
    return { eligible: false, reason: "too_far_from_quay" };
  }
  if (data.lastEtaMinutes === undefined) {
    return { eligible: false, reason: "no_eta_data" };
  }
  if (data.lastEtaMinutes > ELIGIBILITY_MAX_ETA_MIN) {
    return { eligible: false, reason: "eta_too_long" };
  }
  if (!data.wasMovingTowardsQuay) {
    return { eligible: false, reason: "passenger_static" };
  }
  return { eligible: true };
}

// ─── Compute amount ────────────────────────────────────────────

export function computeAmount(billetPrice: number): number {
  const raw = Math.round(billetPrice * COMPENSATION_PERCENT);
  return Math.min(
    COMPENSATION_MAX_FCFA,
    Math.max(COMPENSATION_MIN_FCFA, raw)
  );
}

// ─── Main: attribute compensation ──────────────────────────────

export async function attributeCompensation(params: {
  billetId: string;
  tenantId: string;
  eligibility: EligibilityData;
  issuedBy?: string; // userId or "auto"
  notes?: string;
}): Promise<CompensationResult> {
  const { billetId, tenantId, eligibility, issuedBy = "auto", notes } = params;

  // 1) Fetch billet with trajet (for price)
  const billet = await db.billet.findUnique({
    where: { id: billetId },
    include: {
      trajet: { select: { price: true, tenantId: true } },
      client: { select: { id: true, name: true } },
      compensations: { where: { status: { in: ["pending", "issued"] } } },
    },
  });

  if (!billet) return { ok: false, reason: "billet_not_found" };
  if (billet.trajet.tenantId !== tenantId) {
    return { ok: false, reason: "tenant_mismatch" };
  }
  if (billet.status !== "absent") {
    return { ok: false, reason: "billet_not_absent" };
  }

  // Already compensated?
  if (billet.compensations.length > 0) {
    return {
      ok: false,
      reason: "already_compensated",
      compensationId: billet.compensations[0]!.id,
      voucherCode: billet.compensations[0]!.voucherCode,
    };
  }

  // 2) Check eligibility
  const eligibilityCheck = checkEligibility(eligibility);
  if (!eligibilityCheck.eligible) {
    return { ok: false, reason: eligibilityCheck.reason };
  }

  // 3) Compute amount
  const amountFcfa = computeAmount(billet.trajet.price);

  // 4) Generate unique voucher code (retry if collision)
  let voucherCode = generateVoucherCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await db.compensation.findUnique({
      where: { voucherCode },
      select: { id: true },
    });
    if (!existing) break;
    voucherCode = generateVoucherCode();
    attempts++;
  }

  // 5) Create compensation
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + COMPENSATION_TTL_DAYS);

  const compensation = await db.compensation.create({
    data: {
      tenantId,
      billetId,
      clientId: billet.clientId,
      amountFcfa,
      reason: "missed_delay",
      status: "issued",
      hadGpsTracking: eligibility.hadGpsTracking,
      lastDistanceMeters: eligibility.lastDistanceMeters ?? null,
      lastEtaMinutes: eligibility.lastEtaMinutes ?? null,
      wasMovingTowardsQuay: eligibility.wasMovingTowardsQuay,
      voucherCode,
      issuedBy,
      expiresAt,
      notes,
    },
  });

  return {
    ok: true,
    compensationId: compensation.id,
    voucherCode,
    amountFcfa,
  };
}

// ─── List compensations for a client ───────────────────────────

export async function listClientCompensations(clientId: string) {
  return db.compensation.findMany({
    where: { clientId },
    include: {
      billet: {
        select: {
          trajet: {
            select: { origin: true, destination: true, date: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Redeem a voucher ──────────────────────────────────────────

export async function redeemVoucher(params: {
  voucherCode: string;
  newBilletId: string;
  tenantId: string;
}): Promise<{ ok: boolean; reason?: string; compensationId?: string }> {
  const { voucherCode, newBilletId, tenantId } = params;

  const compensation = await db.compensation.findUnique({
    where: { voucherCode },
  });

  if (!compensation) return { ok: false, reason: "voucher_not_found" };
  if (compensation.tenantId !== tenantId) {
    return { ok: false, reason: "tenant_mismatch" };
  }
  if (compensation.status === "redeemed") {
    return { ok: false, reason: "already_redeemed" };
  }
  if (compensation.status === "expired" || compensation.expiresAt < new Date()) {
    return { ok: false, reason: "expired" };
  }
  if (compensation.status === "cancelled") {
    return { ok: false, reason: "cancelled" };
  }

  await db.compensation.update({
    where: { id: compensation.id },
    data: {
      status: "redeemed",
      redeemedAt: new Date(),
      redeemedByBilletId: newBilletId,
    },
  });

  return { ok: true, compensationId: compensation.id };
}

// ─── List compensations for admin ──────────────────────────────

export async function listTenantCompensations(
  tenantId: string,
  options: { status?: string; take?: number } = {}
) {
  const { status, take = 50 } = options;
  return db.compensation.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      billet: {
        select: {
          ticketNumber: true,
          trajet: {
            select: { origin: true, destination: true, date: true },
          },
          client: { select: { name: true, phone: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}
