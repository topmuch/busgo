import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BarChart3, Building2, CreditCard, Settings, Shield, LineChart, Menu } from "lucide-react";
import { SharedClientHeader, SharedClientNav } from "@/components/shared-header";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/superadmin", label: "Vue d'ensemble", icon: BarChart3 },
  { href: "/superadmin/tenants", label: "Entreprises", icon: Building2 },
  { href: "/superadmin/billing", label: "Facturation", icon: CreditCard },
  { href: "/superadmin/analytics", label: "Analytique", icon: LineChart },
  { href: "/superadmin/settings", label: "Configuration", icon: Settings },
];

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "superadmin") {
    redirect("/login");
  }

  const user = session.user;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 md:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden mr-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-4">
              <div className="flex items-center gap-2 font-bold text-lg mb-6">
                <Shield className="h-5 w-5 text-rose-600" />
                <span>Bus Go</span>
              </div>
              <SharedClientNav navItems={navItems} />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 font-bold text-lg">
            <Shield className="h-5 w-5 text-primary" />
            <span>Bus Go</span>
            <span className="text-xs bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
              <Shield className="h-3 w-3" />
              SuperAdmin
            </span>
          </div>

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

      <div className="flex-1 flex">
        <aside className="hidden md:flex w-60 flex-col border-r bg-muted/40 p-4">
          <SharedClientNav navItems={navItems} />
        </aside>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}