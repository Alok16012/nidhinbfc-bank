"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatINR, formatDate } from "@/lib/utils";

export default function DepositDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [deposit, setDeposit] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    Promise.all([
      supabase.from("deposits").select("*, member:members(name, phone, member_id)").eq("id", id).single(),
      supabase.from("deposit_transactions").select("*").eq("deposit_id", id).order("date", { ascending: false }),
    ]).then(([{ data: dep }, { data: txs }]) => {
      setDeposit(dep);
      setTransactions(txs || []);
      setLoading(false);
    });
  }, [id, supabase]);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading...</div>;
  if (!deposit) return <div className="text-center py-20 text-slate-500">Deposit not found. <Link href="/deposits" className="text-blue-600 underline">Back</Link></div>;

  return (
    <div className="space-y-5">
      <PageHeader title={`Deposit: ${deposit.deposit_id}`} description={`${deposit.deposit_type.toUpperCase()} Account`}>
        <StatusBadge status={deposit.status} />
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Deposit Details</h3>
            <div className="space-y-2.5 text-sm">
              {[
                ["Deposit ID", deposit.deposit_id],
                ["Type", deposit.deposit_type.toUpperCase()],
                ["Principal", formatINR(deposit.amount)],
                ["Current Balance", formatINR(deposit.current_balance)],
                ["Interest Rate", `${deposit.interest_rate}% p.a.`],
                deposit.tenure_months ? ["Tenure", `${deposit.tenure_months} months`] : null,
                deposit.maturity_date ? ["Maturity Date", formatDate(deposit.maturity_date)] : null,
                deposit.maturity_amount ? ["Maturity Amount", formatINR(deposit.maturity_amount)] : null,
                ["Nominee", `${deposit.nominee_name} (${deposit.nominee_relation})`],
                ["Opened On", formatDate(deposit.created_at)],
              ].filter(Boolean).map((entry) => {
                const [label, value] = entry as [string, string];
                return (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-800">{value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Member */}
          {deposit.member && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Member</h3>
              <div className="text-sm space-y-1.5">
                <p className="font-medium text-slate-800">{deposit.member.name}</p>
                <p className="text-slate-500">{deposit.member.member_id} · {deposit.member.phone}</p>
                <Link href={`/members/${deposit.member_id}`} className="text-xs text-blue-600 hover:underline">
                  View Profile →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Transaction History</h3>
            <span className="text-xs text-slate-400">{transactions.length} entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-left">Type</th>
                  <th className="px-4 py-2.5 text-left">Narration</th>
                  <th className="px-4 py-2.5 text-right">Credit</th>
                  <th className="px-4 py-2.5 text-right">Debit</th>
                  <th className="px-4 py-2.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400">No transactions yet</td></tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-500">{formatDate(tx.date)}</td>
                      <td className="px-4 py-2.5 capitalize text-slate-600">{tx.transaction_type}</td>
                      <td className="px-4 py-2.5 text-slate-700">{tx.narration}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600">{tx.transaction_type === "credit" || tx.transaction_type === "interest" ? formatINR(tx.amount) : "—"}</td>
                      <td className="px-4 py-2.5 text-right text-red-500">{tx.transaction_type === "debit" ? formatINR(tx.amount) : "—"}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{formatINR(tx.balance_after)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
