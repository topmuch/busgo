"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useBusGoSocket } from "@/hooks/use-bus-go-socket";
import { getTTSEngine, Announcement } from "@/lib/tts-engine";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DisplayTrajet {
  id: string;
  origin: string;
  destination: string;
  time: string;
  date: string;
  status: string;
  zone: string | null;
  bus: { number: string; capacity: number };
  driver: { name: string } | null;
  totalBillets: number;
  boardedCount: number;
  absentCount: number;
  fillRate: number;
}

interface DisplayData {
  tenant: { id: string; name: string; slug: string; logo: string | null; phone: string | null };
  trajets: DisplayTrajet[];
  stats: {
    totalDepartures: number;
    totalBoarded: number;
    totalBillets: number;
    currentlyBoarding: number;
    departed: number;
  };
  voiceConfig: { introText: string; language: string; audioUrl: string | null } | null;
}

/* ------------------------------------------------------------------ */
/*  Status helpers                                                    */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Programme",
  boarding: "Embarquement",
  departed: "Parti",
  arrived: "Arrive",
  cancelled: "Annule",
};

function statusColor(status: string) {
  switch (status) {
    case "scheduled": return "text-sky-300";
    case "boarding": return "text-emerald-400";
    case "departed": return "text-zinc-500";
    case "arrived": return "text-zinc-500";
    case "cancelled": return "text-red-400";
    default: return "text-sky-300";
  }
}

function statusBg(status: string) {
  switch (status) {
    case "scheduled": return "bg-sky-500/20 border-sky-500/30";
    case "boarding": return "bg-emerald-500/20 border-emerald-500/30";
    case "departed": return "bg-zinc-500/20 border-zinc-500/30";
    case "arrived": return "bg-zinc-500/20 border-zinc-500/30";
    case "cancelled": return "bg-red-500/20 border-red-500/30";
    default: return "bg-sky-500/20 border-sky-500/30";
  }
}

function statusPulse(status: string) {
  return status === "boarding" ? "animate-pulse" : "";
}

