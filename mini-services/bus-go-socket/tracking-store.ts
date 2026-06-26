/**
 * ═══════════════════════════════════════════════════════════════
 *  GPS LIVE TRACKING — IN-MEMORY STORE (RAM ONLY, PRIVACY BY DESIGN)
 * ═══════════════════════════════════════════════════════════════
 *
 * ⚠️  CRITICAL PRIVACY CONTRACT
 * ───────────────────────────────────────────────────────────────
 *  • NO database writes (Prisma / SQL / NoSQL)
 *  • NO disk persistence (file / localStorage server-side)
 *  • NO logging of lat/lng coordinates
 *  • Auto-destroy after 45 min (fallback anti-leak)
 *  • Auto-destroy on status → BOARDING | COMPLETED | NO_SHOW
 *  • Channel name format: track_{booking_id}_{trip_id}
 *
 *  Audit log keeps ONLY metadata (bookingId, startedAt, stoppedAt,
 *  reason) — NEVER coordinates. This is the RGPD proof surface.
 * ═══════════════════════════════════════════════════════════════
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────

export interface TrackingRecord {
  bookingId: string;
  tripId: string;
  tenantId: string;
  clientId: string;
  clientName?: string;
  startedAt: number;          // epoch ms
  lastUpdateAt: number;       // epoch ms
  expiresAt: number;          // epoch ms (startedAt + 45 min)
  lastCoord?: {
    lat: number;
    lng: number;
    accuracy: number;         // meters
    timestamp: number;        // epoch ms from client
  };
  lastEtaMinutes?: number;
  lastDistanceMeters?: number;
  etaComputedAt?: number;
  isStatic?: boolean;         // true if no movement > 10 min
  staticWarningSentAt?: number;
}

export interface TrackingAuditEntry {
  bookingId: string;
  tripId: string;
  startedAt: number;
  stoppedAt: number;
  reason: "manual" | "boarding" | "completed" | "no_show" | "timeout_45min" | "disconnected" | "departed_reject";
  updatesCount: number;
}

// ──────────────────────────────────────────────────────────────
//  Constants
// ──────────────────────────────────────────────────────────────

export const TRACKING_TTL_MS = 45 * 60 * 1000;             // 45 minutes
export const STALE_THRESHOLD_MS = 2 * 60 * 1000;           // 2 minutes
export const STATIC_THRESHOLD_MS = 10 * 60 * 1000;         // 10 minutes
export const STATIC_MOVEMENT_THRESHOLD_M = 30;             // 30m movement = not static
export const ETA_REFRESH_INTERVAL_MS = 30 * 1000;          // 30 seconds
export const ETA_CACHE_TTL_MS = 25 * 1000;                 // 25s cache (avoid OSRM spam)

// Quai/bus position is set by the agent or admin for the trip.
// If not set, ETA is computed as straight-line Haversine + factor.
const DEFAULT_DRIVING_SPEED_KMH = 25; // urban bus average

// ──────────────────────────────────────────────────────────────
//  In-memory store (RAM ONLY)
// ──────────────────────────────────────────────────────────────

const store = new Map<string, TrackingRecord>();              // key: bookingId
const tripIndex = new Map<string, Set<string>>();             // tripId → Set<bookingId>
const auditLog: TrackingAuditEntry[] = [];                   // RGPD audit (meta only)

// ──────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────

export function trackingChannelName(bookingId: string, tripId: string): string {
  return `track_${bookingId}_${tripId}`;
}

export function getTracking(bookingId: string): TrackingRecord | undefined {
  return store.get(bookingId);
}

export function getAllTrackingForTrip(tripId: string): TrackingRecord[] {
  const bookingIds = tripIndex.get(tripId);
  if (!bookingIds) return [];
  const out: TrackingRecord[] = [];
  for (const id of bookingIds) {
    const rec = store.get(id);
    if (rec) out.push(rec);
  }
  return out;
}

export function getAllTrackingForTenant(tenantId: string): TrackingRecord[] {
  const out: TrackingRecord[] = [];
  for (const rec of store.values()) {
    if (rec.tenantId === tenantId) out.push(rec);
  }
  return out;
}

export function getAuditLog(): ReadonlyArray<TrackingAuditEntry> {
  return auditLog;
}

// ──────────────────────────────────────────────────────────────
//  Validation middleware: booking_id belongs to trip_id
// ──────────────────────────────────────────────────────────────

export async function validateBookingTrip(
  bookingId: string,
  tripId: string
): Promise<{ ok: boolean; reason?: string; record?: { clientId: string; tenantId: string; status: string; clientName?: string; tripStatus?: string } }> {
  try {
    const billet = await db.billet.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        trajetId: true,
        clientId: true,
        status: true,
        client: { select: { name: true, tenantId: true } },
        trajet: { select: { status: true, tenantId: true } },
      },
    });

    if (!billet) return { ok: false, reason: "billet_not_found" };
    if (billet.trajetId !== tripId) return { ok: false, reason: "trip_mismatch" };

    // Reject if trip is already DEPARTED — silent reject per spec
    if (billet.trajet.status === "departed" || billet.trajet.status === "arrived") {
      return { ok: false, reason: "trip_departed", record: {
        clientId: billet.clientId,
        tenantId: billet.trajet.tenantId,
        status: billet.status,
        clientName: billet.client.name ?? undefined,
        tripStatus: billet.trajet.status,
      }};
    }

    return {
      ok: true,
      record: {
        clientId: billet.clientId,
        tenantId: billet.trajet.tenantId,
        status: billet.status,
        clientName: billet.client.name ?? undefined,
        tripStatus: billet.trajet.status,
      },
    };
  } catch (err) {
    console.error("[TRACKING_VALIDATE_ERROR]", err);
    return { ok: false, reason: "db_error" };
  }
}

// ──────────────────────────────────────────────────────────────
//  Start / Stop tracking
// ──────────────────────────────────────────────────────────────

export function startTracking(
  bookingId: string,
  tripId: string,
  tenantId: string,
  clientId: string,
  clientName?: string
): TrackingRecord {
  const now = Date.now();
  const rec: TrackingRecord = {
    bookingId,
    tripId,
    tenantId,
    clientId,
    clientName,
    startedAt: now,
    lastUpdateAt: now,
    expiresAt: now + TRACKING_TTL_MS,
  };
  store.set(bookingId, rec);

  // Update trip index
  let set = tripIndex.get(tripId);
  if (!set) {
    set = new Set();
    tripIndex.set(tripId, set);
  }
  set.add(bookingId);

  return rec;
}

export function stopTracking(
  bookingId: string,
  reason: TrackingAuditEntry["reason"]
): TrackingRecord | undefined {
  const rec = store.get(bookingId);
  if (!rec) return undefined;

  // Push to audit log (metadata only — NO coords)
  auditLog.push({
    bookingId: rec.bookingId,
    tripId: rec.tripId,
    startedAt: rec.startedAt,
    stoppedAt: Date.now(),
    reason,
    updatesCount: 0, // updated by caller if available
  });

  // Trim audit log to last 1000 entries (memory hygiene)
  if (auditLog.length > 1000) auditLog.splice(0, auditLog.length - 1000);

  // Remove from indexes
  store.delete(bookingId);
  const tripSet = tripIndex.get(rec.tripId);
  if (tripSet) {
    tripSet.delete(bookingId);
    if (tripSet.size === 0) tripIndex.delete(rec.tripId);
  }

  return rec;
}

// ──────────────────────────────────────────────────────────────
//  Update GPS coord (RAM only)
// ──────────────────────────────────────────────────────────────

export function updateCoord(
  bookingId: string,
  coord: { lat: number; lng: number; accuracy: number; timestamp: number }
): TrackingRecord | undefined {
  const rec = store.get(bookingId);
  if (!rec) return undefined;

  const now = Date.now();

  // Static detection: compare with previous coord
  if (rec.lastCoord) {
    const moved = haversineMeters(
      rec.lastCoord.lat, rec.lastCoord.lng,
      coord.lat, coord.lng
    );
    const timeSinceStart = now - rec.startedAt;
    if (moved < STATIC_MOVEMENT_THRESHOLD_M && timeSinceStart > STATIC_THRESHOLD_MS) {
      rec.isStatic = true;
    } else if (moved >= STATIC_MOVEMENT_THRESHOLD_M) {
      rec.isStatic = false;
      rec.staticWarningSentAt = undefined;
    }
  }

  rec.lastCoord = coord;
  rec.lastUpdateAt = now;

  return rec;
}

export function setEta(
  bookingId: string,
  etaMinutes: number,
  distanceMeters: number
): TrackingRecord | undefined {
  const rec = store.get(bookingId);
  if (!rec) return undefined;
  rec.lastEtaMinutes = etaMinutes;
  rec.lastDistanceMeters = distanceMeters;
  rec.etaComputedAt = Date.now();
  return rec;
}

// ──────────────────────────────────────────────────────────────
//  TTL sweeper — auto-expire stale records (fallback anti-leak)
// ──────────────────────────────────────────────────────────────

let sweeperHandle: ReturnType<typeof setInterval> | null = null;

export function startTtlSweeper(
  onExpire: (rec: TrackingRecord) => void
): void {
  if (sweeperHandle) return;
  sweeperHandle = setInterval(() => {
    const now = Date.now();
    for (const [bookingId, rec] of store.entries()) {
      if (now >= rec.expiresAt) {
        stopTracking(bookingId, "timeout_45min");
        onExpire(rec);
      }
    }
  }, 60 * 1000); // every minute
}

export function stopTtlSweeper(): void {
  if (sweeperHandle) {
    clearInterval(sweeperHandle);
    sweeperHandle = null;
  }
}

// ──────────────────────────────────────────────────────────────
//  Geo helpers
// ──────────────────────────────────────────────────────────────

export function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fallback ETA using Haversine distance + average driving speed.
 * Used when OSRM is unavailable or for low-accuracy positions.
 */
export function haversineEtaMinutes(distanceMeters: number): number {
  const km = distanceMeters / 1000;
  const hours = km / DEFAULT_DRIVING_SPEED_KMH;
  return Math.max(1, Math.round(hours * 60));
}

/**
 * Determine if high-accuracy GPS should be enabled (< 500m to quay).
 */
export function shouldUseHighAccuracy(distanceMeters: number | undefined): boolean {
  if (distanceMeters === undefined) return false;
  return distanceMeters < 500;
}

/**
 * Check if a tracking record's last coord is stale (> 2 min).
 */
export function isStale(rec: TrackingRecord): boolean {
  return Date.now() - rec.lastUpdateAt > STALE_THRESHOLD_MS;
}

/**
 * Get all active bookings currently sharing position for a tenant,
 * filtered to those with at least 1 update in the last 5 min.
 */
export function getActiveSharersForTenant(tenantId: string): TrackingRecord[] {
  const out: TrackingRecord[] = [];
  const now = Date.now();
  for (const rec of store.values()) {
    if (rec.tenantId !== tenantId) continue;
    if (now - rec.lastUpdateAt > 5 * 60 * 1000) continue;
    out.push(rec);
  }
  return out;
}
