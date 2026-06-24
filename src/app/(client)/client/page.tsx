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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Notification permission
  const requestNotifPermission = useCallback(async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        // Register for push (in a real prod, would use a push subscription endpoint)
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          await reg.pushManager.subscribe({
            userVisibleOnly: true,
          });
        }
      }
    }
  }, []);

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

        {/* Trip Card */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Votre prochain voyage</CardTitle>
              <Badge variant="secondary" className="capitalize">
                {t.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Route info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-lg font-bold">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <span>{t.origin}</span>
                <span className="text-muted-foreground font-normal mx-1">→</span>
                <span>{t.destination}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground pl-7">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {trajetDate}
                </span>
                <span>à {t.time}</span>
                <span>·</span>
                <span>Bus {t.bus.number}</span>
                <span>·</span>
                <span>Place {activeBillet.seatNumber}</span>
              </div>
            </div>

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
          </CardContent>
        </Card>
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