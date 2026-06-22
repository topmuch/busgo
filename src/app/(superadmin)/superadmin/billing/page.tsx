"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CreditCard, CheckCircle2, Clock, XCircle, AlertTriangle, Receipt,
} from "lucide-react";
import { toast } from "sonner";

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  tenant: { name: string; slug: string };
}

interface Summary {
  total: number;
  paid: number;
  pending: number;
  failed: number;
  totalRevenue: number;
  pendingAmount: number;
}

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  paid: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, label: "Payée" },
  pending: { color: "bg-amber-100 text-amber-700", icon: Clock, label: "En attente" },
  failed: { color: "bg-rose-100 text-rose-700", icon: XCircle, label: "Échouée" },
  overdue: { color: "bg-rose-100 text-rose-700", icon: AlertTriangle, label: "En retard" },
};

function formatFCFA(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [statusDialog, setStatusDialog] = useState<{ invoiceId: string; currentStatus: string; number: string } | null>(null);
  const [newStatus, setNewStatus] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/invoices");
      const data = await res.json();
      setInvoices(data.invoices);
      setSummary(data.summary);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredInvoices = filter === "all" ? invoices : invoices.filter((i) => i.status === filter);

  const handleStatusChange = async () => {
    if (!statusDialog || !newStatus) return;
    await fetch("/api/superadmin/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId: statusDialog.invoiceId, status: newStatus }),
    });
    toast.success(`Facture ${statusDialog.number} mise à jour — ${newStatus}`);
    setStatusDialog(null);
    fetchData();
  };

  const handleRemindAll = () => {
    const pendingCount = summary?.pending ?? 0 + (summary?.failed ?? 0);
    toast.success(`${pendingCount} relance(s) de paiement envoyée(s)`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturation</h1>
          <p className="text-muted-foreground">Suivez les abonnements, factures et relances.</p>
        </div>
        <Button variant="outline" onClick={handleRemindAll} className="gap-2">
          <Receipt className="h-4 w-4" /> Relancer les impayés
        </Button>
      </div>

      {/* Pricing Banner */}
      <Card className="border-dashed">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-rose-50 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Tarification Bus Go</p>
              <p className="text-xs text-muted-foreground">20 000 FCFA par bus connecté, par mois</p>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div><p className="text-xs text-muted-foreground">Starter</p><p className="font-bold text-sm">20 000 FCFA/bus</p></div>
            <div><p className="text-xs text-muted-foreground">Pro</p><p className="font-bold text-sm">20 000 FCFA/bus</p></div>
            <div><p className="text-xs text-muted-foreground">Enterprise</p><p className="font-bold text-sm">Sur devis</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenus encaissés</p>
                <p className="text-lg font-bold">{formatFCFA(summary.totalRevenue)}</p>
                <p className="text-[10px] text-muted-foreground">{summary.paid} factures payées</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">En attente</p>
                <p className="text-lg font-bold">{formatFCFA(summary.pendingAmount)}</p>
                <p className="text-[10px] text-muted-foreground">{summary.pending} factures</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-rose-50 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paiements échoués</p>
                <p className="text-lg font-bold">{summary.failed}</p>
                <p className="text-[10px] text-muted-foreground">Factures à relancer</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-sky-50 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total factures</p>
                <p className="text-lg font-bold">{summary.total}</p>
                <p className="text-[10px] text-muted-foreground">Toutes périodes</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "paid", "pending", "failed"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Toutes" : statusConfig[f]?.label || f}
          </Button>
        ))}
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">N° Facture</TableHead>
                <TableHead className="text-xs">Entreprise</TableHead>
                <TableHead className="text-xs text-right">Montant</TableHead>
                <TableHead className="text-xs">Statut</TableHead>
                <TableHead className="text-xs">Échéance</TableHead>
                <TableHead className="text-xs">Date paiement</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv) => {
                const cfg = statusConfig[inv.status] || statusConfig.pending;
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.number}</TableCell>
                    <TableCell className="text-sm">{inv.tenant.name}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{formatFCFA(inv.amount)}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${cfg.color}`}><cfg.icon className="h-3 w-3 mr-1" />{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(inv.dueDate).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString("fr-FR") : "—"}</TableCell>
                    <TableCell className="text-right">
                      {inv.status !== "paid" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => { setStatusDialog({ invoiceId: inv.id, currentStatus: inv.status, number: inv.number }); setNewStatus("paid"); }}
                        >
                          Marquer payée
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredInvoices.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Aucune facture trouvée.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      <Dialog open={!!statusDialog} onOpenChange={(open) => { if (!open) setStatusDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le statut — {statusDialog?.number}</DialogTitle>
          </DialogHeader>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Payée</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="failed">Échouée</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(null)}>Annuler</Button>
            <Button onClick={handleStatusChange}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}