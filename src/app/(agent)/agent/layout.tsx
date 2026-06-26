import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import {
  Bus,
  LayoutDashboard,
  MapPin,
  ScanLine,
  Ticket,
} from "lucide-react";
import { SharedClientHeader, SharedClientNav } from "@/components/shared-header";
import { AgentPWAProvider } from "@/components/agent/pwa-provider";
import type { IconName } from "@/lib/icon-map";
import Link from "next/link";

const navItems: { href: string; label: string; icon: IconName }[] = [
  { href: "/agent", label: "Accueil", icon: "LayoutDashboard" },
  { href: "/agent/trajets", label: "Trajets", icon: "MapPin" },
  { href: "/agent/embarquement", label: "Embarquement", icon: "ScanLine" },
  { href: "/agent/billets", label: "Billets", icon: "Ticket" },
];

const mobileNavIcons: Record<
  IconName,
  React.ComponentType<{ className?: string }>
> = {
  LayoutDashboard,
  MapPin,
  ScanLine,
  Ticket,
};

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
      <div className="min-h-dvh flex flex-col bg-slate-50">
        {/* ─── Header (gradient bleu) ─── */}
        <header className="sticky top-0 z-50 bg-gradient-to-r from-[#4A90E2] to-[#87CEEB] text-white shadow-md">
          <div className="flex h-14 items-center px-4 md:px-6 gap-3">
            <Link
              href="/agent"
              className="flex items-center gap-2 font-bold text-lg text-white"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                <Bus className="h-5 w-5" />
              </div>
              <span>Bus Go</span>
              <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                Agent
              </span>
            </Link>

            <div className="ml-auto">
              <SharedClientHeader
                user={{
                  name: user.name || "",
                  email: user.email || "",
                  role: user.role || "",
                }}
                avatarBg="bg-white/20 text-white"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 flex min-h-0">
          {/* ─── Desktop sidebar (gris clair #F8F9FA) ─── */}
          <aside className="hidden md:flex w-56 flex-col bg-[#F8F9FA] border-r border-slate-200 p-4">
            {/* Brand mini */}
            <div className="mb-6 px-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#4A90E2]">
                Bus Go
              </p>
              <p className="text-xs text-slate-500">Espace Agent</p>
            </div>
            <SharedClientNav navItems={navItems} />
          </aside>

          {/* ─── Main content ─── */}
          <main className="flex-1 p-0 md:p-0 pb-20 md:pb-0 overflow-y-auto">
            {children}
          </main>
        </div>

        {/* ─── Mobile bottom navigation ─── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 safe-area-bottom">
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => {
              const MobileIcon = mobileNavIcons[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 text-slate-500 transition-colors hover:text-[#4A90E2] active:text-[#4A90E2] min-w-[60px]"
                >
                  {MobileIcon && <MobileIcon className="h-5 w-5" />}
                  <span className="text-[10px] font-medium leading-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </AgentPWAProvider>
  );
}
