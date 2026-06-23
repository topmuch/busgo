import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/buses/route";

// Import the mocked module
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

describe("GET /api/buses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Non autorisé");
  });

  it("returns 401 when no tenantId", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "1", email: "test@test.com", name: "Test", role: "admin" },
    } as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns list of buses filtered by tenant", async () => {
    const mockBuses = [
      {
        id: "bus-1",
        number: "FB-001",
        capacity: 50,
        isActive: true,
        driverId: null,
        driver: null,
        _count: { trajets: 3 },
      },
    ];

    vi.mocked(db.bus.findMany).mockResolvedValue(mockBuses as never);

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].number).toBe("FB-001");

    expect(db.bus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant-1", isActive: true }),
      })
    );
  });

  it("orders buses by number ascending", async () => {
    vi.mocked(db.bus.findMany).mockResolvedValue([] as never);

    await GET();

    expect(db.bus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { number: "asc" },
      })
    );
  });
});

describe("POST /api/buses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as never);
    const req = new Request("http://localhost:3000/api/buses", {
      method: "POST",
      body: JSON.stringify({ number: "FB-003", capacity: 50 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when number or capacity missing", async () => {
    const req = new Request("http://localhost:3000/api/buses", {
      method: "POST",
      body: JSON.stringify({ number: "FB-003" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("requis");
  });

  it("returns 409 when bus number already exists for tenant", async () => {
    vi.mocked(db.bus.findFirst).mockResolvedValue({
      id: "existing",
      number: "FB-001",
    } as never);

    const req = new Request("http://localhost:3000/api/buses", {
      method: "POST",
      body: JSON.stringify({ number: "FB-001", capacity: 50 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("existe déjà");
  });

  it("creates a bus without driver", async () => {
    vi.mocked(db.bus.findFirst).mockResolvedValue(null as never);
    vi.mocked(db.bus.create).mockResolvedValue({
      id: "new-bus",
      tenantId: "tenant-1",
      number: "FB-003",
      capacity: 50,
      driverId: null,
      driver: null,
    } as never);

    const req = new Request("http://localhost:3000/api/buses", {
      method: "POST",
      body: JSON.stringify({ number: "FB-003", capacity: 50 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    expect(db.bus.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          number: "FB-003",
          capacity: 50,
        }),
      })
    );
  });

  it("creates a bus with a driver", async () => {
    vi.mocked(db.bus.findFirst).mockResolvedValue(null as never);
    vi.mocked(db.bus.create).mockResolvedValue({
      id: "new-bus",
      tenantId: "tenant-1",
      number: "FB-004",
      capacity: 40,
      driverId: "driver-1",
      driver: { id: "driver-1", name: "Moussa" },
    } as never);

    const req = new Request("http://localhost:3000/api/buses", {
      method: "POST",
      body: JSON.stringify({ number: "FB-004", capacity: 40, driverId: "driver-1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    expect(db.bus.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          driverId: "driver-1",
        }),
      })
    );
  });
});