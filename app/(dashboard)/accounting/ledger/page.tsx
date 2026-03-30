"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { LedgerTable } from "@/components/accounting/LedgerTable";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import type { DateRange } from "@/components/shared/DateRangePicker";

export default function LedgerPage() {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    supabase.from("accounts").select("*").order("code").then(({ data }) => setAccounts(data || []));
  }, [supabase]);

  useEffect(() => {
    if (!selectedAccount) return;
    setLoading(true);
    let query = supabase
      .from("vouchers")
      .select("*")
      .or(`debit_account_id.eq.${selectedAccount},credit_account_id.eq.${selectedAccount}`)
      .order("date", { ascending: true });

    if (dateRange) query = query.gte("date", dateRange.from).lte("date", dateRange.to);

    query.then(({ data }) => {
      const mapped = (data || []).map((v: any, i: number) => ({
        id: v.id,
        date: v.date,
        narration: v.narration,
        voucher_no: v.voucher_no,
        debit: v.debit_account_id === selectedAccount ? v.amount : 0,
        credit: v.credit_account_id === selectedAccount ? v.amount : 0,
        balance: 0,
      }));

      let running = 0;
      const withBalance = mapped.map((e) => {
        running += e.credit - e.debit;
        return { ...e, balance: running };
      });

      setEntries(withBalance);
      setLoading(false);
    });
  }, [selectedAccount, dateRange, supabase]);

  const selectedAcc = accounts.find((a) => a.id === selectedAccount);

  return (
    <div className="space-y-5">
      <PageHeader title="Account Ledger" description="View individual account transactions">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </PageHeader>

      {/* Sub-nav */}
      <div className="flex gap-2 text-sm">
        {[
          { label: "Day Book", href: "/accounting" },
          { label: "Ledger", href: "/accounting/ledger" },
          { label: "Trial Balance", href: "/accounting/trial-balance" },
          { label: "Vouchers", href: "/accounting/vouchers" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className={`px-4 py-2 rounded-lg font-medium ${item.href === "/accounting/ledger" ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {item.label}
          </Link>
        ))}
      </div>

      {/* Account selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Account</label>
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="w-full md:w-96 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Choose account...</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>{acc.code} – {acc.name}</option>
          ))}
        </select>
      </div>

      {selectedAccount ? (
        <LedgerTable
          entries={entries}
          accountName={selectedAcc?.name}
          openingBalance={selectedAcc?.opening_balance ?? 0}
        />
      ) : (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
          Select an account to view its ledger
        </div>
      )}
    </div>
  );
}
