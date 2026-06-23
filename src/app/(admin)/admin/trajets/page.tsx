"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Upload,
  Trash2,
  Users,
  MapPin,
  Clock,
  Eye,
  X,
  Loader2,
  AlertCircle,
  CalendarDays,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import Papa from "papaparse";

interface Bus {
  id: string;
  number: string;
  capacity: number;
  driver?: { name: string } | null;
}

interface Trajet {
  id: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  price: number;
  status: string;
  bus: Bus;
  billets?: {
    seatNumber: number;
    client: { name: string; phone: string };
  }[];
  _count?: { billets: number };
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Planifié", variant: "secondary" },
  boarding: { label: "Embarquement", variant: "default" },
  departed: { label: "Parti", variant: "outline" },
  arrived: { label: "Arrivé", variant: "outline" },
  cancelled: { label: "Annulé", variant: "destructive" },
};

const nextStatus: Record<string, string> = {
  scheduled: "boarding",
  boarding: "departed",
  departed: "arrived",
};

export default function TrajetsPage() {
  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("today");
  const [passengersDialog, setPassengersDialog] = useState<Trajet | null>(null);

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [formBusId, setFormBusId] = useState("");
  const [formOrigin, setFormOrigin] = useState("");
  const [formDestination, setFormDestination] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [createFormError, setCreateFormError] = useState("");
  const [createFormLoading, setCreateFormLoading] = useState(false);

  // CSV import
  const [csvTrajetId, setCsvTrajetId] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ success: number; errors: string[] } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [trajetsRes, busesRes] = await Promise.all([
        fetch(`/api/trajets?dateFilter=${dateFilter}&includeBillets=true`),
        fetch("/api/buses"),
      ]);
      setTrajets(await trajetsRes.json());
      setBuses(await busesRes.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = useCallback(async () => {
    setCreateFormError("");
    if (!formBusId || !formOrigin || !formDestination || !formDate || !formTime || !formPrice) {
      setCreateFormError("Tous les champs sont requis");
      return;
    }

    setCreateFormLoading(true);
    try {
      const res = await fetch("/api/trajets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          busId: formBusId,
          origin: formOrigin,
          destination: formDestination,
          date: formDate,
          time: formTime,
          price: formPrice,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      setCreateOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      setCreateFormError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setCreateFormLoading(false);
    }
  }, [formBusId, formOrigin, formDestination, formDate, formTime, formPrice, fetchData]);

  const resetForm = () => {
    setFormBusId("");
    setFormOrigin("");
    setFormDestination("");
    setFormDate("");
    setFormTime("");
    setFormPrice("");
    setCreateFormError("");
  };

  const handleStatusChange = useCallback(
    async (id: string, newStatus: string) => {
      await fetch(`/api/trajets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchData();
    },
    [fetchData]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Supprimer ce trajet et tous ses billets ?")) return;
      const res = await fetch(`/api/trajets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erreur");
        return;
      }
      fetchData();
    },
    [fetchData]
  );

  const handleCSVImport = useCallback(async () => {
    if (!csvTrajetId || !csvFile) return;

    setCsvLoading(true);
    setCsvResult(null);

    try {
      const text = await csvFile.text();
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase(),
      });

      const passengers = parsed.data
        .filter((row) => row.nom || row.name)
        .map((row) => ({
          name: (row.nom || row.name || "").trim(),
          phone: (row.telephone || row.phone || row.tel || "").trim(),
          seat: row.siege || row.seat || "",
        }));

      if (passengers.length === 0) {
        setCsvResult({ success: 0, errors: ["Fichier vide ou format invalide. Colonnes attendues : nom, telephone, siege"] });
        setCsvLoading(false);
        return;
      }

      const res = await fetch("/api/trajets/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trajetId: csvTrajetId, passengers }),
      });

      const data = await res.json();
      setCsvResult(data);
      if (data.success > 0) fetchData();
    } catch {
      setCsvResult({ success: 0, errors: ["Erreur de lecture du fichier"] });
    } finally {
      setCsvLoading(false);
    }
  }, [csvTrajetId, csvFile, fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trajets</h1>
          <p className="text-muted-foreground">Gérez vos trajets et passagers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd&apos;hui</SelectItem>
              <SelectItem value="upcoming">À venir</SelectItem>
              <SelectItem value="all">Tous</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nouveau trajet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un trajet</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                {createFormError && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {createFormError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Origine</Label>
                    <Input placeholder="Dakar" value={formOrigin} onChange={(e) => setFormOrigin(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Destination</Label>
                    <Input placeholder="Saint-Louis" value={formDestination} onChange={(e) => setFormDestination(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Date</Label>
                    <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Heure</Label>
                    <Input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Bus</Label>
                    <Select value={formBusId} onValueChange={setFormBusId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir" />
                      </SelectTrigger>
                      <SelectContent>
                        {buses.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.number} ({b.capacity} places)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prix (FCFA)</Label>
                    <Input type="number" placeholder="5000" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} />
                  </div>
                </div>
                <Button className="w-full gap-2" onClick={handleCreate} disabled={createFormLoading}>
                  {createFormLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Créer le trajet
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Trajets list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : trajets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Aucun trajet trouvé.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {trajets.map((t) => {
            const cfg = statusConfig[t.status] ?? statusConfig.scheduled;
            const soldCount = t.billets?.length ?? t._count?.billets ?? 0;
            return (
              <Card key={t.id} className="transition-shadow hover:shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold">{t.time}</span>
                        <span className="text-sm font-medium truncate">
                          {t.origin} → {t.destination}
                        </span>
                        <Badge variant={cfg.variant} className="capitalize">
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(t.date).toLocaleDateString("fr-FR")}
                        </span>
                        <span>Bus {t.bus.number} ({t.bus.capacity} places)</span>
                        <span>{t.price.toLocaleString("fr-FR")} FCFA</span>
                        <span>
                          {soldCount}/{t.bus.capacity} vendus
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => setPassengersDialog(t)}
                      >
                        <Users className="h-3.5 w-3.5" />
                        Passagers
                      </Button>
                      {nextStatus[t.status] && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(t.id, nextStatus[t.status])}
                        >
                          {statusConfig[nextStatus[t.status]]?.label}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CSV Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import CSV de passagers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Format CSV : <code className="text-xs bg-muted px-1 rounded">nom, telephone, siege</code>
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={csvTrajetId} onValueChange={setCsvTrajetId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir le trajet" />
              </SelectTrigger>
              <SelectContent>
                {trajets
                  .filter((t) => t.status === "scheduled")
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.time} — {t.origin} → {t.destination}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="w-full gap-2" asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  {csvFile ? csvFile.name : "Choisir un fichier CSV"}
                </span>
              </Button>
            </div>

            <Button
              onClick={handleCSVImport}
              disabled={!csvTrajetId || !csvFile || csvLoading}
              className="gap-2"
            >
              {csvLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Importer
            </Button>
          </div>

          {csvResult && (
            <div className="rounded-lg border p-3 text-sm space-y-1">
              <p className="font-medium text-emerald-600">
                {csvResult.success} passager(s) importé(s) avec succès
              </p>
              {csvResult.errors.length > 0 && (
                <ul className="text-destructive text-xs space-y-0.5 max-h-32 overflow-y-auto">
                  {csvResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Passengers Dialog */}
      <Dialog open={!!passengersDialog} onOpenChange={() => setPassengersDialog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Passagers
              {passengersDialog && (
                <span className="font-normal text-muted-foreground">
                  {passengersDialog.origin} → {passengersDialog.destination} ({passengersDialog.time})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {passengersDialog?.billets && passengersDialog.billets.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {passengersDialog.billets.map((b, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{b.client.name}</p>
                    <p className="text-xs text-muted-foreground">{b.client.phone || "—"}</p>
                  </div>
                  <Badge variant="secondary">Siège {b.seatNumber}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8 text-sm">Aucun passager.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}