"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateLoanID, formatINR } from "@/lib/utils";
import { useMembers } from "@/lib/hooks/useMembers";
import { SearchCombobox } from "@/components/shared/SearchCombobox";
import { EMICalculator } from "./EMICalculator";
import { RepaymentSchedule } from "./RepaymentSchedule";
import { Upload, Loader2, X as CloseIcon, CreditCard, FileText } from "lucide-react";
import type { EMIFrequency } from "@/lib/utils/emi-calculator";

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
    emi_frequency: "monthly" as EMIFrequency,
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
    guarantor_aadhar_url: "",
    guarantor_aadhar_back_url: "",
    guarantor_pan_url: "",
    collateral: "",
  });

  const [emiAmount, setEmiAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: "guarantor_aadhar_url" | "guarantor_aadhar_back_url" | "guarantor_pan_url"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading((p) => ({ ...p, [field]: true }));
    try {
      const ext = file.name.split(".").pop();
      const path = `guarantor-${field}-${Math.random()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);
      setForm((p) => ({ ...p, [field]: publicUrl }));
    } catch (err: any) {
      setError(`Upload error: ${err.message}`);
    } finally {
      setUploading((p) => ({ ...p, [field]: false }));
    }
  };

  const processingFee = form.amount > 0 ? Math.round(form.amount * (form.processing_fee_percent / 100)) : 0;
  const gstOnFee = Math.round(processingFee * (form.gst_percent / 100));
  const disbursedAmount = form.amount - processingFee - gstOnFee;

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEMIChange = useCallback((emi: number) => setEmiAmount(emi), []);

  // Deposit-based collateral types — loan is blocked without one of these
  const DEPOSIT_COLLATERALS = ["fd", "rd", "drd"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate: collateral must be selected and must be FD / RD / DRD
    if (!form.collateral) {
      setError("Collateral / Security is required to apply for a loan.");
      return;
    }
    if (!DEPOSIT_COLLATERALS.includes(form.collateral)) {
      setError("Loan can only be applied against FD, RD, or DRD deposit as collateral.");
      return;
    }

    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { processing_fee_percent, gst_percent, ...formData } = form;
    const { error } = await supabase.from("loans").insert({
      ...formData,
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
            <label className={labelClass}>EMI Frequency *</label>
            <select
              className={inputClass}
              value={form.emi_frequency}
              onChange={(e) => handleChange("emi_frequency", e.target.value as EMIFrequency)}
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">
              {form.emi_frequency === "daily"   && `${form.tenure_months * 30} daily installments`}
              {form.emi_frequency === "weekly"  && `${form.tenure_months * 4} weekly installments`}
              {form.emi_frequency === "monthly" && `${form.tenure_months} monthly installments`}
            </p>
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
          frequency={form.emi_frequency}
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

          {/* Guarantor Documents */}
          <div className="md:col-span-2 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-slate-700">Guarantor KYC Documents</span>
            </div>

            {/* Aadhar Front + Back */}
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-500 mb-2">Aadhar Card <span className="text-slate-400">(Front &amp; Back)</span></p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Aadhar Front */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Front Side</label>
                  {form.guarantor_aadhar_url ? (
                    <div className="relative rounded-lg overflow-hidden border border-blue-200">
                      <img src={form.guarantor_aadhar_url} alt="Guarantor Aadhar Front" className="w-full h-28 object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-end p-2">
                        <button type="button" onClick={() => handleChange("guarantor_aadhar_url", "")} className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center">
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-blue-600/80 text-white text-xs">✓ Front Uploaded</div>
                    </div>
                  ) : (
                    <>
                      <input type="file" className="hidden" id="g-aadhar-front" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, "guarantor_aadhar_url")} disabled={uploading.guarantor_aadhar_url} />
                      <label htmlFor="g-aadhar-front" className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer min-h-[7rem]">
                        {uploading.guarantor_aadhar_url ? <Loader2 className="h-5 w-5 text-blue-500 animate-spin" /> : <Upload className="h-5 w-5 text-blue-400" />}
                        <span className="text-xs text-slate-500">{uploading.guarantor_aadhar_url ? "Uploading..." : "Aadhar Front"}</span>
                      </label>
                    </>
                  )}
                </div>
                {/* Aadhar Back */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Back Side</label>
                  {form.guarantor_aadhar_back_url ? (
                    <div className="relative rounded-lg overflow-hidden border border-blue-200">
                      <img src={form.guarantor_aadhar_back_url} alt="Guarantor Aadhar Back" className="w-full h-28 object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-end p-2">
                        <button type="button" onClick={() => handleChange("guarantor_aadhar_back_url", "")} className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center">
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-blue-600/80 text-white text-xs">✓ Back Uploaded</div>
                    </div>
                  ) : (
                    <>
                      <input type="file" className="hidden" id="g-aadhar-back" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, "guarantor_aadhar_back_url")} disabled={uploading.guarantor_aadhar_back_url} />
                      <label htmlFor="g-aadhar-back" className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer min-h-[7rem]">
                        {uploading.guarantor_aadhar_back_url ? <Loader2 className="h-5 w-5 text-blue-500 animate-spin" /> : <Upload className="h-5 w-5 text-blue-400" />}
                        <span className="text-xs text-slate-500">{uploading.guarantor_aadhar_back_url ? "Uploading..." : "Aadhar Back"}</span>
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* PAN Card */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">PAN Card</p>
              {form.guarantor_pan_url ? (
                <div className="relative rounded-lg overflow-hidden border border-purple-200 max-w-xs">
                  <img src={form.guarantor_pan_url} alt="Guarantor PAN" className="w-full h-28 object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-end p-2">
                    <button type="button" onClick={() => handleChange("guarantor_pan_url", "")} className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center">
                      <CloseIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-purple-600/80 text-white text-xs">✓ PAN Uploaded</div>
                </div>
              ) : (
                <div className="max-w-xs">
                  <input type="file" className="hidden" id="g-pan" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, "guarantor_pan_url")} disabled={uploading.guarantor_pan_url} />
                  <label htmlFor="g-pan" className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border-2 border-dashed border-purple-200 hover:border-purple-400 hover:bg-purple-50 cursor-pointer min-h-[7rem]">
                    {uploading.guarantor_pan_url ? <Loader2 className="h-5 w-5 text-purple-500 animate-spin" /> : <Upload className="h-5 w-5 text-purple-400" />}
                    <span className="text-xs text-slate-500">{uploading.guarantor_pan_url ? "Uploading..." : "Upload PAN Card"}</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>
              Collateral / Security <span className="text-red-500">*</span>
            </label>
            <select
              className={inputClass}
              value={form.collateral}
              onChange={(e) => handleChange("collateral", e.target.value)}
              required
            >
              <option value="">-- Select Collateral --</option>
              <optgroup label="Deposit-Based (Required)">
                <option value="fd">Fixed Deposit (FD)</option>
                <option value="rd">Recurring Deposit (RD)</option>
                <option value="drd">Daily Recurring Deposit (DRD)</option>
              </optgroup>
              <optgroup label="Other Security">
                <option value="gold">Gold / Jewellery</option>
                <option value="property">Property / Land</option>
                <option value="vehicle">Vehicle</option>
                <option value="insurance">Insurance Policy</option>
                <option value="other">Other</option>
              </optgroup>
            </select>
            {form.collateral && !["fd", "rd", "drd"].includes(form.collateral) && (
              <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                ⚠️ Loan can only be submitted with FD, RD, or DRD as collateral.
              </p>
            )}
            {!form.collateral && (
              <p className="mt-1.5 text-xs text-slate-400">
                Loan requires FD / RD / DRD deposit as security
              </p>
            )}
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
          frequency={form.emi_frequency}
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
