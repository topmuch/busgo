import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { Bus, LogOut } from "lucide-react";
import { Icon, type IconName } from "@/lib/icon-map";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  const user = session.user;
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const navItems: { href: string; label: string; icon: IconName }[] = [
    { href: "/client", label: "Mon voyage", icon: "Bus" },
    { href: "/client/billets", label: "Historique", icon: "User" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar — minimal for mobile-first */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <Link href="/client" className="flex items-center gap-2 font-bold text-lg">
            <Bus className="h-5 w-5 text-primary" />
            <span>Bus Go</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {/* Online indicator (client only meaningful) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-sky-600 text-white text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex flex-col gap-1 p-2">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/api/auth/signout" className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-[env(safe-area-inset-bottom)]">
        <nav className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button variant="ghost" size="sm" className="flex-col gap-0.5 h-auto py-1">
                <Icon name={item.icon} className="h-4 w-4" />
                <span className="text-[10px]">{item.label}</span>
              </Button>
            </Link>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
    </div>
  );
}