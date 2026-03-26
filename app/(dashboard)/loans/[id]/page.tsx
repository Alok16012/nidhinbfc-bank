"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RepaymentSchedule } from "@/components/loans/RepaymentSchedule";
import { RecordPaymentModal } from "@/components/loans/RecordPaymentModal";
import { formatINR, formatDate } from "@/lib/utils";
import { CheckCircle, Lock } from "lucide-react";
import type { Loan } from "@/lib/hooks/useLoans";
import { useRole } from "@/lib/hooks/useRole";
import type { EMIFrequency } from "@/lib/utils/emi-calculator";

interface SelectedInstallment {
  no: number;
  dueDate: string;
  emi: number;
  principal: number;
  interest: number;
}

export default function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loan, setLoan]                         = useState<Loan | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [paymentModal, setPaymentModal]         = useState(false);
  const [paidInstallments, setPaidInstallments] = useState<number[]>([]);
  const [selected, setSelected]                 = useState<SelectedInstallment | null>(null);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("loans") as any).update({
      status:          "disbursed",
      disbursed_amount: loan.amount,
      disbursed_at:    new Date().toISOString(),
    }).eq("id", id);
    setLoan((prev) => prev ? { ...prev, status: "disbursed" } : prev);
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
            <button onClick={handleDisburse} className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">
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
                ["Applied On",   formatDate(loan.created_at)],
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
    </div>
  );
}
