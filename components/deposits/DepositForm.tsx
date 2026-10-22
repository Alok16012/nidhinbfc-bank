"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateDepositID } from "@/lib/utils";
import { useMembers } from "@/lib/hooks/useMembers";
import { useSettings } from "@/lib/hooks/useSettings";
import { SearchCombobox } from "@/components/shared/SearchCombobox";
import { calculateFDInterest, calculateRDMaturity, calculateDRDMaturity } from "@/lib/utils/interest-calculator";
import { formatINR, formatDate } from "@/lib/utils";
import { notify } from "@/lib/notify";

// Without `deposit` this opens a new account. With it, it edits that account.
// Every field can be corrected; when the member, type, amount or date change,
// the opening passbook entry and the account balance are corrected with it,
// and the maturity date/amount are recalculated.
export function DepositForm({ deposit }: { deposit?: any } = {}) {
  const editing = !!deposit;
  const inFlight = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { members } = useMembers();
  const { getDepositRate, loading: settingsLoading } = useSettings();

  const [form, setForm] = useState(deposit ? {
    member_id: deposit.member_id ?? "",
    deposit_type: deposit.deposit_type ?? deposit.type ?? "savings",
    amount: Number(deposit.amount) || 0,
    interest_rate: Number(deposit.interest_rate) || 0,
    tenure_months: Number(deposit.tenure_months) || 12,
    open_date: String(deposit.open_date ?? deposit.created_at ?? new Date().toISOString()).split("T")[0],
    nominee_name: deposit.nominee_name ?? "",
    nominee_relation: deposit.nominee_relation ?? "",
  } : {
    member_id: searchParams.get("member") ?? "",
    deposit_type: "fd",
    amount: 0,
    interest_rate: 7,
    tenure_months: 12,
    open_date: new Date().toISOString().split("T")[0],
    nominee_name: "",
    nominee_relation: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasTenure = ["fd", "rd", "drd", "mis"].includes(form.deposit_type);

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
    if (!form.tenure_months || !form.open_date) return null;
    const [y, m, d] = form.open_date.split("-").map(Number);
    if (!y || !m || !d) return null;
    const mat = new Date(Date.UTC(y, m - 1, d));
    mat.setUTCMonth(mat.getUTCMonth() + form.tenure_months);
    return mat.toISOString().split("T")[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;          // a double tap must not create two deposits
    inFlight.current = true;
    setError("");
    setLoading(true);

    const matDate = maturityDate();
    const matAmount = preview?.maturityAmount ?? null;
    const typeLabel = form.deposit_type.toUpperCase();

    if (editing) {
      const oldAmount = Number(deposit.amount) || 0;
      const delta = form.amount - oldAmount;
      // The opening amount is part of the balance, so a corrected amount moves the balance by the same difference
      const newBalance = Math.max(0, (Number(deposit.current_balance) || 0) + delta);
      const memberChanged = form.member_id && form.member_id !== deposit.member_id;

      const { error } = await supabase.from("deposits").update({
        member_id: form.member_id,
        type: form.deposit_type,
        deposit_type: form.deposit_type,
        amount: form.amount,
        current_balance: newBalance,
        interest_rate: form.interest_rate,
        tenure_months: hasTenure ? form.tenure_months : null,
        open_date: form.open_date,
        nominee_name: form.nominee_name,
        nominee_relation: form.nominee_relation,
        maturity_date: hasTenure ? matDate : null,
        maturity_amount: hasTenure ? matAmount : null,
      }).eq("id", deposit.id);
      if (error) {
        setError(error.message); setLoading(false); inFlight.current = false;
        notify.error("Couldn't update deposit", error);
        return;
      }

      // Keep the passbook in step: the opening entry mirrors the deposit, and
      // every entry of this account follows the member if that was corrected.
      const ref = deposit.deposit_id ?? deposit.deposit_no;
      const { error: pbErr } = await supabase.from("passbook").update({
        member_id: form.member_id,
        transaction_date: form.open_date,
        credit: form.amount,
        balance: form.amount,
        narration: `${typeLabel} deposit opened — ${ref}`,
      }).eq("reference_id", deposit.id).eq("type", "deposit_credit").ilike("narration", "%deposit opened%");
      if (pbErr) notify.error("Deposit saved, but the passbook opening entry didn't update", pbErr);

      if (memberChanged) {
        const [{ error: e1 }, { error: e2 }] = await Promise.all([
          supabase.from("passbook").update({ member_id: form.member_id }).eq("reference_id", deposit.id).eq("reference_type", "deposit"),
          supabase.from("deposit_transactions").update({ member_id: form.member_id }).eq("deposit_id", deposit.id),
        ]);
        if (e1 || e2) notify.error("Deposit saved, but some entries still show the old member", e1 ?? e2);
      }

      notify.success("Deposit updated", ref);
      router.push(`/deposits/${deposit.id}`);
      router.refresh();
      return;
    }

    const depositId = generateDepositID();
    const { error } = await supabase.from("deposits").insert({
      ...form,
      type: form.deposit_type,
      deposit_id: depositId,
      current_balance: form.amount,
      status: "active",
      maturity_date: matDate,
      maturity_amount: matAmount,
    });

    if (error) {
      setError(error.message); setLoading(false); inFlight.current = false;
      notify.error("Couldn't open deposit", error);
      return;
    }
    notify.success("Deposit opened", depositId);
    router.push("/deposits");
    router.refresh();
  };

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Auto-fill when member changes
  useEffect(() => {
    if (!form.member_id) {
      setSelectedMember(null);
      return;
    }
    const member = members.find((m) => m.id === form.member_id);
    if (member) {
      setSelectedMember(member);
      // Auto-fill nominee if empty
      setForm(prev => ({
        ...prev,
        nominee_name: prev.nominee_name || member.nominee_name || "",
        nominee_relation: prev.nominee_relation || member.nominee_relation || "",
      }));
    }
  }, [form.member_id, members]);

  const memberOptions = members.map((m) => ({
    value: m.id,
    label: m.name,
    sub: `${m.member_id} · ${m.phone}`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
      {editing && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
          Editing <b>{deposit.deposit_id ?? deposit.deposit_no}</b>. Changes to the amount, type, date or member also correct the opening passbook entry; the maturity date and amount are recalculated from the new values.
        </div>
      )}

      {/* Member Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Member Selection</h3>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{editing ? "Member *" : "Select Member *"}</label>
            <SearchCombobox
              options={memberOptions}
              value={form.member_id}
              onChange={(v) => handleChange("member_id", v)}
              placeholder="Search by name, ID or mobile..."
            />
            {editing && <p className="text-xs text-slate-400 mt-1">Pick a different member only to correct a wrong entry — the passbook entries move with it.</p>}
          </div>

          {selectedMember && (
            <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm font-bold">
                {selectedMember.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-slate-800 truncate">{selectedMember.name}</p>
                  <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">{selectedMember.member_id}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  <p className="text-xs text-slate-500 flex items-center gap-1.5"><span className="font-semibold text-slate-400">Phone:</span> {selectedMember.phone}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate"><span className="font-semibold text-slate-400">Nominee:</span> {selectedMember.nominee_name || "N/A"}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 sm:col-span-2 truncate"><span className="font-semibold text-slate-400">Address:</span> {selectedMember.address}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Deposit Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <input className={inputClass} type="number" min={1} required value={form.amount || ""} onChange={(e) => handleChange("amount", parseFloat(e.target.value) || 0)} placeholder="e.g. 10000" />
            {editing && Number(deposit.amount) !== form.amount && (
              <p className="text-xs text-amber-600 mt-1">
                Balance will change from {formatINR(Number(deposit.current_balance) || 0)} to {formatINR(Math.max(0, (Number(deposit.current_balance) || 0) + form.amount - (Number(deposit.amount) || 0)))} and the opening passbook entry will be corrected.
              </p>
            )}
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
          <div>
            <label className={labelClass}>Deposit Date *</label>
            <input className={inputClass} type="date" required max={new Date().toISOString().split("T")[0]} value={form.open_date} onChange={(e) => handleChange("open_date", e.target.value)} />
            <p className="text-xs text-slate-400 mt-1">Date the deposit was actually received — back-dated entries allowed</p>
          </div>
        </div>
      </div>

      {/* Maturity Preview */}
      {preview && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-emerald-800 mb-3">Maturity Preview</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-slate-700">{formatINR(preview.totalDeposited)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total Deposit Amount</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-700">{formatINR(preview.maturityAmount)}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Maturity Amount</p>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-700">{formatINR(preview.interestEarned)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Interest Earned</p>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-700">{maturityDate() ? formatDate(maturityDate()!) : "—"}</p>
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
          {loading ? (editing ? "Saving..." : "Creating...") : (editing ? "Save Changes" : "Create Deposit")}
        </button>
      </div>
    </form>
  );
}
