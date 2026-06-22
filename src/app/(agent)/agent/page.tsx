import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanLine, Ticket, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function AgentDashboard() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayTrajets = await db.trajet.findMany({
    where: {
      tenantId,
      date: { gte: today, lt: tomorrow },
    },
    include: { bus: true, _count: { select: { billets: true } } },
    orderBy: { time: "asc" },
    take: 10,
  });

  const activeBillets = await db.billet.count({
    where: {
      status: "sold",
      trajet: { tenantId, date: { gte: today, lt: tomorrow } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Tableau de bord Agent
        </h1>
        <p className="text-muted-foreground">
          Bienvenue, {session?.user?.name}. Gérez vos embarquements du jour.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Trajets aujourd&apos;hui
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayTrajets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Billets à valider
            </CardTitle>
            <ScanLine className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBillets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Billets total</CardTitle>
            <Ticket className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayTrajets.reduce((acc, t) => acc + t._count.billets, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prochains départs</CardTitle>
        </CardHeader>
        <CardContent>
          {todayTrajets.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucun trajet prévu aujourd&apos;hui.
            </p>
          ) : (
            <div className="space-y-3">
              {todayTrajets.map((trajet) => (
                <div
                  key={trajet.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold">{trajet.time}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <MapPin className="h-3 w-3" />
                        {trajet.origin} → {trajet.destination}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Bus {trajet.bus.number} ({trajet.bus.capacity} places)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        trajet.status === "scheduled"
                          ? "secondary"
                          : trajet.status === "boarding"
                            ? "default"
                            : "destructive"
                      }
                      className="capitalize"
                    >
                      {trajet.status}
                    </Badge>
                    <span className="text-sm font-medium">
                      {trajet._count.billets}/{trajet.bus.capacity}
                    </span>
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