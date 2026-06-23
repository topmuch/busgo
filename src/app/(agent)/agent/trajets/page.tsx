"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MapPin, Clock, Bus, Users, RefreshCw, ChevronRight, CalendarX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { DepartureTimer } from "@/components/agent/departure-timer";

interface TrajetBus {
  id: string;
  number: string;
  capacity: number;
}

interface TrajetDriver {
  id: string;
  name: string;
}

interface Trajet {
  id: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  status: string;
  bus: TrajetBus;
  driver: TrajetDriver | null;
  _count: { billets: number };
  boardedCount: number;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "scheduled":
      return { label: "À venir", variant: "secondary" as const, className: "" };
    case "boarding":
      return {
        label: "Embarquement",
        variant: "outline" as const,
        className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      };
    case "departed":
      return { label: "Parti", variant: "outline" as const, className: "" };
    case "arrived":
      return { label: "Arrivé", variant: "outline" as const, className: "" };
    case "cancelled":
      return { label: "Annulé", variant: "destructive" as const, className: "" };
    default:
      return { label: status, variant: "secondary" as const, className: "" };
  }
}

function TrajetCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-32 rounded-full" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgentTrajetsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrajets = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/agent/trajets");
      if (!res.ok) throw new Error("Failed to fetch");
      const data: Trajet[] = await res.json();
      setTrajets(data);
    } catch (err) {
      console.error("Error fetching trajets:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTrajets();
  }, [fetchTrajets]);

  const handleRefresh = () => {
    fetchTrajets(true);
  };

  const handleClick = (trajetId: string) => {
    router.push(`/agent/embarquement/${trajetId}`);
  };

  const todayLabel = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Mes trajets</h1>
          <p className="text-sm text-muted-foreground capitalize">{todayLabel}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-9 w-9"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          <span className="sr-only">Rafraîchir</span>
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <TrajetCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && trajets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <CalendarX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base mb-1">Aucun trajet aujourd&apos;hui</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Vous n&apos;avez aucun trajet assigné pour aujourd&apos;hui. Revenez plus tard ou contactez votre administrateur.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Trajet list */}
      {!loading && trajets.length > 0 && (
        <div className="space-y-3">
          {trajets.map((trajet) => {
            const badge = getStatusBadge(trajet.status);
            const totalTickets = trajet._count.billets;
            const boarded = trajet.boardedCount;
            const progressPercent = totalTickets > 0 ? (boarded / totalTickets) * 100 : 0;
            const isClickable =
              trajet.status === "scheduled" || trajet.status === "boarding";

            return (
              <Card
                key={trajet.id}
                className={`overflow-hidden transition-colors ${
                  isClickable
                    ? "cursor-pointer hover:bg-muted/50 active:bg-muted/80"
                    : "opacity-75"
                }`}
                onClick={() => isClickable && handleClick(trajet.id)}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    handleClick(trajet.id);
                  }
                }}
              >
                <CardContent className="p-4">
                  {/* Top row: route + status */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm font-semibold min-w-0">
                      <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="truncate">
                        {trajet.origin} → {trajet.destination}
                      </span>
                    </div>
                    <Badge variant={badge.variant} className={badge.className}>
                      {badge.label}
                    </Badge>
                  </div>

                  {/* Time + DepartureTimer */}
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{trajet.time}</span>
                    {(trajet.status === "scheduled" || trajet.status === "boarding") && (
                      <DepartureTimer
                        departureTime={trajet.time}
                        date={trajet.date}
                        className="ml-auto"
                      />
                    )}
                  </div>

                  {/* Bus info + Driver */}
                  <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Bus className="h-3.5 w-3.5" />
                      <span>
                        Bus {trajet.bus.number} · {trajet.bus.capacity} places
                      </span>
                    </div>
                    {trajet.driver && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>{trajet.driver.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Boarding progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {boarded}/{totalTickets} embarqués
                      </span>
                      <span className="font-medium text-muted-foreground">
                        {Math.round(progressPercent)}%
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>

                  {/* Chevron for clickable cards */}
                  {isClickable && (
                    <div className="flex justify-end mt-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}