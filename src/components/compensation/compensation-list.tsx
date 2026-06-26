"use client";

/**
 * CompensationList — table of compensations for admin view.
 */

import { Gift, MapPin, Clock, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CompensationListProps {
  compensations: Array<{
    id: string;
    amountFcfa: number;
    reason: string;
    status: string;
    voucherCode: string;
    hadGpsTracking: boolean;
    lastDistanceMeters: number | null;
    lastEtaMinutes: number | null;
    wasMovingTowardsQuay: boolean;
    redeemedAt: Date | null;
    expiresAt: Date;
    createdAt: Date;
    notes: string | null;
    billet: {
      ticketNumber: string;
      trajet: {
        origin: string;
        destination: string;
        date: Date;
      };
      client: {
        name: string;
        phone: string;
      };
    };
  }>;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-700" },
  issued: { label: "Actif", color: "bg-emerald-100 text-emerald-700" },
  redeemed: { label: "Utilisé", color: "bg-slate-200 text-slate-700" },
  expired: { label: "Expiré", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Annulé", color: "bg-slate-100 text-slate-500" },
};

const REASON_LABELS: Record<string, string> = {
  missed_delay: "Retard manqué",
  manual: "Manuel",
  goodwill: "Geste commercial",
};

export function CompensationList({ compensations }: CompensationListProps) {
  if (compensations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <Gift className="h-7 w-7 text-slate-400" />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-700">
          Aucune compensation émise pour le moment
        </p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Les compensations sont attribuées automatiquement quand l&apos;agent
          clique &quot;Le bus part&quot; et que le passager avait partagé sa
          position GPS live.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {compensations.map((c) => {
        const status = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending;
        const isExpired =
          c.status === "expired" || new Date(c.expiresAt) < new Date();

        return (
          <div
            key={c.id}
            className="rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {/* Amount block */}
                <div className="flex flex-col items-center justify-center rounded-lg bg-slate-100 px-3 py-2 min-w-[80px] shrink-0">
                  <span className="text-sm font-bold text-slate-800">
                    {c.amountFcfa.toLocaleString("fr-FR")}
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase">FCFA</span>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800 truncate">
                      {c.billet.client.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] border-0", status.color)}
                    >
                      {status.label}
                    </Badge>
                    {c.hadGpsTracking && (
                      <Badge
                        variant="outline"
                        className="text-[10px] gap-1 border-emerald-300 text-emerald-700 bg-emerald-50"
                      >
                        <MapPin className="h-2.5 w-2.5" />
                        GPS
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span className="truncate">
                      {c.billet.trajet.origin} → {c.billet.trajet.destination}
                    </span>
                    <span>·</span>
                    <span>
                      {new Date(c.billet.trajet.date).toLocaleDateString("fr-FR")}
                    </span>
                  </div>

                  {/* Voucher code */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <code className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">
                      {c.voucherCode}
                    </code>
                    {c.lastEtaMinutes !== null && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500">
                        <Clock className="h-2.5 w-2.5" />
                        ETA {c.lastEtaMinutes} min
                      </span>
                    )}
                    {c.billet.client.phone && (
                      <span className="text-[10px] text-slate-500">
                        · {c.billet.client.phone}
                      </span>
                    )}
                  </div>

                  {/* Redeemed info */}
                  {c.redeemedAt && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                      <Check className="h-2.5 w-2.5" />
                      Utilisé le {new Date(c.redeemedAt).toLocaleDateString("fr-FR")}
                    </div>
                  )}
                </div>
              </div>

              {/* Right side: dates */}
              <div className="text-right shrink-0 text-[10px] text-slate-500">
                <p>Émis le {new Date(c.createdAt).toLocaleDateString("fr-FR")}</p>
                <p>
                  {isExpired || c.status === "redeemed"
                    ? `Expiré le ${new Date(c.expiresAt).toLocaleDateString("fr-FR")}`
                    : `Expire le ${new Date(c.expiresAt).toLocaleDateString("fr-FR")}`}
                </p>
                {c.reason !== "missed_delay" && (
                  <p className="mt-1 text-[10px] text-slate-400">
                    {REASON_LABELS[c.reason] ?? c.reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
