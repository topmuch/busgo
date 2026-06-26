/**
 * Geo utility functions — client-side.
 * Pure functions, no side effects, no persistence.
 */

/**
 * Calculate the great-circle distance between two points
 * using the Haversine formula. Returns meters.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
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
 * Format distance in human-readable form.
 * - < 1000m → "123 m"
 * - >= 1000m → "1.2 km"
 */
export function formatDistance(meters: number | undefined): string {
  if (meters === undefined) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format ETA in human-readable form.
 * - 0 min → "à quai"
 * - 1-59 min → "5 min"
 * - >= 60 min → "1h 05"
 */
export function formatEta(minutes: number | undefined): string {
  if (minutes === undefined) return "? min";
  if (minutes <= 0) return "à quai";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

/**
 * Format "last seen" as relative time.
 * - < 60s → "il y a quelques secondes"
 * - < 60min → "il y a X min"
 * - >= 60min → "il y a Xh"
 */
export function formatLastSeen(isoString: string): string {
  const then = new Date(isoString).getTime();
  const now = Date.now();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `il y a ${hours}h`;
}

/**
 * Check if a timestamp is stale (older than threshold).
 */
export function isStale(timestamp: number, thresholdMs = 2 * 60 * 1000): boolean {
  return Date.now() - timestamp > thresholdMs;
}
