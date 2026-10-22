"use client";

import Link from "next/link";
import { PiggyBank, Calendar, TrendingUp, Pencil, ArrowRight } from "lucide-react";
import { Can } from "@/components/shared/Can";
import { formatINR, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface Deposit {
  id: string;
  deposit_id: string;
  deposit_type: string;
  amount: number;
  current_balance: number;
  interest_rate: number;
  maturity_date?: string;
  maturity_amount?: number;
  open_date?: string;
  created_at?: string;
  status: string;
  member?: { name: string; member_id: string };
}

export function DepositCard({ deposit }: { deposit: Deposit }) {
  const typeColors: Record<string, string> = {
    savings: "bg-blue-50 text-blue-700",
    fd: "bg-purple-50 text-purple-700",
    rd: "bg-amber-50 text-amber-700",
    mis: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col">
      <Link href={`/deposits/${deposit.id}`} className="block flex-1">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <PiggyBank className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{deposit.deposit_id}</p>
            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[deposit.deposit_type] ?? "bg-gray-100 text-gray-600"}`}>
              {deposit.deposit_type.toUpperCase()}
            </span>
          </div>
        </div>
        <StatusBadge status={deposit.status} />
      </div>

      {deposit.member && (
        <p className="text-xs text-slate-500 mb-3">{deposit.member.name} · {deposit.member.member_id}</p>
      )}

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Principal</span>
          <span className="font-semibold text-slate-800">{formatINR(deposit.amount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />Rate</span>
          <span className="text-slate-700">{deposit.interest_rate}% p.a.</span>
        </div>
        {(deposit.open_date || deposit.created_at) && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Deposit Date</span>
            <span className="text-slate-700">{formatDate(deposit.open_date ?? deposit.created_at!)}</span>
          </div>
        )}
        {deposit.maturity_date && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Maturity</span>
            <span className="text-slate-700">{formatDate(deposit.maturity_date)}</span>
          </div>
        )}
        {deposit.maturity_amount && (
          <div className="flex justify-between text-sm border-t border-slate-100 pt-2">
            <span className="text-slate-500">Maturity Amount</span>
            <span className="font-bold text-emerald-600">{formatINR(deposit.maturity_amount)}</span>
          </div>
        )}
      </div>
      </Link>

      <div className="flex items-center justify-end gap-4 mt-4 pt-3 border-t border-slate-100 text-xs font-semibold">
        {deposit.status === "active" && (
          <Can permission="deposits.create">
            <Link href={`/deposits/${deposit.id}/edit`} className="flex items-center gap-1 text-slate-500 hover:text-slate-800">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
          </Can>
        )}
        <Link href={`/deposits/${deposit.id}`} className="flex items-center gap-1 text-blue-600 hover:underline">
          View <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
