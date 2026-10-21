"use client";

import { useState } from "react";
import { notify } from "@/lib/notify";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/hooks/useRole";
import { useBranch } from "@/lib/hooks/useBranch";
import { switchBranch } from "@/lib/branch";
import { routePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, card } from "@/components/mobile/ui";
import {
  ArrowDownUpIcon, BellIcon, BookIcon, BuildingIcon, CalendarIcon, ChartIcon, CheckIcon, ChevronRight, CoinsIcon,
  GearIcon, LedgerIcon, LoanIcon, PiggyIcon, ReceiptIcon, StaffIcon, UploadIcon, UserIcon,
} from "@/components/mobile/icons";

type Icon = (p: { s?: number; c?: string; w?: number }) => React.ReactElement;

const MENU: { title: string; items: { href: string; label: string; Icon: Icon }[] }[] = [
  {
    title: "Banking",
    items: [
      { href: "/deposits", label: "Deposits", Icon: PiggyIcon },
      { href: "/withdrawals", label: "Withdrawals", Icon: ArrowDownUpIcon },
      { href: "/passbook", label: "Passbook", Icon: BookIcon },
      { href: "/maturity", label: "Maturity Alerts", Icon: BellIcon },
    ],
  },
  {
    title: "Loans & Collection",
    items: [
      { href: "/loans", label: "Loans", Icon: LoanIcon },
      { href: "/collection", label: "Loan EMI Collection", Icon: CalendarIcon },
      { href: "/deposit-collection", label: "Deposit Collection", Icon: CoinsIcon },
    ],
  },
  {
    title: "Books & Reports",
    items: [
      { href: "/accounting", label: "Accounting", Icon: LedgerIcon },
      { href: "/expenses", label: "Expenses", Icon: ReceiptIcon },
      { href: "/reports", label: "Reports", Icon: ChartIcon },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/branches", label: "Branches", Icon: BuildingIcon },
      { href: "/staff", label: "Staff & Roles", Icon: StaffIcon },
      { href: "/import", label: "Ledger Import", Icon: UploadIcon },
      { href: "/settings", label: "Settings", Icon: GearIcon },
    ],
  },
];

