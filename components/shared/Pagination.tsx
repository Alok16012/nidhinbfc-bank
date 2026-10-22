"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 50;

/** Slice `rows` into pages. The page goes back to 1 whenever `resetKey`
 *  (search text, tab, filter) or the row count changes. */
export function usePaged<T>(rows: T[], resetKey: unknown, pageSize: number = PAGE_SIZE) {
  // The page is stored with the filter it belongs to. When the filter (or
  // row count) changes we go back to page 1 right here during render —
  // React's pattern for state derived from props, no effect needed — so
  // clearing a search also lands on page 1, not the page you left.
  const key = `${String(resetKey)}|${rows.length}`;
  const [state, setState] = useState({ key, page: 1 });
  if (state.key !== key) setState({ key, page: 1 });
  const page = state.key === key ? state.page : 1;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));

  const current = Math.min(page, pages);
  const pageRows = useMemo(
    () => rows.slice((current - 1) * pageSize, current * pageSize),
    [rows, current, pageSize],
  );

  const go = (p: number) => {
    setState({ key, page: Math.min(Math.max(1, p), pages) });
    // The list starts above the fold; bring the top of the new page into view
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return { rows: pageRows, page: current, pages, total: rows.length, pageSize, setPage: go };
}

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
  /** "mobile" matches the phone card lists; "desktop" the tables and grids. */
  variant?: "mobile" | "desktop";
}

/** Page numbers to show: first, last, and a window around the current page. */
function pageNumbers(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set<number>([1, pages, page - 1, page, page + 1]);
  const list = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  list.forEach((n, i) => {
    if (i > 0 && n - (list[i - 1] as number) > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export function Pagination({ page, pages, total, pageSize = PAGE_SIZE, onChange, variant = "desktop" }: PaginationProps) {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (variant === "mobile") {
    const btn = (disabled: boolean): React.CSSProperties => ({
      width: 40, height: 40, borderRadius: "50%", border: "none",
      background: disabled ? "var(--bg-secondary)" : "var(--blue)",
      color: disabled ? "var(--ink-mute)" : "white",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      opacity: disabled ? 0.6 : 1,
    });
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "4px 2px 8px" }}>
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className="press" style={btn(page <= 1)}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>Page {page} of {pages}</p>
          <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--ink-mute)" }}>{from}–{to} of {total}</p>
        </div>
        <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)} className="press" style={btn(page >= pages)}>
          <ChevronRight size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-white text-sm">
      <p className="text-slate-500">Showing <span className="font-medium text-slate-700">{from}–{to}</span> of <span className="font-medium text-slate-700">{total}</span></p>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="h-8 px-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        {pageNumbers(page, pages).map((n, i) =>
          n === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-slate-400">…</span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-current={n === page ? "page" : undefined}
              className={`h-8 min-w-8 px-2 rounded-lg text-sm font-medium ${n === page ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {n}
            </button>
          ),
        )}
        <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} className="h-8 px-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1">
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
