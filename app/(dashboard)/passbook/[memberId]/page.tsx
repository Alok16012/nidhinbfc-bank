"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Printer, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { PassbookTable } from "@/components/passbook/PassbookTable";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { formatINR } from "@/lib/utils";
import type { DateRange } from "@/components/shared/DateRangePicker";

export default function PassbookPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = use(params);
  const [member, setMember] = useState<any | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("members").select("*").eq("id", memberId).single().then(({ data }) => setMember(data));
  }, [memberId, supabase]);

  useEffect(() => {
    let query = supabase
      .from("passbook")
      .select("*")
      .eq("member_id", memberId)
      .order("date", { ascending: true });

    if (dateRange) {
      query = query.gte("date", dateRange.from).lte("date", dateRange.to);
    }

    query.then(({ data }) => {
      setEntries(data || []);
      setLoading(false);
    });
  }, [memberId, dateRange, supabase]);

  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const balance = entries[entries.length - 1]?.balance ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Member Passbook"
        description={member ? `${member.name} · ${member.member_id}` : "Loading..."}
      >
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </PageHeader>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Credit", value: formatINR(totalCredit), color: "text-emerald-600" },
          { label: "Total Debit", value: formatINR(totalDebit), color: "text-red-500" },
          { label: "Current Balance", value: formatINR(balance), color: "text-blue-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <PassbookTable entries={entries} loading={loading} />
    </div>
  );
}
