/**
 * ═══════════════════════════════════════════════════════════════
 *  Sponsored Offers Service
 *  Module "Offres Sponsorisées Multi-PWA"
 * ═══════════════════════════════════════════════════════════════
 *
 *  Sélection d'offres actives pour un contexte donné (tenant + PWA).
 *  Tracking impressions + clics avec déduplication session (max 1
 *  impression par sessionId + offerId dans une fenêtre de 5 min).
 */

import { db } from "@/lib/db";

// ─── Types ─────────────────────────────────────────────────────

export interface OfferContext {
  tenantId?: string;
  pwa: "client" | "agent";
  userId?: string;
  sessionId: string;
  userAgent?: string;
  referer?: string;
}

export interface OfferListItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  ctaLabel: string;
  ctaUrl: string;
  bgColor: string;
  textColor: string;
  priority: number;
}

// ─── List active offers for a context ──────────────────────────

export async function listActiveOffers(ctx: OfferContext): Promise<OfferListItem[]> {
  const now = new Date();

  // Get offers matching scope + PWA + active + within date range + under limits
  const offers = await db.sponsoredOffer.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
      targetPwa: { in: [ctx.pwa, "both"] },
      OR: [
        // Global scope (no tenant)
        { scope: "global" },
        // Tenant-specific scope — match tenantId
        ...(ctx.tenantId
          ? [{ scope: "tenant", tenantId: ctx.tenantId }]
          : []),
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 10,
  });

  // Filter out offers that have hit their impression/click limits
  return offers
    .filter((o) => !o.maxImpressions || o.impressionsCount < o.maxImpressions)
    .filter((o) => !o.maxClicks || o.clicksCount < o.maxClicks)
    .map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      imageUrl: o.imageUrl,
      ctaLabel: o.ctaLabel,
      ctaUrl: o.ctaUrl,
      bgColor: o.bgColor,
      textColor: o.textColor,
      priority: o.priority,
    }));
}

// ─── Track impression ──────────────────────────────────────────

const IMPRESSION_DEDUP_MS = 5 * 60 * 1000; // 5 min

const recentImpressions = new Map<string, number>(); // key: offerId:sessionId → timestamp

export async function trackImpression(
  offerId: string,
  ctx: OfferContext
): Promise<{ ok: boolean; deduplicated?: boolean }> {
  // In-memory dedup (5 min window per session+offer)
  const dedupKey = `${offerId}:${ctx.sessionId}`;
  const lastSeen = recentImpressions.get(dedupKey);
  const now = Date.now();
  if (lastSeen && now - lastSeen < IMPRESSION_DEDUP_MS) {
    return { ok: true, deduplicated: true };
  }
  recentImpressions.set(dedupKey, now);

  // Trim map if it grows too large
  if (recentImpressions.size > 10_000) {
    const cutoff = now - IMPRESSION_DEDUP_MS;
    for (const [k, v] of recentImpressions.entries()) {
      if (v < cutoff) recentImpressions.delete(k);
    }
  }

  try {
    // Insert impression row
    await db.offerImpression.create({
      data: {
        offerId,
        userId: ctx.userId,
        tenantId: ctx.tenantId,
        pwa: ctx.pwa,
        userAgent: ctx.userAgent?.substring(0, 500),
        sessionId: ctx.sessionId,
      },
    });

    // Increment counter (atomic)
    await db.sponsoredOffer.update({
      where: { id: offerId },
      data: { impressionsCount: { increment: 1 } },
    });

    return { ok: true };
  } catch (err) {
    console.error("[OFFER_IMPRESSION_ERROR]", err);
    return { ok: false };
  }
}

// ─── Track click ───────────────────────────────────────────────

export async function trackClick(
  offerId: string,
  ctx: OfferContext
): Promise<{ ok: boolean }> {
  try {
    await db.offerClick.create({
      data: {
        offerId,
        userId: ctx.userId,
        tenantId: ctx.tenantId,
        pwa: ctx.pwa,
        userAgent: ctx.userAgent?.substring(0, 500),
        sessionId: ctx.sessionId,
        referer: ctx.referer?.substring(0, 500),
      },
    });

    await db.sponsoredOffer.update({
      where: { id: offerId },
      data: { clicksCount: { increment: 1 } },
    });

    return { ok: true };
  } catch (err) {
    console.error("[OFFER_CLICK_ERROR]", err);
    return { ok: false };
  }
}

// ─── Get stats (admin) ─────────────────────────────────────────

export async function getOfferStats(offerId: string) {
  const [impressionCount, clickCount, recentImpressions, recentClicks] =
    await Promise.all([
      db.offerImpression.count({ where: { offerId } }),
      db.offerClick.count({ where: { offerId } }),
      db.offerImpression.findMany({
        where: { offerId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          pwa: true,
          createdAt: true,
          userAgent: true,
        },
      }),
      db.offerClick.findMany({
        where: { offerId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          pwa: true,
          createdAt: true,
          referer: true,
        },
      }),
    ]);

  const ctr =
    impressionCount > 0 ? (clickCount / impressionCount) * 100 : 0;

  return {
    impressionCount,
    clickCount,
    ctr: Math.round(ctr * 100) / 100,
    recentImpressions,
    recentClicks,
  };
}

// ─── List all offers for admin ─────────────────────────────────

export async function listOffersForAdmin(options: {
  tenantId?: string;
  scope?: "global" | "tenant";
  isActive?: boolean;
  take?: number;
} = {}) {
  const { tenantId, scope, isActive, take = 50 } = options;

  return db.sponsoredOffer.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      ...(scope ? { scope } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take,
  });
}
