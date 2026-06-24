"use client";

import { useTheme } from "next-themes";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogOut } from "lucide-react";
import Link from "next/link";

/**
 * HeaderActions — Client component that renders the theme toggle
 * and a visible logout button. Used in admin, superadmin, and agent layouts.
 */
export function HeaderActions({ variant = "default" }: { variant?: "default" | "agent" | "superadmin" }) {
  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <LogoutButton variant={variant} />
    </div>
  );
}

function LogoutButton({ variant = "default" }: { variant?: "default" | "agent" | "superadmin" }) {
  const colorMap = {
    default: "text-rose-500 hover:text-rose-600 hover:bg-rose-500/10",
    agent: "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10",
    superadmin: "text-rose-500 hover:text-rose-600 hover:bg-rose-500/10",
  };

  return (
    <Link
      href="/api/logout"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
        colorMap[variant]
      )}
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Déconnexion</span>
    </Link>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}