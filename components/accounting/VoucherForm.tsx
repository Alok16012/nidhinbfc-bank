"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface VoucherFormProps {
  onSuccess?: () => void;
}

export function VoucherForm({ onSuccess }: VoucherFormProps) {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({
    voucher_type: "receipt",
    date: new Date().toISOString().split("T")[0],
    amount: 0,
    narration: "",
    debit_account_id: "",
    credit_account_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("accounts").select("id, code, name, type").order("code")
      .then(({ data }) => setAccounts(data || []));
  }, []);

  const voucherNo = `V${Date.now().toString().slice(-6)}`;
  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.from("vouchers").insert({
      ...form,
      voucher_no: voucherNo,
    });

    if (error) { setError(error.message); setLoading(false); return; }
    onSuccess?.();
    setForm({
      voucher_type: "receipt",
      date: new Date().toISOString().split("T")[0],
      amount: 0,
      narration: "",
      debit_account_id: "",
      credit_account_id: "",
    });
    setLoading(false);
  };

  // Suggest debit/credit based on voucher type
  const getDefaultAccounts = (type: string) => {
    const cash = accounts.find(a => a.code === "1001")?.id ?? "";
    const bank = accounts.find(a => a.code === "1002")?.id ?? "";
    const loanIncome = accounts.find(a => a.code === "5001")?.id ?? "";
    const loanPortfolio = accounts.find(a => a.code === "2001")?.id ?? "";
    const savings = accounts.find(a => a.code === "3001")?.id ?? "";
    if (type === "receipt")  return { debit_account_id: cash, credit_account_id: loanIncome };
    if (type === "payment")  return { debit_account_id: loanPortfolio, credit_account_id: cash };
    if (type === "contra")   return { debit_account_id: bank, credit_account_id: cash };
    return { debit_account_id: "", credit_account_id: "" };
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      {accounts.length === 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
          No accounts found. Please setup default accounts from the Trial Balance page first.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Voucher Type *</label>
          <select
            className={inputClass}
            value={form.voucher_type}
            onChange={(e) => {
              const defaults = getDefaultAccounts(e.target.value);
              setForm((f) => ({ ...f, voucher_type: e.target.value, ...defaults }));
            }}
          >
            <option value="receipt">Receipt Voucher (Cash/Bank In)</option>
            <option value="payment">Payment Voucher (Cash/Bank Out)</option>
            <option value="journal">Journal Voucher (Adjustment)</option>
            <option value="contra">Contra Voucher (Cash↔Bank)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
          <input className={inputClass} type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Debit Account *</label>
          <select
            className={inputClass}
            required
            value={form.debit_account_id}
            onChange={(e) => setForm((f) => ({ ...f, debit_account_id: e.target.value }))}
          >
            <option value="">Select account...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Credit Account *</label>
          <select
            className={inputClass}
            required
            value={form.credit_account_id}
            onChange={(e) => setForm((f) => ({ ...f, credit_account_id: e.target.value }))}
          >
            <option value="">Select account...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹) *</label>
          <input className={inputClass} type="number" min={1} required value={form.amount || ""} onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Narration *</label>
          <input className={inputClass} required value={form.narration} onChange={(e) => setForm((f) => ({ ...f, narration: e.target.value }))} placeholder="Brief description of transaction" />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={loading || accounts.length === 0} className="px-5 py-2.5 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {loading ? "Saving..." : "Save Voucher"}
        </button>
      </div>
    </form>
  );
}
