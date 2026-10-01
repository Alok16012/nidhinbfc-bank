"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Check, ChevronDown, Layers, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { switchBranch } from "@/lib/branch";
import { useBranch } from "@/lib/hooks/useBranch";
import { useRole } from "@/lib/hooks/useRole";

/** Admin: pick which branch the whole app shows. Staff: shows their branch. */
export function BranchSwitcher() {
  const { isAdmin } = useRole();
  const { branches, current, loading } = useBranch();
  const [open, setOpen] = useState(false);

  if (loading) return null;

  if (!isAdmin) {
    if (!current) return null;
    return (
      <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700">
        <Building2 className="h-4 w-4 text-blue-600" />
        <span className="font-medium">{current.name}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
          current
            ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
            : "border-slate-200 text-slate-700 hover:bg-slate-50"
        )}
      >
        {current ? <Building2 className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
        <span className="max-w-[10rem] truncate">{current ? current.name : "All branches"}</span>
        <ChevronDown className="h-4 w-4 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-64 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">View branch</p>
            <button
              onClick={() => switchBranch(null)}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <Layers className="h-4 w-4 text-slate-500" />
              <span className="flex-1">All branches</span>
              {!current && <Check className="h-4 w-4 text-blue-600" />}
            </button>
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => switchBranch(b.id)}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <Building2 className="h-4 w-4 text-slate-500" />
                <span className="flex-1 truncate">
                  {b.name}
                  <span className="ml-1.5 text-xs text-slate-400">{b.code}</span>
                </span>
                {current?.id === b.id && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            ))}
            <hr className="my-1 border-slate-100" />
            <Link
              href="/branches"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
            >
              <Settings2 className="h-4 w-4" />
              Manage branches
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
