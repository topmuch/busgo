import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { SponsoredOffersManager } from "@/components/sponsor/sponsored-offers-manager";
import { GradientHeader } from "@/components/dashboard/design-system";

export const dynamic = "force-dynamic";

export default async function AdminOffersPage() {
  const session = await getServerSession();
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <div className="p-6">
        <p>Tenant manquant.</p>
      </div>
    );
  }

  // Fetch initial offers (server-side)
  const offers = await db.sponsoredOffer.findMany({
    where: {
      OR: [{ scope: "global" }, { scope: "tenant", tenantId }],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6 pb-6">
      <GradientHeader
        title="Offres Sponsorisées"
        subtitle="Bannières publicitaires affichées dans les PWA Client et Agent. Tracking impressions + clics."
        badges={["Multi-PWA", "Scope global/tenant", "Tracking ROI"]}
      />

      <div className="px-6">
        <SponsoredOffersManager
          initialOffers={offers.map((o) => ({
            ...o,
            startDate: o.startDate.toISOString(),
            endDate: o.endDate.toISOString(),
            createdAt: o.createdAt.toISOString(),
            updatedAt: o.updatedAt.toISOString(),
          }))}
          tenantId={tenantId}
          isSuperAdmin={session.user.role === "superadmin"}
        />
      </div>
    </div>
  );
}
