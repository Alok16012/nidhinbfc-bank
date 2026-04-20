"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const createAdmin = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@grihsevak.com",
          password: "Admin@123",
          name: "Admin",
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessage(`Error: ${data.error}`);
      } else {
        setMessage("Admin user created successfully! Now login.");
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch (err) {
      setMessage("Something went wrong");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Setup Admin Account</h1>
          <p className="text-slate-500 mt-2">Create your admin user for Grihsevak Nidhi</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-slate-600 font-medium mb-2">Admin Credentials:</p>
          <p className="text-sm text-slate-500">Email: <span className="font-mono">admin@grihsevak.com</span></p>
          <p className="text-sm text-slate-500">Password: <span className="font-mono">Admin@123</span></p>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
            {message}
          </div>
        )}

        <button
          onClick={createAdmin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
          {loading ? "Creating..." : "Create Admin User"}
        </button>

        <button
          onClick={() => router.push("/login")}
          className="w-full mt-3 text-sm text-slate-500 hover:text-slate-700"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
