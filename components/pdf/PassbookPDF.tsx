"use client";

import { formatINR, formatDate } from "@/lib/utils";

interface PassbookEntry {
  date: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
}

interface PassbookPDFProps {
  member: {
    name: string;
    member_id: string;
    phone: string;
    address: string;
  };
  entries: PassbookEntry[];
}

export function PassbookPDF({ member, entries }: PassbookPDFProps) {
  return (
    <div className="bg-white p-8 text-sm font-sans" id="passbook-pdf">
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-blue-600 pb-4">
        <h1 className="text-xl font-bold text-blue-900">Sahayog Credit Cooperative Society</h1>
        <h2 className="text-base font-semibold text-slate-600 mt-1">Member Passbook</h2>
      </div>

      {/* Member Details */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-lg text-xs">
        <div>
          <p className="text-slate-500">Member Name</p>
          <p className="font-bold text-slate-800">{member.name}</p>
        </div>
        <div>
          <p className="text-slate-500">Member ID</p>
          <p className="font-bold text-slate-800 font-mono">{member.member_id}</p>
        </div>
        <div>
          <p className="text-slate-500">Phone</p>
          <p className="font-medium text-slate-700">{member.phone}</p>
        </div>
        <div>
          <p className="text-slate-500">Address</p>
          <p className="font-medium text-slate-700">{member.address}</p>
        </div>
      </div>

      {/* Transactions */}
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-blue-700 text-white">
            <th className="px-3 py-2 text-left">Date</th>
            <th className="px-3 py-2 text-left">Narration</th>
            <th className="px-3 py-2 text-right">Debit (Dr.)</th>
            <th className="px-3 py-2 text-right">Credit (Cr.)</th>
            <th className="px-3 py-2 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <td className="px-3 py-1.5 border border-slate-200">{formatDate(e.date)}</td>
              <td className="px-3 py-1.5 border border-slate-200">{e.narration}</td>
              <td className="px-3 py-1.5 border border-slate-200 text-right text-red-600">
                {e.debit > 0 ? formatINR(e.debit) : "—"}
              </td>
              <td className="px-3 py-1.5 border border-slate-200 text-right text-green-700">
                {e.credit > 0 ? formatINR(e.credit) : "—"}
              </td>
              <td className="px-3 py-1.5 border border-slate-200 text-right font-bold">{formatINR(e.balance)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
            <td colSpan={2} className="px-3 py-2 border border-slate-200">Totals</td>
            <td className="px-3 py-2 border border-slate-200 text-right text-red-600">
              {formatINR(entries.reduce((s, e) => s + e.debit, 0))}
            </td>
            <td className="px-3 py-2 border border-slate-200 text-right text-green-700">
              {formatINR(entries.reduce((s, e) => s + e.credit, 0))}
            </td>
            <td className="px-3 py-2 border border-slate-200 text-right">
              {formatINR(entries[entries.length - 1]?.balance ?? 0)}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-6 flex justify-between items-end">
        <p className="text-xs text-slate-400">Generated on {new Date().toLocaleString("en-IN")}</p>
        <div className="text-center">
          <div className="border-t border-slate-400 w-40 pt-1">
            <p className="text-xs text-slate-500">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
