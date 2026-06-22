import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// We use a singleton pattern for the Socket.IO client connection
let ioClient: ReturnType<typeof import("socket.io-client").io> | null = null;

async function getSocketClient() {
  if (ioClient) {
    return ioClient;
  }

  const { io } = await import("socket.io-client");

  ioClient = io("http://localhost:3004", {
    transports: ["websocket"],
    reconnectionAttempts: 3,
    timeout: 5000,
  });

  return ioClient;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const role = session.user.role;

    if (!["agent", "admin", "superadmin"].includes(role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();
    const { event, data } = body;

    if (!event || !data) {
      return NextResponse.json(
        { error: "Événement et données requis" },
        { status: 400 }
      );
    }

    const client = await getSocketClient();

    // Emit the event and wait for acknowledgment or timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        // If no ack callback is called, we still consider it a success
        // (fire-and-forget for events that don't expect acknowledgment)
        resolve();
      }, 3000);

      client.emit(event, data, (ack: unknown) => {
        clearTimeout(timeout);
        resolve();
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AGENT_SOCKET_EVENTS_POST]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}