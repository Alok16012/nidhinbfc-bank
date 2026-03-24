"use client";

import { use } from "react";
import Link from "next/link";
import {
  Phone, Mail, MapPin, Calendar, CreditCard, Pencil,
  User, Shield, BookOpen
} from "lucide-react";
import { useMember } from "@/lib/hooks/useMembers";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MemberProfileTabs } from "@/components/members/MemberProfileTabs";
import { formatDate, formatINR, getInitials, calculateAge } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";

export default function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { member, loading } = useMember(id);

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
          href={`/members/${member.id}?edit=1`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
      </PageHeader>

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
          <MemberProfileTabs memberId={member.id} />
        </div>
      </div>
    </div>
  );
}
