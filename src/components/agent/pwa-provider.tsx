"use client";

import { usePWA } from "@/hooks/use-pwa";
import { OfflineIndicator } from "@/components/agent/offline-indicator";
import { useEffect, useState } from "react";
import {
  cacheTrajet,
  getPendingCount,
  syncPendingOperations,
} from "@/lib/offline-store";

export function AgentPWAProvider({ children }: { children: React.ReactNode }) {
  const { isOnline, canInstall, installApp } = usePWA();
  const [pendingCount, setPendingCount] = useState(0);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Check pending operations periodically
  useEffect(() => {
    const checkPending = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };
    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (!isOnline || pendingCount === 0) return;
    syncPendingOperations().then((result) => {
      if (result.scansSynced + result.statusesSynced > 0) {
        setPendingCount((prev) => Math.max(0, prev - result.scansSynced - result.statusesSynced));
        // Refresh current page data
        window.dispatchEvent(new CustomEvent("offline-sync-complete", { detail: result }));
      }
    });
  }, [isOnline, pendingCount]);

  // Show install banner once
  useEffect(() => {
    if (canInstall) {
      const dismissed = sessionStorage.getItem("install-banner-dismissed");
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    }
  }, [canInstall]);

  return (
    <>
      {/* PWA Meta Tags - injected via head */}
      <link rel="manifest" href="/manifest-agent.json" />
      <meta name="theme-color" content="#f59e0b" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="BusGo Agent" />
      <link rel="apple-touch-icon" href="/icons/icon-192.png" />

      {/* Install banner */}
      {showInstallBanner && (
        <div className="fixed top-16 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[60] bg-card border rounded-xl shadow-lg p-4 animate-slide-in-right">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
              BG
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Installer Bus Go Agent</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Accès rapide depuis l&apos;écran d&apos;accueil
              </p>
            </div>
            <button
              onClick={() => {
                setShowInstallBanner(false);
                sessionStorage.setItem("install-banner-dismissed", "1");
              }}
              className="text-muted-foreground hover:text-foreground text-lg leading-none"
            >
              &times;
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={async () => {
                const accepted = await installApp();
                if (accepted) setShowInstallBanner(false);
              }}
              className="flex-1 rounded-lg bg-amber-600 text-white text-sm font-medium py-2 hover:bg-amber-700 transition-colors"
            >
              Installer
            </button>
            <button
              onClick={() => {
                setShowInstallBanner(false);
                sessionStorage.setItem("install-banner-dismissed", "1");
              }}
              className="flex-1 rounded-lg border text-sm font-medium py-2 hover:bg-muted transition-colors"
            >
              Plus tard
            </button>
          </div>
        </div>
      )}

      {children}

      {/* Offline indicator */}
      <OfflineIndicator isOnline={isOnline} pendingCount={pendingCount} />
    </>
  );
}