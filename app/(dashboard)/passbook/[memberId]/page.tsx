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
      .order("transaction_date", { ascending: true });

    if (dateRange) {
      query = query.gte("transaction_date", dateRange.from).lte("transaction_date", dateRange.to);
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
      {/* No-print: page header with controls */}
      <div className="no-print">
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
      </div>

      {/* Printable area */}
      <div id="passbook-print">
        {/* Print-only header */}
        <div className="print-only mb-6">
          <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
            <h1 className="text-xl font-bold text-slate-900">Grihsevak Nidhi Limited</h1>
            <p className="text-sm text-slate-600 mt-1">Member Passbook Statement</p>
          </div>
          <div className="flex justify-between text-sm text-slate-700 mb-2">
            <div>
              <p><span className="font-semibold">Member:</span> {member?.name}</p>
              <p><span className="font-semibold">Member ID:</span> {member?.member_id}</p>
            </div>
            <div className="text-right">
              <p><span className="font-semibold">Phone:</span> {member?.phone}</p>
              <p><span className="font-semibold">Date:</span> {new Date().toLocaleDateString("en-IN")}</p>
            </div>
          </div>
          <div className="flex gap-8 text-sm border border-slate-200 rounded p-3 bg-slate-50">
            <div><span className="font-semibold">Total Credit:</span> <span className="text-emerald-700 font-bold">{formatINR(totalCredit)}</span></div>
            <div><span className="font-semibold">Total Debit:</span> <span className="text-red-600 font-bold">{formatINR(totalDebit)}</span></div>
            <div><span className="font-semibold">Balance:</span> <span className="text-blue-700 font-bold">{formatINR(balance)}</span></div>
          </div>
        </div>

        {/* Summary cards — hidden in print (shown via print-only header above) */}
        <div className="no-print grid grid-cols-3 gap-4 mb-5">
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
    </div>
  );
}
