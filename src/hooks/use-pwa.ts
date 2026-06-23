"use client";

import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [pendingInstall, setPendingInstall] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed
    if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPendingInstall(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setPendingInstall(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Register service worker
  const registerSW = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.register("/sw-agent.js", {
        scope: "/",
      });
      setRegistration(reg);

      // Listen for sync events
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SYNC_SCANS") {
          // Trigger sync from offline store
          import("@/lib/offline-store").then(({ syncPendingOperations }) => {
            syncPendingOperations().then((result) => {
              console.log("Sync result:", result);
              if (result.scansSynced + result.statusesSynced > 0) {
                // Dispatch a custom event so components can react
                window.dispatchEvent(
                  new CustomEvent("offline-sync-complete", { detail: result })
                );
              }
            });
          });
        }
      });

      // Request notification permission
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }

      console.log("Service Worker registered:", reg.scope);
    } catch (error) {
      console.warn("SW registration failed:", error);
    }
  }, []);

  // Auto-register on mount
  useEffect(() => {
    registerSW();
  }, [registerSW]);

  const installApp = useCallback(async () => {
    if (!pendingInstall) return false;
    await pendingInstall.prompt();
    const result = await pendingInstall.userChoice;
    return result.outcome === "accepted";
  }, [pendingInstall]);

  return {
    isInstalled,
    isOnline,
    canInstall: !!pendingInstall,
    installApp,
    registration,
  };
}