"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/hooks/useRole";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatINR, formatDate, getInitials } from "@/lib/utils";
import {
  UserCog, PlusCircle, Phone, Mail, Info, ShieldCheck,
  Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle,
} from "lucide-react";

const ROLE_OPTIONS = [
  { value: "manager",      label: "Manager",      tier: "Manager",  color: "bg-blue-100 text-blue-700",    desc: "Approve loans + confirm collections" },
  { value: "accountant",   label: "Accountant",   tier: "Manager",  color: "bg-purple-100 text-purple-700", desc: "Approve loans + view reports" },
  { value: "loan_officer", label: "Loan Officer", tier: "Manager",  color: "bg-indigo-100 text-indigo-700", desc: "Approve loans only" },
  { value: "cashier",      label: "Cashier",      tier: "Staff",    color: "bg-teal-100 text-teal-700",     desc: "Record payments" },
  { value: "clerk",        label: "Clerk",        tier: "Staff",    color: "bg-slate-100 text-slate-600",   desc: "Record only, no approvals" },
];

export default function StaffPage() {
  const supabase = createClient();
  const { isAdmin } = useRole();

  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [createLogin, setCreateLogin] = useState(true);
  const [loginMsg, setLoginMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: "clerk",
    department: "",
    salary: 0,
    join_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    supabase.from("staff").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setStaff(data || []);
      setLoading(false);
    });
  }, [supabase]);

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLoginMsg(null);

    try {
      // 1. Insert into staff table
      const employeeId = `EMP${Date.now().toString().slice(-5)}`;
      const { data: staffData } = await supabase
        .from("staff")
        .insert({ ...form, employee_id: employeeId, status: "active" })
        .select()
        .single();

      // 2. Optionally create login credentials via API
      if (createLogin && form.email && form.password) {
        const res = await fetch("/api/staff/create-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email:    form.email,
            password: form.password,
            name:     form.name,
            role:     form.role,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setLoginMsg({ type: "error", text: `Staff added, but login creation failed: ${json.error}` });
        } else {
          setLoginMsg({ type: "success", text: `Staff added and login created! They can now sign in with ${form.email}` });
        }
      }

      if (staffData) {
        setStaff((prev) => [staffData, ...prev]);
        setShowForm(false);
        setForm({ name: "", phone: "", email: "", password: "", role: "clerk", department: "", salary: 0, join_date: new Date().toISOString().split("T")[0] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoleInfo = ROLE_OPTIONS.find((r) => r.value === form.role);

  return (
    <div className="space-y-5">
      <PageHeader title="Staff Management" description={`${staff.length} staff members`}>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4" /> Add Staff
          </button>
        )}
      </PageHeader>

      {/* Login notification */}
      {loginMsg && (
        <div className={`flex items-start gap-3 rounded-xl p-4 ${
          loginMsg.type === "success" ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"
        }`}>
          {loginMsg.type === "success"
            ? <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />}
          <p className={`text-sm ${loginMsg.type === "success" ? "text-emerald-800" : "text-red-800"}`}>
            {loginMsg.text}
          </p>
          <button onClick={() => setLoginMsg(null)} className="ml-auto text-slate-400 hover:text-slate-600 text-xs">✕</button>
        </div>
      )}

      {/* Role Permissions Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800 mb-2">3-Tier Permission System</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mb-2">
              <div className="bg-white border border-blue-100 rounded-lg p-2.5">
                <span className="font-bold text-blue-700">Admin</span>
                <p className="text-slate-500 mt-0.5">Full access — approve, disburse loans, confirm all, settings</p>
              </div>
              <div className="bg-white border border-blue-100 rounded-lg p-2.5">
                <span className="font-bold text-purple-700">Manager / Accountant / Loan Officer</span>
                <p className="text-slate-500 mt-0.5">Approve loans, confirm collections, direct deposits</p>
              </div>
              <div className="bg-white border border-blue-100 rounded-lg p-2.5">
                <span className="font-bold text-slate-600">Cashier / Clerk</span>
                <p className="text-slate-500 mt-0.5">Record only — items go for manager approval</p>
              </div>
            </div>
            <p className="text-xs text-blue-600">
              Login is created via <strong>Add Staff</strong> → set email + password. The role is embedded in their login profile.
            </p>
          </div>
        </div>
      </div>

      {/* Add Staff Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <UserCog className="h-4 w-4 text-slate-500" /> Add New Staff Member
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic info */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
              <input className={inputClass} required value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone *</label>
              <input className={inputClass} required value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>

            {/* Role selector */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Role *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                    className={`text-left rounded-lg border p-2.5 text-xs transition-all ${
                      form.role === r.value
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className={`inline-block px-1.5 py-0.5 rounded font-semibold text-[10px] mb-1 ${r.color}`}>
                      {r.label}
                    </span>
                    <p className="text-slate-500">{r.desc}</p>
                    <p className="text-slate-400 text-[10px] mt-0.5">Tier: {r.tier}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
              <input className={inputClass} value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Monthly Salary (₹)</label>
              <input className={inputClass} type="number" value={form.salary}
                onChange={(e) => setForm((f) => ({ ...f, salary: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Join Date</label>
              <input className={inputClass} type="date" value={form.join_date}
                onChange={(e) => setForm((f) => ({ ...f, join_date: e.target.value }))} />
            </div>

            {/* Login creation section */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="createLogin"
                  checked={createLogin}
                  onChange={(e) => setCreateLogin(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="createLogin" className="text-sm font-medium text-slate-700 cursor-pointer flex items-center gap-1.5">
                  <KeyRound className="h-4 w-4 text-slate-500" /> Create login credentials (email + password) so they can sign in
                </label>
              </div>

              {createLogin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Login Email *</label>
                    <input
                      className={inputClass}
                      type="email"
                      required={createLogin}
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="staff@yournidhi.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
                    <div className="relative">
                      <input
                        className={`${inputClass} pr-10`}
                        type={showPwd ? "text" : "password"}
                        required={createLogin}
                        value={form.password}
                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                        placeholder="min 8 characters"
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-blue-700 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                      The role <strong>{selectedRoleInfo?.label}</strong> will be automatically set on their login profile.
                      Requires <code className="bg-blue-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> in <code className="bg-blue-100 px-1 rounded">.env.local</code>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
              >
                {submitting ? "Adding..." : "Add Staff"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-4 text-center py-12 text-slate-400">Loading staff...</div>
        ) : staff.length === 0 ? (
          <div className="col-span-4 text-center py-12 text-slate-400">No staff members added yet</div>
        ) : (
          staff.map((s) => {
            const roleOpt = ROLE_OPTIONS.find((r) => r.value === s.role);
            return (
              <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm">
                    {getInitials(s.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded capitalize font-medium ${roleOpt?.color ?? "bg-slate-100 text-slate-600"}`}>
                      {s.role?.replace(/_/g, " ")}
                    </span>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-slate-500"><Phone className="h-3.5 w-3.5" />{s.phone}</div>
                  {s.email && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.department && <p className="text-xs text-slate-400">{s.department}</p>}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Monthly Salary</p>
                    <p className="text-sm font-bold text-slate-800">{formatINR(s.salary)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Since</p>
                    <p className="text-xs text-slate-600">{formatDate(s.join_date)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
