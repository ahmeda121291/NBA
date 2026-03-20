"use client";

import { Search } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-text-secondary">
          NBA Intelligence Platform
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search players, teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-64 rounded-lg border border-border bg-background pl-9 pr-4 text-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-accent"
          />
        </div>
      </div>
    </header>
  );
}
