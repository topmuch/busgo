import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/superadmin/impersonate/route";
import { GET } from "@/app/api/superadmin/dashboard/route";
import { GET as getTenants } from "@/app/api/superadmin/tenants/route";
import { PATCH as patchTenants } from "@/app/api/superadmin/tenants/route";
import { GET as getBilling } from "@/app/api/superadmin/invoices/route";
import { GET as getAnalytics } from "@/app/api/superadmin/analytics/route";
import { GET as getSettings } from "@/app/api/superadmin/settings/route";

// Mock NextAuth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/db", () => ({
  db: {
    tenant: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    bus: { count: vi.fn(), findMany: vi.fn() },
    billet: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    subscription: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    invoice: { findMany: vi.fn(), update: vi.fn() },
    systemLog: { create: vi.fn(), findMany: vi.fn() },
    notificationTemplate: { findMany: vi.fn(), update: vi.fn() },
    voiceConfig: { count: vi.fn(), findMany: vi.fn() },
    user: {
      findUnique: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    trajet: { count: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
  },
}));

// Mock JWT
vi.mock("next-auth/jwt", () => ({
  encode: vi.fn().mockResolvedValue("mock-token"),
}));

import { getServerSession } from "next-auth";
import { db } from "@/lib/db";

const mockSession = {
  user: {
    id: "sa-1",
    email: "superadmin@busgo.com",
    name: "Super Admin",
    role: "superadmin",
  },
};

const mockAdminSession = {
  user: {
    id: "admin-1",
    email: "admin@fastbus.com",
    name: "Admin",
    role: "admin",
  },
};

describe("SuperAdmin API - Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/superadmin/dashboard should reject non-superadmin", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockAdminSession as never);
    const res = await GET();
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Non autorisé");
  });

  it("GET /api/superadmin/tenants should reject unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await getTenants();
    expect(res.status).toBe(403);
  });

  it("GET /api/superadmin/invoices should reject non-superadmin", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockAdminSession as never);
    const res = await getBilling();
    expect(res.status).toBe(403);
  });

  it("GET /api/superadmin/analytics should reject non-superadmin", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockAdminSession as never);
    const res = await getAnalytics();
    expect(res.status).toBe(403);
  });

  it("GET /api/superadmin/settings should reject non-superadmin", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockAdminSession as never);
    const res = await getSettings(new Request("http://localhost/api/superadmin/settings"));
    expect(res.status).toBe(403);
  });
});

describe("SuperAdmin API - Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never);
  });

  it("GET /api/superadmin/dashboard should return KPIs and MRR history", async () => {
    vi.mocked(db.tenant.count).mockResolvedValue(2);
    vi.mocked(db.tenant.findMany).mockResolvedValue([]);
    vi.mocked(db.bus.count).mockResolvedValue(3);
    vi.mocked(db.billet.count).mockResolvedValue(38);
    vi.mocked(db.subscription.findMany).mockResolvedValue([
      { totalAmount: 40000 } as never,
      { totalAmount: 20000 } as never,
    ]);
    // findMany called 6 times in MRR loop + failed + overdue
    vi.mocked(db.invoice.findMany).mockResolvedValue([]);
    vi.mocked(db.systemLog.findMany).mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty("kpis");
    expect(data).toHaveProperty("mrrHistory");
    expect(data).toHaveProperty("alerts");
    expect(data).toHaveProperty("recentLogs");

    expect(data.kpis.activeTenantCount).toBe(2);
    expect(data.kpis.mrr).toBe(60000);
    expect(data.mrrHistory).toHaveLength(6);
  });

  it("should detect payment failures as alerts", async () => {
    vi.mocked(db.tenant.count).mockResolvedValue(0);
    vi.mocked(db.tenant.findMany).mockResolvedValue([]);
    vi.mocked(db.bus.count).mockResolvedValue(0);
    vi.mocked(db.billet.count).mockResolvedValue(0);
    vi.mocked(db.subscription.findMany).mockResolvedValue([]);
    // findMany called 6 times in MRR loop, then failed, then overdue
    const calls: unknown[][] = [];
    for (let i = 0; i < 8; i++) calls.push([]);
    calls[6] = [{ number: "INV-001", tenant: { name: "Test" } }]; // failed call (7th)
    vi.mocked(db.invoice.findMany).mockImplementation(async () => {
      return calls.shift() || [];
    });
    vi.mocked(db.systemLog.findMany).mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();
    expect(data.alerts).toHaveLength(1);
    expect(data.alerts[0].type).toBe("payment_failed");
    expect(data.alerts[0].severity).toBe("error");
  });
});

describe("SuperAdmin API - Tenants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never);
  });

  it("GET should return tenants with counts and subscriptions", async () => {
    vi.mocked(db.tenant.findMany).mockResolvedValue([
      {
        id: "t1",
        name: "Test Corp",
        slug: "test",
        plan: "pro",
        isActive: true,
        _count: { users: 5, buses: 2, trajets: 10, invoices: 4 },
        subscriptions: [{ status: "active", totalAmount: 40000 }],
      } as never,
    ]);
    vi.mocked(db.tenant.count).mockResolvedValue(1);

    const res = await getTenants(new Request("http://localhost/api/superadmin/tenants") as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tenants).toHaveLength(1);
    expect(data.tenants[0].name).toBe("Test Corp");
  });

  it("PATCH should activate/deactivate tenant", async () => {
    vi.mocked(db.tenant.findUnique).mockResolvedValue({
      id: "t1", name: "Test", isActive: true,
    } as never);
    vi.mocked(db.tenant.update).mockResolvedValue({
      id: "t1", name: "Test", isActive: false,
    } as never);
    vi.mocked(db.user.updateMany).mockResolvedValue({ count: 2 } as never);
    vi.mocked(db.auditLog.create).mockResolvedValue({} as never);

    const res = await patchTenants(new Request("http://localhost/api/superadmin/tenants", {
      method: "PATCH",
      body: JSON.stringify({ tenantId: "t1", isActive: false }),
    }) as never);

    expect(res.status).toBe(200);
    expect(db.tenant.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { isActive: false },
    });
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { tenantId: "t1" },
      data: { isActive: false },
    });
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "tenant.deactivate",
        }),
      })
    );
  });

  it("PATCH should reject without tenantId", async () => {
    const res = await patchTenants(new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    }));

    expect(res.status).toBe(400);
  });
});

describe("SuperAdmin API - Impersonate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never);
  });

  it("should generate token for impersonation", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "u1",
      email: "admin@fastbus.com",
      name: "Fatou Ndiaye",
      role: "admin",
      tenantId: "t1",
      tenant: { name: "FastBus", slug: "fastbus" },
    } as never);
    vi.mocked(db.systemLog.create).mockResolvedValue({} as never);

    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ userId: "u1" }),
    }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("token");
    expect(data.user.role).toBe("admin");
    expect(data.user.tenantName).toBe("FastBus");
  });

  it("should reject without userId", async () => {
    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({}),
    }));

    expect(res.status).toBe(400);
  });

  it("should return 404 for non-existent user", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ userId: "nonexistent" }),
    }));

    expect(res.status).toBe(404);
  });
});