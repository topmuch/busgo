/**
 * SuperAdmin utility functions
 */

export function generatePassword(length = 12): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  const array = new Uint32Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) array[i] = Math.floor(Math.random() * chars.length);
  }
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function calculateMonthlyPrice(
  numberOfBuses: number,
  pricePerBus = 20000
): number {
  return numberOfBuses * pricePerBus;
}

export function generateInvoiceNumber(
  year: number,
  sequence: number
): string {
  return `INV-${year}-${sequence.toString().padStart(3, "0")}`;
}

export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

export function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    free: "Gratuit",
    starter: "Starter",
    pro: "Pro",
    enterprise: "Entreprise",
  };
  return labels[plan] || plan;
}

export function getSubscriptionStatusConfig(status: string): {
  label: string;
  className: string;
} {
  const map: Record<string, { label: string; className: string }> = {
    active: {
      label: "Actif",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    trial: {
      label: "Essai",
      className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    },
    suspended: {
      label: "Suspendu",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    cancelled: {
      label: "Annulé",
      className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    },
    expired: {
      label: "Expiré",
      className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
    },
  };
  return (
    map[status] || {
      label: status,
      className: "bg-muted text-muted-foreground",
    }
  );
}

export function getInvoiceStatusConfig(status: string): {
  label: string;
  className: string;
} {
  const map: Record<string, { label: string; className: string }> = {
    paid: {
      label: "Payée",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    pending: {
      label: "En attente",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    failed: {
      label: "Échouée",
      className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    },
    overdue: {
      label: "En retard",
      className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    },
    cancelled: {
      label: "Annulée",
      className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
    },
  };
  return (
    map[status] || {
      label: status,
      className: "bg-muted text-muted-foreground",
    }
  );
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
}

export async function logAudit(params: {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  tenantId?: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    const { db } = await import("@/lib/db");
    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValues: params.newValues ? JSON.stringify(params.newValues) : null,
        tenantId: params.tenantId || null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch {
    // Audit log should never break the main flow
    console.error("Failed to write audit log");
  }
}

export async function isEmailAvailable(
  email: string,
  excludeTenantId?: string
): Promise<boolean> {
  const { db } = await import("@/lib/db");
  const existing = await db.tenant.findFirst({
    where: {
      adminEmail: email,
      ...(excludeTenantId ? { id: { not: excludeTenantId } } : {}),
    },
  });
  return !existing;
}