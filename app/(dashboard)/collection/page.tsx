"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RecordPaymentModal } from "@/components/loans/RecordPaymentModal";
import { formatINR, formatDate } from "@/lib/utils";
import { CheckCircle, Printer, Search } from "lucide-react";

export default function CollectionPage() {
  const supabase = createClient();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [repayments, setRepayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [payModal, setPayModal] = useState<{ open: boolean; repayment: any | null }>({ open: false, repayment: null });

  useEffect(() => {
    setLoading(true);
    supabase
      .from("loan_repayments")
      .select("*, loan:loans(loan_id, member:members(name, phone, member_id))")
      .eq("due_date", date)
      .order("status")
      .then(({ data }) => {
        setRepayments(data || []);
        setLoading(false);
      });
  }, [date, supabase]);

  const filtered = repayments.filter((r) =>
    r.loan?.member?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.loan?.loan_id?.toLowerCase().includes(search.toLowerCase())
  );

  const totalDue = repayments.reduce((s, r) => s + r.emi_amount, 0);
  const totalCollected = repayments.filter((r) => r.status === "paid").reduce((s, r) => s + r.paid_amount, 0);
  const pending = repayments.filter((r) => r.status !== "paid").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Daily Collection Sheet" description="Track EMI collections for a specific date">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
        >
          <Printer className="h-4 w-4" />
          Print Sheet
        </button>
      </PageHeader>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Due", value: formatINR(totalDue), color: "text-blue-600" },
          { label: "Collected", value: formatINR(totalCollected), color: "text-emerald-600" },
          { label: "Pending EMIs", value: pending, color: "text-amber-600" },
          { label: "Collection %", value: totalDue > 0 ? `${((totalCollected / totalDue) * 100).toFixed(1)}%` : "0%", color: "text-purple-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by member or loan ID..."
            className="flex-1 text-sm outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Loan ID</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Installment</th>
                <th className="px-4 py-3 text-right">EMI Due</th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">Penalty</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Loading collection sheet...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">No EMIs due on {formatDate(date)}</td></tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r.loan?.member?.name ?? "—"}</p>
                      <p className="text-xs text-slate-400">{r.loan?.member?.phone}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{r.loan?.loan_id}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500">#{r.installment_no}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatINR(r.emi_amount)}</td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell text-red-500">
                      {r.penalty > 0 ? formatINR(r.penalty) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-center">
                      {r.status !== "paid" ? (
                        <button
                          onClick={() => setPayModal({ open: true, repayment: r })}
                          className="flex items-center gap-1 mx-auto px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Collect
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">✓ Paid</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {payModal.repayment && (
        <RecordPaymentModal
          open={payModal.open}
          onClose={() => setPayModal({ open: false, repayment: null })}
          loanId={payModal.repayment.loan_id}
          emiAmount={payModal.repayment.emi_amount}
          installmentNo={payModal.repayment.installment_no}
          dueDate={payModal.repayment.due_date}
          onSuccess={() => {
            setRepayments((prev) => prev.map((r) => r.id === payModal.repayment.id ? { ...r, status: "paid" } : r));
          }}
        />
      )}
    </div>
  );
}
