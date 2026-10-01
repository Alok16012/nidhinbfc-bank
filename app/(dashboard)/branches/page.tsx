"use client";

import { useEffect, useState } from "react";
import {
  Building2, PlusCircle, MapPin, Phone, UserRound, Users, PiggyBank,
  CreditCard, ArrowRight, Pencil, X, Loader2, AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/hooks/useRole";
import { useBranch, type Branch } from "@/lib/hooks/useBranch";
import { switchBranch } from "@/lib/branch";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatINR, cn } from "@/lib/utils";

interface BranchStats {
  bid: string;
  member_count: number;
  staff_count: number;
  deposit_count: number;
  deposit_total: number;
  loan_count: number;
  loan_outstanding: number;
}

const EMPTY_FORM = { code: "", name: "", address: "", city: "", phone: "", email: "", manager_name: "", status: "active" };

export default function BranchesPage() {
  const supabase = createClient();
  const { isAdmin, loading: roleLoading } = useRole();
  const { current } = useBranch();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState<Record<string, BranchStats>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Branch | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const [b, s] = await Promise.all([
      supabase.from("branches").select("*").order("is_head_office", { ascending: false }).order("name"),
      supabase.rpc("branch_stats"),
    ]);
    setBranches((b.data as Branch[]) || []);
    setStats(Object.fromEntries(((s.data as BranchStats[]) || []).map((r) => [r.bid, r])));
    setLoading(false);
  };

  useEffect(() => { load(); }, [supabase]);

  const openForm = (branch: Branch | "new") => {
    setError("");
    setEditing(branch);
    setForm(branch === "new" ? EMPTY_FORM : {
      code: branch.code, name: branch.name, address: branch.address ?? "", city: branch.city ?? "",
      phone: branch.phone ?? "", email: branch.email ?? "", manager_name: branch.manager_name ?? "", status: branch.status,
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = { ...form, code: form.code.trim().toUpperCase(), name: form.name.trim(), updated_at: new Date().toISOString() };
    const { error } = editing === "new"
      ? await supabase.from("branches").insert(payload)
      : await supabase.from("branches").update(payload).eq("id", (editing as Branch).id);
    setSaving(false);
    if (error) {
      setError(error.code === "23505" ? `Branch code "${payload.code}" is already used` : error.message);
      return;
    }
    setEditing(null);
    load();
  };

  if (!roleLoading && !isAdmin) {
    return <p className="py-16 text-center text-slate-500">Only admins can manage branches.</p>;
  }

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  const totals = Object.values(stats).reduce(
    (t, s) => ({ members: t.members + Number(s.member_count), deposits: t.deposits + Number(s.deposit_total), loans: t.loans + Number(s.loan_outstanding) }),
    { members: 0, deposits: 0, loans: 0 }
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Branches" description={`${branches.length} branches · ${totals.members} members · ${formatINR(totals.deposits)} deposits`}>
        <button
          onClick={() => openForm("new")}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          <PlusCircle className="h-4 w-4" />
          Add Branch
        </button>
      </PageHeader>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading branches...</div>
      ) : branches.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          No branches found. Run <code className="font-mono">supabase/migrations/branches.sql</code> in the Supabase SQL Editor first.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {branches.map((b) => {
            const s = stats[b.id];
            const viewing = current?.id === b.id;
            return (
              <div
                key={b.id}
                className={cn(
                  "flex flex-col rounded-xl border bg-white p-5 shadow-sm",
                  viewing ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="truncate font-semibold text-slate-900">{b.name}</h3>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">{b.code}</span>
                      {b.is_head_office && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">Head office</span>}
                      {b.status === "inactive" && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">Inactive</span>}
                    </div>
                    <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                      {(b.address || b.city) && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{[b.address, b.city].filter(Boolean).join(", ")}</p>}
                      {b.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{b.phone}</p>}
                      {b.manager_name && <p className="flex items-center gap-1.5"><UserRound className="h-3 w-3" />{b.manager_name}</p>}
                    </div>
                  </div>
                  <button onClick={() => openForm(b)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Edit branch">
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <Stat icon={Users} label="Members" value={String(s?.member_count ?? 0)} />
                  <Stat icon={UserRound} label="Staff" value={String(s?.staff_count ?? 0)} />
                  <Stat icon={PiggyBank} label={`Deposits (${s?.deposit_count ?? 0})`} value={formatINR(Number(s?.deposit_total ?? 0))} />
                  <Stat icon={CreditCard} label={`Loans (${s?.loan_count ?? 0})`} value={formatINR(Number(s?.loan_outstanding ?? 0))} />
                </div>

                <button
                  onClick={() => switchBranch(b.id, "/dashboard")}
                  className={cn(
                    "mt-4 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
                    viewing ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-slate-900 text-white hover:bg-slate-800"
                  )}
                >
                  {viewing ? "Currently open — go to dashboard" : "Open branch"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={save} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{editing === "new" ? "Add Branch" : `Edit ${editing.name}`}</h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Code *</label>
                <input required maxLength={10} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="BGS" className={cn(inputClass, "uppercase")} />
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Branch name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Begusarai Branch" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">City</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Branch manager</label>
                <input value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} className={inputClass} />
              </div>
            </div>
            {editing !== "new" && !editing.is_head_office && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.status === "inactive"}
                  onChange={(e) => setForm({ ...form, status: e.target.checked ? "inactive" : "active" })}
                />
                Mark branch inactive
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing === "new" ? "Create branch" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs text-slate-500"><Icon className="h-3 w-3" />{label}</p>
      <p className="mt-0.5 font-semibold text-slate-800">{value}</p>
    </div>
  );
}
