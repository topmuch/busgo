"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

// Bus Go Socket.io events
interface BusLocationEvent {
  busId: string;
  tenantId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  timestamp: string;
}

interface TrajetStatusEvent {
  trajetId: string;
  tenantId: string;
  status: string;
  timestamp: string;
}

interface BilletScanEvent {
  billetId: string;
  trajetId: string;
  tenantId: string;
  ticketNumber: string;
  status: "boarded" | "absent";
  scannedBy: string;
  seatNumber: number;
  timestamp: string;
}

interface NotificationEvent {
  id: string;
  tenantId: string;
  type: "trajet_update" | "billet_scan" | "bus_location" | "system";
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export function useBusGoSocket(tenantId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Event handlers state
  const [busLocations, setBusLocations] = useState<BusLocationEvent[]>([]);
  const [trajetStatuses, setTrajetStatuses] = useState<TrajetStatusEvent[]>([]);
  const [billetScans, setBilletScans] = useState<BilletScanEvent[]>([]);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);

  useEffect(() => {
    const socket = io("/?XTransformPort=3004", {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      if (tenantId) {
        socket.emit("join-tenant", tenantId);
      }
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // Bus location updates
    socket.on("bus-location-update", (data: BusLocationEvent) => {
      setBusLocations((prev) => {
        const filtered = prev.filter((b) => b.busId !== data.busId);
        return [...filtered, data].slice(-50); // Keep last 50
      });
    });

    // Trajet status updates
    socket.on("trajet-status-update", (data: TrajetStatusEvent) => {
      setTrajetStatuses((prev) => [...prev, data]);
    });

    // Billet scan events
    socket.on("billet-scan-update", (data: BilletScanEvent) => {
      setBilletScans((prev) => [...prev, data]);
    });

    // General notifications
    socket.on("notification", (data: NotificationEvent) => {
      setNotifications((prev) => [...prev, data]);
    });

    return () => {
      socket.disconnect();
    };
  }, [tenantId]);

  const joinTenant = (id: string) => {
    socketRef.current?.emit("join-tenant", id);
  };

  const joinTrajet = (id: string) => {
    socketRef.current?.emit("join-trajet", id);
  };

  const leaveTenant = (id: string) => {
    socketRef.current?.emit("leave-tenant", id);
  };

  return {
    isConnected,
    busLocations,
    trajetStatuses,
    billetScans,
    notifications,
    joinTenant,
    joinTrajet,
    leaveTenant,
    setNotifications,
    socketRef,
  };
}