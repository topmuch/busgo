import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bus, Ticket, Users, TrendingUp } from "lucide-react";

export default async function AdminDashboard() {
  const session = await getServerSession();
  const tenantId = session?.user?.tenantId;

  const [busCount, trajetCount, userCount, billetCount] = await Promise.all([
    db.bus.count({ where: tenantId ? { tenantId } : undefined }),
    db.trajet.count({ where: tenantId ? { tenantId } : undefined }),
    db.user.count({ where: tenantId ? { tenantId } : undefined }),
    db.billet.count({
      where: tenantId
        ? { trajet: { tenantId } }
        : undefined,
    }),
  ]);

  const stats = [
    { title: "Bus actifs", value: busCount, icon: Bus, color: "text-emerald-600" },
    { title: "Trajets planifiés", value: trajetCount, icon: Ticket, color: "text-amber-600" },
    { title: "Utilisateurs", value: userCount, icon: Users, color: "text-sky-600" },
    { title: "Billets vendus", value: billetCount, icon: TrendingUp, color: "text-rose-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord Admin</h1>
        <p className="text-muted-foreground">
          Bienvenue, {session?.user?.name}. Voici un aperçu de votre activité.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4 text-center">
              <Bus className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Ajouter un bus</p>
              <p className="text-xs text-muted-foreground">
                Gérez votre flotte de véhicules
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <Ticket className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Créer un trajet</p>
              <p className="text-xs text-muted-foreground">
                Planifiez de nouvelles routes
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Gérer les agents</p>
              <p className="text-xs text-muted-foreground">
                Ajoutez ou modifiez vos agents
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}