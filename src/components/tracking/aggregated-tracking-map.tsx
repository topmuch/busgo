"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 *  AggregatedTrackingMap (Agent)
 *  Vue carte agrégée pour 3+ passagers partageant leur position
 * ═══════════════════════════════════════════════════════════════
 */

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Users, X, Loader2, AlertTriangle } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatEta, formatLastSeen } from "@/lib/tracking/geo-utils";
import type { PassengerLocation } from "@/hooks/tracking/use-agent-tracking";

interface AggregatedTrackingMapProps {
  open: boolean;
  onClose: () => void;
  locations: PassengerLocation[];
  quayPosition?: { lat: number; lng: number; label?: string };
  onSelectPassenger?: (bookingId: string) => void;
}

export function AggregatedTrackingMap({
  open,
  onClose,
  locations,
  quayPosition,
  onSelectPassenger,
}: AggregatedTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Init map
  useEffect(() => {
    if (!open || !containerRef.current || mapRef.current) return;

    const center = quayPosition
      ? [quayPosition.lat, quayPosition.lng]
      : locations[0]
        ? [locations[0].lat, locations[0].lng]
        : [0, 0];

    const map = L.map(containerRef.current, { zoomControl: true }).setView(
      center as [number, number],
      14
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Quay marker
    if (quayPosition) {
      const quayIcon = L.divIcon({
        className: "quay-marker",
        html: `<div style="font-size: 32px;">📍</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      L.marker([quayPosition.lat, quayPosition.lng], { icon: quayIcon })
        .addTo(map)
        .bindPopup(`<strong>Quai</strong>${quayPosition.label ? `<br/>${quayPosition.label}` : ""}`);
    }

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, [open]);

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove stale markers (no longer in locations)
    for (const [id, marker] of markersRef.current.entries()) {
      if (!locations.find((l) => l.bookingId === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    // Add or update markers
    const bounds: [number, number][] = [];
    for (const loc of locations) {
      if (loc.lat === 0 && loc.lng === 0) continue;
      bounds.push([loc.lat, loc.lng]);

      const color = loc.isStatic
        ? "#EF4444"
        : loc.isStale
          ? "#9CA3AF"
          : "#F97316";

      const icon = L.divIcon({
        className: "passenger-marker",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="
              background: ${color};
              color: white;
              border-radius: 9999px;
              padding: 4px 8px;
              font-size: 10px;
              font-weight: 600;
              white-space: nowrap;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              ${!loc.isStale && !loc.isStatic ? "animation: pulse 2s infinite;" : ""}
            ">
              ${loc.isStale ? "? min" : loc.isStatic ? "Immobile" : formatEta(loc.etaMinutes)}
            </div>
            <div style="font-size: 24px; margin-top: -2px;">🧍</div>
          </div>
        `,
        iconSize: [40, 50],
        iconAnchor: [20, 45],
      });

      const existing = markersRef.current.get(loc.bookingId);
      if (existing) {
        existing.setLatLng([loc.lat, loc.lng]);
        existing.setIcon(icon);
      } else {
        const marker = L.marker([loc.lat, loc.lng], { icon })
          .addTo(mapRef.current)
          .bindPopup(
            `<strong>${loc.clientName ?? "Passager"}</strong><br/>` +
              `ETA: ${formatEta(loc.etaMinutes)}<br/>` +
              `Dernière MAJ: ${formatLastSeen(loc.last_seen)}` +
              (loc.isStatic ? "<br/><em>⚠️ Immobile</em>" : "")
          );
        if (onSelectPassenger) {
          marker.on("click", () => onSelectPassenger(loc.bookingId));
        }
        markersRef.current.set(loc.bookingId, marker);
      }
    }

    // Fit bounds if we have multiple points
    if (bounds.length > 1 && mapRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, onSelectPassenger]);

  const sortedLocations = useMemo(
    () =>
      [...locations].sort((a, b) => {
        // Stale at the end, then sort by ETA asc
        if (a.isStale !== b.isStale) return a.isStale ? 1 : -1;
        const aEta = a.etaMinutes ?? 999;
        const bEta = b.etaMinutes ?? 999;
        return aEta - bEta;
      }),
    [locations]
  );

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 max-h-[90vh]">
        <DialogTitle className="sr-only">Vue agrégée des retards</DialogTitle>
        <DialogDescription className="sr-only">
          Carte montrant tous les passagers partageant leur position en temps réel
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold">
              {locations.length} passagers en retard
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col md:flex-row max-h-[80vh]">
          {/* Map */}
          <div className="flex-1 h-72 md:h-[60vh] relative bg-muted">
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <div ref={containerRef} className="w-full h-full" />
            </Suspense>
          </div>

          {/* List */}
          <div className="md:w-72 border-t md:border-t-0 md:border-l overflow-y-auto max-h-72 md:max-h-[60vh]">
            {sortedLocations.map((loc, idx) => (
              <button
                key={loc.bookingId}
                onClick={() => onSelectPassenger?.(loc.bookingId)}
                className={`w-full text-left px-3 py-2 border-b hover:bg-muted/50 transition-colors flex items-center gap-2 ${
                  loc.isStatic ? "bg-red-50 dark:bg-red-950/20" : ""
                }`}
              >
                <span className="text-xs text-muted-foreground w-4">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {loc.clientName ?? "Passager"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatLastSeen(loc.last_seen)}
                  </p>
                </div>
                {loc.isStatic ? (
                  <Badge variant="outline" className="text-[10px] text-red-700 border-red-400 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Immobile
                  </Badge>
                ) : loc.isStale ? (
                  <Badge variant="outline" className="text-[10px] text-gray-600 border-gray-400">
                    ? min
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-orange-700 border-orange-400 bg-orange-50 dark:bg-orange-950/30"
                  >
                    {formatEta(loc.etaMinutes)}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
