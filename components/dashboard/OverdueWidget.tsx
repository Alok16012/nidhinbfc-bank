"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { formatINR, formatDate } from "@/lib/utils";

interface OverdueLoan {
  id: string;
  loan_id: string;
  member_name: string;
  emi_amount: number;
  days_overdue: number;
  due_date: string;
}

interface OverdueWidgetProps {
  loans: OverdueLoan[];
}

export function OverdueWidget({ loans }: OverdueWidgetProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-semibold text-slate-800">Overdue EMIs</h3>
          <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
            {loans.length}
          </span>
        </div>
        <Link href="/loans?status=overdue" className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {loans.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No overdue EMIs</p>
        ) : (
          loans.slice(0, 5).map((loan) => (
            <Link
              key={loan.id}
              href={`/loans/${loan.id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{loan.member_name}</p>
                <p className="text-xs text-slate-400">
                  {loan.loan_id} · Due {formatDate(loan.due_date)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-red-600">{formatINR(loan.emi_amount)}</p>
                <p className="text-xs text-red-400">{loan.days_overdue}d overdue</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
