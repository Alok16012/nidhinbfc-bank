"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RepaymentSchedule } from "@/components/loans/RepaymentSchedule";
import { RecordPaymentModal } from "@/components/loans/RecordPaymentModal";
import { formatINR, formatDate } from "@/lib/utils";
import { CheckCircle, Lock, X as CloseIcon } from "lucide-react";
import type { Loan } from "@/lib/hooks/useLoans";
import { useRole } from "@/lib/hooks/useRole";
import { calculateEMI, calculateFlatEMI } from "@/lib/utils/emi-calculator";
import type { EMIFrequency } from "@/lib/utils/emi-calculator";

interface SelectedInstallment {
  no: number;
  dueDate: string;
  emi: number;
  principal: number;
  interest: number;
}

// "YYYY-MM-DD" → local Date anchored at noon, so schedule dates never shift a
// day when the calculator converts them back with toISOString().
function parseLocalDate(value: string): Date | null {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12);
}

function addPeriod(date: Date, frequency: EMIFrequency): Date {
  const d = new Date(date);
  if (frequency === "daily") d.setDate(d.getDate() + 1);
  else if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

export default function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loan, setLoan]                         = useState<Loan | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [paymentModal, setPaymentModal]         = useState(false);
  const [paidInstallments, setPaidInstallments] = useState<number[]>([]);
  const [selected, setSelected]                 = useState<SelectedInstallment | null>(null);
  const [disburseModal, setDisburseModal]       = useState(false);
  const [disburseDate, setDisburseDate]         = useState(new Date().toISOString().split("T")[0]);
  const [disburseLoading, setDisburseLoading]   = useState(false);
  const [disburseError, setDisburseError]       = useState("");
  const supabase = createClient();
  const { canApproveLoan, canDisburseLoan, canRecordPayment } = useRole();

  const fetchLoan = useCallback(async () => {
    const { data } = await supabase
      .from("loans")
      .select("*, member:members(name, phone, member_id)")
      .eq("id", id)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (data) setLoan((data as any) as Loan);
    setLoading(false);
  }, [id, supabase]);

  const fetchPaidInstallments = useCallback(async () => {
    const { data } = await supabase
      .from("loan_repayments")
      .select("installment_no")
      .eq("loan_id", id)
      .eq("status", "paid");
    if (data) setPaidInstallments(data.map((r: any) => r.installment_no));
  }, [id, supabase]);

  useEffect(() => { fetchLoan(); }, [fetchLoan]);
  useEffect(() => { fetchPaidInstallments(); }, [fetchPaidInstallments]);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading loan details...</div>;
  if (!loan)   return <div className="text-center py-20 text-slate-500">Loan not found. <Link href="/loans" className="text-blue-600 underline">Go back</Link></div>;

  const handleApprove = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("loans") as any).update({ status: "approved" }).eq("id", id);
    setLoan((prev) => prev ? { ...prev, status: "approved" } : prev);
  };

  const handleDisburse = async () => {
    setDisburseError("");
    setDisburseLoading(true);

    const startDate = parseLocalDate(disburseDate);
    if (!startDate) {
      setDisburseError("Please pick a valid disbursement date.");
      setDisburseLoading(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from("loans") as any).update({
      status:           "disbursed",
      disbursed_amount: loan.amount,
      disbursed_at:     startDate.toISOString(),
      disbursed_date:   disburseDate,
      outstanding_balance: loan.amount,
      principal_outstanding: loan.amount,
    }).eq("id", id);

    if (updateError) {
      setDisburseError(updateError.message);
      setDisburseLoading(false);
      return;
    }

    // Generate full repayment schedule and insert into loan_repayments
    try {
      const freq = emiFrequency;
      const result = (loan as any).calculation_type === "flat"
        ? calculateFlatEMI(loan.amount, loan.interest_rate, loan.tenure_months, startDate, freq)
        : calculateEMI(loan.amount, loan.interest_rate, loan.tenure_months, startDate, freq);

      const rows = result.schedule.map((s) => ({
        loan_id:          id,
        member_id:        (loan as any).member_id,
        installment_no:   s.installmentNo,
        due_date:         s.dueDate,
        emi_amount:       s.emi,
        principal_amount: s.principal,
        interest_amount:  s.interest,
        principal_due:    s.principal,
        interest_due:     s.interest,
        total_amount:     s.emi,
        status:           "pending",
      }));

      // Insert in chunks of 500 to avoid payload limits
      for (let i = 0; i < rows.length; i += 500) {
        await supabase.from("loan_repayments").insert(rows.slice(i, i + 500));
      }
    } catch (e) {
      console.error("Schedule generation error:", e);
    }

    setDisburseLoading(false);
    setDisburseModal(false);
    fetchLoan();
    fetchPaidInstallments();
  };

  const handlePayClick = (no: number, dueDate: string, emi: number, principal: number, interest: number) => {
    setSelected({ no, dueDate, emi, principal, interest });
    setPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    fetchLoan();
    fetchPaidInstallments();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emiFrequency: EMIFrequency = ((loan as any).emi_frequency ?? "monthly") as EMIFrequency;

  const firstDueDate = (() => {
    const start = parseLocalDate(disburseDate);
    if (!start) return null;
    return addPeriod(start, emiFrequency).toISOString().split("T")[0];
  })();

  return (
    <div className="space-y-5">
      <PageHeader title={`Loan: ${loan.loan_id}`} description={loan.purpose}>
        {/* Pending → Approve */}
        {loan.status === "pending" && (
          canApproveLoan ? (
            <button onClick={handleApprove} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              Approve Loan
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-400 text-sm rounded-lg cursor-not-allowed">
              <Lock className="h-3.5 w-3.5" /> Approval: Manager Only
            </div>
          )
        )}

        {/* Approved → Disburse */}
        {loan.status === "approved" && (
          canDisburseLoan ? (
            <button
              onClick={() => {
                setDisburseError("");
                setDisburseDate(new Date().toISOString().split("T")[0]);
                setDisburseModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
            >
              Disburse Loan
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-600 text-sm rounded-lg cursor-not-allowed">
              <Lock className="h-3.5 w-3.5" /> Disbursement: Admin Only
            </div>
          )
        )}

        {/* Disbursed → Quick Record Payment (header button) */}
        {loan.status === "disbursed" && canRecordPayment && (
          <button
            onClick={() => {
              setSelected(null);
              setPaymentModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
          >
            <CheckCircle className="h-4 w-4" />
            Record Payment
          </button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — Loan Info */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Loan Status</h3>
              <StatusBadge status={loan.status} />
            </div>
            <div className="space-y-2.5 text-sm">
              {[
                ["Loan ID",      loan.loan_id],
                ["Loan Type",    loan.loan_type.replace(/_/g, " ")],
                ["Amount",       formatINR(loan.amount)],
                ["Interest Rate",`${loan.interest_rate}% p.a.`],
                ["Tenure",       `${loan.tenure_months} months`],
                ["EMI Frequency",emiFrequency.charAt(0).toUpperCase() + emiFrequency.slice(1)],
                ["EMI Amount",   formatINR(loan.emi_amount)],
                ["Outstanding",  formatINR(loan.outstanding_balance)],
                ["Paid",         `${paidInstallments.length} installment(s)`],
                ["Loan Date",    formatDate(loan.applied_date ?? loan.created_at)],
                loan.disbursed_at ? ["Disbursed On", formatDate(loan.disbursed_at)] : null,
              ].filter(Boolean).map((entry) => {
                const [label, value] = entry as [string, string];
                return (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-800 capitalize">{value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Member */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Member</h3>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                {loan.member?.name?.[0] ?? "?"}
              </div>
              <div>
                <p className="font-medium text-slate-800">{loan.member?.name}</p>
                <p className="text-xs text-slate-500">{loan.member?.member_id} · {loan.member?.phone}</p>
              </div>
            </div>
            <div className="mt-3">
              <Link href={`/members/${loan.member_id}`} className="text-xs text-blue-600 hover:underline">
                View Member Profile →
              </Link>
            </div>
          </div>

          {/* Guarantor */}
          {loan.guarantor_name && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Guarantor</h3>
              <div className="space-y-2 text-sm">
                {[
                  ["Name",      loan.guarantor_name],
                  loan.guarantor_phone ? ["Phone", loan.guarantor_phone] : null,
                  loan.collateral      ? ["Collateral", loan.collateral.toUpperCase()] : null,
                ].filter(Boolean).map((e) => {
                  const [l, v] = e as [string, string];
                  return (
                    <div key={l} className="flex justify-between">
                      <span className="text-slate-500">{l}</span>
                      <span className="font-medium text-slate-800">{v}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right — Repayment Schedule (with Pay buttons) */}
        <div className="lg:col-span-2">
          <RepaymentSchedule
            principal={loan.amount}
            rate={loan.interest_rate}
            tenure={loan.tenure_months}
            type={loan.repayment_type === "flat" ? "flat" : "reducing"}
            frequency={emiFrequency}
            paidInstallments={paidInstallments}
            startDate={loan.disbursed_at ?? undefined}
            onPayClick={loan.status === "disbursed" && canRecordPayment ? handlePayClick : undefined}
            loanNo={loan.loan_id}
            memberName={loan.member?.name}
          />
        </div>
      </div>

      {/* Payment Modal */}
      <RecordPaymentModal
        open={paymentModal}
        onClose={() => { setPaymentModal(false); setSelected(null); }}
        loanId={loan.id}
        memberId={loan.member_id}
        emiAmount={selected?.emi ?? loan.emi_amount}
        installmentNo={selected?.no ?? (paidInstallments.length + 1)}
        dueDate={selected?.dueDate ?? loan.next_due_date ?? ""}
        principal={selected?.principal ?? 0}
        interest={selected?.interest ?? 0}
        onSuccess={handlePaymentSuccess}
      />

      {/* Disbursement Modal */}
      {disburseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Disburse Loan</h3>
              <button
                onClick={() => { setDisburseModal(false); setDisburseError(""); }}
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <CloseIcon className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {disburseError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{disburseError}</div>
              )}

              <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Loan Amount</span>
                  <span className="font-semibold text-slate-800">{formatINR(loan.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Loan Date</span>
                  <span className="text-slate-700">{formatDate(loan.applied_date ?? loan.created_at)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Disbursement Date *</label>
                <input
                  type="date"
                  required
                  min={loan.applied_date ?? undefined}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={disburseDate}
                  onChange={(e) => setDisburseDate(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">
                  The EMI schedule is generated from this date — back-date it for loans already given out
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-emerald-700">First EMI Due</span>
                  <span className="font-semibold text-emerald-800">{firstDueDate ? formatDate(firstDueDate) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Installments</span>
                  <span className="text-emerald-800">
                    {emiFrequency === "daily"   && `${loan.tenure_months * 30} daily`}
                    {emiFrequency === "weekly"  && `${loan.tenure_months * 4} weekly`}
                    {emiFrequency === "monthly" && `${loan.tenure_months} monthly`}
                    {" "}× {formatINR(loan.emi_amount)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setDisburseModal(false); setDisburseError(""); }}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDisburse}
                  disabled={disburseLoading || !disburseDate}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {disburseLoading ? "Disbursing..." : "Confirm & Disburse"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
