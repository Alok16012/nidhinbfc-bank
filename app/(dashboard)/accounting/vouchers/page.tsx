"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { VoucherForm } from "@/components/accounting/VoucherForm";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { ExportButton } from "@/components/shared/ExportButton";
import { formatINR, formatDate } from "@/lib/utils";
import { PlusCircle } from "lucide-react";
import type { DateRange } from "@/components/shared/DateRangePicker";

const VOUCHER_TYPES = ["all", "receipt", "payment", "journal", "contra"];

export default function VouchersPage() {
  const supabase = createClient();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showForm, setShowForm] = useState(false);

  const fetchVouchers = async () => {
    setLoading(true);
    let query = supabase.from("vouchers").select("*").order("date", { ascending: false });
    if (typeFilter !== "all") query = query.eq("voucher_type", typeFilter);
    if (dateRange) query = query.gte("date", dateRange.from).lte("date", dateRange.to);
    const { data } = await query;
    setVouchers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchVouchers(); }, [typeFilter, dateRange]);

  return (
    <div className="space-y-5">
      <PageHeader title="Vouchers" description="All accounting vouchers">
        <ExportButton onExportCSV={() => {}} />
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          <PlusCircle className="h-4 w-4" />New Voucher
        </button>
      </PageHeader>

      {/* Sub-nav */}
      <div className="flex gap-2 text-sm">
        {[
          { label: "Day Book", href: "/accounting" },
          { label: "Ledger", href: "/accounting/ledger" },
          { label: "Trial Balance", href: "/accounting/trial-balance" },
          { label: "Vouchers", href: "/accounting/vouchers" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className={`px-4 py-2 rounded-lg font-medium ${item.href === "/accounting/vouchers" ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {item.label}
          </Link>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">New Voucher</h3>
          <VoucherForm onSuccess={() => { setShowForm(false); fetchVouchers(); }} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 overflow-x-auto">
          {VOUCHER_TYPES.map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap ${typeFilter === t ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {t}
            </button>
          ))}
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Voucher No.</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Narration</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Debit A/c</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Credit A/c</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Loading...</td></tr>
              ) : vouchers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">No vouchers found</td></tr>
              ) : (
                vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{v.voucher_no}</span></td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(v.date)}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{v.voucher_type}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{v.narration}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500">{v.debit_account_id}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500">{v.credit_account_id}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatINR(v.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
