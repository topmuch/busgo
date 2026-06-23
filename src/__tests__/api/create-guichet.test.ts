import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/billets/create-guichet/route";
import bcrypt from "bcryptjs";

import { getServerSession } from "next-auth";
import { db } from "@/lib/db";

const mockSession = {
  user: {
    id: "admin-1",
    email: "admin@fastbus.sn",
    name: "Admin",
    role: "admin",
    tenantId: "tenant-1",
    tenantSlug: "fastbus",
    tenantName: "FastBus Express",
  },
};

describe("POST /api/billets/create-guichet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as never);
    const req = new Request("http://localhost:3000/api/billets/create-guichet", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "t1",
        passengerName: "Amadou",
        seatNumber: 1,
        ticketNumber: "PAP-001",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields missing", async () => {
    const req = new Request("http://localhost:3000/api/billets/create-guichet", {
      method: "POST",
      body: JSON.stringify({ trajetId: "t1", passengerName: "Amadou" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when trajet not found", async () => {
    vi.mocked(db.trajet.findFirst).mockResolvedValue(null as never);

    const req = new Request("http://localhost:3000/api/billets/create-guichet", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "nonexistent",
        passengerName: "Amadou",
        seatNumber: 1,
        ticketNumber: "PAP-001",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 400 when seat number out of range", async () => {
    vi.mocked(db.trajet.findFirst).mockResolvedValue({
      id: "trajet-1",
      tenantId: "tenant-1",
      bus: { capacity: 50 },
    } as never);

    const req = new Request("http://localhost:3000/api/billets/create-guichet", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "trajet-1",
        passengerName: "Amadou",
        seatNumber: 55,
        ticketNumber: "PAP-001",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("invalide");
  });

  it("returns 409 when seat already taken", async () => {
    vi.mocked(db.trajet.findFirst).mockResolvedValue({
      id: "trajet-1",
      tenantId: "tenant-1",
      bus: { capacity: 50 },
    } as never);
    vi.mocked(db.billet.findFirst).mockResolvedValueOnce({ id: "b1" } as never);

    const req = new Request("http://localhost:3000/api/billets/create-guichet", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "trajet-1",
        passengerName: "Amadou",
        seatNumber: 5,
        ticketNumber: "PAP-001",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("déjà pris");
  });

  it("returns 409 when ticket number already used", async () => {
    vi.mocked(db.trajet.findFirst).mockResolvedValue({
      id: "trajet-1",
      tenantId: "tenant-1",
      bus: { capacity: 50 },
    } as never);
    // First findFirst: check seat (null)
    vi.mocked(db.billet.findFirst).mockResolvedValueOnce(null as never);
    // findUnique: check ticket number (found)
    vi.mocked(db.billet.findUnique).mockResolvedValueOnce({ id: "b-existing" } as never);

    const req = new Request("http://localhost:3000/api/billets/create-guichet", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "trajet-1",
        passengerName: "Amadou",
        seatNumber: 5,
        ticketNumber: "PAP-001",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("déjà utilisé");
  });

  it("creates a new client user if not found", async () => {
    vi.mocked(db.trajet.findFirst).mockResolvedValue({
      id: "trajet-1",
      tenantId: "tenant-1",
      bus: { capacity: 50 },
    } as never);
    vi.mocked(db.billet.findFirst).mockResolvedValueOnce(null as never);
    vi.mocked(db.billet.findUnique).mockResolvedValueOnce(null as never);
    vi.mocked(db.user.findUnique).mockResolvedValueOnce(null as never);

    const newClient = {
      id: "client-new",
      email: "771234567@busgo.local",
      name: "Amadou Diallo",
      phone: "77 123 4567",
      role: "client",
      tenantId: "tenant-1",
    };
    vi.mocked(db.user.create).mockResolvedValueOnce(newClient as never);

    vi.mocked(db.billet.create).mockResolvedValueOnce({
      id: "billet-new",
      trajetId: "trajet-1",
      clientId: "client-new",
      seatNumber: 3,
      ticketNumber: "PAP-001",
      status: "sold",
      trajet: {
        id: "trajet-1",
        origin: "Dakar",
        destination: "Saint-Louis",
        date: "2025-01-15",
        time: "08:00",
        bus: { id: "bus-1", number: "FB-001", capacity: 50 },
      },
      client: { id: "client-new", name: "Amadou Diallo", phone: "77 123 4567" },
    } as never);

    vi.mocked(db.billet.update).mockResolvedValueOnce({
      id: "billet-new",
      qrCode: "https://busgo.sn/b/billet-new",
    } as never);

    const req = new Request("http://localhost:3000/api/billets/create-guichet", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "trajet-1",
        passengerName: "Amadou Diallo",
        passengerPhone: "77 123 4567",
        seatNumber: 3,
        ticketNumber: "PAP-001",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    // Client was created with correct data
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Amadou Diallo",
          phone: "77 123 4567",
          role: "client",
          tenantId: "tenant-1",
        }),
      })
    );
  });

  it("uses existing client if found by phone email", async () => {
    vi.mocked(db.trajet.findFirst).mockResolvedValue({
      id: "trajet-1",
      tenantId: "tenant-1",
      bus: { capacity: 50 },
    } as never);
    vi.mocked(db.billet.findFirst).mockResolvedValueOnce(null as never);
    vi.mocked(db.billet.findUnique).mockResolvedValueOnce(null as never);

    const existingClient = {
      id: "client-1",
      email: "771234567@busgo.local",
      name: "Amadou",
      phone: "77 123 4567",
      role: "client",
      tenantId: "tenant-1",
    };
    vi.mocked(db.user.findUnique).mockResolvedValueOnce(existingClient as never);

    vi.mocked(db.billet.create).mockResolvedValueOnce({
      id: "billet-1",
      trajetId: "trajet-1",
      clientId: "client-1",
      seatNumber: 3,
      ticketNumber: "PAP-002",
      status: "sold",
      trajet: {
        id: "trajet-1",
        origin: "Dakar",
        destination: "Saint-Louis",
        date: "2025-01-15",
        time: "08:00",
        bus: { id: "bus-1", number: "FB-001", capacity: 50 },
      },
      client: { id: "client-1", name: "Amadou", phone: "77 123 4567" },
    } as never);

    vi.mocked(db.billet.update).mockResolvedValueOnce({
      id: "billet-1",
      qrCode: "https://busgo.sn/b/billet-1",
    } as never);

    const req = new Request("http://localhost:3000/api/billets/create-guichet", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "trajet-1",
        passengerName: "Amadou",
        passengerPhone: "77 123 4567",
        seatNumber: 3,
        ticketNumber: "PAP-002",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    // Client should NOT have been created
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("generates QR code URL with billet ID, not ticket number", async () => {
    vi.mocked(db.trajet.findFirst).mockResolvedValue({
      id: "trajet-1",
      tenantId: "tenant-1",
      bus: { capacity: 50 },
    } as never);
    vi.mocked(db.billet.findFirst).mockResolvedValueOnce(null as never);
    vi.mocked(db.billet.findUnique).mockResolvedValueOnce(null as never);
    vi.mocked(db.user.findUnique).mockResolvedValueOnce(null as never);
    vi.mocked(db.user.create).mockResolvedValueOnce({
      id: "c-1",
    } as never);

    const billetId = "billet-abc123";
    vi.mocked(db.billet.create).mockResolvedValueOnce({
      id: billetId,
      trajetId: "trajet-1",
      clientId: "c-1",
      seatNumber: 1,
      ticketNumber: "PAP-099",
      status: "sold",
      trajet: { origin: "Dakar", destination: "Thiès", date: "2025-01-15", time: "07:00", bus: { id: "b1", number: "FB-001", capacity: 50 } },
      client: { id: "c-1", name: "Fatou", phone: "" },
    } as never);

    vi.mocked(db.billet.update).mockResolvedValueOnce({
      id: billetId,
      qrCode: `https://busgo.sn/b/${billetId}`,
      trajet: { origin: "Dakar", destination: "Thiès", date: "2025-01-15", time: "07:00", bus: { id: "b1", number: "FB-001", capacity: 50 } },
      client: { id: "c-1", name: "Fatou", phone: "" },
    } as never);

    const req = new Request("http://localhost:3000/api/billets/create-guichet", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "trajet-1",
        passengerName: "Fatou",
        seatNumber: 1,
        ticketNumber: "PAP-099",
      }),
    });
    await POST(req);

    // The QR code should use billetId, NOT ticketNumber
    expect(db.billet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: billetId },
        data: { qrCode: `https://busgo.sn/b/${billetId}` },
      })
    );
  });
});