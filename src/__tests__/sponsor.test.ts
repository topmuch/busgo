import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * ═══════════════════════════════════════════════════════════════
 *  Tests unitaires — Module Offres Sponsorisées Multi-PWA
 * ═══════════════════════════════════════════════════════════════
 *
 *  Couverture:
 *  - Eligibility / scope filtering logic (pure functions)
 *  - Dedup logic (in-memory impression tracking)
 *  - CTR computation
 *  - Constants
 */

// We test the pure logic of the sponsor service by mocking Prisma.
// Use vi.hoisted to ensure mocks are available when vi.mock factory runs.

const {
  mockOfferFindMany,
  mockOfferImpressionCreate,
  mockOfferImpressionCount,
  mockOfferImpressionFindMany,
  mockOfferClickCreate,
  mockOfferClickCount,
  mockOfferClickFindMany,
  mockOfferUpdate,
} = vi.hoisted(() => ({
  mockOfferFindMany: vi.fn(),
  mockOfferImpressionCreate: vi.fn(),
  mockOfferImpressionCount: vi.fn(),
  mockOfferImpressionFindMany: vi.fn(),
  mockOfferClickCreate: vi.fn(),
  mockOfferClickCount: vi.fn(),
  mockOfferClickFindMany: vi.fn(),
  mockOfferUpdate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    sponsoredOffer: {
      findMany: mockOfferFindMany,
      update: mockOfferUpdate,
    },
    offerImpression: {
      create: mockOfferImpressionCreate,
      count: mockOfferImpressionCount,
      findMany: mockOfferImpressionFindMany,
    },
    offerClick: {
      create: mockOfferClickCreate,
      count: mockOfferClickCount,
      findMany: mockOfferClickFindMany,
    },
  },
}));

import {
  listActiveOffers,
  trackImpression,
  trackClick,
  getOfferStats,
  type OfferContext,
} from "../../src/lib/modules/sponsor-service";

// ──────────────────────────────────────────────────────────────
// 1. listActiveOffers — filtering logic
// ──────────────────────────────────────────────────────────────

describe("Sponsor — listActiveOffers filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches offers matching scope + PWA + active + within date range", async () => {
    // Simulate DB return
    mockOfferFindMany.mockResolvedValue([
      {
        id: "o1",
        title: "Offre 1",
        description: null,
        imageUrl: null,
        ctaLabel: "Voir",
        ctaUrl: "https://example.com",
        bgColor: "#4A90E2",
        textColor: "#ffffff",
        priority: 80,
        maxImpressions: null,
        maxClicks: null,
        impressionsCount: 0,
        clicksCount: 0,
      },
    ]);

    const ctx: OfferContext = {
      tenantId: "tenant-1",
      pwa: "client",
      sessionId: "sess-1",
    };

    const offers = await listActiveOffers(ctx);

    expect(offers).toHaveLength(1);
    expect(offers[0].title).toBe("Offre 1");

    // Verify Prisma query
    expect(mockOfferFindMany).toHaveBeenCalledTimes(1);
    const args = mockOfferFindMany.mock.calls[0][0];
    expect(args.where.isActive).toBe(true);
    expect(args.where.targetPwa).toEqual({ in: ["client", "both"] });
    expect(args.where.OR).toBeDefined();
  });

  it("filters out offers that hit their impression limit", async () => {
    mockOfferFindMany.mockResolvedValue([
      {
        id: "o1",
        title: "Limited offer",
        description: null,
        imageUrl: null,
        ctaLabel: "Voir",
        ctaUrl: "https://example.com",
        bgColor: "#4A90E2",
        textColor: "#ffffff",
        priority: 50,
        maxImpressions: 1000,
        maxClicks: null,
        impressionsCount: 1000, // limit reached
        clicksCount: 5,
      },
      {
        id: "o2",
        title: "Active offer",
        description: null,
        imageUrl: null,
        ctaLabel: "Voir",
        ctaUrl: "https://example.com",
        bgColor: "#4A90E2",
        textColor: "#ffffff",
        priority: 50,
        maxImpressions: 1000,
        maxClicks: null,
        impressionsCount: 500, // under limit
        clicksCount: 10,
      },
    ]);

    const offers = await listActiveOffers({
      pwa: "client",
      sessionId: "s1",
    });

    expect(offers).toHaveLength(1);
    expect(offers[0].title).toBe("Active offer");
  });

  it("filters out offers that hit their click limit", async () => {
    mockOfferFindMany.mockResolvedValue([
      {
        id: "o1",
        title: "Click-exhausted",
        description: null,
        imageUrl: null,
        ctaLabel: "Voir",
        ctaUrl: "https://example.com",
        bgColor: "#4A90E2",
        textColor: "#ffffff",
        priority: 50,
        maxImpressions: null,
        maxClicks: 100,
        impressionsCount: 5000,
        clicksCount: 100, // limit reached
      },
    ]);

    const offers = await listActiveOffers({
      pwa: "agent",
      sessionId: "s1",
    });

    expect(offers).toHaveLength(0);
  });

  it("returns offers sorted by priority desc then createdAt desc", async () => {
    mockOfferFindMany.mockResolvedValue([]);

    await listActiveOffers({ pwa: "client", sessionId: "s1" });

    const args = mockOfferFindMany.mock.calls[0][0];
    expect(args.orderBy).toEqual([
      { priority: "desc" },
      { createdAt: "desc" },
    ]);
  });

  it("limits to 10 offers", async () => {
    mockOfferFindMany.mockResolvedValue([]);

    await listActiveOffers({ pwa: "client", sessionId: "s1" });

    const args = mockOfferFindMany.mock.calls[0][0];
    expect(args.take).toBe(10);
  });
});

