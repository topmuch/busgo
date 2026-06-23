"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Bus as BusIcon,
  Loader2,
  AlertCircle,
  X,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Driver {
  id: string;
  name: string;
  phone: string;
  role: string;
}

interface BusItem {
  id: string;
  number: string;
  capacity: number;
  isActive: boolean;
  driverId: string | null;
  driver: { name: string } | null;
  _count: { trajets: number };
}

const emptyForm = {
  number: "",
  capacity: "",
  driverId: "",
};

export default function BusesPage() {
  const [buses, setBuses] = useState<BusItem[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [busesRes, driversRes] = await Promise.all([
        fetch("/api/buses"),
        fetch("/api/drivers"),
      ]);
      setBuses(await busesRes.json());
      setDrivers(await driversRes.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (bus: BusItem) => {
    setEditingId(bus.id);
    setForm({
      number: bus.number,
      capacity: String(bus.capacity),
      driverId: bus.driverId ?? "",
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSubmit = useCallback(async () => {
    setFormError("");

    if (!form.number.trim() || !form.capacity) {
      setFormError("Numéro et capacité requis");
      return;
    }

    const cap = Number(form.capacity);
    if (isNaN(cap) || cap < 1 || cap > 100) {
      setFormError("Capacité invalide (1-100)");
      return;
    }

    setFormLoading(true);

    try {
      if (editingId) {
        const res = await fetch(`/api/buses/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: form.number.trim(),
            capacity: cap,
            driverId: form.driverId || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erreur");
        }
      } else {
        const res = await fetch("/api/buses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: form.number.trim(),
            capacity: cap,
            driverId: form.driverId || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erreur");
        }
      }

      setDialogOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setFormLoading(false);
    }
  }, [form, editingId, fetchData]);

  const handleDelete = useCallback(
    async (bus: BusItem) => {
      if (!confirm(`Supprimer le bus ${bus.number} ?`)) return;
      const res = await fetch(`/api/buses/${bus.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erreur");
        return;
      }
      fetchData();
    },
    [fetchData]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BusIcon className="h-6 w-6" />
            Bus
          </h1>
          <p className="text-muted-foreground">
            Gérez votre flotte de véhicules.
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Ajouter un bus
        </Button>
      </div>

      {/* Buses grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : buses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BusIcon className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Aucun bus enregistré.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buses.map((bus) => (
            <Card key={bus.id} className="transition-shadow hover:shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <BusIcon className="h-5 w-5" />
                    {bus.number}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(bus)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(bus)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Capacité</p>
                    <p className="font-medium">{bus.capacity} places</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Trajets</p>
                    <p className="font-medium">{bus._count.trajets}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {bus.driver ? (
                    <span>{bus.driver.name}</span>
                  ) : (
                    <span className="text-muted-foreground">Aucun chauffeur</span>
                  )}
                </div>
                <Badge
                  variant={bus.isActive ? "secondary" : "destructive"}
                  className="w-fit"
                >
                  {bus.isActive ? "Actif" : "Inactif"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier le bus" : "Ajouter un bus"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {formError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Numéro du bus</Label>
                <Input
                  placeholder="FB-003"
                  value={form.number}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, number: e.target.value.toUpperCase() }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Capacité (places)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="50"
                  value={form.capacity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, capacity: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Chauffeur</Label>
              <Select
                value={form.driverId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, driverId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun chauffeur" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {d.phone}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full gap-2"
              onClick={handleSubmit}
              disabled={formLoading}
            >
              {formLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingId ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editingId ? "Enregistrer" : "Ajouter le bus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}