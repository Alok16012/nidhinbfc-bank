"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateDepositID } from "@/lib/utils";
import { useMembers } from "@/lib/hooks/useMembers";
import { useSettings } from "@/lib/hooks/useSettings";
import { SearchCombobox } from "@/components/shared/SearchCombobox";
import { calculateFDInterest, calculateRDMaturity, calculateDRDMaturity } from "@/lib/utils/interest-calculator";
import { formatINR } from "@/lib/utils";

export function DepositForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { members } = useMembers();
  const { getDepositRate, loading: settingsLoading } = useSettings();

  const [form, setForm] = useState({
    member_id: searchParams.get("member") ?? "",
    deposit_type: "fd",
    amount: 0,
    interest_rate: 7,
    tenure_months: 12,
    nominee_name: "",
    nominee_relation: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: string, value: string | number) => {
    if (field === "deposit_type") {
      setForm((prev) => ({ ...prev, [field]: value as string, interest_rate: getDepositRate(value as string) }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const getMaturityPreview = () => {
    if (!form.amount || !form.interest_rate || !form.tenure_months) return null;
    if (form.deposit_type === "rd") {
      return calculateRDMaturity(form.amount, form.interest_rate, form.tenure_months);
    }
    if (form.deposit_type === "drd") {
      return calculateDRDMaturity(form.amount, form.interest_rate, form.tenure_months);
    }
    if (form.deposit_type === "fd" || form.deposit_type === "mis") {
      return calculateFDInterest(form.amount, form.interest_rate, form.tenure_months);
    }
    return null;
  };

  const preview = getMaturityPreview();

  const maturityDate = () => {
    if (!form.tenure_months) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + form.tenure_months);
    return d.toISOString().split("T")[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const matDate = maturityDate();
    const matAmount = preview?.maturityAmount ?? null;

    const { error } = await supabase.from("deposits").insert({
      ...form,
      deposit_id: generateDepositID(),
      current_balance: form.amount,
      status: "active",
      maturity_date: matDate,
      maturity_amount: matAmount,
    });

    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/deposits");
    router.refresh();
  };

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  const memberOptions = members.map((m) => ({
    value: m.id,
    label: m.name,
    sub: `${m.member_id} · ${m.phone}`,
  }));

  const hasTenure = ["fd", "rd", "drd", "mis"].includes(form.deposit_type);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Deposit Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Member *</label>
            <SearchCombobox
              options={memberOptions}
              value={form.member_id}
              onChange={(v) => handleChange("member_id", v)}
              placeholder="Search and select member..."
            />
          </div>
          <div>
            <label className={labelClass}>Deposit Type *</label>
            <select className={inputClass} value={form.deposit_type} onChange={(e) => handleChange("deposit_type", e.target.value)}>
              <option value="savings">Savings Account</option>
              <option value="fd">Fixed Deposit (FD)</option>
              <option value="rd">Recurring Deposit (RD)</option>
              <option value="drd">Daily Recurring Deposit (DRD)</option>
              <option value="mis">Monthly Income Scheme (MIS)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{form.deposit_type === "rd" ? "Monthly Installment (₹)" : form.deposit_type === "drd" ? "Daily Installment (₹)" : "Amount (₹)"} *</label>
            <input className={inputClass} type="number" min={100} required value={form.amount || ""} onChange={(e) => handleChange("amount", parseFloat(e.target.value) || 0)} placeholder="e.g. 10000" />
          </div>
          <div>
            <label className={labelClass}>Interest Rate (% p.a.) *</label>
            <input className={inputClass} type="number" step="0.1" min={0} max={20} required value={form.interest_rate} onChange={(e) => handleChange("interest_rate", parseFloat(e.target.value))} />
          </div>
          {hasTenure && (
            <div>
              <label className={labelClass}>Tenure (months) *</label>
              <input className={inputClass} type="number" min={1} max={120} required value={form.tenure_months} onChange={(e) => handleChange("tenure_months", parseInt(e.target.value))} />
            </div>
          )}
        </div>
      </div>

      {/* Maturity Preview */}
      {preview && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-emerald-800 mb-3">Maturity Preview</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-emerald-700">{formatINR(preview.maturityAmount)}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Maturity Amount</p>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-700">{formatINR(preview.interestEarned)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Interest Earned</p>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-700">{maturityDate() ?? "—"}</p>
              <p className="text-xs text-slate-500 mt-0.5">Maturity Date</p>
            </div>
          </div>
        </div>
      )}

      {/* Nominee */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Nominee Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nominee Name *</label>
            <input className={inputClass} required value={form.nominee_name} onChange={(e) => handleChange("nominee_name", e.target.value)} placeholder="Nominee full name" />
          </div>
          <div>
            <label className={labelClass}>Relation *</label>
            <select className={inputClass} value={form.nominee_relation} onChange={(e) => handleChange("nominee_relation", e.target.value)} required>
              <option value="">Select relation</option>
              <option value="spouse">Spouse</option>
              <option value="father">Father</option>
              <option value="mother">Mother</option>
              <option value="son">Son</option>
              <option value="daughter">Daughter</option>
              <option value="brother">Brother</option>
              <option value="sister">Sister</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {loading ? "Creating..." : "Create Deposit"}
        </button>
      </div>
    </form>
  );
}
