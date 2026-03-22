"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateMemberID } from "@/lib/utils";
import type { Member } from "@/lib/hooks/useMembers";
import { Upload, FileText, X as CloseIcon, Loader2 } from "lucide-react";

interface MemberFormProps {
  member?: Member;
  onSuccess?: () => void;
}

export function MemberForm({ member, onSuccess }: MemberFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = !!member;

  const [form, setForm] = useState({
    name: member?.name ?? "",
    phone: member?.phone ?? "",
    email: member?.email ?? "",
    dob: member?.dob ?? "",
    address: member?.address ?? "",
    nominee_name: member?.nominee_name ?? "",
    nominee_relation: member?.nominee_relation ?? "",
    aadhar: member?.aadhar ?? "",
    pan: member?.pan ?? "",
    aadhar_url: member?.aadhar_url ?? "",
    pan_url: member?.pan_url ?? "",
    share_capital: member?.share_capital ?? 0,
    status: member?.status ?? "active",
  });

  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: "aadhar_url" | "pan_url") => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading((prev) => ({ ...prev, [field]: true }));
    setError("");

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${field}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      setForm((prev) => ({ ...prev, [field]: publicUrl }));
    } catch (err: any) {
      setError(`Error uploading ${field.split("_")[0]}: ${err.message}`);
    } finally {
      setUploading((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isEdit) {
      const { error } = await supabase
        .from("members")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", member!.id);
      if (error) { setError(error.message); setLoading(false); return; }
    } else {
      const { error } = await supabase.from("members").insert({
        ...form,
        member_id: generateMemberID(),
      });
      if (error) { setError(error.message); setLoading(false); return; }
    }

    setLoading(false);
    if (onSuccess) onSuccess();
    else router.push("/members");
    router.refresh();
  };

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Personal Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Full Name *</label>
            <input className={inputClass} required value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Enter full name" />
          </div>
          <div>
            <label className={labelClass}>Mobile Number *</label>
            <input className={inputClass} required value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="10-digit mobile number" maxLength={10} />
          </div>
          <div>
            <label className={labelClass}>Email Address</label>
            <input className={inputClass} type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className={labelClass}>Date of Birth *</label>
            <input className={inputClass} required type="date" value={form.dob} onChange={(e) => handleChange("dob", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select className={inputClass} value={form.status} onChange={(e) => handleChange("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Address *</label>
            <textarea className={inputClass} required rows={3} value={form.address} onChange={(e) => handleChange("address", e.target.value)} placeholder="Full residential address" />
          </div>
        </div>
      </div>

      {/* KYC */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">
          KYC Documents
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Aadhar Number</label>
            <input className={inputClass} value={form.aadhar} onChange={(e) => handleChange("aadhar", e.target.value)} placeholder="12-digit Aadhar" maxLength={12} />
          </div>
          <div>
            <label className={labelClass}>PAN Number</label>
            <input className={inputClass} value={form.pan} onChange={(e) => handleChange("pan", e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
          </div>

          {/* File Uploads */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className={labelClass}>Aadhar Document (PDF/Image)</label>
              {form.aadhar_url ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-blue-100 bg-blue-50">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-xs text-blue-800 truncate">Aadhar Uploaded</span>
                  </div>
                  <button type="button" onClick={() => handleChange("aadhar_url", "")} className="p-1 hover:bg-blue-100 rounded text-blue-600">
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input type="file" className="hidden" id="aadhar-upload" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, "aadhar_url")} disabled={uploading.aadhar_url} />
                  <label htmlFor="aadhar-upload" className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all">
                    {uploading.aadhar_url ? (
                      <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="text-xs font-medium text-slate-600">
                      {uploading.aadhar_url ? "Uploading..." : "Click to upload Aadhar"}
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>PAN Document (PDF/Image)</label>
              {form.pan_url ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-blue-100 bg-blue-50">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-xs text-blue-800 truncate">PAN Uploaded</span>
                  </div>
                  <button type="button" onClick={() => handleChange("pan_url", "")} className="p-1 hover:bg-blue-100 rounded text-blue-600">
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input type="file" className="hidden" id="pan-upload" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, "pan_url")} disabled={uploading.pan_url} />
                  <label htmlFor="pan-upload" className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all">
                    {uploading.pan_url ? (
                      <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="text-xs font-medium text-slate-600">
                      {uploading.pan_url ? "Uploading..." : "Click to upload PAN"}
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nominee */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">
          Nominee Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nominee Name *</label>
            <input className={inputClass} required value={form.nominee_name} onChange={(e) => handleChange("nominee_name", e.target.value)} placeholder="Nominee full name" />
          </div>
          <div>
            <label className={labelClass}>Relation *</label>
            <select className={inputClass} value={form.nominee_relation} onChange={(e) => handleChange("nominee_relation", e.target.value)} required>
              <option value="">Select relation</option>
              <option value="spouse">Spouse</option>
              <option value="father">Father</option>
              <option value="mother">Mother</option>
              <option value="son">Son</option>
              <option value="daughter">Daughter</option>
              <option value="brother">Brother</option>
              <option value="sister">Sister</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Share Capital (₹)</label>
            <input className={inputClass} type="number" min={0} value={form.share_capital} onChange={(e) => handleChange("share_capital", parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {loading ? "Saving..." : isEdit ? "Update Member" : "Register Member"}
        </button>
      </div>
    </form>
  );
}
