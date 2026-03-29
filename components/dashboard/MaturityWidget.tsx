"use client";

import Link from "next/link";
import { Clock, AlertCircle, ArrowRight } from "lucide-react";
import { formatINR, formatDate } from "@/lib/utils";

interface MaturityDeposit {
  id: string;
  deposit_id: string;
  member_name: string;
  maturity_amount: number;
  maturity_date: string;
  deposit_type: string;
}

interface MaturityWidgetProps {
  deposits: MaturityDeposit[];
}

function daysLeft(maturityDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mat = new Date(maturityDate);
  mat.setHours(0, 0, 0, 0);
  return Math.ceil((mat.getTime() - today.getTime()) / 86400000);
}

export function MaturityWidget({ deposits }: MaturityWidgetProps) {
  const urgent = deposits.filter((d) => daysLeft(d.maturity_date) <= 7);
  const rest   = deposits.filter((d) => daysLeft(d.maturity_date) > 7);
  const sorted = [...urgent, ...rest];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-800">Upcoming Maturities</h3>
          <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
            {deposits.length}
          </span>
          {urgent.length > 0 && (
            <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <AlertCircle className="h-3 w-3" />
              {urgent.length} in 7 days
            </span>
          )}
        </div>
        <Link href="/deposits?status=maturing" className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No upcoming maturities</p>
        ) : (
          sorted.slice(0, 6).map((dep) => {
            const days = daysLeft(dep.maturity_date);
            const isUrgent = days <= 7;
            const isToday  = days === 0;
            const isPast   = days < 0;

            let dayBadge: string;
            let badgeClass: string;
            if (isPast)        { dayBadge = "Matured"; badgeClass = "bg-slate-100 text-slate-500"; }
            else if (isToday)  { dayBadge = "Today!";  badgeClass = "bg-red-100 text-red-600"; }
            else if (isUrgent) { dayBadge = `${days}d left`; badgeClass = "bg-red-50 text-red-600"; }
            else               { dayBadge = `${days}d left`; badgeClass = "bg-amber-50 text-amber-600"; }

            return (
              <Link
                key={dep.id}
                href={`/deposits/${dep.id}`}
                className={`flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors ${isUrgent ? "bg-red-50/30" : ""}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">{dep.member_name}</p>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${badgeClass}`}>
                      {dayBadge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {dep.deposit_id} · {dep.deposit_type.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-amber-600">{formatINR(dep.maturity_amount)}</p>
                  <p className="text-xs text-slate-400">{formatDate(dep.maturity_date)}</p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
