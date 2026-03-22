"use client";

import { formatINR, formatDate } from "@/lib/utils";

interface LedgerEntry {
  id: string;
  date: string;
  narration: string;
  voucher_no: string;
  debit: number;
  credit: number;
  balance: number;
}

interface LedgerTableProps {
  entries: LedgerEntry[];
  accountName?: string;
  openingBalance?: number;
}

export function LedgerTable({ entries, accountName, openingBalance = 0 }: LedgerTableProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {accountName && (
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-800 text-white">
          <h3 className="text-sm font-bold">Account Ledger: {accountName}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Opening Balance: {formatINR(openingBalance)}</p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Voucher No.</th>
              <th className="px-4 py-3 text-left">Narration</th>
              <th className="px-4 py-3 text-right">Debit (Dr.)</th>
              <th className="px-4 py-3 text-right">Credit (Cr.)</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            <tr className="bg-amber-50">
              <td className="px-4 py-2 text-slate-500 text-xs">Opening</td>
              <td className="px-4 py-2" />
              <td className="px-4 py-2 text-slate-600 text-xs italic">Opening Balance</td>
              <td className="px-4 py-2 text-right">—</td>
              <td className="px-4 py-2 text-right">—</td>
              <td className="px-4 py-2 text-right font-bold text-slate-800">{formatINR(openingBalance)}</td>
            </tr>
            {entries.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">No entries found</td></tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(entry.date)}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{entry.voucher_no}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 max-w-xs truncate">{entry.narration}</td>
                  <td className="px-4 py-2.5 text-right text-red-500 font-medium">
                    {entry.debit > 0 ? formatINR(entry.debit) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">
                    {entry.credit > 0 ? formatINR(entry.credit) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-900">{formatINR(entry.balance)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-200">
              <td colSpan={3} className="px-4 py-3 text-sm font-bold text-slate-700">Totals</td>
              <td className="px-4 py-3 text-right font-bold text-red-600">{formatINR(entries.reduce((s, e) => s + e.debit, 0))}</td>
              <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatINR(entries.reduce((s, e) => s + e.credit, 0))}</td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">{formatINR(entries[entries.length - 1]?.balance ?? openingBalance)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
