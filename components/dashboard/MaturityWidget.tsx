"use client";

import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
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

export function MaturityWidget({ deposits }: MaturityWidgetProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-800">Upcoming Maturities</h3>
          <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
            {deposits.length}
          </span>
        </div>
        <Link href="/deposits?status=maturing" className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {deposits.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No upcoming maturities</p>
        ) : (
          deposits.slice(0, 5).map((dep) => (
            <Link
              key={dep.id}
              href={`/deposits/${dep.id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{dep.member_name}</p>
                <p className="text-xs text-slate-400">
                  {dep.deposit_id} · {dep.deposit_type.toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-amber-600">{formatINR(dep.maturity_amount)}</p>
                <p className="text-xs text-slate-400">{formatDate(dep.maturity_date)}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
