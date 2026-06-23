"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  Users,
  Bus,
  Route,
  FileText,
  Palette,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Globe,
  AlertTriangle,
  CreditCard,
  BarChart3,
} from "lucide-react";
import {
  formatFCFA,
  getSubscriptionStatusConfig,
  getInvoiceStatusConfig,
  getPlanLabel,
} from "@/lib/superadmin-utils";

/* ─── Types ─── */

interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  phone: string;
}

interface TenantBus {
  id: string;
  number: string;
  capacity: number;
  isActive: boolean;
}

interface TenantTrajet {
  id: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  price: number;
  status: string;
  createdAt: string;
}

interface TenantInvoice {
  id: string;
  invoiceNumber: string | null;
  invoiceDate: string;
  dueDate: string;
  total: number;
  status: string;
  paidAt: string | null;
  numberOfBuses: number;
  pricePerBus: number;
}

interface TenantSubscription {
  id: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string;
  pricePerBus: number;
  busCount: number;
  totalAmount: number;
}

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  country: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  primaryColor: string;
  secondaryColor: string;
  plan: string;
  subscriptionStatus: string;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  totalBuses: number;
  monthlyPrice: number;
  adminEmail: string | null;
  adminPhone: string | null;
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason: string | null;
  suspendedAt: string | null;
  totalRevenue: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  users: TenantUser[];
  buses: TenantBus[];
  trajets: TenantTrajet[];
  invoices: TenantInvoice[];
  subscriptions: TenantSubscription[];
}

/* ─── Constants ─── */

const trajetStatusConfig: Record<
  string,
  { label: string; cls: string }
