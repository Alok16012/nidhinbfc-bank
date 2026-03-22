"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExportButton } from "@/components/shared/ExportButton";
import { formatINR, formatDate } from "@/lib/utils";
import { PlusCircle, Receipt } from "lucide-react";

const CATEGORIES = ["Salary", "Rent", "Electricity", "Stationery", "Repairs", "Travelling", "Printing", "Postage", "Bank Charges", "Misc"];

export default function ExpensesPage() {
  const supabase = createClient();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "",
    description: "",
    amount: 0,
    paid_to: "",
    payment_mode: "cash",
    voucher_no: "",
  });

  const fetchExpenses = async () => {
    setLoading(true);
    const { data } = await supabase.from("expenses").select("*").order("date", { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchExpenses(); }, []);

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("expenses").insert(form);
    if (!error) { setShowForm(false); fetchExpenses(); setForm({ date: new Date().toISOString().split("T")[0], category: "", description: "", amount: 0, paid_to: "", payment_mode: "cash", voucher_no: "" }); }
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const thisMonth = expenses
    .filter((e) => new Date(e.date).getMonth() === new Date().getMonth())
    .reduce((s, e) => s + e.amount, 0);

  const byCategory = CATEGORIES.map((cat) => ({
    category: cat,
    total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-5">
      <PageHeader title="Expenses" description="Track and manage operational expenses">
        <ExportButton onExportCSV={() => {}} />
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <PlusCircle className="h-4 w-4" />Add Expense
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Expenses", value: formatINR(totalExpenses), color: "text-red-600" },
          { label: "This Month", value: formatINR(thisMonth), color: "text-amber-600" },
          { label: "Total Entries", value: expenses.length, color: "text-blue-600" },
          { label: "Top Category", value: byCategory[0]?.category ?? "—", color: "text-slate-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Add Expense</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label><input className={inputClass} type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Category *</label>
              <select className={inputClass} required value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1.5">Description *</label><input className={inputClass} required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹) *</label><input className={inputClass} type="number" min={1} required value={form.amount || ""} onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Paid To</label><input className={inputClass} value={form.paid_to} onChange={(e) => setForm((f) => ({ ...f, paid_to: e.target.value }))} placeholder="Vendor / Person name" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Mode</label>
              <select className={inputClass} value={form.payment_mode} onChange={(e) => setForm((f) => ({ ...f, payment_mode: e.target.value }))}>
                <option value="cash">Cash</option><option value="bank">Bank</option><option value="upi">UPI</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Voucher No.</label><input className={inputClass} value={form.voucher_no} onChange={(e) => setForm((f) => ({ ...f, voucher_no: e.target.value }))} placeholder="Optional" /></div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700">Save Expense</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Category breakdown */}
        {byCategory.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">By Category</h3>
            <div className="space-y-3">
              {byCategory.slice(0, 8).map((c) => (
                <div key={c.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{c.category}</span>
                    <span className="font-medium text-slate-800">{formatINR(c.total)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(c.total / totalExpenses) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expense list */}
        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${byCategory.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Expense History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-left">Category</th>
                  <th className="px-4 py-2.5 text-left">Description</th>
                  <th className="px-4 py-2.5 text-left hidden md:table-cell">Paid To</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">Loading...</td></tr>
                ) : expenses.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">No expenses recorded</td></tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-500">{formatDate(exp.date)}</td>
                      <td className="px-4 py-2.5"><span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{exp.category}</span></td>
                      <td className="px-4 py-2.5 text-slate-700">{exp.description}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell text-slate-500">{exp.paid_to || "—"}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-red-600">{formatINR(exp.amount)}</td>
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
