"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, X as CloseIcon, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatINR, formatDate } from "@/lib/utils";

export default function DepositDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [deposit, setDeposit] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [txForm, setTxForm] = useState({ transaction_type: "credit", amount: 0, narration: "", date: new Date().toISOString().split("T")[0] });
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");
  const supabase = createClient();

  const fetchData = () => {
    Promise.all([
      supabase.from("deposits").select("*, member:members(name, phone, member_id)").eq("id", id).single(),
      supabase.from("deposit_transactions").select("*").eq("deposit_id", id).order("date", { ascending: true }),
    ]).then(([{ data: dep }, { data: txs }]) => {
      setDeposit(dep);
      setTransactions(txs || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxError("");
    setTxLoading(true);

    const currentBalance = deposit.current_balance ?? 0;
    const amount = parseFloat(String(txForm.amount)) || 0;

    if (txForm.transaction_type === "debit" && amount > currentBalance) {
      setTxError("Insufficient balance for withdrawal.");
      setTxLoading(false);
      return;
    }

    const balanceAfter = txForm.transaction_type === "credit"
      ? currentBalance + amount
      : currentBalance - amount;

    const { error: txErr } = await supabase.from("deposit_transactions").insert({
      deposit_id: id,
      member_id: deposit.member_id,
      transaction_type: txForm.transaction_type,
      amount,
      narration: txForm.narration || (txForm.transaction_type === "credit" ? "Deposit" : "Withdrawal"),
      date: txForm.date,
      balance_after: balanceAfter,
    });

    if (txErr) { setTxError(txErr.message); setTxLoading(false); return; }

    await supabase.from("deposits").update({ current_balance: balanceAfter }).eq("id", id);

    setShowModal(false);
    setTxForm({ transaction_type: "credit", amount: 0, narration: "", date: new Date().toISOString().split("T")[0] });
    setTxLoading(false);
    fetchData();
  };

  const isSavings = deposit?.deposit_type === "savings";
  const totalCredit = transactions.filter(t => t.transaction_type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalDebit = transactions.filter(t => t.transaction_type === "debit").reduce((s, t) => s + t.amount, 0);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading...</div>;
  if (!deposit) return <div className="text-center py-20 text-slate-500">Deposit not found. <Link href="/deposits" className="text-blue-600 underline">Back</Link></div>;

  return (
    <div className="space-y-5">
      <PageHeader title={`Deposit: ${deposit.deposit_id}`} description={`${deposit.deposit_type.toUpperCase()} Account`}>
        <StatusBadge status={deposit.status} />
        {isSavings && (
          <>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700"
            >
              <PlusCircle className="h-4 w-4" /> Record Transaction
            </button>
          </>
        )}
      </PageHeader>

      {/* Savings Summary */}
      {isSavings && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
            <p className="text-xl font-bold text-emerald-600">{formatINR(totalCredit)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total Deposits</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
            <p className="text-xl font-bold text-red-500">{formatINR(totalDebit)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total Withdrawals</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
            <p className="text-xl font-bold text-blue-600">{formatINR(deposit.current_balance)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Current Balance</p>
          </div>
        </div>
      )}

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

          {deposit.member && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Member</h3>
              <div className="text-sm space-y-1.5">
                <p className="font-medium text-slate-800">{deposit.member.name}</p>
                <p className="text-slate-500">{deposit.member.member_id} · {deposit.member.phone}</p>
                <Link href={`/members/${deposit.member_id}`} className="text-xs text-blue-600 hover:underline">View Profile →</Link>
              </div>
            </div>
          )}
        </div>

        {/* Transactions / Passbook */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">{isSavings ? "Passbook" : "Transaction History"}</h3>
            <span className="text-xs text-slate-400">{transactions.length} entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Narration</th>
                  <th className="px-4 py-3 text-right">Deposit (Cr.)</th>
                  <th className="px-4 py-3 text-right">Withdrawal (Dr.)</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400">No transactions yet</td></tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="px-4 py-2.5 capitalize text-slate-600">{tx.transaction_type}</td>
                      <td className="px-4 py-2.5 text-slate-700">{tx.narration}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">
                        {tx.transaction_type === "credit" || tx.transaction_type === "interest" ? formatINR(tx.amount) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-red-500 font-medium">
                        {tx.transaction_type === "debit" ? formatINR(tx.amount) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900">{formatINR(tx.balance_after)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {transactions.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-slate-600">Totals</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatINR(totalCredit)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{formatINR(totalDebit)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{formatINR(deposit.current_balance)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Record Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Record Transaction</h3>
              <button onClick={() => { setShowModal(false); setTxError(""); }} className="p-1.5 rounded-lg hover:bg-slate-100">
                <CloseIcon className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleRecordTransaction} className="p-5 space-y-4">
              {txError && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{txError}</div>}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Transaction Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {["credit", "debit"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTxForm((p) => ({ ...p, transaction_type: t }))}
                      className={`py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                        txForm.transaction_type === t
                          ? t === "credit" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-red-400 bg-red-50 text-red-600"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {t === "credit" ? "Deposit (Cr.)" : "Withdrawal (Dr.)"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹) *</label>
                <input
                  type="number" min={1} required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={txForm.amount || ""}
                  onChange={(e) => setTxForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
                <input
                  type="date" required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={txForm.date}
                  onChange={(e) => setTxForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Narration</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={txForm.narration}
                  onChange={(e) => setTxForm((p) => ({ ...p, narration: e.target.value }))}
                  placeholder="e.g. Cash deposit, ATM withdrawal"
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-3 text-sm flex justify-between">
                <span className="text-slate-500">Current Balance</span>
                <span className="font-semibold text-slate-800">{formatINR(deposit.current_balance)}</span>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowModal(false); setTxError(""); }} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={txLoading} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                  {txLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
