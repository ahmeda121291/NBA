"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { LiveTicker } from "./live-ticker";

export function AppShell({ children, userMenu }: { children: React.ReactNode; userMenu?: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuToggle={() => setMobileOpen((o) => !o)} userMenu={userMenu} />
        <LiveTicker />
        <main className="flex-1 overflow-y-auto page-gradient">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
