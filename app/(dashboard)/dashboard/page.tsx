"use client";

import { useEffect, useState } from "react";
import {
  Users,
  CreditCard,
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  IndianRupee,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { OverdueWidget } from "@/components/dashboard/OverdueWidget";
import { MaturityWidget } from "@/components/dashboard/MaturityWidget";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { createClient } from "@/lib/supabase/client";

// ── Shape expected by each widget ──────────────────────────────
interface OverdueLoan {
  id: string;
  loan_id: string;
  member_name: string;
  emi_amount: number;
  days_overdue: number;
  due_date: string;
}

interface MaturityDeposit {
  id: string;
  deposit_id: string;
  member_name: string;
  maturity_amount: number;
  maturity_date: string;
  deposit_type: string;
}

interface Transaction {
  id: string;
  date: string;
  member_name: string;
  narration: string;
  debit: number;
  credit: number;
  transaction_type: string;
}

interface KPIs {
  totalMembers: number;
  activeLoans: number;
  loanOutstanding: number;
  totalDeposits: number;
  collectionToday: number;
  npaCount: number;
}

export default function DashboardPage() {
  const supabase = createClient();

  const [kpis, setKpis] = useState<KPIs>({
    totalMembers: 0,
    activeLoans: 0,
    loanOutstanding: 0,
    totalDeposits: 0,
    collectionToday: 0,
    npaCount: 0,
  });
  const [overdueLoans, setOverdueLoans] = useState<OverdueLoan[]>([]);
  const [maturityDeposits, setMaturityDeposits] = useState<MaturityDeposit[]>([]);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const in30Days = new Date(Date.now() + 30 * 86400000)
          .toISOString()
          .split("T")[0];
        const in7Days = new Date(Date.now() + 7 * 86400000)
          .toISOString()
          .split("T")[0];

        const [
          { count: membersCount },
          { data: loansData },
          { data: depositsData },
          { data: todayRepayments },
          { count: npaCount },
          { data: overdueData },
          { data: maturityData },
          { data: passbookData },
        ] = await Promise.all([
          // 1. Active members
          supabase
            .from("members")
            .select("*", { count: "exact", head: true })
            .eq("status", "active"),

          // 2. Loan portfolio
          supabase
            .from("loans")
            .select("id, principal_outstanding, status")
            .in("status", ["disbursed", "npa"]),

          // 3. Deposit balances
          supabase
            .from("deposits")
            .select("balance, type, amount")
            .eq("status", "active"),

          // 4. Today's EMI collection
          supabase
            .from("loan_repayments")
            .select("total_amount")
            .eq("paid_date", today)
            .eq("status", "paid"),

          // 5. NPA count
          supabase
            .from("loans")
            .select("*", { count: "exact", head: true })
            .eq("status", "npa"),

          // 6. Overdue repayments with loan + member
          supabase
            .from("loan_repayments")
            .select("id, loan_id, due_date, total_amount, loans(loan_no), members(name)")
            .lt("due_date", today)
            .eq("status", "partial")
            .order("due_date", { ascending: true })
            .limit(10),

          // 7. Deposits maturing in next 30 days (7-day alerts shown prominently)
          supabase
            .from("deposits")
            .select("id, deposit_no, type, maturity_date, maturity_amount, members(name)")
            .gte("maturity_date", today)
            .lte("maturity_date", in30Days)
            .eq("status", "active")
            .order("maturity_date", { ascending: true })
            .limit(15),

          // 8. Recent passbook entries
          supabase
            .from("passbook")
            .select("id, narration, debit, credit, transaction_date, type, members(name)")
            .order("created_at", { ascending: false })
            .limit(8),
        ]);

        // ── KPIs ──────────────────────────────────────────────────────
        const activeLoans = (loansData ?? []).filter(
          (l) => l.status === "disbursed"
        );
        const loanOutstanding = activeLoans.reduce(
          (s, l) => s + (l.principal_outstanding ?? 0),
          0
        );
        const totalDeposits = (depositsData ?? []).reduce(
          (s, d) => s + (d.balance ?? d.amount ?? 0),
          0
        );
        const collectionToday = (todayRepayments ?? []).reduce(
          (s, r) => s + (r.total_amount ?? 0),
          0
        );

        setKpis({
          totalMembers: membersCount ?? 0,
          activeLoans: activeLoans.length,
          loanOutstanding,
          totalDeposits,
          collectionToday,
          npaCount: npaCount ?? 0,
        });

        // ── Overdue widget ────────────────────────────────────────────
        const overdue: OverdueLoan[] = (overdueData ?? []).map((r: any) => {
          const diffDays = Math.floor(
            (Date.now() - new Date(r.due_date).getTime()) / 86400000
          );
          return {
            id: r.id,
            loan_id: r.loans?.loan_no ?? r.loan_id,
            member_name: r.members?.name ?? "Unknown",
            emi_amount: r.total_amount ?? 0,
            days_overdue: diffDays,
            due_date: r.due_date,
          };
        });
        setOverdueLoans(overdue);

        // ── Maturity widget ───────────────────────────────────────────
        const maturity: MaturityDeposit[] = (maturityData ?? []).map(
          (d: any) => ({
            id: d.id,
            deposit_id: d.deposit_no,
            member_name: d.members?.name ?? "Unknown",
            maturity_amount: d.maturity_amount ?? 0,
            maturity_date: d.maturity_date,
            deposit_type: d.type,
          })
        );
        setMaturityDeposits(maturity);

        // ── Recent transactions ───────────────────────────────────────
        const txns: Transaction[] = (passbookData ?? []).map((p: any) => ({
          id: p.id,
          date: p.transaction_date,
          member_name: p.members?.name ?? "Unknown",
          narration: p.narration ?? "",
          debit: p.debit ?? 0,
          credit: p.credit ?? 0,
          transaction_type: p.type ?? "other",
        }));
        setRecentTxns(txns);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Welcome back! Here&apos;s an overview of your cooperative.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Members"
          value={loading ? 0 : kpis.totalMembers}
          icon={Users}
          color="blue"
          subValue={loading ? "Loading…" : "Registered members"}
        />
        <KPICard
          title="Active Loans"
          value={loading ? 0 : kpis.activeLoans}
          icon={CreditCard}
          color="emerald"
          subValue={loading ? "Loading…" : "Disbursed loans"}
        />
        <KPICard
          title="Loan Outstanding"
          value={loading ? 0 : kpis.loanOutstanding}
          icon={IndianRupee}
          color="purple"
          isCurrency
          subValue={loading ? "Loading…" : "Total receivable"}
        />
        <KPICard
          title="Total Deposits"
          value={loading ? 0 : kpis.totalDeposits}
          icon={PiggyBank}
          color="amber"
          isCurrency
          subValue={loading ? "Loading…" : "FD + RD + Savings"}
        />
        <KPICard
          title="Today's Collection"
          value={loading ? 0 : kpis.collectionToday}
          icon={TrendingUp}
          color="emerald"
          isCurrency
          subValue={loading ? "Loading…" : "EMI received today"}
        />
        <KPICard
          title="NPA Accounts"
          value={loading ? 0 : kpis.npaCount}
          icon={AlertTriangle}
          color="red"
          subValue={loading ? "Loading…" : "Non-performing assets"}
        />
      </div>

      {/* Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <OverdueWidget loans={overdueLoans} />
        <MaturityWidget deposits={maturityDeposits} />
      </div>

      {/* Recent Transactions */}
      <RecentTransactions transactions={recentTxns} />
    </div>
  );
}
