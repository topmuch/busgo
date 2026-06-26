"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 *  LivePositionPill (Agent)
 *  Pilule dynamique cliquable affichée dans la liste des passagers
 * ═══════════════════════════════════════════════════════════════
 *
 *  - Si position active : 📍 5 min (fond orange #F97316, texte blanc, pulse)
 *  - Si position stale (>2 min) : 📍 ? min (fond gris)
 *  - Au clic → ouvre la modal détaillée
 */

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEta } from "@/lib/tracking/geo-utils";

interface LivePositionPillProps {
  etaMinutes?: number;
  isStale: boolean;
  isStatic?: boolean;
  onClick: () => void;
  className?: string;
}

export function LivePositionPill({
  etaMinutes,
  isStale,
  isStatic,
  onClick,
  className,
}: LivePositionPillProps) {
  // Stale → grey
  if (isStale) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
          "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
          "hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors",
          className
        )}
        title="Position en attente (dernière mise à jour > 2 min)"
      >
        <MapPin className="h-3 w-3" />
        ? min
      </button>
    );
  }

  // Static (immobile > 10 min) → red
  if (isStatic) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
          "bg-red-500 text-white",
          "hover:bg-red-600 transition-colors",
          "animate-pulse",
          className
        )}
        title="⚠️ Passager immobile depuis 10 min"
      >
        <MapPin className="h-3 w-3" />
        Immobile
      </button>
    );
  }

  // Active → orange pulse
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
        "bg-[#F97316] text-white",
        "hover:bg-[#EA580C] transition-colors",
        "shadow-sm shadow-orange-500/30",
        "animate-pulse",
        className
      )}
      title={`Arrivée estimée : ${formatEta(etaMinutes)}`}
    >
      <MapPin className="h-3 w-3" />
      {formatEta(etaMinutes)}
    </button>
  );
}
