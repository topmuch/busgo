"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FlashlightOff, Flashlight, Loader2, Keyboard } from "lucide-react";
import type { Html5Qrcode as Html5QrcodeType } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function playBeep(frequency = 1000, duration = 150) {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration / 1000);
  } catch {
    // Audio not available, silently ignore
  }
}

interface QRScannerProps {
  trajetId: string;
  onScanSuccess: (billet: { id: string; seatNumber: number; clientName: string; ticketNumber: string }) => void;
  onScanError: (message: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function QRScanner({
  trajetId,
  onScanSuccess,
  onScanError,
  isOpen,
  onClose,
}: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeType | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const lastScanTimeRef = useRef(0);

  // Manual entry mode
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const handleSuccess = useCallback(
    async (decodedText: string) => {
      // Debounce: ignore scans within 3 seconds
      const now = Date.now();
      if (now - lastScanTimeRef.current < 3000) return;
      lastScanTimeRef.current = now;

      try {
        const response = await fetch(
          `/api/agent/scan?XTransformPort=3000`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qrCode: decodedText, trajetId }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          playBeep(1000, 150);
          setLastResult({
            type: "success",
            message: `${data.clientName} - Siège ${data.seatNumber}`,
          });
          onScanSuccess({
            id: data.id,
            seatNumber: data.seatNumber,
            clientName: data.clientName,
            ticketNumber: data.ticketNumber ?? decodedText,
          });
        } else {
          playBeep(300, 400);
          setLastResult({
            type: "error",
            message: data.error || data.message || "Billet invalide",
          });
          onScanError(data.error || data.message || "Billet invalide");
        }

        // Clear last result after 3 seconds
        setTimeout(() => setLastResult(null), 3000);
      } catch {
        playBeep(300, 400);
        setLastResult({ type: "error", message: "Erreur réseau" });
        onScanError("Erreur réseau");
        setTimeout(() => setLastResult(null), 3000);
      }
    },
    [trajetId, onScanSuccess, onScanError]
  );

  // Initialize scanner
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const scannerId = "qr-scanner-reader";

    const initScanner = async () => {
      // Dynamic import to avoid SSR issues
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!mounted || !containerRef.current) return;

      // Clean up any existing element with the same id
      const existingEl = document.getElementById(scannerId);
      if (existingEl) existingEl.remove();

      // Create container div
      const div = document.createElement("div");
      div.id = scannerId;
      containerRef.current.appendChild(div);

      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;
      setIsScanning(true);

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          handleSuccess,
          () => {
            // QR code not found in frame — ignore
          }
        );

