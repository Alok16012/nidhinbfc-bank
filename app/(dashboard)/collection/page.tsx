"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatINR, formatDate } from "@/lib/utils";
import { calculateEMI, calculateFlatEMI } from "@/lib/utils/emi-calculator";
import type { EMIFrequency } from "@/lib/utils/emi-calculator";
import {
  CheckCircle2, Search, IndianRupee,
  ChevronDown, ChevronUp, Phone, Loader2, RefreshCw,
  AlertCircle, Banknote
} from "lucide-react";

interface CollectItem {
  repaymentId: string | null;
  loanId: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  loanNo: string;
  installmentNo: number;
  dueDate: string;
  emiAmount: number;
  principalAmount: number;
  interestAmount: number;
  outstandingBalance: number;
  isOverdue: boolean;
  status: "pending" | "paid" | "overdue";
  paidAmount: number;
}

export default function CollectionPage() {
  const supabase = createClient();
  const [items, setItems] = useState<CollectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"pending" | "paid">("pending");
  const [collecting, setCollecting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<{ [key: string]: number }>({});
  const [penalties, setPenalties] = useState<{ [key: string]: number }>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    // Fetch all disbursed loans
    const { data: loans } = await supabase
      .from("loans")
      .select(`
        id, loan_no, member_id, amount, interest_rate, tenure_months,
        emi_frequency, calculation_type, disbursed_date, outstanding_balance, emi_amount,
        member:members(name, phone)
      `)
      .eq("status", "disbursed");

    if (!loans || loans.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Fetch already-paid installments for today for these loans
    const loanIds = loans.map((l: any) => l.id);
    const { data: paidToday } = await supabase
      .from("loan_repayments")
      .select("loan_id, installment_no, paid_amount, status")
      .in("loan_id", loanIds)
      .eq("paid_date", today)
      .eq("status", "paid");

    const paidTodayMap = new Map<string, any>();
    for (const p of (paidToday || []) as any[]) {
      paidTodayMap.set(p.loan_id, p);
    }

    // Fetch total paid installment count per loan
    const { data: allPaid } = await supabase
      .from("loan_repayments")
      .select("loan_id, installment_no")
      .in("loan_id", loanIds)
      .eq("status", "paid");

    const paidCountMap = new Map<string, number[]>();
    for (const p of (allPaid || []) as any[]) {
      if (!paidCountMap.has(p.loan_id)) paidCountMap.set(p.loan_id, []);
      paidCountMap.get(p.loan_id)!.push(p.installment_no);
    }

    const result: CollectItem[] = [];

    for (const loan of loans as any[]) {
      const freq: EMIFrequency = (loan.emi_frequency ?? "monthly") as EMIFrequency;
      const startDate = loan.disbursed_date ? new Date(loan.disbursed_date) : new Date();

      // Find next unpaid installment
      let nextInstallmentNo = 1;
      let nextDueDate = today;
      let nextPrincipal = 0;
      let nextInterest = 0;
      let emiAmt = loan.emi_amount ?? 0;
      let isOverdue = false;

      try {
        const scheduleResult = loan.calculation_type === "flat"
          ? calculateFlatEMI(loan.amount, loan.interest_rate, loan.tenure_months, startDate, freq)
          : calculateEMI(loan.amount, loan.interest_rate, loan.tenure_months, startDate, freq);

        const paidNos = new Set(paidCountMap.get(loan.id) ?? []);
        const nextRow = scheduleResult.schedule.find((s) => !paidNos.has(s.installmentNo));

        if (nextRow) {
          nextInstallmentNo = nextRow.installmentNo;
          nextDueDate = nextRow.dueDate;
          nextPrincipal = nextRow.principal;
          nextInterest = nextRow.interest;
          emiAmt = nextRow.emi;
          isOverdue = nextRow.dueDate < today;
        } else {
          continue; // all paid
        }
      } catch (_) {
        // fallback: use loan emi_amount
        emiAmt = loan.emi_amount ?? 0;
      }

      const paidEntry = paidTodayMap.get(loan.id);

      result.push({
        repaymentId:       paidEntry ? null : null, // will insert fresh
        loanId:            loan.id,
        memberId:          loan.member_id,
        memberName:        (loan.member as any)?.name ?? "—",
        memberPhone:       (loan.member as any)?.phone ?? "",
        loanNo:            loan.loan_no,
        installmentNo:     nextInstallmentNo,
        dueDate:           nextDueDate,
        emiAmount:         emiAmt,
        principalAmount:   nextPrincipal,
        interestAmount:    nextInterest,
        outstandingBalance: loan.outstanding_balance ?? 0,
        isOverdue,
        status:            paidEntry ? "paid" : isOverdue ? "overdue" : "pending",
        paidAmount:        paidEntry?.paid_amount ?? 0,
      });
    }

    // Sort: overdue first, then pending, then paid
    result.sort((a, b) => {
      const order = { overdue: 0, pending: 1, paid: 2 };
      return (order[a.status] ?? 1) - (order[b.status] ?? 1);
    });

    setItems(result);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = items.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.memberName.toLowerCase().includes(q) ||
      r.loanNo.toLowerCase().includes(q) ||
      r.memberPhone.includes(q)
    );
  });

  const pendingItems = filtered.filter((r) => r.status !== "paid");
  const paidItems    = filtered.filter((r) => r.status === "paid");
  const totalDue     = items.filter(i => i.status !== "paid").reduce((s, r) => s + r.emiAmount, 0);
  const totalCollectedToday = items.filter(i => i.status === "paid").reduce((s, r) => s + (r.paidAmount || r.emiAmount), 0);

  const quickCollect = async (item: CollectItem) => {
    const key    = item.loanId + "_" + item.installmentNo;
    const amount = customAmounts[key] ?? item.emiAmount;
    const pen    = penalties[key] ?? 0;
    setCollecting(key);

    try {
      const today = new Date().toISOString().split("T")[0];

      // Check if row already exists
      const { data: existing } = await supabase
        .from("loan_repayments")
        .select("id")
        .eq("loan_id", item.loanId)
        .eq("installment_no", item.installmentNo)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("loan_repayments")
          .update({
            paid_date: today, paid_amount: amount, penalty: pen,
            total_amount: amount + pen, status: "paid", payment_mode: "cash",
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("loan_repayments").insert({
          loan_id: item.loanId, member_id: item.memberId,
          installment_no: item.installmentNo, due_date: item.dueDate,
          paid_date: today, emi_amount: item.emiAmount,
          principal_amount: item.principalAmount, interest_amount: item.interestAmount,
          principal_due: item.principalAmount, interest_due: item.interestAmount,
          paid_amount: amount, penalty: pen, total_amount: amount + pen,
          status: "paid", payment_mode: "cash",
        });
      }

      // Update outstanding balance
      const { data: loanData } = await supabase
        .from("loans").select("outstanding_balance").eq("id", item.loanId).single();
      if (loanData) {
        const newBal = Math.max(0, (loanData.outstanding_balance ?? 0) - item.principalAmount);
        await supabase.from("loans").update({
          outstanding_balance: newBal,
          ...(newBal === 0 ? { status: "closed", closed_at: new Date().toISOString() } : {}),
        }).eq("id", item.loanId);
      }

      setItems((prev) =>
        prev.map((x) =>
          (x.loanId + "_" + x.installmentNo) === key
            ? { ...x, status: "paid", paidAmount: amount }
            : x
        )
      );
      setExpanded(null);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCollecting(null);
    }
  };

  const displayItems = tab === "pending" ? pendingItems : paidItems;

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title="Daily Collection" description="All active loans — collect with one tap">
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </PageHeader>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-700">{formatINR(totalDue)}</p>
          <p className="text-xs text-amber-600">Today's Due ({pendingItems.length} loans)</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-700">{formatINR(totalCollectedToday)}</p>
          <p className="text-xs text-emerald-600">Collected Today ({paidItems.length} loans)</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-sm flex items-center gap-2">
        <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by member name, phone, loan no..."
          className="flex-1 text-sm outline-none placeholder:text-slate-400"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-slate-400 text-xs hover:text-slate-600">✕</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("pending")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "pending"
              ? "bg-amber-500 text-white"
              : "bg-white border border-slate-200 text-slate-600"
          }`}
        >
          Pending ({pendingItems.length})
        </button>
        <button
          onClick={() => setTab("paid")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "paid"
              ? "bg-emerald-500 text-white"
              : "bg-white border border-slate-200 text-slate-600"
          }`}
        >
          Collected ({paidItems.length})
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading loans...</span>
        </div>
      ) : displayItems.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">
            {tab === "pending" ? "All collected for today! 🎉" : "Nothing collected today yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayItems.map((item) => {
            const key        = item.loanId + "_" + item.installmentNo;
            const isExpanded = expanded === key;
            const isBusy     = collecting === key;
            const amount     = customAmounts[key] ?? item.emiAmount;
            const pen        = penalties[key] ?? 0;
            const isPaid     = item.status === "paid";

            if (isPaid) {
              return (
                <div key={key} className="bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm">
                  <div className="flex items-center gap-3 p-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-200 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 text-sm truncate">{item.memberName}</p>
                      <p className="text-xs text-slate-400">{item.memberPhone} · {item.loanNo}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-emerald-700">{formatINR(item.paidAmount || item.emiAmount)}</p>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✓ Paid</span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={key}
                className={`bg-white rounded-xl shadow-sm overflow-hidden border ${
                  item.isOverdue ? "border-red-300" : "border-slate-200"
                }`}
              >
                {item.isOverdue && (
                  <div className="bg-red-50 px-3 py-1 text-xs text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Overdue — Was due: {formatDate(item.dueDate)}
                  </div>
                )}
                <div className="flex items-center gap-3 p-3">
                  {/* Avatar */}
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.isOverdue ? "bg-red-100" : "bg-blue-100"
                  }`}>
                    <span className={`text-sm font-bold ${item.isOverdue ? "text-red-700" : "text-blue-700"}`}>
                      {item.memberName[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{item.memberName}</p>
                    <p className="text-xs text-slate-400">{item.memberPhone}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-mono text-slate-400">{item.loanNo}</span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">Inst #{item.installmentNo}</span>
                      {!item.isOverdue && (
                        <>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-400">Due: {formatDate(item.dueDate)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount + Button */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{formatINR(item.emiAmount)}</p>
                      <p className="text-xs text-slate-400">{formatINR(item.outstandingBalance)} left</p>
                    </div>
                    <button
                      onClick={() => quickCollect(item)}
                      disabled={isBusy}
                      className={`flex items-center gap-1 px-3 py-2 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition-colors ${
                        item.isOverdue
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-emerald-500 hover:bg-emerald-600"
                      }`}
                    >
                      {isBusy
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <><Banknote className="h-4 w-4" /> Collect</>}
                    </button>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : key)}
                      className="p-1.5 text-slate-400 hover:text-slate-600"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-3">
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{item.memberPhone || "—"}</span>
                      <span className="ml-auto">Outstanding: {formatINR(item.outstandingBalance)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
                        <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                          <IndianRupee className="h-4 w-4 text-slate-400 ml-2 flex-shrink-0" />
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) =>
                              setCustomAmounts((p) => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))
                            }
                            className="flex-1 px-2 py-2 text-sm outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Penalty (₹)</label>
                        <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                          <IndianRupee className="h-4 w-4 text-slate-400 ml-2 flex-shrink-0" />
                          <input
                            type="number"
                            value={pen}
                            min={0}
                            onChange={(e) =>
                              setPenalties((p) => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))
                            }
                            className="flex-1 px-2 py-2 text-sm outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => quickCollect(item)}
                      disabled={isBusy}
                      className={`w-full py-2.5 text-white text-sm font-semibold rounded-lg disabled:opacity-60 flex items-center justify-center gap-2 ${
                        item.isOverdue ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"
                      }`}
                    >
                      {isBusy
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <><CheckCircle2 className="h-4 w-4" /> Collect {formatINR(amount + pen)}</>}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
