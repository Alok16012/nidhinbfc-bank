"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatINR, formatDate } from "@/lib/utils";
import { Search, IndianRupee, Wallet, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";

interface Deposit {
  id: string;
  deposit_no: string;
  type: string;
  current_balance: number;
  amount: number;
}

interface RecentWithdrawal {
  id: string;
  deposit_id: string;
  amount: number;
  date: string;
  narration: string;
  balance_after: number;
  member_name: string;
  deposit_no: string;
}

export default function WithdrawalsPage() {
  const supabase = createClient();

  // Search state
  const [query, setQuery]               = useState("");
  const [searching, setSearching]       = useState(false);
  const [members, setMembers]           = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [deposits, setDeposits]         = useState<Deposit[]>([]);
  const [loadingDep, setLoadingDep]     = useState(false);

  // Withdrawal form state
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [amount, setAmount]             = useState("");
  const [reason, setReason]             = useState("");
  const [paymentMode, setPaymentMode]   = useState("cash");
  const [wDate, setWDate]               = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");

  // Recent withdrawals
  const [recent, setRecent]             = useState<RecentWithdrawal[]>([]);

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  // Fetch recent withdrawals
  const fetchRecent = async () => {
    const { data } = await supabase
      .from("deposit_transactions")
      .select("id, deposit_id, amount, date, narration, balance_after, deposits(deposit_no, members(name))")
      .eq("transaction_type", "debit")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) {
      setRecent((data as any[]).map((r) => ({
        id: r.id,
        deposit_id: r.deposit_id,
        amount: r.amount,
        date: r.date,
        narration: r.narration,
        balance_after: r.balance_after,
        member_name: r.deposits?.members?.name ?? "—",
        deposit_no: r.deposits?.deposit_no ?? r.deposit_id?.slice(0, 8),
      })));
    }
  };

  useEffect(() => { fetchRecent(); }, []);

  // Debounced member search
  useEffect(() => {
    if (query.length < 2) { setMembers([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("members")
        .select("id, name, phone, member_id")
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,member_id.ilike.%${query}%`)
        .eq("status", "active")
        .limit(6);
      setMembers(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Load member's savings deposits
  const selectMember = async (m: any) => {
    setSelectedMember(m);
    setMembers([]);
    setQuery(m.name);
    setSelectedDeposit(null);
    setSuccess("");
    setError("");
    setLoadingDep(true);
    const { data } = await supabase
      .from("deposits")
      .select("id, deposit_no, type, deposit_type, current_balance, amount")
      .eq("member_id", m.id)
      .eq("status", "active")
      .in("type", ["savings", "rd", "drd"]);
    setDeposits((data || []) as Deposit[]);
    setLoadingDep(false);
  };

  const clearMember = () => {
    setSelectedMember(null);
    setDeposits([]);
    setSelectedDeposit(null);
    setQuery("");
    setSuccess("");
    setError("");
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeposit || !selectedMember) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }
    if (amt > selectedDeposit.current_balance) {
      setError(`Insufficient balance. Available: ${formatINR(selectedDeposit.current_balance)}`);
      return;
    }
    setSubmitting(true);
    setError("");

    const newBalance = selectedDeposit.current_balance - amt;

    const { error: txErr } = await supabase.from("deposit_transactions").insert({
      deposit_id:       selectedDeposit.id,
      member_id:        selectedMember.id,
      transaction_type: "debit",
      amount:           amt,
      narration:        reason ? `Withdrawal: ${reason}` : "Cash Withdrawal",
      date:             wDate,
      balance_after:    newBalance,
      payment_mode:     paymentMode,
    });

    if (txErr) { setError(txErr.message); setSubmitting(false); return; }

    await supabase.from("deposits")
      .update({ current_balance: newBalance })
      .eq("id", selectedDeposit.id);

    // Update local deposit balance
    setDeposits((prev) =>
      prev.map((d) => d.id === selectedDeposit.id ? { ...d, current_balance: newBalance } : d)
    );
    setSelectedDeposit((prev) => prev ? { ...prev, current_balance: newBalance } : prev);
    setSuccess(`₹${amt.toLocaleString("en-IN")} withdrawn successfully from ${selectedDeposit.deposit_no}`);
    setAmount("");
    setReason("");
    fetchRecent();
    setSubmitting(false);
  };

  const typeLabel = (t: string) =>
    t === "rd" ? "RD" : t === "drd" ? "DRD" : "Savings";

  const typeColor = (t: string) =>
    t === "rd" ? "bg-purple-100 text-purple-700" :
    t === "drd" ? "bg-blue-100 text-blue-700" :
    "bg-amber-100 text-amber-700";

  return (
    <div className="space-y-5 pb-6">
      <PageHeader title="Withdrawals" description="Process member withdrawal requests" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Left: Search + Form ── */}
        <div className="space-y-4">
          {/* Member Search */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Search Member</label>
            <div className="relative">
              <div className="flex items-center border border-slate-200 rounded-lg px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 bg-white">
                <Search className="h-4 w-4 text-slate-400 flex-shrink-0 mr-2" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); if (selectedMember) clearMember(); }}
                  placeholder="Name, phone, or member ID..."
                  className="flex-1 text-sm outline-none"
                />
                {searching && <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />}
                {selectedMember && (
                  <button onClick={clearMember} className="text-slate-400 hover:text-slate-600 ml-1">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {members.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => selectMember(m)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left"
                    >
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-700">{m.name[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{m.name}</p>
                        <p className="text-xs text-slate-400">{m.member_id} · {m.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected member info */}
            {selectedMember && (
              <div className="mt-3 flex items-center gap-3 bg-blue-50 rounded-lg px-3 py-2">
                <div className="h-9 w-9 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-blue-700">{selectedMember.name[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-800">{selectedMember.name}</p>
                  <p className="text-xs text-blue-600">{selectedMember.member_id} · {selectedMember.phone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Deposit Accounts */}
          {selectedMember && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Select Account</p>
              {loadingDep ? (
                <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Loading accounts...</span>
                </div>
              ) : deposits.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No active savings/RD/DRD accounts found</p>
              ) : (
                <div className="space-y-2">
                  {deposits.map((dep) => {
                    const t = dep.type ?? (dep as any).deposit_type ?? "savings";
                    const isSelected = selectedDeposit?.id === dep.id;
                    return (
                      <button
                        key={dep.id}
                        onClick={() => { setSelectedDeposit(isSelected ? null : dep); setError(""); setSuccess(""); }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors text-left ${
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Wallet className={`h-4 w-4 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                          <div>
                            <p className="text-sm font-medium text-slate-800">{dep.deposit_no}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColor(t)}`}>
                              {typeLabel(t)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${isSelected ? "text-blue-700" : "text-slate-800"}`}>
                            {formatINR(dep.current_balance)}
                          </p>
                          <p className="text-xs text-slate-400">Available</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Withdrawal Form */}
          {selectedDeposit && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Withdrawal Details</p>

              {success && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <p className="text-sm text-emerald-700">{success}</p>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleWithdraw} className="space-y-3">
                <div className="bg-slate-50 rounded-lg p-3 flex justify-between text-sm">
                  <span className="text-slate-500">Available Balance</span>
                  <span className="font-bold text-slate-800">{formatINR(selectedDeposit.current_balance)}</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹) *</label>
                  <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                    <IndianRupee className="h-4 w-4 text-slate-400 ml-3 flex-shrink-0" />
                    <input
                      type="number" min={1} required
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setError(""); setSuccess(""); }}
                      placeholder="Enter withdrawal amount"
                      className="flex-1 px-2 py-2.5 text-sm outline-none"
                    />
                  </div>
                  {amount && parseFloat(amount) > selectedDeposit.current_balance && (
                    <p className="text-xs text-red-500 mt-1">Exceeds available balance</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Payment Mode</label>
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className={inputClass}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="neft">NEFT / Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
                  <input type="date" required value={wDate} onChange={(e) => setWDate(e.target.value)} className={inputClass} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Medical emergency, Personal use"
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !amount || parseFloat(amount) > selectedDeposit.current_balance}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                    : <><Wallet className="h-4 w-4" /> Withdraw {amount ? formatINR(parseFloat(amount)) : ""}</>}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── Right: Recent Withdrawals ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Recent Withdrawals</h3>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No recent withdrawals</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{r.member_name}</p>
                    <p className="text-xs text-slate-400">{r.deposit_no} · {formatDate(r.date)}</p>
                    {r.narration && <p className="text-xs text-slate-400 truncate max-w-[180px]">{r.narration}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">-{formatINR(r.amount)}</p>
                    <p className="text-xs text-slate-400">Bal: {formatINR(r.balance_after)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
