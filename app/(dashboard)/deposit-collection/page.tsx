"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/hooks/useRole";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatINR, formatDate } from "@/lib/utils";
import {
  CheckCircle2, Search, IndianRupee,
  ChevronDown, ChevronUp, Loader2, RefreshCw,
  AlertCircle, PiggyBank, Banknote, ShieldCheck,
} from "lucide-react";

interface DepositItem {
  depositId: string;
  memberId: string;
  memberNo: string;
  memberName: string;
  memberPhone: string;
  depositNo: string;
  depositType: "savings" | "rd" | "drd";
  installmentAmount: number;
  currentBalance: number;
  collectedToday: boolean;    // confirmed credit tx
  isPendingConfirm: boolean;  // staff-recorded, awaiting manager OK
  collectedAmount: number;
  txId: string | null;
}

export default function DepositCollectionPage() {
  const supabase = createClient();
  const { isStaff, isAdmin, isManager, canConfirmCollection, loading: roleLoading } = useRole();

  const [items, setItems] = useState<DepositItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"pending" | "awaiting" | "collected">("pending");
  const [collecting, setCollecting] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<{ [id: string]: number }>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    const { data: deposits } = await supabase
      .from("deposits")
      .select("id, deposit_no, type, deposit_type, amount, current_balance, member_id, members(name, phone, member_id)")
      .eq("status", "active");

    if (!deposits || deposits.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const collectableDeposits = (deposits as any[]).filter((d) => {
      const t = d.type ?? d.deposit_type ?? "";
      return !["fd", "mis"].includes(t.toLowerCase());
    });

    if (collectableDeposits.length === 0) { setItems([]); setLoading(false); return; }
    const depIds = collectableDeposits.map((d: any) => d.id);

    // Fetch today's credit (confirmed) AND pending (staff-recorded) transactions
    const { data: todayTx } = await supabase
      .from("deposit_transactions")
      .select("deposit_id, id, amount, transaction_type")
      .in("deposit_id", depIds)
      .eq("date", today)
      .in("transaction_type", ["credit", "pending"]);

    // Build maps: credit map (confirmed) + pending map
    const creditMap = new Map<string, { id: string; amount: number }>();
    const pendingMap = new Map<string, { id: string; amount: number }>();
    for (const tx of (todayTx || []) as any[]) {
      if (tx.transaction_type === "credit") {
        creditMap.set(tx.deposit_id, { id: tx.id, amount: tx.amount });
      } else if (tx.transaction_type === "pending") {
        pendingMap.set(tx.deposit_id, { id: tx.id, amount: tx.amount });
      }
    }

    const result: DepositItem[] = collectableDeposits.map((d) => {
      const depType = (d.type ?? d.deposit_type ?? "savings") as DepositItem["depositType"];
      const creditTx = creditMap.get(d.id);
      const pendingTx = pendingMap.get(d.id);
      const activeTx = creditTx ?? pendingTx;
      return {
        depositId: d.id,
        memberId: d.member_id,
        memberNo: (d.members as any)?.member_id ?? "—",
        memberName: d.members?.name ?? "—",
        memberPhone: d.members?.phone ?? "",
        depositNo: d.deposit_no ?? d.id.slice(0, 8),
        depositType: depType,
        installmentAmount: depType !== "savings" ? (d.amount ?? 0) : 0,
        currentBalance: d.current_balance ?? 0,
        collectedToday: !!creditTx,
        isPendingConfirm: !!pendingTx && !creditTx,
        collectedAmount: activeTx?.amount ?? 0,
        txId: activeTx?.id ?? null,
      };
    });

    result.sort((a, b) => {
      const aVal = a.collectedToday ? 2 : a.isPendingConfirm ? 1 : 0;
      const bVal = b.collectedToday ? 2 : b.isPendingConfirm ? 1 : 0;
      return aVal - bVal;
    });
    setItems(result);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = items.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.memberName.toLowerCase().includes(q) ||
      r.depositNo.toLowerCase().includes(q) ||
      r.memberPhone.includes(q) ||
      r.memberNo.toLowerCase().includes(q)
    );
  });

  const pendingItems = filtered.filter((r) => !r.collectedToday && !r.isPendingConfirm);
  const awaitingItems = filtered.filter((r) => r.isPendingConfirm);
  const collectedItems = filtered.filter((r) => r.collectedToday);
  const totalPending = pendingItems.reduce((s, r) => s + (r.installmentAmount || 0), 0);
  const totalCollected = collectedItems.reduce((s, r) => s + r.collectedAmount, 0);

  const displayItems =
    tab === "pending" ? pendingItems :
      tab === "awaiting" ? awaitingItems :
        collectedItems;

  const quickCollect = async (item: DepositItem) => {
    const amount = customAmounts[item.depositId] ?? item.installmentAmount;
    if (!amount || amount <= 0) {
      alert("Please enter an amount to deposit.");
      return;
    }
    setCollecting(item.depositId);
    try {
      const today = new Date().toISOString().split("T")[0];

      if (isStaff) {
        // Staff: insert with transaction_type="pending", do NOT update balance
        const { error: txErr } = await supabase.from("deposit_transactions").insert({
          deposit_id: item.depositId,
          member_id: item.memberId,
          transaction_type: "pending",
          amount,
          narration: item.depositType !== "savings" ? "Installment Payment" : "Daily Deposit",
          date: today,
          balance_after: item.currentBalance + amount,
          payment_mode: "cash",
        });
        if (txErr) throw txErr;

        setItems((prev) =>
          prev.map((x) =>
            x.depositId === item.depositId
              ? { ...x, isPendingConfirm: true, collectedAmount: amount, txId: null }
              : x
          )
        );
      } else {
        // Manager / Admin: direct credit + update balance
        const newBalance = item.currentBalance + amount;
        const { error: txErr } = await supabase.from("deposit_transactions").insert({
          deposit_id: item.depositId,
          member_id: item.memberId,
          transaction_type: "credit",
          amount,
          narration: item.depositType !== "savings" ? "Installment Payment" : "Daily Deposit",
          date: today,
          balance_after: newBalance,
          payment_mode: "cash",
        });
        if (txErr) throw txErr;

        await supabase.from("deposits")
          .update({ current_balance: newBalance })
          .eq("id", item.depositId);

        setItems((prev) =>
          prev.map((x) =>
            x.depositId === item.depositId
              ? { ...x, collectedToday: true, collectedAmount: amount, currentBalance: newBalance }
              : x
          )
        );
      }
      setExpanded(null);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCollecting(null);
    }
  };

  const confirmDeposit = async (item: DepositItem) => {
    if (!item.txId) return;
    setConfirming(item.depositId);
    try {
      // Update transaction_type from "pending" → "credit"
      const { error: updErr } = await supabase
        .from("deposit_transactions")
        .update({ transaction_type: "credit" })
        .eq("id", item.txId);
      if (updErr) throw updErr;

      // Update the deposit balance
      const newBalance = item.currentBalance + item.collectedAmount;
      await supabase.from("deposits")
        .update({ current_balance: newBalance })
        .eq("id", item.depositId);

      setItems((prev) =>
        prev.map((x) =>
          x.depositId === item.depositId
            ? { ...x, collectedToday: true, isPendingConfirm: false, currentBalance: newBalance }
            : x
        )
      );
    } catch (err: any) {
      alert("Error confirming: " + err.message);
    } finally {
      setConfirming(null);
    }
  };

  const typeLabel = (t: string) =>
    t === "rd" ? "RD" : t === "drd" ? "DRD" : "Savings";

  const typeColor = (t: string) =>
    t === "rd" ? "bg-purple-100 text-purple-700" :
      t === "drd" ? "bg-blue-100 text-blue-700" :
        "bg-amber-100 text-amber-700";

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title="Daily Deposit Collection" description="Savings · RD · DRD — collect with one tap">
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </PageHeader>

      {/* Role Banner */}
      {!roleLoading && (
        <div className={`rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${isStaff ? "bg-amber-50 text-amber-800 border border-amber-200"
          : isManager ? "bg-blue-50 text-blue-800 border border-blue-200"
            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }`}>
          <ShieldCheck className="h-4 w-4 flex-shrink-0" />
          {isStaff ? "Staff mode — your collections go to manager for confirmation before balance updates"
            : isManager ? "Manager mode — you can collect directly & confirm pending staff collections"
              : "Admin mode — full access to all collection actions"}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-700">{pendingItems.length}</p>
          <p className="text-xs text-amber-600">Pending</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-orange-700">{awaitingItems.length}</p>
          <p className="text-xs text-orange-600">Awaiting OK</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-700">{formatINR(totalCollected)}</p>
          <p className="text-xs text-emerald-600">Collected ({collectedItems.length})</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-sm flex items-center gap-2">
        <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by member name, phone, deposit no..."
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
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "pending"
            ? "bg-amber-500 text-white"
            : "bg-white border border-slate-200 text-slate-600"
            }`}
        >
          Pending ({pendingItems.length})
        </button>
        <button
          onClick={() => setTab("awaiting")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "awaiting"
            ? "bg-orange-500 text-white"
            : "bg-white border border-slate-200 text-slate-600"
            }`}
        >
          Awaiting OK ({awaitingItems.length})
        </button>
        <button
          onClick={() => setTab("collected")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "collected"
            ? "bg-emerald-500 text-white"
            : "bg-white border border-slate-200 text-slate-600"
            }`}
        >
          Done ({collectedItems.length})
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading deposits...</span>
        </div>
      ) : displayItems.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <PiggyBank className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">
            {tab === "pending" ? "All deposits collected today! 🎉"
              : tab === "awaiting" ? "No pending confirmations"
                : "Nothing collected yet today"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayItems.map((item) => {
            const isBusy = collecting === item.depositId;
            const isConf = confirming === item.depositId;
            const isExpanded = expanded === item.depositId;
            const amount = customAmounts[item.depositId] ?? item.installmentAmount;
            const isSavings = item.depositType === "savings";

            // Confirmed / collected card (Simplified view, but allow re-deposit)
            if (item.collectedToday && !isExpanded) {
              return (
                <div key={item.depositId} className="bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm transition-all hover:shadow-md cursor-pointer" onClick={() => setExpanded(item.depositId)}>
                  <div className="flex items-center gap-3 p-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-200 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 text-sm truncate">{item.memberName}</p>
                      <p className="text-xs text-slate-400">{item.memberNo} · {item.depositNo}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-emerald-700">{formatINR(item.collectedAmount)}</p>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase font-bold">✓ Collected</span>
                    </div>
                  </div>
                </div>
              );
            }

            // Awaiting confirmation card (staff-recorded, manager needs to confirm)
            if (item.isPendingConfirm) {
              return (
                <div key={item.depositId} className="bg-orange-50 rounded-xl border border-orange-200 shadow-sm">
                  <div className="flex items-center gap-3 p-3">
                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 text-sm truncate">{item.memberName}</p>
                      <p className="text-xs text-slate-400">{item.memberPhone} · {item.depositNo}</p>
                      <p className="text-xs text-orange-600 font-medium mt-0.5">
                        ₹{formatINR(item.collectedAmount)} — recorded by staff, awaiting confirmation
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                        Awaiting OK
                      </span>
                      {canConfirmCollection && (
                        <button
                          onClick={() => confirmDeposit(item)}
                          disabled={isConf}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {isConf
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <><ShieldCheck className="h-3.5 w-3.5" /> Confirm</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // Pending (not yet collected) card
            return (
              <div
                key={item.depositId}
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200"
              >
                <div className="flex items-center gap-3 p-3">
                  <div className="h-11 w-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-700">
                      {item.memberName[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-slate-800 text-sm truncate">{item.memberName}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColor(item.depositType)}`}>
                        {typeLabel(item.depositType)}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-600">{item.memberNo}</span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs font-mono text-slate-400">{item.depositNo}</span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400">Balance: {formatINR(item.currentBalance)}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      {item.installmentAmount > 0 ? (
                        <>
                          <p className="text-sm font-bold text-slate-800">{formatINR(item.installmentAmount)}</p>
                          <p className="text-xs text-slate-400">per installment</p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400">custom amt</p>
                      )}
                    </div>
                    {!isSavings ? (
                      <button
                        onClick={() => quickCollect(item)}
                        disabled={isBusy}
                        className={`flex items-center gap-1 px-3 py-2 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition-colors ${isStaff ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"
                          }`}
                      >
                        {isBusy
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <><Banknote className="h-4 w-4" /> {isStaff ? "Record" : "Collect"}</>}
                      </button>
                    ) : (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : item.depositId)}
                        className={`flex items-center gap-1 px-3 py-2 text-white text-xs font-semibold rounded-lg transition-colors ${isStaff ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-500 hover:bg-blue-600"
                          }`}
                      >
                        <Banknote className="h-4 w-4" /> {isStaff ? "Record" : "Deposit"}
                      </button>
                    )}
                    {!isSavings && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : item.depositId)}
                        className="p-1.5 text-slate-400 hover:text-slate-600"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {isSavings ? "Deposit Amount (₹)" : "Custom Amount (₹)"}
                      </label>
                      <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                        <IndianRupee className="h-4 w-4 text-slate-400 ml-2 flex-shrink-0" />
                        <input
                          type="number"
                          min={1}
                          value={amount || ""}
                          onChange={(e) =>
                            setCustomAmounts((p) => ({ ...p, [item.depositId]: parseFloat(e.target.value) || 0 }))
                          }
                          placeholder={isSavings ? "Enter amount" : String(item.installmentAmount)}
                          className="flex-1 px-2 py-2 text-sm outline-none"
                        />
                      </div>
                    </div>
                    {item.collectedToday && (
                      <p className="text-[10px] text-emerald-600 font-bold text-center mt-2">
                        Already collected {formatINR(item.collectedAmount)} today. You can deposit more if needed.
                      </p>
                    )}
                    <button
                      onClick={() => quickCollect(item)}
                      disabled={isBusy || !amount}
                      className={`w-full py-2.5 text-white text-sm font-semibold rounded-lg disabled:opacity-60 flex items-center justify-center gap-2 ${isStaff ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"
                        }`}
                    >
                      {isBusy
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <><CheckCircle2 className="h-4 w-4" /> {isStaff ? "Record" : (item.collectedToday ? "Deposit Again" : "Collect")} {amount ? formatINR(amount) : ""}</>}
                    </button>
                    {isStaff && (
                      <p className="text-xs text-amber-600 text-center">
                        This will be saved for manager approval before the balance updates.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )
      }
    </div >
  );
}
