"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, Building2, Bus, Users, Receipt, Activity } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface KPIs {
  activeTenantCount: number;
  mrr: number;
  prevMrr: number;
  mrrGrowth: string;
  totalBusCount: number;
  monthlyBillets: number;
}

interface Alert {
  type: string;
  message: string;
  tenantName?: string;
  severity: "error" | "warning";
}

interface Log {
  id: string;
  level: string;
  action: string;
  message: string;
  createdAt: string;
}

interface DashboardData {
  kpis: KPIs;
  mrrHistory: { month: string; mrr: number }[];
  alerts: Alert[];
  recentLogs: Log[];
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/superadmin/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { kpis, mrrHistory, alerts, recentLogs } = data;
  const isGrowthPositive = parseFloat(kpis.mrrGrowth) >= 0;

  const kpiCards = [
    { title: "Compagnies actives", value: kpis.activeTenantCount, icon: Building2, color: "text-emerald-600", bgColor: "bg-emerald-50" },
    { title: "MRR", value: formatFCFA(kpis.mrr), icon: Receipt, color: "text-amber-600", bgColor: "bg-amber-50", sub: `${isGrowthPositive ? "+" : ""}${kpis.mrrGrowth}% vs mois préc.`, positive: isGrowthPositive },
    { title: "Bus connectés", value: kpis.totalBusCount, icon: Bus, color: "text-sky-600", bgColor: "bg-sky-50" },
    { title: "Passagers / mois", value: kpis.monthlyBillets, icon: Users, color: "text-violet-600", bgColor: "bg-violet-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vue d&apos;ensemble SuperAdmin</h1>
        <p className="text-muted-foreground">
          Supervisez la plateforme Bus Go, les abonnements et les compagnies clientes.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.sub && (
                <div className={`flex items-center gap-1 text-xs mt-1 ${stat.positive ? "text-emerald-600" : "text-rose-600"}`}>
                  {stat.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stat.sub}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* MRR Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Croissance du MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mrrHistory}>
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatFCFA(value), "MRR"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13 }}
                  />
                  <Area type="monotone" dataKey="mrr" stroke="#f43f5e" strokeWidth={2} fill="url(#mrrGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune alerte active.</p>
            ) : (
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                      alert.severity === "error"
                        ? "bg-rose-50 text-rose-800 border border-rose-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      {alert.tenantName && <p className="opacity-75 mt-0.5">{alert.tenantName}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={log.level === "error" ? "destructive" : log.level === "warning" ? "secondary" : "outline"}
                      className="text-[10px] uppercase w-14 justify-center"
                    >
                      {log.level}
                    </Badge>
                    <span className="text-sm">{log.message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {new Date(log.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}