        // Check torch support
        try {
          const track = (scanner as unknown as { _renderedCamera?: { getVideoTracks?: () => { getCapabilities?: () => Record<string, unknown> }[] } })._renderedCamera;
          if (track?.getVideoTracks?.()) {
            const capabilities = track.getVideoTracks()[0]?.getCapabilities?.();
            if (capabilities && "torch" in capabilities) {
              setHasTorch(true);
            }
          }
        } catch {
          // Torch detection failed, ignore
        }
      } catch (err) {
        if (mounted) {
          console.error("Scanner init error:", err);
          setIsScanning(false);
          setLastResult({
            type: "error",
            message: "Impossible d'accéder à la caméra",
          });
        }
      }
    };

    initScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
            scannerRef.current = null;
          })
          .catch(() => {
            scannerRef.current = null;
          });
      }
      // Clean up DOM
      const el = document.getElementById(scannerId);
      if (el) el.remove();
      setIsScanning(false);
    };
  }, [isOpen, handleSuccess]);

  // Torch toggle
  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      const applyConstraints = (
        scannerRef.current as unknown as {
          applyVideoConstraints: (constraints: { advanced: { torch: boolean }[] }) => Promise<void>;
        }
      ).applyVideoConstraints;
      if (applyConstraints) {
        await applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn(!torchOn);
      }
    } catch {
      // Torch not available
    }
  };

  // Clean up on close
  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        })
        .catch(() => {
          scannerRef.current = null;
        });
      const el = document.getElementById("qr-scanner-reader");
      if (el) el.remove();
    }
    setIsScanning(false);
    setTorchOn(false);
    setLastResult(null);
    setManualMode(false);
    setManualCode("");
    setManualLoading(false);
    onClose();
  };

  // Manual code submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setManualLoading(true);
    try {
      const response = await fetch(`/api/agent/scan?XTransformPort=3000`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: manualCode.trim(), trajetId }),
      });
      const data = await response.json();
      if (response.ok) {
        playBeep(1000, 150);
        setLastResult({
          type: "success",
          message: `${data.clientName} - Siège ${data.seatNumber}`,
        });
        onScanSuccess({
          id: data.id,
          seatNumber: data.seatNumber,
          clientName: data.clientName,
          ticketNumber: data.ticketNumber ?? manualCode.trim(),
        });
        setManualCode("");
        // Auto-close after success
        setTimeout(() => handleClose(), 1500);
      } else {
        playBeep(300, 400);
        setLastResult({
          type: "error",
          message: data.error || data.message || "Billet invalide",
        });
        onScanError(data.error || data.message || "Billet invalide");
      }
      setTimeout(() => setLastResult(null), 3000);
    } catch {
      playBeep(300, 400);
      setLastResult({ type: "error", message: "Erreur réseau" });
      onScanError("Erreur réseau");
      setTimeout(() => setLastResult(null), 3000);
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="flex flex-col gap-0 p-0 overflow-hidden sm:max-w-md max-h-[100dvh]">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>Scanner le billet</DialogTitle>
          <DialogDescription>
            Pointez la caméra vers le QR code du billet
          </DialogDescription>
        </DialogHeader>

        {/* Scanner viewport OR manual entry form */}
        {manualMode ? (
          <div className="flex-1 p-4 space-y-3">
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">
                  Code du billet ou numéro de ticket
                </label>
                <Input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ex: BG-12345 ou numéro de ticket"
                  autoFocus
                  disabled={manualLoading}
                  className="font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Saisissez le code QR ou le numéro de ticket affiché sur le billet papier.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 bg-[#22c55e] hover:bg-[#22c55e]/90 text-white"
                  disabled={manualLoading || !manualCode.trim()}
                >
                  {manualLoading ? (
                    <>
                      <Loader2 className="size-4 mr-1 animate-spin" />
                      Validation...
                    </>
                  ) : (
                    "Valider le billet"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setManualMode(false)}
                  disabled={manualLoading}
                >
                  Retour caméra
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="relative flex-1 min-h-[300px] max-h-[60vh] bg-black">
            <div ref={containerRef} className="w-full h-full" />

            {/* Scanning animation overlay */}
            {isScanning && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative w-[250px] h-[250px] sm:w-[280px] sm:h-[280px]">
                  {/* Corner brackets */}
                  <span className="absolute top-0 left-0 h-6 w-6 border-t-2 border-l-2 border-white/70 rounded-tl" />
                  <span className="absolute top-0 right-0 h-6 w-6 border-t-2 border-r-2 border-white/70 rounded-tr" />
                  <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-white/70 rounded-bl" />
                  <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-white/70 rounded-br" />
                  {/* Scanning line animation */}
                  <div className="absolute left-2 right-2 h-0.5 bg-[#22c55e]/80 animate-scan-line shadow-[0_0_8px_2px_rgba(34,197,94,0.4)]" />
                </div>
              </div>
            )}

            {/* Loading state */}
            {!isScanning && !lastResult && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 className="size-8 text-white animate-spin" />
              </div>
            )}

            {/* Camera error fallback — show manual button */}
            {!isScanning && lastResult?.type === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center">
                <p className="text-sm mb-3">Caméra indisponible ?</p>
                <Button
                  variant="outline"
                  onClick={() => setManualMode(true)}
                  className="bg-white text-black hover:bg-white/90"
                >
                  <Keyboard className="size-4 mr-1" />
                  Saisie manuelle
                </Button>
              </div>
            )}

            {/* Torch button */}
            {hasTorch && isScanning && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 bg-black/40 text-white hover:bg-black/60 hover:text-white rounded-full"
                onClick={toggleTorch}
              >
                {torchOn ? <FlashlightOff className="size-5" /> : <Flashlight className="size-5" />}
                <span className="sr-only">{torchOn ? "Désactiver le flash" : "Activer le flash"}</span>
              </Button>
            )}

            {/* Manual mode toggle */}
            {isScanning && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/40 text-white hover:bg-black/60 hover:text-white rounded-full"
                onClick={() => setManualMode(true)}
              >
                <Keyboard className="size-4 mr-1" />
                Saisie manuelle
              </Button>
            )}
          </div>
        )}

        {/* Last result toast */}
        {lastResult && (
          <div
            className={cn(
              "mx-4 mb-3 rounded-lg px-4 py-3 text-sm font-medium text-center transition-all",
              lastResult.type === "success"
                ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
                : "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30"
            )}
          >
            {lastResult.type === "success" ? "✅ " : "❌ "}
            {lastResult.message}
          </div>
        )}

        {/* Close button */}
        <div className="px-4 pb-4">
          <Button variant="outline" className="w-full" onClick={handleClose}>
            Fermer le scanner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}