"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bus,
  ScanLine,
  Play,
  Rocket,
  Loader2,
  Users,
  UserX,
  MapPin,
} from "lucide-react";
import { SeatMap, BilletType } from "@/components/agent/seat-map";
import { QRScanner } from "@/components/agent/qr-scanner";
import { MissingPassengerModal } from "@/components/agent/missing-passenger-modal";
import { DepartureTimer } from "@/components/agent/departure-timer";
import {
  RetardNotifications,
  RetardNotification,
} from "@/components/agent/retard-notifications";
import { VocalSettingsPanel } from "@/components/agent/vocal-settings-panel";
import { useBusGoSocket } from "@/hooks/use-bus-go-socket";
import { useVocalAlerts } from "@/hooks/use-vocal-alerts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface trajetBus {
  id: string;
  number: string;
  capacity: number;
}

interface trajetType {
  id: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  price: number;
  status: string;
  bus: trajetBus;
  billets: BilletType[];
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function EmbarquementPage() {
  const params = useParams<{ trajetId: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const trajetId = params.trajetId;

  /* ---------- state ---------- */
  const [trajet, setTrajet] = useState<trajetType | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedBillet, setSelectedBillet] = useState<BilletType | null>(null);
  const [retardNotifs, setRetardNotifs] = useState<RetardNotification[]>([]);
  const [departDialogOpen, setDepartDialogOpen] = useState(false);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- socket ---------- */
  const {
    isConnected,
    joinTrajet,
    socketRef,
    driverRetards,
    billetScans,
    trajetStatuses,
  } = useBusGoSocket(session?.user?.tenantId);

  /* ---------- vocal alerts ---------- */
  const vocal = useVocalAlerts(socketRef);

  /* ================================================================ */
  /*  Fetch trajet                                                     */
  /* ================================================================ */

  const fetchTrajet = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/agent/trajets/${trajetId}?XTransformPort=3000`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erreur lors du chargement du trajet");
        return;
      }
      const data = await res.json();
      setTrajet(data);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [trajetId]);

  /* ---------- initial load ---------- */
  useEffect(() => {
    fetchTrajet();
  }, [fetchTrajet]);

  /* ---------- join socket room ---------- */
  useEffect(() => {
    if (trajetId) joinTrajet(trajetId);
  }, [trajetId, joinTrajet]);

  /* ================================================================ */
  /*  Socket-based state updates (via hook state)                      */
  /* ================================================================ */

  // Sync driver retards from hook state
  useEffect(() => {
    const relevant = driverRetards
      .filter((r) => r.trajetId === trajetId)
      .map((r, i) => ({
        ...r,
        id: `retard-${i}-${r.timestamp}`,
        clientName: r.clientName || "Passager",
        message: r.message || `Arrive dans ${r.minutes} min`,
      }));
    if (relevant.length > retardNotifs.length) {
      const newOnes = relevant.slice(retardNotifs.length);
      newOnes.forEach((n) => {
        toast.info(`${n.clientName} arrive dans ${n.minutes} min`, {
          description: n.message || undefined,
        });
      });
      setRetardNotifs(relevant);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverRetards, trajetId]);

  // Sync billet scan updates from hook state
  useEffect(() => {
    const relevant = billetScans.filter((s) => s.trajetId === trajetId);
    if (relevant.length === 0) return;

    const latestScan = relevant[relevant.length - 1];
    setTrajet((prev) => {
      if (!prev) return prev;
      const already = prev.billets.find((b) => b.id === latestScan.billetId);
      if (already && already.status === latestScan.status) return prev;
      return {
        ...prev,
        billets: prev.billets.map((b) =>
          b.id === latestScan.billetId ? { ...b, status: latestScan.status } : b
        ),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billetScans.length, trajetId]);

  // Sync trajet status updates from hook state
  useEffect(() => {
    const relevant = trajetStatuses.filter((t) => t.trajetId === trajetId);
    if (relevant.length === 0) return;

    const latest = relevant[relevant.length - 1];
    setTrajet((prev) => {
      if (!prev || prev.status === latest.status) return prev;
      return { ...prev, status: latest.status };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trajetStatuses.length, trajetId]);

  /* ================================================================ */
  /*  Computed values                                                  */
  /* ================================================================ */

  const boardedCount = trajet?.billets.filter((b) => b.status === "boarded").length ?? 0;
  const absentCount = trajet?.billets.filter((b) => b.status === "absent").length ?? 0;
  const cancelledCount = trajet?.billets.filter((b) => b.status === "cancelled").length ?? 0;
  const totalBillets = trajet?.billets.length ?? 0;
  const capacity = trajet?.bus.capacity ?? 0;
  const boardingProgress = totalBillets > 0 ? (boardedCount / totalBillets) * 100 : 0;

  const statusLabel: Record<string, string> = {
    scheduled: "Planifié",
    boarding: "Embarquement en cours",
    departed: "En route",
    arrived: "Arrivé",
    cancelled: "Annulé",
  };

  /* ================================================================ */
  /*  Handlers                                                         */
  /* ================================================================ */

  /* --- QR Scan success --- */
  const handleScanSuccess = useCallback(
    (data: {
      id: string;
      seatNumber: number;
      clientName: string;
      ticketNumber: string;
    }) => {
      toast.success("Billet embarqué !", {
        description: data.clientName
          ? `${data.clientName} — Siège ${data.seatNumber}`
          : `Siège ${data.seatNumber || "N/A"}`,
      });
      // Re-fetch to get updated state (handles QRScanner/API data mismatch)
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(fetchTrajet, 500);
    },
    [fetchTrajet]
  );

  /* --- QR Scan error --- */
  const handleScanError = useCallback((message: string) => {
    toast.error("Scan échoué", { description: message });
  }, []);

  /* --- Seat click (sold seat → missing passenger modal) --- */
  const handleSeatClick = useCallback((billet: BilletType) => {
    setSelectedBillet(billet);
  }, []);

  /* --- Mark absent --- */
  const handleMarkAbsent = useCallback(
    async (billetId: string) => {
      try {
        const res = await fetch(
          `/api/agent/billets/${billetId}/status?XTransformPort=3000`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "absent" }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || "Erreur lors du changement de statut");
          return;
        }
        // Update local state optimistically
        setTrajet((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            billets: prev.billets.map((b) =>
              b.id === billetId ? { ...b, status: "absent" as const } : b
            ),
          };
        });
        toast.success("Passager marqué absent");
      } catch {
        toast.error("Erreur réseau");
      }
    },
    []
  );

  /* --- Mark arriving (from missing passenger modal) --- */
  const handleMarkArriving = useCallback(
    (billetId: string, _minutes: number) => {
      // Show a local timer in the modal (handled by the modal component)
      // For now, keep the seat as "sold" — the agent will mark absent later if needed
      toast.info("Timer démarré", {
        description: `Le passager a ${_minutes} minutes pour arriver.`,
      });
    },
    []
  );

  /* --- Start boarding --- */
  const handleStartBoarding = useCallback(async () => {
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/agent/trajets/${trajetId}/depart?XTransformPort=3000`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start-boarding" }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erreur lors du démarrage");
        return;
      }
      setTrajet((prev) => (prev ? { ...prev, status: "boarding" } : prev));
      toast.success("Embarquement démarré !");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setActionLoading(false);
    }
  }, [trajetId]);

  /* --- Confirm depart --- */
  const handleConfirmDepart = useCallback(async () => {
    setActionLoading(true);
    setDepartDialogOpen(false);
    try {
      const res = await fetch(
        `/api/agent/trajets/${trajetId}/depart?XTransformPort=3000`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "depart" }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erreur lors du départ");
        return;
      }
      setTrajet((prev) => (prev ? { ...prev, status: "departed" } : prev));
      toast.success("Départ enregistré !");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setActionLoading(false);
    }
  }, [trajetId]);

  /* --- Retard reply --- */
  const handleRetardReply = useCallback(
    (clientId: string, reply: string) => {
      // Send reply via socket or API
      if (socketRef.current) {
        socketRef.current.emit("agent-reply", {
          trajetId,
          clientId,
          message: reply,
        });
      }
      toast.success("Réponse envoyée");
    },
    [trajetId, socketRef]
  );

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  if (loading) {
    return <EmbarquementSkeleton />;
  }

  if (!trajet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <Bus className="size-12 text-muted-foreground/40" />
        <p className="text-lg font-semibold">Trajet introuvable</p>
        <p className="text-sm text-muted-foreground text-center">
          Ce trajet n&apos;existe pas ou vous n&apos;avez pas accès.
        </p>
        <Button variant="outline" onClick={() => router.push("/agent")}>
          <ArrowLeft className="size-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }

  const isScheduled = trajet.status === "scheduled";
  const isBoarding = trajet.status === "boarding";
  const isDeparted = trajet.status === "departed";

  return (
    <div className="relative flex flex-col min-h-[calc(100dvh-3.5rem)] pb-28">
      {/* ============ Header ============ */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Back button */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => router.push("/agent")}
            aria-label="Retour"
          >
            <ArrowLeft className="size-5" />
          </Button>

          <div className="flex-1 min-w-0">
            {/* Route */}
            <div className="flex items-center gap-1.5 text-sm font-semibold truncate">
              <MapPin className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">{trajet.origin}</span>
              <span className="text-muted-foreground mx-0.5">→</span>
              <span className="truncate">{trajet.destination}</span>
            </div>

            {/* Bus info */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Bus className="size-3" />
                Bus {trajet.bus.number}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {capacity} places
              </span>
              {/* Vocal Settings — in header for quick access */}
              <VocalSettingsPanel
                config={vocal.config}
                ttsAvailable={vocal.ttsAvailable}
                isSpeaking={vocal.isSpeaking}
                availableVoices={vocal.availableVoices}
                onUpdateConfig={vocal.updateConfig}
                onToggleAlert={vocal.toggleAlert}
                onTestAlert={vocal.testAlert}
                onStopSpeaking={vocal.stopSpeaking}
                onInitForceSound={vocal.initForceSound}
              />
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 shrink-0"
              >
                {statusLabel[trajet.status] || trajet.status}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* ============ Departure Timer ============ */}
      <div className="px-4 pt-3">
        <DepartureTimer
          departureTime={trajet.time}
          date={trajet.date}
        />
      </div>

      {/* ============ Stats Bar ============ */}
      <div className="px-4 pt-3">
        <Card className="py-3">
          <CardContent className="px-4 space-y-2.5">
            {/* Stats numbers */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 font-semibold">
                <Users className="size-4 text-[#22c55e]" />
                <span>
                  {boardedCount}/{totalBillets} embarqués
                </span>
              </div>
              {absentCount > 0 && (
                <div className="flex items-center gap-1 text-[#ef4444] text-xs font-medium">
                  <UserX className="size-3.5" />
                  <span>{absentCount} abs.</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <Progress value={boardingProgress} className="h-2.5" />

            {/* Additional info row */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{Math.round(boardingProgress)}% complété</span>
              <span>
                {totalBillets - boardedCount - absentCount - cancelledCount}{" "}
                restant{totalBillets - boardedCount - absentCount - cancelledCount > 1 ? "s" : ""}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============ Seat Map ============ */}
      <div className="flex-1 px-4 pt-4 overflow-y-auto">
        <SeatMap
          capacity={capacity}
          billets={trajet.billets}
          onSeatClick={handleSeatClick}
          className="mx-auto"
        />
      </div>

      {/* ============ Action Button (Start Boarding / Depart) ============ */}
      {!isDeparted && (
        <div className="px-4 pt-2">
          {isScheduled && (
            <Button
              className="w-full h-12 text-base font-semibold gap-2 bg-primary hover:bg-primary/90"
              onClick={handleStartBoarding}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Play className="size-5" />
              )}
              Démarrer l&apos;embarquement
            </Button>
          )}

          {isBoarding && (
            <Button
              className="w-full h-12 text-base font-semibold gap-2 bg-[#22c55e] hover:bg-[#22c55e]/90 text-white"
              onClick={() => setDepartDialogOpen(true)}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Rocket className="size-5" />
              )}
              Démarrer le départ
            </Button>
          )}
        </div>
      )}

      {isDeparted && (
        <div className="px-4 pt-2">
          <Button
            className="w-full h-12 text-base font-semibold gap-2"
            variant="outline"
            disabled
          >
            <Rocket className="size-5" />
            En route
          </Button>
        </div>
      )}

      {/* ============ Fixed Bottom QR Scan Button ============ */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
        <Button
          size="lg"
          className="w-full h-14 text-base font-bold gap-2.5 bg-[#22c55e] hover:bg-[#22c55e]/90 text-white shadow-lg shadow-[#22c55e]/25 rounded-xl active:scale-[0.98] transition-transform"
          onClick={() => setScannerOpen(true)}
          disabled={isDeparted}
        >
          <ScanLine className="size-5" />
          SCANNER QR CODE
        </Button>
      </div>

      {/* ============ QR Scanner Dialog ============ */}
      <QRScanner
        trajetId={trajetId}
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
      />

      {/* ============ Missing Passenger Modal ============ */}
      <MissingPassengerModal
        billet={selectedBillet}
        isOpen={selectedBillet !== null}
        onClose={() => setSelectedBillet(null)}
        onMarkAbsent={handleMarkAbsent}
        onMarkArriving={handleMarkArriving}
      />

      {/* ============ Depart Confirmation Dialog ============ */}
      <AlertDialog open={departDialogOpen} onOpenChange={setDepartDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le départ ?</AlertDialogTitle>
            <AlertDialogDescription>
              {boardedCount < totalBillets && (
                <span className="text-[#ef4444] font-medium">
                  ⚠️ {totalBillets - boardedCount - absentCount - cancelledCount}{" "}
                  passager
                  {totalBillets - boardedCount - absentCount - cancelledCount > 1
                    ? "s"
                    : ""}{" "}
                  n&apos;ont pas embarqué.
                  <br />
                </span>
              )}
              Êtes-vous sûr de vouloir démarrer le départ pour le trajet{" "}
              <strong>
                {trajet.origin} → {trajet.destination}
              </strong>{" "}
              ({boardedCount}/{totalBillets} embarqués) ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDepart}
              className="bg-[#22c55e] hover:bg-[#22c55e]/90 text-white"
            >
              Confirmer le départ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============ Retard Notifications Panel ============ */}
      <RetardNotifications
        notifications={retardNotifs}
        onReply={handleRetardReply}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton loader                                                    */
/* ------------------------------------------------------------------ */

function EmbarquementSkeleton() {
  return (
    <div className="flex flex-col min-h-[calc(100dvh-3.5rem)] pb-28">
      {/* Header skeleton */}
      <header className="sticky top-0 z-30 border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </header>

      {/* Timer skeleton */}
      <div className="px-4 pt-3">
        <Skeleton className="h-9 w-48 rounded-full" />
      </div>

      {/* Stats skeleton */}
      <div className="px-4 pt-3">
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>

      {/* Seat map skeleton */}
      <div className="flex-1 flex items-center justify-center px-4 pt-6">
        <div className="w-full max-w-xs space-y-2">
          <Skeleton className="h-52 w-full rounded-[2rem]" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>

      {/* Action button skeleton */}
      <div className="px-4 pt-2">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>

      {/* Fixed bottom scan skeleton */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  );
}
