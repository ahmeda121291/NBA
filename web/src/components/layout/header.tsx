"use client";

import { Bell, Menu } from "lucide-react";
import { CURRENT_SEASON } from "@/lib/constants";

interface HeaderProps {
  onMenuToggle?: () => void;
  userMenu?: React.ReactNode;
}

export function Header({ onMenuToggle, userMenu }: HeaderProps) {
  return (
    <header className="flex flex-col">
      <div className="flex h-14 items-center justify-between glass px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-1.5 text-text-muted hover:text-indigo-400 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <h2 className="hidden sm:block text-[13px] font-medium text-text-muted tracking-wide">
            NBA Intelligence Platform
          </h2>
          <div className="flex items-center gap-2 px-3 py-1 border border-indigo-500/15 bg-indigo-500/5 rounded-md">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
            <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-400/80">
              {CURRENT_SEASON}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            title="Notifications coming soon"
            className="relative border border-white/[0.08] bg-white/[0.02] p-2 text-text-muted transition-all duration-200 hover:text-indigo-400 hover:border-indigo-500/20 rounded-lg"
          >
            <Bell className="h-4 w-4" />
          </button>

          {userMenu}
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent" />
    </header>
  );
}
