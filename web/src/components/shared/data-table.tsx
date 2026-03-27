"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ChevronUp, ChevronDown, Columns, LayoutGrid, Download, Search, X } from "lucide-react";
import { MetricTooltip } from "./metric-tooltip";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  isMetric?: boolean;
  metricKey?: string;
  defaultVisible?: boolean;
  width?: string; // CSS grid width: "200px", "1fr", "minmax(60px, 80px)"
  render: (row: T, index: number) => React.ReactNode;
  sortValue?: (row: T) => number | string | null;
}

interface FilterOption {
  key: string;
  label: string;
  options: string[];
  getValue: (row: any) => string;
}

export interface ViewPreset {
  key: string;
  label: string;
  columns: string[];
}

/** Searchable dropdown filter for large option sets (e.g., 30 teams) */
function DropdownFilter({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-sm border transition-all ${
          value !== "All"
            ? "bg-[rgba(129,140,248,0.12)] text-indigo-400 border-[rgba(129,140,248,0.25)]"
            : "text-text-muted/70 border-white/[0.08] hover:border-white/[0.15] hover:text-text-muted"
        }`}
      >
        {value === "All" ? label : value}
        {value !== "All" && (
          <X
            className="h-3 w-3 ml-0.5 hover:text-white"
            onClick={(e) => { e.stopPropagation(); onChange("All"); }}
          />
        )}
        <ChevronDown className="h-3 w-3 ml-0.5" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 rounded-md overflow-hidden"
          style={{
            background: "linear-gradient(145deg, rgba(10, 18, 35, 0.99) 0%, rgba(4, 8, 18, 0.97) 100%)",
            border: "1px solid rgba(129, 140, 248, 0.15)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
            minWidth: "180px",
            maxHeight: "280px",
          }}
        >
          <div className="p-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.04]">
              <Search className="h-3 w-3 text-text-muted/50" />
              <input
                type="text"
                placeholder={`Search ${label.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-[11px] text-text-primary outline-none placeholder:text-text-muted/40 w-full"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[220px]">
            <button
              onClick={() => { onChange("All"); setOpen(false); setSearch(""); }}
              className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                value === "All" ? "text-indigo-400 bg-indigo-500/10" : "text-text-muted/70 hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              All {label}s
            </button>
            {filtered.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); setSearch(""); }}
                className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                  value === opt ? "text-indigo-400 bg-indigo-500/10" : "text-text-muted/70 hover:text-text-primary hover:bg-white/[0.04]"
                }`}
              >
                {opt}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[10px] text-text-muted/40">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  filters?: FilterOption[];
  defaultSort?: { key: string; direction: "asc" | "desc" };
  stickyFirstCol?: boolean;
  presets?: ViewPreset[];
  csvFilename?: string;
}

export function DataTable<T>({
  data,
  columns,
  filters = [],
  defaultSort,
  presets = [],
  csvFilename = "export",
}: DataTableProps<T>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [sortKey, setSortKey] = useState(() => searchParams.get("sort") || defaultSort?.key || "");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() => (searchParams.get("dir") as "asc" | "desc") || defaultSort?.direction || "desc");
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => {
    const urlPreset = searchParams.get("view");
    if (urlPreset) {
      const preset = presets.find((p) => p.key === urlPreset);
      if (preset) return new Set(preset.columns);
    }
    return new Set(columns.filter((c) => c.defaultVisible !== false).map((c) => c.key));
  });
  const [showColPicker, setShowColPicker] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of filters) {
      const v = searchParams.get(f.key);
      if (v && v !== "All") initial[f.key] = v;
    }
    return initial;
  });
  const [activePreset, setActivePreset] = useState<string | null>(() => searchParams.get("view"));

  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v == null || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const handleSort = (key: string) => {
    const newDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "desc";
    setSortKey(key);
    setSortDir(newDir);
    updateUrl({ sort: key, dir: newDir });
  };

  const toggleCol = (key: string) => {
    setActivePreset(null);
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    updateUrl({ view: null });
  };

  const applyPreset = (preset: ViewPreset) => {
    setActivePreset(preset.key);
    setVisibleCols(new Set(preset.columns));
    updateUrl({ view: preset.key });
  };

  const setFilter = (filterKey: string, value: string) => {
    setActiveFilters((prev) => {
      if (!value || value === "All") {
        const next = { ...prev };
        delete next[filterKey];
        updateUrl({ [filterKey]: null });
        return next;
      }
      updateUrl({ [filterKey]: value });
      return { ...prev, [filterKey]: value };
    });
  };

  const exportCSV = () => {
    const visCols = columns.filter((c) => visibleCols.has(c.key));
    const header = visCols.map((c) => c.label).join(",");
    const rows = sortedData.map((row) =>
      visCols.map((c) => {
        const raw = c.sortValue ? c.sortValue(row) : "";
        const val = raw == null || raw === "—" || (typeof raw === "number" && isNaN(raw)) ? "" : raw;
        return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${csvFilename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredData = useMemo(() => {
    let result = [...data];
    for (const filter of filters) {
      const active = activeFilters[filter.key];
      if (active) {
        result = result.filter((row) => filter.getValue(row) === active);
      }
    }
    return result;
  }, [data, activeFilters, filters]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filteredData;

    return [...filteredData].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      const aNull = va == null || (typeof va === "number" && isNaN(va));
      const bNull = vb == null || (typeof vb === "number" && isNaN(vb));
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      const aNum = typeof va === "number" ? va : parseFloat(String(va));
      const bNum = typeof vb === "number" ? vb : parseFloat(String(vb));
      const cmp = (!isNaN(aNum) && !isNaN(bNum))
        ? aNum - bNum
        : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir, columns]);

  const visCols = columns.filter((c) => visibleCols.has(c.key));

  // Build CSS grid template from column widths
  const gridTemplate = visCols.map((col) => col.width || "1fr").join(" ");

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {filters.map((f) => {
            const isDropdown = f.options.length > 8;
            const activeVal = activeFilters[f.key] ?? "All";

            if (isDropdown) {
              // Searchable dropdown for many options (e.g., 30 teams)
              return (
                <DropdownFilter
                  key={f.key}
                  label={f.label}
                  options={f.options}
                  value={activeVal}
                  onChange={(val) => setFilter(f.key, val)}
                />
              );
            }

            // Chip buttons for few options (e.g., 5 positions)
            return (
              <div key={f.key} className="flex items-center gap-1">
                {["All", ...f.options].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setFilter(f.key, opt)}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all rounded-sm ${
                      activeVal === opt
                        ? "bg-[rgba(129,140,248,0.12)] text-indigo-400 border border-[rgba(129,140,248,0.25)]"
                        : "text-text-muted/60 border border-transparent hover:text-text-muted hover:border-white/[0.06]"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            );
          })}

          {presets.length > 0 && (
            <>
              {filters.length > 0 && <div className="w-px h-5 bg-white/[0.06]" />}
              <div className="flex items-center gap-1">
                <LayoutGrid className="h-3 w-3 text-text-muted/40 mr-0.5" />
                {presets.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => applyPreset(preset)}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all rounded-sm ${
                      activePreset === preset.key
                        ? "bg-[rgba(129,140,248,0.12)] text-indigo-400 border border-[rgba(129,140,248,0.25)]"
                        : "text-text-muted/60 border border-transparent hover:text-text-muted hover:border-white/[0.06]"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted/60 hover:text-indigo-400 border border-white/[0.06] hover:border-[rgba(129,140,248,0.2)] transition-all rounded-sm"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
          <div className="relative">
            <button
              onClick={() => setShowColPicker(!showColPicker)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted/60 hover:text-indigo-400 border border-white/[0.06] hover:border-[rgba(129,140,248,0.2)] transition-all rounded-sm"
            >
              <Columns className="h-3 w-3" />
              Columns
            </button>
            {showColPicker && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowColPicker(false)} />
                <div
                  className="absolute right-0 top-full mt-1 z-40 p-2 min-w-[200px] max-h-[300px] overflow-y-auto rounded-md"
                  style={{
                    background: "linear-gradient(145deg, rgba(10, 18, 35, 0.98) 0%, rgba(4, 8, 18, 0.96) 100%)",
                    border: "1px solid rgba(129, 140, 248, 0.15)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                  }}
                >
                  {columns.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-text-muted hover:text-text-primary cursor-pointer transition-colors rounded"
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols.has(col.key)}
                        onChange={() => toggleCol(col.key)}
                        className="accent-indigo-400"
                      />
                      {col.isMetric ? (
                        <span className="text-indigo-400/70">{col.label}</span>
                      ) : (
                        col.label
                      )}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grid-based Table */}
      <div className="glass-card rounded-lg overflow-hidden">
        <div className="relative">
          {/* Mobile scroll hint — right edge gradient */}
          <div className="absolute right-0 top-0 bottom-0 w-6 pointer-events-none z-20 bg-gradient-to-l from-[rgba(14,18,30,0.85)] to-transparent sm:hidden" />
        <div className="overflow-x-auto max-h-[80vh] overflow-y-auto">
          {/* Header row */}
          <div
            className="grid border-b border-white/[0.06] sticky top-0 z-10"
            style={{
              gridTemplateColumns: gridTemplate,
              background: "linear-gradient(145deg, rgba(14, 18, 30, 0.98) 0%, rgba(8, 11, 22, 0.95) 100%)",
              backdropFilter: "blur(16px)",
            }}
          >
            {visCols.map((col) => {
              const alignCls = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
              return (
                <div
                  key={col.key}
                  className={`px-3 py-2.5 text-[10px] uppercase tracking-wider font-semibold text-text-muted/50 whitespace-nowrap ${alignCls} ${
                    col.sortable ? "cursor-pointer select-none hover:text-indigo-400 transition-colors" : ""
                  }`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  {col.isMetric && col.metricKey ? (
                    <MetricTooltip metricKey={col.metricKey}>
                      <span className="text-indigo-400/70">{col.label}</span>
                    </MetricTooltip>
                  ) : (
                    col.label
                  )}
                  {col.sortable && sortKey === col.key && (
                    sortDir === "desc"
                      ? <ChevronDown className="h-3 w-3 text-indigo-400 inline ml-0.5" />
                      : <ChevronUp className="h-3 w-3 text-indigo-400 inline ml-0.5" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Data rows */}
          {sortedData.map((row, i) => (
            <div
              key={i}
              className="grid border-b border-white/[0.03] table-row-hover items-center"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {visCols.map((col) => {
                const alignCls = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
                return (
                  <div
                    key={col.key}
                    className={`px-3 py-2 text-sm whitespace-nowrap overflow-hidden text-ellipsis ${alignCls}`}
                  >
                    {col.render(row, i)}
                  </div>
                );
              })}
            </div>
          ))}

          {sortedData.length === 0 && (
            <div className="px-3 py-8 text-center text-text-muted/60">
              No data matches your filters.
            </div>
          )}
        </div>
        </div>
      </div>
      <p className="text-[10px] text-text-muted/30 mt-2 font-stat text-right">
        {sortedData.length} of {data.length} results
      </p>
    </div>
  );
}
