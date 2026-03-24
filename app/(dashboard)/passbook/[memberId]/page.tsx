"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { PassbookTable } from "@/components/passbook/PassbookTable";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { formatINR, formatDate } from "@/lib/utils";
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
  const [pdfLoading, setPdfLoading] = useState(false);

  const downloadPDF = async () => {
    if (!member) return;
    setPdfLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfMake = (await import("pdfmake/build/pdfmake")) as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfFonts = (await import("pdfmake/build/vfs_fonts")) as any;
      pdfMake.vfs = pdfFonts.vfs ?? pdfFonts.default?.vfs;

      const tableBody = [
        [
          { text: "Date", style: "tableHeader" },
          { text: "Transaction", style: "tableHeader" },
          { text: "Narration", style: "tableHeader" },
          { text: "Debit (Dr.)", style: "tableHeader", alignment: "right" },
          { text: "Credit (Cr.)", style: "tableHeader", alignment: "right" },
          { text: "Balance", style: "tableHeader", alignment: "right" },
        ],
        ...entries.map((e) => ([
          { text: formatDate(e.transaction_date), fontSize: 9 },
          { text: (e.type ?? "").replace(/_/g, " "), fontSize: 9 },
          { text: e.narration ?? "", fontSize: 9 },
          { text: e.debit > 0 ? formatINR(e.debit) : "—", fontSize: 9, alignment: "right", color: e.debit > 0 ? "#dc2626" : "#64748b" },
          { text: e.credit > 0 ? formatINR(e.credit) : "—", fontSize: 9, alignment: "right", color: e.credit > 0 ? "#16a34a" : "#64748b" },
          { text: formatINR(e.balance), fontSize: 9, alignment: "right", bold: true },
        ])),
        [
          { text: "Totals", colSpan: 3, bold: true, fontSize: 9, fillColor: "#f1f5f9" },
          {}, {},
          { text: formatINR(totalDebit), bold: true, alignment: "right", fontSize: 9, color: "#dc2626", fillColor: "#f1f5f9" },
          { text: formatINR(totalCredit), bold: true, alignment: "right", fontSize: 9, color: "#16a34a", fillColor: "#f1f5f9" },
          { text: formatINR(balance), bold: true, alignment: "right", fontSize: 9, fillColor: "#f1f5f9" },
        ],
      ];

      const docDef: any = {
        pageSize: "A4",
        pageMargins: [30, 30, 30, 30],
        content: [
          { text: "Grihsevak Nidhi Limited", style: "title", alignment: "center" },
          { text: "Member Passbook Statement", style: "subtitle", alignment: "center" },
          { canvas: [{ type: "line", x1: 0, y1: 4, x2: 535, y2: 4, lineWidth: 1, lineColor: "#1e293b" }], margin: [0, 0, 0, 8] },
          {
            columns: [
              { text: [{ text: "Member: ", bold: true }, member.name, "\n", { text: "Member ID: ", bold: true }, member.member_id], fontSize: 10 },
              { text: [{ text: "Phone: ", bold: true }, member.phone || "—", "\n", { text: "Date: ", bold: true }, new Date().toLocaleDateString("en-IN")], fontSize: 10, alignment: "right" },
            ],
            margin: [0, 0, 0, 8],
          },
          {
            table: { widths: ["*", "*", "*"], body: [[
              { text: [`Total Credit: `, { text: formatINR(totalCredit), bold: true, color: "#16a34a" }], fontSize: 10 },
              { text: [`Total Debit: `, { text: formatINR(totalDebit), bold: true, color: "#dc2626" }], fontSize: 10 },
              { text: [`Balance: `, { text: formatINR(balance), bold: true, color: "#1d4ed8" }], fontSize: 10 },
            ]] },
            layout: "lightHorizontalLines",
            margin: [0, 0, 0, 12],
          },
          {
            table: {
              headerRows: 1,
              widths: [55, 70, "*", 55, 55, 55],
              body: tableBody,
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0,
              hLineColor: () => "#e2e8f0",
              fillColor: (i: number) => i === 0 ? "#1e293b" : i % 2 === 0 ? "#f8fafc" : null,
            },
          },
          { text: `Generated on ${new Date().toLocaleString("en-IN")} · Grihsevak Nidhi Limited`, fontSize: 8, color: "#94a3b8", alignment: "center", margin: [0, 12, 0, 0] },
        ],
        styles: {
          title: { fontSize: 16, bold: true, color: "#0f172a", margin: [0, 0, 0, 4] },
          subtitle: { fontSize: 11, color: "#475569", margin: [0, 0, 0, 4] },
          tableHeader: { bold: true, fontSize: 9, color: "#ffffff" },
        },
      };

      pdfMake.createPdf(docDef).download(`passbook-${member.member_id}-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error(err);
    }
    setPdfLoading(false);
  };

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
            onClick={downloadPDF}
            disabled={pdfLoading || loading || !member}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {pdfLoading ? "Generating..." : "Download PDF"}
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
