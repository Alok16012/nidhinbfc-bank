"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Eye, EyeOff, Lock, Mail,
  AlertCircle, Home, Hand, ShieldCheck,
  UserCog, User
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleDemoLogin = async (role: "admin" | "manager" | "staff") => {
    const credentials = {
      admin: { email: "admin@grihsevak.com", pass: "password" },
      manager: { email: "manager@grihsevak.com", pass: "password" },
      staff: { email: "staff@grihsevak.com", pass: "password" },
    };

    const { email: dEmail } = credentials[role];

    // Set cookies for mock demo access
    document.cookie = `sb-demo-access=true; path=/; max-age=86400`;
    document.cookie = `sb-demo-role=${role}; path=/; max-age=86400`;
    document.cookie = `sb-demo-email=${dEmail}; path=/; max-age=86400`;
    document.cookie = `sb-demo-name=${role.charAt(0).toUpperCase() + role.slice(1)} Demo; path=/; max-age=86400`;

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-8 py-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
          <div className="mx-auto mb-5 h-20 w-20 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 flex items-center justify-center border-4 border-white/20 shadow-2xl relative">
            <div className="absolute inset-0 rounded-full border border-yellow-200/50 animate-pulse"></div>
            <div className="relative flex flex-col items-center">
              <Home className="h-10 w-10 text-slate-900" />
              <Hand className="h-7 w-7 text-slate-900 -mt-2" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase">Grihsevak Nidhi</h1>
          <p className="text-yellow-400 text-xs font-bold mt-2 uppercase tracking-[0.2em] opacity-90">Nidhi Limited</p>
          <p className="text-blue-200 text-[10px] mt-2 italic font-medium">"We Think For People"</p>
        </div>

        {/* Form */}
        <div className="px-8 py-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 text-center">Sign in to your account</h2>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@cooperative.com"
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-10 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-slate-200"></div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Quick Login (Demo)</span>
            <div className="h-[1px] flex-1 bg-slate-200"></div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin("admin")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all group"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Login as Admin</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin("manager")}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-lg border border-purple-100 bg-purple-50 py-2.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-all group"
              >
                <UserCog className="h-4 w-4" />
                <span>Manager</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("staff")}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-100 bg-slate-50 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all group"
              >
                <User className="h-4 w-4" />
                <span>Staff</span>
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            © 2025 Grihsevak Nidhi Limited. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
