"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatINR, formatDate, formatDateShort, cn } from "@/lib/utils";

interface PrintPassbookPageProps {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default function PrintPassbookPage({ params, searchParams }: PrintPassbookPageProps) {
  const resolvedParams = use(params);
  const resolvedSearch = use(searchParams);
  const memberId = resolvedParams.memberId;
  const tab = resolvedSearch.tab || "all";
  const [member, setMember] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Fetch member
    supabase.from("members").select("*").eq("id", memberId).single().then(({ data }) => {
      setMember(data);
      // Fetch deposits
      supabase
        .from("deposits")
        .select("id, deposit_type, deposit_no, amount, status, maturity_date, maturity_amount, interest_rate, tenure_months, type, monthly_amount, nominee_name")
        .eq("member_id", memberId)
        .then(({ data: deps }) => setDeposits(deps || []));
    });

    // Fetch passbook entries
    let query = supabase
      .from("passbook")
      .select("*")
      .eq("member_id", memberId)
      .order("transaction_date", { ascending: true });

    query.then(({ data }) => {
      setEntries(data || []);
      setLoading(false);

      // Auto-trigger print dialog after data loads
      setTimeout(() => {
        window.print();
        setPrinted(true);
      }, 800);
    });
  }, [memberId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading passbook...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-slate-600">Member not found</p>
      </div>
    );
  }

  const primaryDep = deposits[0];
  const tabLabel = tab === "all" ? "All Transactions" : tab.toUpperCase();

  return (
    <div className="min-h-screen bg-white">
      {!printed && (
        <div className="no-print fixed top-0 left-0 right-0 bg-slate-100 border-b border-slate-300 px-4 py-3 flex items-center justify-between z-50">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-slate-700">
              Printing: {member.name} ({member.member_id})
            </h1>
            <span className="text-xs text-slate-500">{tabLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              Print Now
            </button>
            <button
              onClick={() => window.close()}
              className="px-4 py-1.5 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className={cn("max-w-[210mm] mx-auto pt-8 pb-12 px-6", !printed && "pt-16")}>
        <div className="passbook-cover mb-8">
          <div className="text-center border-b-4 border-blue-800 pb-3 mb-4">
            <h1 className="text-2xl font-bold text-blue-900 tracking-wide">
              SAHAYOG CREDIT COOPERATIVE SOCIETY LTD.
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Regd. under Coop. Societies Act | Phone: 0000000000
            </p>
          </div>

          <div className="passbook-cover-content">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="mb-3">
                  <span className="text-xs font-semibold text-slate-600">MEMBER NAME:</span>
                  <span className="ml-2 text-sm font-bold uppercase">{member.name}</span>
                </div>
                <div className="mb-3">
                  <span className="text-xs font-semibold text-slate-600">FATHER/HUSBAND:</span>
                  <span className="ml-2 text-sm">{member.father_name || "--"}</span>
                </div>
                <div className="mb-3">
                  <span className="text-xs font-semibold text-slate-600">ADDRESS:</span>
                  <span className="ml-2 text-sm">{member.address || "--"}</span>
                </div>
              </div>

              <div className="passbook-photo-box ml-4">
                {member.photo_url ? (
                  <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    PHOTO
                  </div>
                )}
              </div>
            </div>

            {primaryDep && (
              <div className="border-t-2 border-blue-800 pt-3 mt-3">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-slate-600">ACCOUNT NO:</span>
                    <span className="ml-2 font-mono font-bold">{primaryDep.deposit_no}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">MEMBER ID:</span>
                    <span className="ml-2 font-mono">{member.member_id}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">PLAN:</span>
                    <span className="ml-2 font-bold">{tabLabel}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">SCHEME:</span>
                    <span className="ml-2">{primaryDep.type?.toUpperCase() || "N/A"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">DATE OF OPENING:</span>
                    <span className="ml-2">{formatDateShort(primaryDep.open_date || member.join_date)}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">MATURITY DATE:</span>
                    <span className="ml-2">{primaryDep.maturity_date ? formatDateShort(primaryDep.maturity_date) : "--"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold text-slate-600">NOMINEE:</span>
                    <span className="ml-2">{member.nominee_name || "--"} ({member.nominee_relation || "--"})</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <div className="passbook-signature-box">
                <p className="text-xs text-slate-500">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>

        <div className="passbook-statement">
          <div className="text-center border-b-2 border-blue-800 pb-2 mb-3">
            <h2 className="text-lg font-bold text-blue-900">
              TRANSACTION STATEMENT - {tabLabel}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {member.name} | {member.member_id}
            </p>
          </div>

          <table className="passbook-table">
            <thead>
              <tr className="passbook-header-row">
                <th className="passbook-th passbook-col-sno">S.No</th>
                <th className="passbook-th passbook-col-date">Date</th>
                <th className="passbook-th passbook-col-narration">Narration</th>
                <th className="passbook-th passbook-col-credit">Credit (Rs.)</th>
                <th className="passbook-th passbook-col-debit">Debit (Rs.)</th>
                <th className="passbook-th passbook-col-balance">Balance (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={entry.id} className={idx % 2 === 0 ? "passbook-row-even" : "passbook-row-odd"}>
                  <td className="passbook-td passbook-col-sno">{idx + 1}</td>
                  <td className="passbook-td passbook-col-date">{formatDateShort(entry.transaction_date)}</td>
                  <td className="passbook-td passbook-col-narration">{entry.narration || "--"}</td>
                  <td className="passbook-td passbook-col-credit">
                    {entry.credit > 0 ? formatINR(entry.credit) : "--"}
                  </td>
                  <td className="passbook-td passbook-col-debit">
                    {entry.debit > 0 ? formatINR(entry.debit) : "--"}
                  </td>
                  <td className="passbook-td passbook-col-balance">{formatINR(entry.balance)}</td>
                </tr>
              ))}
            </tbody>
            {entries.length > 0 && (
              <tfoot>
                <tr className="passbook-footer-row">
                  <td colSpan={3} className="passbook-td font-bold">
                    TOTAL
                  </td>
                  <td className="passbook-td font-bold text-green-700">
                    {formatINR(entries.reduce((s, e) => s + (e.credit || 0), 0))}
                  </td>
                  <td className="passbook-td font-bold text-red-600">
                    {formatINR(entries.reduce((s, e) => s + (e.debit || 0), 0))}
                  </td>
                  <td className="passbook-td font-bold text-blue-700">
                    {formatINR(entries[entries.length - 1]?.balance || 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>

          {entries.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              No transactions found
            </div>
          )}

          <div className="passbook-footer mt-6">
            <p className="text-xs text-slate-500 text-center">
              Generated on {new Date().toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
