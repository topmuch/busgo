import { createServer } from "http";
import { Server } from "socket.io";
import {
  TrackingRecord,
  trackingChannelName,
  startTracking,
  stopTracking,
  updateCoord,
  setEta,
  getTracking,
  getAllTrackingForTrip,
  getAllTrackingForTenant,
  validateBookingTrip,
  startTtlSweeper,
  isStale,
  haversineMeters,
  TRACKING_TTL_MS,
  ETA_REFRESH_INTERVAL_MS,
  STATIC_THRESHOLD_MS,
} from "./tracking-store";
import { computeEta } from "./eta-service";

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─────────────────────────────────────────────────────────────
//  Quay/bus destination cache per trip (set by agent UI)
//  Key: tripId → { lat, lng, label }
//  In-memory only — not persisted.
// ─────────────────────────────────────────────────────────────
const quayCache = new Map<string, { lat: number; lng: number; label?: string }>();

// ─────────────────────────────────────────────────────────────
//  TTL sweeper — auto-destroy tracking after 45 min
// ─────────────────────────────────────────────────────────────
startTtlSweeper((rec: TrackingRecord) => {
  const channel = trackingChannelName(rec.bookingId, rec.tripId);
  io.to(`tenant:${rec.tenantId}`).emit("tracking_stopped", {
    bookingId: rec.bookingId,
    tripId: rec.tripId,
    reason: "timeout_45min",
    message: "Partage arrêté automatiquement (durée max 45 min atteinte)",
  });
  io.to(channel).emit("tracking_stopped", {
    bookingId: rec.bookingId,
    reason: "timeout_45min",
    message: "Partage arrêté automatiquement (durée max 45 min atteinte)",
  });
  console.log(`[TRACKING_EXPIRED] booking=${rec.bookingId} (45min TTL)`);
});

console.log(`[TRACKING] TTL sweeper started — auto-expire after ${TRACKING_TTL_MS / 60000} min`);

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface BusLocationUpdate {
  busId: string;
  tenantId: string;
  latitude: number;
  longitude: number;
  speed?: number;
}

interface TrajetStatusUpdate {
  trajetId: string;
  tenantId: string;
  status: string; // scheduled | boarding | departed | arrived | cancelled
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
}

