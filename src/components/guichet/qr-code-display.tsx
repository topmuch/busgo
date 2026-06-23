"use client";

import { useEffect, useRef, useCallback } from "react";
import { QrCode, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRCodeDisplayProps {
  billetId: string;
  ticketNumber: string;
  passengerName: string;
  trajetInfo: string;
  seatNumber: number;
  onReset?: () => void;
}

export function QRCodeDisplay({
  billetId,
  ticketNumber,
  passengerName,
  trajetInfo,
  seatNumber,
  onReset,
}: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const qrUrl = `https://busgo.sn/b/${billetId}`;

  const generateQR = useCallback(async () => {
    if (!canvasRef.current) return;
    const QRCode = (await import("qrcode")).default;
    QRCode.toCanvas(canvasRef.current, qrUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
  }, [qrUrl]);

  useEffect(() => {
    generateQR();
  }, [generateQR]);

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const canvas = canvasRef.current;
    const imgData = canvas?.toDataURL("image/png") ?? "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Billet Bus Go — ${ticketNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          .ticket {
            max-width: 320px;
            margin: 0 auto;
            border: 2px solid #000;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          }
          .ticket h1 { font-size: 20px; margin-bottom: 4px; }
          .ticket .subtitle { font-size: 11px; color: #666; margin-bottom: 12px; }
          .ticket .passenger { font-size: 16px; font-weight: bold; margin-bottom: 8px; }
          .ticket .trajet { font-size: 14px; margin-bottom: 4px; }
          .ticket .seat { font-size: 14px; font-weight: bold; margin-bottom: 12px; }
          .ticket .qr { margin-bottom: 8px; }
          .ticket .qr img { width: 200px; height: 200px; }
          .ticket .ticket-number { font-size: 10px; color: #999; margin-top: 4px; }
          .ticket .warning {
            margin-top: 10px;
            padding: 8px;
            background: #000;
            color: #fff;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 0.5px;
          }
          @media print {
            body { padding: 0; }
            .ticket { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <h1>Bus Go</h1>
          <div class="subtitle">Billet de transport</div>
          <div class="passenger">${passengerName}</div>
          <div class="trajet">${trajetInfo}</div>
          <div class="seat">Siège N°${seatNumber}</div>
          <div class="qr"><img src="${imgData}" alt="QR Code" /></div>
          <div class="ticket-number">${ticketNumber}</div>
          <div class="warning">Scannez ce QR code, c&apos;est OBLIGATOIRE</div>
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [ticketNumber, passengerName, trajetInfo, seatNumber]);

  return (
    <div ref={printRef} className="flex flex-col items-center gap-5 py-4">
      {/* QR Code */}
      <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-6">
        <canvas
          ref={canvasRef}
          className="mx-auto block"
          aria-label={`QR Code pour le billet ${ticketNumber}`}
        />
      </div>

      {/* Mandatory scan warning */}
      <div className="rounded-lg bg-destructive px-6 py-3 text-center">
        <p className="text-destructive-foreground font-bold text-sm tracking-wide">
          Scannez ce QR code, c&apos;est OBLIGATOIRE
        </p>
      </div>

      {/* Ticket info summary */}
      <div className="w-full max-w-xs space-y-1.5 text-center text-sm">
        <p className="font-semibold">{passengerName}</p>
        <p className="text-muted-foreground">{trajetInfo}</p>
        <p className="font-medium">Siège N°{seatNumber}</p>
        <p className="text-xs text-muted-foreground font-mono">
          {ticketNumber}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={handlePrint}
        >
          <Printer className="h-4 w-4" />
          Imprimer
        </Button>
        {onReset && (
          <Button
            size="lg"
            className="gap-2"
            onClick={onReset}
          >
            <RotateCcw className="h-4 w-4" />
            Nouveau passager
          </Button>
        )}
      </div>
    </div>
  );
}