export default function MorePage() {
  const router = useRouter();
  const supabase = createClient();
  const { name, email, roleName, role, isAdmin, can, loading } = useRole();
  const { branches, current, isAllBranches } = useBranch();
  const [branchSheet, setBranchSheet] = useState(false);

  const allowed = (href: string) => {
    const need = routePermission(href);
    return !need || (need === "admin" ? isAdmin : can(need));
  };
  const groups = loading ? [] : MENU.map((g) => ({ ...g, items: g.items.filter((i) => allowed(i.href)) })).filter((g) => g.items.length);
  const displayName = name || (isAdmin ? "Admin" : email.split("@")[0]) || "Staff";
  const branchLabel = isAllBranches ? "All branches" : current?.name ?? "—";

  const signOut = async () => {
    await supabase.auth.signOut();
    notify.success("Signed out");
    router.push("/login");
  };

  return (
    <div className="m-app lg:max-w-[560px]">
      <PageHeader title="Your Profile">
        {isAdmin && (
          <Link href="/settings" aria-label="Settings" className="press" style={{ display: "flex", padding: 0 }}>
            <GearIcon s={22} c="var(--text-secondary)" />
          </Link>
        )}
      </PageHeader>

      {/* Identity card */}
      <div style={{ ...card, padding: "18px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={displayName} size={58} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</p>
            <p style={{ margin: "1px 0 0", fontSize: 13, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</p>
            <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--ink-soft)" }}>Branch <b style={{ color: "var(--ink)" }}>{branchLabel}</b></p>
          </div>
          <Link href="/profile" style={{ color: "var(--blue)", fontSize: 12.5, fontWeight: 600, letterSpacing: "0.03em", alignSelf: "flex-start", textDecoration: "none" }}>VIEW</Link>
        </div>
        {!loading && (
          <span style={{
            display: "inline-block", marginTop: 14, background: isAdmin ? "var(--blue)" : "var(--green)", color: "white",
            fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 6, letterSpacing: "0.02em", textTransform: "uppercase",
          }}>{isAdmin ? "Administrator" : roleName || role}</span>
        )}
      </div>

      {/* Shortcuts */}
      <div style={{ paddingTop: 12, display: "flex", gap: 10 }}>
        {allowed("/maturity") && (
          <Link href="/maturity" className="press" style={{ ...card, flex: 1, padding: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "var(--gold-tint)", display: "flex", alignItems: "center", justifyContent: "center" }}><BellIcon s={20} c="var(--gold-dark)" /></div>
            <div><p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-soft)" }}>Maturity</p><p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Alerts</p></div>
          </Link>
        )}
        {allowed("/passbook") && (
          <Link href="/passbook" className="press" style={{ ...card, flex: 1, padding: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "var(--blue-tint)", display: "flex", alignItems: "center", justifyContent: "center" }}><BookIcon s={20} c="var(--blue)" /></div>
            <div><p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-soft)" }}>Member</p><p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Passbook</p></div>
          </Link>
        )}
      </div>

      {/* Menu — flat rows on the canvas, split by hairlines */}
      {groups.map((group) => (
        <div key={group.title} style={{ paddingTop: 18 }}>
          <p style={{ margin: "0 2px 2px", fontSize: 11.5, fontWeight: 700, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{group.title}</p>
          {group.items.map(({ href, label, Icon }, i) => (
            <Link key={href} href={href} className="press" style={{
              display: "flex", alignItems: "center", gap: 16, padding: "15px 2px", textDecoration: "none",
              borderTop: i === 0 ? "none" : "1px solid var(--line)",
            }}>
              <Icon s={22} c="var(--text-muted)" w={1.6} />
              <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: "var(--text-secondary)" }}>{label}</span>
              <ChevronRight s={16} c="var(--ink-mute)" />
            </Link>
          ))}
        </div>
      ))}

      <div style={{ paddingTop: 18 }}>
        <p style={{ margin: "0 2px 2px", fontSize: 11.5, fontWeight: 700, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Account</p>
        <Link href="/profile" className="press" style={{ display: "flex", alignItems: "center", gap: 16, padding: "15px 2px", textDecoration: "none" }}>
          <UserIcon s={22} c="var(--text-muted)" w={1.6} />
          <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: "var(--text-secondary)" }}>My Profile</span>
          <ChevronRight s={16} c="var(--ink-mute)" />
        </Link>
        {isAdmin && (
          <button onClick={() => setBranchSheet(true)} className="press" style={{
            width: "100%", display: "flex", alignItems: "center", gap: 16, padding: "15px 2px",
            background: "none", border: "none", borderTop: "1px solid var(--line)", cursor: "pointer", textAlign: "left",
          }}>
            <BuildingIcon s={22} c="var(--text-muted)" w={1.6} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: "var(--text-secondary)" }}>Switch Branch</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{branchLabel}</span>
            <ChevronRight s={16} c="var(--ink-mute)" />
          </button>
        )}
      </div>

      <div style={{ padding: "22px 0 12px" }}>
        <button onClick={signOut} className="press" style={{
          width: "100%", background: "var(--surface)", color: "var(--red)", border: "none", borderRadius: 16,
          padding: 15, fontSize: 15, fontWeight: 600, cursor: "pointer",
        }}>Log Out</button>
        <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--ink-mute)", margin: "14px 0 0" }}>Grihsevak Nidhi Limited · v1.0</p>
      </div>

      {branchSheet && (
        <div role="dialog" aria-modal="true" aria-label="Switch branch" onClick={() => setBranchSheet(false)} style={{
          position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,41,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div onClick={(e) => e.stopPropagation()} className="sheet-up no-scroll" style={{
            width: "100%", maxWidth: 430, maxHeight: "82%", overflowY: "auto", background: "var(--app-bg)",
            borderRadius: "24px 24px 0 0", padding: "10px 16px calc(20px + env(safe-area-inset-bottom))",
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--line-strong)", margin: "0 auto 12px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>View branch</h3>
              <button onClick={() => setBranchSheet(false)} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", cursor: "pointer" }}>Close</button>
            </div>
            <div style={{ ...card, padding: "4px 14px" }}>
              {[{ id: null as string | null, name: "All branches", code: "" }, ...branches].map((b, i) => {
                const on = b.id === null ? isAllBranches : current?.id === b.id;
                return (
                  <button key={b.id ?? "all"} onClick={() => switchBranch(b.id, "/more")} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 0", textAlign: "left",
                    background: "none", border: "none", borderTop: i ? "1px solid var(--line)" : "none", cursor: "pointer",
                  }}>
                    <BuildingIcon s={20} c={on ? "var(--blue)" : "var(--text-muted)"} />
                    <span style={{ flex: 1, fontSize: 14.5, fontWeight: on ? 600 : 500, color: "var(--ink)" }}>
                      {b.name}{b.code && <span style={{ marginLeft: 6, fontSize: 12, color: "var(--ink-mute)" }}>{b.code}</span>}
                    </span>
                    {on && <CheckIcon s={18} c="var(--blue)" />}
                  </button>
                );
              })}
            </div>
            <Link href="/branches" style={{ display: "block", textAlign: "center", marginTop: 14, color: "var(--blue)", fontSize: 13.5, fontWeight: 600, textDecoration: "none" }}>Manage branches →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
