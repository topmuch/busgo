"use client";

/**
 * SponsoredOffersManager — admin UI to create / list / edit / delete offers.
 * Also shows impression/click stats per offer.
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Edit2,
  Eye,
  MousePointerClick,
  ExternalLink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface OfferItem {
  id: string;
  scope: string;
  tenantId: string | null;
  targetPwa: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  ctaLabel: string;
  ctaUrl: string;
  bgColor: string;
  textColor: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  maxImpressions: number | null;
  maxClicks: number | null;
  priority: number;
  impressionsCount: number;
  clicksCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SponsoredOffersManagerProps {
  initialOffers: OfferItem[];
  tenantId: string;
  isSuperAdmin: boolean;
}

const PWA_TARGETS = [
  { value: "client", label: "PWA Client" },
  { value: "agent", label: "PWA Agent" },
  { value: "both", label: "Les deux" },
];

export function SponsoredOffersManager({
  initialOffers,
  tenantId,
  isSuperAdmin,
}: SponsoredOffersManagerProps) {
  const [offers, setOffers] = useState<OfferItem[]>(initialOffers);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOffer, setEditOffer] = useState<OfferItem | null>(null);
  const [statsOfferId, setStatsOfferId] = useState<string | null>(null);

  // ─── Create offer ─────────────────────────────────────────
  const handleCreate = useCallback(async (data: Partial<OfferItem>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/sponsor/admin?XTransformPort=3000", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error || "Erreur lors de la création");
        return;
      }
      toast.success("Offre créée");
      setOffers((prev) => [json.offer, ...prev]);
      setCreateOpen(false);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Update offer ─────────────────────────────────────────
  const handleUpdate = useCallback(
    async (id: string, data: Partial<OfferItem>) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/sponsor/admin/${id}?XTransformPort=3000`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          toast.error("Erreur lors de la mise à jour");
          return;
        }
        toast.success("Offre mise à jour");
        setOffers((prev) =>
          prev.map((o) => (o.id === id ? { ...o, ...json.offer } : o))
        );
        setEditOffer(null);
      } catch {
        toast.error("Erreur réseau");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ─── Delete offer ─────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Supprimer cette offre ? Cette action est irréversible.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sponsor/admin/${id}?XTransformPort=3000`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Erreur lors de la suppression");
        return;
      }
      toast.success("Offre supprimée");
      setOffers((prev) => prev.filter((o) => o.id !== id));
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Toggle isActive ──────────────────────────────────────
  const handleToggleActive = useCallback(
    async (id: string, current: boolean) => {
      // Optimistic update
      setOffers((prev) =>
        prev.map((o) => (o.id === id ? { ...o, isActive: !current } : o))
      );
      try {
        await fetch(`/api/sponsor/admin/${id}?XTransformPort=3000`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !current }),
        });
      } catch {
        // Revert on error
        setOffers((prev) =>
          prev.map((o) => (o.id === id ? { ...o, isActive: current } : o))
        );
        toast.error("Erreur réseau");
      }
    },
    []
  );

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {offers.length} offre{offers.length > 1 ? "s" : ""} au total
        </p>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-[#4A90E2] hover:bg-[#3a82c7] text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nouvelle offre
        </Button>
      </div>

      {/* Offers list */}
      <div className="space-y-3">
        {offers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <p className="text-sm text-slate-500">
              Aucune offre sponsorisée. Cliquez sur &quot;Nouvelle offre&quot; pour en créer une.
            </p>
          </div>
        ) : (
          offers.map((offer) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              onToggleActive={() =>
                handleToggleActive(offer.id, offer.isActive)
              }
              onEdit={() => setEditOffer(offer)}
              onDelete={() => handleDelete(offer.id)}
              onShowStats={() => setStatsOfferId(offer.id)}
            />
          ))
        )}
      </div>

      {/* Create dialog — keyed by createOpen to reset form on each open */}
      {createOpen && (
        <OfferFormDialog
          key={`create-${Date.now()}`}
          open={true}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          loading={loading}
          isSuperAdmin={isSuperAdmin}
          tenantId={tenantId}
        />
      )}

      {/* Edit dialog — key forces remount when switching between offers */}
      {editOffer && (
        <OfferFormDialog
          key={editOffer.id}
          open={true}
          onClose={() => setEditOffer(null)}
          onSubmit={(data) => handleUpdate(editOffer.id, data)}
          loading={loading}
          isSuperAdmin={isSuperAdmin}
          tenantId={tenantId}
          initialData={editOffer}
        />
      )}

      {/* Stats dialog */}
      {statsOfferId && (
        <OfferStatsDialog
          offerId={statsOfferId}
          onClose={() => setStatsOfferId(null)}
        />
      )}
    </div>
  );
}

