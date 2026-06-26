"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 *  Design System ORDERAN — Composants partagés
 *  Inspiration: dashboard "Order Management" avec gradient bleu
 * ═══════════════════════════════════════════════════════════════
 *
 *  Palette:
 *  - Header gradient: #4A90E2 → #87CEEB (bleu ciel)
 *  - Sidebar: #F8F9FA (gris clair)
 *  - KPI orange: #F97316
 *  - KPI violet: #8B5CF6
 *  - KPI vert: #10B981
 *  - KPI bleu: #3B82F6
 *  - Texte primaire: #1F2937
 *  - Texte secondaire: #6B7280
 */

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ──────────────────────────────────────────────────────────────
// 1. DashboardShell — wrapper avec sidebar gris clair
// ──────────────────────────────────────────────────────────────

export function DashboardShell({
  children,
  sidebar,
  className,
}: {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-dvh flex flex-col bg-slate-50", className)}>
      {sidebar && (
        <aside className="hidden md:flex w-60 flex-col bg-[#F8F9FA] border-r border-slate-200 p-4 shrink-0">
          {sidebar}
        </aside>
      )}
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 2. GradientHeader — bannière bleue dégradée avec titre + badges
// ──────────────────────────────────────────────────────────────

export function GradientHeader({
  title,
  subtitle,
  badges,
  actions,
}: {
  title: string;
  subtitle?: string;
  badges?: string[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#4A90E2] to-[#87CEEB] px-6 py-8 text-white">
      {/* Decorative curved lines */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <svg className="absolute -top-10 -right-10 w-64 h-64" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="80" stroke="white" strokeWidth="2" />
          <circle cx="100" cy="100" r="60" stroke="white" strokeWidth="2" />
          <circle cx="100" cy="100" r="40" stroke="white" strokeWidth="2" />
        </svg>
        <svg className="absolute -bottom-20 -left-20 w-72 h-72" viewBox="0 0 200 200" fill="none">
          <path d="M 0 100 Q 50 50, 100 100 T 200 100" stroke="white" strokeWidth="2" fill="none" />
          <path d="M 0 120 Q 50 70, 100 120 T 200 120" stroke="white" strokeWidth="2" fill="none" />
          <path d="M 0 140 Q 50 90, 100 140 T 200 140" stroke="white" strokeWidth="2" fill="none" />
        </svg>
      </div>

      <div className="relative flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-white/90 text-sm md:text-base max-w-2xl">{subtitle}</p>
          )}
          {badges && badges.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {badges.map((badge, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-medium"
                >
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 3. ColoredKpiCard — KPI card avec fond coloré + icône + %
// ──────────────────────────────────────────────────────────────

type KpiColor = "orange" | "violet" | "green" | "blue";

const KPI_STYLES: Record<
  KpiColor,
  { bg: string; iconBg: string; ring: string }
> = {
  orange: {
    bg: "bg-[#F97316]",
    iconBg: "bg-white/20",
    ring: "ring-[#F97316]/30",
  },
  violet: {
    bg: "bg-[#8B5CF6]",
    iconBg: "bg-white/20",
    ring: "ring-[#8B5CF6]/30",
  },
  green: {
    bg: "bg-[#10B981]",
    iconBg: "bg-white/20",
    ring: "ring-[#10B981]/30",
  },
  blue: {
    bg: "bg-[#3B82F6]",
    iconBg: "bg-white/20",
    ring: "ring-[#3B82F6]/30",
  },
};

export function ColoredKpiCard({
  title,
  value,
  icon: Icon,
  color = "blue",
  trend,
  trendUp = true,
  hint,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: KpiColor;
  trend?: string;
  trendUp?: boolean;
  hint?: string;
}) {
  const styles = KPI_STYLES[color];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-5 text-white shadow-sm ring-1",
        styles.bg,
        styles.ring
      )}
    >
      {/* Decorative circle */}
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -top-2 -right-2 h-16 w-16 rounded-full bg-white/10" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-white/80 truncate">
            {title}
          </p>
          <p className="text-2xl md:text-3xl font-bold tracking-tight">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              {trendUp ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              <span className="font-medium">{trend}</span>
            </div>
          )}
          {hint && <p className="text-[10px] text-white/70 truncate">{hint}</p>}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            styles.iconBg
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 4. ContentCard — carte blanche avec ombre subtile
// ──────────────────────────────────────────────────────────────

export function ContentCard({
  children,
  className,
  title,
  actions,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
}) {
  return (
    <Card className={cn("rounded-xl border-slate-200 shadow-sm", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          {title && (
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          )}
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// 5. StatusBadge — badge statut coloré
// ──────────────────────────────────────────────────────────────

type StatusKind = "success" | "pending" | "danger" | "neutral";

const STATUS_STYLES: Record<StatusKind, string> = {
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  danger: "bg-red-100 text-red-700 border-red-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
};

export function StatusBadge({
  kind,
  children,
}: {
  kind: StatusKind;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        STATUS_STYLES[kind]
      )}
    >
      {children}
    </span>
  );
}
