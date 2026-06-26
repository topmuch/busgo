"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 *  usePassengerTracking(bookingId)
 *  Hook personnalisé pour gérer le cycle de vie GPS côté passager
 * ═══════════════════════════════════════════════════════════════
 *
 *  Responsabilités:
 *  - Demander la permission geolocation
 *  - watchPosition avec optimisation batterie (low accuracy par défaut)
 *  - Passer en haute précision si distance au quai < 500m
 *    (basé sur le calcul serveur echo via passenger_location)
 *  - Couper le watchPosition en arrière-plan > 2 min
 *  - Émettre gps_update via Socket.io
 *  - Gérer tracking_stopped (agent cancel / 45min TTL)
 *  - Gérer le refus de permission gracieusement
 *  - Aucune persistance localStorage des coords (RGPD)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface PassengerTrackingState {
  status: "idle" | "requesting" | "active" | "stopped" | "denied" | "error";
  error?: string;
  /** Dernière position connue (en mémoire uniquement, jamais persistée) */
  currentCoord?: { lat: number; lng: number; accuracy: number; timestamp: number };
  /** ETA reçu du serveur (OSRM/Haversine) */
  etaMinutes?: number;
  distanceMeters?: number;
  /** Mode haute précision activé */
  isHighAccuracy: boolean;
  /** Consommation batterie élevée détectée */
  highBatteryUsage: boolean;
  /** Position approximative (réseau cellulaire) */
  isApproximate: boolean;
  /** Agent a envoyé un message */
  agentMessage?: { type: "wait" | "leave"; message: string; timestamp: string };
  /** Raison de l'arrêt */
  stopReason?: "manual" | "boarding" | "completed" | "no_show" | "timeout_45min" | "departed_reject";
  /** Timestamp d'expiration (45 min) */
  expiresAt?: number;
}

interface UsePassengerTrackingOptions {
  bookingId: string;
  tripId: string;
  clientId?: string;
  clientName?: string;
}

const BACKGROUND_TIMEOUT_MS = 2 * 60 * 1000; // 2 min
const HIGH_ACCURACY_DISTANCE_M = 500;
const HIGH_BATTERY_UPDATE_MS = 2000; // < 2s between updates = high battery
const HIGH_BATTERY_THRESHOLD = 5;
const APPROXIMATE_ACCURACY_M = 500;

