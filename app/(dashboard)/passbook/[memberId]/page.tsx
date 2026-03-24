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
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");

      const doc = await PDFDocument.create();
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fontReg = await doc.embedFont(StandardFonts.Helvetica);
      // pdf-lib standard fonts don't support ₹; use Rs. instead
      const inr = (n: number) => formatINR(n).replace("₹", "Rs.");

      const addPage = () => {
        const p = doc.addPage([595, 842]); // A4
        return { p, y: 800 };
      };

      let { p, y } = addPage();
      const lm = 40, rm = 555, rowH = 16;

      const text = (page: typeof p, str: string, x: number, yy: number, size: number, font = fontReg, color = rgb(0, 0, 0)) => {
        page.drawText(str, { x, y: yy, size, font, color });
      };

      // Header
      text(p, "Grihsevak Nidhi Limited", 200, y, 16, fontBold);
      y -= 18;
      text(p, "Member Passbook Statement", 220, y, 11, fontReg, rgb(0.28, 0.33, 0.4));
      y -= 6;
      p.drawLine({ start: { x: lm, y }, end: { x: rm, y }, thickness: 1, color: rgb(0.12, 0.16, 0.23) });
      y -= 16;

      // Member info
      text(p, "Member:", lm, y, 10, fontBold);
      text(p, member.name, lm + 52, y, 10);
      text(p, "Member ID:", 320, y, 10, fontBold);
      text(p, member.member_id, 390, y, 10);
      y -= 14;
      text(p, "Phone:", lm, y, 10, fontBold);
      text(p, member.phone || "—", lm + 52, y, 10);
      text(p, "Date:", 320, y, 10, fontBold);
      text(p, new Date().toLocaleDateString("en-IN"), 390, y, 10);
      y -= 18;

      // Summary bar
      p.drawRectangle({ x: lm, y: y - 4, width: rm - lm, height: 18, color: rgb(0.95, 0.97, 0.99) });
      text(p, `Total Credit: ${inr(totalCredit)}`, lm + 6, y + 2, 9, fontBold, rgb(0.09, 0.64, 0.29));
      text(p, `Total Debit: ${inr(totalDebit)}`, 230, y + 2, 9, fontBold, rgb(0.86, 0.15, 0.15));
      text(p, `Balance: ${inr(balance)}`, 390, y + 2, 9, fontBold, rgb(0.11, 0.31, 0.87));
      y -= 24;

      // Table header
      const cols = [lm, lm + 70, lm + 155, lm + 300, lm + 375, lm + 450];
      const colW = [70, 85, 145, 75, 75, 65];
      p.drawRectangle({ x: lm, y: y - 4, width: rm - lm, height: rowH, color: rgb(0.12, 0.16, 0.23) });
      const headers = ["Date", "Transaction", "Narration", "Debit", "Credit", "Balance"];
      headers.forEach((h, i) => text(p, h, cols[i] + 3, y + 2, 8, fontBold, rgb(1, 1, 1)));
      y -= rowH + 2;

      // Rows
      for (const [idx, e] of entries.entries()) {
        if (y < 60) {
          ({ p, y } = addPage());
          p.drawRectangle({ x: lm, y: y - 4, width: rm - lm, height: rowH, color: rgb(0.12, 0.16, 0.23) });
          headers.forEach((h, i) => text(p, h, cols[i] + 3, y + 2, 8, fontBold, rgb(1, 1, 1)));
          y -= rowH + 2;
        }
        if (idx % 2 === 0) p.drawRectangle({ x: lm, y: y - 4, width: rm - lm, height: rowH, color: rgb(0.97, 0.98, 0.99) });

        const rowData = [
          formatDate(e.transaction_date),
          (e.type ?? "").replace(/_/g, " "),
          (e.narration ?? "").substring(0, 30),
          e.debit > 0 ? inr(e.debit) : "-",
          e.credit > 0 ? inr(e.credit) : "-",
          inr(e.balance),
        ];
        rowData.forEach((val, i) => {
          const isRight = i >= 3;
          const color = i === 3 ? rgb(0.86, 0.15, 0.15) : i === 4 ? rgb(0.09, 0.64, 0.29) : rgb(0.1, 0.1, 0.1);
          const xPos = isRight ? cols[i] + colW[i] - fontReg.widthOfTextAtSize(val, 8) - 3 : cols[i] + 3;
          text(p, val, xPos, y + 2, 8, i === 5 ? fontBold : fontReg, color);
        });

        p.drawLine({ start: { x: lm, y: y - 4 }, end: { x: rm, y: y - 4 }, thickness: 0.3, color: rgb(0.88, 0.9, 0.93) });
        y -= rowH;
      }

      // Footer
      y -= 8;
      text(p, `Generated on ${new Date().toLocaleString("en-IN")} · Grihsevak Nidhi Limited`, 140, y, 8, fontReg, rgb(0.58, 0.64, 0.7));

      const bytes = await doc.save();
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `passbook-${member.member_id}-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
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
