"use client";

import { useState } from "react";
import { calculateEMI, calculateFlatEMI } from "@/lib/utils/emi-calculator";
import type { EMIFrequency } from "@/lib/utils/emi-calculator";
import { formatINR, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface RepaymentScheduleProps {
  principal: number;
  rate: number;
  tenure: number;
  type?: "reducing" | "flat";
  frequency?: EMIFrequency;
  paidInstallments?: number[];
  startDate?: string;
}

export function RepaymentSchedule({
  principal, rate, tenure,
  type = "reducing",
  frequency = "monthly",
  paidInstallments = [],
  startDate,
}: RepaymentScheduleProps) {
  const [showAll, setShowAll] = useState(false);

  if (!principal || !rate || !tenure) return null;

  const result = type === "flat"
    ? calculateFlatEMI(principal, rate, tenure, startDate ? new Date(startDate) : new Date(), frequency)
    : calculateEMI(principal, rate, tenure, startDate ? new Date(startDate) : new Date(), frequency);

  const PREVIEW = frequency === "daily" ? 10 : frequency === "weekly" ? 8 : 6;
  const schedule = showAll ? result.schedule : result.schedule.slice(0, PREVIEW);

  const freqLabel = frequency === "daily" ? "daily" : frequency === "weekly" ? "weekly" : "monthly";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h4 className="text-sm font-semibold text-slate-700">Repayment Schedule</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full capitalize">{freqLabel}</span>
          <span className="text-xs text-slate-400">{result.installments} installments</span>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {schedule.map((row) => {
              const isPaid   = paidInstallments.includes(row.installmentNo);
              const isOverdue = !isPaid && new Date(row.dueDate) < new Date();
              return (
                <tr key={row.installmentNo} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-500">{row.installmentNo}</td>
                  <td className="px-4 py-2.5 text-slate-600">{formatDate(row.dueDate)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{formatINR(row.principal)}</td>
                  <td className="px-4 py-2.5 text-right text-amber-600">{formatINR(row.interest)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-800">{formatINR(row.emi)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{formatINR(row.balance)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge status={isPaid ? "paid" : isOverdue ? "overdue" : "pending"} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {result.schedule.length > PREVIEW && (
        <div className="px-4 py-3 border-t border-slate-100 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showAll ? "Show less" : `Show all ${result.schedule.length} installments`}
          </button>
        </div>
      )}
    </div>
  );
}
