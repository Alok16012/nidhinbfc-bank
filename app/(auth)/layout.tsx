import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login – Grihsevak Nidhi",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="m-app min-h-screen" style={{ background: "var(--app-bg)" }}>
      {children}
    </main>
  );
}
