"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlusCircle, PiggyBank, TrendingUp, RefreshCw, Star, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { DepositCard } from "@/components/deposits/DepositCard";
import { ExportButton } from "@/components/shared/ExportButton";
import { formatINR } from "@/lib/utils";

const TABS = [
  { key: "all",     label: "All",     icon: BarChart3,  color: "blue"   },
  { key: "savings", label: "Savings", icon: PiggyBank,  color: "green"  },
  { key: "fd",      label: "FD",      icon: Star,       color: "yellow" },
  { key: "rd",      label: "RD",      icon: RefreshCw,  color: "purple" },
  { key: "drd",     label: "DRD",     icon: TrendingUp, color: "orange" },
  { key: "mis",     label: "MIS",     icon: BarChart3,  color: "pink"   },
] as const;

const TAB_COLORS: Record<string, { active: string; badge: string; card: string; icon: string }> = {
  blue:   { active: "bg-blue-600 text-white border-blue-600",   badge: "bg-blue-100 text-blue-700",   card: "border-blue-200 bg-blue-50",   icon: "text-blue-500"   },
  green:  { active: "bg-green-600 text-white border-green-600", badge: "bg-green-100 text-green-700", card: "border-green-200 bg-green-50", icon: "text-green-500"  },
  yellow: { active: "bg-yellow-500 text-white border-yellow-500", badge: "bg-yellow-100 text-yellow-700", card: "border-yellow-200 bg-yellow-50", icon: "text-yellow-500" },
  purple: { active: "bg-purple-600 text-white border-purple-600", badge: "bg-purple-100 text-purple-700", card: "border-purple-200 bg-purple-50", icon: "text-purple-500" },
  orange: { active: "bg-orange-500 text-white border-orange-500", badge: "bg-orange-100 text-orange-700", card: "border-orange-200 bg-orange-50", icon: "text-orange-500" },
  pink:   { active: "bg-pink-600 text-white border-pink-600",   badge: "bg-pink-100 text-pink-700",   card: "border-pink-200 bg-pink-50",   icon: "text-pink-500"   },
};

export default function DepositsPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams.get("type") ?? "all");

  // Sync filter when URL query param changes (e.g. sidebar link click)
  useEffect(() => {
    setFilter(searchParams.get("type") ?? "all");
  }, [searchParams]);

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

  const countOf = (type: string) =>
    type === "all" ? deposits.length : deposits.filter((d) => d.deposit_type === type).length;

  const totalOf = (type: string) =>
    (type === "all" ? deposits : deposits.filter((d) => d.deposit_type === type))
      .reduce((s, d) => s + (d.amount || 0), 0);

  const filtered = filter === "all" ? deposits : deposits.filter((d) => d.deposit_type === filter);
  const activeTab = TABS.find((t) => t.key === filter) ?? TABS[0];
  const colors = TAB_COLORS[activeTab.color];

  return (
    <div className="space-y-5">
      <PageHeader title="Deposits" description={`${deposits.length} deposit accounts`}>
        <ExportButton onExportCSV={() => {}} />
        <Link href="/deposits/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">
          <PlusCircle className="h-4 w-4" />
          New Deposit
        </Link>
      </PageHeader>

      {/* Type summary cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {TABS.map((tab) => {
          const c = TAB_COLORS[tab.color];
          const Icon = tab.icon;
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`rounded-xl border-2 p-3 text-left transition-all shadow-sm hover:shadow-md ${
                isActive ? c.active : `bg-white border-slate-200 hover:border-slate-300`
              }`}
            >
              <div className={`flex items-center justify-between mb-1`}>
                <Icon className={`h-4 w-4 ${isActive ? "text-white opacity-90" : c.icon}`} />
                <span className={`text-xs font-bold rounded-full px-1.5 py-0.5 ${isActive ? "bg-white/20 text-white" : c.badge}`}>
                  {countOf(tab.key)}
                </span>
              </div>
              <p className={`text-sm font-bold ${isActive ? "text-white" : "text-slate-800"}`}>{tab.label}</p>
              <p className={`text-xs mt-0.5 truncate ${isActive ? "text-white/80" : "text-slate-400"}`}>
                {tab.key === "all" ? "All types" : `₹${(totalOf(tab.key) / 100000).toFixed(1)}L`}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active filter info bar */}
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${colors.card}`}>
        <activeTab.icon className={`h-4 w-4 ${colors.icon}`} />
        <span className="text-sm font-medium text-slate-700">
          {activeTab.label === "All" ? "All Deposits" : `${activeTab.label} Deposits`}
        </span>
        <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
          {countOf(filter)} accounts · {formatINR(totalOf(filter))}
        </span>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading deposits...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <PiggyBank className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No {activeTab.label} deposits found</p>
          <p className="text-slate-400 text-sm mt-1">Try a different category or add a new deposit</p>
        </div>
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
