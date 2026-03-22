"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { formatINR, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  date: string;
  member_name: string;
  narration: string;
  debit: number;
  credit: number;
  transaction_type: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">Recent Transactions</h3>
        <Link href="/accounting" className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No recent transactions</p>
        ) : (
          transactions.slice(0, 8).map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                  tx.credit > 0 ? "bg-emerald-50" : "bg-red-50"
                )}
              >
                {tx.credit > 0 ? (
                  <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{tx.member_name}</p>
                <p className="text-xs text-slate-400 truncate">{tx.narration}</p>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    tx.credit > 0 ? "text-emerald-600" : "text-red-500"
                  )}
                >
                  {tx.credit > 0 ? "+" : "-"}
                  {formatINR(tx.credit || tx.debit)}
                </p>
                <p className="text-xs text-slate-400">{formatDate(tx.date)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
