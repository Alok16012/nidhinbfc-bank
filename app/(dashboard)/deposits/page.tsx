"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { DepositCard } from "@/components/deposits/DepositCard";
import { ExportButton } from "@/components/shared/ExportButton";

const TYPES = ["all", "savings", "fd", "rd", "drd", "mis"];

export default function DepositsPage() {
  const supabase = createClient();
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    supabase
      .from("deposits")
      .select("*, member:members(name, member_id)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setDeposits(data || []);
        setLoading(false);
      });
  }, [supabase]);

  const filtered = filter === "all" ? deposits : deposits.filter((d) => d.deposit_type === filter);

  const totalDeposits = deposits.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Deposits" description={`${deposits.length} deposit accounts`}>
        <ExportButton onExportCSV={() => {}} />
        <Link href="/deposits/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">
          <PlusCircle className="h-4 w-4" />
          New Deposit
        </Link>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Deposits", value: deposits.length, sub: "All accounts" },
          { label: "Fixed Deposits", value: deposits.filter((d) => d.deposit_type === "fd").length, sub: "FD accounts" },
          { label: "RD Accounts", value: deposits.filter((d) => d.deposit_type === "rd").length, sub: "Recurring" },
          { label: "Total Value", value: `₹${(totalDeposits / 100000).toFixed(1)}L`, sub: "Principal" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{s.value}</p>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{s.label}</p>
            <p className="text-xs text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Type filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase whitespace-nowrap transition-colors ${
              filter === t ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading deposits...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No deposits found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((dep) => (
            <DepositCard key={dep.id} deposit={dep} />
          ))}
        </div>
      )}
    </div>
  );
}
