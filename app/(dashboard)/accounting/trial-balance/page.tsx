"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatINR } from "@/lib/utils";

const DEFAULT_ACCOUNTS = [
  { code: "1001", name: "Cash in Hand",             type: "asset",     current_balance: 0, is_active: true },
  { code: "1002", name: "Bank Account",             type: "asset",     current_balance: 0, is_active: true },
  { code: "2001", name: "Loan Portfolio",           type: "asset",     current_balance: 0, is_active: true },
  { code: "2002", name: "Interest Receivable",      type: "asset",     current_balance: 0, is_active: true },
  { code: "3001", name: "Members Savings Deposits", type: "liability", current_balance: 0, is_active: true },
  { code: "3002", name: "RD / DRD Deposits",        type: "liability", current_balance: 0, is_active: true },
  { code: "3003", name: "Fixed Deposits (FD)",      type: "liability", current_balance: 0, is_active: true },
  { code: "3004", name: "MIS Deposits",             type: "liability", current_balance: 0, is_active: true },
  { code: "4001", name: "Share Capital",            type: "equity",    current_balance: 0, is_active: true },
  { code: "4002", name: "Reserves & Surplus",       type: "equity",    current_balance: 0, is_active: true },
  { code: "5001", name: "Interest Income on Loans", type: "income",    current_balance: 0, is_active: true },
  { code: "5002", name: "Processing Fee Income",    type: "income",    current_balance: 0, is_active: true },
  { code: "6001", name: "Interest on Deposits",     type: "expense",   current_balance: 0, is_active: true },
  { code: "6002", name: "Salary & Wages",           type: "expense",   current_balance: 0, is_active: true },
  { code: "6003", name: "Office Expenses",          type: "expense",   current_balance: 0, is_active: true },
];

export default function TrialBalancePage() {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchAccounts = () => {
    supabase.from("accounts").select("*").order("code").then(({ data }) => {
      setAccounts(data || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchAccounts(); }, [supabase]);

  const setupDefaultAccounts = async () => {
    setSeeding(true);
    const { error } = await supabase.from("accounts").upsert(DEFAULT_ACCOUNTS, { onConflict: "code" });
    if (!error) fetchAccounts();
    setSeeding(false);
  };

  const totalDebit  = accounts.filter((a) => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const totalCredit = accounts.filter((a) => a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Trial Balance" description="Summary of all account balances" />

      {/* Sub-nav */}
      <div className="flex gap-2 text-sm">
        {[
          { label: "Day Book", href: "/accounting" },
          { label: "Ledger", href: "/accounting/ledger" },
          { label: "Trial Balance", href: "/accounting/trial-balance" },
          { label: "Vouchers", href: "/accounting/vouchers" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className={`px-4 py-2 rounded-lg font-medium ${item.href === "/accounting/trial-balance" ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {item.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-800 text-white flex justify-between">
          <h3 className="font-bold text-sm">Trial Balance</h3>
          <span className="text-xs text-slate-400">As of {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Account Name</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Debit Balance</th>
                <th className="px-4 py-3 text-right">Credit Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">Loading...</td></tr>
              ) : accounts.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">No accounts found. Click "Setup Default Accounts" above.</td></tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{acc.code}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{acc.name}</td>
                    <td className="px-4 py-2.5 capitalize text-slate-500 text-xs">{acc.type}</td>
                    <td className="px-4 py-2.5 text-right text-red-500 font-medium">
                      {acc.balance > 0 ? formatINR(acc.balance) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">
                      {acc.balance < 0 ? formatINR(Math.abs(acc.balance)) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300">
                <td colSpan={3} className="px-4 py-3 font-bold text-slate-700">TOTALS</td>
                <td className="px-4 py-3 text-right font-bold text-red-600">{formatINR(totalDebit)}</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatINR(totalCredit)}</td>
              </tr>
              <tr className={`border-t border-slate-200 ${Math.abs(totalDebit - totalCredit) < 0.01 ? "bg-emerald-50" : "bg-red-50"}`}>
                <td colSpan={3} className="px-4 py-3 font-bold text-slate-700">
                  {Math.abs(totalDebit - totalCredit) < 0.01 ? "✓ Balanced" : "⚠ Difference"}
                </td>
                <td colSpan={2} className={`px-4 py-3 text-right font-bold ${Math.abs(totalDebit - totalCredit) < 0.01 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatINR(Math.abs(totalDebit - totalCredit))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
