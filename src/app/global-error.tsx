"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 *  Global Error Boundary
 *  Catches unhandled errors in any route, displays a friendly UI
 *  instead of Next.js default "Application error" page.
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console (in prod, this would go to Sentry/Datadog)
    console.error("[GLOBAL_ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          Une erreur est survenue
        </h1>

        <p className="text-sm text-slate-600">
          Une erreur inattendue s&apos;est produite. Notre équipe a été notifiée.
          Veuillez réessayer.
        </p>

        {process.env.NODE_ENV === "development" && (
          <details className="text-left bg-slate-50 rounded-lg p-3 text-xs">
            <summary className="cursor-pointer text-slate-700 font-medium">
              Détails techniques (dev only)
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-all text-slate-600">
              {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            onClick={reset}
            className="flex-1 bg-[#4A90E2] hover:bg-[#3a82c7] text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Accueil
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
