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
    // Post Info
    join_date: member?.join_date ?? new Date().toISOString().split("T")[0],
    // Basic Info
    name: member?.name ?? "",
    form_no: member?.form_no ?? "",
    father_name: member?.father_name ?? "",
    phone: member?.phone ?? "",
    email: member?.email ?? "",
    dob: member?.dob ?? "",
    gender: member?.gender ?? "",
    occupation: member?.occupation ?? "",
    education: member?.education ?? "",
    share_capital: member?.share_capital ?? 0,
    status: member?.status ?? "active",
    // Permanent Address
    address: member?.address ?? "",
    pincode: member?.pincode ?? "",
    state: member?.state ?? "",
    city: member?.city ?? "",
    // Current Address
    current_address: member?.current_address ?? "",
    current_pincode: member?.current_pincode ?? "",
    current_state: member?.current_state ?? "",
    current_district: member?.current_district ?? "",
    // Nominee
    nominee_name: member?.nominee_name ?? "",
    nominee_relation: member?.nominee_relation ?? "",
    nominee_age: member?.nominee_age ?? "",
    // Bank
    bank_account_no: member?.bank_account_no ?? "",
    bank_ifsc: member?.bank_ifsc ?? "",
    bank_name: member?.bank_name ?? "",
    // KYC
    id_type: member?.id_type ?? "",
    id_number: member?.id_number ?? "",
    aadhar: member?.aadhar ?? "",
    pan: member?.pan ?? "",
    aadhar_url: member?.aadhar_url ?? "",
    aadhar_back_url: member?.aadhar_back_url ?? "",
    pan_url: member?.pan_url ?? "",
    // Images
    photo_url: member?.photo_url ?? "",
    signature_url: member?.signature_url ?? "",
    fingerprint_url: member?.fingerprint_url ?? "",
  });

  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSameAsPermanent = (checked: boolean) => {
    setSameAsPermanent(checked);
    if (checked) {
      setForm((prev) => ({
        ...prev,
        current_address: prev.address,
        current_pincode: prev.pincode,
        current_state: prev.state,
        current_district: prev.city,
      }));
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: "aadhar_url" | "aadhar_back_url" | "pan_url" | "photo_url" | "signature_url" | "fingerprint_url"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading((prev) => ({ ...prev, [field]: true }));
    setError("");

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${field}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName);

      setForm((prev) => ({ ...prev, [field]: publicUrl }));
    } catch (err: any) {
      setError(`Upload error: ${err.message}`);
    } finally {
      setUploading((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const submissionData = {
      ...form,
      nominee_age: form.nominee_age ? parseInt(form.nominee_age.toString()) : null,
    };

    if (isEdit) {
      const { error } = await supabase
        .from("members")
        .update({ ...submissionData, updated_at: new Date().toISOString() })
        .eq("id", member!.id);
      if (error) { setError(error.message); setLoading(false); return; }
    } else {
      const { error } = await supabase.from("members").insert({
        ...submissionData,
        member_id: generateMemberID(),
      });
      if (error) { setError(error.message); setLoading(false); return; }
    }

    setLoading(false);
    if (onSuccess) onSuccess();
    else router.push("/members");
    router.refresh();
  };

  const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white disabled:bg-slate-50 disabled:text-slate-400";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";
  const sectionClass = "bg-white rounded-xl border border-slate-200 p-5 shadow-sm";
  const sectionTitle = "text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── POST INFO ── */}
      <div className={sectionClass}>
        <h3 className={sectionTitle}>Post Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Joining Date *</label>
            <input
              className={inputClass}
              required
              type="date"
              value={form.join_date}
              onChange={(e) => handleChange("join_date", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── BASIC INFO + IMAGES ── */}
      <div className={sectionClass}>
        <h3 className={sectionTitle}>Basic Info</h3>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: fields */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Member Name *</label>
              <input
                className={inputClass}
                required
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className={labelClass}>Form No</label>
              <input
                className={inputClass}
                value={form.form_no}
                onChange={(e) => handleChange("form_no", e.target.value)}
                placeholder="e.g. F-0001"
              />
            </div>
            <div>
              <label className={labelClass}>Guardian Name</label>
              <input
                className={inputClass}
                value={form.father_name}
                onChange={(e) => handleChange("father_name", e.target.value)}
                placeholder="Father / Guardian name"
              />
            </div>
            <div>
              <label className={labelClass}>Mobile No *</label>
              <input
                className={inputClass}
                required
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="10-digit number"
                maxLength={10}
              />
            </div>
            <div>
              <label className={labelClass}>Date of Birth *</label>
              <input
                className={inputClass}
                required
                type="date"
                value={form.dob}
                onChange={(e) => handleChange("dob", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Email ID</label>
              <input
                className={inputClass}
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className={labelClass}>Gender *</label>
              <select
                className={inputClass}
                required
                value={form.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
              >
                <option value="">-- Select Gender --</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Occupation *</label>
              <select
                className={inputClass}
                required
                value={form.occupation}
                onChange={(e) => handleChange("occupation", e.target.value)}
              >
                <option value="">-- Select Occupation --</option>
                <option value="farmer">Farmer</option>
                <option value="business">Business</option>
                <option value="service">Service</option>
                <option value="daily_wage">Daily Wage</option>
                <option value="self_employed">Self Employed</option>
                <option value="housewife">Housewife</option>
                <option value="student">Student</option>
                <option value="retired">Retired</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Education</label>
              <select
                className={inputClass}
                value={form.education}
                onChange={(e) => handleChange("education", e.target.value)}
              >
                <option value="">-- Select Education --</option>
                <option value="illiterate">Illiterate</option>
                <option value="primary">Primary (1–5)</option>
                <option value="middle">Middle (6–8)</option>
                <option value="high_school">High School (10th)</option>
                <option value="intermediate">Intermediate (12th)</option>
                <option value="graduate">Graduate</option>
                <option value="post_graduate">Post Graduate</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Share Capital (₹)</label>
              <input
                className={inputClass}
                type="number"
                min={0}
                value={form.share_capital}
                onChange={(e) => handleChange("share_capital", parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Right: Profile / Signature / Fingerprint */}
          <div className="lg:w-44 flex flex-row lg:flex-col gap-4">
            {/* Profile Photo */}
            <div className="flex-1 lg:flex-none">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Profile Image <span className="text-slate-400">(150×150)</span>
              </label>
              {form.photo_url ? (
                <div className="relative rounded-lg overflow-hidden border border-blue-200">
                  <img src={form.photo_url} alt="Profile" className="w-full h-28 object-cover" />
                  <button
                    type="button"
                    onClick={() => handleChange("photo_url", "")}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                  >
                    <CloseIcon className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-blue-600/80 text-white text-xs">✓ Uploaded</div>
                </div>
              ) : (
                <>
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
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all min-h-[7rem]"
                  >
                    {uploading.photo_url
                      ? <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                      : <Camera className="h-5 w-5 text-blue-400" />}
                    <span className="text-xs text-slate-500">
                      {uploading.photo_url ? "Uploading..." : "Upload Photo"}
                    </span>
                  </label>
                </>
              )}
            </div>

            {/* Signature */}
            <div className="flex-1 lg:flex-none">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Signature <span className="text-slate-400">(50×150)</span>
              </label>
              {form.signature_url ? (
                <div className="relative rounded-lg overflow-hidden border border-green-200">
                  <img src={form.signature_url} alt="Signature" className="w-full h-20 object-contain bg-white p-1" />
                  <button
                    type="button"
                    onClick={() => handleChange("signature_url", "")}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                  >
                    <CloseIcon className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-green-600/80 text-white text-xs">✓ Uploaded</div>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    className="hidden"
                    id="signature-upload"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "signature_url")}
                    disabled={uploading.signature_url}
                  />
                  <label
                    htmlFor="signature-upload"
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 border-dashed border-green-200 hover:border-green-400 hover:bg-green-50 cursor-pointer transition-all min-h-[5rem]"
                  >
                    {uploading.signature_url
                      ? <Loader2 className="h-4 w-4 text-green-500 animate-spin" />
                      : <Upload className="h-4 w-4 text-green-400" />}
                    <span className="text-xs text-slate-500">
                      {uploading.signature_url ? "Uploading..." : "Upload Signature"}
                    </span>
                  </label>
                </>
              )}
            </div>

            {/* Fingerprint */}
            <div className="flex-1 lg:flex-none">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Fingerprint <span className="text-slate-400">(50×150)</span>
              </label>
              {form.fingerprint_url ? (
                <div className="relative rounded-lg overflow-hidden border border-orange-200">
                  <img src={form.fingerprint_url} alt="Fingerprint" className="w-full h-20 object-contain bg-white p-1" />
                  <button
                    type="button"
                    onClick={() => handleChange("fingerprint_url", "")}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                  >
                    <CloseIcon className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-orange-600/80 text-white text-xs">✓ Uploaded</div>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    className="hidden"
                    id="fingerprint-upload"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "fingerprint_url")}
                    disabled={uploading.fingerprint_url}
                  />
                  <label
                    htmlFor="fingerprint-upload"
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 border-dashed border-orange-200 hover:border-orange-400 hover:bg-orange-50 cursor-pointer transition-all min-h-[5rem]"
                  >
                    {uploading.fingerprint_url
                      ? <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
                      : <Upload className="h-4 w-4 text-orange-400" />}
                    <span className="text-xs text-slate-500">
                      {uploading.fingerprint_url ? "Uploading..." : "Upload Fingerprint"}
                    </span>
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── PERMANENT ADDRESS ── */}
      <div className={sectionClass}>
        <h3 className={sectionTitle}>Permanent Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Address *</label>
            <textarea
              className={inputClass}
              required
              rows={2}
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Full permanent address"
            />
          </div>
          <div>
            <label className={labelClass}>Pin Code *</label>
            <input
              className={inputClass}
              required
              value={form.pincode}
              onChange={(e) => handleChange("pincode", e.target.value)}
              placeholder="6-digit PIN"
              maxLength={6}
            />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input
              className={inputClass}
              value={form.state}
              onChange={(e) => handleChange("state", e.target.value)}
              placeholder="State"
            />
          </div>
          <div>
            <label className={labelClass}>District</label>
            <input
              className={inputClass}
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="District"
            />
          </div>
        </div>
      </div>

      {/* ── CURRENT ADDRESS ── */}
      <div className={sectionClass}>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Current Address</h3>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sameAsPermanent}
              onChange={(e) => handleSameAsPermanent(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-blue-600"
            />
            <span className="text-xs font-medium text-slate-600">Same as Permanent</span>
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Address *</label>
            <textarea
              className={inputClass}
              required
              rows={2}
              value={form.current_address}
              onChange={(e) => handleChange("current_address", e.target.value)}
              placeholder="Current address"
              disabled={sameAsPermanent}
            />
          </div>
          <div>
            <label className={labelClass}>Pin Code *</label>
            <input
              className={inputClass}
              required
              value={form.current_pincode}
              onChange={(e) => handleChange("current_pincode", e.target.value)}
              placeholder="6-digit PIN"
              maxLength={6}
              disabled={sameAsPermanent}
            />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input
              className={inputClass}
              value={form.current_state}
              onChange={(e) => handleChange("current_state", e.target.value)}
              placeholder="State"
              disabled={sameAsPermanent}
            />
          </div>
          <div>
            <label className={labelClass}>District</label>
            <input
              className={inputClass}
              value={form.current_district}
              onChange={(e) => handleChange("current_district", e.target.value)}
              placeholder="District"
              disabled={sameAsPermanent}
            />
          </div>
        </div>
      </div>

      {/* ── NOMINEE AND OTHER INFO ── */}
      <div className={sectionClass}>
        <h3 className={sectionTitle}>Nominee and Other Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Nominee Name *</label>
            <input
              className={inputClass}
              required
              value={form.nominee_name}
              onChange={(e) => handleChange("nominee_name", e.target.value)}
              placeholder="Nominee full name"
            />
          </div>
          <div>
            <label className={labelClass}>Nominee Relation *</label>
            <select
              className={inputClass}
              required
              value={form.nominee_relation}
              onChange={(e) => handleChange("nominee_relation", e.target.value)}
            >
              <option value="">-- Select Relation --</option>
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
            <label className={labelClass}>Nominee Age</label>
            <input
              className={inputClass}
              type="number"
              min={0}
              max={120}
              value={form.nominee_age}
              onChange={(e) => handleChange("nominee_age", e.target.value)}
              placeholder="Age"
            />
          </div>
        </div>
      </div>

      {/* ── BANK DETAILS ── */}
      <div className={sectionClass}>
        <h3 className={sectionTitle}>Bank Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Account No</label>
            <input
              className={inputClass}
              value={form.bank_account_no}
              onChange={(e) => handleChange("bank_account_no", e.target.value)}
              placeholder="Bank account number"
            />
          </div>
          <div>
            <label className={labelClass}>IFSC Code</label>
            <input
              className={inputClass}
              value={form.bank_ifsc}
              onChange={(e) => handleChange("bank_ifsc", e.target.value.toUpperCase())}
              placeholder="e.g. SBIN0001234"
              maxLength={11}
            />
          </div>
          <div>
            <label className={labelClass}>Bank Name</label>
            <input
              className={inputClass}
              value={form.bank_name}
              onChange={(e) => handleChange("bank_name", e.target.value)}
              placeholder="Bank name"
            />
          </div>
        </div>
      </div>

      {/* ── KYC DETAILS ── */}
      <div className={sectionClass}>
        <h3 className={sectionTitle}>KYC Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>ID Proof Type</label>
            <select
              className={inputClass}
              value={form.id_type}
              onChange={(e) => handleChange("id_type", e.target.value)}
            >
              <option value="">-- SELECT ID PROOF --</option>
              <option value="aadhar">Aadhar Card</option>
              <option value="pan">PAN Card</option>
              <option value="voter">Voter ID</option>
              <option value="passport">Passport</option>
              <option value="driving">Driving License</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>ID Proof No *</label>
            <input
              className={inputClass}
              value={form.id_number}
              onChange={(e) => handleChange("id_number", e.target.value)}
              placeholder="ID number"
            />
          </div>
          <div>
            <label className={labelClass}>Aadhar Number</label>
            <input
              className={inputClass}
              value={form.aadhar}
              onChange={(e) => handleChange("aadhar", e.target.value)}
              placeholder="12-digit Aadhar"
              maxLength={12}
            />
          </div>
          <div>
            <label className={labelClass}>PAN Number</label>
            <input
              className={inputClass}
              value={form.pan}
              onChange={(e) => handleChange("pan", e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
              maxLength={10}
            />
          </div>

          {/* Aadhar Upload — Front + Back */}
          <div className="md:col-span-2 pt-1">
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

          {/* PAN Upload */}
          <div className="md:col-span-2">
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

      {/* ── SUBMIT ── */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Saving..." : isEdit ? "Update Member" : "Register Member"}
        </button>
      </div>
    </form>
  );
}
