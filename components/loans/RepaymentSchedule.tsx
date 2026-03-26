"use client";

import { useState } from "react";
import { calculateEMI, calculateFlatEMI } from "@/lib/utils/emi-calculator";
import type { EMIFrequency } from "@/lib/utils/emi-calculator";
import { formatINR, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Download, CheckCircle2, Clock } from "lucide-react";

interface RepaymentScheduleProps {
  principal: number;
  rate: number;
  tenure: number;
  type?: "reducing" | "flat";
  frequency?: EMIFrequency;
  paidInstallments?: number[];
  startDate?: string;
  onPayClick?: (installmentNo: number, dueDate: string, emi: number, principal: number, interest: number) => void;
  loanId?: string;
  loanNo?: string;
  memberName?: string;
}

export function RepaymentSchedule({
  principal, rate, tenure,
  type = "reducing",
  frequency = "monthly",
  paidInstallments = [],
  startDate,
  onPayClick,
  loanId,
  loanNo,
  memberName,
}: RepaymentScheduleProps) {
  const [showAll, setShowAll] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  if (!principal || !rate || !tenure) return null;

  const result = type === "flat"
    ? calculateFlatEMI(principal, rate, tenure, startDate ? new Date(startDate) : new Date(), frequency)
    : calculateEMI(principal, rate, tenure, startDate ? new Date(startDate) : new Date(), frequency);

  const PREVIEW = frequency === "daily" ? 10 : frequency === "weekly" ? 8 : 6;
  const schedule = showAll ? result.schedule : result.schedule.slice(0, PREVIEW);
  const freqLabel = frequency === "daily" ? "Daily" : frequency === "weekly" ? "Weekly" : "Monthly";

  // ── PDF Download ────────────────────────────────────────────────────────────
  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const doc      = await PDFDocument.create();
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fontReg  = await doc.embedFont(StandardFonts.Helvetica);
      const inr      = (n: number) => formatINR(n).replace("₹", "Rs.");

      const addPage = () => {
        const p = doc.addPage([595, 842]);
        return { p, y: 800 };
      };

      let { p, y } = addPage();
      const lm = 40, rm = 555, rowH = 15;

      const txt = (
        page: typeof p, str: string, x: number, yy: number,
        size: number, font = fontReg, color = rgb(0, 0, 0)
      ) => page.drawText(str, { x, y: yy, size, font, color });

      // Header
      txt(p, "Grihsevak Nidhi Limited", 185, y, 15, fontBold);
      y -= 18;
      txt(p, "Loan Repayment Schedule", 215, y, 11, fontReg, rgb(0.3, 0.35, 0.45));
      y -= 6;
      p.drawLine({ start: { x: lm, y }, end: { x: rm, y }, thickness: 1, color: rgb(0.12, 0.16, 0.23) });
      y -= 14;

      // Loan info
      if (loanNo)     { txt(p, "Loan ID:", lm, y, 9, fontBold); txt(p, loanNo, lm + 50, y, 9); }
      if (memberName) { txt(p, "Member:", 280, y, 9, fontBold); txt(p, memberName, 330, y, 9); }
      y -= 12;
      txt(p, "Principal:", lm, y, 9, fontBold); txt(p, inr(principal), lm + 50, y, 9);
      txt(p, `Rate: ${rate}% p.a.`, 200, y, 9, fontReg);
      txt(p, `Tenure: ${tenure} months (${freqLabel})`, 320, y, 9, fontReg);
      y -= 12;
      txt(p, `Total Installments: ${result.installments}`, lm, y, 9);
      txt(p, `EMI: ${inr(result.emi)}`, 200, y, 9, fontBold);
      txt(p, `Total Amount: ${inr(result.totalAmount)}`, 330, y, 9);
      y -= 14;

      // Table header
      const cols  = [lm, lm + 28, lm + 88, lm + 165, lm + 245, lm + 325, lm + 405, lm + 475];
      const hdrs  = ["#", "Due Date", "Principal", "Interest", "EMI", "Balance", "Status"];
      p.drawRectangle({ x: lm, y: y - 3, width: rm - lm, height: rowH, color: rgb(0.12, 0.16, 0.23) });
      hdrs.forEach((h, i) => txt(p, h, cols[i] + 2, y + 2, 7, fontBold, rgb(1, 1, 1)));
      y -= rowH + 2;

      for (const [idx, row] of result.schedule.entries()) {
        if (y < 50) {
          ({ p, y } = addPage());
          p.drawRectangle({ x: lm, y: y - 3, width: rm - lm, height: rowH, color: rgb(0.12, 0.16, 0.23) });
          hdrs.forEach((h, i) => txt(p, h, cols[i] + 2, y + 2, 7, fontBold, rgb(1, 1, 1)));
          y -= rowH + 2;
        }
        const isPaid = paidInstallments.includes(row.installmentNo);
        if (idx % 2 === 0) p.drawRectangle({ x: lm, y: y - 3, width: rm - lm, height: rowH, color: rgb(0.97, 0.98, 0.99) });
        const rowVals = [
          String(row.installmentNo),
          row.dueDate,
          inr(row.principal),
          inr(row.interest),
          inr(row.emi),
          inr(row.balance),
          isPaid ? "Paid" : new Date(row.dueDate) < new Date() ? "Overdue" : "Pending",
        ];
        rowVals.forEach((v, i) => {
          const col = i === 6
            ? (isPaid ? rgb(0.09, 0.64, 0.29) : new Date(result.schedule[idx].dueDate) < new Date() ? rgb(0.86, 0.15, 0.15) : rgb(0.4, 0.4, 0.4))
            : rgb(0.1, 0.1, 0.1);
          txt(p, v, cols[i] + 2, y + 2, 7, i === 5 ? fontBold : fontReg, col);
        });
        p.drawLine({ start: { x: lm, y: y - 3 }, end: { x: rm, y: y - 3 }, thickness: 0.3, color: rgb(0.88, 0.9, 0.93) });
        y -= rowH;
      }

      y -= 8;
      txt(p, `Generated: ${new Date().toLocaleString("en-IN")} · Grihsevak Nidhi Limited`, 140, y, 7, fontReg, rgb(0.6, 0.65, 0.7));

      const bytes = await doc.save();
      const blob  = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement("a");
      a.href      = url;
      a.download  = `repayment-schedule-${loanNo ?? "loan"}-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
    setPdfLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <h4 className="text-sm font-semibold text-slate-700">Repayment Schedule</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {result.installments} {freqLabel.toLowerCase()} installments · EMI {formatINR(result.emi)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{freqLabel}</span>
          {/* Paid count */}
          {paidInstallments.length > 0 && (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {paidInstallments.length}/{result.installments} paid
            </span>
          )}
          {/* Download PDF */}
          <button
            onClick={downloadPDF}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-medium hover:bg-slate-700 disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            {pdfLoading ? "..." : "Print Schedule"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-2.5 text-left">#</th>
              <th className="px-4 py-2.5 text-left">Due Date</th>
              <th className="px-4 py-2.5 text-right">Principal</th>
              <th className="px-4 py-2.5 text-right">Interest</th>
              <th className="px-4 py-2.5 text-right">EMI</th>
              <th className="px-4 py-2.5 text-right">Balance</th>
              <th className="px-4 py-2.5 text-center">Status</th>
              {onPayClick && <th className="px-4 py-2.5 text-center">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {schedule.map((row) => {
              const isPaid    = paidInstallments.includes(row.installmentNo);
              const isOverdue = !isPaid && new Date(row.dueDate) < new Date();
              return (
                <tr key={row.installmentNo} className={`hover:bg-slate-50 ${isPaid ? "opacity-70" : ""}`}>
                  <td className="px-4 py-2.5 text-slate-500">{row.installmentNo}</td>
                  <td className="px-4 py-2.5 text-slate-600">{formatDate(row.dueDate)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{formatINR(row.principal)}</td>
                  <td className="px-4 py-2.5 text-right text-amber-600">{formatINR(row.interest)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-800">{formatINR(row.emi)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{formatINR(row.balance)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge status={isPaid ? "paid" : isOverdue ? "overdue" : "pending"} />
                  </td>
                  {onPayClick && (
                    <td className="px-4 py-2.5 text-center">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Done
                        </span>
                      ) : (
                        <button
                          onClick={() => onPayClick(row.installmentNo, row.dueDate, row.emi, row.principal, row.interest)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            isOverdue
                              ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {isOverdue ? "Pay Now" : "Pay"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {result.schedule.length > PREVIEW && (
        <div className="px-4 py-3 border-t border-slate-100 text-center">
          <button onClick={() => setShowAll(!showAll)} className="text-sm text-blue-600 hover:underline">
            {showAll ? "Show less" : `Show all ${result.schedule.length} installments`}
          </button>
        </div>
      )}
    </div>
  );
}