// ──────────────────────────────────────────────────────────────
// 2. trackImpression — dedup logic
// ──────────────────────────────────────────────────────────────

describe("Sponsor — trackImpression dedup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOfferImpressionCreate.mockResolvedValue({});
    mockOfferUpdate.mockResolvedValue({});
  });

  it("creates impression + increments counter on first call", async () => {
    const result = await trackImpression("offer-1", {
      pwa: "client",
      sessionId: "sess-1",
    });

    expect(result.ok).toBe(true);
    expect(result.deduplicated).toBeFalsy();
    expect(mockOfferImpressionCreate).toHaveBeenCalledTimes(1);
    expect(mockOfferUpdate).toHaveBeenCalledTimes(1);

    // Verify the update call increments impressionsCount
    const updateArgs = mockOfferUpdate.mock.calls[0][0];
    expect(updateArgs.where.id).toBe("offer-1");
    expect(updateArgs.data.impressionsCount).toEqual({ increment: 1 });
  });

  it("deduplicates subsequent impressions within 5 min for same session", async () => {
    const ctx = { pwa: "client" as const, sessionId: "sess-dedup" };

    // First call — tracks
    await trackImpression("offer-dedup", ctx);
    expect(mockOfferImpressionCreate).toHaveBeenCalledTimes(1);

    // Second call within 5 min — deduplicated
    const result2 = await trackImpression("offer-dedup", ctx);
    expect(result2.deduplicated).toBe(true);
    expect(mockOfferImpressionCreate).toHaveBeenCalledTimes(1); // still 1

    // Different offer — not deduplicated
    await trackImpression("offer-other", ctx);
    expect(mockOfferImpressionCreate).toHaveBeenCalledTimes(2);
  });

  it("different sessions are not deduplicated", async () => {
    await trackImpression("offer-x", {
      pwa: "client",
      sessionId: "sess-a",
    });
    await trackImpression("offer-x", {
      pwa: "client",
      sessionId: "sess-b",
    });

    expect(mockOfferImpressionCreate).toHaveBeenCalledTimes(2);
  });

  it("stores userId + tenantId + pwa in impression row", async () => {
    await trackImpression("offer-userid", {
      pwa: "agent",
      sessionId: "sess-userid",
      userId: "user-1",
      tenantId: "tenant-1",
      userAgent: "Mozilla/5.0...",
    });

    const args = mockOfferImpressionCreate.mock.calls[0][0];
    expect(args.data.offerId).toBe("offer-userid");
    expect(args.data.userId).toBe("user-1");
    expect(args.data.tenantId).toBe("tenant-1");
    expect(args.data.pwa).toBe("agent");
    expect(args.data.userAgent).toBe("Mozilla/5.0...");
  });

  it("truncates userAgent to 500 chars", async () => {
    const longUA = "A".repeat(1000);
    await trackImpression("offer-trunc", {
      pwa: "client",
      sessionId: "sess-trunc",
      userAgent: longUA,
    });

    const args = mockOfferImpressionCreate.mock.calls[0][0];
    expect(args.data.userAgent.length).toBe(500);
  });
});

