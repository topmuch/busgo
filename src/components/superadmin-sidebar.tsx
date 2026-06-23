"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function SuperAdminSidebar({
  navGroups,
}: {
  navGroups: NavGroup[];
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col gap-6">
        {navGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </span>
            <nav className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2.5 text-sm h-9 rounded-r-md rounded-l-none pl-3 border-l-2 border-transparent transition-all duration-150",
                        "hover:bg-muted hover:text-foreground",
                        isActive &&
                          "bg-primary/10 text-primary font-medium border-l-2 border-primary pl-[calc(0.75rem-2px)]"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t">
        <p className="px-3 text-[10px] text-muted-foreground/60 font-medium tracking-wide">
          Bus Go v1.0
        </p>
      </div>
    </div>
  );
}