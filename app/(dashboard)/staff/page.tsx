"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatINR, formatDate, getInitials } from "@/lib/utils";
import { UserCog, PlusCircle, Phone, Mail } from "lucide-react";

export default function StaffPage() {
  const supabase = createClient();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", role: "clerk",
    department: "", salary: 0, join_date: new Date().toISOString().split("T")[0],
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
    const employeeId = `EMP${Date.now().toString().slice(-5)}`;
    const { data } = await supabase.from("staff").insert({ ...form, employee_id: employeeId, status: "active" }).select().single();
    if (data) { setStaff((prev) => [data, ...prev]); setShowForm(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Staff Management" description={`${staff.length} staff members`}>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <PlusCircle className="h-4 w-4" />Add Staff
        </button>
      </PageHeader>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Add New Staff Member</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label><input className={inputClass} required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Phone *</label><input className={inputClass} required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label><input className={inputClass} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Role *</label>
              <select className={inputClass} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="manager">Manager</option>
                <option value="accountant">Accountant</option>
                <option value="loan_officer">Loan Officer</option>
                <option value="cashier">Cashier</option>
                <option value="clerk">Clerk</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label><input className={inputClass} value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Salary (₹)</label><input className={inputClass} type="number" value={form.salary} onChange={(e) => setForm((f) => ({ ...f, salary: parseFloat(e.target.value) || 0 }))} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Join Date</label><input className={inputClass} type="date" value={form.join_date} onChange={(e) => setForm((f) => ({ ...f, join_date: e.target.value }))} /></div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700">Add Staff</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-4 text-center py-12 text-slate-400">Loading staff...</div>
        ) : staff.length === 0 ? (
          <div className="col-span-4 text-center py-12 text-slate-400">No staff members added yet</div>
        ) : (
          staff.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm">
                  {getInitials(s.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded capitalize">{s.role.replace(/_/g, " ")}</span>
                </div>
                <StatusBadge status={s.status} />
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-slate-500"><Phone className="h-3.5 w-3.5" />{s.phone}</div>
                {s.email && <div className="flex items-center gap-2 text-slate-500"><Mail className="h-3.5 w-3.5" /><span className="truncate">{s.email}</span></div>}
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
          ))
        )}
      </div>
    </div>
  );
}