function fillBarColor(rate: number) {
  if (rate >= 90) return "bg-red-500";
  if (rate >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function fillTextColor(rate: number) {
  if (rate >= 90) return "text-red-400";
  if (rate >= 70) return "text-amber-400";
  return "text-emerald-400";
}

/* ------------------------------------------------------------------ */
/*  Clock                                                              */
/* ------------------------------------------------------------------ */

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="text-right">
      <div className="text-3xl font-bold tabular-nums tracking-wider text-white">
        {timeStr}
      </div>
      <div className="text-sm text-sky-200/80 capitalize">{dateStr}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Announcement Banner                                               */
/* ------------------------------------------------------------------ */

function AnnouncementBanner({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="animate-announcement-in bg-amber-500/90 text-black px-6 py-3 text-center font-bold text-xl tracking-wide">
      <span className="mr-2">&#128227;</span>
      {text}
      <span className="ml-2">&#128227;</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function DisplayEcran() {
  const params = useParams<{ tenantSlug: string }>();
  const slug = params.tenantSlug;

  const [data, setData] = useState<DisplayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAnnouncement, setLastAnnouncement] = useState<string | null>(null);
  const [announcementVisible, setAnnouncementVisible] = useState(false);
  const announcementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ttsRef = useRef<ReturnType<typeof getTTSEngine> | null>(null);

  // WebSocket for real-time updates
  const { isConnected, trajetStatuses } = useBusGoSocket(
    data?.tenant?.id
  );

  /* ---- Fetch data ---- */
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/display/${slug}`);
      if (!res.ok) {
        setError("Compagnie non trouvee");
        return;
      }
      const json: DisplayData = await res.json();
      setData(json);

      // Setup TTS on first load
      if (!ttsRef.current) {
        const tts = getTTSEngine();
        if (json.voiceConfig) {
          tts.setLanguage(json.voiceConfig.language);
        }
        tts.onAnnouncement((ann) => {
          setLastAnnouncement(ann.text);
          setAnnouncementVisible(true);
          if (announcementTimeoutRef.current) clearTimeout(announcementTimeoutRef.current);
          announcementTimeoutRef.current = setTimeout(
            () => setAnnouncementVisible(false),
            15000
          );
        });
        ttsRef.current = tts;
      }
    } catch {
      setError("Erreur de connexion");
    }
  }, [slug]);

  // Initial fetch + auto-refresh every 5s
  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [fetchData]);

  // Start TTS auto-announcements when data loads
  useEffect(() => {
    if (!data?.trajets || !ttsRef.current) return;
    ttsRef.current.startAutoAnnouncements(
      data.trajets.map((t) => ({
        id: t.id,
        destination: t.destination,
        time: t.time,
        date: t.date,
        status: t.status,
        zone: t.zone,
      }))
    );
    return () => ttsRef.current?.stopAutoAnnouncements();
    // Only restart when trajet IDs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.trajets.map((t) => t.id).join(",")]);

  // Socket-driven status updates
  useEffect(() => {
    if (!data || trajetStatuses.length === 0) return;
    const latest = trajetStatuses[trajetStatuses.length - 1];
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        trajets: prev.trajets.map((t) =>
          t.id === latest.trajetId ? { ...t, status: latest.status } : t
        ),
      };
    });
  }, [trajetStatuses.length, data]);

  // Kiosk mode: auto-reload on error after 30s
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => window.location.reload(), 30000);
    return () => clearTimeout(id);
  }, [error]);

  // Kiosk mode: fullscreen toggle on double-click
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    };
    window.addEventListener("dblclick", handler);
    return () => window.removeEventListener("dblclick", handler);
  }, []);

  /* ---- Error state ---- */
  if (error) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">&#9888;</div>
          <h1 className="text-3xl font-bold text-white mb-2">Bus Go</h1>
          <p className="text-sky-300 text-xl">{error}</p>
          <p className="text-slate-500 mt-4">Rechargement automatique en cours...</p>
          <div className="mt-4 w-48 h-1 bg-slate-800 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full animate-loading-bar" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <div className="text-sky-400 text-2xl animate-pulse">Chargement...</div>
      </div>
    );
  }

  const { tenant, trajets, stats, voiceConfig } = data;

  return (
    <div className="ecran-kiosk fixed inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 text-white flex flex-col overflow-hidden font-sans select-none">
      {/* ---- HEADER ---- */}
      <header className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-b border-sky-800/30 bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {/* Logo placeholder */}
          <div className="w-12 h-12 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-2xl font-black text-sky-400">
            BG
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wide text-white">
              {tenant.name}
            </h1>
            <p className="text-sm text-sky-300/70">
              {tenant.phone || "Bus Go - Affichage departures"}
            </p>
          </div>
        </div>
        <Clock />
      </header>

      {/* ---- ANNOUNCEMENT BANNER ---- */}
      {announcementVisible && <AnnouncementBanner text={lastAnnouncement} />}

      {/* ---- TRAJET GRID ---- */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        {trajets.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-3xl text-slate-500">Aucun depart prevu aujourd&apos;hui</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 h-full">
            {trajets.map((trajet) => (
              <div
                key={trajet.id}
                className={`rounded-xl border ${statusBg(trajet.status)} p-4 flex flex-col justify-between transition-all duration-500 ${statusPulse(trajet.status)}`}
              >
                {/* Top row: Time + Status */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-4xl font-black tabular-nums text-white tracking-tight">
                    {trajet.time}
                  </span>
                  <span
                    className={`text-sm font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${statusColor(trajet.status)} ${statusBg(trajet.status)}`}
                  >
                    {STATUS_LABELS[trajet.status] || trajet.status}
                  </span>
                </div>

                {/* Destination */}
                <div className="mb-3">
                  <div className="text-2xl font-bold text-white leading-tight">
                    {trajet.destination}
                  </div>
                  <div className="text-sm text-sky-200/60 mt-0.5">
                    Depuis {trajet.origin} &middot; Bus {trajet.bus.number}
                  </div>
                </div>

                {/* Fill rate bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-sky-200/70">
                      {trajet.boardedCount}/{trajet.totalBillets} embarques
                    </span>
                    <span className={`font-bold ${fillTextColor(trajet.fillRate)}`}>
                      {trajet.fillRate}% rempli
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${fillBarColor(trajet.fillRate)}`}
                      style={{ width: `${trajet.fillRate}%` }}
                    />
                  </div>
                </div>

                {/* Bottom: Zone + Driver */}
                <div className="flex items-center justify-between text-sm">
                  {trajet.zone && (
                    <span className="flex items-center gap-1.5 bg-sky-900/50 text-sky-300 px-2.5 py-1 rounded-md font-medium">
                      <span className="inline-block w-2 h-2 rounded-full bg-sky-400" />
                      {trajet.zone}
                    </span>
                  )}
                  {trajet.driver && (
                    <span className="text-slate-400 text-xs">
                      Chauffeur: {trajet.driver.name}
                    </span>
                  )}
                  {trajet.absentCount > 0 && (
                    <span className="text-red-400/80 text-xs">
                      {trajet.absentCount} abs.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- FOOTER ---- */}
      <footer className="flex-shrink-0 border-t border-sky-800/30 bg-slate-900/60 backdrop-blur-sm px-8 py-3">
        <div className="flex items-center justify-between">
          {/* Stats */}
          <div className="flex items-center gap-8 text-sm">
            <div>
              <span className="text-sky-300/60">Departs: </span>
              <span className="text-white font-bold text-lg">{stats.totalDepartures}</span>
            </div>
            <div>
              <span className="text-sky-300/60">En cours: </span>
              <span className="text-emerald-400 font-bold text-lg">{stats.currentlyBoarding}</span>
            </div>
            <div>
              <span className="text-sky-300/60">Passagers: </span>
              <span className="text-white font-bold text-lg">
                {stats.totalBoarded}/{stats.totalBillets}
              </span>
            </div>
            <div>
              <span className="text-sky-300/60">Partis: </span>
              <span className="text-zinc-400 font-bold text-lg">{stats.departed}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-sky-200/60">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-sky-500/40 border border-sky-500/50" />
              Programme
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500/40 border border-emerald-500/50" />
              Embarquement
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-zinc-500/40 border border-zinc-500/50" />
              Parti
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-500/40 border border-red-500/50" />
              Annule
            </span>
          </div>

          {/* Connection + TTS indicator */}
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-400 animate-pulse"}`} />
              <span className="text-slate-400">{isConnected ? "Live" : "Reconnexion..."}</span>
            </span>
            {voiceConfig && (
              <span className="text-slate-500">Son active</span>
            )}
          </div>
        </div>
      </footer>

      {/* ---- Intro TTS on first load ---- */}
      <IntroTTS
        introText={voiceConfig?.introText}
        language={voiceConfig?.language || "fr-FR"}
        companyName={tenant.name}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Intro TTS component - speaks welcome on mount                       */
/* ------------------------------------------------------------------ */

function IntroTTS({
  introText,
  language,
  companyName,
}: {
  introText?: string | null;
  language: string;
  companyName: string;
}) {
  const [spoken, setSpoken] = useState(false);
  const spokeRef = useRef(false);

  useEffect(() => {
    if (spoken || spokeRef.current || !introText) return;
    spokeRef.current = true;

    const timer = setTimeout(() => {
      const tts = getTTSEngine();
      tts.setLanguage(language);
      tts.speak(introText);
      setSpoken(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [introText, language, spoken]);

  return null;
}