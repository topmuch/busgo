import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, MapPin, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ClientDashboard() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const billets = await db.billet.findMany({
    where: { clientId: userId },
    include: {
      trajet: { include: { bus: true, tenant: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const upcomingBillets = billets.filter(
    (b) =>
      b.status === "sold" &&
      new Date(b.trajet.date) >= new Date()
  );

  const statusLabel: Record<string, string> = {
    sold: "À venir",
    boarded: "Embarqué",
    absent: "Absent",
    cancelled: "Annulé",
  };

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    sold: "secondary",
    boarded: "default",
    absent: "destructive",
    cancelled: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bonjour, {session?.user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Recherchez et réservez vos prochains trajets.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Billets à venir</CardTitle>
            <CalendarDays className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingBillets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total billets</CardTitle>
            <Ticket className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billets.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Mes derniers billets</CardTitle>
          <Link href="/client/billets">
            <Button variant="outline" size="sm">Voir tout</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {billets.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Vous n&apos;avez pas encore de billet.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Recherchez un trajet pour commencer !
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {billets.map((billet) => (
                <div
                  key={billet.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {billet.trajet.origin} → {billet.trajet.destination}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>
                          {new Date(billet.trajet.date).toLocaleDateString("fr-FR")}{" "}
                          à {billet.trajet.time}
                        </span>
                        <span>·</span>
                        <span>Place {billet.seatNumber}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={statusVariant[billet.status]}>
                    {statusLabel[billet.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}