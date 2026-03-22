"use client";

import { formatINR, formatDate } from "@/lib/utils";

interface LoanAgreementPDFProps {
  loan: {
    loan_id: string;
    loan_type: string;
    amount: number;
    interest_rate: number;
    tenure_months: number;
    emi_amount: number;
    purpose: string;
    created_at: string;
    collateral?: string;
  };
  member: {
    name: string;
    member_id: string;
    phone: string;
    address: string;
    aadhar?: string;
    pan?: string;
  };
  guarantor?: { name: string; phone: string };
}

export function LoanAgreementPDF({ loan, member, guarantor }: LoanAgreementPDFProps) {
  return (
    <div className="bg-white p-8 text-sm font-sans" id="loan-agreement-pdf">
      <div className="text-center mb-6 border-b-2 border-blue-600 pb-4">
        <h1 className="text-xl font-bold text-blue-900">Sahayog Credit Cooperative Society</h1>
        <h2 className="text-base font-semibold text-slate-700 mt-1">Loan Agreement</h2>
      </div>

      <div className="mb-4 text-right text-xs text-slate-500">
        <p>Agreement No: <strong className="font-mono">{loan.loan_id}</strong></p>
        <p>Date: {formatDate(loan.created_at)}</p>
      </div>

      <p className="text-sm text-slate-700 mb-4 leading-relaxed">
        This loan agreement is made between <strong>Sahayog Credit Cooperative Society</strong> (hereinafter called &quot;Lender&quot;) and <strong>{member.name}</strong> (Member ID: {member.member_id}, hereinafter called &quot;Borrower&quot;).
      </p>

      <div className="bg-slate-50 rounded-lg p-4 mb-5">
        <h3 className="font-bold text-slate-800 mb-3 text-sm">Loan Terms</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            ["Loan Amount", formatINR(loan.amount)],
            ["Loan Type", loan.loan_type.replace(/_/g, " ").toUpperCase()],
            ["Interest Rate", `${loan.interest_rate}% per annum`],
            ["Tenure", `${loan.tenure_months} months`],
            ["Monthly EMI", formatINR(loan.emi_amount)],
            ["Purpose", loan.purpose],
            loan.collateral ? ["Security / Collateral", loan.collateral] : null,
          ].filter(Boolean).map((entry) => {
            const [label, value] = entry as [string, string];
            return (
              <div key={label}>
                <p className="text-slate-500">{label}</p>
                <p className="font-semibold text-slate-800 capitalize">{value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 mb-5">
        <h3 className="font-bold text-slate-800 mb-3 text-sm">Borrower Details</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            ["Name", member.name],
            ["Member ID", member.member_id],
            ["Phone", member.phone],
            ["Aadhar", member.aadhar ? `XXXX XXXX ${member.aadhar.slice(-4)}` : "—"],
            ["PAN", member.pan || "—"],
            ["Address", member.address],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-slate-500">{label}</p>
              <p className="font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {guarantor && (
        <div className="bg-slate-50 rounded-lg p-4 mb-5">
          <h3 className="font-bold text-slate-800 mb-3 text-sm">Guarantor Details</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><p className="text-slate-500">Name</p><p className="font-semibold">{guarantor.name}</p></div>
            <div><p className="text-slate-500">Phone</p><p className="font-semibold">{guarantor.phone}</p></div>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-600 space-y-2 mb-8">
        <p className="font-bold text-slate-700">Terms & Conditions:</p>
        <ol className="list-decimal list-inside space-y-1 text-slate-600">
          <li>The borrower agrees to repay the loan in {loan.tenure_months} equal monthly installments of {formatINR(loan.emi_amount)}.</li>
          <li>Interest will be charged at {loan.interest_rate}% per annum on the outstanding balance.</li>
          <li>Late payment will attract a penalty as per society rules.</li>
          <li>The borrower authorizes the society to adjust any deposits against outstanding loan dues.</li>
          <li>This agreement is governed by the Cooperative Societies Act applicable in the state.</li>
        </ol>
      </div>

      <div className="grid grid-cols-2 gap-8 mt-10">
        <div className="text-center">
          <div className="border-t border-slate-400 pt-2 w-40 mx-auto">
            <p className="text-xs text-slate-500">Borrower&apos;s Signature</p>
            <p className="text-xs font-medium text-slate-700">{member.name}</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-slate-400 pt-2 w-40 mx-auto">
            <p className="text-xs text-slate-500">Authorized Signatory</p>
            <p className="text-xs font-medium text-slate-700">Sahayog CCS</p>
          </div>
        </div>
      </div>
    </div>
  );
}
