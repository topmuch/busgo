"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TrajetReport {
  id: string;
  date: string;
  time: string;
  origin: string;
  destination: string;
  status: string;
  busNumber: string;
  busCapacity: number;
  driver: string | null;
  totalBillets: number;
  boarded: number;
  absent: number;
  revenue: number;
  fillRate: number;
  boardingRate: number;
}

interface ReportData {
  period: string;
  totalRevenue: number;
  totalBoarded: number;
  totalAbsent: number;
  totalSold: number;
  totalCapacity: number;
  occupancyRate: number;
  trajets: TrajetReport[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatMoney(n: number): string {
  return n.toLocaleString("fr-FR") + " F CFA";
}

function getMonthParam(period: string): string | undefined {
  if (period === "this-month") {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  if (period === "last-month") {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  return undefined;
}

function downloadJSON(data: ReportData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rapport-${data.period}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV(data: ReportData) {
  const headers = [
    "Date",
    "Heure",
    "Origine",
    "Destination",
    "Statut",
    "Bus",
    "Chauffeur",
    "Vendus",
    "Embarques",
    "Absents",
    "Taux remplissage%",
    "CA (F CFA)",
  ];
  const rows = data.trajets.map((t) => [
    new Date(t.date).toLocaleDateString("fr-FR"),
    t.time,
    t.origin,
    t.destination,
    t.status,
    t.busNumber,
    t.driver || "-",
    t.totalBillets,
    t.boarded,
    t.absent,
    t.fillRate,
    t.revenue,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rapport-${data.period}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Status config                                                      */
/* ------------------------------------------------------------------ */

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Planifié",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  },
  boarding: {
    label: "Embarquement",
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  },
  departed: {
    label: "Parti",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  },
  arrived: {
    label: "Arrivé",
    className: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
  cancelled: {
    label: "Annulé",
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  },
};

/* ------------------------------------------------------------------ */
/*  Period options                                                     */
/* ------------------------------------------------------------------ */

const periods = [
  { key: "today", label: "Aujourd'hui" },
  { key: "this-week", label: "Cette semaine" },
  { key: "this-month", label: "Ce mois" },
  { key: "last-month", label: "Le mois dernier" },
] as const;

type PeriodKey = (typeof periods)[number]["key"];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RapportsPage() {
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"json" | "csv" | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const month = getMonthParam(period);
      const params = new URLSearchParams({ format: "json" });
      if (month) params.set("month", month);

      const res = await fetch(`/api/admin/rapports?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = async (type: "json" | "csv") => {
    setExporting(type);
    try {
      const month = getMonthParam(period);
      const params = new URLSearchParams({ format: "json" });
      if (month) params.set("month", month);

      const res = await fetch(`/api/admin/rapports?${params}`);
      if (res.ok) {
        const json = await res.json();
        if (type === "json") downloadJSON(json);
        else downloadCSV(json);
      }
    } catch {
      // silent
    } finally {
      setExporting(null);
    }
  };

  /* Derived KPIs */
  const boardingRate =
    data && data.totalBoarded + data.totalSold + data.totalAbsent > 0
      ? Math.round(
          (data.totalBoarded /
            (data.totalBoarded + data.totalSold + data.totalAbsent)) *
            100
        )
      : 0;

  /* ---------------------------------------------------------------- */

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Rapports
          </h1>
          <p className="text-muted-foreground">
            Consultez et exportez vos rapports d&apos;activité.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleExport("json")}
            disabled={exporting !== null || loading}
          >
            {exporting === "json" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileJson className="h-4 w-4" />
            )}
            Exporter JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleExport("csv")}
            disabled={exporting !== null || loading}
          >
            {exporting === "csv" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap gap-2">
        {periods.map((p) => (
          <Button
            key={p.key}
            variant={period === p.key ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(p.key)}
            disabled={loading}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Revenue */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Chiffre d&apos;affaires
                </p>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight">
                {formatMoney(data.totalRevenue)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.trajets.length} trajet(s) sur la période
              </p>
            </CardContent>
          </Card>

          {/* Occupancy Rate */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Taux de remplissage
                </p>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    data.occupancyRate >= 70
                      ? "bg-emerald-100 dark:bg-emerald-950"
                      : data.occupancyRate >= 40
                        ? "bg-amber-100 dark:bg-amber-950"
                        : "bg-red-100 dark:bg-red-950"
                  }`}
                >
                  {data.occupancyRate >= 40 ? (
                    <TrendingUp
                      className={`h-5 w-5 ${
                        data.occupancyRate >= 70
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight">
                {data.occupancyRate}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.totalBoarded + data.totalSold + data.totalAbsent} /
                {data.totalCapacity} places
              </p>
            </CardContent>
          </Card>

          {/* Boarding Rate */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Taux d&apos;embarquement
                </p>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950">
                  <Users className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight">
                {boardingRate}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.totalBoarded} embarqué(s) sur{" "}
                {data.totalBoarded + data.totalSold + data.totalAbsent}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Trajets Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data && data.trajets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Heure
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Trajet
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Bus
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Chauffeur
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                      Vendus
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                      Embarqués
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                      Absents
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Taux
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      CA
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.trajets.map((t) => {
                    const cfg = statusConfig[t.status] ?? statusConfig.scheduled;
                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        {/* Date */}
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(t.date).toLocaleDateString("fr-FR")}
                        </td>
                        {/* Heure */}
                        <td className="px-4 py-3 whitespace-nowrap font-medium">
                          {t.time}
                        </td>
                        {/* Trajet */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium truncate max-w-40">
                              {t.origin} → {t.destination}
                            </span>
                            <span
                              className={`inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cfg.className}`}
                            >
                              {cfg.label}
                            </span>
                          </div>
                        </td>
                        {/* Bus */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {t.busNumber}
                          <span className="text-muted-foreground ml-1 text-xs">
                            ({t.busCapacity})
                          </span>
                        </td>
                        {/* Chauffeur */}
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {t.driver || "—"}
                        </td>
                        {/* Vendus */}
                        <td className="px-4 py-3 text-center tabular-nums">
                          {t.totalBillets}
                        </td>
                        {/* Embarqués */}
                        <td className="px-4 py-3 text-center tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                          {t.boarded}
                        </td>
                        {/* Absents */}
                        <td className="px-4 py-3 text-center tabular-nums text-red-600 dark:text-red-400">
                          {t.absent}
                        </td>
                        {/* Taux (mini progress bar) */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  t.fillRate >= 70
                                    ? "bg-emerald-500"
                                    : t.fillRate >= 40
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                                }`}
                                style={{ width: `${Math.min(t.fillRate, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium tabular-nums w-9 text-right">
                              {t.fillRate}%
                            </span>
                          </div>
                        </td>
                        {/* CA */}
                        <td className="px-4 py-3 text-right whitespace-nowrap font-medium tabular-nums">
                          {formatMoney(t.revenue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Download className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Aucune donnée pour cette période.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}