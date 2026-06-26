"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 *  LiveMapModal (Passenger)
 *  Modal plein écran avec carte interactive Leaflet + OpenStreetMap
 * ═══════════════════════════════════════════════════════════════
 *
 *  - Avatar passager (🧍) + Position Bus (🚌, si disponible)
 *  - ETA dynamique ("Arrivée estimée : 8 min")
 *  - Bouton d'arrêt manuel "Arrêter le partage"
 *  - Indicateur batterie si consommation élevée
 *  - Position approximative (réseau cellulaire) si accuracy > 500m
 */

import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { MapPin, Navigation, X, BatteryWarning, Signal, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistance, formatEta, formatLastSeen } from "@/lib/tracking/geo-utils";
import type { PassengerTrackingState } from "@/hooks/tracking/use-passenger-tracking";

// Lazy load Leaflet — it requires window which is unavailable during SSR
const LeafletMap = lazy(() => import("@/components/tracking/leaflet-map"));

interface LiveMapModalProps {
  open: boolean;
  onClose: () => void;
  state: PassengerTrackingState;
  onStop: () => void;
  passengerName?: string;
  busPosition?: { lat: number; lng: number };
  quayPosition?: { lat: number; lng: number; label?: string };
}

export function LiveMapModal({
  open,
  onClose,
  state,
  onStop,
  passengerName,
  busPosition,
  quayPosition,
}: LiveMapModalProps) {
  // ─── Permission denied / unavailable ─────────────────────────
  if (!open) return null;

  if (state.status === "denied") {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6">
        <MapPin className="h-14 w-14 text-muted-foreground/50 mb-4" />
        <h2 className="text-lg font-semibold text-center">
          Fonctionnalité indisponible sans GPS
        </h2>
        <p className="text-sm text-muted-foreground text-center mt-2 max-w-xs">
          {state.error ||
            "Votre navigateur ne permet pas de partager votre position. Vérifiez les autorisations."}
        </p>
        <Button className="mt-6" onClick={onClose}>
          Fermer
        </Button>
      </div>
    );
  }

  const isApproximate = state.isApproximate;
  const showHighAccuracy = state.isHighAccuracy;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute -inset-1 bg-orange-500/30 rounded-full animate-ping" />
            <div className="relative h-2.5 w-2.5 rounded-full bg-orange-500" />
          </div>
          <span className="text-sm font-semibold">
            Partage de position live
          </span>
          {showHighAccuracy && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Navigation className="h-3 w-3" />
              Haute précision
            </Badge>
          )}
          {isApproximate && (
            <Badge variant="outline" className="text-[10px] gap-1 text-amber-700 border-amber-400">
              <Signal className="h-3 w-3" />
              Approximative
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ─── Map ─── */}
      <div className="flex-1 relative">
        {state.currentCoord ? (
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <LeafletMap
              passengerCoord={state.currentCoord}
              busCoord={busPosition}
              quayCoord={quayPosition}
              passengerName={passengerName}
            />
          </Suspense>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center flex-col gap-3 p-6">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-sm text-muted-foreground">
              {state.status === "requesting"
                ? "Acquisition du signal GPS..."
                : "En attente de position..."}
            </p>
          </div>
        )}

        {/* Battery indicator */}
        {state.highBatteryUsage && (
          <div className="absolute top-3 right-3 z-[1000]">
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-sm">
              <BatteryWarning className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
                GPS intensif
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom info card ─── */}
      <div className="border-t bg-card p-4 space-y-3">
        {/* ETA + distance */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center text-lg">
              🧍
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {passengerName ?? "Votre position"}
              </p>
              <p className="text-sm font-semibold">
                Arrivée estimée : {formatEta(state.etaMinutes)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Distance</p>
            <p className="text-sm font-semibold">
              {formatDistance(state.distanceMeters)}
            </p>
          </div>
        </div>

        {/* Bus position (if available) */}
        {busPosition && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-base">🚌</span>
            <span>Position du bus disponible</span>
          </div>
        )}

        {/* Agent message */}
        {state.agentMessage && (
          <div
            className={`rounded-lg p-3 text-sm ${
              state.agentMessage.type === "wait"
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
            }`}
          >
            <p className="font-medium">
              {state.agentMessage.type === "wait" ? "✅ L'agent vous attend" : "❌ Le bus part"}
            </p>
            <p className="text-xs mt-0.5">{state.agentMessage.message}</p>
          </div>
        )}

        {/* Stop button */}
        <Button
          variant="destructive"
          className="w-full h-12 gap-2"
          onClick={onStop}
          disabled={state.status !== "active"}
        >
          <Square className="h-4 w-4 fill-current" />
          Arrêter le partage
        </Button>

        {/* Hint */}
        <p className="text-center text-[10px] text-muted-foreground">
          🔒 Aucune donnée de localisation n'est stockée. Partage éphémère, destruction auto à 45 min.
        </p>
      </div>
    </div>
  );
}
