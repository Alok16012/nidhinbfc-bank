"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/hooks/useRole";
import type { Permission } from "@/lib/permissions";
import { BrandMark, Wordmark } from "./Brand";
import {
  ArrowRight, BellIcon, ChevronRight, CoinsIcon, LoanIcon, PiggyIcon, SearchIcon, ShieldIcon,
  UsersIcon, RupeeIcon, ClockIcon,
} from "./icons";
import { Avatar, CountBadge, SectionHead, card, iconBtn, inr, inrShort, shortDate } from "./ui";

/* Schema-tolerant readers: older and newer rows name a few columns differently. */
const depNo = (d: any) => d?.deposit_id ?? d?.deposit_no ?? "—";
const depType = (d: any) => String(d?.deposit_type ?? d?.type ?? "").toLowerCase();
const depBalance = (d: any) => Number(d?.current_balance ?? d?.balance ?? d?.amount ?? 0);
const loanOutstanding = (l: any) => Number(l?.outstanding_balance ?? l?.principal_outstanding ?? 0);
const TYPE_LABEL: Record<string, string> = { savings: "Savings", saving: "Savings", fd: "FD", rd: "RD", drd: "DRD", mis: "MIS" };

const today = () => new Date().toISOString().split("T")[0];
const daysUntil = (date: string) => {
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(date); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

interface HomeData {
  members: number;
  depositAccounts: number;
  depositTotal: number;
  activeLoans: number;
  npa: number;
  outstanding: number;
  emiToday: number;
  depositsToday: number;
  awaitingDeposits: number;
  awaitingEmi: number;
  maturing: any[];
  alerts: number;
  recent: any[];
}

/* ── Quick-action artwork — flat two-tone tiles. ── */
const CollectArt = () => (
  <svg width="40" height="40" viewBox="0 0 42 42" fill="none">
    <ellipse cx="19" cy="13" rx="11" ry="4.6" fill="#F0A44A" />
    <path d="M8 13v6c0 2.5 4.9 4.6 11 4.6s11-2.1 11-4.6v-6c0 2.5-4.9 4.6-11 4.6S8 15.5 8 13z" fill="#E07B1F" />
    <ellipse cx="23" cy="25" rx="11" ry="4.6" fill="#F0A44A" />
    <path d="M12 25v6c0 2.5 4.9 4.6 11 4.6s11-2.1 11-4.6v-6c0 2.5-4.9 4.6-11 4.6S12 27.5 12 25z" fill="#E07B1F" />
    <path d="M19 24.4h8" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
const EmiArt = () => (
  <svg width="40" height="40" viewBox="0 0 42 42" fill="none">
    <rect x="7" y="9" width="26" height="26" rx="6" fill="var(--teal-light)" />
    <rect x="10" y="12" width="26" height="26" rx="6" fill="var(--teal)" />
    <path d="M10 19h26" stroke="white" strokeWidth="2.4" />
    <path d="M16 8v6M30 8v6" stroke="var(--teal)" strokeWidth="3" strokeLinecap="round" />
    <path d="M18 28l3 3 6-6" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const MemberArt = () => (
  <svg width="40" height="40" viewBox="0 0 42 42" fill="none">
    <circle cx="17" cy="14" r="7" fill="var(--blue-soft)" />
    <path d="M4 35a13 13 0 0 1 26 0z" fill="var(--blue-soft)" />
    <circle cx="21" cy="15" r="7" fill="var(--blue)" />
    <path d="M8 36a13 13 0 0 1 26 0z" fill="var(--blue)" />
    <circle cx="32" cy="12" r="6" fill="var(--gold)" />
    <path d="M32 9v6M29 12h6" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
const PassbookArt = () => (
  <svg width="40" height="40" viewBox="0 0 42 42" fill="none">
    <rect x="7" y="7" width="24" height="30" rx="4" fill="var(--purple-400)" />
    <rect x="11" y="5" width="24" height="30" rx="4" fill="var(--purple-600)" />
    <path d="M16 13h14M16 18h14M16 23h9" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
const DepositArt = () => (
  <svg width="40" height="40" viewBox="0 0 42 42" fill="none">
    <path d="M6 18L21 8l15 10z" fill="var(--blue-soft)" />
    <rect x="9" y="20" width="4" height="11" rx="1" fill="var(--blue)" />
    <rect x="19" y="20" width="4" height="11" rx="1" fill="var(--blue)" />
    <rect x="29" y="20" width="4" height="11" rx="1" fill="var(--blue)" />
    <rect x="6" y="32" width="30" height="4" rx="1.5" fill="var(--blue-dark)" />
    <circle cx="21" cy="14.5" r="2.2" fill="var(--gold)" />
  </svg>
);
const LoanArt = () => (
  <svg width="40" height="40" viewBox="0 0 42 42" fill="none">
    <rect x="5" y="10" width="28" height="19" rx="4" fill="#5ccf9f" />
    <rect x="9" y="14" width="28" height="19" rx="4" fill="var(--green)" />
    <circle cx="23" cy="23.5" r="4.6" fill="none" stroke="white" strokeWidth="2.2" />
    <path d="M13.5 18.5h.01M32.5 28.5h.01" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);
const AlertArt = () => (
  <svg width="40" height="40" viewBox="0 0 42 42" fill="none">
    <path d="M21 6a10 10 0 0 0-10 10c0 9-4 12-4 12h28s-4-3-4-12A10 10 0 0 0 21 6z" fill="#F0A44A" />
    <path d="M21 6a10 10 0 0 1 10 10c0 9 4 12 4 12H21z" fill="#E07B1F" />
    <path d="M17 32a4.2 4.2 0 0 0 8 0" fill="#E07B1F" />
  </svg>
);
const ReportArt = () => (
  <svg width="40" height="40" viewBox="0 0 42 42" fill="none">
    <rect x="6" y="6" width="30" height="30" rx="7" fill="var(--blue-tint)" />
    <rect x="11" y="20" width="5" height="11" rx="1.5" fill="var(--blue-soft)" />
    <rect x="18.5" y="13" width="5" height="18" rx="1.5" fill="var(--blue)" />
    <rect x="26" y="17" width="5" height="14" rx="1.5" fill="var(--gold)" />
  </svg>
);

const ACTIONS: { Art: () => React.ReactElement; label: string; href: string; need: Permission }[] = [
  { Art: CollectArt, label: "Deposit\nCollection", href: "/deposit-collection", need: "collection.deposit" },
  { Art: EmiArt, label: "EMI\nCollection", href: "/collection", need: "collection.loan" },
  { Art: MemberArt, label: "New\nMember", href: "/members/new", need: "members.manage" },
  { Art: PassbookArt, label: "Passbook", href: "/passbook", need: "passbook.view" },
  { Art: DepositArt, label: "Open\nDeposit", href: "/deposits/new", need: "deposits.create" },
  { Art: LoanArt, label: "New\nLoan", href: "/loans/new", need: "loans.create" },
  { Art: AlertArt, label: "Maturity\nAlerts", href: "/maturity", need: "maturity.view" },
  { Art: ReportArt, label: "Reports", href: "/reports", need: "reports.view" },
];

/** Gold coins over a navy card — hero artwork for the deposits slide. */
const VaultArt = () => (
  <svg width="100" height="100" viewBox="0 0 112 112" fill="none" aria-hidden="true">
    <rect x="14" y="30" width="78" height="52" rx="12" fill="#0b5cff" />
    <rect x="14" y="30" width="78" height="14" fill="#2f6bff" />
    <rect x="24" y="58" width="26" height="6" rx="3" fill="rgba(255,255,255,0.5)" />
    {[0, 1, 2].map((i) => (
      <g key={i} transform={`translate(0 ${-i * 9})`}>
        <ellipse cx="80" cy="88" rx="20" ry="7.5" fill="#c97c06" />
        <rect x="60" y="80.5" width="40" height="7.5" fill="#dd8f0d" />
        <ellipse cx="80" cy="80.5" rx="20" ry="7.5" fill="#f5a623" />
      </g>
    ))}
    <text x="80" y="67" textAnchor="middle" fontSize="11" fontWeight="800" fill="#7a4a00">₹</text>
  </svg>
);

const SLIDE_MS = 4500;

export function MobileHome() {
  const supabase = createClient();
  const router = useRouter();
  const { name, email, isAdmin, can, loading: roleLoading } = useRole();
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    const t = today();
    const in2Days = new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0];
    const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

    Promise.all([
      supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("deposits").select("current_balance, balance, amount").eq("status", "active"),
      supabase.from("loans").select("status, outstanding_balance, principal_outstanding").in("status", ["disbursed", "npa"]),
      supabase.from("loan_repayments").select("total_amount, paid_amount").eq("paid_date", t).eq("status", "paid"),
      supabase.from("deposit_transactions").select("amount").eq("date", t).eq("transaction_type", "credit"),
      supabase.from("deposit_transactions").select("id", { count: "exact", head: true }).eq("date", t).eq("transaction_type", "pending"),
      supabase.from("loan_repayments").select("id", { count: "exact", head: true }).eq("paid_date", t).eq("status", "recorded"),
      supabase.from("deposits").select("id, deposit_id, deposit_no, deposit_type, type, maturity_date, maturity_amount, amount, member:members(name, member_id)").eq("status", "active")
        .gte("maturity_date", t).lte("maturity_date", in30Days).order("maturity_date", { ascending: true }).limit(10),
      supabase.from("passbook").select("id, narration, debit, credit, transaction_date, type, member:members(name)")
        .order("created_at", { ascending: false }).limit(6),
    ]).then(([members, deposits, loans, emi, depToday, awaitingDep, awaitingEmi, maturing, recent]) => {
      const deps = (deposits.data ?? []) as any[];
      const lns = (loans.data ?? []) as any[];
      const mat = (maturing.data ?? []) as any[];
      setData({
        members: members.count ?? 0,
        depositAccounts: deps.length,
        depositTotal: deps.reduce((s, d) => s + depBalance(d), 0),
        activeLoans: lns.filter((l) => l.status === "disbursed").length,
        npa: lns.filter((l) => l.status === "npa").length,
        outstanding: lns.filter((l) => l.status === "disbursed").reduce((s, l) => s + loanOutstanding(l), 0),
        emiToday: (emi.data ?? []).reduce((s: number, r: any) => s + Number(r.total_amount ?? r.paid_amount ?? 0), 0),
        depositsToday: (depToday.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0),
        awaitingDeposits: awaitingDep.count ?? 0,
        awaitingEmi: awaitingEmi.count ?? 0,
        maturing: mat,
        alerts: mat.filter((d) => d.maturity_date <= in2Days).length,
        recent: (recent.data ?? []) as any[],
      });
    });
  }, [supabase]);

  const allowed = (p: Permission) => !roleLoading && (isAdmin || can(p));
  const actions = ACTIONS.filter((a) => allowed(a.need));
  const awaiting = (data?.awaitingDeposits ?? 0) + (data?.awaitingEmi ?? 0);
  const firstName = (name || email.split("@")[0] || "").split(" ")[0];

  return (
    <div className="m-app -mx-4 md:-mx-2" style={{ paddingBottom: 12 }}>
      {/* ── Top bar: brand + bell + profile ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "calc(14px + env(safe-area-inset-top)) 16px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BrandMark size={38} />
          <Wordmark />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {allowed("maturity.view") && (
            <Link href="/maturity" aria-label={`Maturity alerts${data?.alerts ? `, ${data.alerts} due` : ""}`} className="press" style={iconBtn}>
              <BellIcon s={25} c="var(--text-secondary)" w={1.7} />
              <CountBadge n={data?.alerts ?? 0} />
            </Link>
          )}
          <Link href="/more" aria-label="Profile" className="press" style={iconBtn}>
            <Avatar name={name || email || "User"} size={32} />
          </Link>
        </div>
      </div>

      {firstName && (
        <p style={{ margin: "0 16px 8px", fontSize: 13.5, color: "var(--ink-soft)" }}>
          Namaste, <b style={{ color: "var(--ink)", fontWeight: 600 }}>{firstName}</b> 👋
        </p>
      )}

      <HomeSearch onGo={(href) => router.push(href)} />

      <HeroCarousel data={data} showDeposits={allowed("deposits.view")} showLoans={allowed("loans.view")} name={firstName} />

      {/* ── Quick actions ── */}
      {actions.length > 0 && (
        <div style={{ padding: "22px 14px 0", display: "grid", gridTemplateColumns: "repeat(4,1fr)", rowGap: 18, columnGap: 8 }}>
          {actions.map(({ Art, label, href }) => (
            <Link key={href} href={href} className="press" style={{
              textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 9,
            }}>
              <div style={{
                width: "100%", maxWidth: 70, aspectRatio: "1 / 1", background: "var(--surface)", borderRadius: "28%",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 10px -2px rgba(15,23,41,0.16), 0 2px 4px rgba(15,23,41,0.06)",
              }}><Art /></div>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)", textAlign: "center", lineHeight: 1.35, whiteSpace: "pre-line" }}>{label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* ── Collections awaiting confirmation ── */}
      {allowed("collection.confirm") && awaiting > 0 && (
        <div style={{ padding: "22px 16px 0" }}>
          <div style={{
            ...card, padding: 14, border: "1px solid var(--line)",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: "linear-gradient(135deg,var(--gold),var(--gold-dark))",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(245,166,35,0.3)",
            }}><ShieldIcon s={24} c="white" w={2} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{awaiting} collection{awaiting > 1 ? "s" : ""} awaiting OK</p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--ink-soft)" }}>Recorded by staff today</p>
            </div>
            <Link href={(data?.awaitingDeposits ?? 0) > 0 ? "/deposit-collection" : "/collection"} style={{
              background: "linear-gradient(135deg,var(--gold),var(--gold-dark))", color: "var(--blue-dark)", textDecoration: "none",
              borderRadius: 12, padding: "11px 14px", fontSize: 12, fontWeight: 700,
              boxShadow: "0 4px 12px rgba(245,166,35,0.35)", whiteSpace: "nowrap",
            }}>Review →</Link>
          </div>
        </div>
      )}

      {/* ── Snapshot ── */}
      <SectionHead kicker="At a glance" title="Today's Snapshot" />
      <div style={{ padding: "12px 16px 0", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        {[
          { Icon: UsersIcon, bg: "var(--blue-tint)", fg: "var(--blue)", value: data ? data.members.toLocaleString("en-IN") : "—", label: "Members", href: "/members" },
          { Icon: PiggyIcon, bg: "var(--gold-tint)", fg: "var(--gold-dark)", value: data ? data.depositAccounts.toLocaleString("en-IN") : "—", label: "Deposit A/Cs", href: "/deposits" },
          { Icon: LoanIcon, bg: "#e6fffa", fg: "#0d9488", value: data ? data.activeLoans.toLocaleString("en-IN") : "—", label: "Active Loans", href: "/loans" },
          { Icon: CoinsIcon, bg: "var(--success)", fg: "var(--success-text)", value: data ? inrShort(data.depositsToday) : "—", label: "Deposits Today", href: "/deposit-collection" },
          { Icon: RupeeIcon, bg: "var(--purple-tint)", fg: "var(--purple)", value: data ? inrShort(data.emiToday) : "—", label: "EMI Today", href: "/collection" },
          { Icon: ClockIcon, bg: "var(--error)", fg: "var(--error-text)", value: data ? String(data.npa) : "—", label: "NPA Loans", href: "/loans" },
        ].map((k) => (
          <Link key={k.label} href={k.href} className="press" style={{
            ...card, borderRadius: 16, padding: "12px 6px", textDecoration: "none",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <k.Icon s={21} c={k.fg} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{k.value}</span>
            <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 600, marginTop: -4 }}>{k.label}</span>
          </Link>
        ))}
      </div>

      {/* ── Maturing soon ── */}
      {allowed("deposits.view") && (data?.maturing.length ?? 0) > 0 && (
        <>
          <SectionHead kicker="Next 30 days" title="Maturing Soon" href={allowed("maturity.view") ? "/maturity" : undefined} />
          <div className="no-scroll" style={{ display: "flex", gap: 10, overflowX: "auto", padding: "12px 16px 4px" }}>
            {data!.maturing.map((d) => {
              const days = daysUntil(d.maturity_date);
              return (
                <Link key={d.id} href={`/deposits/${d.id}`} className="press" style={{
                  flex: "0 0 210px", border: "1.5px dashed var(--gold-dark)", borderRadius: 16, padding: "12px 14px", textDecoration: "none",
                  background: "linear-gradient(135deg,var(--gold-tint),var(--surface))",
                }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--blue-dark)" }}>{inr(d.maturity_amount ?? depBalance(d))}</p>
                  <p style={{ margin: "2px 0 6px", fontSize: 12, color: "var(--ink-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.member?.name ?? "—"} · {depNo(d)}</p>
                  <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.05em", color: "var(--gold-dark)" }}>
                    {TYPE_LABEL[depType(d)] ?? depType(d).toUpperCase()} · {days <= 0 ? "TODAY" : days === 1 ? "TOMORROW" : `IN ${days} DAYS`}
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* ── Recent transactions ── */}
      {(data?.recent.length ?? 0) > 0 && (
        <>
          <SectionHead kicker="Latest activity" title="Recent Transactions" href={allowed("accounting.view") ? "/accounting" : undefined} />
          <div style={{ padding: "12px 16px 0" }}>
            <div style={{ ...card, padding: "4px 14px" }}>
              {data!.recent.map((t, i) => {
                const credit = Number(t.credit ?? 0) > 0;
                const amt = credit ? Number(t.credit) : Number(t.debit ?? 0);
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                      background: credit ? "var(--success)" : "var(--error)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={credit ? "var(--success-text)" : "var(--error-text)"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        {credit ? <path d="M12 5v14M6 13l6 6 6-6" /> : <path d="M12 19V5M6 11l6-6 6 6" />}
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.member?.name ?? "—"}
                      </p>
                      <p style={{ margin: "1px 0 0", fontSize: 11.5, color: "var(--ink-mute)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.narration || String(t.type ?? "").replace(/_/g, " ")} · {shortDate(t.transaction_date)}
                      </p>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: credit ? "var(--success-text)" : "var(--error-text)", whiteSpace: "nowrap" }}>
                      {credit ? "+" : "−"}{inr(amt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Open a deposit ── */}
      {allowed("deposits.create") && (
        <div style={{ padding: "18px 16px 0" }}>
          <Link href="/deposits/new" className="press" style={{
            textDecoration: "none", borderRadius: 18, padding: 14,
            background: "linear-gradient(135deg,var(--blue-dark),var(--blue))", color: "white",
            display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 20px rgba(11,92,255,0.25)",
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <PiggyIcon s={25} c="var(--gold)" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Open a new FD / RD account</p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "rgba(255,255,255,0.75)" }}>Savings, FD, RD, DRD and MIS in a few taps</p>
            </div>
            <ArrowRight s={18} c="var(--gold)" w={2.2} />
          </Link>
        </div>
      )}
    </div>
  );
}

/* ── Search members, loans and deposits ── */
function HomeSearch({ onGo }: { onGo: (href: string) => void }) {
  const supabase = createClient();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ members: any[]; loans: any[]; deposits: any[] }>({ members: [], loans: [], deposits: [] });

  useEffect(() => {
    // Commas and parentheses would break the PostgREST .or() filter
    const term = q.trim().replace(/[,()]/g, "");
    if (term.length < 2) return;
    const t = setTimeout(async () => {
      setBusy(true);
      const [m, l, d] = await Promise.all([
        supabase.from("members").select("id, name, phone, member_id, photo_url")
          .or(`name.ilike.%${term}%,phone.ilike.%${term}%,member_id.ilike.%${term}%`).limit(6),
        supabase.from("loans").select("id, loan_id, status, amount, member:members(name)").ilike("loan_id", `%${term}%`).limit(4),
        supabase.from("deposits").select("id, deposit_id, deposit_type, status, member:members(name)").ilike("deposit_id", `%${term}%`).limit(4),
      ]);
      setRes({ members: m.data || [], loans: l.data || [], deposits: d.data || [] });
      setBusy(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q, supabase]);

  const open = q.trim().length >= 2;
  const shown = open ? res : { members: [], loans: [], deposits: [] };
  const rows = [
    ...shown.members.map((m) => ({ key: `m${m.id}`, href: `/members/${m.id}`, title: m.name, sub: `${m.member_id ?? ""}${m.phone ? ` · ${m.phone}` : ""}`, kind: "Member", photo: m.photo_url })),
    ...shown.loans.map((l) => ({ key: `l${l.id}`, href: `/loans/${l.id}`, title: l.loan_id, sub: `${l.member?.name ?? ""} · ${inr(l.amount)}`, kind: "Loan", photo: null })),
    ...shown.deposits.map((d) => ({ key: `d${d.id}`, href: `/deposits/${d.id}`, title: d.deposit_id, sub: `${d.member?.name ?? ""} · ${String(d.deposit_type ?? "").toUpperCase()}`, kind: "Deposit", photo: null })),
  ];

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (rows[0]) onGo(rows[0].href); }} style={{ padding: "4px 16px 14px", position: "relative", zIndex: 30 }}>
      <label style={{
        display: "flex", alignItems: "center", gap: 10, background: "var(--surface)",
        borderRadius: 16, padding: "12px 14px", boxShadow: "var(--shadow-card)",
      }}>
        <SearchIcon s={20} c="var(--ink-mute)" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members, loans, deposits..." enterKeyHint="search"
          style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 16, color: "var(--ink)", padding: 0, minHeight: 0 }} />
      </label>
      {open && (
        <div className="fade-up" style={{ ...card, position: "absolute", left: 16, right: 16, top: "100%", marginTop: -6, padding: "4px 14px", boxShadow: "var(--shadow-pop)", maxHeight: 360, overflowY: "auto" }}>
          {rows.length === 0 ? (
            <p style={{ margin: 0, padding: "18px 0", textAlign: "center", fontSize: 13, color: "var(--ink-mute)" }}>{busy ? "Searching…" : `No results for “${q.trim()}”`}</p>
          ) : rows.map((r, i) => (
            <button key={r.key} type="button" onClick={() => onGo(r.href)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 0", textAlign: "left",
              background: "none", border: "none", borderTop: i ? "1px solid var(--line)" : "none", cursor: "pointer",
            }}>
              {r.kind === "Member" ? <Avatar name={r.title} photo={r.photo} size={36} /> : (
                <div style={{ width: 36, height: 36, borderRadius: 11, background: r.kind === "Loan" ? "#e6fffa" : "var(--gold-tint)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {r.kind === "Loan" ? <LoanIcon s={19} c="#0d9488" /> : <PiggyIcon s={19} c="var(--gold-dark)" />}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-mute)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.kind} · {r.sub}</p>
              </div>
              <ChevronRight s={16} c="var(--ink-mute)" />
            </button>
          ))}
        </div>
      )}
    </form>
  );
}

/* ── Hero carousel: deposits book and loan book ── */
function HeroCarousel({ data, showDeposits, showLoans, name }: { data: HomeData | null; showDeposits: boolean; showLoans: boolean; name: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const held = useRef(0);

  const slides: React.ReactNode[] = [];
  if (showDeposits) slides.push(
    <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "inline-block", background: "#CFFB6B", color: "var(--blue-dark)", fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 8 }}>Total Deposits</span>
        <p style={{ margin: "10px 0 0", fontSize: 26, fontWeight: 800, color: "white", lineHeight: 1.15 }}>
          {data ? inrShort(data.depositTotal) : "—"}
        </p>
        <p style={{ margin: "4px 0 14px", fontSize: 12.5, color: "rgba(255,255,255,0.72)", whiteSpace: "nowrap" }}>
          across <span style={{ color: "var(--gold)", fontWeight: 600 }}>{data?.depositAccounts ?? 0} active accounts</span>
        </p>
        <Link href="/deposits" className="press" style={{
          background: "linear-gradient(135deg,var(--gold),var(--gold-dark))", color: "var(--blue-dark)", textDecoration: "none",
          borderRadius: 12, padding: "10px 16px", fontSize: 13, fontWeight: 700,
          boxShadow: "0 6px 16px rgba(245,166,35,0.40)", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        }}>View Deposits <ArrowRight s={15} c="var(--blue-dark)" w={2.2} /></Link>
      </div>
      <div style={{ flexShrink: 0, filter: "drop-shadow(0 10px 18px rgba(4,36,107,0.45))" }}><VaultArt /></div>
    </div>,
  );
  if (showLoans) slides.push(
    <div style={{ position: "relative", zIndex: 1 }}>
      <span style={{ display: "inline-block", background: "var(--gold)", color: "var(--blue-dark)", fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 8 }}>LOAN BOOK</span>
      <p style={{ margin: "10px 0 0", fontSize: 23, fontWeight: 800, color: "white", lineHeight: 1.2 }}>
        Outstanding <span style={{ color: "var(--gold)" }}>{data ? inrShort(data.outstanding) : "—"}</span>
      </p>
      <div style={{
        display: "flex", gap: 14, margin: "12px 0 14px", background: "rgba(255,255,255,0.09)",
        border: "1px solid rgba(255,255,255,0.16)", borderRadius: 14, padding: "10px 12px",
      }}>
        {[[String(data?.activeLoans ?? "—"), "Active"], [String(data?.npa ?? "—"), "NPA"], [data ? inrShort(data.emiToday) : "—", "EMI today"]].map(([v, l]) => (
          <div key={l} style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--gold)" }}>{v}</p><p style={{ margin: 0, fontSize: 10.5, color: "rgba(255,255,255,0.7)" }}>{l}</p></div>
        ))}
      </div>
      <Link href="/loans" className="press" style={{
        background: "white", color: "var(--blue-dark)", textDecoration: "none",
        borderRadius: 12, padding: "10px 16px", fontSize: 13, fontWeight: 700, display: "inline-block",
      }}>View Loans →</Link>
    </div>,
  );
  if (slides.length === 0) slides.push(
    <div style={{ position: "relative", zIndex: 1 }}>
      <span style={{ display: "inline-block", background: "var(--gold)", color: "var(--blue-dark)", fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 8 }}>WELCOME</span>
      <p style={{ margin: "10px 0 6px", fontSize: 23, fontWeight: 800, color: "white", lineHeight: 1.2 }}>
        Hello{name ? `, ${name}` : ""}<br /><span style={{ color: "var(--gold)" }}>We Think For People</span>
      </p>
      <p style={{ margin: 0, fontSize: 12.5, color: "rgba(255,255,255,0.72)" }}>Grihsevak Nidhi Limited</p>
    </div>,
  );

  const count = slides.length;
  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => {
      const el = trackRef.current;
      if (!el || Date.now() < held.current || document.hidden) return;
      const cur = Math.round(el.scrollLeft / el.clientWidth);
      el.scrollTo({ left: ((cur + 1) % count) * el.clientWidth, behavior: "smooth" });
    }, SLIDE_MS);
    return () => clearInterval(t);
  }, [count]);

  return (
    <div>
      <div ref={trackRef} className="no-scroll"
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        onPointerDown={() => { held.current = Date.now() + 7000; }}
        style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 14, marginBottom: -14 }}>
        {slides.map((s, i) => (
          <div key={i} style={{ flex: "0 0 100%", scrollSnapAlign: "start", padding: "0 16px" }}>
            <div style={{
              height: "100%", borderRadius: 24, padding: "20px 18px", position: "relative", overflow: "hidden",
              background: "linear-gradient(150deg,var(--blue-dark) 0%,var(--blue-dark) 55%,var(--blue) 100%)",
              boxShadow: "0 10px 28px rgba(11,92,255,0.28)",
            }}>
              <div style={{ position: "absolute", right: -50, top: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,166,35,0.30), transparent 70%)" }} />
              <div style={{ position: "absolute", left: -40, bottom: -70, width: 170, height: 170, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.14), transparent 70%)" }} />
              {s}
            </div>
          </div>
        ))}
      </div>
      {count > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
          {slides.map((_, i) => (
            <span key={i} style={{ width: i === index ? 20 : 7, height: 7, borderRadius: 999, background: i === index ? "var(--blue)" : "rgba(11,92,255,0.22)", transition: "width 0.3s" }} />
          ))}
        </div>
      )}
    </div>
  );
}

