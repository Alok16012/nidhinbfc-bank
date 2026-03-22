"use client";

import { formatINR, formatDate } from "@/lib/utils";

interface FDCertificatePDFProps {
  deposit: {
    deposit_id: string;
    deposit_type: string;
    amount: number;
    interest_rate: number;
    tenure_months: number;
    maturity_date: string;
    maturity_amount: number;
    created_at: string;
    nominee_name: string;
    nominee_relation: string;
  };
  member: {
    name: string;
    member_id: string;
    phone: string;
    address: string;
  };
}

export function FDCertificatePDF({ deposit, member }: FDCertificatePDFProps) {
  return (
    <div className="bg-white p-8 font-sans text-sm border-4 border-blue-800" id="fd-certificate-pdf">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-blue-900">Sahayog Credit Cooperative Society</h1>
        <div className="mt-2 inline-block border-2 border-blue-800 px-6 py-1">
          <h2 className="text-base font-bold text-blue-800 tracking-widest uppercase">
            {deposit.deposit_type === "fd" ? "Fixed Deposit Certificate" :
             deposit.deposit_type === "rd" ? "Recurring Deposit Certificate" :
             "Deposit Certificate"}
          </h2>
        </div>
      </div>

      <div className="mb-4 flex justify-between text-xs text-slate-500">
        <p>Certificate No: <strong className="font-mono text-slate-800">{deposit.deposit_id}</strong></p>
        <p>Issue Date: <strong>{formatDate(deposit.created_at)}</strong></p>
      </div>

      <p className="text-sm text-slate-700 mb-5 leading-relaxed">
        This is to certify that <strong>{member.name}</strong> (Member ID: <strong>{member.member_id}</strong>) has deposited the amount as follows with Sahayog Credit Cooperative Society.
      </p>

      {/* Deposit Details */}
      <div className="border-2 border-blue-200 rounded-lg overflow-hidden mb-5">
        <div className="bg-blue-700 text-white px-4 py-2">
          <p className="text-sm font-bold">Deposit Details</p>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3 text-xs">
          {[
            ["Principal Amount", formatINR(deposit.amount)],
            ["Interest Rate", `${deposit.interest_rate}% per annum`],
            ["Tenure", `${deposit.tenure_months} months`],
            ["Deposit Date", formatDate(deposit.created_at)],
            ["Maturity Date", formatDate(deposit.maturity_date)],
            ["Maturity Amount", formatINR(deposit.maturity_amount)],
            ["Nominee", `${deposit.nominee_name} (${deposit.nominee_relation})`],
          ].map(([label, value]) => (
            <div key={label as string} className="border-b border-slate-100 pb-2">
              <p className="text-slate-500">{label}</p>
              <p className="font-bold text-slate-800">{value as string}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Interest earned highlight */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-5 text-center">
        <p className="text-xs text-emerald-700">Total Interest Earned</p>
        <p className="text-2xl font-bold text-emerald-700">
          {formatINR(deposit.maturity_amount - deposit.amount)}
        </p>
      </div>

      <div className="text-xs text-slate-600 mb-6">
        <p className="font-bold text-slate-700 mb-1">Terms & Conditions:</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>This certificate is non-transferable.</li>
          <li>Premature withdrawal may attract penalty as per society rules.</li>
          <li>This certificate must be presented at the time of maturity for withdrawal.</li>
          <li>TDS will be deducted as per Income Tax Act if applicable.</li>
        </ol>
      </div>

      <div className="grid grid-cols-2 gap-8 mt-8">
        <div className="text-center">
          <div className="border-t border-slate-400 pt-2 w-36 mx-auto">
            <p className="text-xs text-slate-500">Depositor&apos;s Signature</p>
            <p className="text-xs font-medium text-slate-700">{member.name}</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-slate-400 pt-2 w-36 mx-auto">
            <p className="text-xs text-slate-500">Manager&apos;s Signature</p>
            <p className="text-xs font-medium text-slate-700">Sahayog CCS</p>
          </div>
        </div>
      </div>
    </div>
  );
}
