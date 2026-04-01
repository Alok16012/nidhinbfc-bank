"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Phone, Mail, MapPin, Calendar, CreditCard, Pencil,
  User, BookOpen, Trash2
} from "lucide-react";
import { useMember } from "@/lib/hooks/useMembers";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MemberProfileTabs } from "@/components/members/MemberProfileTabs";
import { formatDate, formatINR, getInitials, calculateAge } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { createClient } from "@/lib/supabase/client";

export default function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { member, loading } = useMember(id);
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const supabase = createClient();

    // Delete child records first (order matters for FK constraints)
    await supabase.from("passbook").delete().eq("member_id", id);
    // loan_repayments cascade-delete when loans are deleted
    await supabase.from("loans").delete().eq("member_id", id);
    await supabase.from("deposits").delete().eq("member_id", id);

    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) {
      console.error("Delete error:", error);
      setDeleteError(error.message);
      setDeleting(false);
      return;
    }
    router.push("/members");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Loading member profile...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-slate-500 font-medium">Member not found</p>
        <Link href="/members" className="text-sm text-blue-600 hover:underline">Back to members</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Member Profile" description={`${member.member_id}`}>
        <Link
          href={`/passbook/${member.id}`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
        >
          <BookOpen className="h-4 w-4" />
          Passbook
        </Link>
        <Link
          href={`/members/${member.id}/edit`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </PageHeader>

      {/* Delete Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Delete Member?</p>
                <p className="text-xs text-slate-500">{member.name} · {member.member_id}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              This will permanently delete the member and all associated data. This action cannot be undone.
            </p>
            {deleteError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          {/* Avatar */}
          <div className="flex flex-col items-center text-center mb-5">
            {member.photo_url ? (
              <img
                src={member.photo_url}
                alt={member.name}
                className="h-20 w-20 rounded-full object-cover border-2 border-blue-100 mb-3"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold mb-3">
                {getInitials(member.name)}
              </div>
            )}
            <h2 className="text-lg font-bold text-slate-900">{member.name}</h2>
            <p className="text-sm text-slate-400">{member.member_id}</p>
            <div className="mt-2">
              <StatusBadge status={member.status} />
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2 text-slate-600">
              <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
              <span>{member.phone}</span>
            </div>
            {member.email && (
              <div className="flex items-start gap-2 text-slate-600">
                <Mail className="h-4 w-4 text-slate-400 mt-0.5" />
                <span className="break-all">{member.email}</span>
              </div>
            )}
            <div className="flex items-start gap-2 text-slate-600">
              <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
              <span>{member.address}</span>
            </div>
            <div className="flex items-start gap-2 text-slate-600">
              <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
              <span>{formatDate(member.dob)} ({calculateAge(member.dob)} yrs)</span>
            </div>
            <div className="flex items-start gap-2 text-slate-600">
              <CreditCard className="h-4 w-4 text-slate-400 mt-0.5" />
              <span>Joined {formatDate(member.created_at)}</span>
            </div>
          </div>

          <hr className="my-4 border-slate-100" />

          {/* KYC */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">KYC Documents</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Aadhar</span>
              <span className="font-mono text-slate-700">{member.aadhar ? `XXXX XXXX ${member.aadhar.slice(-4)}` : "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">PAN</span>
              <span className="font-mono text-slate-700">{member.pan || "—"}</span>
            </div>
          </div>

          <hr className="my-4 border-slate-100" />

          {/* Nominee */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nominee</p>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-slate-400" />
              <span className="text-slate-700">
                {member.nominee_name} ({member.nominee_relation})
              </span>
            </div>
          </div>

          <hr className="my-4 border-slate-100" />

          {/* Share Capital */}
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 font-medium">Share Capital</p>
            <p className="text-xl font-bold text-blue-700 mt-0.5">{formatINR(member.share_capital)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="lg:col-span-2">
          <MemberProfileTabs memberId={member.id} member={member} />
        </div>
      </div>
    </div>
  );
}
