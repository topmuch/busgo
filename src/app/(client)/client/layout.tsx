import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { Bus, LogOut, User, Bell } from "lucide-react";
import type { IconName } from "@/lib/icon-map";
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

export const dynamic = "force-dynamic";

const mobileNavIcons: Record<
  IconName,
  React.ComponentType<{ className?: string }>
> = {
  Bus,
  User,
};

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
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* ─── Header (gradient bleu) ─── */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#4A90E2] to-[#87CEEB] text-white shadow-md">
        <div className="flex h-14 items-center px-4">
          <Link
            href="/client"
            className="flex items-center gap-2 font-bold text-lg text-white"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <Bus className="h-5 w-5" />
            </div>
            <span>Bus Go</span>
            <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
              Passager
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {/* Bell */}
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-full text-white hover:bg-white/20 hover:text-white"
            >
              <Bell className="h-4 w-4" />
            </Button>

            {/* User avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full p-0 hover:bg-white/20"
                >
                  <Avatar className="h-9 w-9 border-2 border-white/40">
                    <AvatarFallback className="bg-white/20 text-white text-xs">
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
                  <Link href="/api/logout" className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ─── Mobile bottom nav ─── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <nav className="flex justify-around py-2">
          {navItems.map((item) => {
            const MobileIcon = mobileNavIcons[item.icon];
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-col gap-0.5 h-auto py-1 text-slate-500 hover:text-[#4A90E2]"
                >
                  {MobileIcon && <MobileIcon className="h-4 w-4" />}
                  <span className="text-[10px]">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ─── Main content ─── */}
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
    </div>
  );
}
