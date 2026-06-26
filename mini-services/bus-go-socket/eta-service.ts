/**
 * ═══════════════════════════════════════════════════════════════
 *  ETA SERVICE — Server-side routing
 *  OSRM (open-source, free) with Haversine fallback
 * ═══════════════════════════════════════════════════════════════
 *
 *  Uses public OSRM demo server (router.project-osrm.org).
 *  In production, the team should self-host OSRM via Docker
 *  to avoid rate limits and HTTPS issues.
 *
 *  Cache TTL: 25s (per origin-destination pair)
 *  OSRM max refresh: every 30s per booking (enforced by caller)
 */

import { haversineMeters, haversineEtaMinutes, ETA_CACHE_TTL_MS } from "./tracking-store";

interface EtaResult {
  etaMinutes: number;
  distanceMeters: number;
  source: "osrm" | "haversine";
}

interface CacheEntry {
  etaMinutes: number;
  distanceMeters: number;
  source: "osrm" | "haversine";
  computedAt: number;
}

const etaCache = new Map<string, CacheEntry>();

function cacheKey(lat1: number, lng1: number, lat2: number, lng2: number): string {
  // Round to 4 decimals (~11m) to maximize cache hits
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return `${r(lat1)},${r(lng1)}→${r(lat2)},${r(lng2)}`;
}

/**
 * Try OSRM. If it fails (network, CORS, rate-limit), fallback to Haversine.
 */
async function tryOsrm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): Promise<EtaResult | null> {
  try {
    // OSRM expects: /route/v1/driving/{lng1},{lat1};{lng2},{lat2}
    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: Array<{ distance?: number; duration?: number }>;
    };
    if (!data?.routes?.[0]) return null;

    const route = data.routes[0];
    const distanceMeters: number = route.distance ?? 0;
    const durationSeconds: number = route.duration ?? 0;

    if (distanceMeters === 0) return null;

    // Convert OSRM duration to minutes (clamp to >= 1)
    const etaMinutes = Math.max(1, Math.round(durationSeconds / 60));

    return {
      etaMinutes,
      distanceMeters,
      source: "osrm",
    };
  } catch {
    return null; // network / CORS / timeout → fallback
  }
}

/**
 * Public API. Computes ETA for a coord pair.
 * Uses cache (25s) + OSRM (primary) + Haversine (fallback).
 */
export async function computeEta(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): Promise<EtaResult> {
  const key = cacheKey(lat1, lng1, lat2, lng2);

  // Cache hit?
  const cached = etaCache.get(key);
  if (cached && Date.now() - cached.computedAt < ETA_CACHE_TTL_MS) {
    return {
      etaMinutes: cached.etaMinutes,
      distanceMeters: cached.distanceMeters,
      source: cached.source,
    };
  }

  // Try OSRM first
  const osrm = await tryOsrm(lat1, lng1, lat2, lng2);
  if (osrm) {
    etaCache.set(key, { ...osrm, computedAt: Date.now() });
    return osrm;
  }

  // Fallback: Haversine
  const distanceMeters = haversineMeters(lat1, lng1, lat2, lng2);
  const etaMinutes = haversineEtaMinutes(distanceMeters);
  const result: EtaResult = {
    etaMinutes,
    distanceMeters,
    source: "haversine",
  };
  etaCache.set(key, { ...result, computedAt: Date.now() });
  return result;
}

/**
 * For unit tests — purge cache.
 */
export function _purgeEtaCacheForTests(): void {
  etaCache.clear();
}
