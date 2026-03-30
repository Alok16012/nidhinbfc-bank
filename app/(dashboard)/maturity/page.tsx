"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatINR, formatDate } from "@/lib/utils";
import { Bell, AlertTriangle, CheckCircle, Clock, Search } from "lucide-react";

export default function MaturityPage() {
  const supabase = createClient();
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"upcoming" | "overdue" | "all">("upcoming");

  useEffect(() => {
    fetchMaturingDeposits();
  }, []);

  const fetchMaturingDeposits = async () => {
    setLoading(true);
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);

    const { data } = await supabase
      .from("deposits")
      .select("*, member:members(name, phone, member_id)")
      .eq("status", "active")
      .not("maturity_date", "is", null)
      .lte("maturity_date", in30Days.toISOString().split("T")[0])
      .order("maturity_date", { ascending: true });

    setDeposits(data || []);
    setLoading(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysLeft = (maturityDate: string) => {
    const mat = new Date(maturityDate);
    mat.setHours(0, 0, 0, 0);
    return Math.ceil((mat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const filtered = deposits.filter((d) => {
    const days = getDaysLeft(d.maturity_date);
    const matchSearch =
      !search ||
      d.member?.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.member?.member_id?.toLowerCase().includes(search.toLowerCase()) ||
      d.deposit_no?.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;
    if (tab === "overdue") return days < 0;
    if (tab === "upcoming") return days >= 0 && days <= 7;
    return true; // all = within 30 days
  });

  const overdueCnt  = deposits.filter((d) => getDaysLeft(d.maturity_date) < 0).length;
  const in7DaysCnt  = deposits.filter((d) => { const d2 = getDaysLeft(d.maturity_date); return d2 >= 0 && d2 <= 7; }).length;
  const in30DaysCnt = deposits.length;

  const getBadge = (days: number) => {
    if (days < 0)
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Overdue {Math.abs(days)}d</span>;
    if (days === 0)
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Matures Today</span>;
    if (days <= 3)
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">{days} days left</span>;
    if (days <= 7)
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">{days} days left</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{days} days left</span>;
  };

  const TYPE_LABELS: Record<string, string> = {
    savings: "Savings", fd: "FD", rd: "RD", drd: "DRD", mis: "MIS",
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-500" /> Maturity Alerts
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Deposits maturing within 30 days</p>
        </div>
        <button
          onClick={fetchMaturingDeposits}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{overdueCnt}</div>
          <div className="text-xs text-red-500 font-medium mt-0.5">Overdue</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{in7DaysCnt}</div>
          <div className="text-xs text-yellow-500 font-medium mt-0.5">Within 7 Days</div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{in30DaysCnt}</div>
          <div className="text-xs text-blue-500 font-medium mt-0.5">Within 30 Days</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 text-sm">
        {([
          { key: "upcoming", label: `Urgent (≤7 days)`, count: in7DaysCnt },
          { key: "overdue",  label: `Overdue`,           count: overdueCnt  },
          { key: "all",      label: `All (≤30 days)`,    count: in30DaysCnt },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              tab === t.key
                ? "bg-blue-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search member name, ID or deposit no..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-400 bg-white"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
          <p className="text-slate-500 font-medium">No deposits in this category</p>
          <p className="text-slate-400 text-sm mt-1">All clear! 🎉</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((dep) => {
            const days = getDaysLeft(dep.maturity_date);
            const isUrgent = days <= 3;
            return (
              <div
                key={dep.id}
                className={`bg-white rounded-xl border p-4 shadow-sm ${
                  days < 0 ? "border-red-200 bg-red-50/30" :
                  days <= 3 ? "border-orange-200 bg-orange-50/30" :
                  days <= 7 ? "border-yellow-200 bg-yellow-50/20" :
                  "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">{dep.member?.name}</span>
                      <span className="text-xs text-slate-400">{dep.member?.member_id}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {TYPE_LABELS[dep.deposit_type] || dep.deposit_type?.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Deposit No: <span className="font-medium text-slate-700">{dep.deposit_no}</span>
                      {dep.member?.phone && <span className="ml-3">📞 {dep.member.phone}</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-slate-500 text-xs">Maturity Amount</span>
                        <div className="font-bold text-emerald-700">{formatINR(dep.maturity_amount || dep.amount)}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs">Principal</span>
                        <div className="font-semibold text-slate-700">{formatINR(dep.amount)}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs">Maturity Date</span>
                        <div className="font-semibold text-slate-700">{formatDate(dep.maturity_date)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {getBadge(days)}
                    {isUrgent && days >= 0 && (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
