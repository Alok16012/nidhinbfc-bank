"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Lock, Mail, AlertCircle, Home, Hand } from "lucide-react";
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

    const { email: dEmail, pass: dPass } = credentials[role];
    setEmail(dEmail);
    setPassword(dPass);
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: dEmail,
      password: dPass
    });

    if (error) {
      setError(`Demo ${role} login failed: ${error.message}`);
      setLoading(false);
      return;
    }

    document.cookie = `sb-demo-access=true; path=/; max-age=86400`;
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="w-full max-w-md">
      {/* ... (previous code remains same) */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* ... (header code remains same) */}

        {/* Form */}
        <div className="px-8 py-8">
          {/* ... (form header and fields remain same) */}

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
        {/* ... (footer code remains same) */}
      </div>
    </div>
  );
}
        </div >

  <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
    <p className="text-xs text-slate-400">
      © 2025 Grihsevak Nidhi Limited. All rights reserved.
    </p>
  </div>
      </div >
    </div >
  );
}
