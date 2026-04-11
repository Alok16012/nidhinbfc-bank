"use client";

import { formatINR, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface PassbookEntry {
  id: string;
  transaction_date: string;
  type: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  reference_id?: string;
}

interface PassbookTableProps {
  entries: PassbookEntry[];
  loading?: boolean;
}

export function PassbookTable({ entries, loading }: PassbookTableProps) {
  if (loading) return <div className="text-center py-10 text-slate-400 text-sm">Loading passbook...</div>;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
              <th className="px-4 py-3 text-left w-16">Inst.No</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Branch</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Narration</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">No transactions found</td>
              </tr>
            ) : (
              entries.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className={cn("hover:bg-slate-50 transition-colors", entry.credit > 0 ? "border-l-2 border-l-emerald-400" : "border-l-2 border-l-red-400")}
                >
                  <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{String(idx + 1).padStart(3, '0')}</td>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(entry.transaction_date)}</td>
                  <td className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase">HEADOFFICE</td>
                  <td className="px-4 py-2.5 text-slate-600 hidden md:table-cell max-w-xs truncate">{entry.narration}</td>
                  <td className="px-4 py-2.5 text-right text-red-500 font-medium">
                    {entry.debit > 0 ? formatINR(entry.debit) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">
                    {entry.credit > 0 ? formatINR(entry.credit) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-900 bg-slate-50/50">{formatINR(entry.balance)}</td>
                </tr>
              ))
            )}
          </tbody>
          {entries.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-slate-600">Totals</td>
                <td className="px-4 py-3 text-right font-bold text-red-600">
                  {formatINR(entries.reduce((s, e) => s + e.debit, 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600">
                  {formatINR(entries.reduce((s, e) => s + e.credit, 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">
                  {formatINR(entries[entries.length - 1]?.balance ?? 0)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
