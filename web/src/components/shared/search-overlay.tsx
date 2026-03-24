"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, User, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchResult {
  type: "player" | "team";
  id: number;
  label: string;
  sublabel: string;
  score?: number | null;
  href: string;
}

export function SearchOverlay() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setResults([]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setResults(json.data ?? []);
      setSelectedIdx(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => doSearch(val), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      e.preventDefault();
      navigate(results[selectedIdx]);
    }
  };

  const navigate = (result: SearchResult) => {
    router.push(result.href);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 w-64 bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 text-[13px] text-text-muted/50 hover:border-indigo-500/20 transition-all"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search players, teams...</span>
        <kbd className="ml-auto border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-mono text-text-muted/50 rounded">
          /
        </kbd>
      </button>
    );
  }

  const players = results.filter((r) => r.type === "player");
  const teams = results.filter((r) => r.type === "team");

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={() => { setOpen(false); setQuery(""); setResults([]); }}
      />

      <div
        className="fixed top-[10%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(14, 18, 30, 0.98) 0%, rgba(6, 8, 13, 0.96) 100%)",
          border: "1px solid rgba(129, 140, 248, 0.15)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(99,102,241,0.06)",
        }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
          <Search className="h-4 w-4 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search players, teams..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted/40 focus:outline-none"
            autoComplete="off"
          />
          <button
            onClick={() => { setOpen(false); setQuery(""); setResults([]); }}
            className="text-text-muted/50 hover:text-text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && query.length >= 2 && (
            <div className="px-5 py-4 text-[11px] text-text-muted/50">Searching...</div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="px-5 py-6 text-center text-[11px] text-text-muted/50">
              No results for &quot;{query}&quot;
            </div>
          )}

          {players.length > 0 && (
            <div>
              <div className="px-5 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-text-muted/40">
                Players
              </div>
              {players.map((r) => {
                const idx = results.indexOf(r);
                return (
                  <button
                    key={`p-${r.id}`}
                    onClick={() => navigate(r)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-all ${
                      idx === selectedIdx
                        ? "bg-indigo-500/8 text-indigo-300"
                        : "text-text-primary hover:bg-white/[0.03]"
                    }`}
                  >
                    <User className="h-3.5 w-3.5 shrink-0 text-text-muted/50" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold truncate block">{r.label}</span>
                      <span className="text-[10px] text-text-muted/60">{r.sublabel}</span>
                    </div>
                    {r.score != null && (
                      <span className="text-[11px] font-stat font-bold text-indigo-400/70">{r.score}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {teams.length > 0 && (
            <div>
              <div className="px-5 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-text-muted/40">
                Teams
              </div>
              {teams.map((r) => {
                const idx = results.indexOf(r);
                return (
                  <button
                    key={`t-${r.id}`}
                    onClick={() => navigate(r)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-all ${
                      idx === selectedIdx
                        ? "bg-indigo-500/8 text-indigo-300"
                        : "text-text-primary hover:bg-white/[0.03]"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5 shrink-0 text-text-muted/50" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold truncate block">{r.label}</span>
                      <span className="text-[10px] text-text-muted/60">{r.sublabel}</span>
                    </div>
                    {r.score != null && (
                      <span className="text-[11px] font-stat font-bold text-indigo-400/70">{r.score}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-5 py-2.5 border-t border-white/[0.04] text-[9px] text-text-muted/30 font-mono">
          <span><kbd className="text-text-muted/50">↑↓</kbd> navigate</span>
          <span><kbd className="text-text-muted/50">↵</kbd> select</span>
          <span><kbd className="text-text-muted/50">esc</kbd> close</span>
        </div>
      </div>
    </>
  );
}
