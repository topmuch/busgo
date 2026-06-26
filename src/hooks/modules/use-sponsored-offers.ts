"use client";

/**
 * useSponsoredOffers — fetches + tracks sponsored offers for a PWA.
 *
 * Lifecycle:
 * - On mount, fetches /api/sponsor/offers?pwa=...
 * - Generates a sessionId (stored in sessionStorage, persists across refreshes)
 * - Exposes trackImpression + trackClick for the calling component
 */

import { useEffect, useState, useCallback, useRef } from "react";

export interface SponsoredOfferItem {
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

interface UseSponsoredOffersOptions {
  pwa: "client" | "agent";
  /** Auto-fetch on mount (default: true) */
  autoFetch?: boolean;
}

export function useSponsoredOffers(opts: UseSponsoredOffersOptions) {
  const { pwa, autoFetch = true } = opts;
  const [offers, setOffers] = useState<SponsoredOfferItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const trackedImpressionsRef = useRef<Set<string>>(new Set());

  // ─── Session ID (persists across refreshes) ─────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "busgo-sponsor-session";
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = `s-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      sessionStorage.setItem(key, sid);
    }
    setSessionId(sid);
  }, []);

  // ─── Fetch offers ──────────────────────────────────────────
  const fetchOffers = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sponsor/offers?pwa=${pwa}&XTransformPort=3000`,
        {
          headers: { "x-session-id": sessionId },
        }
      );
      if (!res.ok) return;
      const data = await res.json();
      setOffers(data.offers ?? []);
    } catch {
      // Silent fail — sponsored offers should never block UX
    } finally {
      setLoading(false);
    }
  }, [pwa, sessionId]);

  useEffect(() => {
    if (autoFetch && sessionId) {
      fetchOffers();
    }
  }, [autoFetch, sessionId, fetchOffers]);

  // ─── Track impression (deduped per session) ────────────────
  const trackImpression = useCallback(
    async (offerId: string) => {
      if (!sessionId) return;
      // Dedupe: only track once per session per offer
      if (trackedImpressionsRef.current.has(offerId)) return;
      trackedImpressionsRef.current.add(offerId);

      try {
        await fetch("/api/sponsor/track?XTransformPort=3000", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offerId,
            event: "impression",
            pwa,
            sessionId,
          }),
        });
      } catch {
        // Silent fail
      }
    },
    [pwa, sessionId]
  );

  // ─── Track click (always tracked) ──────────────────────────
  const trackClick = useCallback(
    async (offerId: string) => {
      if (!sessionId) return;
      try {
        await fetch("/api/sponsor/track?XTransformPort=3000", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offerId,
            event: "click",
            pwa,
            sessionId,
          }),
        });
      } catch {
        // Silent fail
      }
    },
    [pwa, sessionId]
  );

  return {
    offers,
    loading,
    sessionId,
    fetchOffers,
    trackImpression,
    trackClick,
  };
}
