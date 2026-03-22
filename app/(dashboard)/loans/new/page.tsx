import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoanApplicationForm } from "@/components/loans/LoanApplicationForm";

export default function NewLoanPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="New Loan Application"
        description="Submit a new loan application for a member"
      />
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading form...</div>}>
        <LoanApplicationForm />
      </Suspense>
    </div>
  );
}
