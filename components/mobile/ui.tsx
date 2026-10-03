"use client";

import Link from "next/link";
import { ChevronRight } from "./icons";

/* Building blocks of the mobile app, shared by every phone screen. */

export const card: React.CSSProperties = {
  background: "var(--surface)", borderRadius: 18, boxShadow: "var(--shadow-card)",
};

export const label: React.CSSProperties = {
  display: "block", margin: "0 0 8px", fontSize: 13.5, fontWeight: 600, color: "var(--ink)",
};

export const field: React.CSSProperties = {
  width: "100%", background: "var(--surface)", border: "1.5px solid var(--line)",
  borderRadius: 14, padding: "13px 14px", fontSize: 16, color: "var(--ink)", outline: "none",
};

export const iconBtn: React.CSSProperties = {
  background: "none", border: "none", padding: 0, cursor: "pointer",
  display: "flex", alignItems: "center", position: "relative",
};

/** Small red count bubble pinned to an icon. */
export function CountBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span style={{
      position: "absolute", top: -6, right: -7, minWidth: 17, height: 17, padding: "0 4px",
      borderRadius: 10, background: "var(--red)", border: "1.5px solid var(--app-bg)",
      color: "white", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
    }}>{n > 99 ? "99+" : n}</span>
  );
}

/** Segmented pill tabs — white track, blue active pill. Scrolls sideways when crowded. */
export function Tabs<T extends string>({ tabs, value, onChange }: {
  tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void;
}) {
  const crowded = tabs.length > 4;
  return (
    <div className="no-scroll" style={{
      display: "flex", background: "var(--surface)", borderRadius: 999, padding: 4,
      boxShadow: "var(--shadow-card)", overflowX: crowded ? "auto" : undefined,
    }}>
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button key={t.id} type="button" onClick={() => onChange(t.id)} aria-pressed={on} style={{
            flex: crowded ? "0 0 auto" : 1, border: "none", cursor: "pointer", borderRadius: 999,
            padding: crowded ? "9px 14px" : "9px 6px", fontSize: 13.5, fontWeight: on ? 600 : 500,
            background: on ? "var(--blue)" : "transparent",
            color: on ? "white" : "var(--ink-soft)", whiteSpace: "nowrap",
            transition: "background 0.2s, color 0.2s",
          }}>
            {t.label}
            {t.count !== undefined && <span style={{ marginLeft: 5, opacity: on ? 0.8 : 0.7, fontSize: 12 }}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

type Tone = { bg: string; fg: string; bd: string };
const TONES: Record<string, Tone> = {
  green:  { bg: "var(--success)", fg: "var(--success-text)", bd: "var(--success-border)" },
  amber:  { bg: "var(--warning)", fg: "var(--warning-text)", bd: "var(--warning-border)" },
  blue:   { bg: "var(--info-bg)", fg: "var(--info-text)", bd: "var(--info-border)" },
  purple: { bg: "var(--purple-tint)", fg: "var(--purple)", bd: "#e9e3ff" },
  red:    { bg: "var(--error)", fg: "var(--error-text)", bd: "var(--error-border)" },
  grey:   { bg: "#f3f4f6", fg: "#4b5563", bd: "#e5e7eb" },
};

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  active: "green", disbursed: "green", paid: "green", credit: "green",
  pending: "amber", partial: "amber", recorded: "amber",
  approved: "blue", open: "blue",
  matured: "purple",
  npa: "red", overdue: "red", suspended: "red", rejected: "red", debit: "red",
  inactive: "grey", closed: "grey", premature_closed: "grey",
};

/** Rounded status pill, e.g. Active / Pending / NPA. */
export function StatusPill({ status, label: text, tone }: { status?: string; label?: string; tone?: keyof typeof TONES }) {
  const key = (status ?? "").toLowerCase();
  const t = TONES[tone ?? STATUS_TONE[key] ?? "grey"];
  const shown = text ?? (key === "npa" ? "NPA" : key.replace(/_/g, " "));
  return (
    <span style={{
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, textTransform: text ? undefined : "capitalize",
      fontSize: 10.5, fontWeight: 600, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap",
    }}>{shown}</span>
  );
}

export function PrimaryButton({ children, onClick, disabled, tone = "blue", type = "button", style }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; tone?: "blue" | "gold";
  type?: "button" | "submit"; style?: React.CSSProperties;
}) {
  const gold = tone === "gold";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="press" style={{
      width: "100%", border: "none", borderRadius: 16, padding: "15px 18px",
      fontSize: 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      background: disabled ? "var(--line-strong)" : gold ? "linear-gradient(135deg,var(--gold),var(--gold-dark))" : "linear-gradient(135deg,var(--blue),var(--blue-dark))",
      color: disabled ? "var(--ink-mute)" : gold ? "var(--blue-dark)" : "white",
      boxShadow: disabled ? "none" : gold ? "0 6px 16px rgba(245,166,35,0.40)" : "0 6px 16px rgba(11,92,255,0.30)",
      ...style,
    }}>{children}</button>
  );
}

