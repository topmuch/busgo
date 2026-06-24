import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/trajets/route";

import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-session";
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

describe("GET /api/trajets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never);
    vi.mocked(db.trajet.findMany).mockResolvedValue([] as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost:3000/api/trajets");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("calls findMany with dateFilter=today when no filter provided", async () => {
    const req = new NextRequest("http://localhost:3000/api/trajets");
    await GET(req);

    expect(db.trajet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
        }),
      })
    );
  });

  it("calls findMany with dateFilter=today param", async () => {
    const req = new NextRequest("http://localhost:3000/api/trajets?dateFilter=today");
    await GET(req);

    const callArgs = vi.mocked(db.trajet.findMany).mock.calls[0][0] as Record<string, unknown>;
    const where = callArgs.where as Record<string, unknown>;
    // Should have a date filter with gte/lt
    expect(where.date).toBeDefined();
  });

  it("calls findMany with dateFilter=upcoming (gte today)", async () => {
    const req = new NextRequest("http://localhost:3000/api/trajets?dateFilter=upcoming");
    await GET(req);

    const callArgs = vi.mocked(db.trajet.findMany).mock.calls[0][0] as Record<string, unknown>;
    const where = callArgs.where as Record<string, unknown>;
    expect(where.date).toBeDefined();
  });

  it("calls findMany with dateFilter=all (no date constraint)", async () => {
    const req = new NextRequest("http://localhost:3000/api/trajets?dateFilter=all");
    await GET(req);

    const callArgs = vi.mocked(db.trajet.findMany).mock.calls[0][0] as Record<string, unknown>;
    const where = callArgs.where as Record<string, unknown>;
    // Should NOT have a date filter
    expect(where.date).toBeUndefined();
  });

  it("includes billets when includeBillets=true", async () => {
    const req = new NextRequest("http://localhost:3000/api/trajets?dateFilter=today&includeBillets=true");
    await GET(req);

    const callArgs = vi.mocked(db.trajet.findMany).mock.calls[0][0] as Record<string, unknown>;
    const include = callArgs.include as Record<string, unknown>;
    expect(include.billets).toBeDefined();
    expect(include._count).toBeUndefined();
  });

  it("includes _count when includeBillets=false", async () => {
    const req = new NextRequest("http://localhost:3000/api/trajets?dateFilter=today");
    await GET(req);

    const callArgs = vi.mocked(db.trajet.findMany).mock.calls[0][0] as Record<string, unknown>;
    const include = callArgs.include as Record<string, unknown>;
    expect(include._count).toBeDefined();
    expect(include.billets).toBeUndefined();
  });

  it("filters by status when provided", async () => {
    const req = new NextRequest("http://localhost:3000/api/trajets?status=scheduled");
    await GET(req);

    const callArgs = vi.mocked(db.trajet.findMany).mock.calls[0][0] as Record<string, unknown>;
    const where = callArgs.where as Record<string, unknown>;
    expect(where.status).toBe("scheduled");
  });

  it("orders by date asc then time asc", async () => {
    const req = new NextRequest("http://localhost:3000/api/trajets");
    await GET(req);

    expect(db.trajet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ date: "asc" }, { time: "asc" }],
      })
    );
  });
});

describe("POST /api/trajets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost:3000/api/trajets", {
      method: "POST",
      body: JSON.stringify({
        busId: "bus-1",
        origin: "Dakar",
        destination: "Saint-Louis",
        date: "2025-01-15",
        time: "08:00",
        price: 5000,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when fields missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/trajets", {
      method: "POST",
      body: JSON.stringify({ origin: "Dakar" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    // zod validation returns "Données invalides"
    expect(data.error).toBeTruthy();
  });

  it("returns 404 when bus not found for tenant", async () => {
    vi.mocked(db.bus.findFirst).mockResolvedValue(null as never);

    const req = new NextRequest("http://localhost:3000/api/trajets", {
      method: "POST",
      body: JSON.stringify({
        busId: "nonexistent",
        origin: "Dakar",
        destination: "Saint-Louis",
        date: "2025-01-15",
        time: "08:00",
        price: 5000,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("creates a trajet with status scheduled", async () => {
    vi.mocked(db.bus.findFirst).mockResolvedValue({
      id: "bus-1",
      tenantId: "tenant-1",
    } as never);
    vi.mocked(db.trajet.create).mockResolvedValue({
      id: "trajet-1",
      tenantId: "tenant-1",
      busId: "bus-1",
      origin: "Dakar",
      destination: "Saint-Louis",
      date: new Date("2025-01-15"),
      time: "08:00",
      price: 5000,
      status: "scheduled",
      bus: { id: "bus-1", number: "FB-001", capacity: 50 },
    } as never);

    const req = new NextRequest("http://localhost:3000/api/trajets", {
      method: "POST",
      body: JSON.stringify({
        busId: "bus-1",
        origin: "Dakar",
        destination: "Saint-Louis",
        date: "2025-01-15",
        time: "08:00",
        price: 5000,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    expect(db.trajet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          busId: "bus-1",
          origin: "Dakar",
          destination: "Saint-Louis",
          price: 5000,
          status: "scheduled",
        }),
      })
    );
  });

  it("converts price to number", async () => {
    vi.mocked(db.bus.findFirst).mockResolvedValue({
      id: "bus-1",
      tenantId: "tenant-1",
    } as never);
    vi.mocked(db.trajet.create).mockResolvedValue({
      id: "trajet-1",
    } as never);

    const req = new NextRequest("http://localhost:3000/api/trajets", {
      method: "POST",
      body: JSON.stringify({
        busId: "bus-1",
        origin: "Dakar",
        destination: "Thiès",
        date: "2025-01-15",
        time: "10:00",
        price: "7500", // string
      }),
    });
    await POST(req);

    expect(db.trajet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ price: 7500 }),
      })
    );
  });
});