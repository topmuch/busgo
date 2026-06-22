"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

interface OfflineIndicatorProps {
  isOnline?: boolean;
  pendingCount?: number;
}

export function OfflineIndicator({ isOnline: isOnlineProp, pendingCount = 0 }: OfflineIndicatorProps) {
  const internalOnline = useOnlineStatus();
  const isOnline = isOnlineProp !== undefined ? isOnlineProp : internalOnline;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium shadow-lg transition-all duration-300",
        isOnline
          ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
          : "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30"
      )}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Wifi className="size-3.5" />
          <span>En ligne</span>
        </>
      ) : (
        <>
          <WifiOff className="size-3.5" />
          <span>Hors ligne</span>
        </>
      )}

      {pendingCount > 0 && (
        <span className="flex items-center gap-1 ml-1 pl-1 border-l border-current/30">
          <RefreshCw className="size-3 animate-spin" />
          <span>{pendingCount} en attente de sync</span>
        </span>
      )}
    </div>
  );
}