"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  Line, LineChart,
} from "recharts";
import {
  Users, Ticket, Bus, TrendingUp, ShieldCheck, Target, Smartphone, Mic,
} from "lucide-react";

interface AnalyticsData {
  overview: {
    totalTrajets: number; monthTrajets: number;
    totalBillets: number; boardedBillets: number; absentBillets: number;
    monthBillets: number; boardingRate: string; absenceRate: string;
  };
  trajetsByStatus: { status: string; _count: { id: number } }[];
  billetsByStatus: { status: string; _count: { id: number } }[];
  roiData: {
    tenantName: string; busCount: number; trajetCount: number;
    billetCount: number; monthlyCost: number; estimatedRevenue: number; roi: string;
  }[];
  monthlyTrend: {
    month: string; trajets: number; billets: number; boarded: number; rate: string;
  }[];
  featureUsage: {
    qrScan: boolean; voiceConfig: number;
    activeDrivers: number; activeClients: number;
    avgReliability: number | null;
  };
}

const statusLabels: Record<string, string> = {
  scheduled: "Planifié", boarding: "Embarquement", departed: "Départ",
  arrived: "Arrivé", cancelled: "Annulé",
  sold: "Vendu", boarded: "Embarqué", absent: "Absent",
};

function formatFCFA(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch("/api/superadmin/analytics").then((r) => r.json()).then(setData);
  }, []);

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { overview, trajetsByStatus, billetsByStatus, roiData, monthlyTrend, featureUsage } = data;

  const kpiCards = [
    { title: "Taux d'embarquement", value: `${overview.boardingRate}%`, icon: Target, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Trajets ce mois", value: overview.monthTrajets, icon: Ticket, color: "text-sky-600", bg: "bg-sky-50" },
    { title: "Passagers ce mois", value: overview.monthBillets, icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
    { title: "Taux d'absence", value: `${overview.absenceRate}%`, icon: ShieldCheck, color: `${parseFloat(overview.absenceRate) > 20 ? "text-rose-600" : "text-amber-600"}`, bg: `${parseFloat(overview.absenceRate) > 20 ? "bg-rose-50" : "bg-amber-50"}` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytique</h1>
        <p className="text-muted-foreground">Statistiques globales, taux d&apos;embarquement et ROI par compagnie.</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.title}</p>
                <p className="text-xl font-bold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tendance mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
                  <Bar dataKey="billets" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Billets" />
                  <Bar dataKey="boarded" fill="#10b981" radius={[4, 4, 0, 0]} name="Embarqués" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Boarding Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Taux d&apos;embarquement mensuel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value: string) => [`${value}%`, "Taux"]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
                  <Line type="monotone" dataKey="rate" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Trajets</h4>
              <div className="flex gap-2 flex-wrap">
                {trajetsByStatus.map((s) => (
                  <Badge key={s.status} variant="outline" className="text-xs">
                    {statusLabels[s.status] || s.status}: {s._count.id}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Billets</h4>
              <div className="flex gap-2 flex-wrap">
                {billetsByStatus.map((s) => {
                  const colors: Record<string, string> = {
                    sold: "bg-sky-100 text-sky-700",
                    boarded: "bg-emerald-100 text-emerald-700",
                    absent: "bg-rose-100 text-rose-700",
                    cancelled: "bg-slate-100 text-slate-700",
                  };
                  return (
                    <Badge key={s.status} className={`text-xs ${colors[s.status] || ""}`}>
                      {statusLabels[s.status] || s.status}: {s._count.id}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t">
              <h4 className="text-sm font-medium mb-2">Utilisation des fonctionnalités</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Smartphone className="h-4 w-4 text-emerald-600" />
                  <span>QR Scan: <Badge variant="outline" className="text-[10px]">Actif</Badge></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mic className="h-4 w-4 text-violet-600" />
                  <span>TTS: {featureUsage.voiceConfig} config(s)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Bus className="h-4 w-4 text-sky-600" />
                  <span>Chauffeurs actifs: {featureUsage.activeDrivers}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-amber-600" />
                  <span>Clients actifs: {featureUsage.activeClients}</span>
                </div>
                <div className="flex items-center gap-2 text-sm col-span-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span>Fiabilité moyenne: {featureUsage.avgReliability ? featureUsage.avgReliability.toFixed(1) : "—"}/100</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ROI Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ROI par compagnie</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Compagnie</TableHead>
                  <TableHead className="text-xs text-right">Coût/mois</TableHead>
                  <TableHead className="text-xs text-right">Billets</TableHead>
                  <TableHead className="text-xs text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roiData.map((r) => (
                  <TableRow key={r.tenantName}>
                    <TableCell className="text-sm font-medium">{r.tenantName}</TableCell>
                    <TableCell className="text-xs text-right">{formatFCFA(r.monthlyCost)}</TableCell>
                    <TableCell className="text-xs text-right">{r.billetCount}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={`text-xs ${parseFloat(r.roi) >= 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"}`}
                      >
                        {parseFloat(r.roi) >= 0 ? "+" : ""}{r.roi}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}