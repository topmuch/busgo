"use client";

/**
 * SponsoredBanner — displays a single sponsored offer as a banner.
 *
 * - Auto-tracks impression when visible (IntersectionObserver)
 * - Tracks click when CTA is clicked
 * - Styled with offer.bgColor + offer.textColor (overridable by tenant branding)
 * - Dismissable (per-session storage)
 */

import { useEffect, useRef, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import type { SponsoredOfferItem } from "@/hooks/modules/use-sponsored-offers";

interface SponsoredBannerProps {
  offer: SponsoredOfferItem;
  onTrackImpression: (offerId: string) => void;
  onTrackClick: (offerId: string) => void;
  /** Compact mode (smaller, for inline display) */
  compact?: boolean;
  /** Allow user to dismiss (default: true) */
  dismissable?: boolean;
  className?: string;
}

export function SponsoredBanner({
  offer,
  onTrackImpression,
  onTrackClick,
  compact = false,
  dismissable = true,
  className = "",
}: SponsoredBannerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      sessionStorage.getItem(`busgo-sponsor-dismissed-${offer.id}`) === "1"
    );
  });
  const impressionTrackedRef = useRef(false);

  // Track impression when banner becomes visible
  useEffect(() => {
    if (dismissed || impressionTrackedRef.current || !ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            impressionTrackedRef.current = true;
            onTrackImpression(offer.id);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: [0.5] }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [offer.id, onTrackImpression, dismissed]);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`busgo-sponsor-dismissed-${offer.id}`, "1");
    }
    setDismissed(true);
  };

  const handleClick = () => {
    onTrackClick(offer.id);
    // Don't preventDefault — let the link open in new tab
  };

  if (dismissed) return null;

  const style: React.CSSProperties = {
    backgroundColor: offer.bgColor,
    color: offer.textColor,
  };

  if (compact) {
    return (
      <div
        ref={ref}
        className={`relative flex items-center gap-2 rounded-lg overflow-hidden shadow-sm ${className}`}
        style={style}
      >
        {offer.imageUrl && (
          <img
            src={offer.imageUrl}
            alt=""
            className="h-10 w-10 object-cover"
          />
        )}
        <div className="flex-1 min-w-0 py-1.5 pr-2">
          <p className="text-xs font-semibold truncate">{offer.title}</p>
          {offer.description && (
            <p className="text-[10px] opacity-90 truncate">
              {offer.description}
            </p>
          )}
        </div>
        <a
          href={offer.ctaUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleClick}
          className="shrink-0 inline-flex items-center gap-1 rounded-md bg-white/20 hover:bg-white/30 px-2 py-1 text-[10px] font-medium transition-colors"
          style={{ color: offer.textColor }}
        >
          {offer.ctaLabel}
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
        {dismissable && (
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 p-1 hover:bg-white/20 rounded"
            aria-label="Masquer"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-xl shadow-md ${className}`}
      style={style}
    >
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -top-2 -right-2 h-20 w-20 rounded-full bg-white/10 pointer-events-none" />

      <div className="relative flex items-stretch gap-3 p-4">
        {offer.imageUrl && (
          <img
            src={offer.imageUrl}
            alt=""
            className="h-16 w-16 rounded-lg object-cover shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider opacity-80 font-medium">
            Offre sponsorisée
          </p>
          <h3 className="text-sm font-bold leading-tight">{offer.title}</h3>
          {offer.description && (
            <p className="text-xs opacity-90 mt-1 line-clamp-2">
              {offer.description}
            </p>
          )}
          <a
            href={offer.ctaUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={handleClick}
            className="inline-flex items-center gap-1 mt-2 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{ color: offer.textColor }}
          >
            {offer.ctaLabel}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        {dismissable && (
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 p-1 hover:bg-white/20 rounded"
            aria-label="Masquer cette offre"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
