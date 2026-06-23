"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Building2, Search, Eye, Power, PowerOff, UserCog, CheckCircle2, XCircle, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  plan: string;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; buses: number; trajets: number; invoices: number };
  subscriptions: { id: string; status: string; plan: string; totalAmount: number; busCount: number; endDate: string }[];
}

interface TenantDetail extends Tenant {
  users: { id: string; name: string; email: string; role: string; isActive: boolean }[];
  buses: { id: string; number: string; capacity: number; isActive: boolean }[];
  invoices: { id: string; number: string; amount: number; status: string; dueDate: string; paidAt: string | null; createdAt: string }[];
}

const planColors: Record<string, string> = {
  starter: "bg-slate-100 text-slate-700",
  pro: "bg-emerald-100 text-emerald-700",
  enterprise: "bg-amber-100 text-amber-700",
};

const statusColors: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-rose-100 text-rose-700",
  overdue: "bg-rose-100 text-rose-700",
};

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [editPlan, setEditPlan] = useState("");
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [impersonateUser, setImpersonateUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);

  // Create tenant
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    plan: "starter" as string,
    country: "SN",
  });
  const slugManuallyEdited = useRef(false);

  // Credentials dialog
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/tenants");
      const data = await res.json();
      setTenants(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = async (tenant: Tenant) => {
    const newVal = !tenant.isActive;
    await fetch("/api/superadmin/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: tenant.id, isActive: newVal }),
    });
    toast.success(newVal ? `${tenant.name} activée` : `${tenant.name} désactivée`);
    fetchTenants();
  };

  const handlePlanChange = async () => {
    if (!selectedTenant || !editPlan) return;
    await fetch(`/api/superadmin/${selectedTenant.id}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: editPlan }),
    });
    toast.success(`Plan mis à jour vers ${editPlan}`);
    setEditPlanOpen(false);
    fetchTenants();
    const detail = await (await fetch(`/api/superadmin/tenants/${selectedTenant.id}`)).json();
    setSelectedTenant(detail);
  };

  const openDetail = async (tenant: Tenant) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}`);
      const data = await res.json();
      setSelectedTenant(data);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleImpersonate = async () => {
    if (!impersonateUser) return;
    try {
      const res = await fetch("/api/superadmin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: impersonateUser.id }),
      });
      const data = await res.json();
      document.cookie = `next-auth.session-token=${data.token}; path=/; max-age=3600`;
      toast.success(`Connecté en tant que ${data.user.name}`);
      setImpersonateOpen(false);

      const roleRoutes: Record<string, string> = { admin: "/admin", agent: "/agent", client: "/client" };
      router.push(roleRoutes[impersonateUser.role] || "/");
      router.refresh();
    } catch {
      toast.error("Erreur lors de l'impersonation");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entreprises</h1>
          <p className="text-muted-foreground">Gérez les compagnies clientes et leurs abonnements.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une entreprise..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => { setCreateForm({ name: "", slug: "", adminName: "", adminEmail: "", adminPhone: "", plan: "starter", country: "SN" }); slugManuallyEdited.current = false; setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Créer une entreprise
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 space-y-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-6 w-20" /><Skeleton className="h-3 w-24" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tenant) => {
            const sub = tenant.subscriptions[0];
            return (
              <Card key={tenant.id} className={`transition-all ${!tenant.isActive ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-rose-50 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-rose-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{tenant.name}</h3>
                        <p className="text-xs text-muted-foreground">@{tenant.slug}</p>
                      </div>
                    </div>
                    <Badge variant={tenant.isActive ? "default" : "secondary"} className="text-[10px]">
                      {tenant.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="mt-4 flex gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] ${planColors[tenant.plan] || ""}`}>{tenant.plan}</Badge>
                    {sub && <Badge variant="outline" className="text-[10px]">{sub.busCount} bus</Badge>}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="text-lg font-bold">{tenant._count.users}</div>
                      <div className="text-[10px] text-muted-foreground">Utilisateurs</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="text-lg font-bold">{tenant._count.buses}</div>
                      <div className="text-[10px] text-muted-foreground">Bus</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="text-lg font-bold">{tenant._count.trajets}</div>
                      <div className="text-[10px] text-muted-foreground">Trajets</div>
                    </div>
                  </div>

                  {sub && (
                    <div className="mt-3 text-xs text-muted-foreground flex justify-between items-center">
                      <span>{new Intl.NumberFormat("fr-FR").format(sub.totalAmount)} FCFA/mois</span>
                      <span>Exp: {new Date(sub.endDate).toLocaleDateString("fr-FR")}</span>
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openDetail(tenant)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Détail
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(tenant)}
                      className={tenant.isActive ? "text-rose-600 hover:text-rose-700" : "text-emerald-600 hover:text-emerald-700"}
                    >
                      {tenant.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tenant Detail Dialog */}
      <Dialog open={!!selectedTenant} onOpenChange={(open) => { if (!open) setSelectedTenant(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailLoading ? (
            <div className="space-y-4 p-4"><Skeleton className="h-6 w-48" /><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>
          ) : selectedTenant ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Building2 className="h-5 w-5" />
                  {selectedTenant.name}
                  <Badge className={planColors[selectedTenant.plan]}>{selectedTenant.plan}</Badge>
                  <Badge variant={selectedTenant.isActive ? "default" : "secondary"}>
                    {selectedTenant.isActive ? "Active" : "Inactive"}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              {/* Subscription */}
              {selectedTenant.subscriptions[0] && (
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-semibold text-sm">Abonnement</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-muted-foreground text-xs">Plan</span><p className="font-medium">{selectedTenant.subscriptions[0].plan}</p></div>
                    <div><span className="text-muted-foreground text-xs">Bus</span><p className="font-medium">{selectedTenant.subscriptions[0].busCount}</p></div>
                    <div><span className="text-muted-foreground text-xs">Montant</span><p className="font-medium">{new Intl.NumberFormat("fr-FR").format(selectedTenant.subscriptions[0].totalAmount)} FCFA</p></div>
                    <div><span className="text-muted-foreground text-xs">Expiration</span><p className="font-medium">{new Date(selectedTenant.subscriptions[0].endDate).toLocaleDateString("fr-FR")}</p></div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => { setEditPlan(selectedTenant.plan); setEditPlanOpen(true); }}>
                    Modifier l&apos;abonnement
                  </Button>
                </div>
              )}

              {/* Users */}
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold text-sm mb-3">Utilisateurs ({selectedTenant._count.users})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedTenant.users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => { setImpersonateUser(u); setImpersonateOpen(true); }}
                        >
                          <UserCog className="h-3 w-3 mr-1" /> Impersonate
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invoices */}
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold text-sm mb-3">Dernières factures</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedTenant.invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{inv.number}</span>
                        <Badge className={`text-[10px] ${statusColors[inv.status] || ""}`}>{inv.status}</Badge>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium">{new Intl.NumberFormat("fr-FR").format(inv.amount)} FCFA</p>
                        <p className="text-xs text-muted-foreground">{new Date(inv.dueDate).toLocaleDateString("fr-FR")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l&apos;abonnement</DialogTitle>
          </DialogHeader>
          <Select value={editPlan} onValueChange={setEditPlan}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlanOpen(false)}>Annuler</Button>
            <Button onClick={handlePlanChange}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Tenant Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); fetchTenants(); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer une entreprise</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setCreateLoading(true);
              try {
                const res = await fetch("/api/superadmin/tenants", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(createForm),
                });
                if (!res.ok) {
                  const err = await res.json();
                  toast.error(err.error || "Erreur lors de la création");
                  return;
                }
                const data = await res.json();
                setCredentials({ email: data.adminEmail, password: data.generatedPassword });
                setCreateOpen(false);
                setCredentialsOpen(true);
                toast.success("Entreprise créée avec succès !");
                fetchTenants();
              } catch {
                toast.error("Erreur lors de la création");
              } finally {
                setCreateLoading(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="create-name">Nom de la compagnie *</Label>
              <Input
                id="create-name"
                required
                value={createForm.name}
                onChange={(e) => {
                  setCreateForm((f) => ({ ...f, name: e.target.value }));
                  if (!slugManuallyEdited.current) {
                    const slug = e.target.value
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/(^-|-$)/g, "");
                    setCreateForm((f) => ({ ...f, slug }));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-slug">Slug *</Label>
              <Input
                id="create-slug"
                required
                value={createForm.slug}
                onChange={(e) => {
                  slugManuallyEdited.current = true;
                  setCreateForm((f) => ({ ...f, slug: e.target.value }));
                }}
              />
              <p className="text-xs text-muted-foreground">Identifiant unique (ex: dakar-express)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-admin-name">Nom de l&apos;administrateur *</Label>
              <Input
                id="create-admin-name"
                required
                value={createForm.adminName}
                onChange={(e) => setCreateForm((f) => ({ ...f, adminName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-admin-email">Email admin *</Label>
              <Input
                id="create-admin-email"
                type="email"
                required
                value={createForm.adminEmail}
                onChange={(e) => setCreateForm((f) => ({ ...f, adminEmail: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-admin-phone">Téléphone admin *</Label>
              <Input
                id="create-admin-phone"
                required
                value={createForm.adminPhone}
                onChange={(e) => setCreateForm((f) => ({ ...f, adminPhone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-plan">Plan</Label>
              <Select value={createForm.plan} onValueChange={(v) => setCreateForm((f) => ({ ...f, plan: v }))}>
                <SelectTrigger id="create-plan"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-country">Pays</Label>
              <Input
                id="create-country"
                value={createForm.country}
                onChange={(e) => setCreateForm((f) => ({ ...f, country: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Entreprise créée avec succès !
            </DialogTitle>
          </DialogHeader>
          {credentials && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-mono text-sm font-medium">{credentials.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mot de passe</p>
                  <p className="font-mono text-sm font-medium">{credentials.password}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>Partagez ces identifiants avec l&apos;administrateur. Ce mot de passe ne sera plus affiché.</p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(`Email: ${credentials.email}\nMot de passe: ${credentials.password}`);
                  toast.success("Identifiants copiés dans le presse-papiers");
                }}
              >
                Copier les identifiants
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredentialsOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impersonate Confirm Dialog */}
      <Dialog open={impersonateOpen} onOpenChange={setImpersonateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l&apos;impersonation</DialogTitle>
          </DialogHeader>
          {impersonateUser && (
            <div className="text-sm space-y-2">
              <p>Vous allez vous connecter en tant que :</p>
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="font-medium">{impersonateUser.name}</p>
                <p className="text-muted-foreground text-xs">{impersonateUser.email}</p>
                <Badge variant="outline" className="mt-1 text-[10px]">{impersonateUser.role}</Badge>
              </div>
              <p className="text-amber-600 text-xs flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Vous pourrez revenir à votre compte SuperAdmin en vous déconnectant.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpersonateOpen(false)}>Annuler</Button>
            <Button onClick={handleImpersonate}>Se connecter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}