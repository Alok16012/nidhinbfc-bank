"use client";

import { useState, useEffect } from "react";
import { calculateEMI, calculateFlatEMI } from "@/lib/utils/emi-calculator";
import { formatINR } from "@/lib/utils";
import { Calculator } from "lucide-react";

interface EMICalculatorProps {
  principal: number;
  rate: number;
  tenure: number;
  type?: "reducing" | "flat";
  onEMIChange?: (emi: number) => void;
}

export function EMICalculator({ principal, rate, tenure, type = "reducing", onEMIChange }: EMICalculatorProps) {
  const [result, setResult] = useState<{ emi: number; totalAmount: number; totalInterest: number } | null>(null);

  useEffect(() => {
    if (principal > 0 && rate > 0 && tenure > 0) {
      const res = type === "flat"
        ? calculateFlatEMI(principal, rate, tenure)
        : calculateEMI(principal, rate, tenure);
      setResult(res);
      onEMIChange?.(res.emi);
    } else {
      setResult(null);
    }
  }, [principal, rate, tenure, type, onEMIChange]);

  if (!result) return null;

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="h-4 w-4 text-blue-600" />
        <p className="text-sm font-semibold text-blue-800">EMI Calculation</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xl font-bold text-blue-700">{formatINR(result.emi)}</p>
          <p className="text-xs text-blue-500 mt-0.5">Monthly EMI</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-slate-700">{formatINR(result.totalInterest)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Interest</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-slate-700">{formatINR(result.totalAmount)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Amount</p>
        </div>
      </div>
    </div>
  );
}
