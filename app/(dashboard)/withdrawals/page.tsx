"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatINR, formatDate } from "@/lib/utils";
import { useMembers } from "@/lib/hooks/useMembers";
import { SearchCombobox } from "@/components/shared/SearchCombobox";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default function WithdrawalsPage() {
  const supabase = createClient();
  const { members } = useMembers();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    member_id: "",
    deposit_id: "",
    amount: 0,
    reason: "",
    date: new Date().toISOString().split("T")[0],
  });

  const memberOptions = members.map((m) => ({
    value: m.id,
    label: m.name,
    sub: `${m.member_id} · ${m.phone}`,
  }));

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("deposit_transactions").insert({
      deposit_id: form.deposit_id,
      transaction_type: "debit",
      amount: form.amount,
      balance_after: 0,
      narration: `Withdrawal: ${form.reason}`,
      date: form.date,
    });

    if (!error) {
      setShowForm(false);
      setForm({ member_id: "", deposit_id: "", amount: 0, reason: "", date: new Date().toISOString().split("T")[0] });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Withdrawals" description="Process member withdrawal requests">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + New Withdrawal
        </button>
      </PageHeader>

      {/* Withdrawal Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Process Withdrawal</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Member *</label>
              <SearchCombobox
                options={memberOptions}
                value={form.member_id}
                onChange={(v) => setForm((f) => ({ ...f, member_id: v }))}
                placeholder="Select member..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Deposit Account ID</label>
              <input className={inputClass} value={form.deposit_id} onChange={(e) => setForm((f) => ({ ...f, deposit_id: e.target.value }))} placeholder="Deposit ID" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹) *</label>
              <input className={inputClass} type="number" min={1} required value={form.amount || ""} onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
              <input className={inputClass} type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason *</label>
              <input className={inputClass} required value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Reason for withdrawal" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700 disabled:opacity-60">
                {loading ? "Processing..." : "Process Withdrawal"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
        <p className="text-slate-400 text-sm">Recent withdrawal history will appear here.</p>
        <p className="text-xs text-slate-300 mt-1">Connected to deposit transactions table.</p>
      </div>
    </div>
  );
}
