"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  User,
  Trophy,
  GitCompare,
  BookOpen,
  Activity,
  Zap,
  CreditCard,
  Crown,
  Palette,
  MessageCircle,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CURRENT_SEASON } from "@/lib/constants";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, shortcut: "1" },
  { href: "/games", label: "Games", icon: Calendar, shortcut: "2" },
  { href: "/teams", label: "Teams", icon: Users, shortcut: "3" },
  { href: "/players", label: "Players", icon: User, shortcut: "4" },
  { href: "/leaderboards", label: "Leaderboards", icon: Trophy, shortcut: "5" },
  { href: "/compare", label: "Compare", icon: GitCompare, shortcut: "6" },
  { href: "/pulse", label: "Daily Brief", icon: Zap, shortcut: "7" },
  { href: "/studio", label: "Studio", icon: Palette, shortcut: "8" },
  { href: "/ask", label: "Search", icon: Search, shortcut: "9" },
  { href: "/methodology", label: "Methodology", icon: BookOpen, shortcut: "0" },
  { href: "/pricing", label: "Pricing", icon: Crown, shortcut: "" },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <Activity className="h-4.5 w-4.5 text-indigo-400" />
          </div>
          <div>
            <span className="text-[15px] font-bold tracking-tight text-text-primary">
              CourtVision
            </span>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
              <p className="text-[9px] font-medium tracking-[0.15em] uppercase text-text-muted/60">
                Active
              </p>
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-text-muted hover:text-indigo-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 pt-4">
        <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted/40">
          Navigation
        </p>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium transition-all duration-200 rounded-lg",
                isActive
                  ? "text-indigo-400 bg-indigo-500/8"
                  : "text-text-muted hover:text-text-primary hover:bg-white/[0.03]"
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-indigo-400 rounded-full" />
              )}

              <item.icon className={cn(
                "h-4 w-4 transition-colors",
                isActive ? "text-indigo-400" : "text-text-muted group-hover:text-text-secondary"
              )} />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.06] px-5 py-4 space-y-2">
        <div className="flex items-center gap-2" title="Data refreshes daily via the CourtVision pipeline">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
          <p className="text-[11px] text-emerald-400/70 font-mono tracking-wide uppercase">
            Data: Live
          </p>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-text-muted/40">
          <span>{CURRENT_SEASON} Season</span>
          <span>v2.1</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden lg:flex w-64 flex-col glass border-r border-white/[0.06]">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col glass border-r border-white/[0.06] lg:hidden animate-slide-in-left">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
