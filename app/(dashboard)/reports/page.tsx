"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FileText, Users, CreditCard, PiggyBank, TrendingUp, Download } from "lucide-react";

const reports = [
  {
    category: "Member Reports",
    icon: Users,
    color: "text-blue-600 bg-blue-50",
    items: [
      { name: "Member List", description: "Complete list of all members with status" },
      { name: "New Members (Monthly)", description: "Members registered in a selected month" },
      { name: "Member-wise Loan Summary", description: "Loan and deposit summary per member" },
      { name: "KYC Pending Members", description: "Members with incomplete KYC documents" },
    ],
  },
  {
    category: "Loan Reports",
    icon: CreditCard,
    color: "text-purple-600 bg-purple-50",
    items: [
      { name: "Loan Disbursement Report", description: "All loans disbursed in a date range" },
      { name: "Outstanding Loan Report", description: "Active loans with outstanding balance" },
      { name: "NPA Report", description: "Non-performing assets analysis" },
      { name: "Overdue EMI Report", description: "All overdue installments with aging" },
      { name: "Repayment Collection Report", description: "EMIs collected in a date range" },
    ],
  },
  {
    category: "Deposit Reports",
    icon: PiggyBank,
    color: "text-amber-600 bg-amber-50",
    items: [
      { name: "Deposit Summary", description: "FD/RD/MIS/Savings account summary" },
      { name: "Maturity Report", description: "Deposits maturing in next 30/60/90 days" },
      { name: "Interest Payable Report", description: "Accrued interest on all deposits" },
      { name: "Premature Closure Report", description: "Deposits closed before maturity" },
    ],
  },
  {
    category: "Financial Reports",
    icon: TrendingUp,
    color: "text-emerald-600 bg-emerald-50",
    items: [
      { name: "Income Statement", description: "Profit & Loss for selected period" },
      { name: "Balance Sheet", description: "Assets, liabilities and equity" },
      { name: "Cash Flow Statement", description: "Cash inflows and outflows" },
      { name: "Expense Report", description: "All expenses by category" },
    ],
  },
];

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Generate and export various reports">
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <span className="text-slate-400 text-sm">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
      </PageHeader>

      <div className="space-y-6">
        {reports.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.category}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${section.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold text-slate-700">{section.category}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {section.items.map((report) => (
                  <div
                    key={report.name}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <FileText className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 text-xs flex items-center gap-1">
                        <Download className="h-3.5 w-3.5" />Export
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{report.name}</p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{report.description}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