export function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

export function Avatar({ name, photo, size = 44 }: { name: string; photo?: string | null; size?: number }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,var(--blue),var(--blue-dark))", color: "white",
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.32, fontWeight: 700,
    }}>{initialsOf(name)}</div>
  );
}

/** Kicker + big title on the left, "View All" on the right — home-screen section heading. */
export function SectionHead({ kicker, title, href }: { kicker: string; title: string; href?: string }) {
  return (
    <div style={{ padding: "26px 16px 0", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
      <div>
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-soft)", fontWeight: 500 }}>{kicker}</p>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>{title}</p>
      </div>
      {href && (
        <Link href={href} style={{ color: "var(--blue)", fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 2, textDecoration: "none" }}>
          View All <ChevronRight s={14} c="var(--blue)" />
        </Link>
      )}
    </div>
  );
}

/** Centered "nothing here" message. */
export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 16px" }}>
      <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 14, fontWeight: 600 }}>{title}</p>
      {hint && <p style={{ margin: "4px 0 0", color: "var(--ink-mute)", fontSize: 12.5 }}>{hint}</p>}
    </div>
  );
}

/** Grey shimmer rows while a list loads. */
export function SkeletonList({ rows = 4, height = 76 }: { rows?: number; height?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="animate-pulse" style={{ ...card, height }} />
      ))}
    </div>
  );
}

/** ₹ without paise, Indian grouping: ₹1,25,000. */
export function inr(n: number | null | undefined) {
  return "₹" + Math.round(n ?? 0).toLocaleString("en-IN");
}

/** Compact ₹ for hero numbers: ₹12.4L, ₹3.2Cr. */
export function inrShort(n: number | null | undefined) {
  const v = n ?? 0;
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  return inr(v);
}

export function shortDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** One card with 2–4 numbers split by hairlines — the profile "snapshot strip". */
export function StatStrip({ items }: { items: { value: React.ReactNode; label: string; color?: string }[] }) {
  return (
    <div style={{ ...card, padding: "14px 8px", display: "flex" }}>
      {items.map((it, i) => (
        <div key={it.label} style={{ flex: 1, minWidth: 0, textAlign: "center", borderRight: i < items.length - 1 ? "1px solid var(--line)" : "none", padding: "0 4px" }}>
          <p style={{ margin: 0, fontSize: items.length > 3 ? 15 : 17, fontWeight: 700, color: it.color ?? "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.value}</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</p>
        </div>
      ))}
    </div>
  );
}

/** Rounded white search field used at the top of list screens. */
export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 10, background: "var(--surface)",
      borderRadius: 16, padding: "12px 14px", boxShadow: "var(--shadow-card)",
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink-mute)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7.5" /><path d="M21 21l-4.6-4.6" /></svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} enterKeyHint="search"
        style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 16, color: "var(--ink)", padding: 0 }} />
    </label>
  );
}
