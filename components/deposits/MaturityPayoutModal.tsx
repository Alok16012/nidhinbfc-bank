"use client";

import { useMemo, useRef, useState } from "react";
import { X as CloseIcon, BadgeCheck, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/notify";
import { formatINR, formatDate } from "@/lib/utils";

/* Pays out a matured FD / RD / DRD / MIS: credits the interest, records any
   deduction, debits the full payout and closes the account. Each step is a
   deposit_transactions row, so the passbook and day book pick it up. */

export interface PayoutDeposit {
  id: string;
  member_id: string;
  deposit_id?: string | null;
  deposit_no?: string | null;
  deposit_type?: string | null;
  type?: string | null;
  amount: number;
  current_balance?: number | null;
  tenure_months?: number | null;
  interest_rate?: number | null;
  maturity_date?: string | null;
  maturity_amount?: number | null;
  remarks?: string | null;
  member?: { name?: string | null } | null;
}

interface Props {
  deposit: PayoutDeposit;
  onClose: () => void;
  onSuccess?: () => void;
}

const today = () => new Date().toISOString().split("T")[0];
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Principal, expected total and default interest for a deposit. */
export function maturityBreakdown(d: PayoutDeposit) {
  const depType = String(d.deposit_type ?? d.type ?? "").toLowerCase();
  const isRecurring = depType === "rd" || depType === "drd";
  const tenure = Number(d.tenure_months) || 0;
  // RD/DRD: the balance is what was actually collected. FD/MIS: the principal.
  const balance = Number(d.current_balance) || 0;
  const principal = isRecurring ? balance : (balance > 0 ? balance : Number(d.amount) || 0);
  const expectedTotal = isRecurring
    ? (Number(d.amount) || 0) * (depType === "drd" ? tenure * 30 : tenure)
    : Number(d.amount) || 0;
  const fullInterest = Math.max(0, (Number(d.maturity_amount) || 0) - expectedTotal);
  // Installments missed on an RD/DRD earn proportionally less
  const share = isRecurring && expectedTotal > 0 ? Math.min(1, principal / expectedTotal) : 1;
  return { depType, isRecurring, principal, expectedTotal, interest: round2(fullInterest * share) };
}

export function MaturityPayoutModal({ deposit, onClose, onSuccess }: Props) {
  const supabase = createClient();
  const ref = deposit.deposit_id ?? deposit.deposit_no ?? "";
  const { depType, isRecurring, principal, expectedTotal, interest: defaultInterest } = useMemo(() => maturityBreakdown(deposit), [deposit]);

  const [date, setDate] = useState(today());
  const [interest, setInterest] = useState<number>(defaultInterest);
  const [deduction, setDeduction] = useState<number>(0);
  const [deductionNote, setDeductionNote] = useState("");
  const [mode, setMode] = useState("cash");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  const premature = !!deposit.maturity_date && date < deposit.maturity_date;
  const shortfall = isRecurring && principal < expectedTotal;
  const net = round2(principal + (interest || 0) - (deduction || 0));

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;           // a double tap must not pay twice
    if (net <= 0) { setError("Net payable must be more than zero."); return; }
    if (!date) { setError("Pick the payout date."); return; }
    inFlight.current = true;
    setSaving(true);
    setError("");

    const label = premature ? "Premature closure" : "Maturity";
    let running = principal;
    const rows: Record<string, unknown>[] = [];
    if (interest > 0) {
      running = round2(running + interest);
      rows.push({
        deposit_id: deposit.id, member_id: deposit.member_id, transaction_type: "interest",
        amount: interest, balance_after: running, date, payment_mode: "cash",
        narration: `${label} interest — ${ref}`,
      });
    }
    if (deduction > 0) {
      running = round2(running - deduction);
      rows.push({
        deposit_id: deposit.id, member_id: deposit.member_id, transaction_type: "penalty",
        amount: deduction, balance_after: running, date, payment_mode: "cash",
        narration: `Deduction on ${label.toLowerCase()}${deductionNote ? `: ${deductionNote}` : ""} — ${ref}`,
      });
    }
    rows.push({
      deposit_id: deposit.id, member_id: deposit.member_id, transaction_type: "maturity_payout",
      amount: net, balance_after: 0, date, payment_mode: mode,
      reference_no: reference || null,
      narration: `${label} payout — ${ref}${remarks ? ` (${remarks})` : ""}`,
    });

    try {
      // One insert, in order, so the passbook shows interest → deduction → payout
      const { error: txErr } = await supabase.from("deposit_transactions").insert(rows);
      if (txErr) throw txErr;

      const note = `${label} paid ${formatINR(net)} by ${mode.toUpperCase()} on ${formatDate(date)}`;
      const { error: depErr } = await supabase.from("deposits").update({
        status: premature ? "premature_closed" : "matured",
        current_balance: 0,
        interest_earned: interest || 0,
        close_date: date,
        remarks: deposit.remarks ? `${deposit.remarks}\n${note}` : note,
      }).eq("id", deposit.id);
      if (depErr) throw depErr;

      notify.success(`${label} paid`, `${formatINR(net)} · ${deposit.member?.name ?? ""} · ${ref}`);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err);
      setError(msg);
      notify.error("Couldn't record the payout", err);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Pay Maturity</h3>
            <p className="text-xs text-slate-500">{deposit.member?.name} · {ref} · {depType.toUpperCase()}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Close">
            <CloseIcon className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          {/* What the account looks like */}
          <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-500">{isRecurring ? "Collected so far" : "Principal"}</span><span className="font-semibold text-slate-800">{formatINR(principal)}</span></div>
            {isRecurring && (
              <div className="flex justify-between"><span className="text-slate-500">Expected total ({deposit.tenure_months} months)</span><span className="text-slate-700">{formatINR(expectedTotal)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-slate-500">Maturity date</span><span className="text-slate-700">{deposit.maturity_date ? formatDate(deposit.maturity_date) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Maturity amount (as per scheme)</span><span className="text-slate-700">{deposit.maturity_amount ? formatINR(deposit.maturity_amount) : "—"}</span></div>
          </div>

          {premature && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Payout date is before the maturity date, so this will be recorded as a <b>premature closure</b>. Adjust the interest as per your scheme rules.</span>
            </div>
          )}
          {shortfall && !premature && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Some installments were not collected. Interest below has been reduced in proportion; change it if your rules differ.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Payout Date *</label>
              <input className={inputClass} type="date" required max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Payment Mode *</label>
              <select className={inputClass} value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="neft">NEFT / Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Interest Paid (₹)</label>
              <input className={inputClass} type="number" min={0} step="0.01" value={interest} onChange={(e) => setInterest(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelClass}>Deduction (₹) <span className="text-slate-400 font-normal">TDS / penalty</span></label>
              <input className={inputClass} type="number" min={0} step="0.01" value={deduction} onChange={(e) => setDeduction(parseFloat(e.target.value) || 0)} />
            </div>
            {deduction > 0 && (
              <div className="sm:col-span-2">
                <label className={labelClass}>Reason for Deduction</label>
                <input className={inputClass} value={deductionNote} onChange={(e) => setDeductionNote(e.target.value)} placeholder="e.g. TDS, premature penalty" />
              </div>
            )}
            {mode !== "cash" && (
              <div className="sm:col-span-2">
                <label className={labelClass}>Reference No.</label>
                <input className={inputClass} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / cheque number" />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className={labelClass}>Remarks</label>
              <input className={inputClass} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          {/* Net payable */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex justify-between text-slate-700"><span>{isRecurring ? "Collected amount" : "Principal"}</span><span>{formatINR(principal)}</span></div>
            <div className="flex justify-between text-emerald-700"><span>+ Interest</span><span>{formatINR(interest || 0)}</span></div>
            {deduction > 0 && <div className="flex justify-between text-red-600"><span>− Deduction</span><span>{formatINR(deduction)}</span></div>}
            <div className="border-t border-emerald-200 pt-2 flex justify-between font-bold text-emerald-800 text-base">
              <span>Net Payable to Member</span><span>{formatINR(net)}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            This credits the interest, records the payout in the passbook and closes the account. It can&apos;t be undone from the app.
          </p>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving || net <= 0} className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
              <BadgeCheck className="h-4 w-4" /> {saving ? "Paying..." : `Pay ${formatINR(net)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
