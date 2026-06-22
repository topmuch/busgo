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

// Types for Bus Go events
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

// Room management - tenants have their own rooms
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

  // Bus location update - broadcast to tenant room
  socket.on(
    "bus-location",
    (data: BusLocationUpdate) => {
      io.to(`tenant:${data.tenantId}`).emit("bus-location-update", {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  );

  // Trajet status update - broadcast to tenant + trajet room
  socket.on(
    "trajet-status",
    (data: TrajetStatusUpdate) => {
      io.to(`tenant:${data.tenantId}`).emit("trajet-status-update", data);
      io.to(`trajet:${data.trajetId}`).emit("trajet-status-update", data);
    }
  );

  // Billet scan event - broadcast to tenant + trajet room
  socket.on(
    "billet-scan",
    (data: BilletScanEvent) => {
      const event = {
        ...data,
        timestamp: new Date().toISOString(),
      };
      io.to(`tenant:${data.tenantId}`).emit("billet-scan-update", event);
      io.to(`trajet:${data.trajetId}`).emit("billet-scan-update", event);
    }
  );

  // Send notification to tenant room
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