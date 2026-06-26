import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { Bus, Menu } from "lucide-react";
import { SharedClientHeader, SharedClientNav } from "@/components/shared-header";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { IconName } from "@/lib/icon-map";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (
    !session ||
    (session.user.role !== "admin" && session.user.role !== "superadmin")
  ) {
    redirect("/login");
  }

  const user = session.user;

  const navItems: { href: string; label: string; icon: IconName }[] = [
    { href: "/admin/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/admin", label: "Vue d'ensemble", icon: "Bus" },
    { href: "/admin/guichet", label: "Guichet", icon: "ScanLine" },
    { href: "/admin/buses", label: "Bus", icon: "Bus" },
    { href: "/admin/trajets", label: "Trajets", icon: "Ticket" },
    { href: "/admin/voix", label: "Voix & Annonces", icon: "Mic" },
    { href: "/admin/compensations", label: "Compensations", icon: "Ticket" },
    { href: "/admin/offres", label: "Offres sponsorisées", icon: "Ticket" },
    { href: "/admin/rapports", label: "Rapports", icon: "FileBarChart2" },
    { href: "/admin/settings", label: "Paramètres & Équipe", icon: "Cog" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* ─── Header (gradient bleu) ─── */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#4A90E2] to-[#87CEEB] text-white shadow-md">
        <div className="flex h-14 items-center px-4 md:px-6 gap-3">
          {/* Mobile hamburger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden mr-1 text-white hover:bg-white/20 hover:text-white"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-4 bg-[#F8F9FA]">
              <div className="mb-6 px-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#4A90E2]">
                  Bus Go
                </p>
                <p className="text-xs text-slate-500">Espace Admin</p>
              </div>
              <SharedClientNav navItems={navItems} />
            </SheetContent>
          </Sheet>

          <Link
            href="/admin"
            className="flex items-center gap-2 font-bold text-lg text-white"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <Bus className="h-5 w-5" />
            </div>
            <span>Bus Go</span>
            {user.tenantName && (
              <span className="hidden sm:inline text-xs font-normal text-white/80 ml-1">
                — {user.tenantName}
              </span>
            )}
          </Link>

          <div className="ml-auto">
            <SharedClientHeader
              user={{
                name: user.name || "",
                email: user.email || "",
                role: user.role || "",
                tenantName: user.tenantName,
              }}
              avatarBg="bg-white/20 text-white"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* ─── Desktop sidebar (gris clair #F8F9FA) ─── */}
        <aside className="hidden md:flex w-60 flex-col bg-[#F8F9FA] border-r border-slate-200 p-4">
          <div className="mb-6 px-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#4A90E2]">
              Bus Go
            </p>
            <p className="text-xs text-slate-500">Espace Admin</p>
          </div>
          <SharedClientNav navItems={navItems} />
        </aside>

        {/* ─── Main content ─── */}
        <main className="flex-1 p-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
