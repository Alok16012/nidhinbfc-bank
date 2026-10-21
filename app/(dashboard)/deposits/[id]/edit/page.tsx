"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { DepositForm } from "@/components/deposits/DepositForm";

export default function EditDepositPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const [deposit, setDeposit] = useState<any>(undefined);

  useEffect(() => {
    supabase.from("deposits").select("*").eq("id", id).maybeSingle()
      .then(({ data }) => setDeposit(data ?? null));
  }, [id, supabase]);

  if (deposit === undefined) return <div className="text-center py-20 text-slate-400">Loading...</div>;
  if (!deposit) return <div className="text-center py-20 text-slate-500">Deposit not found. <Link href="/deposits" className="text-blue-600 underline">Back</Link></div>;

  return (
    <div className="space-y-5">
      <PageHeader title="Edit Deposit" description={`${deposit.deposit_id ?? deposit.deposit_no} · ${String(deposit.deposit_type ?? deposit.type ?? "").toUpperCase()}`} />
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading form...</div>}>
        <DepositForm deposit={deposit} />
      </Suspense>
    </div>
  );
}
