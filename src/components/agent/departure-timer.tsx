"use client";

import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DepartureTimerProps {
  departureTime: string; // HH:MM format
  date: string; // ISO date string
  className?: string;
}

interface TimeRemaining {
  totalMs: number;
  isPassed: boolean;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeRemaining(departureTime: string, date: string): TimeRemaining {
  const [hours, minutes] = departureTime.split(":").map(Number);
  const departureDate = new Date(date);
  departureDate.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const diff = departureDate.getTime() - now.getTime();

  if (diff <= 0) {
    return { totalMs: diff, isPassed: true, hours: 0, minutes: 0, seconds: 0 };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return { totalMs: diff, isPassed: false, hours: h, minutes: m, seconds: s };
}

function formatTimeRemaining(tr: TimeRemaining): string {
  if (tr.isPassed) return "En retard";

  const parts: string[] = [];
  if (tr.hours > 0) parts.push(`${tr.hours}h`);
  if (tr.minutes > 0 || tr.hours > 0) parts.push(`${tr.minutes}min`);

  // Show seconds only when under 5 minutes
  if (tr.hours === 0 && tr.minutes < 5) {
    parts.push(`${tr.seconds}s`);
  }

  return parts.join(" ");
}

export function DepartureTimer({ departureTime, date, className }: DepartureTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(departureTime, date)
  );

  useEffect(() => {
    const tick = () => {
      setTimeRemaining(calculateTimeRemaining(departureTime, date));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [departureTime, date]);

  const { isPassed, totalMs } = timeRemaining;
  const thirtyMinMs = 30 * 60 * 1000;
  const tenMinMs = 10 * 60 * 1000;

  const isUrgent = !isPassed && totalMs <= tenMinMs;
  const isWarning = !isPassed && totalMs <= thirtyMinMs && totalMs > tenMinMs;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
        isPassed && "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30",
        isUrgent &&
          "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/25 animate-pulse",
        isWarning && "bg-amber-500/10 text-amber-600 border border-amber-500/25",
        !isPassed && !isUrgent && !isWarning && "bg-muted text-muted-foreground border border-border"
      , className)}
    >
      {isPassed ? (
        <AlertTriangle className="size-4" />
      ) : (
        <Clock className="size-4" />
      )}
      <span>
        {isPassed ? "En retard" : `Départ dans ${formatTimeRemaining(timeRemaining)}`}
      </span>
    </div>
  );
}