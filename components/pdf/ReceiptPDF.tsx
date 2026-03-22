"use client";

import { formatINR, formatDate } from "@/lib/utils";

interface ReceiptPDFProps {
  receipt: {
    receipt_no: string;
    date: string;
    amount: number;
    payment_mode: string;
    narration: string;
  };
  member: {
    name: string;
    member_id: string;
    phone: string;
  };
}

export function ReceiptPDF({ receipt, member }: ReceiptPDFProps) {
  return (
    <div className="bg-white font-sans" style={{ width: "80mm", padding: "10mm" }} id="receipt-pdf">
      <div className="text-center mb-4">
        <h1 className="text-base font-bold">Sahayog CCS</h1>
        <p className="text-xs text-slate-500">Credit Cooperative Society</p>
        <p className="text-xs font-bold mt-1 bg-slate-800 text-white px-3 py-0.5 inline-block rounded">RECEIPT</p>
      </div>

      <div className="text-xs space-y-1.5 mb-4">
        <div className="flex justify-between">
          <span className="text-slate-500">Receipt No.</span>
          <span className="font-mono font-bold">{receipt.receipt_no}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Date</span>
          <span className="font-medium">{formatDate(receipt.date)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Member</span>
          <span className="font-medium">{member.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Member ID</span>
          <span className="font-mono">{member.member_id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Payment Mode</span>
          <span className="capitalize">{receipt.payment_mode}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-slate-400 my-3" />

      <p className="text-xs text-slate-600 mb-2">{receipt.narration}</p>

      <div className="bg-slate-800 text-white text-center rounded py-2 mb-3">
        <p className="text-xs">Amount Received</p>
        <p className="text-xl font-bold">{formatINR(receipt.amount)}</p>
      </div>

      <div className="border-t border-dashed border-slate-400 my-3" />

      <div className="text-center">
        <p className="text-[10px] text-slate-400">Thank you for your payment</p>
        <p className="text-[10px] text-slate-400">This is a computer generated receipt</p>
      </div>
    </div>
  );
}
