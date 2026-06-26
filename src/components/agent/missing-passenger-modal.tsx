"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Phone, Clock, UserX, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MissingPassengerModalProps {
  billet: {
    id: string;
    seatNumber: number;
    client: { id: string; name: string; phone: string; reliabilityScore: number | null };
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAbsent: (billetId: string) => void;
  onMarkArriving: (billetId: string, minutes: number) => void;
  /** Called when user clicks "Supprimer" — typically PATCHes status to "cancelled" */
  onDelete?: (billetId: string) => void;
}

function getReliabilityBadge(score: number | null) {
  if (score === null) {
    return (
      <Badge variant="outline" className="bg-muted/50 text-muted-foreground">
        Non évalué
      </Badge>
    );
  }
  if (score >= 90) {
    return (
      <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30 hover:bg-[#22c55e]/20">
        Fiable ({score}%)
      </Badge>
    );
  }
  if (score >= 70) {
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">
        Moyen ({score}%)
      </Badge>
    );
  }
  return (
    <Badge className="bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30 hover:bg-[#ef4444]/20">
      Risqué ({score}%)
    </Badge>
  );
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MissingPassengerModal({
  billet,
  isOpen,
  onClose,
  onMarkAbsent,
  onMarkArriving,
  onDelete,
}: MissingPassengerModalProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleClose = useCallback(() => {
    setCountdown(null);
    setDeleteDialogOpen(false);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    onClose();
  }, [onClose]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown === null) return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [countdown]);

  const handleMarkArriving = useCallback(
    (minutes: number) => {
      if (!billet) return;
      onMarkArriving(billet.id, minutes);
      setCountdown(minutes * 60);
    },
    [billet, onMarkArriving]
  );

  const handleMarkAbsent = useCallback(() => {
    if (!billet) return;
    onMarkAbsent(billet.id);
    handleClose();
  }, [billet, onMarkAbsent, handleClose]);

  if (!billet) return null;

  const { client, seatNumber } = billet;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="size-5 text-amber-500" />
            Passager absent
          </DialogTitle>
          <DialogDescription>
            Siège {seatNumber} — Choisissez une action
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Passenger info */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold">{client.name}</p>
              <p className="text-sm text-muted-foreground">{client.phone}</p>
            </div>
            <div className="shrink-0">{getReliabilityBadge(client.reliabilityScore)}</div>
          </div>

          {/* Call button */}
          <a
            href={`tel:${client.phone}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Phone className="size-4" />
            Appeler
          </a>

          {/* Countdown display */}
          {countdown !== null && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center">
              <p className="text-xs text-amber-600 mb-1">Arrivée estimée</p>
              <p className="text-2xl font-bold tabular-nums text-amber-700">
                {formatCountdown(countdown)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:gap-2">
          {/* Arriving in 5 min */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => handleMarkArriving(5)}
            disabled={countdown !== null}
          >
            <span className="text-lg">🟡</span>
            <span className="font-medium">
              Arrive dans 5 min
              {countdown !== null && (
                <span className="ml-2 text-sm text-muted-foreground">
                  ({formatCountdown(countdown)})
                </span>
              )}
            </span>
          </Button>

          {/* Arriving in 10 min */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => handleMarkArriving(10)}
            disabled={countdown !== null}
          >
            <span className="text-lg">🟠</span>
            <span className="font-medium">Arrive dans 10 min</span>
          </Button>

          {/* Absent */}
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start gap-3 h-auto py-3 border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10 hover:text-[#ef4444]"
            )}
            onClick={handleMarkAbsent}
          >
            <UserX className="size-5" />
            <span className="font-medium">Ne viendra pas</span>
          </Button>

          {/* Supprimer (cancel billet) */}
          {onDelete && (
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start gap-3 h-auto py-3 border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              )}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="size-5" />
              <span className="font-medium">Supprimer le billet</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce billet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va marquer le billet de{" "}
              <strong>{billet.client.name}</strong> (siège {billet.seatNumber})
              comme <strong>annulé</strong>. Le siège redeviendra vacant.
              Cette action est réversible (le billet reste en base).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-slate-700 hover:bg-slate-800 text-white"
              onClick={() => {
                if (billet && onDelete) {
                  onDelete(billet.id);
                  setDeleteDialogOpen(false);
                  handleClose();
                }
              }}
            >
              <Trash2 className="size-4 mr-1" />
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}