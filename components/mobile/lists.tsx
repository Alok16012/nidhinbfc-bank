"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, PhoneIcon, PiggyIcon } from "./icons";
import { Avatar, Empty, SearchField, StatusPill, Tabs, card, inr, shortDate } from "./ui";

/* Phone list screens: one tappable card per record, like the app's order list. */

/* ───────── Members ───────── */

interface MemberRow {
  id: string; name: string; member_id: string; phone: string; status: string;
  photo_url?: string | null; join_date?: string; created_at: string; share_capital?: number;
}

export function MemberCards({ members }: { members: MemberRow[] }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "inactive">("all");
  const term = q.trim().toLowerCase();
  const rows = members.filter((m) =>
    (tab === "all" || (tab === "active" ? m.status === "active" : m.status !== "active")) &&
    (!term || m.name?.toLowerCase().includes(term) || m.member_id?.toLowerCase().includes(term) || (m.phone ?? "").includes(term)),
  );

  return (
    <div className="m-app" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SearchField value={q} onChange={setQ} placeholder="Search name, member ID or phone" />
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: "all", label: "All" },
        { id: "active", label: "Active" },
        { id: "inactive", label: "Inactive" },
      ]} />
      {rows.map((m) => (
        <div key={m.id} style={{ ...card, padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/members/${m.id}`} className="press" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <Avatar name={m.name} photo={m.photo_url} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                <StatusPill status={m.status} />
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>{m.member_id}</p>
              <p style={{ margin: "1px 0 0", fontSize: 11.5, color: "var(--ink-mute)" }}>Joined {shortDate(m.join_date ?? m.created_at)}</p>
            </div>
          </Link>
          {m.phone && (
            <a href={`tel:${m.phone}`} aria-label={`Call ${m.name}`} className="press" style={{
              width: 40, height: 40, borderRadius: "50%", background: "var(--blue-tint)", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><PhoneIcon s={18} c="var(--blue)" /></a>
          )}
        </div>
      ))}
      {rows.length === 0 && <Empty title="No members found" hint={term ? "Try a different name, ID or phone" : undefined} />}
    </div>
  );
}

/* ───────── Loans ───────── */

const LOAN_TABS = ["all", "pending", "approved", "disbursed", "closed", "npa"] as const;
type LoanTab = (typeof LOAN_TABS)[number];

export function LoanCards({ loans }: { loans: any[] }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<LoanTab>("all");
  const term = q.trim().toLowerCase();
  const rows = loans.filter((l) =>
    (tab === "all" || l.status === tab) &&
    (!term || String(l.loan_id ?? l.loan_no ?? "").toLowerCase().includes(term) ||
      l.member?.name?.toLowerCase().includes(term) || String(l.purpose ?? "").toLowerCase().includes(term)),
  );

  return (
    <div className="m-app" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SearchField value={q} onChange={setQ} placeholder="Search loan ID, member or purpose" />
      <Tabs value={tab} onChange={setTab} tabs={LOAN_TABS.map((s) => ({
        id: s, label: s === "npa" ? "NPA" : s[0].toUpperCase() + s.slice(1),
        count: s === "all" ? loans.length : loans.filter((l) => l.status === s).length,
      }))} />
      {rows.map((l) => (
        <Link key={l.id} href={`/loans/${l.id}`} className="press" style={{ ...card, padding: 12, display: "flex", gap: 12, textDecoration: "none" }}>
          <div style={{
            width: 64, height: 64, flexShrink: 0, borderRadius: 14, background: l.status === "npa" ? "var(--error)" : "#e6fffa",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: l.status === "npa" ? "var(--error-text)" : "#0d9488", textTransform: "uppercase" }}>{String(l.loan_type ?? "Loan").slice(0, 8)}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>{l.interest_rate != null ? `${l.interest_rate}%` : "—"}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{l.loan_id ?? l.loan_no}</span>
              <StatusPill status={l.status} />
            </div>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.member?.name ?? "—"}</p>
            <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
              {inr(l.amount)}
              {l.status === "disbursed" && <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink-soft)" }}> · {inr(l.outstanding_balance ?? l.principal_outstanding)} due</span>}
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <span style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>{l.emi_amount ? `EMI ${inr(l.emi_amount)}` : shortDate(l.created_at)}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)", display: "flex", alignItems: "center", gap: 3 }}>
                View Details <ArrowRight s={13} c="var(--blue)" w={2.2} />
              </span>
            </div>
          </div>
        </Link>
      ))}
      {rows.length === 0 && <Empty title="No loans found" hint={term ? "Try a different search" : undefined} />}
    </div>
  );
}

/* ───────── Deposits ───────── */

const DEP_TONE: Record<string, { bg: string; fg: string }> = {
  savings: { bg: "var(--blue-tint)", fg: "var(--blue)" },
  fd: { bg: "var(--gold-tint)", fg: "var(--gold-dark)" },
  rd: { bg: "var(--purple-tint)", fg: "var(--purple)" },
  drd: { bg: "#e6fffa", fg: "#0d9488" },
  mis: { bg: "var(--success)", fg: "var(--success-text)" },
};

export function DepositCards({ deposits, filter, onFilter, tabs }: {
  deposits: any[]; filter: string; onFilter: (key: string) => void; tabs: { key: string; label: string }[];
}) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const ofType = (key: string) => (key === "all" ? deposits : deposits.filter((d) => d.deposit_type === key));
  const rows = ofType(filter).filter((d) =>
    !term || String(d.deposit_id ?? "").toLowerCase().includes(term) ||
    d.member?.name?.toLowerCase().includes(term) || d.member?.member_id?.toLowerCase().includes(term),
  );
  const total = ofType(filter).reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <div className="m-app" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SearchField value={q} onChange={setQ} placeholder="Search deposit ID or member" />
      <Tabs value={filter} onChange={onFilter} tabs={tabs.map((t) => ({ id: t.key, label: t.label, count: ofType(t.key).length }))} />
      <div style={{
        borderRadius: 18, padding: "14px 16px", color: "white",
        background: "linear-gradient(150deg,var(--blue-dark),var(--blue))", boxShadow: "0 8px 20px rgba(11,92,255,0.25)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.75)" }}>{filter === "all" ? "All deposits" : `${tabs.find((t) => t.key === filter)?.label} deposits`}</p>
          <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800 }}>{inr(total)}</p>
        </div>
        <span style={{ background: "var(--gold)", color: "var(--blue-dark)", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8 }}>{ofType(filter).length} A/Cs</span>
      </div>
      {rows.map((d) => {
        const tone = DEP_TONE[d.deposit_type] ?? DEP_TONE.savings;
        return (
          <Link key={d.id} href={`/deposits/${d.id}`} className="press" style={{ ...card, padding: 12, display: "flex", gap: 12, textDecoration: "none" }}>
            <div style={{
              width: 64, height: 64, flexShrink: 0, borderRadius: 14, background: tone.bg,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
            }}>
              <PiggyIcon s={22} c={tone.fg} />
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.04em", color: tone.fg }}>{String(d.deposit_type ?? "").toUpperCase()}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{d.deposit_id ?? d.deposit_no}</span>
                <StatusPill status={d.status} />
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {d.member?.name ?? "—"}{d.member?.member_id ? ` · ${d.member.member_id}` : ""}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                {inr(d.amount)}
                {d.interest_rate != null && <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink-soft)" }}> · {d.interest_rate}% p.a.</span>}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <span style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>
                  {d.maturity_date ? `Matures ${shortDate(d.maturity_date)}` : `Opened ${shortDate(d.open_date ?? d.created_at)}`}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)", display: "flex", alignItems: "center", gap: 3 }}>
                  View <ArrowRight s={13} c="var(--blue)" w={2.2} />
                </span>
              </div>
            </div>
          </Link>
        );
      })}
      {rows.length === 0 && <Empty title="No deposits found" hint="Try a different category or search" />}
    </div>
  );
}
