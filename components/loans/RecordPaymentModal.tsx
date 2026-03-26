"use client";

import { useState } from "react";
import { X, IndianRupee } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/utils";

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  loanId: string;
  memberId?: string;
  emiAmount: number;
  installmentNo: number;
  dueDate: string;
  principal?: number;
  interest?: number;
  onSuccess?: () => void;
}

export function RecordPaymentModal({
  open, onClose, loanId, memberId = "",
  emiAmount, installmentNo, dueDate,
  principal = 0, interest = 0,
  onSuccess,
}: RecordPaymentModalProps) {
  const supabase = createClient();
  const [amount, setAmount]         = useState(emiAmount);
  const [paidDate, setPaidDate]     = useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [penalty, setPenalty]       = useState(0);
  const [remarks, setRemarks]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  if (!open) return null;

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Check if a record already exists for this installment
      const { data: existing } = await supabase
        .from("loan_repayments")
        .select("id")
        .eq("loan_id", loanId)
        .eq("installment_no", installmentNo)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error: upErr } = await supabase
          .from("loan_repayments")
          .update({
            paid_date:    paidDate,
            paid_amount:  amount,
            penalty:      penalty,
            total_amount: amount + penalty,
            status:       "paid",
            payment_mode: paymentMode,
            narration:    remarks,
          })
          .eq("id", existing.id);
        if (upErr) throw upErr;
      } else {
        // Insert new repayment record
        const { error: insErr } = await supabase
          .from("loan_repayments")
          .insert({
            loan_id:          loanId,
            member_id:        memberId,
            installment_no:   installmentNo,
            due_date:         dueDate || null,
            paid_date:        paidDate,
            paid_amount:      amount,
            emi_amount:       emiAmount,
            principal_amount: principal,
            interest_amount:  interest,
            penalty:          penalty,
            total_amount:     amount + penalty,
            status:           "paid",
            payment_mode:     paymentMode,
            narration:        remarks,
          });
        if (insErr) throw insErr;
      }

      // Reduce outstanding balance on the loan
      const { data: loanData } = await supabase
        .from("loans")
        .select("outstanding_balance, tenure_months")
        .eq("id", loanId)
        .single();

      if (loanData) {
        const newBalance = Math.max(0, (loanData.outstanding_balance ?? 0) - principal);
        await supabase
          .from("loans")
          .update({
            outstanding_balance: newBalance,
            total_paid: supabase.rpc as unknown as number, // will update via trigger
            ...(newBalance === 0 ? { status: "closed", closed_at: new Date().toISOString() } : {}),
          })
          .eq("id", loanId);
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Record EMI Payment</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600">Installment #{installmentNo}</p>
              <p className="text-sm font-medium text-blue-800">Due: {dueDate || "—"}</p>
              {principal > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Principal: {formatINR(principal)} · Interest: {formatINR(interest)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 text-xl font-bold text-blue-700">
              <IndianRupee className="h-5 w-5" />
              {emiAmount.toLocaleString("en-IN")}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount Received (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value))} className={inputClass} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Date</label>
            <input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} className={inputClass} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Mode</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className={inputClass}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="neft">NEFT / Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Penalty (₹)</label>
            <input type="number" value={penalty} onChange={(e) => setPenalty(parseFloat(e.target.value) || 0)} min={0} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Remarks</label>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className={inputClass} placeholder="Optional" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
              {loading ? "Recording..." : "Mark as Paid ✓"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
