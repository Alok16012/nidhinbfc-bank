"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { VoucherForm } from "@/components/accounting/VoucherForm";
import { formatINR, formatDate, formatDateTime } from "@/lib/utils";
import { PlusCircle, Printer } from "lucide-react";

// Human-readable labels for each passbook transaction type
const TYPE_LABELS: Record<string, string> = {
  loan_disbursement: "Loan Disbursement",
  loan_repayment: "Loan EMI Collection",
  deposit_credit: "Deposit Collection",
  deposit_debit: "Deposit Withdrawal",
  interest_credit: "Interest Credit",
  penalty_debit: "Penalty",
  share_purchase: "Share Purchase",
  withdrawal: "Withdrawal",
  other: "Other",
};

type DayBookEntry = {
  id: string;
  time: string | null;
  kind: string;
  party: string;
  narration: string;
  receipt: number; // cash in
  payment: number; // cash out
  ref: string;
};

export default function DayBookPage() {
  const supabase = createClient();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<DayBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchEntries = async () => {
    setLoading(true);

    // 1. Member transactions (collections, deposits, EMI, disbursements, withdrawals)
    //    These are auto-synced into the unified `passbook` ledger via DB triggers.
    const { data: passbook } = await supabase
      .from("passbook")
      .select("id, transaction_date, type, narration, debit, credit, created_at, member:members(name, member_id)")
      .eq("transaction_date", date)
      .order("created_at", { ascending: true });

    // 2. Manual accounting vouchers (receipts / payments) entered for the day
    const { data: vouchers } = await supabase
      .from("vouchers")
      .select("id, voucher_no, voucher_type, narration, total_amount, created_at")
      .eq("voucher_date", date)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true });

    const passbookEntries: DayBookEntry[] = (passbook || []).map((p: any) => {
      const m = Array.isArray(p.member) ? p.member[0] : p.member;
      return {
        id: `pb-${p.id}`,
        time: p.created_at,
        kind: TYPE_LABELS[p.type] ?? p.type,
        party: m?.name ? `${m.name}${m.member_id ? ` (${m.member_id})` : ""}` : "—",
        narration: p.narration ?? "",
        receipt: Number(p.credit) || 0,
        payment: Number(p.debit) || 0,
        ref: "Passbook",
      };
    });

    const voucherEntries: DayBookEntry[] = (vouchers || []).map((v: any) => ({
      id: `vch-${v.id}`,
      time: v.created_at,
      kind: v.voucher_type === "receipt" ? "Receipt Voucher" : v.voucher_type === "payment" ? "Payment Voucher" : `${v.voucher_type} Voucher`,
      party: "—",
      narration: v.narration ?? "",
      receipt: v.voucher_type === "receipt" ? Number(v.total_amount) || 0 : 0,
      payment: v.voucher_type === "payment" ? Number(v.total_amount) || 0 : 0,
      ref: v.voucher_no,
    }));

    const all = [...passbookEntries, ...voucherEntries].sort(
      (a, b) => new Date(a.time ?? 0).getTime() - new Date(b.time ?? 0).getTime()
    );

    setEntries(all);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [date]);

  const totalReceipts = entries.reduce((s, e) => s + e.receipt, 0);
  const totalPayments = entries.reduce((s, e) => s + e.payment, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Day Book" description="All cash transactions for the day — collections, deposits, EMI, withdrawals & vouchers">
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
          { label: "Total Receipts (Cash In)", value: formatINR(totalReceipts), color: "text-emerald-600" },
          { label: "Total Payments (Cash Out)", value: formatINR(totalPayments), color: "text-red-500" },
          { label: "Net Cash", value: formatINR(totalReceipts - totalPayments), color: "text-blue-600" },
          { label: "Transactions", value: entries.length, color: "text-slate-700" },
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
          <VoucherForm onSuccess={() => { setShowForm(false); fetchEntries(); }} />
        </div>
      )}

      {/* Day Book Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Day Book — {formatDate(date)}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Particulars</th>
                <th className="px-4 py-3 text-left">Member / Party</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Narration</th>
                <th className="px-4 py-3 text-right">Receipt (Cr)</th>
                <th className="px-4 py-3 text-right">Payment (Dr)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">Loading...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">No transactions for this date</td></tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {e.time ? formatDateTime(e.time).split(", ").pop() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-700">{e.kind}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{e.party}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500 max-w-xs truncate">{e.narration}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">{e.receipt ? formatINR(e.receipt) : "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-500">{e.payment ? formatINR(e.payment) : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && entries.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-semibold text-slate-700">
                  <td className="px-4 py-3" colSpan={4}>Total</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{formatINR(totalReceipts)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatINR(totalPayments)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
