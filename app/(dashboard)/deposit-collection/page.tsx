"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatINR, formatDate } from "@/lib/utils";
import {
  CheckCircle2, Search, IndianRupee,
  ChevronDown, ChevronUp, Loader2, RefreshCw,
  AlertCircle, PiggyBank, Banknote,
} from "lucide-react";

interface DepositItem {
  depositId: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  depositNo: string;
  depositType: "savings" | "rd" | "drd";
  installmentAmount: number;  // expected per-installment (rd/drd) or 0 (savings)
  currentBalance: number;
  collectedToday: boolean;
  collectedAmount: number;
  txId: string | null;
}

export default function DepositCollectionPage() {
  const supabase = createClient();
  const [items, setItems] = useState<DepositItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"pending" | "collected">("pending");
  const [collecting, setCollecting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<{ [id: string]: number }>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    // Fetch all active savings / rd / drd deposits
    const { data: deposits } = await supabase
      .from("deposits")
      .select("id, deposit_no, type, deposit_type, amount, current_balance, member_id, members(name, phone)")
      .eq("status", "active");

    if (!deposits || deposits.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Filter out FD and MIS — they are one-time deposits, no recurring collection needed
    const collectableDeposits = (deposits as any[]).filter((d) => {
      const t = d.type ?? d.deposit_type ?? "";
      return !["fd", "mis"].includes(t.toLowerCase());
    });

    if (collectableDeposits.length === 0) { setItems([]); setLoading(false); return; }
    const depIds = collectableDeposits.map((d: any) => d.id);

    // Check which ones already got a transaction today
    const { data: todayTx } = await supabase
      .from("deposit_transactions")
      .select("deposit_id, id, amount")
      .in("deposit_id", depIds)
      .eq("date", today)
      .eq("transaction_type", "credit");

    const todayMap = new Map<string, { id: string; amount: number }>();
    for (const tx of (todayTx || []) as any[]) {
      todayMap.set(tx.deposit_id, { id: tx.id, amount: tx.amount });
    }

    const result: DepositItem[] = collectableDeposits.map((d) => {
      const depType = (d.type ?? d.deposit_type ?? "savings") as DepositItem["depositType"];
      const tx = todayMap.get(d.id);
      return {
        depositId: d.id,
        memberId: d.member_id,
        memberName: d.members?.name ?? "—",
        memberPhone: d.members?.phone ?? "",
        depositNo: d.deposit_no ?? d.id.slice(0, 8),
        depositType: depType,
        installmentAmount: depType !== "savings" ? (d.amount ?? 0) : 0,
        currentBalance: d.current_balance ?? 0,
        collectedToday: !!tx,
        collectedAmount: tx?.amount ?? 0,
        txId: tx?.id ?? null,
      };
    });

    // Pending first, then collected
    result.sort((a, b) => Number(a.collectedToday) - Number(b.collectedToday));
    setItems(result);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = items.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.memberName.toLowerCase().includes(q) ||
      r.depositNo.toLowerCase().includes(q) ||
      r.memberPhone.includes(q)
    );
  });

  const pendingItems    = filtered.filter((r) => !r.collectedToday);
  const collectedItems  = filtered.filter((r) => r.collectedToday);
  const totalPending    = pendingItems.reduce((s, r) => s + (r.installmentAmount || 0), 0);
  const totalCollected  = collectedItems.reduce((s, r) => s + r.collectedAmount, 0);
  const displayItems    = tab === "pending" ? pendingItems : collectedItems;

  const quickCollect = async (item: DepositItem) => {
    const amount = customAmounts[item.depositId] ?? item.installmentAmount;
    if (!amount || amount <= 0) {
      alert("Please enter an amount to deposit.");
      return;
    }
    setCollecting(item.depositId);

    try {
      const today = new Date().toISOString().split("T")[0];
      const newBalance = item.currentBalance + amount;

      const { error: txErr } = await supabase.from("deposit_transactions").insert({
        deposit_id:       item.depositId,
        member_id:        item.memberId,
        transaction_type: "credit",
        amount,
        narration: item.depositType !== "savings" ? "Installment Payment" : "Daily Deposit",
        date:             today,
        balance_after:    newBalance,
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
      setExpanded(null);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCollecting(null);
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

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-700">{pendingItems.length}</p>
          <p className="text-xs text-amber-600">Pending ({totalPending > 0 ? formatINR(totalPending) : "Savings incl."})</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-700">{formatINR(totalCollected)}</p>
          <p className="text-xs text-emerald-600">Collected Today ({collectedItems.length})</p>
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
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "pending"
              ? "bg-amber-500 text-white"
              : "bg-white border border-slate-200 text-slate-600"
          }`}
        >
          Pending ({pendingItems.length})
        </button>
        <button
          onClick={() => setTab("collected")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "collected"
              ? "bg-emerald-500 text-white"
              : "bg-white border border-slate-200 text-slate-600"
          }`}
        >
          Collected ({collectedItems.length})
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
            {tab === "pending" ? "All deposits collected today! 🎉" : "Nothing collected yet today"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayItems.map((item) => {
            const isBusy     = collecting === item.depositId;
            const isExpanded = expanded === item.depositId;
            const amount     = customAmounts[item.depositId] ?? item.installmentAmount;
            const isSavings  = item.depositType === "savings";

            if (item.collectedToday) {
              return (
                <div key={item.depositId} className="bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm">
                  <div className="flex items-center gap-3 p-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-200 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 text-sm truncate">{item.memberName}</p>
                      <p className="text-xs text-slate-400">{item.memberPhone} · {item.depositNo}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-emerald-700">{formatINR(item.collectedAmount)}</p>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✓ Collected</span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.depositId}
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200"
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Avatar */}
                  <div className="h-11 w-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-700">
                      {item.memberName[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-slate-800 text-sm truncate">{item.memberName}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColor(item.depositType)}`}>
                        {typeLabel(item.depositType)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{item.memberPhone}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-mono text-slate-400">{item.depositNo}</span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">Balance: {formatINR(item.currentBalance)}</span>
                    </div>
                  </div>

                  {/* Amount + Button */}
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
                        className="flex items-center gap-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition-colors"
                      >
                        {isBusy
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <><Banknote className="h-4 w-4" /> Collect</>}
                      </button>
                    ) : (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : item.depositId)}
                        className="flex items-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Banknote className="h-4 w-4" /> Deposit
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

                {/* Expanded panel */}
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
                    <button
                      onClick={() => quickCollect(item)}
                      disabled={isBusy || !amount}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isBusy
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <><CheckCircle2 className="h-4 w-4" /> Collect {amount ? formatINR(amount) : ""}</>}
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
