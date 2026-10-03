"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/lib/hooks/useRole";
import { routePermission } from "@/lib/permissions";

/* Solid glyphs — at 21px a filled shape stays legible where a stroke icon muddies. */
const HomeIcon = ({ c }: { c: string }) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill={c}>
    <path d="M12 2.8l9 7.4a1 1 0 0 1-.6 1.8H19v8.2a1.3 1.3 0 0 1-1.3 1.3h-3.4v-5.6H9.7v5.6H6.3A1.3 1.3 0 0 1 5 20.2V12H3.6a1 1 0 0 1-.6-1.8z" />
  </svg>
);

const MembersIcon = ({ c }: { c: string }) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill={c}>
    <circle cx="9" cy="7.6" r="3.9" />
    <path d="M1.8 19.6a7.2 7.2 0 0 1 14.4 0 1 1 0 0 1-1 1H2.8a1 1 0 0 1-1-1z" />
    <circle cx="17" cy="8.6" r="3" opacity="0.55" />
    <path d="M17.6 13.4a5.9 5.9 0 0 1 4.6 5.6 1 1 0 0 1-1 1.1h-3.4a8.6 8.6 0 0 0-2.2-6.3c.6-.3 1.3-.4 2-.4z" opacity="0.55" />
  </svg>
);

const CollectIcon = ({ c }: { c: string }) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill={c}>
    <ellipse cx="12" cy="6" rx="7.5" ry="3.2" />
    <path d="M4.5 8.6c1.3 1.5 4.2 2.4 7.5 2.4s6.2-.9 7.5-2.4v3.1c0 1.8-3.4 3.2-7.5 3.2s-7.5-1.4-7.5-3.2z" />
    <path d="M4.5 14.3c1.3 1.5 4.2 2.4 7.5 2.4s6.2-.9 7.5-2.4v3.4c0 1.8-3.4 3.2-7.5 3.2s-7.5-1.4-7.5-3.2z" />
    <path d="M9.8 5.9h4.4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const LoansIcon = ({ c }: { c: string }) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill={c}>
    <rect x="2.5" y="5.5" width="19" height="13.5" rx="2.6" />
    <circle cx="12" cy="12.25" r="3" fill="white" />
    <path d="M12 10.6v3.3" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="6" cy="9" r="1" fill="white" />
    <circle cx="18" cy="15.5" r="1" fill="white" />
  </svg>
);

const MoreIcon = ({ c }: { c: string }) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill={c}>
    <circle cx="12" cy="7.8" r="4.3" />
    <path d="M3.8 20.2a8.2 8.2 0 0 1 16.4 0 1 1 0 0 1-1 1H4.8a1 1 0 0 1-1-1z" />
  </svg>
);

const TABS = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon, match: ["/dashboard"] },
  { href: "/members", label: "Members", Icon: MembersIcon, match: ["/members"] },
  { href: "/deposit-collection", label: "Collect", Icon: CollectIcon, match: ["/deposit-collection", "/collection"] },
  { href: "/loans", label: "Loans", Icon: LoansIcon, match: ["/loans"] },
  { href: "/more", label: "Profile", Icon: MoreIcon, match: ["/more", "/profile"] },
];

/** Bottom-level destinations of the mobile app — the header shows no back arrow there. */
export const TAB_ROOTS = ["/dashboard", "/members", "/deposit-collection", "/collection", "/loans", "/more"];

export function BottomNav() {
  const pathname = usePathname();
  const { isAdmin, can, loading } = useRole();

  // Only the tabs this user's permissions allow; Collect falls back to EMI collection.
  const tabs = TABS.map((t) => {
    if (t.href !== "/deposit-collection") return t;
    if (loading || can("collection.deposit")) return t;
    return can("collection.loan") ? { ...t, href: "/collection" } : null;
  }).filter((t): t is (typeof TABS)[number] => {
    if (!t || loading) return !!t;
    const need = routePermission(t.href);
    return !need || (need === "admin" ? isAdmin : can(need));
  });

  return (
    // Floats over the content with no backdrop of its own — only the pill is solid.
    <div className="lg:hidden no-print" style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, pointerEvents: "none",
    }}>
      <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 14px calc(10px + env(safe-area-inset-bottom))" }}>
        <nav style={{
          display: "flex", alignItems: "stretch",
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          borderRadius: 999, padding: 4,
          boxShadow: "0 8px 24px rgba(15,23,41,0.14)",
          pointerEvents: "auto",
        }}>
          {tabs.map((tab) => {
            const on = tab.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
            const color = on ? "var(--blue)" : "var(--ink)";
            return (
              <Link key={tab.label} href={tab.href} aria-label={tab.label} aria-current={on ? "page" : undefined}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                  background: on ? "var(--blue-tint)" : "transparent", textDecoration: "none",
                  borderRadius: 999, padding: "6px 0 5px", transition: "background 0.2s",
                }}>
                <tab.Icon c={color} />
                <span style={{ fontSize: 10.5, fontWeight: on ? 600 : 500, color }}>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
