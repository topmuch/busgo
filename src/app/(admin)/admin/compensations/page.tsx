import { getServerSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { listTenantCompensations } from "@/lib/modules/compensation-service";
import { CompensationList } from "@/components/compensation/compensation-list";
import { GradientHeader, ContentCard } from "@/components/dashboard/design-system";

export const dynamic = "force-dynamic";

export default async function AdminCompensationsPage() {
  const session = await getServerSession();
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <div className="p-6">
        <p>Tenant manquant.</p>
      </div>
    );
  }

  const compensations = await listTenantCompensations(tenantId, { take: 100 });

  // Stats
  const total = compensations.length;
  const active = compensations.filter((c) => c.status === "issued").length;
  const redeemed = compensations.filter((c) => c.status === "redeemed").length;
  const totalValue = compensations
    .filter((c) => c.status === "issued")
    .reduce((s, c) => s + c.amountFcfa, 0);

  return (
    <div className="space-y-6 pb-6">
      <GradientHeader
        title="Compensations Retard Manqué"
        subtitle="Bons d'achat attribués aux passagers en retard qui partageaient leur position GPS live."
        badges={["Éligibilité GPS", "Voucher 90 jours", "Auto-attribution"]}
      />

      <div className="px-6 -mt-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-800">{total}</p>
            <p className="text-[10px] text-slate-500 mt-1">Bons émis</p>
          </div>
          <div className="rounded-xl bg-emerald-500 text-white shadow-sm p-5">
            <p className="text-xs uppercase tracking-wider text-white/80">Actifs</p>
            <p className="text-2xl font-bold">{active}</p>
            <p className="text-[10px] text-white/70 mt-1">En attente d'utilisation</p>
          </div>
          <div className="rounded-xl bg-slate-500 text-white shadow-sm p-5">
            <p className="text-xs uppercase tracking-wider text-white/80">Utilisés</p>
            <p className="text-2xl font-bold">{redeemed}</p>
            <p className="text-[10px] text-white/70 mt-1">Bons remboursés</p>
          </div>
          <div className="rounded-xl bg-[#4A90E2] text-white shadow-sm p-5">
            <p className="text-xs uppercase tracking-wider text-white/80">Valeur active</p>
            <p className="text-2xl font-bold">
              {totalValue.toLocaleString("fr-FR")}
            </p>
            <p className="text-[10px] text-white/70 mt-1">FCFA en circulation</p>
          </div>
        </div>
      </div>

      <div className="px-6">
        <ContentCard title="Historique des compensations">
          <CompensationList compensations={compensations} />
        </ContentCard>
      </div>
    </div>
  );
}
