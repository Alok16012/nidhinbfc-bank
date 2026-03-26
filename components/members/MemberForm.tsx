"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateMemberID } from "@/lib/utils";
import type { Member } from "@/lib/hooks/useMembers";
import { Upload, FileText, X as CloseIcon, Loader2, Camera, CreditCard } from "lucide-react";

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
    nominee_dob: member?.nominee_dob ?? "",
    nominee_aadhar: member?.nominee_aadhar ?? "",
    nominee_pan: member?.nominee_pan ?? "",
    aadhar: member?.aadhar ?? "",
    pan: member?.pan ?? "",
    aadhar_url: member?.aadhar_url ?? "",
    aadhar_back_url: member?.aadhar_back_url ?? "",
    pan_url: member?.pan_url ?? "",
    photo_url: member?.photo_url ?? "",
    share_capital: member?.share_capital ?? 0,
    status: member?.status ?? "active",
  });

  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: "aadhar_url" | "aadhar_back_url" | "pan_url" | "photo_url") => {
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
          {/* Photo Upload */}
          <div className="md:col-span-2 flex items-center gap-5">
            <div className="relative flex-shrink-0">
              {form.photo_url ? (
                <img
                  src={form.photo_url}
                  alt="Member photo"
                  className="h-24 w-24 rounded-full object-cover border-2 border-blue-100"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-slate-400" />
                </div>
              )}
              {form.photo_url && (
                <button
                  type="button"
                  onClick={() => handleChange("photo_url", "")}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                >
                  <CloseIcon className="h-3 w-3" />
                </button>
              )}
            </div>
            <div>
              <label className={labelClass}>Member Photo</label>
              <input
                type="file"
                className="hidden"
                id="photo-upload"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, "photo_url")}
                disabled={uploading.photo_url}
              />
              <label
                htmlFor="photo-upload"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                {uploading.photo_url ? (
                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading.photo_url ? "Uploading..." : form.photo_url ? "Change Photo" : "Upload Photo"}
              </label>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG up to 5MB</p>
            </div>
          </div>

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
          <div className="md:col-span-2 pt-2">
            {/* Aadhar Card — Front + Back */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">Aadhar Card</span>
                <span className="text-xs text-slate-400">(Front &amp; Back both required)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Front */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Front Side</label>
                  {form.aadhar_url ? (
                    <div className="relative rounded-lg overflow-hidden border border-blue-200 bg-blue-50">
                      <img src={form.aadhar_url} alt="Aadhar Front" className="w-full h-28 object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-end p-2">
                        <button type="button" onClick={() => handleChange("aadhar_url", "")} className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600">
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-blue-600/80 text-white text-xs font-medium">✓ Front Uploaded</div>
                    </div>
                  ) : (
                    <>
                      <input type="file" className="hidden" id="aadhar-front-upload" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, "aadhar_url")} disabled={uploading.aadhar_url} />
                      <label htmlFor="aadhar-front-upload" className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all min-h-[7rem]">
                        {uploading.aadhar_url ? <Loader2 className="h-5 w-5 text-blue-500 animate-spin" /> : <Upload className="h-5 w-5 text-blue-400" />}
                        <span className="text-xs font-medium text-slate-500">{uploading.aadhar_url ? "Uploading..." : "Upload Aadhar Front"}</span>
                        <span className="text-xs text-slate-400">JPG, PNG, PDF</span>
                      </label>
                    </>
                  )}
                </div>
                {/* Back */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Back Side</label>
                  {form.aadhar_back_url ? (
                    <div className="relative rounded-lg overflow-hidden border border-blue-200 bg-blue-50">
                      <img src={form.aadhar_back_url} alt="Aadhar Back" className="w-full h-28 object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-end p-2">
                        <button type="button" onClick={() => handleChange("aadhar_back_url", "")} className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600">
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-blue-600/80 text-white text-xs font-medium">✓ Back Uploaded</div>
                    </div>
                  ) : (
                    <>
                      <input type="file" className="hidden" id="aadhar-back-upload" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, "aadhar_back_url")} disabled={uploading.aadhar_back_url} />
                      <label htmlFor="aadhar-back-upload" className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all min-h-[7rem]">
                        {uploading.aadhar_back_url ? <Loader2 className="h-5 w-5 text-blue-500 animate-spin" /> : <Upload className="h-5 w-5 text-blue-400" />}
                        <span className="text-xs font-medium text-slate-500">{uploading.aadhar_back_url ? "Uploading..." : "Upload Aadhar Back"}</span>
                        <span className="text-xs text-slate-400">JPG, PNG, PDF</span>
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* PAN Card */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-slate-700">PAN Card</span>
              </div>
              {form.pan_url ? (
                <div className="relative rounded-lg overflow-hidden border border-purple-200 bg-purple-50 max-w-xs">
                  <img src={form.pan_url} alt="PAN Card" className="w-full h-28 object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-end p-2">
                    <button type="button" onClick={() => handleChange("pan_url", "")} className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600">
                      <CloseIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-purple-600/80 text-white text-xs font-medium">✓ PAN Uploaded</div>
                </div>
              ) : (
                <div className="max-w-xs">
                  <input type="file" className="hidden" id="pan-upload" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, "pan_url")} disabled={uploading.pan_url} />
                  <label htmlFor="pan-upload" className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border-2 border-dashed border-purple-200 hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all min-h-[7rem]">
                    {uploading.pan_url ? <Loader2 className="h-5 w-5 text-purple-500 animate-spin" /> : <Upload className="h-5 w-5 text-purple-400" />}
                    <span className="text-xs font-medium text-slate-500">{uploading.pan_url ? "Uploading..." : "Upload PAN Card"}</span>
                    <span className="text-xs text-slate-400">JPG, PNG, PDF</span>
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
            <label className={labelClass}>Nominee Date of Birth</label>
            <input className={inputClass} type="date" value={form.nominee_dob} onChange={(e) => handleChange("nominee_dob", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Share Capital (₹)</label>
            <input className={inputClass} type="number" min={0} value={form.share_capital} onChange={(e) => handleChange("share_capital", parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
          <div>
            <label className={labelClass}>Nominee Aadhar Number</label>
            <input className={inputClass} value={form.nominee_aadhar} onChange={(e) => handleChange("nominee_aadhar", e.target.value)} placeholder="12-digit Aadhar" maxLength={12} />
          </div>
          <div>
            <label className={labelClass}>Nominee PAN Number</label>
            <input className={inputClass} value={form.nominee_pan} onChange={(e) => handleChange("nominee_pan", e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
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
