import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login – Sahayog Cooperative CRM",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {children}
    </main>
  );
}