// ─── Offer Row ────────────────────────────────────────────────

function OfferRow({
  offer,
  onToggleActive,
  onEdit,
  onDelete,
  onShowStats,
}: {
  offer: OfferItem;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShowStats: () => void;
}) {
  const ctr =
    offer.impressionsCount > 0
      ? ((offer.clicksCount / offer.impressionsCount) * 100).toFixed(1)
      : "0";

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-stretch">
        {/* Color stripe */}
        <div
          className="w-2 shrink-0"
          style={{ backgroundColor: offer.bgColor }}
        />

        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-800 truncate">
                  {offer.title}
                </h3>
                <Badge
                  variant="outline"
                  className={
                    offer.isActive
                      ? "text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50"
                      : "text-[10px] border-slate-300 text-slate-600 bg-slate-50"
                  }
                >
                  {offer.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {offer.scope === "global" ? "Global" : "Tenant"}
                </Badge>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {offer.targetPwa}
                </Badge>
              </div>
              {offer.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {offer.description}
                </p>
              )}
              <a
                href={offer.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#4A90E2] hover:underline mt-1"
              >
                {offer.ctaLabel}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Stats badges */}
            <div className="flex items-center gap-3 shrink-0 text-xs">
              <div className="flex items-center gap-1 text-slate-600">
                <Eye className="h-3.5 w-3.5" />
                <span className="font-medium">
                  {offer.impressionsCount.toLocaleString("fr-FR")}
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-600">
                <MousePointerClick className="h-3.5 w-3.5" />
                <span className="font-medium">
                  {offer.clicksCount.toLocaleString("fr-FR")}
                </span>
              </div>
              <div className="text-slate-500">
                CTR <span className="font-semibold">{ctr}%</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Switch
                checked={offer.isActive}
                onCheckedChange={onToggleActive}
              />
              <span className="text-xs text-slate-500">
                {offer.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={onShowStats}
                className="text-xs"
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Stats
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onEdit}
                className="text-xs"
              >
                <Edit2 className="h-3.5 w-3.5 mr-1" />
                Éditer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="text-xs text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Offer Form Dialog (create + edit) ────────────────────────

function OfferFormDialog({
  open,
  onClose,
  onSubmit,
  loading,
  isSuperAdmin,
  tenantId,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<OfferItem>) => void;
  loading: boolean;
  isSuperAdmin: boolean;
  tenantId: string;
  initialData?: OfferItem;
}) {
  const defaultForm = {
    title: "",
    description: "",
    imageUrl: "",
    ctaLabel: "En savoir plus",
    ctaUrl: "",
    bgColor: "#4A90E2",
    textColor: "#ffffff",
    targetPwa: "client",
    scope: "tenant",
    endDate: "",
    maxImpressions: "",
    maxClicks: "",
    priority: "50",
  };

  // Initialize form from initialData if provided, else from default
  const [form, setForm] = useState(() => {
    if (initialData) {
      return {
        title: initialData.title,
        description: initialData.description ?? "",
        imageUrl: initialData.imageUrl ?? "",
        ctaLabel: initialData.ctaLabel,
        ctaUrl: initialData.ctaUrl,
        bgColor: initialData.bgColor,
        textColor: initialData.textColor,
        targetPwa: initialData.targetPwa,
        scope: initialData.scope,
        endDate: initialData.endDate.split("T")[0] ?? "",
        maxImpressions: initialData.maxImpressions?.toString() ?? "",
        maxClicks: initialData.maxClicks?.toString() ?? "",
        priority: initialData.priority.toString(),
      };
    }
    return defaultForm;
  });

  // Form is initialized from initialData via useState initializer above.
  // No useEffect needed — the dialog is mounted fresh each time it opens
  // (because the parent conditionally renders it).

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.ctaUrl || !form.endDate) {
      toast.error("Titre, URL CTA et date de fin sont requis");
      return;
    }
    onSubmit({
      title: form.title,
      description: form.description || undefined,
      imageUrl: form.imageUrl || undefined,
      ctaLabel: form.ctaLabel,
      ctaUrl: form.ctaUrl,
      bgColor: form.bgColor,
      textColor: form.textColor,
      targetPwa: form.targetPwa as "client" | "agent" | "both",
      scope: form.scope as "global" | "tenant",
      tenantId: form.scope === "tenant" ? tenantId : undefined,
      endDate: form.endDate,
      maxImpressions: form.maxImpressions
        ? parseInt(form.maxImpressions, 10)
        : undefined,
      maxClicks: form.maxClicks ? parseInt(form.maxClicks, 10) : undefined,
      priority: parseInt(form.priority, 10) || 50,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Modifier l'offre" : "Nouvelle offre sponsorisée"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ctaLabel">Libellé CTA</Label>
              <Input
                id="ctaLabel"
                value={form.ctaLabel}
                onChange={(e) =>
                  setForm({ ...form, ctaLabel: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="ctaUrl">URL CTA *</Label>
              <Input
                id="ctaUrl"
                type="url"
                value={form.ctaUrl}
                onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="imageUrl">URL Image (optionnel)</Label>
            <Input
              id="imageUrl"
              type="url"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="bgColor">Couleur fond</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.bgColor}
                  onChange={(e) =>
                    setForm({ ...form, bgColor: e.target.value })
                  }
                  className="h-9 w-12 rounded border border-slate-300"
                />
                <Input
                  value={form.bgColor}
                  onChange={(e) =>
                    setForm({ ...form, bgColor: e.target.value })
                  }
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="textColor">Couleur texte</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.textColor}
                  onChange={(e) =>
                    setForm({ ...form, textColor: e.target.value })
                  }
                  className="h-9 w-12 rounded border border-slate-300"
                />
                <Input
                  value={form.textColor}
                  onChange={(e) =>
                    setForm({ ...form, textColor: e.target.value })
                  }
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="priority">Priorité</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                max="100"
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="targetPwa">PWA cible</Label>
              <Select
                value={form.targetPwa}
                onValueChange={(v) => setForm({ ...form, targetPwa: v })}
              >
                <SelectTrigger id="targetPwa">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PWA_TARGETS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="scope">Scope</Label>
              <Select
                value={form.scope}
                onValueChange={(v) => setForm({ ...form, scope: v })}
                disabled={!isSuperAdmin}
              >
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant">Tenant (ma compagnie)</SelectItem>
                  <SelectItem value="global">
                    Global (tous tenants — SuperAdmin)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="endDate">Date de fin *</Label>
            <Input
              id="endDate"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="maxImpressions">Max impressions</Label>
              <Input
                id="maxImpressions"
                type="number"
                min="0"
                placeholder="Illimité"
                value={form.maxImpressions}
                onChange={(e) =>
                  setForm({ ...form, maxImpressions: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="maxClicks">Max clics</Label>
              <Input
                id="maxClicks"
                type="number"
                min="0"
                placeholder="Illimité"
                value={form.maxClicks}
                onChange={(e) =>
                  setForm({ ...form, maxClicks: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#4A90E2] hover:bg-[#3a82c7] text-white"
            >
              {loading
                ? "Enregistrement..."
                : initialData
                  ? "Mettre à jour"
                  : "Créer l'offre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stats Dialog ─────────────────────────────────────────────

function OfferStatsDialog({
  offerId,
  onClose,
}: {
  offerId: string;
  onClose: () => void;
}) {
  const [stats, setStats] = useState<{
    impressionCount: number;
    clickCount: number;
    ctr: number;
    recentImpressions: Array<{ id: string; pwa: string; createdAt: string; userAgent: string | null }>;
    recentClicks: Array<{ id: string; pwa: string; createdAt: string; referer: string | null }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sponsor/admin/${offerId}?XTransformPort=3000`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [offerId]);

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Statistiques de l&apos;offre</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-slate-500">Chargement...</p>
        ) : stats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-100 p-3 text-center">
                <p className="text-[10px] uppercase text-slate-500">
                  Impressions
                </p>
                <p className="text-xl font-bold text-slate-800">
                  {stats.impressionCount.toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="rounded-lg bg-slate-100 p-3 text-center">
                <p className="text-[10px] uppercase text-slate-500">Clics</p>
                <p className="text-xl font-bold text-slate-800">
                  {stats.clickCount.toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-100 p-3 text-center">
                <p className="text-[10px] uppercase text-emerald-700">CTR</p>
                <p className="text-xl font-bold text-emerald-700">
                  {stats.ctr}%
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2">
                Derniers clics
              </h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {stats.recentClicks.length === 0 ? (
                  <p className="text-xs text-slate-500">Aucun clic.</p>
                ) : (
                  stats.recentClicks.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="capitalize">{c.pwa}</span>
                      <span className="text-slate-500">
                        {new Date(c.createdAt).toLocaleString("fr-FR")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Erreur de chargement.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
