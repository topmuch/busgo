"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Calendar,
  BarChart3,
  DollarSign,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StatsResponse {
  today: {
    trajets: number;
    boardingRate: number;
    revenue: number;
    lostSeats: number;
    totalBillets: number;
    boardedBillets: number;
    absentBillets: number;
  };
  chart30Days: Array<{
    date: string;
    rate: number;
    count: number;
    revenue: number;
  }>;
  todayList: Array<{
    id: string;
    origin: string;
    destination: string;
    time: string;
    status: string;
    busNumber: string;
    busCapacity: number;
    totalBillets: number;
    boarded: number;
    absent: number;
    fillRate: number;
    price: number;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatMoney(amount: number): string {
  return amount.toLocaleString("fr-FR") + " F CFA";
}

function formatShortMoney(amount: number): string {
  return amount.toLocaleString("fr-FR") + " F";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "scheduled":
      return (
        <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/40 dark:text-sky-300">
          Programmé
        </Badge>
      );
    case "boarding":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300">
          Embarquement
        </Badge>
      );
    case "departed":
      return (
        <Badge variant="secondary">
          Parti
        </Badge>
      );
    case "cancelled":
      return (
        <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/40 dark:text-rose-300">
          Annulé
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

/* ------------------------------------------------------------------ */
/*  Custom Tooltip for the chart                                       */
/* ------------------------------------------------------------------ */

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1 text-sm font-medium text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold text-emerald-600">
        Taux : {payload[0].value}%
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminDashboardPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const json: StatsResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>

        {/* KPI skeletons */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-5 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="mt-2 h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full rounded" />
          </CardContent>
        </Card>

        {/* Table skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---- Error state ---- */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-4 md:p-6">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-800 dark:bg-rose-950/40">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <h2 className="text-lg font-semibold text-rose-700 dark:text-rose-300">
            Impossible de charger les données
          </h2>
          <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={fetchStats}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { today, chart30Days, todayList } = data;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* ───────── KPI Cards ───────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Trajets du jour */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trajets du jour
            </CardTitle>
            <div className="rounded-md bg-sky-100 p-2 dark:bg-sky-900/40">
              <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{today.trajets}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {today.totalBillets} billets au total
            </p>
          </CardContent>
        </Card>

        {/* Taux d'embarquement */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux d&apos;embarquement
            </CardTitle>
            <div className="rounded-md bg-emerald-100 p-2 dark:bg-emerald-900/40">
              <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{today.boardingRate}%</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {today.boardedBillets} embarqués / {today.totalBillets} billets
            </p>
          </CardContent>
        </Card>

        {/* Chiffre d'affaires */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chiffre d&apos;affaires
            </CardTitle>
            <div className="rounded-md bg-amber-100 p-2 dark:bg-amber-900/40">
              <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(today.revenue)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Recettes du jour
            </p>
          </CardContent>
        </Card>

        {/* Places perdues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Places perdues
            </CardTitle>
            <div className="rounded-md bg-rose-100 p-2 dark:bg-rose-900/40">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{today.lostSeats}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {today.absentBillets} passagers absents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ───────── 30-day Chart ───────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Taux d&apos;embarquement — 30 derniers jours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chart30Days}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#emeraldGradient)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: "#10b981" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ───────── Today's Trips Table ───────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Trajets du jour
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Heure</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Bus</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Embarqués</th>
                  <th className="px-4 py-3">Taux</th>
                  <th className="px-4 py-3 text-right">CA</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {todayList.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Aucun trajet prévu aujourd&apos;hui.
                    </td>
                  </tr>
                )}
                {todayList.map((trip) => (
                  <tr
                    key={trip.id}
                    className="transition-colors hover:bg-muted/50"
                  >
                    {/* Heure */}
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {trip.time}
                    </td>

                    {/* Destination */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="text-muted-foreground">
                        {trip.origin}
                      </span>{" "}
                      →{" "}
                      <span className="font-medium">{trip.destination}</span>
                    </td>

                    {/* Bus */}
                    <td className="whitespace-nowrap px-4 py-3">
                      {trip.busNumber}
                    </td>

                    {/* Statut */}
                    <td className="whitespace-nowrap px-4 py-3">
                      {getStatusBadge(trip.status)}
                    </td>

                    {/* Embarqués */}
                    <td className="whitespace-nowrap px-4 py-3">
                      {trip.boarded} / {trip.totalBillets}
                    </td>

                    {/* Taux (progress bar) */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all ${
                              trip.fillRate >= 80
                                ? "bg-emerald-500"
                                : trip.fillRate >= 50
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(trip.fillRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {trip.fillRate}%
                        </span>
                      </div>
                    </td>

                    {/* CA */}
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      {formatShortMoney(trip.price * trip.boarded)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}