"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 *  useAgentTracking(tripId)
 *  Hook agent pour écouter les positions live des passagers
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { formatLastSeen, isStale as isStaleCheck } from "@/lib/tracking/geo-utils";

export interface PassengerLocation {
  bookingId: string;
  tripId: string;
  clientId: string;
  clientName?: string;
  lat: number;
  lng: number;
  accuracy: number;
  etaMinutes?: number;
  distanceMeters?: number;
  last_seen: string;
  isStale: boolean;
  isStatic: boolean;
}

interface AgentMessage {
  type: "wait" | "leave";
  message: string;
  timestamp: string;
}

interface StaticWarning {
  bookingId: string;
  tripId: string;
  clientName?: string;
  message: string;
  timestamp: string;
}

interface TrackingStoppedEvent {
  bookingId: string;
  tripId?: string;
  reason?: string;
  message?: string;
}

export interface AgentTrackingState {
  /** Map of bookingId → location, kept fresh in memory only */
  locations: Map<string, PassengerLocation>;
  /** Static warnings (passenger immobile > 10 min) */
  staticWarnings: StaticWarning[];
  /** Count of currently tracked passengers */
  activeCount: number;
  /** Is the socket connected? */
  isConnected: boolean;
}

export function useAgentTracking(tripId: string | undefined, tenantId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<AgentTrackingState>({
    locations: new Map(),
    staticWarnings: [],
    activeCount: 0,
    isConnected: false,
  });
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);

  // ─── Connect + subscribe ───────────────────────────────────────
  useEffect(() => {
    if (!tripId) return;

    const socket = io("/?XTransformPort=3004", {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setState((s) => ({ ...s, isConnected: true }));
      socket.emit("subscribe_trip_tracking", { tripId, tenantId: tenantId ?? "" });
      if (tenantId) {
        socket.emit("join-tenant", tenantId);
      }
    });

    socket.on("disconnect", () => {
      setState((s) => ({ ...s, isConnected: false }));
    });

    // ─── Receive passenger_location updates ────────────────────
    socket.on("passenger_location", (data: PassengerLocation) => {
      if (data.tripId !== tripId) return;
      setState((s) => {
        const newMap = new Map(s.locations);
        const existing = newMap.get(data.bookingId);
        const updated: PassengerLocation = {
          ...data,
          // Recompute isStale based on current time
          isStale: isStaleCheck(new Date(data.last_seen).getTime()),
          clientName: data.clientName ?? existing?.clientName,
        };
        newMap.set(data.bookingId, updated);
        return { ...s, locations: newMap, activeCount: newMap.size };
      });
    });

    // ─── Tracking started (new passenger) ───────────────────────
    socket.on(
      "passenger_tracking_started",
      (data: { bookingId: string; tripId: string; clientId: string; clientName?: string }) => {
        if (data.tripId !== tripId) return;
        // Pre-populate an entry (no coord yet — will arrive via passenger_location)
        setState((s) => {
          if (s.locations.has(data.bookingId)) return s;
          const newMap = new Map(s.locations);
          newMap.set(data.bookingId, {
            bookingId: data.bookingId,
            tripId: data.tripId,
            clientId: data.clientId,
            clientName: data.clientName,
            lat: 0,
            lng: 0,
            accuracy: 0,
            last_seen: new Date().toISOString(),
            isStale: true,
            isStatic: false,
          });
          return { ...s, locations: newMap, activeCount: newMap.size };
        });
      }
    );

    // ─── Tracking stopped (remove from map) ────────────────────
    socket.on("tracking_stopped", (data: TrackingStoppedEvent) => {
      setState((s) => {
        if (!s.locations.has(data.bookingId)) return s;
        const newMap = new Map(s.locations);
        newMap.delete(data.bookingId);
        return { ...s, locations: newMap, activeCount: newMap.size };
      });
    });

    // ─── Static warning ────────────────────────────────────────
    socket.on("passenger_static_warning", (data: StaticWarning) => {
      if (data.tripId !== tripId) return;
      setState((s) => {
        // Avoid duplicates by bookingId+timestamp
        const exists = s.staticWarnings.some(
          (w) => w.bookingId === data.bookingId && w.timestamp === data.timestamp
        );
        if (exists) return s;
        return { ...s, staticWarnings: [...s.staticWarnings, data].slice(-20) };
      });
    });

    // ─── Agent message echoes (we sent them, ignore) ───────────
    socket.on("agent_message", () => {
      /* agent doesn't need to react to its own messages */
    });

    return () => {
      socket.emit("unsubscribe_trip_tracking", { tripId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tripId, tenantId]);

  // ─── Actions ───────────────────────────────────────────────────
  const setQuayPosition = useCallback(
    (lat: number, lng: number, label?: string) => {
      socketRef.current?.emit("set_quay_position", { tripId, lat, lng, label });
    },
    [tripId]
  );

  const sendWaitMessage = useCallback(
    (bookingId: string) => {
      socketRef.current?.emit("agent_cancel_tracking", {
        bookingId,
        tripId,
        tenantId: tenantId ?? "",
        action: "wait",
      });
    },
    [tripId, tenantId]
  );

  const sendLeaveMessage = useCallback(
    (bookingId: string) => {
      socketRef.current?.emit("agent_cancel_tracking", {
        bookingId,
        tripId,
        tenantId: tenantId ?? "",
        action: "leave",
      });
    },
    [tripId, tenantId]
  );

  const dismissStaticWarning = useCallback((bookingId: string) => {
    setState((s) => ({
      ...s,
      staticWarnings: s.staticWarnings.filter((w) => w.bookingId !== bookingId),
    }));
  }, []);

  // ─── Periodic "isStale" recompute (every 30s) ─────────────────
  useEffect(() => {
    if (state.locations.size === 0) return;
    const interval = setInterval(() => {
      setState((s) => {
        const newMap = new Map<string, PassengerLocation>();
        let changed = false;
        for (const [id, loc] of s.locations) {
          const newStale = isStaleCheck(new Date(loc.last_seen).getTime());
          if (newStale !== loc.isStale) {
            newMap.set(id, { ...loc, isStale: newStale });
            changed = true;
          } else {
            newMap.set(id, loc);
          }
        }
        return changed ? { ...s, locations: newMap } : s;
      });
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [state.locations.size]);

  return {
    state,
    agentMessages,
    setQuayPosition,
    sendWaitMessage,
    sendLeaveMessage,
    dismissStaticWarning,
    socketRef,
  };
}
