import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import {
  Bus,
  Ticket,
  Users,
  TrendingUp,
  MapPin,
  ScanLine,
  Plus,
} from "lucide-react";
import Link from "next/link";
import {
  GradientHeader,
  ColoredKpiCard,
  ContentCard,
} from "@/components/dashboard/design-system";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await getServerSession();
  const tenantId = session?.user?.tenantId;

  const [busCount, trajetCount, userCount, billetCount] = await Promise.all([
    db.bus.count({ where: tenantId ? { tenantId } : undefined }),
    db.trajet.count({ where: tenantId ? { tenantId } : undefined }),
    db.user.count({ where: tenantId ? { tenantId, role: "agent" } : undefined }),
    db.billet.count({
      where: tenantId ? { trajet: { tenantId } } : undefined,
    }),
  ]);

  // Recent activity: 5 last billets
  const recentBillets = await db.billet.findMany({
    where: tenantId ? { trajet: { tenantId } } : undefined,
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      trajet: { select: { origin: true, destination: true, date: true, time: true } },
      client: { select: { name: true } },
    },
  });

  // Today's trajets
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayTrajets = await db.trajet.findMany({
    where: { tenantId, date: { gte: today, lt: tomorrow } },
    include: { bus: true, _count: { select: { billets: true } } },
    orderBy: { time: "asc" },
    take: 5,
  });

  return (
    <div className="space-y-6 pb-6">
      {/* ─── Gradient Header ─── */}
      <GradientHeader
        title={`Bonjour, ${session?.user?.name?.split(" ")[0] ?? "Admin"}`}
        subtitle={`Voici un aperçu de l'activité de ${session?.user?.tenantName ?? "votre compagnie"}.`}
        badges={[
          "Multi-agents",
          "Vue temps réel",
          "Rapports détaillés",
          "Gestion flotte",
        ]}
        actions={
          <Link href="/admin/guichet">
            <Button className="bg-white text-[#4A90E2] hover:bg-white/90 shadow-md">
              <ScanLine className="h-4 w-4 mr-2" />
              Ouvrir le guichet
            </Button>
          </Link>
        }
      />

      {/* ─── KPI Cards (4 colored) ─── */}
      <div className="px-6 -mt-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ColoredKpiCard
            title="Bus actifs"
            value={busCount}
            icon={Bus}
            color="orange"
            trend="Flotte totale"
            trendUp
            hint="Véhicules en service"
          />
          <ColoredKpiCard
            title="Trajets planifiés"
            value={trajetCount}
            icon={Ticket}
            color="violet"
            trend={`${todayTrajets.length} aujourd'hui`}
            trendUp
            hint="Total cumulé"
          />
          <ColoredKpiCard
            title="Agents"
            value={userCount}
            icon={Users}
            color="green"
            trend="Équipe terrain"
            trendUp
            hint="Comptes actifs"
          />
          <ColoredKpiCard
            title="Billets vendus"
            value={billetCount.toLocaleString("fr-FR")}
            icon={TrendingUp}
            color="blue"
            trend="Total cumulé"
            trendUp
            hint="Tous trajets confondus"
          />
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="px-6 grid gap-6 lg:grid-cols-3">
        {/* Trajets du jour (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <ContentCard
            title="Trajets du jour"
            actions={
              <Link href="/admin/trajets">
                <Button variant="ghost" size="sm" className="text-[#4A90E2]">
                  Voir tous
                </Button>
              </Link>
            }
          >
            {todayTrajets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <MapPin className="h-7 w-7 text-slate-400" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  Aucun trajet aujourd&apos;hui
                </p>
                <Link href="/admin/trajets">
                  <Button variant="outline" size="sm" className="mt-3">
                    <Plus className="h-4 w-4 mr-1" />
                    Créer un trajet
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTrajets.map((trajet) => (
                  <div
                    key={trajet.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 hover:border-[#4A90E2] hover:bg-blue-50/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex flex-col items-center justify-center rounded-lg bg-slate-100 px-3 py-2 min-w-[64px]">
                        <span className="text-sm font-bold text-slate-800">
                          {trajet.time}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                          <MapPin className="h-3.5 w-3.5 text-[#4A90E2] shrink-0" />
                          <span className="truncate">{trajet.origin}</span>
                          <span className="text-slate-400 mx-0.5">→</span>
                          <span className="truncate">{trajet.destination}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Bus {trajet.bus.number} · {trajet._count.billets}/
                          {trajet.bus.capacity} passagers
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 w-20 rounded-full bg-slate-200 overflow-hidden shrink-0">
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
                  </div>
                ))}
              </div>
            )}
          </ContentCard>

          {/* Recent billets */}
          <ContentCard
            title="Derniers billets vendus"
            actions={
              <Link href="/admin/rapports">
                <Button variant="ghost" size="sm" className="text-[#4A90E2]">
                  Rapports
                </Button>
              </Link>
            }
          >
            {recentBillets.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Aucun billet vendu pour le moment.
              </p>
            ) : (
              <div className="space-y-2">
                {recentBillets.map((billet) => (
                  <div
                    key={billet.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4A90E2]/10 shrink-0">
                        <Ticket className="h-4 w-4 text-[#4A90E2]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {billet.client?.name ?? "Client"}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {billet.trajet.origin} → {billet.trajet.destination}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-slate-700">
                        Siège {billet.seatNumber}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(billet.createdAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ContentCard>
        </div>

        {/* Right column — quick actions */}
        <div className="space-y-6">
          <ContentCard title="Actions rapides">
            <div className="space-y-2">
              <Link
                href="/admin/buses"
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:border-[#F97316] hover:bg-orange-50/30 transition-colors group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F97316]/10 group-hover:bg-[#F97316]/20">
                  <Bus className="h-5 w-5 text-[#F97316]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">Gérer les bus</p>
                  <p className="text-xs text-slate-500">Flotte & capacités</p>
                </div>
              </Link>
              <Link
                href="/admin/trajets"
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:border-[#8B5CF6] hover:bg-violet-50/30 transition-colors group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/10 group-hover:bg-[#8B5CF6]/20">
                  <Ticket className="h-5 w-5 text-[#8B5CF6]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">Créer un trajet</p>
                  <p className="text-xs text-slate-500">Planifier une route</p>
                </div>
              </Link>
              <Link
                href="/admin/voix"
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:border-[#10B981] hover:bg-emerald-50/30 transition-colors group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#10B981]/10 group-hover:bg-[#10B981]/20">
                  <Users className="h-5 w-5 text-[#10B981]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">Voix & annonces</p>
                  <p className="text-xs text-slate-500">Configuration TTS</p>
                </div>
              </Link>
              <Link
                href="/admin/rapports"
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:border-[#3B82F6] hover:bg-blue-50/30 transition-colors group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3B82F6]/10 group-hover:bg-[#3B82F6]/20">
                  <TrendingUp className="h-5 w-5 text-[#3B82F6]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">Rapports</p>
                  <p className="text-xs text-slate-500">Statistiques détaillées</p>
                </div>
              </Link>
            </div>
          </ContentCard>
        </div>
      </div>
    </div>
  );
}
