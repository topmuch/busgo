import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Bus, Ticket, TrendingUp } from "lucide-react";

export default async function SuperAdminDashboard() {
  const [tenantCount, userCount, busCount, trajetCount, billetCount] =
    await Promise.all([
      db.tenant.count(),
      db.user.count(),
      db.bus.count(),
      db.trajet.count(),
      db.billet.count(),
    ]);

  const stats = [
    { title: "Entreprises", value: tenantCount, icon: Building2, color: "text-emerald-600" },
    { title: "Utilisateurs", value: userCount, icon: Users, color: "text-sky-600" },
    { title: "Bus", value: busCount, icon: Bus, color: "text-amber-600" },
    { title: "Trajets", value: trajetCount, icon: Ticket, color: "text-violet-600" },
    { title: "Billets vendus", value: billetCount, icon: TrendingUp, color: "text-rose-600" },
  ];

  const tenants = await db.tenant.findMany({
    include: {
      _count: { select: { users: true, buses: true, trajets: true } },
    },
    take: 5,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Vue d&apos;ensemble SuperAdmin
        </h1>
        <p className="text-muted-foreground">
          Gérez toutes les entreprises et la plateforme Bus Go.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          <CardTitle className="text-lg">Entreprises récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucune entreprise enregistrée.
            </p>
          ) : (
            <div className="space-y-3">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        @{tenant.slug} · Plan {tenant.plan}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{tenant._count.users} users</span>
                    <span>{tenant._count.buses} bus</span>
                    <span>{tenant._count.trajets} trajets</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}