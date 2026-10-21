"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/notify";
import { BrandMark, Wordmark } from "@/components/mobile/Brand";
import { PrimaryButton, field, label } from "@/components/mobile/ui";
import { ArrowRight } from "@/components/mobile/icons";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      notify.error("Sign-in failed", error);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    // A phone-width column; on wide screens it floats as a card on the canvas.
    <div style={{ minHeight: "100dvh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <form onSubmit={handleLogin} className="fade-up" style={{
        width: "100%", maxWidth: 430, minHeight: "min(100dvh, 760px)", display: "flex", flexDirection: "column",
        padding: "calc(12px + env(safe-area-inset-top)) 20px 0",
      }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BrandMark size={48} />
            <Wordmark />
          </div>
          <span style={{ alignSelf: "flex-start", marginTop: 18, background: "var(--gold)", color: "var(--blue-dark)", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 8, letterSpacing: "0.05em" }}>
            STAFF LOGIN
          </span>
          <h1 style={{ margin: "12px 0 4px", fontSize: 26, fontWeight: 800, color: "var(--ink)" }}>Welcome back</h1>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-soft)" }}>Sign in to manage members, deposits, loans and collections.</p>

          <div style={{ marginTop: 26 }}>
            <label style={label} htmlFor="login-email">Email address</label>
            <input id="login-email" type="email" autoComplete="username" inputMode="email" required
              value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="you@grihsevak.com" style={field} />

            <label style={{ ...label, marginTop: 16 }} htmlFor="login-password">Password</label>
            <div style={{ position: "relative" }}>
              <input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required
                value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••" style={{ ...field, paddingRight: 64 }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", padding: 4, cursor: "pointer",
                color: "var(--blue)", fontSize: 12.5, fontWeight: 600,
              }}>{showPassword ? "Hide" : "Show"}</button>
            </div>

            {error && (
              <p role="alert" style={{
                margin: "12px 0 0", padding: "10px 12px", borderRadius: 12, fontSize: 12.5, fontWeight: 600,
                background: "var(--error)", color: "var(--error-text)", border: "1px solid var(--error-border)",
              }}>{error}</p>
            )}
          </div>
        </div>

        <div style={{ padding: "16px 0 calc(24px + env(safe-area-inset-bottom))" }}>
          <PrimaryButton type="submit" disabled={loading || !email || !password}>
            {loading ? "Signing in…" : <>Sign In <ArrowRight s={18} c="currentColor" /></>}
          </PrimaryButton>
          <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--ink-mute)", margin: "12px 0 0" }}>
            © Grihsevak Nidhi Limited · “We Think For People”
          </p>
        </div>
      </form>
    </div>
  );
}
