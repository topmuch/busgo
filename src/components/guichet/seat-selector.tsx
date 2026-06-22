"use client";

import { cn } from "@/lib/utils";

interface SeatSelectorProps {
  capacity: number;
  occupiedSeats: number[];
  selectedSeat: number | null;
  onSelect: (seat: number) => void;
  disabled?: boolean;
}

function getBusLayout(capacity: number) {
  // 2 seats per row, aisle, 2 seats per row (standard bus layout)
  const cols = 4; // 2 left + aisle + 2 right
  const rows = Math.ceil(capacity / cols);
  return { cols, rows };
}

function seatLabel(seat: number): string {
  const row = Math.floor((seat - 1) / 4);
  const posInRow = ((seat - 1) % 4) + 1;
  const letter = String.fromCharCode(64 + posInRow); // A, B, C, D
  return `${row + 1}${letter}`;
}

export function SeatSelector({
  capacity,
  occupiedSeats,
  selectedSeat,
  onSelect,
  disabled = false,
}: SeatSelectorProps) {
  const { cols, rows } = getBusLayout(capacity);
  const totalSeats = rows * cols;
  const leftSide = [0, 1]; // positions 0,1 are left
  const rightSide = [2, 3]; // positions 2,3 are right

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Plan du bus</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-4 w-4 rounded border bg-background" />
            Libre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-4 w-4 rounded bg-primary text-primary-foreground" />
            Sélectionné
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-4 w-4 rounded bg-muted-foreground/30" />
            Pris
          </span>
        </div>
      </div>

      {/* Bus outline */}
      <div className="relative rounded-xl border-2 border-muted-foreground/30 bg-muted/20 p-3 sm:p-4">
        {/* Driver seat */}
        <div className="mb-3 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
            <svg
              className="h-4 w-4 text-muted-foreground/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0"
              />
            </svg>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Chauffeur
          </span>
        </div>

        {/* Seat grid */}
        <div className="space-y-1.5">
          {Array.from({ length: rows }, (_, rowIdx) => {
            const rowSeats = [];
            for (let col = 0; col < cols; col++) {
              const seatNum = rowIdx * cols + col + 1;
              if (seatNum > capacity) {
                // Empty slot for seats beyond capacity
                rowSeats.push(
                  <div key={`empty-${col}`} className="h-10 w-10 sm:h-11 sm:w-11" />
                );
                continue;
              }

              const isOccupied = occupiedSeats.includes(seatNum);
              const isSelected = selectedSeat === seatNum;
              const isLeft = leftSide.includes(col);

              rowSeats.push(
                <button
                  key={seatNum}
                  type="button"
                  disabled={disabled || isOccupied}
                  onClick={() => onSelect(seatNum)}
                  className={cn(
                    "h-10 w-10 sm:h-11 sm:w-11 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                    "flex flex-col items-center justify-center",
                    isOccupied &&
                      "bg-muted-foreground/20 text-muted-foreground/50 cursor-not-allowed line-through",
                    !isOccupied &&
                      !isSelected &&
                      "bg-background border-2 border-muted-foreground/20 hover:border-primary/60 hover:bg-primary/5 cursor-pointer",
                    isSelected &&
                      "bg-primary text-primary-foreground border-2 border-primary shadow-md scale-105 cursor-pointer"
                  )}
                  title={
                    isOccupied
                      ? `Siège ${seatNum} — occupé`
                      : `Siège ${seatLabel(seatNum)}`
                  }
                  aria-label={
                    isOccupied
                      ? `Siège ${seatNum} occupé`
                      : isSelected
                        ? `Siège ${seatNum} sélectionné`
                        : `Sélectionner siège ${seatNum}`
                  }
                >
                  <span>{seatNum}</span>
                </button>
              );
            }

            return (
              <div key={rowIdx} className="flex items-center justify-center gap-1">
                {/* Left side (2 seats) */}
                <div className="flex gap-1">
                  {rowSeats.slice(0, 2)}
                </div>

                {/* Aisle */}
                <div className="w-6 sm:w-8" />

                {/* Right side (2 seats) */}
                <div className="flex gap-1">
                  {rowSeats.slice(2, 4)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Back row label */}
        <div className="mt-2 text-center">
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
            Arrière
          </span>
        </div>
      </div>

      {selectedSeat && (
        <p className="text-sm text-center font-medium">
          Siège sélectionné :{" "}
          <span className="text-primary font-bold">{selectedSeat}</span>
          <span className="text-muted-foreground ml-1">
            ({seatLabel(selectedSeat)})
          </span>
        </p>
      )}
    </div>
  );
}