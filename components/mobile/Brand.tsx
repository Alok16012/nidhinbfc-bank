/* Grihsevak Nidhi brand pieces for the mobile app. */

import { useId } from "react";

/** The gold coin with a house held in a hand — the society's emblem. */
export function BrandMark({ size = 38 }: { size?: number }) {
  // Unique per instance: a gradient id shared with a hidden copy (e.g. the
  // sidebar on phones) would render the coin without its fill.
  const coin = `gn-coin-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label="Grihsevak Nidhi" role="img" style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <linearGradient id={coin} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd56b" />
          <stop offset="0.55" stopColor="#f5a623" />
          <stop offset="1" stopColor="#c97c06" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill={`url(#${coin})`} />
      <circle cx="24" cy="24" r="19.5" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" />
      {/* House */}
      <path d="M24 11.5l-9 7.6V29h18v-9.9z" fill="#04246b" />
      <path d="M21.3 29v-5.4h5.4V29" fill="#f5a623" />
      {/* Hand cradling it */}
      <path d="M11 29.5c1.7 0 3 .6 4.3 1.6l2.4 1.9h7.1a1.9 1.9 0 0 1 0 3.8h-5.4" fill="none" stroke="#04246b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24.8 33l6.9-3.3a2 2 0 0 1 2.4 3.1l-5.6 4.7c-1 .8-2.2 1.2-3.5 1.2H16.5l-3.2-2" fill="none" stroke="#04246b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** "GRIHSEVAK" in the brand's blue → gold gradient, with the company line under it. */
export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <div style={{ lineHeight: 1.05 }}>
      <p style={{
        margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "0.02em",
        background: light
          ? "linear-gradient(90deg,#ffffff 0%,#ffe2a6 100%)"
          : "linear-gradient(90deg,#0847c7 0%,#0b5cff 55%,#dd8f0d 100%)",
        WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
      }}>GRIHSEVAK</p>
      <p style={{ margin: "2px 0 0", fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", color: light ? "rgba(255,255,255,0.75)" : "var(--ink-soft)" }}>NIDHI LIMITED</p>
    </div>
  );
}
