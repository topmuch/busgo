"use client";

import { useCallback } from "react";
import { Check, X, Armchair } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BilletType {
  id: string;
  seatNumber: number;
  status: "sold" | "boarded" | "absent" | "cancelled";
  client: { id: string; name: string; phone: string; reliabilityScore: number | null };
}

interface SeatMapProps {
  capacity: number;
  billets: BilletType[];
  onSeatClick?: (billet: BilletType) => void;
  className?: string;
}

const SEATS_PER_ROW = 4;

function getStatusConfig(status: BilletType["status"] | "vacant") {
  switch (status) {
    case "vacant":
      return {
        bg: "bg-muted/50 border-muted-foreground/20",
        text: "text-muted-foreground/50",
        icon: null,
        clickable: false,
      };
    case "sold":
      return {
        bg: "bg-white border-foreground/20 hover:border-primary hover:bg-primary/5 cursor-pointer",
        text: "text-foreground",
        icon: null,
        clickable: true,
      };
    case "boarded":
      return {
        bg: "bg-[#22c55e] border-[#22c55e]/80",
        text: "text-white",
        icon: <Check className="size-3.5" strokeWidth={3} />,
        clickable: false,
      };
    case "absent":
      return {
        bg: "bg-[#ef4444] border-[#ef4444]/80",
        text: "text-white",
        icon: <X className="size-3.5" strokeWidth={3} />,
        clickable: false,
      };
    case "cancelled":
      return {
        bg: "bg-muted/30 border-muted-foreground/15 line-through",
        text: "text-muted-foreground/40",
        icon: null,
        clickable: false,
      };
  }
}

export function SeatMap({ capacity, billets, onSeatClick, className }: SeatMapProps) {
  const billetMap = new Map<number, BilletType>();
  billets.forEach((b) => billetMap.set(b.seatNumber, b));

  const totalRows = Math.ceil(capacity / SEATS_PER_ROW);

  const renderSeat = useCallback(
    (seatNum: number) => {
      const billet = billetMap.get(seatNum);
      const status: BilletType["status"] | "vacant" = billet ? billet.status : "vacant";
      const config = getStatusConfig(status);

      const handleClick = () => {
        if (billet && status === "sold" && onSeatClick) {
          onSeatClick(billet);
        }
      };

      return (
        <button
          key={seatNum}
          type="button"
          disabled={!config.clickable}
          onClick={handleClick}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-lg border-2 transition-all duration-150 min-w-[40px] min-h-[40px] sm:min-w-[48px] sm:min-h-[48px] select-none",
            config.bg,
            config.clickable && "active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
            !config.clickable && "cursor-default"
          )}
          title={billet ? `${billet.client.name} - Siège ${seatNum}` : `Siège ${seatNum} - Vide`}
          aria-label={
            billet
              ? `Siège ${seatNum}, ${billet.client.name}, ${status}`
              : `Siège ${seatNum}, vacant`
          }
        >
          {config.icon ? (
            <span className={config.text}>{config.icon}</span>
          ) : (
            <span className={cn("text-xs font-semibold", config.text)}>{seatNum}</span>
          )}
        </button>
      );
    },
    [billetMap, onSeatClick]
  );

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Bus shape container */}
      <div className="relative w-full max-w-xs sm:max-w-sm">
        {/* Bus rounded top (front view from above) */}
        <div
          className="relative rounded-t-[2.5rem] border-2 border-foreground/30 bg-background p-4 sm:p-6 pt-6 sm:pt-8"
          style={{ borderTopLeftRadius: "50% 30%", borderTopRightRadius: "50% 30%" }}
        >
          {/* Driver area indicator */}
          <div className="mx-auto mb-3 flex h-8 w-16 items-center justify-center rounded-full border border-dashed border-foreground/20 text-[10px] text-muted-foreground">
            <Armchair className="size-3 mr-1" />
            Chauffeur
          </div>

          {/* Seat grid */}
          <div className="space-y-2">
            {Array.from({ length: totalRows }, (_, rowIdx) => {
              const rowStart = rowIdx * SEATS_PER_ROW + 1;
              const rowSeats = Array.from(
                { length: SEATS_PER_ROW },
                (_, i) => rowStart + i
              ).filter((s) => s <= capacity);

              return (
                <div key={rowIdx} className="grid grid-cols-5 gap-1.5 sm:gap-2 items-center">
                  {/* Left 2 seats */}
                  {rowSeats.slice(0, 2).map((s) => renderSeat(s))}
                  {/* Aisle */}
                  <div className="flex items-center justify-center">
                    <div className="h-6 w-px bg-foreground/10" />
                  </div>
                  {/* Right 2 seats */}
                  {rowSeats.slice(2, 4).map((s) => renderSeat(s))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bus bottom (flat) */}
        <div className="h-2 rounded-b-lg border-x-2 border-b-2 border-foreground/30 border-t-0" />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-muted-foreground/20 bg-muted/50" />
          <span>Vacant</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-foreground/20 bg-white" />
          <span>Vendu</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#22c55e]" />
          <span>Embarqué</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#ef4444]" />
          <span>Absent</span>
        </div>
      </div>
    </div>
  );
}