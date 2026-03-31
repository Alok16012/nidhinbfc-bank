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
  AlertCircle, Banknote, XCircle, Lock, Clock, ShieldCheck
} from "lucide-react";
import { useRole } from "@/lib/hooks/useRole";

interface CollectItem {
  repaymentId: string | null;
  loanId: string;
  memberId: string;
  memberName: string;
  memberNo: string;
  memberPhone: string;
  loanNo: string;
  installmentNo: number;
  dueDate: string;
  emiAmount: number;
  principalAmount: number;
  interestAmount: number;
  outstandingBalance: number;
  isOverdue: boolean;
  status: "pending" | "paid" | "overdue" | "recorded";
  paidAmount: number;
  recordedBy?: string;
  dbRowId?: string;
}

export default function CollectionPage() {
  const supabase = createClient();
  const { isStaff, canConfirmCollection, canRecordCollection, userId, role } = useRole();
  const [items, setItems] = useState<CollectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"pending" | "recorded" | "paid">("pending");
  const [collecting, setCollecting] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<{ [key: string]: number }>({});
  const [penalties, setPenalties] = useState<{ [key: string]: number }>({});

  // --- Loan Search & Close ---
  const [loanSearch, setLoanSearch] = useState("");
  const [loanResults, setLoanResults] = useState<any[]>([]);
  const [loanSearching, setLoanSearching] = useState(false);
  const [loanSearched, setLoanSearched] = useState(false); // track if search was run
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [closeAmount, setCloseAmount] = useState(0);
  const [closingLoan, setClosingLoan] = useState(false);
  const [showLoanSearch, setShowLoanSearch] = useState(true);

  // Auto-search when loanSearch has 2+ characters (debounced 400ms)
  useEffect(() => {
    if (!loanSearch.trim() || loanSearch.trim().length < 2) {
      setLoanResults([]);
      setLoanSearched(false);
      return;
    }
    const timer = setTimeout(() => { searchLoans(loanSearch); }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanSearch]);

  const searchLoans = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) { setLoanResults([]); return; }
    setLoanSearching(true);
    try {
      const loanSelect = "id, loan_no, amount, outstanding_balance, emi_amount, status, member_id, member:members(id, name, phone, member_id)";
      // Search active (disbursed) loans only
      const activeStatuses = ["disbursed"];

      // 1. Search by loan_no
      const { data: byLoanNo } = await supabase
        .from("loans")
        .select(loanSelect)
        .in("status", activeStatuses)
        .ilike("loan_no", `%${trimmed}%`)
        .limit(8);

      // 2 & 3. Search members by name, member_id, phone simultaneously
      const [{ data: byName }, { data: byMemberId }, { data: byPhone }] = await Promise.all([
        supabase.from("members").select("id").ilike("name", `%${trimmed}%`).limit(15),
        supabase.from("members").select("id").ilike("member_id", `%${trimmed}%`).limit(10),
        supabase.from("members").select("id").ilike("phone", `%${trimmed}%`).limit(8),
      ]);

      const allMemberIds = [
        ...(byName     || []).map((m: any) => m.id),
        ...(byMemberId || []).map((m: any) => m.id),
        ...(byPhone    || []).map((m: any) => m.id),
      ];

      let byMember: any[] = [];
      if (allMemberIds.length > 0) {
        const uniqueIds = [...new Set(allMemberIds)];
        const { data } = await supabase
          .from("loans")
          .select(loanSelect)
          .in("status", activeStatuses)
          .in("member_id", uniqueIds)
          .limit(15);
        byMember = data || [];
      }

      // Merge & deduplicate by loan id
      const all = [...(byLoanNo || []), ...byMember];
      const seen = new Set<string>();
      const unique = all.filter((l) => { if (seen.has(l.id)) return false; seen.add(l.id); return true; });
      setLoanResults(unique.slice(0, 10));
      setLoanSearched(true);
    } catch (err: any) {
      console.error("Loan search error:", err.message);
      setLoanResults([]);
      setLoanSearched(true);
    } finally {
      setLoanSearching(false);
    }
  };

  const selectLoan = (loan: any) => {
    setSelectedLoan(loan);
    setCloseAmount(loan.outstanding_balance ?? 0);
    setLoanResults([]);
    setLoanSearch("");
  };

  const closeLoan = async () => {
    if (!selectedLoan) return;
    if (!confirm(`Close loan ${selectedLoan.loan_no}? Outstanding: ${formatINR(selectedLoan.outstanding_balance)}`)) return;
    setClosingLoan(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      // Insert final payment record
      await supabase.from("loan_repayments").insert({
        loan_id: selectedLoan.id,
        member_id: selectedLoan.member?.id ?? selectedLoan.member_id,
        installment_no: 9999,
        due_date: today,
        paid_date: today,
        emi_amount: closeAmount,
        paid_amount: closeAmount,
        total_amount: closeAmount,
        status: "paid",
        payment_mode: "cash",
        narration: "Loan Pre-closure",
      });
      // Close the loan
      await supabase.from("loans").update({
        status: "closed",
        outstanding_balance: 0,
        closed_at: new Date().toISOString(),
      }).eq("id", selectedLoan.id);

      alert(`✅ Loan ${selectedLoan.loan_no} closed successfully!`);
      setSelectedLoan(null);
      setShowLoanSearch(false);
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setClosingLoan(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    // Fetch all disbursed loans
    const { data: loans } = await supabase
      .from("loans")
      .select(`
        id, loan_no, member_id, amount, interest_rate, tenure_months,
        emi_frequency, calculation_type, disbursed_date, outstanding_balance, emi_amount,
        member:members(name, phone, member_id)
      `)
      .eq("status", "disbursed");

    if (!loans || loans.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Fetch today's paid OR recorded installments
    const loanIds = loans.map((l: any) => l.id);
    const { data: todayRepayments } = await supabase
      .from("loan_repayments")
      .select("id, loan_id, installment_no, paid_amount, status, payment_mode")
      .in("loan_id", loanIds)
      .eq("paid_date", today)
      .in("status", ["paid", "recorded"]);

    const todayMap = new Map<string, any>();
    for (const p of (todayRepayments || []) as any[]) {
      todayMap.set(p.loan_id, p);
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

      const todayEntry = todayMap.get(loan.id);
      const todayStatus = todayEntry?.status; // "paid" | "recorded" | undefined

      let itemStatus: CollectItem["status"] = isOverdue ? "overdue" : "pending";
      if (todayStatus === "paid") itemStatus = "paid";
      if (todayStatus === "recorded") itemStatus = "recorded";

      result.push({
        repaymentId: null,
        dbRowId: todayEntry?.id ?? null,
        loanId: loan.id,
        memberId: loan.member_id,
        memberName: (loan.member as any)?.name ?? "—",
        memberNo: (loan.member as any)?.member_id ?? "—",
        memberPhone: (loan.member as any)?.phone ?? "",
        loanNo: loan.loan_no,
        installmentNo: nextInstallmentNo,
        dueDate: nextDueDate,
        emiAmount: emiAmt,
        principalAmount: nextPrincipal,
        interestAmount: nextInterest,
        outstandingBalance: loan.outstanding_balance ?? 0,
        isOverdue,
        status: itemStatus,
        paidAmount: todayEntry?.paid_amount ?? 0,
        recordedBy: todayEntry?.payment_mode === "staff_recorded" ? "staff" : undefined,
      });
    }

    // Sort: overdue first, then pending, then recorded (needs confirm), then paid
    result.sort((a, b) => {
      const order: Record<string, number> = { overdue: 0, pending: 1, recorded: 2, paid: 3 };
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
      r.memberPhone.includes(q) ||
      (r as any).memberNo?.toLowerCase().includes(q)
    );
  });

  const pendingItems = filtered.filter((r) => r.status === "pending" || r.status === "overdue");
  const recordedItems = filtered.filter((r) => r.status === "recorded");
  const paidItems = filtered.filter((r) => r.status === "paid");
  const totalDue = items.filter(i => i.status === "pending" || i.status === "overdue").reduce((s, r) => s + r.emiAmount, 0);
  const totalCollectedToday = items.filter(i => i.status === "paid").reduce((s, r) => s + (r.paidAmount || r.emiAmount), 0);

  // Staff records as "recorded", Manager/Admin records as "paid"
  const quickCollect = async (item: CollectItem) => {
    const key = item.loanId + "_" + item.installmentNo;
    const amount = customAmounts[key] ?? item.emiAmount;
    const pen = penalties[key] ?? 0;
    // Staff saves as "recorded" (pending manager confirmation)
    const saveStatus = isStaff ? "recorded" : "paid";
    const payMode = isStaff ? "staff_recorded" : "cash";
    setCollecting(key);

    try {
      const today = new Date().toISOString().split("T")[0];

      const { data: existing } = await supabase
        .from("loan_repayments")
        .select("id")
        .eq("loan_id", item.loanId)
        .eq("installment_no", item.installmentNo)
        .maybeSingle();

      if (existing) {
        await supabase.from("loan_repayments").update({
          paid_date: today, paid_amount: amount, penalty: pen,
          total_amount: amount + pen, status: saveStatus, payment_mode: payMode,
        }).eq("id", existing.id);
      } else {
        await supabase.from("loan_repayments").insert({
          loan_id: item.loanId, member_id: item.memberId,
          installment_no: item.installmentNo, due_date: item.dueDate,
          paid_date: today, emi_amount: item.emiAmount,
          principal_amount: item.principalAmount, interest_amount: item.interestAmount,
          principal_due: item.principalAmount, interest_due: item.interestAmount,
          paid_amount: amount, penalty: pen, total_amount: amount + pen,
          status: saveStatus, payment_mode: payMode,
        });
      }

      // Only update balance if manager/admin confirms directly
      if (!isStaff) {
        const { data: loanData } = await supabase
          .from("loans").select("outstanding_balance").eq("id", item.loanId).single();
        if (loanData) {
          const newBal = Math.max(0, (loanData.outstanding_balance ?? 0) - item.principalAmount);
          await supabase.from("loans").update({
            outstanding_balance: newBal,
            ...(newBal === 0 ? { status: "closed", closed_at: new Date().toISOString() } : {}),
          }).eq("id", item.loanId);
        }
      }

      setItems((prev) =>
        prev.map((x) =>
          (x.loanId + "_" + x.installmentNo) === key
            ? { ...x, status: saveStatus as any, paidAmount: amount, recordedBy: isStaff ? "staff" : undefined }
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

  // Manager/Admin confirms a staff-recorded collection
  const confirmCollection = async (item: CollectItem) => {
    if (!item.dbRowId) return;
    setConfirming(item.loanId + "_" + item.installmentNo);
    try {
      await supabase.from("loan_repayments").update({
        status: "paid", payment_mode: "cash",
      }).eq("id", item.dbRowId);

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
          x.dbRowId === item.dbRowId ? { ...x, status: "paid" } : x
        )
      );
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setConfirming(null);
    }
  };

  const displayItems = tab === "pending" ? pendingItems : tab === "recorded" ? recordedItems : paidItems;

  return (
    <div className="space-y-4 pb-6">
      {/* Role banner */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${isStaff ? "bg-amber-50 border border-amber-200 text-amber-700"
        : role === "manager" ? "bg-purple-50 border border-purple-200 text-purple-700"
          : "bg-blue-50 border border-blue-200 text-blue-700"
        }`}>
        <ShieldCheck className="h-4 w-4 flex-shrink-0" />
        {isStaff
          ? "Staff mode — your collections go to manager for confirmation"
          : role === "manager"
            ? "Manager mode — you can confirm staff collections & collect directly"
            : "Admin mode — full access"}
      </div>

      <PageHeader title="Daily Collection" description="All active loans — collect with one tap">
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </PageHeader>

      {/* Loan Search / Close Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => { setShowLoanSearch((v) => !v); setSelectedLoan(null); setLoanResults([]); setLoanSearch(""); setLoanSearched(false); }}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-blue-500" />
            Search Loan / Close Loan
          </span>
          {showLoanSearch ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>

        {showLoanSearch && (
          <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
            {/* Search input — auto-search after 2 chars */}
            <div className="relative">
              {loanSearching
                ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
                : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              }
              <input
                type="text"
                value={loanSearch}
                onChange={(e) => { setLoanSearch(e.target.value); setLoanSearched(false); setSelectedLoan(null); }}
                placeholder="Member name, member ID, phone or loan no..."
                className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                autoFocus
              />
              {loanSearch && (
                <button
                  onClick={() => { setLoanSearch(""); setLoanResults([]); setLoanSearched(false); setSelectedLoan(null); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >✕</button>
              )}
            </div>
            {loanSearch.trim().length > 0 && loanSearch.trim().length < 2 && (
              <p className="text-xs text-slate-400 px-1">Type at least 2 characters to search...</p>
            )}

            {/* Search results */}
            {loanResults.length > 0 && !selectedLoan && (
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                {loanResults.map((loan) => (
                  <button
                    key={loan.id}
                    onClick={() => selectLoan(loan)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{loan.member?.name}</p>
                      <p className="text-xs text-slate-400">{loan.loan_no} · {(loan.member as any)?.member_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{formatINR(loan.outstanding_balance)}</p>
                      <p className="text-xs text-slate-400">outstanding</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {/* No results message */}
            {loanSearched && loanResults.length === 0 && !selectedLoan && loanSearch.trim() && (
              <div className="text-center py-4 text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
                <Search className="h-6 w-6 mx-auto mb-1 opacity-40" />
                <p className="text-sm">No active loans found for <strong>"{loanSearch}"</strong></p>
                <p className="text-xs mt-0.5">Try member name, member ID or loan number</p>
              </div>
            )}

            {/* Selected loan details */}
            {selectedLoan && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{selectedLoan.member?.name}</p>
                    <p className="text-xs text-slate-500">{selectedLoan.loan_no} · {selectedLoan.member?.phone}</p>
                  </div>
                  <button onClick={() => setSelectedLoan(null)} className="text-slate-400 hover:text-slate-600">
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-slate-400">Loan Amount</p>
                    <p className="text-sm font-bold text-slate-700">{formatINR(selectedLoan.amount)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-slate-400">Outstanding</p>
                    <p className="text-sm font-bold text-red-600">{formatINR(selectedLoan.outstanding_balance)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-slate-400">EMI</p>
                    <p className="text-sm font-bold text-slate-700">{formatINR(selectedLoan.emi_amount)}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Closure Amount (₹)</label>
                  <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                    <IndianRupee className="h-4 w-4 text-slate-400 ml-2 flex-shrink-0" />
                    <input
                      type="number"
                      value={closeAmount || ""}
                      onChange={(e) => setCloseAmount(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-2 py-2.5 text-sm outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={closeLoan}
                  disabled={closingLoan || !closeAmount}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {closingLoan
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Closing...</>
                    : <><Lock className="h-4 w-4" /> Close Loan — {formatINR(closeAmount)}</>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-700">{pendingItems.length}</p>
          <p className="text-xs text-amber-600">Pending</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-orange-600">{recordedItems.length}</p>
          <p className="text-xs text-orange-500">Awaiting OK</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-700">{paidItems.length}</p>
          <p className="text-xs text-emerald-600">Confirmed</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-sm flex items-center gap-2">
        <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, loan #, or member ID..."
          className="flex-1 text-sm outline-none placeholder:text-slate-400"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-slate-400 text-xs hover:text-slate-600">✕</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        {[
          { key: "pending", label: `Pending (${pendingItems.length})`, color: "bg-amber-500" },
          { key: "recorded", label: `Awaiting OK (${recordedItems.length})`, color: "bg-orange-500" },
          { key: "paid", label: `Confirmed (${paidItems.length})`, color: "bg-emerald-500" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === t.key ? `${t.color} text-white` : "bg-white border border-slate-200 text-slate-600"
              }`}
          >
            {t.label}
          </button>
        ))}
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
            const key = item.loanId + "_" + item.installmentNo;
            const isExpanded = expanded === key;
            const isBusy = collecting === key;
            const amount = customAmounts[key] ?? item.emiAmount;
            const pen = penalties[key] ?? 0;
            const isPaid = item.status === "paid";
            const isRecorded = item.status === "recorded";
            const isConfirming = confirming === key;

            // "Recorded by staff" card — needs manager confirmation
            if (isRecorded) {
              return (
                <div key={key} className="bg-orange-50 rounded-xl border border-orange-300 shadow-sm">
                  <div className="flex items-center gap-3 p-3">
                    <div className="h-10 w-10 rounded-full bg-orange-200 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 text-sm truncate">{item.memberName}</p>
                      <p className="text-xs text-slate-400">{item.memberNo} · {item.loanNo}</p>
                      <p className="text-xs text-orange-600 font-medium mt-0.5">Recorded by staff — awaiting confirmation</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-700">{formatINR(item.paidAmount || item.emiAmount)}</p>
                      </div>
                      {canConfirmCollection && (
                        <button
                          onClick={() => confirmCollection(item)}
                          disabled={isConfirming}
                          className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {isConfirming
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <><ShieldCheck className="h-4 w-4" /> Confirm</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // "Paid & confirmed" card
            if (isPaid) {
              return (
                <div key={key} className="bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm">
                  <div className="flex items-center gap-3 p-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-200 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 text-sm truncate">{item.memberName}</p>
                      <p className="text-xs text-slate-400">{item.memberNo} · {item.loanNo}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-emerald-700">{formatINR(item.paidAmount || item.emiAmount)}</p>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✓ Confirmed</span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={key}
                className={`bg-white rounded-xl shadow-sm overflow-hidden border ${item.isOverdue ? "border-red-300" : "border-slate-200"
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
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 ${item.isOverdue ? "bg-red-100" : "bg-blue-100"
                    }`}>
                    <span className={`text-sm font-bold ${item.isOverdue ? "text-red-700" : "text-blue-700"}`}>
                      {item.memberName[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{item.memberName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-mono font-bold text-blue-600">{item.memberNo}</span>
                      <span className="text-xs text-slate-300">·</span>
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
                      className={`flex items-center gap-1 px-3 py-2 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition-colors ${item.isOverdue
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
                      className={`w-full py-2.5 text-white text-sm font-semibold rounded-lg disabled:opacity-60 flex items-center justify-center gap-2 ${item.isOverdue ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"
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
