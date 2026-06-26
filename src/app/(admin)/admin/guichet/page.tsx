"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Ticket,
  Loader2,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeatSelector } from "@/components/guichet/seat-selector";
import { QRCodeDisplay } from "@/components/guichet/qr-code-display";

interface Trajet {
  id: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  price: number;
  status: string;
  bus: { id: string; number: string; capacity: number };
  billets?: { seatNumber: number }[];
}

interface CreatedBillet {
  id: string;
  ticketNumber: string;
  seatNumber: number;
  trajet: Trajet;
  client: { name: string };
}

export default function GuichetPage() {
  // Form state
  const [ticketNumber, setTicketNumber] = useState("");
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [selectedTrajetId, setSelectedTrajetId] = useState("");
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

  // Data
  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [occupiedSeats, setOccupiedSeats] = useState<number[]>([]);

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdBillet, setCreatedBillet] = useState<CreatedBillet | null>(null);
  const [nameInputRef, setNameInputRef] = useState<HTMLInputElement | null>(null);

  // Auto-generate ticket number
  const generateTicketNumber = useCallback(() => {
    const now = new Date();
    const seq =
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    return `PAP-${seq}`;
  }, []);

  useEffect(() => {
    setTicketNumber(generateTicketNumber());
  }, [generateTicketNumber, createdBillet]);

  // Fetch today's trajets with billets
  const fetchTrajets = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/trajets?dateFilter=today&includeBillets=true"
      );
      const data: Trajet[] = await res.json();
      setTrajets(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchTrajets();
  }, [fetchTrajets]);

  const selectedTrajet = trajets.find((t) => t.id === selectedTrajetId);

  // Update occupied seats when trajet changes
  useEffect(() => {
    setSelectedSeat(null);
    if (selectedTrajet?.billets) {
      setOccupiedSeats(selectedTrajet.billets.map((b) => b.seatNumber));
    } else {
      setOccupiedSeats([]);
    }
  }, [selectedTrajetId, selectedTrajet, trajets]);

  const handleSubmit = useCallback(async () => {
    setError("");

    if (!ticketNumber.trim()) {
      setError("Numéro du ticket papier requis");
      return;
    }
    if (!passengerName.trim()) {
      setError("Nom du passager requis");
      return;
    }
    if (!selectedTrajetId) {
      setError("Sélectionnez un trajet");
      return;
    }
    if (!selectedSeat) {
      setError("Sélectionnez un siège");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/billets/create-guichet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trajetId: selectedTrajetId,
          passengerName: passengerName.trim(),
          passengerPhone: passengerPhone.trim(),
          seatNumber: selectedSeat,
          ticketNumber: ticketNumber.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur de création");
      }

      setCreatedBillet(data);
      fetchTrajets(); // Refresh trajet data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [ticketNumber, passengerName, passengerPhone, selectedTrajetId, selectedSeat, fetchTrajets]);

  const handleReset = useCallback(() => {
    setCreatedBillet(null);
    setPassengerName("");
    setPassengerPhone("");
    setSelectedSeat(null);
    setError("");
    setSelectedTrajetId("");
    setOccupiedSeats([]);
    // Focus name input after render
    setTimeout(() => nameInputRef?.focus(), 100);
  }, [nameInputRef]);

  // Keyboard shortcut: Ctrl+Enter to submit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !createdBillet) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, createdBillet]);

  // ── QR Code generated view ──
  if (createdBillet) {
    const trajet = createdBillet.trajet;
    const trajetInfo = `${trajet.origin} → ${trajet.destination} · ${new Date(trajet.date).toLocaleDateString("fr-FR")} ${trajet.time}`;

    return (
      <div className="max-w-lg mx-auto">
        <QRCodeDisplay
          billetId={createdBillet.id}
          ticketNumber={createdBillet.ticketNumber}
          passengerName={createdBillet.client.name}
          trajetInfo={trajetInfo}
          seatNumber={createdBillet.seatNumber}
          onReset={handleReset}
        />
      </div>
    );
  }

  // ── Form view ──
  const soldCount = selectedTrajet?.billets?.length ?? 0;
  const capacity = selectedTrajet?.bus.capacity ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Ticket className="h-6 w-6" />
          Guichet
        </h1>
        <p className="text-muted-foreground">
          Saisie rapide — vendez un ticket papier puis générez le QR code.
          <kbd className="ml-2 hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            Ctrl+Entrée
          </kbd>
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Passenger form */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Passager
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Ticket number */}
              <div className="space-y-1.5">
                <Label htmlFor="ticketNumber">N° ticket papier</Label>
                <Input
                  id="ticketNumber"
                  placeholder="PAP-001"
                  value={ticketNumber}
                  onChange={(e) =>
                    setTicketNumber(e.target.value.toUpperCase())
                  }
                />
              </div>

              {/* Name + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="passengerName">Nom complet</Label>
                  <Input
                    ref={setNameInputRef}
                    id="passengerName"
                    placeholder="Prénom Nom"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="passengerPhone">Téléphone</Label>
                  <Input
                    id="passengerPhone"
                    placeholder="+221 77 123 4567"
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Trajet selector */}
              <div className="space-y-1.5">
                <Label>Trajet</Label>
                <Select
                  value={selectedTrajetId}
                  onValueChange={setSelectedTrajetId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez un trajet" />
                  </SelectTrigger>
                  <SelectContent>
                    {trajets.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Aucun trajet aujourd&apos;hui
                      </div>
                    )}
                    {trajets
                      .filter((t) => t.status !== "cancelled" && t.status !== "arrived")
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="font-medium">
                            {t.time} — {t.origin} → {t.destination}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            Bus {t.bus.number} ({t.billets?.length ?? 0}/
                            {t.bus.capacity})
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Occupancy bar */}
              {selectedTrajet && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Occupation</span>
                    <span>
                      {soldCount}/{capacity} places
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 bg-primary"
                      style={{
                        width: `${Math.min((soldCount / capacity) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit button */}
          <Button
            size="lg"
            className="w-full gap-2 text-base"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Ticket className="h-4 w-4" />
            )}
            {loading ? "Génération en cours..." : "Vendre le billet"}
          </Button>
        </div>

        {/* Right column: Seat selector */}
        <Card>
          <CardContent className="pt-4">
            {selectedTrajet ? (
              <SeatSelector
                capacity={selectedTrajet.bus.capacity}
                occupiedSeats={occupiedSeats}
                selectedSeat={selectedSeat}
                onSelect={setSelectedSeat}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                <svg
                  className="h-12 w-12 opacity-30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0H21M3.375 14.25V3.375c0-.621.504-1.125 1.125-1.125h9.75c.621 0 1.125.504 1.125 1.125v10.875M3.375 14.25h17.25"
                  />
                </svg>
                <p className="text-sm">Sélectionnez un trajet pour voir le plan du bus</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}