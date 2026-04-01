"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMember } from "@/lib/hooks/useMembers";
import { MemberForm } from "@/components/members/MemberForm";
import { PageHeader } from "@/components/shared/PageHeader";

export default function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { member, loading } = useMember(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Loading member...</p>
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
      <PageHeader
        title="Edit Member"
        description={`${member.name} · ${member.member_id}`}
      >
        <Link
          href={`/members/${id}`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </Link>
      </PageHeader>
      <MemberForm member={member} onSuccess={() => { window.location.href = `/members/${id}`; }} />
    </div>
  );
}