> = {
  scheduled: {
    label: "Programmé",
    cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  },
  boarding: {
    label: "Embarquement",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  departed: {
    label: "En route",
    cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  arrived: {
    label: "Arrivé",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  cancelled: {
    label: "Annulé",
    cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  },
};

const tenantStatusConfig: Record<
  string,
  { label: string; cls: string }
> = {
  active: {
    label: "Actif",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  suspended: {
    label: "Suspendu",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  inactive: {
    label: "Inactif",
    cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  },
};

const roleBadgeCls: Record<string, string> = {
  superadmin:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  admin: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  agent:
    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  client:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
};

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTenantStatus(t: TenantDetail): string {
  if (t.isSuspended) return "suspended";
  if (t.isActive) return "active";
  return "inactive";
}

/* ─── Loading Skeleton ─── */

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
      </div>
      {/* Tab bar skeleton */}
      <Skeleton className="h-10 w-96" />
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/* ─── Info Row Helper ─── */

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number | null | undefined;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && (
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */

function StatCard({
  icon: Icon,
  label,
  value,
  accent = "violet",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent?: string;
}) {
  const accentMap: Record<string, string> = {
    violet: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    sky: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${accentMap[accent] ?? accentMap.violet}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

/* ─── Empty State ─── */

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <Icon className="h-12 w-12 stroke-1" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

/* ─── Main Component ─── */

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    fetch(`/api/superadmin/tenants/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Compagnie non trouvée");
        return res.json();
      })
      .then((data) => {
        setTenant(data);
      })
      .catch((err) => {
        setError(err.message || "Erreur de chargement");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) return <DetailSkeleton />;

  if (error || !tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="h-12 w-12 text-amber-500 stroke-1" />
        <p className="text-sm font-medium text-muted-foreground">{error || "Compagnie introuvable"}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }

  const status = getTenantStatus(tenant);
  const statusMeta = tenantStatusConfig[status];
  const subConfig = getSubscriptionStatusConfig(tenant.subscriptionStatus);
  const currentSub = tenant.subscriptions[0];

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">
              {tenant.name}
            </h1>
            <p className="text-sm text-muted-foreground truncate">
              @{tenant.slug} &middot; Créée le {formatDate(tenant.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`${statusMeta?.cls ?? ""} text-xs`}>
            {statusMeta?.label ?? status}
          </Badge>
          <Badge variant="outline" className="capitalize text-xs bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
            {getPlanLabel(tenant.plan)}
          </Badge>
        </div>
      </div>

      {/* ─── Suspension Banner ─── */}
      {tenant.isSuspended && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Entreprise suspendue</p>
            {tenant.suspensionReason && (
              <p className="mt-1 opacity-90">
                Raison : {tenant.suspensionReason}
              </p>
            )}
            {tenant.suspendedAt && (
              <p className="mt-1 text-xs opacity-75">
                Suspendu le {formatDateTime(tenant.suspendedAt)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Vue d&apos;ensemble
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-4 w-4" />
            Utilisateurs
            <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">
              {tenant.users.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="buses" className="gap-1.5">
            <Bus className="h-4 w-4" />
            Bus
            <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">
              {tenant.buses.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="trajets" className="gap-1.5">
            <Route className="h-4 w-4" />
            Trajets
            <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">
              {tenant.trajets.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Factures
            <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">
              {tenant.invoices.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ TAB 1: OVERVIEW ═══════════════════ */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard
              icon={Users}
              label="Utilisateurs"
              value={tenant.users.length}
              accent="violet"
            />
            <StatCard
              icon={Bus}
              label="Bus"
              value={tenant.buses.length}
              accent="sky"
            />
            <StatCard
              icon={Route}
              label="Trajets"
              value={tenant.trajets.length}
              accent="emerald"
            />
            <StatCard
              icon={FileText}
              label="Factures"
              value={tenant.invoices.length}
              accent="amber"
            />
            <StatCard
              icon={CreditCard}
              label="Revenu total"
              value={formatFCFA(tenant.totalRevenue)}
              accent="emerald"
            />
          </div>

          {/* Info cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Identité */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-violet-500" />
                  Identité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label="Nom" value={tenant.name} />
                <InfoRow label="Slug" value={`@${tenant.slug}`} />
                <InfoRow label="Email admin" value={tenant.adminEmail} icon={Mail} />
                <InfoRow label="Téléphone" value={tenant.adminPhone} icon={Phone} />
                <InfoRow label="Pays" value={tenant.country} icon={Globe} />
                <InfoRow label="Adresse" value={tenant.address} icon={MapPin} />
              </CardContent>
            </Card>

            {/* Abonnement */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-violet-500" />
                  Abonnement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <div className="flex items-start gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Plan</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm font-medium capitalize">
                        {getPlanLabel(tenant.plan)}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${subConfig.className}`}
                      >
                        {subConfig.label}
                      </Badge>
                    </div>
                  </div>
                </div>
                <InfoRow
                  label="Date de début"
                  value={formatDate(tenant.subscriptionStart)}
                  icon={Calendar}
                />
                <InfoRow
                  label="Date de fin"
                  value={formatDate(tenant.subscriptionEnd)}
                  icon={Calendar}
                />
                {currentSub && (
                  <>
                    <InfoRow
                      label="Nombre de bus"
                      value={`${currentSub.busCount} bus`}
                      icon={Bus}
                    />
                    <InfoRow
                      label="Prix par bus"
                      value={formatFCFA(currentSub.pricePerBus)}
                    />
                    <InfoRow
                      label="Montant total"
                      value={formatFCFA(currentSub.totalAmount)}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Branding & SEO */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="h-4 w-4 text-violet-500" />
                  Branding &amp; SEO
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <div className="flex items-start gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-1.5">Couleurs</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded-md border"
                          style={{ backgroundColor: tenant.primaryColor }}
                        />
                        <span className="text-xs font-mono text-muted-foreground">
                          {tenant.primaryColor}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded-md border"
                          style={{ backgroundColor: tenant.secondaryColor }}
                        />
                        <span className="text-xs font-mono text-muted-foreground">
                          {tenant.secondaryColor}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <InfoRow label="SEO Title" value={tenant.seoTitle} />
                <InfoRow label="SEO Description" value={tenant.seoDescription} />
                <InfoRow label="SEO Keywords" value={tenant.seoKeywords} />
              </CardContent>
            </Card>

            {/* Dernière activité */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-violet-500" />
                  Activité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow
                  label="Dernière connexion"
                  value={formatDateTime(tenant.lastLoginAt)}
                />
                <InfoRow
                  label="Date de création"
                  value={formatDateTime(tenant.createdAt)}
                />
                <InfoRow
                  label="Dernière mise à jour"
                  value={formatDateTime(tenant.updatedAt)}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════ TAB 2: USERS ═══════════════════ */}
        <TabsContent value="users" className="mt-4">
          {tenant.users.length === 0 ? (
            <EmptyState icon={Users} message="Aucun utilisateur trouvé pour cette entreprise" />
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-10">Nom</TableHead>
                    <TableHead className="h-10">Email</TableHead>
                    <TableHead className="h-10">Rôle</TableHead>
                    <TableHead className="h-10">Téléphone</TableHead>
                    <TableHead className="h-10">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.users.map((user, idx) => (
                    <TableRow
                      key={user.id}
                      className={idx % 2 === 0 ? "bg-muted/20" : ""}
                    >
                      <TableCell className="font-medium text-sm">
                        {user.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${roleBadgeCls[user.role] ?? roleBadgeCls.client} text-xs capitalize`}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.phone || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            user.isActive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {user.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════ TAB 3: BUS ═══════════════════ */}
        <TabsContent value="buses" className="mt-4">
          {tenant.buses.length === 0 ? (
            <EmptyState icon={Bus} message="Aucun bus enregistré pour cette entreprise" />
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-10">Numéro</TableHead>
                    <TableHead className="h-10">Capacité</TableHead>
                    <TableHead className="h-10">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.buses.map((bus, idx) => (
                    <TableRow
                      key={bus.id}
                      className={idx % 2 === 0 ? "bg-muted/20" : ""}
                    >
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-2">
                          <Bus className="h-4 w-4 text-muted-foreground" />
                          {bus.number}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {bus.capacity} places
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            bus.isActive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {bus.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════ TAB 4: TRAJETS ═══════════════════ */}
        <TabsContent value="trajets" className="mt-4">
          {tenant.trajets.length === 0 ? (
            <EmptyState icon={Route} message="Aucun trajet enregistré pour cette entreprise" />
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-10">Origine</TableHead>
                    <TableHead className="h-10">Destination</TableHead>
                    <TableHead className="h-10">Date</TableHead>
                    <TableHead className="h-10">Heure</TableHead>
                    <TableHead className="h-10">Prix</TableHead>
                    <TableHead className="h-10">Statut</TableHead>
                    <TableHead className="h-10">Créé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.trajets.map((trajet, idx) => {
                    const tsc = trajetStatusConfig[trajet.status];
                    return (
                      <TableRow
                        key={trajet.id}
                        className={idx % 2 === 0 ? "bg-muted/20" : ""}
                      >
                        <TableCell className="text-sm font-medium">
                          {trajet.origin}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {trajet.destination}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(trajet.date)}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {trajet.time}
                        </TableCell>
                        <TableCell className="text-sm font-medium tabular-nums">
                          {formatFCFA(trajet.price)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${tsc?.cls ?? ""}`}
                          >
                            {tsc?.label ?? trajet.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(trajet.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════ TAB 5: INVOICES ═══════════════════ */}
        <TabsContent value="invoices" className="mt-4">
          {tenant.invoices.length === 0 ? (
            <EmptyState icon={FileText} message="Aucune facture pour cette entreprise" />
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-10">N° Facture</TableHead>
                    <TableHead className="h-10">Date</TableHead>
                    <TableHead className="h-10">Montant total</TableHead>
                    <TableHead className="h-10">Statut</TableHead>
                    <TableHead className="h-10">Payée le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.invoices.map((invoice, idx) => {
                    const invConfig = getInvoiceStatusConfig(invoice.status);
                    return (
                      <TableRow
                        key={invoice.id}
                        className={idx % 2 === 0 ? "bg-muted/20" : ""}
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          {invoice.invoiceNumber || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(invoice.invoiceDate)}
                        </TableCell>
                        <TableCell className="text-sm font-medium tabular-nums">
                          {formatFCFA(invoice.total)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${invConfig.className}`}
                          >
                            {invConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTime(invoice.paidAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}