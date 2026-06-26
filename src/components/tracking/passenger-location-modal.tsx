"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 *  PassengerLocationModal (Agent)
 *  Modal overlay (semi-transparent) avec mini-carte + actions rapides
 * ═══════════════════════════════════════════════════════════════
 */

import { lazy, Suspense, useCallback, useState } from "react";
import {
  X,
  MapPin,
  Clock,
  Navigation,
  Check,
  XCircle,
  AlertTriangle,
  Loader2,
  Signal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  formatDistance,
  formatEta,
  formatLastSeen,
} from "@/lib/tracking/geo-utils";
import type { PassengerLocation } from "@/hooks/tracking/use-agent-tracking";

const LeafletMap = lazy(() => import("@/components/tracking/leaflet-map"));

interface PassengerLocationModalProps {
  location: PassengerLocation | null;
  open: boolean;
  onClose: () => void;
  onWait: (bookingId: string) => void;
  onLeave: (bookingId: string) => void;
  quayPosition?: { lat: number; lng: number; label?: string };
}

export function PassengerLocationModal({
  location,
  open,
  onClose,
  onWait,
  onLeave,
  quayPosition,
}: PassengerLocationModalProps) {
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [waitDialogOpen, setWaitDialogOpen] = useState(false);

  // Wrap onClose to also reset internal dialog state
  const handleClose = useCallback(() => {
    setLeaveDialogOpen(false);
    setWaitDialogOpen(false);
    onClose();
  }, [onClose]);

  if (!location) return null;

  const isApproximate = (location.accuracy ?? 0) > 500;
  const isStale = location.isStale;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
          <DialogTitle className="sr-only">
            Position de {location.clientName ?? "passager"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Carte interactive montrant la position en temps réel du passager
          </DialogDescription>

          {/* ─── Header ─── */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center text-sm shrink-0">
                🧍
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {location.clientName ?? "Passager"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Dernière MAJ {formatLastSeen(location.last_seen)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {isStale ? (
                <Badge variant="outline" className="text-[10px] text-gray-600 border-gray-400">
                  En attente
                </Badge>
              ) : isApproximate ? (
                <Badge variant="outline" className="text-[10px] gap-1 text-amber-700 border-amber-400">
                  <Signal className="h-3 w-3" />
                  Approx.
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] gap-1 text-emerald-700 border-emerald-400">
                  <Navigation className="h-3 w-3" />
                  Live
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ─── Static warning ─── */}
          {location.isStatic && (
            <div className="bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 px-4 py-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-xs text-red-800 dark:text-red-200">
                Passager immobile depuis +10 min. Risque d&apos;abandon.
              </p>
            </div>
          )}

          {/* ─── Map ─── */}
          <div className="h-64 relative bg-muted">
            {location.lat !== 0 && location.lng !== 0 ? (
              <Suspense
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <LeafletMap
                  passengerCoord={{
                    lat: location.lat,
                    lng: location.lng,
                    accuracy: location.accuracy,
                    timestamp: new Date(location.last_seen).getTime(),
                  }}
                  quayCoord={quayPosition}
                  passengerName={location.clientName}
                  centerOn="passenger"
                />
              </Suspense>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center flex-col gap-2 p-4">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                <p className="text-xs text-muted-foreground text-center">
                  En attente de la première position...
                </p>
              </div>
            )}
          </div>

          {/* ─── Info row ─── */}
          <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b bg-card">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                ETA
              </p>
              <p className="text-sm font-semibold">
                {isStale ? "—" : formatEta(location.etaMinutes)}
              </p>
            </div>
            <div className="text-center border-x">
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" />
                Distance
              </p>
              <p className="text-sm font-semibold">
                {isStale ? "—" : formatDistance(location.distanceMeters)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Navigation className="h-3 w-3" />
                Précision
              </p>
              <p className="text-sm font-semibold">
                {Math.round(location.accuracy)} m
              </p>
            </div>
          </div>

          {/* ─── Actions ─── */}
          <div className="p-4 space-y-2">
            <Button
              className="w-full h-11 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setWaitDialogOpen(true)}
              disabled={isStale}
            >
              <Check className="h-4 w-4" />
              Je vous attends
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 gap-2 text-red-700 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => setLeaveDialogOpen(true)}
            >
              <XCircle className="h-4 w-4" />
              Le bus part
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wait confirmation */}
      <AlertDialog open={waitDialogOpen} onOpenChange={setWaitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l&apos;attente ?</AlertDialogTitle>
            <AlertDialogDescription>
              Une notification push sera envoyée à{" "}
              <strong>{location.clientName ?? "ce passager"}</strong> :
              «&nbsp;L&apos;agent confirme qu&apos;il vous attend. Dépêchez-vous !&nbsp;»
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                onWait(location.bookingId);
                setWaitDialogOpen(false);
                handleClose();
              }}
            >
              Envoyer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave confirmation */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">
              Confirmer le départ du bus ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Une notification sera envoyée à{" "}
              <strong>{location.clientName ?? "ce passager"}</strong> :
              «&nbsp;Désolé, le bus ne peut plus attendre. Votre billet est annulé.&nbsp;»
              <br />
              <br />
              <span className="text-red-700 font-medium">
                Le billet sera marqué NO_SHOW et le partage arrêté.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                onLeave(location.bookingId);
                setLeaveDialogOpen(false);
                handleClose();
              }}
            >
              Confirmer le départ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
