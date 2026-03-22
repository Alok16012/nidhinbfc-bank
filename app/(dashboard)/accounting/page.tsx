"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { VoucherForm } from "@/components/accounting/VoucherForm";
import { formatINR, formatDate } from "@/lib/utils";
import { PlusCircle, Printer } from "lucide-react";

export default function DayBookPage() {
  const supabase = createClient();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchVouchers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vouchers")
      .select("*")
      .eq("date", date)
      .order("created_at", { ascending: false });
    setVouchers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchVouchers(); }, [date]);

  const totalReceipts = vouchers.filter((v) => v.voucher_type === "receipt").reduce((s, v) => s + v.amount, 0);
  const totalPayments = vouchers.filter((v) => v.voucher_type === "payment").reduce((s, v) => s + v.amount, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Day Book" description="Daily accounting entries">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
          <Printer className="h-4 w-4" />Print
        </button>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
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
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 rounded-lg font-medium ${item.href === "/accounting" ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Receipts", value: formatINR(totalReceipts), color: "text-emerald-600" },
          { label: "Total Payments", value: formatINR(totalPayments), color: "text-red-500" },
          { label: "Net Cash", value: formatINR(totalReceipts - totalPayments), color: "text-blue-600" },
          { label: "Vouchers", value: vouchers.length, color: "text-slate-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Voucher Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">New Voucher</h3>
          <VoucherForm onSuccess={() => { setShowForm(false); fetchVouchers(); }} />
        </div>
      )}

      {/* Vouchers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Vouchers for {formatDate(date)}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Voucher No.</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Narration</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Debit A/c</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Credit A/c</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">Loading...</td></tr>
              ) : vouchers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">No vouchers for this date</td></tr>
              ) : (
                vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{v.voucher_no}</span>
                    </td>
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
