"use client";

import { useCallback, useEffect, useState } from "react";

const CACHE_NAME = "busgo-v1";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("BusGoDB", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("voyageCache")) {
        db.createObjectStore("voyageCache", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("notifications")) {
        db.createObjectStore("notifications", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const deferredPromptRef = useState<BeforeInstallPromptEvent | null>(null);

  // Online/offline listener
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // PWA install prompt + installed check
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef[1](e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const installApp = useCallback(async () => {
    const prompt = deferredPromptRef[0];
    if (!prompt) return false;
    await prompt.prompt();
    const result = await prompt.userChoice;
    setShowInstallPrompt(false);
    return result.outcome === "accepted";
  }, [deferredPromptRef]);

  const cacheVoyage = useCallback(async (voyage: Record<string, unknown>) => {
    try {
      const db = await openDB();
      const tx = db.transaction("voyageCache", "readwrite");
      tx.objectStore("voyageCache").put(voyage);
      await tx.done;
    } catch {
      // IndexedDB unavailable
    }
  }, []);

  const getCachedVoyage = useCallback(async (id: string) => {
    try {
      const db = await openDB();
      const tx = db.transaction("voyageCache", "readonly");
      return new Promise<Record<string, unknown> | null>((resolve) => {
        const req = tx.objectStore("voyageCache").get(id);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }, []);

  const saveNotification = useCallback(async (notif: Record<string, unknown>) => {
    try {
      const db = await openDB();
      const tx = db.transaction("notifications", "readwrite");
      tx.objectStore("notifications").put(notif);
      await tx.done;
    } catch {
      // IndexedDB unavailable
    }
  }, []);

  return {
    isInstalled,
    isOnline,
    showInstallPrompt,
    installApp,
    cacheVoyage,
    getCachedVoyage,
    saveNotification,
  };
}