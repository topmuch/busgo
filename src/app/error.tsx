"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 *  Route Error Boundary
 *  Catches errors in specific route segments (nested layout level).
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ROUTE_ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center space-y-3">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
          </div>
        </div>

        <h2 className="text-lg font-semibold text-slate-900">
          Cette page a rencontré un problème
        </h2>

        <p className="text-sm text-slate-600">
          Veuillez réessayer. Si le problème persiste, déconnectez-vous puis
          reconnectez-vous.
        </p>

        {process.env.NODE_ENV === "development" && (
          <details className="text-left bg-slate-50 rounded-lg p-2 text-xs">
            <summary className="cursor-pointer text-slate-700 font-medium">
              Détails (dev)
            </summary>
            <pre className="mt-1 whitespace-pre-wrap break-all text-slate-600">
              {error.message}
            </pre>
          </details>
        )}

        <Button
          onClick={reset}
          className="w-full bg-[#4A90E2] hover:bg-[#3a82c7] text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </div>
    </div>
  );
}
