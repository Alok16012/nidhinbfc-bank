"use client";

import { useState } from "react";
import { Download, ChevronDown } from "lucide-react";

interface ExportButtonProps {
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  label?: string;
}

export function ExportButton({
  onExportCSV,
  onExportPDF,
  onExportExcel,
  label = "Export",
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <Download className="h-4 w-4" />
        {label}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-44 rounded-md border border-slate-200 bg-white shadow-lg py-1">
            {onExportCSV && (
              <button
                onClick={() => { onExportCSV(); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Export as CSV
              </button>
            )}
            {onExportExcel && (
              <button
                onClick={() => { onExportExcel(); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Export as Excel
              </button>
            )}
            {onExportPDF && (
              <button
                onClick={() => { onExportPDF(); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Export as PDF
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
