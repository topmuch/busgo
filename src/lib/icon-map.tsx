/**
 * Icon Map — central registry mapping string keys to Lucide icon components.
 *
 * WHY THIS EXISTS
 * ───────────────
 * In React 19 / Next.js 16, Server Components cannot pass non-serializable
 * values (functions, class instances, React components) as props to Client
 * Components. Lucide icons ARE React components, so passing `icon: BarChart3`
 * from a Server Component (e.g. a layout.tsx) to a Client Component (e.g. a
 * sidebar) throws:
 *   "Functions cannot be passed directly to Client Components"
 *
 * The fix: Server Components pass the icon NAME (a string) as a prop, and the
 * Client Component looks up the actual icon component via this map.
 *
 * USAGE
 * ─────
 * // In a Server Component (layout.tsx):
 *   import type { IconName } from "@/lib/icon-map";
 *   const navItems = [{ href: "/admin", label: "Admin", icon: "Bus" as IconName }];
 *
 * // In a Client Component (sidebar.tsx):
 *   import { iconMap, type IconName } from "@/lib/icon-map";
 *   const Icon = iconMap[item.icon];
 *   <Icon className="h-4 w-4" />
 *
 * ADDING A NEW ICON
 * ─────────────────
 * 1. Add the import from "lucide-react" below.
 * 2. Add an entry to the `iconMap` record.
 * 3. Use the string key in navItems definitions.
 */

import type { LucideIcon } from "lucide-react";
import {
  // Brand / layout icons
  Bus,
  Shield,
  LayoutDashboard,
  Menu,
  // Admin nav icons
  Users,
  Ticket,
  ScanLine,
  Mic,
  FileBarChart2,
  Cog,
  // Agent nav icons
  MapPin,
  // SuperAdmin nav icons
  BarChart3,
  Building2,
  CreditCard,
  Settings,
  LineChart,
  FileText,
  // Common utility icons
  LogOut,
  Bell,
  User,
  Wifi,
  WifiOff,
  // KPI / stats icons (used in dashboard pages)
  Receipt,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  // Status / misc
  ChevronRight,
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  X,
  Check,
  Eye,
  EyeOff,
  Power,
  RefreshCw,
} from "lucide-react";

export type IconName =
  | "Bus"
  | "Shield"
  | "LayoutDashboard"
  | "Menu"
  | "Users"
  | "Ticket"
  | "ScanLine"
  | "Mic"
  | "FileBarChart2"
  | "Cog"
  | "MapPin"
  | "BarChart3"
  | "Building2"
  | "CreditCard"
  | "Settings"
  | "LineChart"
  | "FileText"
  | "LogOut"
  | "Bell"
  | "User"
  | "Wifi"
  | "WifiOff"
  | "Receipt"
  | "Target"
  | "TrendingUp"
  | "TrendingDown"
  | "Activity"
  | "AlertTriangle"
  | "CheckCircle2"
  | "Clock"
  | "XCircle"
  | "ShieldCheck"
  | "ChevronRight"
  | "ChevronLeft"
  | "Plus"
  | "Pencil"
  | "Trash2"
  | "Search"
  | "Filter"
  | "Download"
  | "Upload"
  | "X"
  | "Check"
  | "Eye"
  | "EyeOff"
  | "Power"
  | "RefreshCw";

export const iconMap: Record<IconName, LucideIcon> = {
  Bus,
  Shield,
  LayoutDashboard,
  Menu,
  Users,
  Ticket,
  ScanLine,
  Mic,
  FileBarChart2,
  Cog,
  MapPin,
  BarChart3,
  Building2,
  CreditCard,
  Settings,
  LineChart,
  FileText,
  LogOut,
  Bell,
  User,
  Wifi,
  WifiOff,
  Receipt,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  X,
  Check,
  Eye,
  EyeOff,
  Power,
  RefreshCw,
};

/**
 * Render an icon by name. Returns null if the name is not in the map.
 * Useful for inline rendering in Server Components that receive iconName
 * strings (e.g. mobile bottom-nav in agent layout).
 */
export function Icon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  const Cmp = iconMap[name];
  if (!Cmp) return null;
  return <Cmp className={className} />;
}
