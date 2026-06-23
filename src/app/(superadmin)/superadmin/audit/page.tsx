"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileText, Search, Filter, ChevronLeft, ChevronRight, Activity,
} from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  tenant: { id: string; name: string; slug: string } | null;
}

const actionBadgeConfig: Record<string, string> = {
  "tenant.create": "bg-emerald-100 text-emerald-700",
  "tenant.suspend": "bg-rose-100 text-rose-700",
  "invoice.pay": "bg-amber-100 text-amber-700",
  "config.update": "bg-sky-100 text-sky-700",
};

function getBadgeColor(action: string): string {
  return actionBadgeConfig[action] || "bg-slate-100 text-slate-700";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return id.slice(0, 8) + "…";
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (actionFilter) params.set("action", actionFilter);
      if (entityTypeFilter && entityTypeFilter !== "all") params.set("entityType", entityTypeFilter);
      const res = await fetch(`/api/superadmin/audit-logs?${params}`);
      const data = await res.json();
      setLogs(data.auditLogs);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, limit, actionFilter, entityTypeFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  const handleActionSearch = (value: string) => {
    setActionFilter(value);
    setPage(1);
  };

  const handleEntityTypeChange = (value: string) => {
    setEntityTypeFilter(value);
    setPage(1);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-1">{Array.from({ length: 1 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Journal d&apos;audit</h1>
          <p className="text-muted-foreground">Suivez toutes les actions critiques sur la plateforme.</p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center">
              <Activity className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total actions</p>
              <p className="text-lg font-bold">{total}</p>
              <p className="text-[10px] text-muted-foreground">Toutes périodes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrer par action…"
            value={actionFilter}
            onChange={(e) => handleActionSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={entityTypeFilter} onValueChange={handleEntityTypeChange}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="Type d&apos;entité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="Tenant">Tenant</SelectItem>
              <SelectItem value="Invoice">Invoice</SelectItem>
              <SelectItem value="SystemConfig">SystemConfig</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Utilisateur</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">Entité</TableHead>
                <TableHead className="text-xs">Détails</TableHead>
                <TableHead className="text-xs">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm">{log.user.name}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${getBadgeColor(log.action)}`}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.entityType}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {truncateId(log.entityId)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {log.ipAddress}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Aucune action trouvée.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs h-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs h-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}