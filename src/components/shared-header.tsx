"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogOut, Bell } from "lucide-react";
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
import { iconMap, type IconName } from "@/lib/icon-map";

interface NavItem {
  href: string;
  label: string;
  /** Icon name (string key into iconMap). See src/lib/icon-map.tsx. */
  icon: IconName;
}

/**
 * SharedClientHeader — Renders the right side of the header with:
 * - Bell icon
 * - ThemeToggle (luxurious violet)
 * - Visible logout button + avatar dropdown
 */
export function SharedClientHeader({
  user,
  navItems,
  avatarBg,
  pathname,
}: {
  user: { name: string; email: string; role: string; tenantName?: string };
  navItems?: NavItem[];
  avatarBg: string;
  pathname?: string;
}) {
  const currentPathname = usePathname();
  const resolvedPath = pathname ?? currentPathname;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="ml-auto flex items-center gap-2">
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-4 w-4" />
      </Button>

      <ThemeToggle />

      {/* Visible logout button */}
      <Link
        href="/api/auth/signout"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5",
          "text-sm font-medium transition-all duration-200",
          "text-rose-500 hover:text-rose-600 hover:bg-rose-500/10",
          "border border-transparent hover:border-rose-500/20"
        )}
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Déconnexion</span>
      </Link>

      {/* Avatar dropdown (kept for user info) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className={cn(avatarBg, "text-white text-xs")}>
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex flex-col gap-1 p-2">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground capitalize">
              Rôle : {user.role}
            </p>
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
  );
}

/**
 * SharedClientNav — Renders navigation items with active state detection.
 *
 * Icons are looked up by name via `iconMap` so that Server Component layouts
 * can pass plain serializable data (string keys) instead of icon components
 * (which are not allowed to cross the Server→Client boundary in React 19).
 */
export function SharedClientNav({
  navItems,
  className,
}: {
  navItems: NavItem[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {navItems.map((item) => {
        const Icon = iconMap[item.icon];
        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2 text-sm",
                pathname === item.href && "bg-accent text-accent-foreground font-medium"
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}
