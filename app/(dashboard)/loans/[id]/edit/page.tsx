"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoanApplicationForm } from "@/components/loans/LoanApplicationForm";

export default function EditLoanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const [loan, setLoan] = useState<any>(undefined);

  useEffect(() => {
    supabase.from("loans").select("*").eq("id", id).maybeSingle()
      .then(({ data }) => setLoan(data ?? null));
  }, [id, supabase]);

  if (loan === undefined) return <div className="text-center py-20 text-slate-400">Loading...</div>;
  if (!loan) return <div className="text-center py-20 text-slate-500">Loan not found. <Link href="/loans" className="text-blue-600 underline">Back</Link></div>;

  return (
    <div className="space-y-5">
      <PageHeader title="Edit Loan" description={`${loan.loan_id ?? loan.loan_no} · ${loan.status}`} />
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading form...</div>}>
        <LoanApplicationForm loan={loan} />
      </Suspense>
    </div>
  );
}
