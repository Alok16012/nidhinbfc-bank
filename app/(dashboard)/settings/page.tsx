"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Building2, Shield, Bell, Database, Percent, Save, CheckCircle, AlertCircle } from "lucide-react";
import { useSettings } from "@/lib/hooks/useSettings";

const settingsSections = [
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "interest", label: "Interest Rates", icon: Percent },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "database", label: "Database", icon: Database },
];

export default function SettingsPage() {
  const [active, setActive] = useState("organization");
  const [org, setOrg] = useState({
    name: "Sahayog Credit Cooperative Society",
    reg_no: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    logo_url: "",
  });

  const { settings, loading: settingsLoading, saving, error: saveError, success: saveSuccess, saveSettings } = useSettings();
  const [rates, setRates] = useState<Record<string, number> | null>(null);

  // Sync local rates state once settings load
  if (!settingsLoading && rates === null) {
    setRates({ ...settings });
  }

  const currentRates: Record<string, number> = rates ?? (settings as unknown as Record<string, number>);

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Manage cooperative configuration" />

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActive(section.id)}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium border-b border-slate-100 last:border-0 text-left transition-colors ${
                    active === section.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          {active === "organization" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">Organization Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><label className={labelClass}>Society Name</label><input className={inputClass} value={org.name} onChange={(e) => setOrg((o) => ({ ...o, name: e.target.value }))} /></div>
                <div><label className={labelClass}>Registration No.</label><input className={inputClass} value={org.reg_no} onChange={(e) => setOrg((o) => ({ ...o, reg_no: e.target.value }))} placeholder="Society registration number" /></div>
                <div><label className={labelClass}>Phone</label><input className={inputClass} value={org.phone} onChange={(e) => setOrg((o) => ({ ...o, phone: e.target.value }))} /></div>
                <div><label className={labelClass}>Email</label><input className={inputClass} type="email" value={org.email} onChange={(e) => setOrg((o) => ({ ...o, email: e.target.value }))} /></div>
                <div><label className={labelClass}>Website</label><input className={inputClass} value={org.website} onChange={(e) => setOrg((o) => ({ ...o, website: e.target.value }))} /></div>
                <div className="md:col-span-2"><label className={labelClass}>Address</label><textarea className={inputClass} rows={3} value={org.address} onChange={(e) => setOrg((o) => ({ ...o, address: e.target.value }))} /></div>
              </div>
              <div className="flex justify-end">
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                  <Save className="h-4 w-4" />Save Changes
                </button>
              </div>
            </div>
          )}

          {active === "interest" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">Default Interest Rates</h2>
              <p className="text-xs text-slate-500">These rates will be auto-filled when creating new deposits or loans.</p>

              {saveError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />{saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />Rates saved successfully!
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Deposit Rates</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Savings Account", key: "savings_rate", color: "bg-blue-50 border-blue-100" },
                    { label: "Fixed Deposit (FD)", key: "fd_rate", color: "bg-purple-50 border-purple-100" },
                    { label: "Recurring Deposit (RD)", key: "rd_rate", color: "bg-emerald-50 border-emerald-100" },
                    { label: "Daily RD (DRD)", key: "drd_rate", color: "bg-teal-50 border-teal-100" },
                    { label: "Monthly Income Scheme (MIS)", key: "mis_rate", color: "bg-amber-50 border-amber-100" },
                  ].map(({ label, key, color }) => (
                    <div key={key} className={`rounded-xl border p-4 ${color}`}>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">{label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          type="number"
                          step="0.25"
                          min={0}
                          max={40}
                          disabled={settingsLoading}
                          value={currentRates[key] ?? ""}
                          onChange={(e) => setRates((r) => ({ ...(r ?? {}), [key]: parseFloat(e.target.value) || 0 }))}
                        />
                        <span className="text-sm font-medium text-slate-500 whitespace-nowrap">% p.a.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 mt-2">Loan Rates</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Personal Loan", key: "personal_loan_rate", color: "bg-orange-50 border-orange-100" },
                    { label: "Business Loan", key: "business_loan_rate", color: "bg-red-50 border-red-100" },
                    { label: "Gold Loan", key: "gold_loan_rate", color: "bg-yellow-50 border-yellow-100" },
                    { label: "Penalty Rate (per month)", key: "penalty_rate", color: "bg-slate-50 border-slate-200" },
                  ].map(({ label, key, color }) => (
                    <div key={key} className={`rounded-xl border p-4 ${color}`}>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">{label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          type="number"
                          step="0.25"
                          min={0}
                          max={40}
                          disabled={settingsLoading}
                          value={currentRates[key] ?? ""}
                          onChange={(e) => setRates((r) => ({ ...(r ?? {}), [key]: parseFloat(e.target.value) || 0 }))}
                        />
                        <span className="text-sm font-medium text-slate-500 whitespace-nowrap">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  disabled={saving || settingsLoading}
                  onClick={() => saveSettings(currentRates as any)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Rates"}
                </button>
              </div>
            </div>
          )}

          {active === "notifications" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">Notification Settings</h2>
              {[
                { label: "EMI Due Reminder", sub: "Send SMS to members 3 days before due date" },
                { label: "Overdue Alert", sub: "Alert staff when EMI is overdue" },
                { label: "Deposit Maturity Alert", sub: "Notify members 7 days before maturity" },
                { label: "New Member Welcome", sub: "Send welcome SMS on registration" },
                { label: "Payment Receipt", sub: "Send receipt SMS after each payment" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.sub}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                  </label>
                </div>
              ))}
            </div>
          )}

          {active === "security" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">Security Settings</h2>
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-sm font-medium text-amber-800">Change Password</p>
                  <p className="text-xs text-amber-600 mt-0.5 mb-3">Use Supabase auth to change your password.</p>
                  <button className="px-4 py-2 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700">Change Password</button>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-sm font-medium text-slate-700">Two-Factor Authentication</p>
                  <p className="text-xs text-slate-500 mt-0.5 mb-3">Enable 2FA for additional security.</p>
                  <button className="px-4 py-2 bg-slate-800 text-white text-xs rounded-lg hover:bg-slate-900">Enable 2FA</button>
                </div>
              </div>
            </div>
          )}

          {active === "database" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">Database & Backup</h2>
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-sm font-medium text-blue-800">Supabase Connection</p>
                <p className="text-xs text-blue-600 mt-1">Connected to Supabase PostgreSQL database.</p>
                <div className="mt-2 text-xs text-slate-600 font-mono bg-white px-3 py-1.5 rounded border border-slate-200 truncate">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL || "Configure in .env.local"}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-sm font-medium text-slate-700">Export Data</p>
                <p className="text-xs text-slate-500 mt-0.5 mb-3">Download all data as CSV for backup.</p>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg hover:bg-slate-900">Export Members</button>
                  <button className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg hover:bg-slate-900">Export Loans</button>
                  <button className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg hover:bg-slate-900">Export Deposits</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
