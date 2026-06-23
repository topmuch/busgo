import { createServer } from "http";
import { Server } from "socket.io";

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