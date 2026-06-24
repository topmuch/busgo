import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { Bus, Menu } from "lucide-react";
import { SharedClientHeader, SharedClientNav } from "@/components/shared-header";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { IconName } from "@/lib/icon-map";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    redirect("/login");
  }

  const user = session.user;

  // Icons are referenced by STRING NAME (not as components) so they can be
  // passed from this Server Component to the SharedClientNav Client Component.
  // See src/lib/icon-map.tsx for the full registry.
  const navItems: { href: string; label: string; icon: IconName }[] = [
    { href: "/admin/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/admin", label: "Vue d'ensemble", icon: "Bus" },
    { href: "/admin/guichet", label: "Guichet", icon: "ScanLine" },
    { href: "/admin/buses", label: "Bus", icon: "Bus" },
    { href: "/admin/trajets", label: "Trajets", icon: "Ticket" },
    { href: "/admin/voix", label: "Voix & Annonces", icon: "Mic" },
    { href: "/admin/rapports", label: "Rapports", icon: "FileBarChart2" },
    { href: "/admin/settings", label: "Paramètres", icon: "Cog" },
    { href: "/admin/users", label: "Utilisateurs", icon: "Users" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 md:px-6">
          {/* Mobile hamburger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden mr-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-4">
              <div className="flex items-center gap-2 font-bold text-lg mb-6">
                <Bus className="h-5 w-5 text-primary" />
                <span>Bus Go</span>
              </div>
              <SharedClientNav navItems={navItems} />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 font-bold text-lg">
            <Bus className="h-5 w-5 text-primary" />
            <span>Bus Go</span>
            {user.tenantName && (
              <span className="text-sm font-normal text-muted-foreground">
                — {user.tenantName}
              </span>
            )}
          </div>

          <SharedClientHeader
            user={{
              name: user.name || "",
              email: user.email || "",
              role: user.role || "",
              tenantName: user.tenantName,
            }}
            avatarBg="bg-primary text-primary-foreground"
          />
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar — desktop */}
        <aside className="hidden md:flex w-60 flex-col border-r bg-muted/40 p-4">
          <SharedClientNav navItems={navItems} />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
