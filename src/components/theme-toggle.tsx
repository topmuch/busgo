"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/**
 * ThemeToggle — Luxurious purple dark/light mode toggle button.
 * Uses a pill-shaped container with a sliding disc indicator,
 * gradient backgrounds, and a subtle glow effect.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  function toggle() {
    setTheme(isDark ? "light" : "dark");
  }

  if (!mounted) {
    return (
      <button
        className={cn(
          "relative h-8 w-14 rounded-full p-0.5 transition-colors",
          "bg-muted",
          className
        )}
        aria-label="Changer le thème"
      >
        <span className="block h-7 w-7 rounded-full bg-background shadow-sm" />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "group relative h-8 w-14 rounded-full p-0.5 transition-all duration-500 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // Light: soft lavender gradient
        !isDark && "bg-gradient-to-r from-violet-200 via-purple-200 to-fuchsia-200 shadow-[0_0_12px_rgba(139,92,246,0.25)]",
        // Dark: deep purple gradient with stronger glow
        isDark && "bg-gradient-to-r from-violet-900 via-purple-800 to-fuchsia-900 shadow-[0_0_16px_rgba(139,92,246,0.4)]",
        className
      )}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
    >
      {/* Sliding disc */}
      <span
        className={cn(
          "flex items-center justify-center h-7 w-7 rounded-full shadow-md transition-all duration-500 ease-in-out",
          // Light state: disc on the left, white/lavender
          !isDark && "translate-x-0 bg-gradient-to-br from-white to-violet-100",
          // Dark state: disc slides right, deep violet
          isDark && "translate-x-6 bg-gradient-to-br from-violet-500 to-purple-700 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
        )}
      >
        {/* Icon inside disc */}
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-violet-100 transition-all duration-500" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-violet-600 transition-all duration-500" />
        )}
      </span>

      {/* Subtle ambient glow behind the button */}
      <span
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full transition-opacity duration-500",
          isDark
            ? "opacity-100 bg-[radial-gradient(circle_at_70%_50%,rgba(139,92,246,0.3),transparent_70%)]"
            : "opacity-0"
        )}
      />
    </button>
  );
}