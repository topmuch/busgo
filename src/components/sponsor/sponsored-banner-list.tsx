"use client";

/**
 * SponsoredBannerList — renders all active sponsored offers for a PWA.
 * Drop this component anywhere in the layout (Client or Agent).
 */

import { useSponsoredOffers } from "@/hooks/modules/use-sponsored-offers";
import { SponsoredBanner } from "./sponsored-banner";

interface SponsoredBannerListProps {
  pwa: "client" | "agent";
  /** Compact mode for inline placement */
  compact?: boolean;
  /** Max number of offers to display */
  max?: number;
  className?: string;
}

export function SponsoredBannerList({
  pwa,
  compact = false,
  max = 3,
  className = "",
}: SponsoredBannerListProps) {
  const { offers, trackImpression, trackClick } = useSponsoredOffers({ pwa });

  if (offers.length === 0) return null;

  const visible = offers.slice(0, max);

  return (
    <div className={`space-y-2 ${className}`}>
      {visible.map((offer) => (
        <SponsoredBanner
          key={offer.id}
          offer={offer}
          onTrackImpression={trackImpression}
          onTrackClick={trackClick}
          compact={compact}
        />
      ))}
    </div>
  );
}
