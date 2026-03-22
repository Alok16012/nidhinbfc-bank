"use client";

import { useState } from "react";
import Link from "next/link";
import { cn, formatINR, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CreditCard, PiggyBank, BookOpen, FileText } from "lucide-react";

interface TabProps {
  memberId: string;
  loans?: { id: string; loan_id: string; amount: number; status: string; emi_amount: number }[];
  deposits?: { id: string; deposit_id: string; deposit_type: string; amount: number; status: string }[];
  passbook?: { id: string; date: string; narration: string; debit: number; credit: number; balance: number }[];
}

const tabs = [
  { key: "loans", label: "Loans", icon: CreditCard },
  { key: "deposits", label: "Deposits", icon: PiggyBank },
  { key: "passbook", label: "Passbook", icon: BookOpen },
  { key: "documents", label: "Documents", icon: FileText },
];

export function MemberProfileTabs({ memberId, loans = [], deposits = [], passbook = [] }: TabProps) {
  const [active, setActive] = useState("loans");

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Tab Bar */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={cn(
                "flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                active === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-5">
        {/* Loans */}
        {active === "loans" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-semibold text-slate-700">Loan History</h4>
              <Link href={`/loans/new?member=${memberId}`} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                + New Loan
              </Link>
            </div>
            {loans.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No loans found</p>
            ) : (
              <div className="space-y-2">
                {loans.map((loan) => (
                  <Link key={loan.id} href={`/loans/${loan.id}`} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{loan.loan_id}</p>
                      <p className="text-xs text-slate-500">EMI: {formatINR(loan.emi_amount)}/month</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{formatINR(loan.amount)}</p>
                      <StatusBadge status={loan.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Deposits */}
        {active === "deposits" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-semibold text-slate-700">Deposit Accounts</h4>
              <Link href={`/deposits/new?member=${memberId}`} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                + New Deposit
              </Link>
            </div>
            {deposits.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No deposits found</p>
            ) : (
              <div className="space-y-2">
                {deposits.map((dep) => (
                  <Link key={dep.id} href={`/deposits/${dep.id}`} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{dep.deposit_id}</p>
                      <p className="text-xs text-slate-500 uppercase">{dep.deposit_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{formatINR(dep.amount)}</p>
                      <StatusBadge status={dep.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Passbook */}
        {active === "passbook" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-semibold text-slate-700">Transaction History</h4>
              <Link href={`/passbook/${memberId}`} className="text-xs text-blue-600 hover:underline">
                View Full Passbook →
              </Link>
            </div>
            {passbook.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No transactions yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Narration</th>
                    <th className="pb-2 text-right">Debit</th>
                    <th className="pb-2 text-right">Credit</th>
                    <th className="pb-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {passbook.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="py-2 text-slate-500">{formatDate(tx.date)}</td>
                      <td className="py-2 text-slate-700">{tx.narration}</td>
                      <td className="py-2 text-right text-red-500">{tx.debit ? formatINR(tx.debit) : "—"}</td>
                      <td className="py-2 text-right text-emerald-600">{tx.credit ? formatINR(tx.credit) : "—"}</td>
                      <td className="py-2 text-right font-medium">{formatINR(tx.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Documents */}
        {active === "documents" && (
          <div className="text-center py-8">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Document upload coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
