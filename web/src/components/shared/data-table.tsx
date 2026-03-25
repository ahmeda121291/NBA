"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ChevronUp, ChevronDown, Columns, LayoutGrid, Download } from "lucide-react";
import { MetricTooltip } from "./metric-tooltip";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  isMetric?: boolean;
  metricKey?: string;
  defaultVisible?: boolean;
  width?: string;
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
  columns: string[]; // column keys to show
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  filters?: FilterOption[];
  defaultSort?: { key: string; direction: "asc" | "desc" };
  stickyFirstCol?: boolean;
  presets?: ViewPreset[];
  /** Column keys used for CSV export label row */
  csvFilename?: string;
}

export function DataTable<T>({
  data,
  columns,
  filters = [],
  defaultSort,
  stickyFirstCol = false,
  presets = [],
  csvFilename = "export",
}: DataTableProps<T>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial state from URL
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

  // Sync state to URL (shallow, no navigation)
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
        const val = c.sortValue ? c.sortValue(row) : "";
        return typeof val === "string" && val.includes(",") ? `"${val}"` : val ?? "";
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
      // Nulls/NaN always go to bottom regardless of sort direction
      const aNull = va == null || (typeof va === "number" && isNaN(va));
      const bNull = vb == null || (typeof vb === "number" && isNaN(vb));
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      // Force numeric comparison if both values look numeric
      const aNum = typeof va === "number" ? va : parseFloat(String(va));
      const bNum = typeof vb === "number" ? vb : parseFloat(String(vb));
      const cmp = (!isNaN(aNum) && !isNaN(bNum))
        ? aNum - bNum
        : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir, columns]);

  const visibleColumns = columns.filter((c) => visibleCols.has(c.key));

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        {/* Left: Filters + Presets */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filters */}
          {filters.map((f) => (
            <div key={f.key} className="flex items-center gap-1">
              {["All", ...f.options].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilter(f.key, opt)}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all rounded-sm ${
                    (activeFilters[f.key] ?? "All") === opt
                      ? "bg-[rgba(129,140,248,0.12)] text-indigo-400 border border-[rgba(129,140,248,0.25)]"
                      : "text-text-muted/60 border border-transparent hover:text-text-muted hover:border-white/[0.06]"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ))}

          {/* View Presets */}
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

        {/* Column picker + CSV */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted/60 hover:text-indigo-400 border border-white/[0.06] hover:border-[rgba(129,140,248,0.2)] transition-all rounded-sm"
            title="Export visible data as CSV"
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
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(129,140,248,0.06)",
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

      {/* Table */}
      <div className="glass-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-sm" style={{ borderCollapse: "collapse", tableLayout: "fixed", width: "100%", minWidth: `${visibleColumns.reduce((sum, col) => sum + (col.width ? parseInt(col.width) : 80), 0)}px` }}>
            <colgroup>
              {visibleColumns.map((col) => (
                <col key={col.key} style={{ width: col.width || "80px" }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-white/[0.06]">
                {visibleColumns.map((col) => {
                  const justifyClass = col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : "justify-start";
                  return (
                    <th
                      key={col.key}
                      style={col.width ? { width: col.width, minWidth: col.key === "name" ? "120px" : col.width } : undefined}
                      className={`px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-text-muted/70 transition-colors ${
                        col.sortable ? "cursor-pointer select-none hover:text-indigo-400" : ""
                      }`}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div className={`flex items-center gap-1 whitespace-nowrap ${justifyClass}`}>
                        {col.isMetric && col.metricKey ? (
                          <MetricTooltip metricKey={col.metricKey}>
                            <span className="text-indigo-400/80">{col.label}</span>
                          </MetricTooltip>
                        ) : (
                          <span>{col.label}</span>
                        )}
                        {col.sortable && sortKey === col.key && (
                          sortDir === "desc"
                            ? <ChevronDown className="h-3 w-3 text-indigo-400 shrink-0" />
                            : <ChevronUp className="h-3 w-3 text-indigo-400 shrink-0" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, i) => (
                <tr key={i} className="border-b border-white/[0.03] table-row-hover">
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      style={col.width ? { width: col.width, minWidth: col.key === "name" ? "120px" : col.width } : undefined}
                      className={`px-3 py-2.5 ${
                        col.align === "right" ? "text-right" :
                        col.align === "center" ? "text-center" : "text-left"
                      }`}
                    >
                      <div className={col.key === "name" ? "truncate" : "whitespace-nowrap"}>
                        {col.render(row, i)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-3 py-8 text-center text-text-muted">
                    No data matches your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[10px] text-text-muted/40 mt-2 font-stat text-right">
        {sortedData.length} of {data.length} results
      </p>
    </div>
  );
}
