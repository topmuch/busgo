"use client";

/**
 * VoucherCard — displays a compensation voucher with code, amount, expiry.
 *
 * Variants:
 * - "active" (status=issued): green accent, voucher code prominent, copy button
 * - "redeemed" (status=redeemed): greyed out, "Utilisé" badge
 * - "expired" (status=expired or expiresAt < now): greyed out, "Expiré" badge
 */

import { useState } from "react";
import { Gift, Check, Copy, Clock, MapPin } from "lucide-react";
import type { CompensationItem } from "@/hooks/modules/use-compensations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VoucherCardProps {
  compensation: CompensationItem;
  className?: string;
}

export function VoucherCard({ compensation, className = "" }: VoucherCardProps) {
  const [copied, setCopied] = useState(false);

  const isExpired =
    compensation.status === "expired" ||
    new Date(compensation.expiresAt) < new Date();
  const isRedeemed = compensation.status === "redeemed";
  const isActive = compensation.status === "issued" && !isExpired;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(compensation.voucherCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border shadow-sm",
        isActive
          ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background"
          : "border-slate-200 bg-slate-50 dark:bg-slate-900/40",
        className
      )}
    >
      {/* Left accent stripe */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1.5",
          isActive ? "bg-emerald-500" : "bg-slate-300"
        )}
      />

      <div className="p-4 pl-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                isActive
                  ? "bg-emerald-100 dark:bg-emerald-900/40"
                  : "bg-slate-200 dark:bg-slate-800"
              )}
            >
              <Gift
                className={cn(
                  "h-4 w-4",
                  isActive
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-slate-500"
                )}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Bon d&apos;achat
              </p>
              <p className="text-[10px] text-slate-500">
                {compensation.billet.trajet.origin} →{" "}
                {compensation.billet.trajet.destination}
              </p>
            </div>
          </div>

          {/* Status badge */}
          {isActive && (
            <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              <Check className="h-2.5 w-2.5 mr-0.5" />
              Actif
            </span>
          )}
          {isRedeemed && (
            <span className="inline-flex items-center rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
              Utilisé
            </span>
          )}
          {isExpired && !isRedeemed && (
            <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/40 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-300">
              Expiré
            </span>
          )}
        </div>

        {/* Amount */}
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              "text-2xl font-bold",
              isActive
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-slate-500"
            )}
          >
            {compensation.amountFcfa.toLocaleString("fr-FR")}
          </span>
          <span className="text-xs text-slate-500">FCFA</span>
        </div>

        {/* GPS tracking proof */}
        {compensation.hadGpsTracking && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300">
            <MapPin className="h-3 w-3" />
            <span>
              Position GPS partagée — éligibilité retard vérifiée
              {compensation.lastEtaMinutes !== null &&
                ` (ETA ${compensation.lastEtaMinutes} min)`}
            </span>
          </div>
        )}

        {/* Voucher code (only if active) */}
        {isActive && (
          <div className="rounded-lg bg-white dark:bg-slate-950 border border-dashed border-emerald-400 dark:border-emerald-700 p-2.5">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-0.5">
              Code du bon
            </p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-sm font-mono font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
                {compensation.voucherCode}
              </code>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copier
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {isRedeemed && compensation.redeemedAt
              ? `Utilisé le ${formatDate(compensation.redeemedAt)}`
              : `Expire le ${formatDate(compensation.expiresAt)}`}
          </span>
          <span>Émis le {formatDate(compensation.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
