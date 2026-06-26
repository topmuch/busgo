import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ScanLine, Ticket, Clock, MapPin, Bus, Users } from "lucide-react";
import Link from "next/link";
import {
  GradientHeader,
  ColoredKpiCard,
  ContentCard,
  StatusBadge,
} from "@/components/dashboard/design-system";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AgentDashboard() {
  const session = await getServerSession();
  const tenantId = session?.user?.tenantId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayTrajets, activeBillets, totalCapacity] = await Promise.all([
    db.trajet.findMany({
      where: {
        tenantId,
        date: { gte: today, lt: tomorrow },
      },
      include: { bus: true, _count: { select: { billets: true } } },
      orderBy: { time: "asc" },
      take: 10,
    }),
    db.billet.count({
      where: {
        status: "sold",
        trajet: { tenantId, date: { gte: today, lt: tomorrow } },
      },
    }),
    db.bus.aggregate({
      where: { tenantId, isActive: true },
      _sum: { capacity: true },
    }),
  ]);

  const totalBilletsToday = todayTrajets.reduce(
    (acc, t) => acc + t._count.billets,
    0
  );
  const boardingTrajets = todayTrajets.filter(
    (t) => t.status === "boarding"
  ).length;
  const departedTrajets = todayTrajets.filter(
    (t) => t.status === "departed"
  ).length;

  const statusKindMap: Record<string, "success" | "pending" | "danger" | "neutral"> = {
    scheduled: "neutral",
    boarding: "pending",
    departed: "success",
    arrived: "success",
    cancelled: "danger",
  };

  const statusLabel: Record<string, string> = {
    scheduled: "Planifié",
    boarding: "Embarquement",
    departed: "En route",
    arrived: "Arrivé",
    cancelled: "Annulé",
  };

  return (
    <div className="space-y-6 pb-6">
      {/* ─── Gradient Header ─── */}
      <GradientHeader
        title={`Bonjour, ${session?.user?.name?.split(" ")[0] ?? "Agent"}`}
        subtitle="Voici vos embarquements du jour. Scannez les QR codes et suivez les retards en temps réel."
        badges={[
          "Temps réel",
          "Scan QR",
          "Position GPS Live",
          "Alertes vocales",
        ]}
        actions={
          <Link href="/agent/embarquement">
            <Button className="bg-white text-[#4A90E2] hover:bg-white/90 shadow-md">
              <ScanLine className="h-4 w-4 mr-2" />
              Scanner
            </Button>
          </Link>
        }
      />

      {/* ─── KPI Cards (4 colored) ─── */}
      <div className="px-6 -mt-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ColoredKpiCard
            title="Trajets aujourd'hui"
            value={todayTrajets.length}
            icon={Clock}
            color="orange"
            trend={`${boardingTrajets} en embarquement`}
            trendUp
            hint={`Bus ${totalCapacity._sum.capacity ?? 0} places`}
          />
          <ColoredKpiCard
            title="Billets à valider"
            value={activeBillets}
            icon={ScanLine}
            color="violet"
            trend={`${departedTrajets} partis`}
            trendUp
            hint="En attente de scan"
          />
          <ColoredKpiCard
            title="Billets total"
            value={totalBilletsToday}
            icon={Ticket}
            color="green"
            trend="Tous trajets"
            trendUp
            hint="Vendus aujourd'hui"
          />
          <ColoredKpiCard
            title="Bus actifs"
            value={
              new Set(todayTrajets.map((t) => t.busId)).size
            }
            icon={Bus}
            color="blue"
            trend={`${todayTrajets.length - boardingTrajets - departedTrajets} à venir`}
            trendUp
            hint="Sur le terrain"
          />
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="px-6 space-y-6">
        {/* Prochains départs */}
        <ContentCard
          title="Prochains départs"
          actions={
            <Link href="/agent/trajets">
              <Button variant="ghost" size="sm" className="text-[#4A90E2]">
                Voir tous les trajets
              </Button>
            </Link>
          }
        >
          {todayTrajets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <Clock className="h-7 w-7 text-slate-400" />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-700">
                Aucun trajet prévu aujourd&apos;hui
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Les nouveaux trajets apparaîtront ici automatiquement.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTrajets.map((trajet) => (
                <Link
                  key={trajet.id}
                  href={`/agent/embarquement/${trajet.id}`}
                  className="block"
                >
                  <div
                    className={cn(
                      "group flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 transition-all hover:border-[#4A90E2] hover:bg-blue-50/50 hover:shadow-sm"
                    )}
                  >
                    {/* Time block */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex flex-col items-center justify-center rounded-lg bg-slate-100 px-3 py-2 min-w-[64px]">
                        <span className="text-sm font-bold text-slate-800">
                          {trajet.time}
                        </span>
                      </div>

                      {/* Route info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                          <MapPin className="h-3.5 w-3.5 text-[#4A90E2] shrink-0" />
                          <span className="truncate">{trajet.origin}</span>
                          <span className="text-slate-400 mx-0.5">→</span>
                          <span className="truncate">{trajet.destination}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Bus className="h-3 w-3" />
                            {trajet.bus.number}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Users className="h-3 w-3" />
                            {trajet._count.billets}/{trajet.bus.capacity}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge kind={statusKindMap[trajet.status] ?? "neutral"}>
                        {statusLabel[trajet.status] ?? trajet.status}
                      </StatusBadge>
                      <div className="hidden sm:flex items-center">
                        <div className="h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-[#4A90E2] transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                (trajet._count.billets / trajet.bus.capacity) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 ml-1.5 font-medium">
                          {Math.round(
                            (trajet._count.billets / trajet.bus.capacity) * 100
                          )}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ContentCard>
      </div>
    </div>
  );
}