// ──────────────────────────────────────────────────────────────
// 3. trackClick
// ──────────────────────────────────────────────────────────────

describe("Sponsor — trackClick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOfferClickCreate.mockResolvedValue({});
    mockOfferUpdate.mockResolvedValue({});
  });

  it("creates click + increments counter", async () => {
    const result = await trackClick("offer-1", {
      pwa: "client",
      sessionId: "sess-1",
      referer: "https://busgo.sn/client",
    });

    expect(result.ok).toBe(true);
    expect(mockOfferClickCreate).toHaveBeenCalledTimes(1);

    const createArgs = mockOfferClickCreate.mock.calls[0][0];
    expect(createArgs.data.offerId).toBe("offer-1");
    expect(createArgs.data.referer).toBe("https://busgo.sn/client");

    const updateArgs = mockOfferUpdate.mock.calls[0][0];
    expect(updateArgs.data.clicksCount).toEqual({ increment: 1 });
  });

  it("does NOT deduplicate clicks (each click is tracked)", async () => {
    const ctx = { pwa: "client" as const, sessionId: "sess-1" };

    await trackClick("offer-1", ctx);
    await trackClick("offer-1", ctx);
    await trackClick("offer-1", ctx);

    expect(mockOfferClickCreate).toHaveBeenCalledTimes(3);
  });
});

// ──────────────────────────────────────────────────────────────
// 4. getOfferStats — CTR computation
// ──────────────────────────────────────────────────────────────

describe("Sponsor — getOfferStats CTR computation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("computes CTR = clicks / impressions * 100", async () => {
    mockOfferImpressionCount.mockResolvedValue(1000);
    mockOfferClickCount.mockResolvedValue(50);
    mockOfferImpressionFindMany.mockResolvedValue([]);
    mockOfferClickFindMany.mockResolvedValue([]);

    const stats = await getOfferStats("offer-1");

    expect(stats.impressionCount).toBe(1000);
    expect(stats.clickCount).toBe(50);
    expect(stats.ctr).toBe(5); // 50/1000*100 = 5%
  });

  it("returns CTR = 0 when no impressions", async () => {
    mockOfferImpressionCount.mockResolvedValue(0);
    mockOfferClickCount.mockResolvedValue(0);
    mockOfferImpressionFindMany.mockResolvedValue([]);
    mockOfferClickFindMany.mockResolvedValue([]);

    const stats = await getOfferStats("offer-1");
    expect(stats.ctr).toBe(0);
  });

  it("rounds CTR to 2 decimals", async () => {
    mockOfferImpressionCount.mockResolvedValue(3);
    mockOfferClickCount.mockResolvedValue(1);
    mockOfferImpressionFindMany.mockResolvedValue([]);
    mockOfferClickFindMany.mockResolvedValue([]);

    const stats = await getOfferStats("offer-1");
    // 1/3 * 100 = 33.333... → rounded to 33.33
    expect(stats.ctr).toBe(33.33);
  });

  it("returns recent 10 impressions + 10 clicks", async () => {
    mockOfferImpressionCount.mockResolvedValue(100);
    mockOfferClickCount.mockResolvedValue(20);
    mockOfferImpressionFindMany.mockResolvedValue([
      { id: "i1", pwa: "client", createdAt: new Date(), userAgent: null },
    ]);
    mockOfferClickFindMany.mockResolvedValue([
      { id: "c1", pwa: "agent", createdAt: new Date(), referer: null },
    ]);

    const stats = await getOfferStats("offer-1");

    expect(stats.recentImpressions).toHaveLength(1);
    expect(stats.recentClicks).toHaveLength(1);

    // Verify findMany was called with take: 10
    const impArgs = mockOfferImpressionFindMany.mock.calls[0][0];
    expect(impArgs.take).toBe(10);
  });
});
