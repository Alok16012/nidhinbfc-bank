"use client";

import { useState } from "react";
import { Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/utils";

export interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(value?.from ?? "");
  const [to, setTo] = useState(value?.to ?? "");

  const handleApply = () => {
    if (from && to) {
      onChange({ from, to });
      setOpen(false);
    }
  };

  const handleClear = () => {
    setFrom("");
    setTo("");
    onChange(undefined);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
      >
        <Calendar className="h-4 w-4" />
        {value ? (
          <span>
            {formatDateShort(value.from)} – {formatDateShort(value.to)}
          </span>
        ) : (
          <span className="text-slate-400">Select date range</span>
        )}
        {value && (
          <X
            className="h-3 w-3 text-slate-400 hover:text-slate-700"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
          />
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-1 rounded-md border border-slate-200 bg-white p-4 shadow-lg w-72">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">From</label>
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">To</label>
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleClear}
                  className="flex-1 rounded-md border border-slate-200 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Clear
                </button>
                <button
                  onClick={handleApply}
                  disabled={!from || !to}
                  className="flex-1 rounded-md bg-blue-600 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
