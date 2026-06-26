import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * ═══════════════════════════════════════════════════════════════
 *  Tests unitaires — Module Compensation Retard Manqué
 * ═══════════════════════════════════════════════════════════════
 *
 *  Couverture:
 *  - Voucher code generation (format, uniqueness)
 *  - Eligibility rules (GPS, distance, ETA, movement)
 *  - Amount computation (% of billet price, min/max)
 *  - checkEligibility edge cases
 */

import {
  generateVoucherCode,
  checkEligibility,
  computeAmount,
  COMPENSATION_PERCENT,
  COMPENSATION_MIN_FCFA,
  COMPENSATION_MAX_FCFA,
  COMPENSATION_TTL_DAYS,
  ELIGIBILITY_MAX_DISTANCE_M,
  ELIGIBILITY_MAX_ETA_MIN,
  type EligibilityData,
} from "../../src/lib/modules/compensation-service";

// ──────────────────────────────────────────────────────────────
// 1. Voucher code generation
// ──────────────────────────────────────────────────────────────

describe("Compensation — Voucher code generation", () => {
  it("generates code with format BG-XXXX-XXXX-XXXX", () => {
    const code = generateVoucherCode();
    expect(code).toMatch(/^BG-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("generates unique codes (no collision in 1000 attempts)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateVoucherCode());
    }
    expect(codes.size).toBe(1000);
  });

  it("does not use ambiguous characters (I, O, 0, 1)", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateVoucherCode();
      // Strip "BG-" prefix and dashes
      const chars = code.replace(/[^A-Z0-9]/g, "");
      expect(chars).not.toMatch(/[IO01]/);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// 2. Eligibility check
// ──────────────────────────────────────────────────────────────

describe("Compensation — Eligibility check", () => {
  it("rejects if no GPS tracking", () => {
    const result = checkEligibility({
      hadGpsTracking: false,
      wasMovingTowardsQuay: true,
      lastDistanceMeters: 100,
      lastEtaMinutes: 5,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("no_gps_tracking");
  });

  it("rejects if distance > 2000m", () => {
    const result = checkEligibility({
      hadGpsTracking: true,
      wasMovingTowardsQuay: true,
      lastDistanceMeters: 2001,
      lastEtaMinutes: 5,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("too_far_from_quay");
  });

  it("accepts if distance = 2000m (boundary)", () => {
    const result = checkEligibility({
      hadGpsTracking: true,
      wasMovingTowardsQuay: true,
      lastDistanceMeters: 2000,
      lastEtaMinutes: 5,
    });
    expect(result.eligible).toBe(true);
  });

  it("rejects if ETA > 15 min", () => {
    const result = checkEligibility({
      hadGpsTracking: true,
      wasMovingTowardsQuay: true,
      lastDistanceMeters: 500,
      lastEtaMinutes: 16,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("eta_too_long");
  });

  it("accepts if ETA = 15 min (boundary)", () => {
    const result = checkEligibility({
      hadGpsTracking: true,
      wasMovingTowardsQuay: true,
      lastDistanceMeters: 500,
      lastEtaMinutes: 15,
    });
    expect(result.eligible).toBe(true);
  });

  it("rejects if passenger was static", () => {
    const result = checkEligibility({
      hadGpsTracking: true,
      wasMovingTowardsQuay: false,
      lastDistanceMeters: 500,
      lastEtaMinutes: 5,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("passenger_static");
  });

  it("rejects if distance is missing", () => {
    const result = checkEligibility({
      hadGpsTracking: true,
      wasMovingTowardsQuay: true,
      lastEtaMinutes: 5,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("no_distance_data");
  });

  it("rejects if ETA is missing", () => {
    const result = checkEligibility({
      hadGpsTracking: true,
      wasMovingTowardsQuay: true,
      lastDistanceMeters: 500,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("no_eta_data");
  });

  it("accepts a fully eligible passenger", () => {
    const result = checkEligibility({
      hadGpsTracking: true,
      wasMovingTowardsQuay: true,
      lastDistanceMeters: 800,
      lastEtaMinutes: 8,
    });
    expect(result.eligible).toBe(true);
  });

  it("accepts a passenger very close to quay (100m, 2min)", () => {
    const result = checkEligibility({
      hadGpsTracking: true,
      wasMovingTowardsQuay: true,
      lastDistanceMeters: 100,
      lastEtaMinutes: 2,
    });
    expect(result.eligible).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 3. Amount computation
// ──────────────────────────────────────────────────────────────

describe("Compensation — Amount computation", () => {
  it("computes 50% of billet price", () => {
    expect(computeAmount(10000)).toBe(5000);
    expect(computeAmount(20000)).toBe(10000);
    expect(computeAmount(5000)).toBe(2500);
  });

  it("clamps to minimum (1000 FCFA)", () => {
    expect(computeAmount(1000)).toBe(COMPENSATION_MIN_FCFA); // 50% = 500 → clamped to 1000
    expect(computeAmount(1500)).toBe(COMPENSATION_MIN_FCFA); // 50% = 750 → clamped to 1000
    expect(computeAmount(1999)).toBe(COMPENSATION_MIN_FCFA); // 50% = 999.5 → 1000 (rounded) → 1000
  });

  it("clamps to maximum (10000 FCFA)", () => {
    expect(computeAmount(20000)).toBe(10000); // 50% = 10000 → already at max
    expect(computeAmount(30000)).toBe(COMPENSATION_MAX_FCFA); // 50% = 15000 → clamped to 10000
    expect(computeAmount(100000)).toBe(COMPENSATION_MAX_FCFA); // 50% = 50000 → clamped to 10000
  });

  it("handles a typical Bus Go ticket (15000 FCFA)", () => {
    // 50% = 7500 → within [1000, 10000]
    expect(computeAmount(15000)).toBe(7500);
  });

  it("COMPENSATION_PERCENT is exactly 50%", () => {
    expect(COMPENSATION_PERCENT).toBe(0.5);
  });
});

// ──────────────────────────────────────────────────────────────
// 4. Constants compliance
// ──────────────────────────────────────────────────────────────

describe("Compensation — Constants compliance", () => {
  it("TTL is exactly 90 days", () => {
    expect(COMPENSATION_TTL_DAYS).toBe(90);
  });

  it("Max distance is exactly 2000m", () => {
    expect(ELIGIBILITY_MAX_DISTANCE_M).toBe(2000);
  });

  it("Max ETA is exactly 15 min", () => {
    expect(ELIGIBILITY_MAX_ETA_MIN).toBe(15);
  });

  it("Min amount is 1000 FCFA", () => {
    expect(COMPENSATION_MIN_FCFA).toBe(1000);
  });

  it("Max amount is 10000 FCFA", () => {
    expect(COMPENSATION_MAX_FCFA).toBe(10000);
  });
});
