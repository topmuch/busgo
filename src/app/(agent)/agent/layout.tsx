import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { Bus, LayoutDashboard, MapPin, ScanLine, Ticket } from "lucide-react";
import { SharedClientHeader, SharedClientNav } from "@/components/shared-header";
import { AgentPWAProvider } from "@/components/agent/pwa-provider";
import type { IconName } from "@/lib/icon-map";
import Link from "next/link";

// Icons are referenced by STRING NAME (not as components) so they can be
// passed from this Server Component to the SharedClientNav Client Component.
// See src/lib/icon-map.tsx for the full registry.
const navItems: { href: string; label: string; icon: IconName }[] = [
  { href: "/agent", label: "Accueil", icon: "LayoutDashboard" },
  { href: "/agent/trajets", label: "Trajets", icon: "MapPin" },
  { href: "/agent/embarquement", label: "Embarquement", icon: "ScanLine" },
  { href: "/agent/billets", label: "Billets", icon: "Ticket" },
];

// Map icon names to actual Lucide components for the mobile bottom nav.
// We import the icons directly (not via the Icon wrapper) because the
// wrapper component from icon-map.tsx can cause issues in production
// builds when used inside a Server Component.
const mobileNavIcons: Record<IconName, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  MapPin,
  ScanLine,
  Ticket,
};

// Prevent static prerendering — this layout always needs the session cookie.
export const dynamic = "force-dynamic";

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (
    !session ||
    !["superadmin", "admin", "agent"].includes(session.user.role)
  ) {
    redirect("/login");
  }

  const user = session.user;

  return (
    <AgentPWAProvider>
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 md:px-6">
          <Link href="/agent" className="flex items-center gap-2 font-bold text-lg">
            <Bus className="h-5 w-5 text-primary" />
            <span>Bus Go</span>
            <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">
              Agent
            </span>
          </Link>

          <SharedClientHeader
            user={{
              name: user.name || "",
              email: user.email || "",
              role: user.role || "",
            }}
            avatarBg="bg-amber-600"
          />
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-56 flex-col border-r bg-muted/40 p-4">
          <SharedClientNav navItems={navItems} />
        </aside>

        {/* Main content - with bottom padding for mobile nav */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const MobileIcon = mobileNavIcons[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:text-primary active:text-primary min-w-[60px]"
              >
                {MobileIcon && <MobileIcon className="h-5 w-5" />}
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
    </AgentPWAProvider>
  );
}
