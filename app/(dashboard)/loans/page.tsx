"use client";

import Link from "next/link";
import { PlusCircle, Search } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ExportButton } from "@/components/shared/ExportButton";
import { useLoans } from "@/lib/hooks/useLoans";
import { formatINR, formatDate } from "@/lib/utils";

const STATUSES = ["all", "pending", "approved", "disbursed", "closed", "npa"];

export default function LoansPage() {
  const { loans, loading } = useLoans();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = loans.filter((l) => {
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchSearch =
      l.loan_id.toLowerCase().includes(search.toLowerCase()) ||
      l.member?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.purpose.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: loans.length,
    disbursed: loans.filter((l) => l.status === "disbursed").length,
    outstanding: loans.filter((l) => l.status === "disbursed").reduce((s, l) => s + l.outstanding_balance, 0),
    npa: loans.filter((l) => l.status === "npa").length,
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Loans" description={`${stats.disbursed} active loans`}>
        <ExportButton onExportCSV={() => {}} />
        <Link href="/loans/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">
          <PlusCircle className="h-4 w-4" />
          New Loan
        </Link>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Loans", value: stats.total, color: "text-blue-600" },
          { label: "Active (Disbursed)", value: stats.disbursed, color: "text-emerald-600" },
          { label: "Outstanding", value: formatINR(stats.outstanding), color: "text-purple-600" },
          { label: "NPA Accounts", value: stats.npa, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-1 bg-slate-50 rounded-lg px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by loan ID, member or purpose..."
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-slate-400"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                  statusFilter === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Loan ID</th>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Type</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">Outstanding</th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">EMI</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">No loans found</td></tr>
              ) : (
                filtered.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{loan.loan_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{loan.member?.name ?? "—"}</p>
                      <p className="text-xs text-slate-400">{loan.member?.phone}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell capitalize text-slate-600">{loan.loan_type}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{formatINR(loan.amount)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 hidden lg:table-cell">{formatINR(loan.outstanding_balance)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 hidden lg:table-cell">{formatINR(loan.emi_amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={loan.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/loans/${loan.id}`} className="text-xs text-blue-600 hover:underline font-medium">View</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
