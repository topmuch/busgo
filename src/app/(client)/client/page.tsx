"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  MapPin,
  Clock,
  Phone,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Download,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Loader2,
  X,
  Send,
  History,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { usePWA } from "@/lib/pwa/use-pwa";
import { useVoiceNotifications } from "@/lib/pwa/use-voice-notifications";
import { useBusGoSocket } from "@/hooks/use-bus-go-socket";
import { usePassengerTracking } from "@/hooks/tracking/use-passenger-tracking";
import { LiveMapModal } from "@/components/tracking/live-map-modal";
import { Navigation, BatteryWarning, Gift } from "lucide-react";
import { useCompensations } from "@/hooks/modules/use-compensations";
import { VoucherCard } from "@/components/compensation/voucher-card";
import { SponsoredBannerList } from "@/components/sponsor/sponsored-banner-list";
import { usePushNotifications } from "@/hooks/notifications/use-push-notifications";

// ── Types ──
interface TrajetInfo {
  id: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  price: number;
  status: string;
  bus: {
    id: string;
    number: string;
    capacity: number;
    driver: { id: string; name: string; phone: string } | null;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

interface BilletData {
  id: string;
  ticketNumber: string;
  qrCode: string;
  seatNumber: number;
  status: string;
  trajet: TrajetInfo;
}

interface ClientData {
  activeBillet: BilletData | null;
  upcomingBillets: BilletData[];
  pastBillets: BilletData[];
  voiceConfig: { introText: string; language: string } | null;
}

// ── QR Code Display Component ──
function PassengerQR({
  qrCode,
  ticketNumber,
  seatNumber,
  destination,
  date,
  time,
  busNumber,
  driverName,
  driverPhone,
  tenantId,
  trajetId,
  clientId,
  introText,
  onRetard,
}: {
  qrCode: string;
  ticketNumber: string;
  seatNumber: number;
  destination: string;
  date: string;
  time: string;
  busNumber: string;
  driverName: string | null;
  driverPhone: string | null;
  tenantId: string;
  trajetId: string;
  clientId: string;
  introText?: string | null;
  onRetard: (minutes: number, message?: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !qrCode) return;
    import("qrcode").then((QRCode) => {
      QRCode.default.toCanvas(canvasRef.current, qrCode, {
        width: 280,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "H",
      });
    });
  }, [qrCode]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setIsFullscreen(false);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col items-center gap-5 ${isFullscreen ? "bg-white min-h-screen justify-center p-8" : "py-2"}`}
    >
      {/* Big QR code */}
      <div
        className={`rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 inline-block ${isFullscreen ? "scale-150" : ""}`}
      >
        <canvas
          ref={canvasRef}
          className="mx-auto block max-w-[280px] w-full"
          aria-label={`QR Code billet ${ticketNumber}`}
        />
      </div>

      <p className="text-center text-xs text-muted-foreground font-mono">
        {ticketNumber}
      </p>

      {/* Fullscreen button */}
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={toggleFullscreen}
      >
        {isFullscreen ? (
          <Minimize2 className="h-3.5 w-3.5" />
        ) : (
          <Maximize2 className="h-3.5 w-3.5" />
        )}
        Plein écran
      </Button>

      {/* Driver info */}
      {driverName && (
        <Card className="w-full max-w-xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Votre chauffeur</p>
                <p className="font-semibold">{driverName}</p>
              </div>
              {driverPhone && (
                <a href={`tel:${driverPhone}`}>
                  <Button size="sm" className="gap-1.5">
                    <Phone className="h-4 w-4" />
                    Appeler
                  </Button>
                </a>
              )}
            </div>

            {/* Retard button */}
            <RetardButton onRetard={onRetard} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Retard Button ──
function RetardButton({ onRetard }: { onRetard: (min: number, msg?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState("");

  const handleQuickRetard = (minutes: number) => {
    onRetard(minutes);
    setOpen(false);
  };

  const handleCustomRetard = () => {
    if (!customMsg.trim()) return;
    onRetard(0, customMsg.trim());
    setOpen(false);
    setCustomMsg("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="w-full gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          Je suis en retard
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Signaler un retard
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Prévenez votre chauffeur que vous serez en retard.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-16 flex-col gap-1"
              onClick={() => handleQuickRetard(5)}
            >
              <span className="text-lg font-bold">5 min</span>
              <span className="text-[10px] text-muted-foreground">Retard</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex-col gap-1"
              onClick={() => handleQuickRetard(10)}
            >
              <span className="text-lg font-bold">10 min</span>
              <span className="text-[10px] text-muted-foreground">Retard</span>
            </Button>
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Ou tapez un message libre..."
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              rows={2}
            />
            <Button
              className="w-full gap-2"
              onClick={handleCustomRetard}
              disabled={!customMsg.trim()}
            >
              <Send className="h-4 w-4" />
              Envoyer le message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Notification Permission Banner ──
function NotificationBanner({
  onGrant,
}: {
  onGrant: () => void;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  if (Notification.permission === "granted" || Notification.permission === "denied") return null;

  return (
    <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardContent className="p-3 flex items-center gap-3">
        <Bell className="h-5 w-5 text-amber-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Activer les notifications</p>
          <p className="text-xs text-muted-foreground">
            Recevez les rappels de départ et annonces vocales
          </p>
        </div>
        <Button size="sm" onClick={onGrant}>
          Autoriser
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Install Banner ──
function InstallBanner() {
  const { showInstallPrompt, installApp } = usePWA();
  if (!showInstallPrompt) return null;

  return (
    <Card className="border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
      <CardContent className="p-3 flex items-center gap-3">
        <Download className="h-5 w-5 text-emerald-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Installer Bus Go</p>
          <p className="text-xs text-muted-foreground">
            Accès rapide comme une application
          </p>
        </div>
        <Button size="sm" onClick={() => installApp()}>
          Installer
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Live Tracking Button (conditional) ──
function LiveTrackingButton({
  billetStatus,
  departureDate,
  departureTime,
  tracking,
  onOpenMap,
}: {
  billetStatus: string;
  departureDate: string;
  departureTime: string;
  tracking: ReturnType<typeof usePassengerTracking>;
  onOpenMap: () => void;
}) {
  // ─── Trigger conditions ───────────────────────────────────────
  // 1) Billet status must be PENDING (sold) or LATE
  //    In our schema: "sold" = active billet, not yet boarded
  //    There's no separate "late" status — late is signaled via socket event
  const isPendingOrLate = billetStatus === "sold";

  // 2) Current time must be > departure_time - 30min
  const departure = new Date(departureDate);
  const [h, m] = departureTime.split(":").map(Number);
  departure.setHours(h ?? 0, m ?? 0, 0, 0);
  const now = new Date();
  const thirtyMinBefore = new Date(departure.getTime() - 30 * 60 * 1000);
  const isWithinWindow = now > thirtyMinBefore;

  // Hide button if conditions not met
  if (!isPendingOrLate || !isWithinWindow) return null;

  const { state, startTracking } = tracking;

  // ─── Stopped / denied / error states ──────────────────────────
  if (state.status === "denied") {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-center">
        <p className="text-xs text-amber-800 dark:text-amber-200">
          📍 Fonctionnalité indisponible sans GPS
        </p>
        <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">
          Autorisez la géolocalisation pour partager votre position avec l'agent
        </p>
      </div>
    );
  }

  if (state.status === "stopped" && state.stopReason === "departed_reject") {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3 text-center">
        <p className="text-xs text-red-800 dark:text-red-200">
          🚌 Le bus est déjà parti
        </p>
        <p className="text-[10px] text-red-700 dark:text-red-300 mt-0.5">
          {state.error ?? "Partage arrêté."}
        </p>
      </div>
    );
  }

  if (state.status === "stopped") {
    return (
      <Button
        variant="outline"
        className="w-full gap-2 border-orange-400 text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30"
        onClick={() => startTracking()}
      >
        <Navigation className="h-4 w-4" />
        Reprendre le partage live
      </Button>
    );
  }

  // ─── Active state: show status + open map ─────────────────────
  if (state.status === "active" || state.status === "requesting") {
    return (
      <div className="space-y-2">
        <Button
          className="w-full gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white"
          onClick={onOpenMap}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          {state.status === "requesting" ? "Acquisition GPS..." : "Position live active"}
          {state.etaMinutes !== undefined && (
            <span className="ml-1 text-xs opacity-90">· {state.etaMinutes} min</span>
          )}
        </Button>

        {state.highBatteryUsage && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-300 px-1">
            <BatteryWarning className="h-3 w-3" />
            <span>Consommation GPS élevée détectée</span>
          </div>
        )}

        {state.agentMessage && (
          <div
            className={`rounded-lg p-2.5 text-xs ${
              state.agentMessage.type === "wait"
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
            }`}
          >
            <p className="font-medium">
              {state.agentMessage.type === "wait" ? "✅ L'agent vous attend" : "❌ Le bus part"}
            </p>
            <p className="mt-0.5">{state.agentMessage.message}</p>
          </div>
        )}
      </div>
    );
  }

  // ─── Idle state: show start button ────────────────────────────
  return (
    <Button
      variant="outline"
      className="w-full gap-2 border-orange-400 text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30"
      onClick={() => startTracking()}
    >
      <Navigation className="h-4 w-4" />
      📍 Partager ma position live
    </Button>
  );
}

// ── Vouchers Section (Compensation Retard Manqué) ──
function ClientVouchersSection() {
  const { compensations, loading, totalValueFcfa, active } = useCompensations();

  if (loading) return null;
  if (compensations.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
        <Gift className="h-4 w-4 text-emerald-600" />
        Mes bons d&apos;achat
        {active > 0 && (
          <Badge className="bg-emerald-100 text-emerald-700 border-0 ml-1 text-[10px]">
            {active} actif{active > 1 ? "s" : ""} · {totalValueFcfa.toLocaleString("fr-FR")} FCFA
          </Badge>
        )}
      </h3>
      <div className="space-y-2">
        {compensations.slice(0, 5).map((c) => (
          <VoucherCard key={c.id} compensation={c} />
        ))}
      </div>
    </div>
  );
}

// ── Main Client Page ──
export default function ClientPage() {
  const { data: session } = useSession();
  const tenantId = session?.user?.tenantId;
  const userId = session?.user?.id;

  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // PWA hooks
  const { isInstalled, isOnline, showInstallPrompt: _showInstall } = usePWA();
  const { isSpeaking, enabled: voiceEnabled, setEnabled: setVoiceEnabled, speak, stop } = useVoiceNotifications();

  // Socket.io
  const { notifications, socketRef } = useBusGoSocket(tenantId);

  // ─── Live GPS Tracking ──────────────────────────────────────
  const [liveMapOpen, setLiveMapOpen] = useState(false);

  // Only initialize tracking hook when we have an active billet
  const activeBilletForTracking = data?.activeBillet;
  const tracking = usePassengerTracking({
    bookingId: activeBilletForTracking?.id ?? "",
    tripId: activeBilletForTracking?.trajet.id ?? "",
    clientId: userId ?? undefined,
    clientName: session?.user?.name ?? undefined,
  });

  // ─── Push notification subscription (web-push VAPID) ──────────
  const pushNotif = usePushNotifications({
    autoSubscribe: true,
    onSubscribed: () => console.log("[PUSH] Subscribed to notifications"),
  });

  // Notification permission (legacy banner — kept for UX)
  const requestNotifPermission = useCallback(async () => {
    // Delegate to the new push subscription hook
    if (pushNotif.isSupported) {
      await pushNotif.subscribe();
    } else if ("Notification" in window) {
      await Notification.requestPermission();
    }
  }, [pushNotif]);

  // Fetch client data
  const fetchClientData = useCallback(async () => {
    try {
      const res = await fetch("/api/client/trajets");
      if (!res.ok) throw new Error("Erreur serveur");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Impossible de charger vos données");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  // Handle incoming notifications via Socket.io — vocal TTS
  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[notifications.length - 1];

    // Speak the notification
    if (data?.voiceConfig) {
      speak({
        text: latest.message,
        introText: data.voiceConfig.introText,
        lang: data.voiceConfig.language,
      });
    } else {
      speak({ text: latest.message });
    }

    // Also show a browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(latest.title, {
        body: latest.message,
        icon: "/icons/icon-192.png",
        tag: latest.id,
      });
    }
  }, [notifications, data, speak]);

  // Handle Socket.io driver-retard acknowledgment (toast via window event)
  useEffect(() => {
    const handler = () => fetchClientData();
    window.addEventListener("busgo-refresh", handler);
    return () => window.removeEventListener("busgo-refresh", handler);
  }, [fetchClientData]);

  // Send retard via Socket.io
  const handleRetard = useCallback(
    (minutes: number, message?: string) => {
      if (!data?.activeBillet || !tenantId || !userId || !socketRef.current) return;
      const b = data.activeBillet;

      socketRef.current.emit("client-retard", {
        trajetId: b.trajet.id,
        tenantId,
        clientId: userId,
        minutes,
        message,
        driverId: b.trajet.bus.driver?.id,
      });

      // Dispatch a toast
      window.dispatchEvent(new CustomEvent("busgo-toast", {
        detail: {
          title: "Retard signalé",
          description: message || `Votre chauffeur a été prévenu (${minutes || ""} min)`,
        },
      }));
    },
    [data, tenantId, userId, socketRef]
  );

  const activeBillet = data?.activeBillet;
  const pastBillets = data?.pastBillets ?? [];

  const trajetDate = activeBillet
    ? new Date(activeBillet.trajet.date).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    : "";

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="text-center py-12 space-y-3">
        <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={fetchClientData}>
          Réessayer
        </Button>
      </div>
    );
  }

  // ── Active Trip ──
  if (activeBillet) {
    const t = activeBillet.trajet;
    return (
      <div className="space-y-4 max-w-md mx-auto">
        {/* Status bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-emerald-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive" />
            )}
            {isInstalled && (
              <Badge variant="outline" className="text-[10px]">PWA</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => (voiceEnabled ? stop() : undefined)}
            >
              {isSpeaking ? (
                <Volume2 className="h-4 w-4 text-primary animate-pulse" />
              ) : voiceEnabled ? (
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
            >
              {voiceEnabled ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        {/* Banners */}
        <InstallBanner />
        <NotificationBanner onGrant={requestNotifPermission} />

        {/* ─── Sponsored Offers ─────────────────────────────────── */}
        <SponsoredBannerList pwa="client" compact />

        {/* Trip Card — design ORDERAN */}
        <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden">
          {/* Mini gradient header */}
          <div className="bg-gradient-to-br from-[#4A90E2] to-[#87CEEB] px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                  Votre prochain voyage
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-lg font-bold">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t.origin}</span>
                  <span className="text-white/70 mx-0.5">→</span>
                  <span className="truncate">{t.destination}</span>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-0 capitalize hover:bg-white/20">
                {t.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/90 mt-2 pl-6">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {trajetDate}
              </span>
              <span>à {t.time}</span>
              <span>·</span>
              <span>Bus {t.bus.number}</span>
              <span>·</span>
              <span>Place {activeBillet.seatNumber}</span>
            </div>
          </div>

          <CardContent className="space-y-4 p-5">

            {/* QR Code */}
            <PassengerQR
              qrCode={activeBillet.qrCode}
              ticketNumber={activeBillet.ticketNumber}
              seatNumber={activeBillet.seatNumber}
              destination={t.destination}
              date={trajetDate}
              time={t.time}
              busNumber={t.bus.number}
              driverName={t.bus.driver?.name ?? null}
              driverPhone={t.bus.driver?.phone ?? null}
              tenantId={t.tenant.id}
              trajetId={t.id}
              clientId={userId ?? ""}
              introText={data.voiceConfig?.introText}
              onRetard={handleRetard}
            />

            {/* Company info */}
            <p className="text-center text-xs text-muted-foreground">
              {t.tenant.name} · {t.price.toLocaleString("fr-FR")} FCFA
            </p>

            {/* ─── Live GPS Tracking Button ─────────────────────── */}
            <LiveTrackingButton
              billetStatus={activeBillet.status}
              departureDate={t.date}
              departureTime={t.time}
              tracking={tracking}
              onOpenMap={() => setLiveMapOpen(true)}
            />
          </CardContent>
        </Card>

        {/* ─── Live Map Modal (full-screen) ─────────────────────── */}
        <LiveMapModal
          open={liveMapOpen}
          onClose={() => setLiveMapOpen(false)}
          state={tracking.state}
          onStop={() => tracking.stopTracking("manual")}
          passengerName={session?.user?.name}
        />
      </div>
    );
  }

  // ── No active trip — show history ──
  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-emerald-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-destructive" />
          )}
          {isInstalled && (
            <Badge variant="outline" className="text-[10px]">PWA</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => (voiceEnabled ? stop() : undefined)}
          >
            {voiceEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
          >
            {voiceEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </div>
      </div>

      <InstallBanner />
      <NotificationBanner onGrant={requestNotifPermission} />

      {/* ─── Sponsored Offers (Multi-PWA module) ──────────────── */}
      <SponsoredBannerList pwa="client" compact />

      {/* ─── Vouchers (Compensation Retard Manqué module) ─────── */}
      <ClientVouchersSection />

      {/* No trip message */}
      <div className="text-center py-10 space-y-3">
        <QrCode className="mx-auto h-14 w-14 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold">Aucun voyage prévu</h2>
        <p className="text-sm text-muted-foreground">
          Scannez un QR code au guichet pour recevoir votre billet.
        </p>
      </div>

      {/* Past trips */}
      {pastBillets.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <History className="h-4 w-4" />
            Historique de vos voyages
          </h3>
          <div className="space-y-2">
            {pastBillets.map((b) => {
              const statusLabel: Record<string, string> = {
                sold: "Terminé",
                boarded: "Embarqué",
                absent: "Absent",
                cancelled: "Annulé",
              };
              const statusColor: Record<string, string> = {
                sold: "bg-emerald-100 text-emerald-800",
                boarded: "bg-sky-100 text-sky-800",
                absent: "bg-amber-100 text-amber-800",
                cancelled: "bg-red-100 text-red-800",
              };

              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {b.trajet.origin} → {b.trajet.destination}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.trajet.date).toLocaleDateString("fr-FR")} à {b.trajet.time} · Place {b.seatNumber}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded ${statusColor[b.status] ?? "bg-muted text-muted-foreground"}`}
                  >
                    {statusLabel[b.status] ?? b.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}