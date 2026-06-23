"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Building2,
  Search,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Plus,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  ShieldOff,
  ShieldCheck,
  UserSwitch,
} from "lucide-react";
import { toast } from "sonner";

/* ─── Types ─── */

interface Tenant {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  plan: string;
  isActive: boolean;
  isSuspended: boolean;
  subscriptionStatus: string;
  createdAt: string;
  _count: { users: number; buses: number; trajets: number; invoices: number };
  subscriptions: {
    id: string;
    status: string;
    plan: string;
    totalAmount: number;
    busCount: number;
    endDate: string;
  }[];
}

/* ─── Constants ─── */

const PAGE_SIZE = 10;

const planBadgeCls: Record<string, string> = {
  starter:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  pro: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  enterprise:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

const statusMeta: Record<
  string,
  { label: string; cls: string }
> = {
  active: {
    label: "Actif",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  },
  suspended: {
    label: "Suspendu",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  inactive: {
    label: "Inactif",
    cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

function tenantStatus(t: Tenant): string {
  if (t.isSuspended) return "suspended";
  if (t.isActive) return "active";
  return "inactive";
}

/* ─── Sort Header Helper ─── */

function SortHeader({
  column,
  children,
}: {
  column: { toggleSorting: (desc: boolean) => void; getIsSorted: () => false | "asc" | "desc" };
  children: React.ReactNode;
}) {
  const sorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {children}
      {sorted === "asc" ? (
        <ArrowUp className="ml-1 h-3.5 w-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-1 h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />
      )}
    </Button>
  );
}

/* ─── Component ─── */

export default function TenantsPage() {
  const router = useRouter();

  /* data */
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  /* table state */
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [totalTenants, setTotalTenants] = useState(0);

  /* create tenant */
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

  /* credentials dialog */
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  /* suspend dialog */
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<Tenant | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendLoading, setSuspendLoading] = useState(false);

  /* delete dialog */
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* impersonate */
  const [impersonateLoading, setImpersonateLoading] = useState<string | null>(null);

  /* ─── Fetch ─── */

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/tenants?limit=9999");
      const data = await res.json();
      if (Array.isArray(data)) {
        setTenants(data);
        setTotalTenants(data.length);
      } else if (data.tenants) {
        setTenants(data.tenants);
        setTotalTenants(data.total ?? data.tenants.length);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  /* ─── Actions ─── */

  const openSuspendDialog = useCallback((tenant: Tenant) => {
    setSuspendTarget(tenant);
    setSuspendReason("");
    setSuspendOpen(true);
  }, []);

  const handleSuspend = useCallback(async () => {
    if (!suspendTarget || !suspendReason.trim()) return;
    setSuspendLoading(true);
    try {
      const res = await fetch(`/api/superadmin/tenants/${suspendTarget.id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: suspendReason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la suspension");
        return;
      }
      toast.success(`${suspendTarget.name} suspendue`);
      setSuspendOpen(false);
      fetchTenants();
    } catch {
      toast.error("Erreur lors de la suspension");
    } finally {
      setSuspendLoading(false);
    }
  }, [suspendTarget, suspendReason, fetchTenants]);

  const handleReactivate = useCallback(
    async (tenant: Tenant) => {
      try {
        const res = await fetch(
          `/api/superadmin/tenants/${tenant.id}/reactivate`,
          { method: "POST" },
        );
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || "Erreur lors de la réactivation");
          return;
        }
        toast.success(`${tenant.name} réactivée`);
        fetchTenants();
      } catch {
        toast.error("Erreur lors de la réactivation");
      }
    },
    [fetchTenants],
  );

  const openDeleteDialog = useCallback((tenant: Tenant) => {
    setDeleteTarget(tenant);
    setDeleteOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/superadmin/tenants/${deleteTarget.id}?confirm=true`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la suppression");
        return;
      }
      toast.success(`${deleteTarget.name} supprimée`);
      setDeleteOpen(false);
      fetchTenants();
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, fetchTenants]);

  const handleImpersonate = useCallback(async (tenant: Tenant) => {
    setImpersonateLoading(tenant.id);
    try {
      // First find the admin user of this tenant
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}`);
      if (!res.ok) { toast.error("Erreur lors de la récupération"); return; }
      const data = await res.json();
      const admin = data.users?.find((u: { role: string }) => u.role === "admin");
      if (!admin) { toast.error("Aucun administrateur trouvé pour cette entreprise"); return; }

      const impRes = await fetch("/api/superadmin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: admin.id }),
      });
      if (!impRes.ok) { const err = await impRes.json(); toast.error(err.error || "Erreur d'impersonation"); return; }
      const impData = await impRes.json();

      // Set the impersonated token in a cookie
      document.cookie = `next-auth.session-token=${impData.token}; path=/; max-age=3600; samesite=lax`;
      toast.success(`Connecté en tant que ${impData.user.name}`);

      // Redirect to admin dashboard
      setTimeout(() => { window.location.href = "/admin"; }, 500);
    } catch {
      toast.error("Erreur d'impersonation");
    } finally {
      setImpersonateLoading(null);
    }
  }, []);

  /* ─── Columns ─── */

  const columns = useMemo<ColumnDef<Tenant, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortHeader column={column}>Entreprise</SortHeader>,
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5 min-w-[180px]">
            <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">
                {row.original.name}
              </p>
              <Badge
                variant="outline"
                className="text-[10px] mt-0.5 font-normal"
              >
                @{row.original.slug}
              </Badge>
            </div>
          </div>
        ),
        filterFn: (row, _id, value: string) => {
          if (!value) return true;
          const s = value.toLowerCase();
          return (
            row.original.name.toLowerCase().includes(s) ||
            row.original.slug.toLowerCase().includes(s)
          );
        },
      },
      {
        accessorKey: "plan",
        header: ({ column }) => <SortHeader column={column}>Plan</SortHeader>,
        cell: ({ row }) => {
          const plan = row.original.plan;
          return (
            <Badge
              variant="outline"
              className={`${planBadgeCls[plan] ?? ""} capitalize text-xs`}
            >
              {plan}
            </Badge>
          );
        },
      },
      {
        id: "status",
        header: ({ column }) => <SortHeader column={column}>Statut</SortHeader>,
        accessorFn: (row) => tenantStatus(row),
        filterFn: (row, _id, value: string) => {
          if (!value) return true;
          return tenantStatus(row.original) === value;
        },
        sortingFn: (rowA, rowB) => {
          const order: Record<string, number> = {
            suspended: 0,
            inactive: 1,
            active: 2,
          };
          return (
            (order[tenantStatus(rowA.original)] ?? 0) -
            (order[tenantStatus(rowB.original)] ?? 0)
          );
        },
        cell: ({ row }) => {
          const s = tenantStatus(row.original);
          const meta = statusMeta[s];
          return (
            <Badge
              variant="outline"
              className={`${meta?.cls ?? ""} text-xs`}
            >
              {meta?.label ?? s}
            </Badge>
          );
        },
      },
      {
        accessorKey: "_count.buses",
        header: ({ column }) => <SortHeader column={column}>Bus</SortHeader>,
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">
            {row.original._count.buses}
          </span>
        ),
      },
      {
        accessorKey: "_count.users",
        header: ({ column }) => (
          <SortHeader column={column}>Utilisateurs</SortHeader>
        ),
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">
            {row.original._count.users}
          </span>
        ),
      },
      {
        id: "subscription",
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">
            Abonnement
          </span>
        ),
        cell: ({ row }) => {
          const sub = row.original.subscriptions[0];
          if (!sub)
            return (
              <span className="text-sm text-muted-foreground">&mdash;</span>
            );
          return (
            <div className="text-sm whitespace-nowrap">
              <span className="font-medium">
                {new Intl.NumberFormat("fr-FR").format(sub.totalAmount)} FCFA
              </span>
              <span className="text-muted-foreground"> &middot; {sub.busCount} bus</span>
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <SortHeader column={column}>Créé le</SortHeader>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {new Date(row.original.createdAt).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => null,
        size: 48,
        cell: ({ row }) => {
          const tenant = row.original;
          const status = tenantStatus(tenant);
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => router.push(`/superadmin/tenants/${tenant.id}`)}
                >
                  <Eye className="h-4 w-4" />
                  Voir le détail
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleImpersonate(tenant)}
                  disabled={impersonateLoading === tenant.id}
                >
                  <UserSwitch className="h-4 w-4" />
                  {impersonateLoading === tenant.id ? "Connexion..." : "Usurper l'identité"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {status === "suspended" ? (
                  <DropdownMenuItem
                    onClick={() => handleReactivate(tenant)}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Réactiver
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => openSuspendDialog(tenant)}
                  >
                    <ShieldOff className="h-4 w-4" />
                    Suspendre
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => openDeleteDialog(tenant)}
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [router, handleReactivate, openSuspendDialog, openDeleteDialog, handleImpersonate],
  );

  /* ─── Table ─── */

  const table = useReactTable({
    data: tenants,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: PAGE_SIZE },
    },
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const { pageIndex } = table.getState().pagination;
  const totalPages = table.getPageCount();

  /* ─── Render ─── */

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Entreprises</h1>
        <p className="text-muted-foreground">
          Gérez les compagnies clientes et leurs abonnements.
        </p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une entreprise..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={
            (columnFilters.find((f) => f.id === "plan")?.value as string) ??
            "all"
          }
          onValueChange={(v) =>
            setColumnFilters((prev) => {
              const rest = prev.filter((f) => f.id !== "plan");
              return v === "all" ? rest : [...rest, { id: "plan", value: v }];
            })
          }
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les plans</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={
            (columnFilters.find((f) => f.id === "status")?.value as string) ??
            "all"
          }
          onValueChange={(v) =>
            setColumnFilters((prev) => {
              const rest = prev.filter((f) => f.id !== "status");
              return v === "all"
                ? rest
                : [...rest, { id: "status", value: v }];
            })
          }
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="suspended">Suspendu</SelectItem>
            <SelectItem value="inactive">Inactif</SelectItem>
          </SelectContent>
        </Select>

        <Button
          className="w-full sm:w-auto ml-auto"
          onClick={() => {
            setCreateForm({
              name: "",
              slug: "",
              adminName: "",
              adminEmail: "",
              adminPhone: "",
              plan: "starter",
              country: "SN",
            });
            slugManuallyEdited.current = false;
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Créer une entreprise
        </Button>
      </div>

      {/* Table or Loading */}
      <div className="rounded-lg border bg-card">
        {loading ? (
          /* ── Skeleton ── */
          <div className="p-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filteredCount === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Building2 className="h-12 w-12 stroke-1" />
            <p className="text-sm font-medium">Aucune entreprise trouvée</p>
            <p className="text-xs">
              Essayez de modifier vos filtres ou créez une nouvelle entreprise.
            </p>
          </div>
        ) : (
          /* ── Data table ── */
          <>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-10 px-4">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row, idx) => (
                  <TableRow
                    key={row.id}
                    className={idx % 2 === 0 ? "bg-muted/20" : ""}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3 text-sm">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                {filteredCount} entreprise{filteredCount > 1 ? "s" : ""} sur{" "}
                {totalTenants}
              </p>
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          table.previousPage();
                        }}
                        className={
                          pageIndex === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {/* Generate page numbers */}
                    {generatePageNumbers(pageIndex, totalPages).map((p, i) =>
                      p === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${i}`}>
                          <span className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground">
                            &hellip;
                          </span>
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            isActive={pageIndex === p}
                            onClick={(e) => {
                              e.preventDefault();
                              table.setPageIndex(p as number);
                            }}
                            className="cursor-pointer"
                          >
                            {(p as number) + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          table.nextPage();
                        }}
                        className={
                          pageIndex >= totalPages - 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── Suspend Dialog ─── */}
      <Dialog open={suspendOpen} onOpenChange={(open) => !open && setSuspendOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-amber-600" />
              Suspendre {suspendTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cette action désactivera tous les utilisateurs de cette entreprise.
              Indiquez la raison de la suspension.
            </p>
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">Raison de la suspension *</Label>
              <Textarea
                id="suspend-reason"
                placeholder="Ex: Non-paiement de l'abonnement..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={suspendLoading || !suspendReason.trim()}
              onClick={handleSuspend}
            >
              {suspendLoading ? "Suspension..." : "Suspendre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete AlertDialog ─── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {deleteTarget?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données associées
              (utilisateurs, bus, trajets, factures, abonnements) seront
              définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteLoading ? "Suppression..." : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Create Tenant Dialog ─── */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            fetchTenants();
          }
        }}
      >
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
                setCredentials({
                  email: data.adminEmail,
                  password: data.generatedPassword,
                });
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
              <p className="text-xs text-muted-foreground">
                Identifiant unique (ex: dakar-express)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-admin-name">
                Nom de l&apos;administrateur *
              </Label>
              <Input
                id="create-admin-name"
                required
                value={createForm.adminName}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, adminName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-admin-email">Email admin *</Label>
              <Input
                id="create-admin-email"
                type="email"
                required
                value={createForm.adminEmail}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, adminEmail: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-admin-phone">Téléphone admin *</Label>
              <Input
                id="create-admin-phone"
                required
                value={createForm.adminPhone}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, adminPhone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-plan">Plan</Label>
              <Select
                value={createForm.plan}
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, plan: v }))
                }
              >
                <SelectTrigger id="create-plan">
                  <SelectValue />
                </SelectTrigger>
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
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, country: e.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Credentials Dialog ─── */}
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
                  <p className="font-mono text-sm font-medium">
                    {credentials.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mot de passe</p>
                  <p className="font-mono text-sm font-medium">
                    {credentials.password}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Partagez ces identifiants avec l&apos;administrateur. Ce mot
                  de passe ne sera plus affiché.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Email: ${credentials.email}\nMot de passe: ${credentials.password}`,
                  );
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
    </div>
  );
}

/* ─── Helpers ─── */

function generatePageNumbers(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const pages: (number | "ellipsis")[] = [0];

  if (current > 2) pages.push("ellipsis");

  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 3) pages.push("ellipsis");

  pages.push(total - 1);
  return pages;
}