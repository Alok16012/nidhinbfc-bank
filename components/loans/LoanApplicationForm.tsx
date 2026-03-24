"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateLoanID, formatINR } from "@/lib/utils";
import { useMembers } from "@/lib/hooks/useMembers";
import { SearchCombobox } from "@/components/shared/SearchCombobox";
import { EMICalculator } from "./EMICalculator";
import { RepaymentSchedule } from "./RepaymentSchedule";

export function LoanApplicationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { members } = useMembers();

  const [form, setForm] = useState({
    member_id: searchParams.get("member") ?? "",
    loan_type: "personal",
    amount: 0,
    interest_rate: 12,
    tenure_months: 12,
    repayment_type: "emi",
    purpose: "",
    processing_fee_percent: 2.5,
    gst_percent: 18,
    guarantor_name: "",
    guarantor_relation: "",
    guarantor_dob: "",
    guarantor_phone: "",
    guarantor_aadhar: "",
    guarantor_pan: "",
    guarantor_address: "",
    collateral: "",
  });

  const [emiAmount, setEmiAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const processingFee = form.amount > 0 ? Math.round(form.amount * (form.processing_fee_percent / 100)) : 0;
  const gstOnFee = Math.round(processingFee * (form.gst_percent / 100));
  const disbursedAmount = form.amount - processingFee - gstOnFee;

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEMIChange = useCallback((emi: number) => setEmiAmount(emi), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.from("loans").insert({
      ...form,
      loan_id: generateLoanID(),
      status: "pending",
      processing_fee: processingFee,
      gst_on_fee: gstOnFee,
      disbursed_amount: disbursedAmount,
      emi_amount: emiAmount,
      outstanding_balance: form.amount,
    });

    if (error) { setError(error.message); setLoading(false); return; }

    router.push("/loans");
    router.refresh();
  };

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  const memberOptions = members.map((m) => ({
    value: m.id,
    label: m.name,
    sub: `${m.member_id} · ${m.phone}`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Member & Loan Type */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Loan Details</h3>
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
            <label className={labelClass}>Loan Type *</label>
            <select className={inputClass} value={form.loan_type} onChange={(e) => handleChange("loan_type", e.target.value)}>
              <option value="personal">Personal Loan</option>
              <option value="business">Business Loan</option>
              <option value="agriculture">Agriculture Loan</option>
              <option value="housing">Housing Loan</option>
              <option value="education">Education Loan</option>
              <option value="vehicle">Vehicle Loan</option>
              <option value="gold">Gold Loan</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Repayment Type *</label>
            <select className={inputClass} value={form.repayment_type} onChange={(e) => handleChange("repayment_type", e.target.value)}>
              <option value="emi">Reducing Balance (EMI)</option>
              <option value="flat">Flat Rate</option>
              <option value="bullet">Bullet Repayment</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Loan Amount (₹) *</label>
            <input className={inputClass} type="number" min={1000} required value={form.amount || ""} onChange={(e) => handleChange("amount", parseFloat(e.target.value) || 0)} placeholder="e.g. 100000" />
          </div>
          <div>
            <label className={labelClass}>Interest Rate (% p.a.) *</label>
            <input className={inputClass} type="number" step="0.1" min={0} max={36} required value={form.interest_rate} onChange={(e) => handleChange("interest_rate", parseFloat(e.target.value))} />
          </div>
          <div>
            <label className={labelClass}>Tenure (months) *</label>
            <input className={inputClass} type="number" min={1} max={360} required value={form.tenure_months} onChange={(e) => handleChange("tenure_months", parseInt(e.target.value))} />
          </div>
          <div>
            <label className={labelClass}>Purpose *</label>
            <input className={inputClass} required value={form.purpose} onChange={(e) => handleChange("purpose", e.target.value)} placeholder="Brief loan purpose" />
          </div>
          <div>
            <label className={labelClass}>Processing Fee (%)</label>
            <input className={inputClass} type="number" step="0.1" min={0} max={10} value={form.processing_fee_percent} onChange={(e) => handleChange("processing_fee_percent", parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className={labelClass}>GST on Processing Fee (%)</label>
            <input className={inputClass} type="number" step="0.1" min={0} max={30} value={form.gst_percent} onChange={(e) => handleChange("gst_percent", parseFloat(e.target.value) || 0)} />
          </div>
        </div>
      </div>

      {/* Disbursement Breakdown */}
      {form.amount > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-3">Disbursement Breakdown</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-700">
              <span>Loan Amount</span>
              <span className="font-medium">{formatINR(form.amount)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Processing Fee ({form.processing_fee_percent}%)</span>
              <span>− {formatINR(processingFee)}</span>
            </div>
            <div className="flex justify-between text-red-500">
              <span>GST on Processing Fee ({form.gst_percent}%)</span>
              <span>− {formatINR(gstOnFee)}</span>
            </div>
            <div className="border-t border-amber-200 pt-2 flex justify-between font-semibold text-emerald-700">
              <span>Amount Disbursed to Member</span>
              <span>{formatINR(disbursedAmount)}</span>
            </div>
            <p className="text-xs text-amber-600 pt-1">* EMI will be calculated on full loan amount of {formatINR(form.amount)}</p>
          </div>
        </div>
      )}

      {/* EMI Preview */}
      {form.amount > 0 && form.interest_rate > 0 && form.tenure_months > 0 && (
        <EMICalculator
          principal={form.amount}
          rate={form.interest_rate}
          tenure={form.tenure_months}
          type={form.repayment_type === "flat" ? "flat" : "reducing"}
          onEMIChange={handleEMIChange}
        />
      )}

      {/* Guarantor */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Guarantor & Collateral</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Guarantor Name</label>
            <input className={inputClass} value={form.guarantor_name} onChange={(e) => handleChange("guarantor_name", e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className={labelClass}>Relation</label>
            <select className={inputClass} value={form.guarantor_relation} onChange={(e) => handleChange("guarantor_relation", e.target.value)}>
              <option value="">Select relation</option>
              <option value="spouse">Spouse</option>
              <option value="father">Father</option>
              <option value="mother">Mother</option>
              <option value="son">Son</option>
              <option value="daughter">Daughter</option>
              <option value="brother">Brother</option>
              <option value="sister">Sister</option>
              <option value="friend">Friend</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Date of Birth</label>
            <input className={inputClass} type="date" value={form.guarantor_dob} onChange={(e) => handleChange("guarantor_dob", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Mobile Number</label>
            <input className={inputClass} value={form.guarantor_phone} onChange={(e) => handleChange("guarantor_phone", e.target.value)} placeholder="10-digit mobile number" maxLength={10} />
          </div>
          <div>
            <label className={labelClass}>Aadhar Number</label>
            <input className={inputClass} value={form.guarantor_aadhar} onChange={(e) => handleChange("guarantor_aadhar", e.target.value)} placeholder="12-digit Aadhar" maxLength={12} />
          </div>
          <div>
            <label className={labelClass}>PAN Number</label>
            <input className={inputClass} value={form.guarantor_pan} onChange={(e) => handleChange("guarantor_pan", e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Address</label>
            <textarea className={inputClass} rows={2} value={form.guarantor_address} onChange={(e) => handleChange("guarantor_address", e.target.value)} placeholder="Guarantor's residential address" />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Collateral / Security</label>
            <input className={inputClass} value={form.collateral} onChange={(e) => handleChange("collateral", e.target.value)} placeholder="e.g. Gold, Property, FD" />
          </div>
        </div>
      </div>

      {/* Repayment Schedule Preview */}
      {form.amount > 0 && form.interest_rate > 0 && form.tenure_months > 0 && (
        <RepaymentSchedule
          principal={form.amount}
          rate={form.interest_rate}
          tenure={form.tenure_months}
          type={form.repayment_type === "flat" ? "flat" : "reducing"}
        />
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {loading ? "Submitting..." : "Submit Application"}
        </button>
      </div>
    </form>
  );
}