export function usePassengerTracking(opts: UsePassengerTrackingOptions) {
  const { bookingId, tripId, clientId, clientName } = opts;

  const [state, setState] = useState<PassengerTrackingState>({
    status: "idle",
    isHighAccuracy: false,
    highBatteryUsage: false,
    isApproximate: false,
  });

  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const backgroundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHighAccuracyRef = useRef(false);
  const updateTimestampsRef = useRef<number[]>([]);
  const lastEmitAtRef = useRef(0);

  // ─── Start watchPosition (re-startable when accuracy changes) ─
  const startPositionWatcher = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((s) => ({
        ...s,
        status: "denied",
        error: "Fonctionnalité indisponible sans GPS",
      }));
      return;
    }

    // Clear any existing watcher
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const options: PositionOptions = {
      enableHighAccuracy: isHighAccuracyRef.current,
      maximumAge: isHighAccuracyRef.current ? 5000 : 10000,
      timeout: 5000,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const now = Date.now();

        // Detect high battery usage: track recent update intervals
        updateTimestampsRef.current.push(now);
        // Keep only last 10
        if (updateTimestampsRef.current.length > 10) {
          updateTimestampsRef.current.shift();
        }
        const recent = updateTimestampsRef.current;
        if (recent.length >= 3) {
          const intervals: number[] = [];
          for (let i = 1; i < recent.length; i++) {
            intervals.push(recent[i]! - recent[i - 1]!);
          }
          const shortIntervals = intervals.filter((i) => i < HIGH_BATTERY_UPDATE_MS).length;
          if (shortIntervals >= HIGH_BATTERY_THRESHOLD) {
            setState((s) => ({ ...s, highBatteryUsage: true }));
          }
        }

        const isApproximate = (accuracy ?? 0) > APPROXIMATE_ACCURACY_M;

        // Update local state
        setState((s) => ({
          ...s,
          status: "active",
          currentCoord: { lat: latitude, lng: longitude, accuracy, timestamp: now },
          isApproximate,
        }));

        // Emit gps_update via socket (throttled to 1/s max)
        if (socketRef.current?.connected && now - lastEmitAtRef.current > 1000) {
          lastEmitAtRef.current = now;
          socketRef.current.emit("gps_update", {
            bookingId,
            lat: latitude,
            lng: longitude,
            accuracy,
            timestamp: now,
          });
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState((s) => ({
            ...s,
            status: "denied",
            error: "Fonctionnalité indisponible sans GPS",
          }));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setState((s) => ({
            ...s,
            isApproximate: true,
            error: "Position approximative (réseau cellulaire)",
          }));
        }
        // TIMEOUT: silent — watcher will retry
      },
      options
    );
  }, [bookingId]);

  // ─── Switch to high accuracy (called when distance < 500m) ───
  const switchToHighAccuracy = useCallback(() => {
    if (isHighAccuracyRef.current) return;
    isHighAccuracyRef.current = true;
    setState((s) => ({ ...s, isHighAccuracy: true }));
    // Restart watcher with high accuracy
    startPositionWatcher();
  }, [startPositionWatcher]);

  // ─── Start tracking session ────────────────────────────────────
  const startTracking = useCallback(async () => {
    if (!bookingId || !tripId) return;

    setState((s) => ({ ...s, status: "requesting", error: undefined }));

    // Reset refs
    isHighAccuracyRef.current = false;
    updateTimestampsRef.current = [];

    // Connect socket if not yet
    if (!socketRef.current) {
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

      // ─── tracking_started (server confirmation with TTL) ────
      socket.on("tracking_started", (data: { bookingId: string; expiresAt: number }) => {
        if (data.bookingId !== bookingId) return;
        setState((s) => ({
          ...s,
          status: "active",
          expiresAt: data.expiresAt,
        }));
      });

      // ─── tracking_stopped (agent cancel / TTL / no_show) ────
      socket.on(
        "tracking_stopped",
        (data: { bookingId: string; reason?: string; message?: string }) => {
          if (data.bookingId !== bookingId) return;
          const reason = (data.reason ?? "manual") as PassengerTrackingState["stopReason"];
          setState((s) => ({
            ...s,
            status: "stopped",
            stopReason: reason,
            error: data.message,
            currentCoord: undefined,
          }));
          // Cleanup watcher
          if (watchIdRef.current !== null && typeof navigator !== "undefined") {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
        }
      );

      // ─── tracking_rejected (e.g. trip already departed) ─────
      socket.on(
        "tracking_rejected",
        (data: { bookingId: string; reason: string; message: string }) => {
          if (data.bookingId !== bookingId) return;
          setState((s) => ({
            ...s,
            status: "stopped",
            stopReason: "departed_reject",
            error: data.message,
          }));
        }
      );

      // ─── passenger_location echo: server returns our own ETA + distance ─
      socket.on(
        "passenger_location",
        (data: {
          bookingId: string;
          etaMinutes?: number;
          distanceMeters?: number;
        }) => {
          if (data.bookingId !== bookingId) return;
          setState((s) => ({
            ...s,
            etaMinutes: data.etaMinutes,
            distanceMeters: data.distanceMeters,
          }));
          // Switch to high accuracy if close to quay
          if (
            data.distanceMeters !== undefined &&
            data.distanceMeters < HIGH_ACCURACY_DISTANCE_M
          ) {
            switchToHighAccuracy();
          }
        }
      );

      // ─── agent_message (wait / leave) ────────────────────────
      socket.on(
        "agent_message",
        (data: { type: "wait" | "leave"; message: string; timestamp: string }) => {
          setState((s) => ({
            ...s,
            agentMessage: {
              type: data.type,
              message: data.message,
              timestamp: data.timestamp,
            },
          }));
        }
      );
    }

    // Wait for connection
    await new Promise<void>((resolve) => {
      if (socketRef.current?.connected) return resolve();
      socketRef.current?.once("connect", () => resolve());
      setTimeout(() => resolve(), 3000);
    });

    // Emit start_tracking
    socketRef.current?.emit("start_tracking", {
      bookingId,
      tripId,
      clientId,
      clientName,
    });

    // Start position watcher
    startPositionWatcher();
  }, [bookingId, tripId, clientId, clientName, startPositionWatcher, switchToHighAccuracy]);

  // ─── Stop tracking ─────────────────────────────────────────────
  const stopTracking = useCallback(
    (reason: "manual" | "boarding" | "completed" = "manual") => {
      socketRef.current?.emit("stop_tracking", { bookingId, reason });

      if (watchIdRef.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      setState((s) => ({
        ...s,
        status: "stopped",
        stopReason: reason,
        currentCoord: undefined,
        etaMinutes: undefined,
        distanceMeters: undefined,
      }));
    },
    [bookingId]
  );

  // ─── Background detection (cut watcher after 2 min) ────────────
  useEffect(() => {
    if (state.status !== "active") return;

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (backgroundTimerRef.current) clearTimeout(backgroundTimerRef.current);
        backgroundTimerRef.current = setTimeout(() => {
          if (watchIdRef.current !== null && typeof navigator !== "undefined") {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          setState((s) => ({
            ...s,
            status: "stopped",
            stopReason: "manual",
            error: "Partage suspendu en arrière-plan (économie batterie).",
          }));
        }, BACKGROUND_TIMEOUT_MS);
      } else {
        if (backgroundTimerRef.current) {
          clearTimeout(backgroundTimerRef.current);
          backgroundTimerRef.current = null;
        }
        // Restart watcher if still active
        if (state.status === "active" && watchIdRef.current === null) {
          startPositionWatcher();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (backgroundTimerRef.current) clearTimeout(backgroundTimerRef.current);
    };
  }, [state.status, startPositionWatcher]);

  // ─── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (backgroundTimerRef.current) clearTimeout(backgroundTimerRef.current);
      if (socketRef.current) {
        if (state.status === "active") {
          socketRef.current.emit("stop_tracking", { bookingId, reason: "manual" });
        }
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
     
  }, []);

  return {
    state,
    startTracking,
    stopTracking,
    canStartTracking: state.status === "idle" || state.status === "stopped",
  };
}
