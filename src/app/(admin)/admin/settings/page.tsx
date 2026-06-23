"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Save,
  Plus,
  Trash2,
  Users,
  Truck,
  Crown,
  Check,
  Phone,
  Mail,
  Shield,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TenantData {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  phone: string | null;
  plan: string;
  isActive: boolean;
}

interface AgentData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count: { drivenTrajets: number; buses: number };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const { toast } = useToast();

  /* ---- state ---------------------------------------------------- */
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "agent",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // edit form (section 1)
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AgentData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // create agent loading
  const [creating, setCreating] = useState(false);

  /* ---- data fetching -------------------------------------------- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, agentsRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/agents"),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setTenant(data);
        setEditName(data.name ?? "");
        setEditPhone(data.phone ?? "");
      }

      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- save company info ---------------------------------------- */
  const handleSaveSettings = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, phone: editPhone }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      const updated = await res.json();
      setTenant(updated);
      toast({ title: "Informations mises à jour", description: "Les informations de la compagnie ont été enregistrées." });
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de sauvegarder",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [editName, editPhone, toast]);

  /* ---- create agent --------------------------------------------- */
  const handleCreateAgent = useCallback(async () => {
    if (!newAgent.name.trim() || !newAgent.email.trim() || !newAgent.phone.trim() || !newAgent.password.trim()) {
      toast({
        title: "Champs manquants",
        description: "Tous les champs sont requis.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAgent),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      setShowAddDialog(false);
      setNewAgent({ name: "", email: "", phone: "", password: "", role: "agent" });
      toast({ title: "Agent créé", description: `${newAgent.name} a été ajouté avec succès.` });
      fetchData();
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de créer l'agent",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }, [newAgent, toast, fetchData]);

  /* ---- delete agent --------------------------------------------- */
  const handleDeleteAgent = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/agents/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      toast({ title: "Agent supprimé", description: `${deleteTarget.name} a été supprimé.` });
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de supprimer l'agent",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, toast, fetchData]);

  /* ---- helpers -------------------------------------------------- */
  const drivers = agents.filter(
    (a) => a._count.drivenTrajets > 0 || a._count.buses > 0
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Paramètres
        </h1>
        <p className="text-muted-foreground">
          Gérez les informations de votre compagnie, vos agents et votre abonnement.
        </p>
      </div>

      {/* ============================================================ */}
      {/*  SECTION 1 — Informations Compagnie                          */}
      {/* ============================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Informations Compagnie
          </CardTitle>
          <CardDescription>
            Modifiez les informations de base de votre entreprise.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="company-name">Nom de la compagnie</Label>
              <Input
                id="company-name"
                placeholder="Ma Compagnie"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="company-phone">Téléphone</Label>
              <Input
                id="company-phone"
                placeholder="+225 00 00 00 00"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Slug */}
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <div className="flex h-9 items-center">
                <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                  {tenant?.slug ?? "—"}
                </Badge>
              </div>
            </div>

            {/* Plan */}
            <div className="space-y-1.5">
              <Label>Plan actuel</Label>
              <div className="flex h-9 items-center">
                <Badge
                  variant={tenant?.plan === "pro" ? "default" : "secondary"}
                  className="capitalize gap-1"
                >
                  <Crown className="h-3 w-3" />
                  {tenant?.plan ?? "starter"}
                </Badge>
              </div>
            </div>

            {/* Logo */}
            <div className="space-y-1.5">
              <Label>Logo</Label>
              <div className="flex items-center gap-3 h-9">
                {tenant?.logo ? (
                  <img
                    src={tenant.logo}
                    alt="Logo"
                    className="h-8 w-8 rounded object-contain border"
                  />
                ) : (
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center border">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <span className="text-sm text-muted-foreground">
                  {tenant?.logo ? "Logo actuel" : "Aucun logo"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="gap-2" onClick={handleSaveSettings} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/*  SECTION 2 — Gestion des Agents                              */}
      {/* ============================================================ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Gestion des Agents
            </CardTitle>
            <CardDescription>
              Créez et gérez les comptes agents et administrateurs.
            </CardDescription>
          </div>
          <Button className="gap-2 shrink-0" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4" />
            Ajouter un agent
          </Button>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Users className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Aucun agent enregistré.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Nom</th>
                    <th className="pb-2 pr-4 font-medium hidden sm:table-cell">Email</th>
                    <th className="pb-2 pr-4 font-medium hidden md:table-cell">Téléphone</th>
                    <th className="pb-2 pr-4 font-medium">Rôle</th>
                    <th className="pb-2 pr-4 font-medium text-center hidden lg:table-cell">Trajets</th>
                    <th className="pb-2 pr-4 font-medium">Actif</th>
                    <th className="pb-2 pr-4 font-medium hidden xl:table-cell">Créé le</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y max-h-96 overflow-y-auto">
                  {agents.map((agent) => (
                    <tr key={agent.id} className="group">
                      <td className="py-3 pr-4 font-medium">{agent.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell">
                        {agent.email}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell">
                        {agent.phone ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={agent.role === "admin" ? "default" : "outline"}
                          className="gap-1"
                        >
                          {agent.role === "admin" ? (
                            <Shield className="h-3 w-3" />
                          ) : (
                            <Users className="h-3 w-3" />
                          )}
                          {agent.role}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-center hidden lg:table-cell">
                        {agent._count.drivenTrajets}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={agent.isActive ? "secondary" : "destructive"}
                        >
                          {agent.isActive ? "Oui" : "Non"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground hidden xl:table-cell">
                        {formatDate(agent.createdAt)}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(agent)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/*  SECTION 3 — Gestion des Chauffeurs                          */}
      {/* ============================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" />
            Gestion des Chauffeurs
          </CardTitle>
          <CardDescription>
            Agents assignés à des bus ou ayant effectué des trajets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {drivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Truck className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Aucun chauffeur identifié.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Nom</th>
                    <th className="pb-2 pr-4 font-medium hidden sm:table-cell">Email</th>
                    <th className="pb-2 pr-4 font-medium hidden md:table-cell">Téléphone</th>
                    <th className="pb-2 pr-4 font-medium text-center">Trajets</th>
                    <th className="pb-2 pr-4 font-medium text-center">Bus</th>
                    <th className="pb-2 font-medium">Actif</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {drivers.map((driver) => (
                    <tr key={driver.id}>
                      <td className="py-3 pr-4 font-medium">{driver.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell">
                        {driver.email}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell">
                        {driver.phone ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        {driver._count.drivenTrajets}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        {driver._count.buses}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={driver.isActive ? "secondary" : "destructive"}
                        >
                          {driver.isActive ? "Oui" : "Non"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/*  SECTION 4 — Abonnement                                      */}
      {/* ============================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5" />
            Abonnement
          </CardTitle>
          <CardDescription>
            Votre plan actuel et les options disponibles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Plan actuel</p>
              <p className="text-xl font-bold capitalize flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                {tenant?.plan ?? "starter"}
              </p>
            </div>
            <div className="sm:ml-auto">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  toast({
                    title: "Changer de plan",
                    description: "Contactez l'administration pour modifier votre plan.",
                  })
                }
              >
                <Crown className="h-4 w-4" />
                Changer de plan
              </Button>
            </div>
          </div>

          {/* Plan comparison */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Starter */}
            <div
              className={`relative rounded-xl border-2 p-5 transition-colors ${
                tenant?.plan === "starter"
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              {tenant?.plan === "starter" && (
                <div className="absolute -top-2.5 left-4">
                  <Badge className="gap-1">
                    <Check className="h-3 w-3" />
                    Actuel
                  </Badge>
                </div>
              )}
              <h3 className="font-semibold text-lg mb-3">Starter</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  1 gare
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  50 trajets / mois
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  2 agents
                </li>
              </ul>
            </div>

            {/* Pro */}
            <div
              className={`relative rounded-xl border-2 p-5 transition-colors ${
                tenant?.plan === "pro"
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              {tenant?.plan === "pro" && (
                <div className="absolute -top-2.5 left-4">
                  <Badge className="gap-1">
                    <Check className="h-3 w-3" />
                    Actuel
                  </Badge>
                </div>
              )}
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                Pro
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  5 gares
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  Trajets illimités
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  10 agents
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  Annonces vocales
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/*  DIALOG — Add Agent                                          */}
      {/* ============================================================ */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Ajouter un agent
            </DialogTitle>
            <DialogDescription>
              Créez un nouveau compte agent ou administrateur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="agent-name">Nom</Label>
              <Input
                id="agent-name"
                placeholder="Jean Dupont"
                value={newAgent.name}
                onChange={(e) =>
                  setNewAgent((a) => ({ ...a, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agent-email">Email</Label>
              <Input
                id="agent-email"
                type="email"
                placeholder="jean@compagnie.com"
                value={newAgent.email}
                onChange={(e) =>
                  setNewAgent((a) => ({ ...a, email: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="agent-phone">Téléphone</Label>
                <Input
                  id="agent-phone"
                  placeholder="+225 00 00 00 00"
                  value={newAgent.phone}
                  onChange={(e) =>
                    setNewAgent((a) => ({ ...a, phone: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agent-password">Mot de passe</Label>
                <Input
                  id="agent-password"
                  type="password"
                  placeholder="••••••••"
                  value={newAgent.password}
                  onChange={(e) =>
                    setNewAgent((a) => ({ ...a, password: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <Select
                value={newAgent.role}
                onValueChange={(v) =>
                  setNewAgent((a) => ({ ...a, role: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      Agent
                    </span>
                  </SelectItem>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5" />
                      Admin
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={creating}
            >
              Annuler
            </Button>
            <Button className="gap-2" onClick={handleCreateAgent} disabled={creating}>
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/*  ALERT DIALOG — Delete Agent                                  */}
      {/* ============================================================ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Supprimer l&apos;agent
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span> ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAgent}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}