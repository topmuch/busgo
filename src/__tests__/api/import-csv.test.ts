import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/trajets/import-csv/route";

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

describe("POST /api/trajets/import-csv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as never);
    const req = new Request("http://localhost:3000/api/trajets/import-csv", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "t1",
        passengers: [{ name: "Amadou", phone: "771234567", seat: "1" }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when trajetId or passengers missing", async () => {
    const req = new Request("http://localhost:3000/api/trajets/import-csv", {
      method: "POST",
      body: JSON.stringify({ trajetId: "t1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when passengers array is empty", async () => {
    const req = new Request("http://localhost:3000/api/trajets/import-csv", {
      method: "POST",
      body: JSON.stringify({ trajetId: "t1", passengers: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when trajet not found", async () => {
    vi.mocked(db.trajet.findFirst).mockResolvedValue(null as never);

    const req = new Request("http://localhost:3000/api/trajets/import-csv", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "nonexistent",
        passengers: [{ name: "Amadou", seat: "1" }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("skips passengers with missing name or seat", async () => {
    vi.mocked(db.trajet.findFirst).mockResolvedValue({
      id: "trajet-1",
      tenantId: "tenant-1",
      bus: { capacity: 50 },
    } as never);
    vi.mocked(db.billet.findMany).mockResolvedValue([] as never);

    const req = new Request("http://localhost:3000/api/trajets/import-csv", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "trajet-1",
        passengers: [
          { name: "", seat: "1" },    // no name
          { name: "Amadou", seat: "" }, // no seat
        ],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(0);
    expect(data.errors.length).toBe(2);
  });

  it("skips passengers with invalid seat number", async () => {
    vi.mocked(db.trajet.findFirst).mockResolvedValue({
      id: "trajet-1",
      tenantId: "tenant-1",
      bus: { capacity: 50 },
    } as never);
    vi.mocked(db.billet.findMany).mockResolvedValue([] as never);

    const req = new Request("http://localhost:3000/api/trajets/import-csv", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "trajet-1",
        passengers: [{ name: "Amadou", seat: "abc" }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(0);
    expect(data.errors[0]).toContain("invalide");
  });

  it("skips passengers with seat number out of range", async () => {
    vi.mocked(db.trajet.findFirst).mockResolvedValue({
      id: "trajet-1",
      tenantId: "tenant-1",
      bus: { capacity: 50 },
    } as never);
    vi.mocked(db.billet.findMany).mockResolvedValue([] as never);

    const req = new Request("http://localhost:3000/api/trajets/import-csv", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "trajet-1",
        passengers: [{ name: "Amadou", seat: "60" }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(0);
    expect(data.errors[0]).toContain("invalide");
  });

  it("skips passengers when seat already occupied", async () => {
    vi.mocked(db.trajet.findFirst).mockResolvedValue({
      id: "trajet-1",
      tenantId: "tenant-1",
      bus: { capacity: 50 },
    } as never);
    vi.mocked(db.billet.findMany).mockResolvedValue([{ seatNumber: 5 }] as never);

    const req = new Request("http://localhost:3000/api/trajets/import-csv", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "trajet-1",
        passengers: [{ name: "Amadou", seat: "5" }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(0);
    expect(data.errors[0]).toContain("déjà pris");
  });

  it("successfully imports valid passengers", async () => {
    vi.mocked(db.trajet.findFirst).mockResolvedValue({
      id: "trajet-1",
      tenantId: "tenant-1",
      bus: { capacity: 50 },
    } as never);
    vi.mocked(db.billet.findMany).mockResolvedValue([] as never);
    vi.mocked(db.user.findUnique).mockResolvedValue(null as never);
    vi.mocked(db.user.create).mockResolvedValue({
      id: "client-1",
    } as never);
    vi.mocked(db.billet.create).mockResolvedValue({
      id: "billet-1",
    } as never);
    vi.mocked(db.billet.update).mockResolvedValue({
      id: "billet-1",
    } as never);

    const req = new Request("http://localhost:3000/api/trajets/import-csv", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "trajet-1",
        passengers: [
          { name: "Amadou Diallo", phone: "77 123 4567", seat: "1" },
          { name: "Fatou Ndiaye", phone: "78 987 6543", seat: "2" },
        ],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(2);
    expect(data.errors.length).toBe(0);

    // Should create billets with correct seat numbers
    expect(db.billet.create).toHaveBeenCalledTimes(2);
    expect(db.billet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ seatNumber: 1 }),
      })
    );
    expect(db.billet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ seatNumber: 2 }),
      })
    );
  });

  it("generates QR code URL with billet ID", async () => {
    vi.mocked(db.trajet.findFirst).mockResolvedValue({
      id: "trajet-1",
      tenantId: "tenant-1",
      bus: { capacity: 50 },
    } as never);
    vi.mocked(db.billet.findMany).mockResolvedValue([] as never);
    vi.mocked(db.user.findUnique).mockResolvedValue(null as never);
    vi.mocked(db.user.create).mockResolvedValue({ id: "c1" } as never);

    const createdBilletId = "csv-billet-xyz";
    vi.mocked(db.billet.create).mockResolvedValue({
      id: createdBilletId,
    } as never);
    vi.mocked(db.billet.update).mockResolvedValue({
      id: createdBilletId,
    } as never);

    const req = new Request("http://localhost:3000/api/trajets/import-csv", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "trajet-1",
        passengers: [{ name: "Amadou", seat: "1" }],
      }),
    });
    await POST(req);

    // QR code should use billet ID
    expect(db.billet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: createdBilletId },
        data: { qrCode: `https://busgo.sn/b/${createdBilletId}` },
      })
    );
  });

  it("handles partial success (some valid, some invalid)", async () => {
    vi.mocked(db.trajet.findFirst).mockResolvedValue({
      id: "trajet-1",
      tenantId: "tenant-1",
      bus: { capacity: 50 },
    } as never);
    vi.mocked(db.billet.findMany).mockResolvedValue([{ seatNumber: 5 }] as never);
    vi.mocked(db.user.findUnique).mockResolvedValue(null as never);
    vi.mocked(db.user.create).mockResolvedValue({ id: "c1" } as never);
    vi.mocked(db.billet.create).mockResolvedValue({ id: "b1" } as never);
    vi.mocked(db.billet.update).mockResolvedValue({ id: "b1" } as never);

    const req = new Request("http://localhost:3000/api/trajets/import-csv", {
      method: "POST",
      body: JSON.stringify({
        trajetId: "trajet-1",
        passengers: [
          { name: "Amadou", seat: "1" },  // valid
          { name: "Fatou", seat: "5" },   // already taken
          { name: "", seat: "2" },         // no name
        ],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(1);
    expect(data.errors.length).toBe(2);
  });
});