interface NotificationEvent {
  tenantId: string;
  type: "trajet_update" | "billet_scan" | "bus_location" | "system";
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════
// Vocal Alert Types — emitted to trajet rooms for TTS
// ═══════════════════════════════════════════════════════════

interface VocalPassagerManquant {
  trajetId: string;
  tenantId: string;
  billetId: string;
  seatNumber: number;
  clientName?: string;
  clientPhone?: string;
}

interface VocalTimerEvent {
  trajetId: string;
  tenantId: string;
  missingCount: number;
  missingList?: string[];
}

interface VocalMessageRetard {
  trajetId: string;
  tenantId: string;
  clientId: string;
  clientName?: string;
  seatNumber?: number;
  minutes: number;
}

interface VocalDepartConfirme {
  trajetId: string;
  tenantId: string;
  boardedCount: number;
  missingCount: number;
}

// ═══════════════════════════════════════════════════════════
// Room management + event routing
// ═══════════════════════════════════════════════════════════

io.on("connection", (socket) => {
  console.log(`Bus Go client connected: ${socket.id}`);

  // Join a tenant room
  socket.on("join-tenant", (tenantId: string) => {
    socket.join(`tenant:${tenantId}`);
    console.log(`Socket ${socket.id} joined tenant room: ${tenantId}`);
  });

  // Leave a tenant room
  socket.on("leave-tenant", (tenantId: string) => {
    socket.leave(`tenant:${tenantId}`);
    console.log(`Socket ${socket.id} left tenant room: ${tenantId}`);
  });

  // Join a specific trajet room for real-time updates
  socket.on("join-trajet", (trajetId: string) => {
    socket.join(`trajet:${trajetId}`);
    console.log(`Socket ${socket.id} joined trajet room: ${trajetId}`);
  });

  // ─── Bus location ─────────────────────────────────────
  socket.on(
    "bus-location",
    (data: BusLocationUpdate) => {
      io.to(`tenant:${data.tenantId}`).emit("bus-location-update", {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  );

  // ─── Trajet status update ─────────────────────────────
  socket.on(
    "trajet-status",
    (data: TrajetStatusUpdate) => {
      io.to(`tenant:${data.tenantId}`).emit("trajet-status-update", data);
      io.to(`trajet:${data.trajetId}`).emit("trajet-status-update", data);

      // Emit vocal event for confirmed departure
      if (data.status === "departed") {
        // The caller can also use "vocal:depart-confirme" with explicit counts
        // For now, we emit a basic depart event from trajet status
        io.to(`trajet:${data.trajetId}`).emit("depart:confirme", {
          trajetId: data.trajetId,
          tenantId: data.tenantId,
          boardedCount: 0,  // caller should use vocal:depart-confirme for counts
          missingCount: 0,
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // ─── Billet scan ──────────────────────────────────────
  socket.on(
    "billet-scan",
    (data: BilletScanEvent) => {
      const event = {
        ...data,
        timestamp: new Date().toISOString(),
      };
      io.to(`tenant:${data.tenantId}`).emit("billet-scan-update", event);
      io.to(`trajet:${data.trajetId}`).emit("billet-scan-update", event);

      // If marked absent → emit vocal alert
      if (data.status === "absent") {
        io.to(`trajet:${data.trajetId}`).emit("passager:manquant", {
          trajetId: data.trajetId,
          tenantId: data.tenantId,
          billetId: data.billetId,
          seatNumber: data.seatNumber,
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // ─── Notification ─────────────────────────────────────
  socket.on(
    "notify",
    (data: NotificationEvent) => {
      io.to(`tenant:${data.tenantId}`).emit("notification", {
        ...data,
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
      });
    }
  );

  // ─── Client delay/retard ──────────────────────────────
  socket.on(
    "client-retard",
    (data: { trajetId: string; tenantId: string; clientId: string; clientName?: string; seatNumber?: number; minutes: number; message?: string; driverId: string }) => {
      const retardMsg = data.message || `Le passager sera en retard de ${data.minutes} minutes`;

      // Notify the driver via driver-retard event (existing)
      io.to(`tenant:${data.tenantId}`).emit("driver-retard", {
        trajetId: data.trajetId,
        clientId: data.clientId,
        clientName: data.clientName,
        minutes: data.minutes,
        message: retardMsg,
        timestamp: new Date().toISOString(),
      });

      // ALSO emit vocal alert for TTS on agent side
      io.to(`trajet:${data.trajetId}`).emit("message:retard", {
        trajetId: data.trajetId,
        tenantId: data.tenantId,
        clientId: data.clientId,
        clientName: data.clientName,
        seatNumber: data.seatNumber,
        minutes: data.minutes,
        timestamp: new Date().toISOString(),
      });

      console.log(`Retard: trajet=${data.trajetId}, ${data.minutes}min, vocal+driver notified`);
    }
  );

  // ═══════════════════════════════════════════════════════
  // VOCAL ALERT EVENTS — explicit server-side triggers
  // These allow the API backend to trigger TTS on agents
  // ═══════════════════════════════════════════════════════

  // Missing passenger vocal alert
  socket.on(
    "vocal:passager-manquant",
    (data: VocalPassagerManquant) => {
      io.to(`trajet:${data.trajetId}`).emit("passager:manquant", {
        ...data,
        timestamp: new Date().toISOString(),
      });
      console.log(`Vocal alert: passager manquant, trajet=${data.trajetId}, seat=${data.seatNumber}`);
    }
  );

  // T-5 minutes timer vocal alert
  socket.on(
    "vocal:timer-5min",
    (data: VocalTimerEvent) => {
      io.to(`trajet:${data.trajetId}`).emit("timer:5min", {
        ...data,
        timestamp: new Date().toISOString(),
      });
      console.log(`Vocal alert: timer 5min, trajet=${data.trajetId}`);
    }
  );

  // T-2 minutes timer vocal alert
  socket.on(
    "vocal:timer-2min",
    (data: VocalTimerEvent) => {
      io.to(`trajet:${data.trajetId}`).emit("timer:2min", {
        ...data,
        timestamp: new Date().toISOString(),
      });
      console.log(`Vocal alert: timer 2min, trajet=${data.trajetId}`);
    }
  );

  // Message retard vocal alert (explicit trigger, in addition to auto from client-retard)
  socket.on(
    "vocal:message-retard",
    (data: VocalMessageRetard) => {
      io.to(`trajet:${data.trajetId}`).emit("message:retard", {
        ...data,
        timestamp: new Date().toISOString(),
      });
      console.log(`Vocal alert: message retard, trajet=${data.trajetId}`);
    }
  );

  // Depart confirmed vocal alert (explicit trigger with boarding counts)
  socket.on(
    "vocal:depart-confirme",
    (data: VocalDepartConfirme) => {
      io.to(`trajet:${data.trajetId}`).emit("depart:confirme", {
        ...data,
        timestamp: new Date().toISOString(),
      });
      console.log(`Vocal alert: depart confirme, trajet=${data.trajetId}`);
    }
  );

  // ─── Agent reply to client ────────────────────────────
  socket.on(
    "agent-reply",
    (data: { trajetId: string; clientId: string; message: string; tenantId?: string }) => {
      // Forward reply to tenant room (client will pick it up)
      if (data.tenantId) {
        io.to(`tenant:${data.tenantId}`).emit("agent-reply", {
          ...data,
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════
  // GPS LIVE TRACKING EVENTS
  // Privacy by Design — RAM only, never persisted to DB
  // ═══════════════════════════════════════════════════════════

  // ─── Set the quay/bus destination for a trip (agent UI) ───
  socket.on(
    "set_quay_position",
    (data: { tripId: string; lat: number; lng: number; label?: string }) => {
      quayCache.set(data.tripId, { lat: data.lat, lng: data.lng, label: data.label });
      console.log(`[QUAY_SET] trip=${data.tripId} → ${data.lat},${data.lng}`);
    }
  );

  // ─── Start tracking session (client) ───
  socket.on(
    "start_tracking",
    async (data: {
      bookingId: string;
      tripId: string;
      clientId?: string;
      clientName?: string;
    }) => {
      const { bookingId, tripId } = data;

      // 1) Validation middleware: booking must belong to trip
      const validation = await validateBookingTrip(bookingId, tripId);
      if (!validation.ok) {
        // Silent reject per spec — notify client only
        socket.emit("tracking_rejected", {
          bookingId,
          reason: validation.reason,
          message:
            validation.reason === "trip_departed"
              ? "Le bus est déjà parti. Partage arrêté."
              : validation.reason === "trip_mismatch"
                ? "Billet invalide pour ce trajet."
                : "Partage impossible.",
        });
        return;
      }

      // 2) Validate client identity
      const rec = validation.record!;
      if (data.clientId && data.clientId !== rec.clientId) {
        socket.emit("tracking_rejected", {
          bookingId,
          reason: "client_mismatch",
          message: "Ce billet n'appartient pas à cet utilisateur.",
        });
        return;
      }

      // 3) Start tracking
      startTracking(bookingId, tripId, rec.tenantId, rec.clientId, rec.clientName);

      // 4) Join the channel
      const channel = trackingChannelName(bookingId, tripId);
      socket.join(channel);
      socket.join(`tenant:${rec.tenantId}`);

      // 5) Confirm to client
      socket.emit("tracking_started", {
        bookingId,
        tripId,
        channel,
        expiresAt: Date.now() + TRACKING_TTL_MS,
        ttlMs: TRACKING_TTL_MS,
      });

      // 6) Notify agent (tenant room) that passenger started sharing
      io.to(`tenant:${rec.tenantId}`).emit("passenger_tracking_started", {
        bookingId,
        tripId,
        clientId: rec.clientId,
        clientName: rec.clientName,
        timestamp: new Date().toISOString(),
      });

      console.log(`[TRACKING_START] booking=${bookingId} trip=${tripId} client=${rec.clientId}`);
    }
  );

  // ─── GPS update from client → broadcast to agent ───
  socket.on(
    "gps_update",
    async (data: {
      bookingId: string;
      lat: number;
      lng: number;
      accuracy: number;
      timestamp: number;
    }) => {
      const rec = getTracking(data.bookingId);
      if (!rec) {
        // No active tracking — silent reject
        return;
      }

      // 1) Update coord (RAM only)
      updateCoord(data.bookingId, {
        lat: data.lat,
        lng: data.lng,
        accuracy: data.accuracy,
        timestamp: data.timestamp,
      });

      // 2) Compute ETA via OSRM (or Haversine fallback) — throttled to 30s
      const quay = quayCache.get(rec.tripId);
      let etaMinutes: number | undefined;
      let distanceMeters: number | undefined;
      const shouldComputeEta =
        quay &&
        (!rec.etaComputedAt ||
          Date.now() - rec.etaComputedAt > ETA_REFRESH_INTERVAL_MS);

      if (shouldComputeEta && quay) {
        try {
          const eta = await computeEta(
            data.lat, data.lng,
            quay.lat, quay.lng
          );
          etaMinutes = eta.etaMinutes;
          distanceMeters = eta.distanceMeters;
          setEta(data.bookingId, etaMinutes, distanceMeters);
        } catch (err) {
          console.error("[ETA_ERROR]", err);
        }
      } else if (rec.lastEtaMinutes !== undefined) {
        etaMinutes = rec.lastEtaMinutes;
        distanceMeters = rec.lastDistanceMeters;
      }

      // 3) Distance even without quay (Haversine to last known quay if any)
      if (distanceMeters === undefined && quay) {
        distanceMeters = haversineMeters(data.lat, data.lng, quay.lat, quay.lng);
      }

      // 4) Build passenger_location payload for agent
      const updated = getTracking(data.bookingId)!;
      const payload = {
        bookingId: data.bookingId,
        tripId: rec.tripId,
        clientId: rec.clientId,
        clientName: rec.clientName,
        lat: data.lat,
        lng: data.lng,
        accuracy: data.accuracy,
        etaMinutes,
        distanceMeters,
        last_seen: new Date().toISOString(),
        isStale: false,
        isStatic: updated.isStatic === true,
      };

      // 5) Broadcast to tenant room (agent dashboard)
      io.to(`tenant:${rec.tenantId}`).emit("passenger_location", payload);

      // 6) Also broadcast to the specific tracking channel (agent modal)
      const channel = trackingChannelName(rec.bookingId, rec.tripId);
      io.to(channel).emit("passenger_location", payload);

      // 7) Static detection — warn agent once
      if (
        updated.isStatic === true &&
        !updated.staticWarningSentAt &&
        Date.now() - updated.startedAt > STATIC_THRESHOLD_MS
      ) {
        updated.staticWarningSentAt = Date.now();
        io.to(`tenant:${rec.tenantId}`).emit("passenger_static_warning", {
          bookingId: rec.bookingId,
          tripId: rec.tripId,
          clientId: rec.clientId,
          clientName: rec.clientName,
          message: `⚠️ ${rec.clientName ?? "Passager"} semble immobile depuis 10 min. Risque d'abandon.`,
          timestamp: new Date().toISOString(),
        });
        console.log(`[STATIC_WARNING] booking=${data.bookingId}`);
      }
    }
  );

  // ─── Stop tracking (client manual stop) ───
  socket.on(
    "stop_tracking",
    (data: { bookingId: string; reason?: "manual" | "boarding" | "completed" }) => {
      const rec = getTracking(data.bookingId);
      if (!rec) return;
      const reason = data.reason ?? "manual";
      stopTracking(data.bookingId, reason);

      // Notify agent
      io.to(`tenant:${rec.tenantId}`).emit("tracking_stopped", {
        bookingId: data.bookingId,
        tripId: rec.tripId,
        reason,
        message:
          reason === "boarding"
            ? `${rec.clientName ?? "Passager"} a embarqué — partage arrêté.`
            : reason === "completed"
              ? "Voyage terminé — partage arrêté."
              : `${rec.clientName ?? "Passager"} a arrêté le partage.`,
      });

      // Notify client (ack)
      socket.emit("tracking_stopped", {
        bookingId: data.bookingId,
        reason,
        message: "Partage arrêté.",
      });

      console.log(`[TRACKING_STOP] booking=${data.bookingId} reason=${reason}`);
    }
  );

  // ─── Agent cancels (e.g. "Le bus part") ───
  socket.on(
    "agent_cancel_tracking",
    async (data: {
      bookingId: string;
      tripId: string;
      tenantId: string;
      action: "wait" | "leave";
    }) => {
      const rec = getTracking(data.bookingId);

      if (data.action === "wait") {
        // Send push to client: "L'agent confirme qu'il vous attend"
        const channel = rec
          ? trackingChannelName(rec.bookingId, rec.tripId)
          : trackingChannelName(data.bookingId, data.tripId);
        io.to(channel).emit("agent_message", {
          bookingId: data.bookingId,
          type: "wait",
          message: "L'agent confirme qu'il vous attend. Dépêchez-vous !",
          timestamp: new Date().toISOString(),
        });
        console.log(`[AGENT_WAIT] booking=${data.bookingId}`);
      } else if (data.action === "leave") {
        // Send push to client + mark NO_SHOW via API call
        if (rec) {
          const channel = trackingChannelName(rec.bookingId, rec.tripId);
          io.to(channel).emit("agent_message", {
            bookingId: data.bookingId,
            type: "leave",
            message: "Désolé, le bus ne peut plus attendre. Votre billet est annulé.",
            timestamp: new Date().toISOString(),
          });
          io.to(channel).emit("tracking_stopped", {
            bookingId: data.bookingId,
            reason: "no_show",
            message: "Le bus est parti. Partage arrêté.",
          });

          // Stop tracking (RAM cleanup)
          stopTracking(data.bookingId, "no_show");

          // Notify agent room
          io.to(`tenant:${data.tenantId}`).emit("tracking_stopped", {
            bookingId: data.bookingId,
            tripId: data.tripId,
            reason: "no_show",
            message: "Bus parti — billet marqué NO_SHOW.",
          });

          console.log(`[AGENT_LEAVE] booking=${data.bookingId} → NO_SHOW`);
        }
      }
    }
  );

  // ─── Agent subscribes to live tracking updates for a trip ───
  socket.on(
    "subscribe_trip_tracking",
    (data: { tripId: string; tenantId: string }) => {
      // Agent gets all passenger_location events for this trip
      // We use a dedicated room: trip_tracking:{tripId}
      socket.join(`trip_tracking:${data.tripId}`);

      // Send initial snapshot of currently active trackers
      const actives = getAllTrackingForTrip(data.tripId);
      for (const rec of actives) {
        if (!rec.lastCoord) continue;
        socket.emit("passenger_location", {
          bookingId: rec.bookingId,
          tripId: rec.tripId,
          clientId: rec.clientId,
          clientName: rec.clientName,
          lat: rec.lastCoord.lat,
          lng: rec.lastCoord.lng,
          accuracy: rec.lastCoord.accuracy,
          etaMinutes: rec.lastEtaMinutes,
          distanceMeters: rec.lastDistanceMeters,
          last_seen: new Date(rec.lastUpdateAt).toISOString(),
          isStale: isStale(rec),
          isStatic: rec.isStatic === true,
        });
      }
    }
  );

  socket.on(
    "unsubscribe_trip_tracking",
    (data: { tripId: string }) => {
      socket.leave(`trip_tracking:${data.tripId}`);
    }
  );

  // ─── Get aggregated view (multi-passenger, 3+) ───
  socket.on(
    "get_aggregated_tracking",
    (data: { tenantId: string; tripId?: string }, ack?: (payload: unknown) => void) => {
      const list = data.tripId
        ? getAllTrackingForTrip(data.tripId)
        : getAllTrackingForTenant(data.tenantId);

      const payload = list
        .filter((r) => r.lastCoord)
        .map((r) => ({
          bookingId: r.bookingId,
          tripId: r.tripId,
          clientId: r.clientId,
          clientName: r.clientName,
          lat: r.lastCoord!.lat,
          lng: r.lastCoord!.lng,
          accuracy: r.lastCoord!.accuracy,
          etaMinutes: r.lastEtaMinutes,
          distanceMeters: r.lastDistanceMeters,
          last_seen: new Date(r.lastUpdateAt).toISOString(),
          isStale: isStale(r),
          isStatic: r.isStatic === true,
        }));

      if (ack) ack(payload);
    }
  );

  socket.on("disconnect", () => {
    console.log(`Bus Go client disconnected: ${socket.id}`);
  });

  socket.on("error", (error) => {
    console.error(`Socket error (${socket.id}):`, error);
  });
});

const PORT = 3004;
httpServer.listen(PORT, () => {
  console.log(`Bus Go WebSocket server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down Bus Go socket server...");
  httpServer.close(() => {
    console.log("Bus Go socket server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down Bus Go socket server...");
  httpServer.close(() => {
    console.log("Bus Go socket server closed");
    process.exit(0);
  });
});