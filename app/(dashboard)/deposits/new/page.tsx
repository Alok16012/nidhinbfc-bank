import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DepositForm } from "@/components/deposits/DepositForm";

export default function NewDepositPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="New Deposit" description="Open a new deposit account for a member" />
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading form...</div>}>
        <DepositForm />
      </Suspense>
    </div>
  );
}
