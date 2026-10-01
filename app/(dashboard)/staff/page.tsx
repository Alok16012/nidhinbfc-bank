"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/hooks/useRole";
import { useBranch } from "@/lib/hooks/useBranch";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionEditor } from "@/components/staff/PermissionEditor";
import { formatINR, formatDate, getInitials } from "@/lib/utils";
import { PERMISSION_GROUPS, resolvePermissions, type Permission } from "@/lib/permissions";
import {
  UserCog, PlusCircle, Phone, Mail, ShieldCheck, Eye, EyeOff, KeyRound,
  CheckCircle2, AlertCircle, Building2, X, Loader2,
} from "lucide-react";

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  password: "",
  department: "",
  salary: 0,
  join_date: new Date().toISOString().split("T")[0],
};

// Modules a staff member can use at all, for the summary on their card
function moduleSummary(perms: Permission[]) {
  const modules = PERMISSION_GROUPS.filter((g) => g.permissions.some((p) => perms.includes(p.key))).map((g) => g.module);
  return modules.length ? modules.join(" · ") : "No access yet";
}

export default function StaffPage() {
  const supabase = createClient();
  const { isAdmin } = useRole();
  const { branches, current: currentBranch } = useBranch();

  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [createLogin, setCreateLogin] = useState(true);
  const [loginMsg, setLoginMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [nextEmployeeId, setNextEmployeeId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [branchId, setBranchId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // Edit access of an existing staff member
  const [editing, setEditing] = useState<any | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editPerms, setEditPerms] = useState<Permission[]>([]);
  const [editBranch, setEditBranch] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginResult, setLoginResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Employee ids are numbered across all branches, so ask the database
  const refreshEmployeeId = async (fallbackCount: number) => {
    const { data } = await supabase.rpc("next_employee_id");
    setNextEmployeeId(data ?? `EMP${String(fallbackCount + 1).padStart(5, "0")}`);
  };

  useEffect(() => {
    supabase.from("staff").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      const list = data || [];
      setStaff(list);
      refreshEmployeeId(list.length);
      setLoading(false);
    });
  }, [supabase]);

  // New staff default to the branch being viewed
  useEffect(() => {
    if (!branchId && currentBranch) setBranchId(currentBranch.id);
  }, [currentBranch, branchId]);

  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name;
  const knownRoles = Array.from(new Set(staff.map((s) => s.role).filter(Boolean)));

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLoginMsg(null);

    try {
      if (!branchId) {
        setLoginMsg({ type: "error", text: "Choose which branch this staff member works at." });
        return;
      }
      if (permissions.length === 0) {
        setLoginMsg({ type: "error", text: "Tick at least one thing this staff member can access." });
        return;
      }

      // 1. Insert into staff table (the password only goes to the login, never this table)
      const { password: _password, ...staffFields } = form;
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .insert({
          ...staffFields,
          role: roleName.trim(),
          permissions,
          branch_id: branchId,
          employee_id: nextEmployeeId,
          status: "active",
        })
        .select()
        .single();
      if (staffError) {
        setLoginMsg({ type: "error", text: `Could not add staff: ${staffError.message}` });
        return;
      }

      // 2. Optionally create login credentials via API. What they can do comes
      // from the staff record above, so the login itself is a plain staff login.
      if (createLogin && form.email && form.password) {
        const res = await fetch("/api/staff/create-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email:    form.email,
            password: form.password,
            name:     form.name,
            role:     "staff",
            staff_id: staffData.id,
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
        const updated = [staffData, ...staff];
        setStaff(updated);
        refreshEmployeeId(updated.length);
        setShowForm(false);
        setForm(EMPTY_FORM);
        setRoleName("");
        setPermissions([]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setEditRole(s.role ?? "");
    setEditPerms(resolvePermissions(s.permissions, s.role));
    setEditBranch(s.branch_id ?? "");
    setEditStatus(s.status ?? "active");
    setEditError("");
    setLoginEmail(s.email ?? "");
    setLoginPassword("");
    setLoginResult(null);
  };

  // Give an existing staff member a login (e.g. when it failed on Add Staff)
  const createLoginFor = async () => {
    if (!loginEmail || loginPassword.length < 8) {
      setLoginResult({ type: "error", text: "Enter an email and a password of at least 8 characters." });
      return;
    }
    setLoginBusy(true);
    setLoginResult(null);
    const res = await fetch("/api/staff/create-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword, name: editing.name, role: "staff", staff_id: editing.id }),
    });
    const json = await res.json();
    setLoginBusy(false);
    if (!res.ok) {
      setLoginResult({ type: "error", text: json.error });
      return;
    }
    setLoginResult({ type: "success", text: `Login created. ${editing.name} can now sign in with ${loginEmail}.` });
    setLoginPassword("");
    const updated = { ...editing, user_id: json.userId, email: loginEmail };
    setEditing(updated);
    setStaff((list) => list.map((s) => (s.id === updated.id ? updated : s)));
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRole.trim()) { setEditError("Enter a role name."); return; }
    setSaving(true);
    setEditError("");
    const { data, error } = await supabase
      .from("staff")
      .update({ role: editRole.trim(), permissions: editPerms, branch_id: editBranch || null, status: editStatus })
      .eq("id", editing.id)
      .select()
      .single();
    setSaving(false);
    if (error) { setEditError(error.message); return; }
    setStaff((list) => list.map((s) => (s.id === data.id ? data : s)));
    setEditing(null);
  };

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

      {/* Add Staff Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <UserCog className="h-4 w-4 text-slate-500" /> Add New Staff Member
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee ID - auto generated */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Employee ID (Auto-generated)</label>
              <input
                className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-mono font-semibold text-emerald-700 outline-none cursor-not-allowed"
                value={nextEmployeeId}
                readOnly
              />
            </div>
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

            {/* Branch */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Branch *</label>
              <select className={inputClass} required value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="" disabled>Select branch</option>
                {branches.filter((b) => b.status === "active").map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">They will only see this branch&apos;s members, deposits, loans and books.</p>
            </div>

            {/* Role & access */}
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <PermissionEditor
                roleName={roleName}
                onRoleNameChange={setRoleName}
                permissions={permissions}
                onPermissionsChange={setPermissions}
                knownRoles={knownRoles}
              />
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
                      They will only see what you ticked above. You can change it any time with <strong>Edit access</strong>.
                      Requires <code className="bg-blue-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> on the server.
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
            const perms = resolvePermissions(s.permissions, s.role);
            return (
              <div key={s.id} className="flex flex-col bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm">
                    {getInitials(s.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                    <p className="text-[11px] font-mono text-slate-400">{s.employee_id}</p>
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-50 text-blue-700">
                      {s.role?.replace(/_/g, " ") || "No role"}
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
                  {branchName(s.branch_id) && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="truncate">{branchName(s.branch_id)}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-slate-500">
                    <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="text-xs">{moduleSummary(perms)}</span>
                  </div>
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
                {isAdmin && (
                  <button
                    onClick={() => openEdit(s)}
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <ShieldCheck className="h-4 w-4" /> Edit access
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit access modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
          <form onSubmit={saveEdit} className="my-8 w-full max-w-4xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Edit access — {editing.name}</h2>
                <p className="text-xs text-slate-500">Changes apply the next time they open or refresh the app.</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{editError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Branch</label>
                <select className={inputClass} value={editBranch} onChange={(e) => setEditBranch(e.target.value)}>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select className={inputClass} value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive (blocks all access)</option>
                </select>
              </div>
            </div>

            {/* Login */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <KeyRound className="h-4 w-4 text-slate-500" /> Login
              </p>
              {editing.user_id ? (
                <p className="text-sm text-slate-600">Has a login: <strong>{editing.email}</strong></p>
              ) : (
                <>
                  <p className="mb-3 text-xs text-slate-500">
                    No login linked yet. If they already sign in with this email it still works; otherwise create one here.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <input className={inputClass} type="email" placeholder="Login email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                    <input className={inputClass} type="password" placeholder="Password (min 8)" minLength={8} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                    <button
                      type="button"
                      onClick={createLoginFor}
                      disabled={loginBusy}
                      className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {loginBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                      Create login
                    </button>
                  </div>
                </>
              )}
              {loginResult && (
                <p className={`mt-2 text-sm ${loginResult.type === "success" ? "text-emerald-700" : "text-red-600"}`}>{loginResult.text}</p>
              )}
            </div>

            <PermissionEditor
              roleName={editRole}
              onRoleNameChange={setEditRole}
              permissions={editPerms}
              onPermissionsChange={setEditPerms}
              knownRoles={knownRoles}
            />

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save access
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
