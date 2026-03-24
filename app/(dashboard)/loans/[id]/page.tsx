"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RepaymentSchedule } from "@/components/loans/RepaymentSchedule";
import { RecordPaymentModal } from "@/components/loans/RecordPaymentModal";
import { formatINR, formatDate } from "@/lib/utils";
import { CheckCircle, CreditCard, User, Lock } from "lucide-react";
import type { Loan } from "@/lib/hooks/useLoans";
import { useRole } from "@/lib/hooks/useRole";

export default function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(false);
  const [currentInstallment, setCurrentInstallment] = useState(1);
  const supabase = createClient();
  const { canApproveLoan, canDisburseLoan, canRecordPayment, role, loading: roleLoading } = useRole();

  useEffect(() => {
    supabase
      .from("loans")
      .select("*, member:members(name, phone, member_id)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setLoan((data as any) as Loan);
        setLoading(false);
      });
  }, [id, supabase]);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading loan details...</div>;
  if (!loan) return <div className="text-center py-20 text-slate-500">Loan not found. <Link href="/loans" className="text-blue-600 underline">Go back</Link></div>;

  const handleApprove = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("loans") as any).update({ status: "approved" }).eq("id", id);
    setLoan((prev) => prev ? { ...prev, status: "approved" } : prev);
  };

  const handleDisburse = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("loans") as any).update({
      status: "disbursed",
      disbursed_amount: loan.amount,
      disbursed_at: new Date().toISOString(),
    }).eq("id", id);
    setLoan((prev) => prev ? { ...prev, status: "disbursed" } : prev);
  };

  return (
    <div className="space-y-5">
      <PageHeader title={`Loan: ${loan.loan_id}`} description={loan.purpose}>
        {/* Pending → Approve (manager + admin) */}
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

        {/* Approved → Disburse (admin only) */}
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

        {/* Disbursed → Record Payment */}
        {loan.status === "disbursed" && canRecordPayment && (
          <button onClick={() => setPaymentModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">
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
                ["Loan ID", loan.loan_id],
                ["Loan Type", loan.loan_type.replace(/_/g, " ")],
                ["Amount", formatINR(loan.amount)],
                ["Interest Rate", `${loan.interest_rate}% p.a.`],
                ["Tenure", `${loan.tenure_months} months`],
                ["EMI", formatINR(loan.emi_amount)],
                ["Outstanding", formatINR(loan.outstanding_balance)],
                ["Applied On", formatDate(loan.created_at)],
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
                <div className="flex justify-between">
                  <span className="text-slate-500">Name</span>
                  <span className="font-medium text-slate-800">{loan.guarantor_name}</span>
                </div>
                {loan.guarantor_phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone</span>
                    <span className="font-medium text-slate-800">{loan.guarantor_phone}</span>
                  </div>
                )}
                {loan.collateral && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Collateral</span>
                    <span className="font-medium text-slate-800">{loan.collateral}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right — Repayment Schedule */}
        <div className="lg:col-span-2">
          <RepaymentSchedule
            principal={loan.amount}
            rate={loan.interest_rate}
            tenure={loan.tenure_months}
            type={loan.repayment_type === "flat" ? "flat" : "reducing"}
            startDate={loan.disbursed_at ?? undefined}
          />
        </div>
      </div>

      <RecordPaymentModal
        open={paymentModal}
        onClose={() => setPaymentModal(false)}
        loanId={loan.id}
        emiAmount={loan.emi_amount}
        installmentNo={currentInstallment}
        dueDate={loan.next_due_date ?? ""}
        onSuccess={() => {}}
      />
    </div>
  );
}
