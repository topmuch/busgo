import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { Shield, Menu } from "lucide-react";
import { SharedClientHeader } from "@/components/shared-header";
import { SuperAdminSidebar } from "@/components/superadmin-sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { type IconName } from "@/lib/icon-map";
import Link from "next/link";

// Icons are referenced by STRING NAME (not as components) so they can be
// passed from this Server Component to the SuperAdminSidebar Client Component.
// See src/lib/icon-map.tsx for the full registry.
const navGroups: { label: string; items: { href: string; label: string; icon: IconName }[] }[] = [
  {
    label: "Principal",
    items: [
      { href: "/superadmin", label: "Vue d'ensemble", icon: "BarChart3" },
      { href: "/superadmin/tenants", label: "Entreprises", icon: "Building2" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/superadmin/billing", label: "Facturation", icon: "CreditCard" },
      { href: "/superadmin/analytics", label: "Analytique", icon: "LineChart" },
    ],
  },
  {
    label: "Système",
    items: [
      { href: "/superadmin/settings", label: "Configuration", icon: "Settings" },
      { href: "/superadmin/audit", label: "Journal d'audit", icon: "FileText" },
    ],
  },
];

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session || session.user.role !== "superadmin") {
    redirect("/login");
  }

  const user = session.user;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 md:px-6">
          {/* Mobile menu trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden mr-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <Link
                    href="/superadmin"
                    className="font-bold text-base leading-none"
                  >
                    Bus Go
                  </Link>
                  <span className="mt-1 text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 px-1.5 py-0.5 rounded font-semibold w-fit">
                    SuperAdmin
                  </span>
                </div>
              </div>
              <SuperAdminSidebar navGroups={navGroups} />
            </SheetContent>
          </Sheet>

          {/* Brand + badge (desktop) */}
          <Link href="/superadmin" className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-4 w-4" />
            </div>
            <div className="hidden md:flex flex-col">
              <span className="font-bold text-base leading-none">Bus Go</span>
              <span className="mt-1 text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 px-1.5 py-0.5 rounded font-semibold w-fit flex items-center gap-1">
                <Shield className="h-3 w-3" />
                SuperAdmin
              </span>
            </div>
          </Link>

          <SharedClientHeader
            user={{
              name: user.name || "",
              email: user.email || "",
              role: user.role || "",
            }}
            avatarBg="bg-rose-600"
          />
        </div>
      </header>

      {/* ── Body: Sidebar + Main ──────────────────────────── */}
      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <aside
          className={[
            "hidden md:flex w-60 flex-col border-r p-4",
            "bg-gradient-to-b from-violet-950/5 to-transparent",
            "dark:from-violet-950/40 dark:to-transparent",
          ].join(" ")}
        >
          <SuperAdminSidebar navGroups={navGroups} />
        </aside>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
